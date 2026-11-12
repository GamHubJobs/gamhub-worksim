/** Security Console (security operations): its registration with the tools framework. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { securityScenario } from './data'
import { mistakes, STAGE_NAMES } from './model'
import { SocStateSchema, STAGES, type SocState } from './schema'

export const SocCheckSchema = z.discriminatedUnion('type', [
  /** The incident reached this stage (each stage only by doing its work). */
  FileCheckBaseSchema.extend({ type: z.literal('stage'), stage: z.enum(STAGES) }),
  /** No wrong actions (wrong account, wrong device, false evidence, a real threat dismissed). */
  FileCheckBaseSchema.extend({ type: z.literal('no-mistakes') }),
  /** The report says these things (each group: any of the words). */
  FileCheckBaseSchema.extend({
    type: z.literal('report'),
    mentions: z.array(z.array(z.string().min(1)).min(1)).min(1),
  }),
])
export type SocCheck = z.infer<typeof SocCheckSchema>

function gradeCheck(check: SocCheck, player: SocState) {
  switch (check.type) {
    case 'stage': {
      const reached = STAGES.indexOf(player.incident.stage)
      const wanted = STAGES.indexOf(check.stage)
      return checkResult(
        check,
        reached >= wanted ? 1 : reached / wanted,
        reached >= wanted
          ? []
          : [`The incident is at â€œ${STAGE_NAMES[player.incident.stage]}â€.`],
      )
    }
    case 'no-mistakes': {
      const wrong = mistakes(player)
      return checkResult(check, Math.max(0, 1 - 0.25 * wrong.length), [
        ...player.consequences.map((c) => c.text),
        ...wrong.map(
          (e) =>
            `Wrong action: ${e.action} (${e.target}${e.detail ? `, ${e.detail}` : ''}).`,
        ),
      ])
    }
    case 'report': {
      const text = player.incident.report.toLowerCase()
      const missing = check.mentions.filter(
        (alts) => !alts.some((a) => text.includes(a.toLowerCase())),
      )
      return checkResult(
        check,
        (check.mentions.length - missing.length) / check.mentions.length,
        missing.map((alts) => `The report does not mention ${alts[0]}.`),
      )
    }
  }
}

export const soc: ToolDefinition<SocState, SocCheck> = {
  id: 'soc',
  name: 'Security Console',
  category: 'Security operations',
  icon: 'shield',
  sections: [
    { id: 'incident', name: 'Incident', description: 'The incident and its stages.' },
    { id: 'alerts', name: 'Alerts', description: 'What the security tools have raised.' },
    {
      id: 'signins',
      name: 'Sign-ins',
      description: 'Where and when accounts signed in.',
    },
    {
      id: 'endpoints',
      name: 'Endpoints',
      description: 'Devices: processes, changes, isolation.',
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Reported emails: sender, links, verdict.',
    },
    {
      id: 'mailboxes',
      name: 'Mailboxes',
      description: 'Rules and access to each mailbox.',
    },
    {
      id: 'accounts',
      name: 'Accounts',
      description: 'Contain accounts: sessions, password, disable.',
    },
  ],
  state: SocStateSchema,
  practice: () => SocStateSchema.parse(securityScenario()),
  summary: (state) =>
    `Incident ${state.incident.id}: ${STAGE_NAMES[state.incident.stage]}`,
  check: SocCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The security work was not handed in.']),
    ),
  guide: {
    intro:
      'A security operations centre (SOC) watches for attacks and responds to them. An incident is worked through in stages, and each needs evidence before action: containing the wrong account or device stops someone working and leaves the attacker in place.',
    topics: [
      {
        title: 'Investigate before you act',
        body: 'Compare the sign-ins with what is normal for the person: where, when, which device. Check the email that started it: does the senderâ€™s address match the name? Where do the links really go? Look for changes the attacker made, such as a mailbox rule forwarding mail outside the company.',
      },
      {
        title: 'Contain the right thing',
        body: 'End the accountâ€™s sessions and reset its password, and isolate the device that runs something it should not. Do not disable or isolate anything that is not affected.',
      },
      {
        title: 'Eradicate, recover, document',
        body: 'Remove what the attacker left, quarantine the email from every inbox, reconnect the cleaned device, and write down what happened and what will stop it happening again.',
      },
    ],
    glossary: [
      {
        term: 'Containment',
        meaning: 'Stopping an attack spreading, without destroying evidence.',
      },
      {
        term: 'Isolation',
        meaning: 'Cutting a device off the network while it is investigated.',
      },
      {
        term: 'Forwarding rule',
        meaning:
          'A mailbox rule that copies mail elsewhere: attackers use it to keep reading mail.',
      },
    ],
  },
}
