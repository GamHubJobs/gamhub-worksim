/** IT Operations: its registration with the tools framework, and its graded checks. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { companyItops } from './data'
import { BUILD_NAMES } from './deployment'
import { registerProblems } from './model'
import { ItopsStateSchema, type ItopsState } from './schema'

export const ItopsCheckSchema = z.discriminatedUnion('type', [
  /** An action is in the log (or, with `absent`, must not be). */
  FileCheckBaseSchema.extend({
    type: z.literal('action'),
    action: z.string(),
    /** The target must contain this. */
    target: z.string().optional(),
    absent: z.boolean().default(false),
  }),
  /** Nothing risky was done (restarting healthy kit, releasing phishing…). */
  FileCheckBaseSchema.extend({ type: z.literal('no-risk') }),
  /** Every record's status agrees with who holds it. */
  FileCheckBaseSchema.extend({ type: z.literal('register-consistent') }),
  /** A computer was built with this method, with at most this many mistakes. */
  FileCheckBaseSchema.extend({
    type: z.literal('built'),
    build: z.enum(['imaging', 'manual']),
    maxMistakes: z.number().int().min(0).default(99),
  }),
])
export type ItopsCheck = z.infer<typeof ItopsCheckSchema>

function gradeCheck(check: ItopsCheck, player: ItopsState) {
  switch (check.type) {
    case 'action': {
      const done = player.log.some(
        (e) =>
          e.action === check.action &&
          (!check.target || e.target.toLowerCase().includes(check.target.toLowerCase())),
      )
      const ok = check.absent ? !done : done
      const what = `${check.action}${check.target ? ` (${check.target})` : ''}`
      return checkResult(
        check,
        ok ? 1 : 0,
        ok
          ? []
          : [
              check.absent
                ? `“${what}” should not have been done.`
                : `No “${what}” in the log.`,
            ],
      )
    }
    case 'no-risk': {
      const risky = player.log.filter((e) => e.risk)
      return checkResult(
        check,
        risky.length ? 0 : 1,
        risky.map((e) => `${e.action} ${e.target}: ${e.detail}`),
      )
    }
    case 'register-consistent': {
      const problems = registerProblems(player)
      return checkResult(check, problems.length ? 0 : 1, problems)
    }
    case 'built': {
      const name = BUILD_NAMES[check.build]
      const builds = player.log.filter(
        (e) => e.action === 'Build complete' && e.detail.includes(name),
      )
      if (builds.length === 0)
        return checkResult(check, 0, [`No ${name} build was completed.`])
      const best = Math.min(
        ...builds.map((e) => Number(/; (\d+) mistake/.exec(e.detail)?.[1] ?? 0)),
      )
      return best <= check.maxMistakes
        ? checkResult(check, 1, [])
        : checkResult(check, 0.5, [
            `The ${name} build had ${best} mistakes; work from the SOP to get it right first time.`,
          ])
    }
  }
}

export const itops: ToolDefinition<ItopsState, ItopsCheck> = {
  id: 'itops',
  name: 'IT Operations',
  category: 'Infrastructure, mail, assets and builds',
  icon: 'server',
  sections: [
    {
      id: 'server-room',
      name: 'Server Room',
      description:
        'Network equipment and servers: status, topology, restarts and services.',
    },
    {
      id: 'deployment',
      name: 'Computer Deployment',
      description:
        'Build a computer on the bench: cabling, network imaging or a hand build.',
    },
    { id: 'shelf', name: 'PC Shelf', description: 'Built computers waiting to go out.' },
    {
      id: 'repair',
      name: 'Repair Bench',
      description: 'Open a faulty laptop, test it, and replace the failed part.',
    },
    {
      id: 'assets',
      name: 'Asset Management',
      description:
        'The register: every device, who holds it, its state, warranty and licences.',
    },
    {
      id: 'ship',
      name: 'Ship Manager',
      description: 'Send hardware to people who work from home, with a return label.',
    },
    {
      id: 'mail-admin',
      name: 'Mail Admin',
      description: 'Message trace, mailbox storage and archive, inbox rules.',
    },
    {
      id: 'mail-security',
      name: 'Mail Security',
      description: 'The mail filter: quarantine and blocked senders.',
    },
  ],
  state: ItopsStateSchema,
  practice: () => companyItops(),
  summary: (state) => {
    const changes = state.log.length
    return `${state.nodes.length} network devices, ${state.assets.length} assets${changes ? `, ${changes} action${changes === 1 ? '' : 's'}` : ''}`
  },
  check: ItopsCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The IT Operations work was not handed in.']),
    ),
  guide: {
    intro:
      'IT Operations is the company’s IT estate as the service desk runs it: the server room, the mail system, the asset register and stockroom, shipping to remote staff, and building new computers.',
    topics: [
      {
        title: 'One laptop, or one floor?',
        body: 'Before working on one person’s computer, look at the Server Room overview. If a switch, the wireless controller or a server is down, many people are affected and that is the fault to fix. Restart only what is broken: restarting healthy equipment cuts everyone below it off.',
      },
      {
        title: 'Mail that did not arrive',
        body: 'Run a message trace first. Failed with 552 5.2.2 means the mailbox is full (Mailbox Admin: enable the archive). Quarantined means the filter held it (Mail Security: release it only if it is genuine). 550 5.7.1 means the sender is blocked.',
      },
      {
        title: 'A new or replacement computer',
        body: 'Build it in Computer Deployment with the right method for the person’s department (the SOP says which), register it in Asset Management, then check it out to someone in the office or send it with Ship Manager to someone at home: confirm their address with them first, and include a return label for the old one.',
      },
    ],
    glossary: [
      {
        term: 'PXE',
        meaning:
          'Booting a computer from the network to install it from a deployment server.',
      },
      { term: 'Task sequence', meaning: 'The scripted steps an imaging build runs.' },
      {
        term: 'SCL',
        meaning:
          'Spam confidence level: how sure the filter is that a message is spam (0 to 9).',
      },
      {
        term: 'Asset tag',
        meaning: 'The label that identifies a device in the register for its whole life.',
      },
      {
        term: 'Return label',
        meaning: 'A prepaid label in the box so the old equipment comes back.',
      },
    ],
  },
}
