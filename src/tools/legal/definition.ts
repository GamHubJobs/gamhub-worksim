/** Matter Desk: its registration with the tools framework (checks, grading, guide). */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { sampleLegal } from './data'
import { billableHours } from './jurisdiction'
import { clientById, conflictHits, matterById } from './model'
import { LegalStateSchema, type LegalState } from './schema'

const Words = z.array(z.array(z.string()).min(1)).default([])

export const LegalCheckSchema = z.discriminatedUnion('type', [
  /** A matter ended in this status (and its conflict check was run). */
  FileCheckBaseSchema.extend({
    type: z.literal('matter'),
    matter: z.string(),
    status: z.enum(['intake', 'open', 'declined', 'closed']),
    /** For a declined matter: words the reason must contain (any of each group). */
    reasonMentions: Words,
  }),
  /** A client's identity was verified and the engagement letter sent. */
  FileCheckBaseSchema.extend({
    type: z.literal('client'),
    client: z.string(),
    idVerified: z.boolean().optional(),
    engagementSent: z.boolean().optional(),
  }),
  /** A key date on the matter: a label with one of these words, on exactly this date. */
  FileCheckBaseSchema.extend({
    type: z.literal('key-date'),
    matter: z.string(),
    label: z.array(z.string()).min(1),
    date: z.string(),
  }),
  /** Authorities saved to the matter: these included, those (bad law) not. */
  FileCheckBaseSchema.extend({
    type: z.literal('authorities'),
    matter: z.string(),
    include: z.array(z.string()).default([]),
    exclude: z.array(z.string()).default([]),
  }),
  /** A clause decided this way, with a comment mentioning these words. */
  FileCheckBaseSchema.extend({
    type: z.literal('clause'),
    contract: z.string(),
    clause: z.string(),
    decision: z.enum(['accept', 'amend', 'reject']),
    mentions: Words,
  }),
  /** The matter's recorded time: billable hours (in billing units), and non-billable time kept off the bill. */
  FileCheckBaseSchema.extend({
    type: z.literal('time'),
    matter: z.string(),
    billableHours: z.number(),
    nonBillableMinutes: z.number().optional(),
  }),
  /** An invoice raised for the matter, for this total. */
  FileCheckBaseSchema.extend({
    type: z.literal('invoice'),
    matter: z.string(),
    total: z.number(),
  }),
  /** A document tagged this way (privileged ones with a reason). */
  FileCheckBaseSchema.extend({
    type: z.literal('document'),
    doc: z.string(),
    tag: z.enum(['relevant', 'not-relevant', 'privileged']),
  }),
  /** No matter was opened despite a conflict with a current client. */
  FileCheckBaseSchema.extend({ type: z.literal('no-conflict-breach') }),
])

export type LegalCheck = z.infer<typeof LegalCheckSchema>

const missing = (text: string, groups: string[][]) =>
  groups.filter(
    (words) => !words.some((w) => text.toLowerCase().includes(w.toLowerCase())),
  )

function gradeCheck(check: LegalCheck, s: LegalState) {
  switch (check.type) {
    case 'matter': {
      const m = matterById(s, check.matter)
      if (!m) return checkResult(check, 0, [`Matter ${check.matter} is missing.`])
      const problems: string[] = []
      if (!m.conflictChecked) problems.push(`No conflict check was run on ${m.id}.`)
      if (m.status !== check.status)
        problems.push(`${m.id} is “${m.status}”, not “${check.status}”.`)
      problems.push(
        ...missing(m.declineReason, check.reasonMentions).map(
          (w) => `The reason does not mention ${w[0]}.`,
        ),
      )
      return checkResult(
        check,
        problems.length ? (m.status === check.status ? 0.5 : 0) : 1,
        problems,
      )
    }
    case 'client': {
      const c = clientById(s, check.client)
      if (!c) return checkResult(check, 0, ['The client is missing.'])
      const problems: string[] = []
      if (check.idVerified && !c.idVerified)
        problems.push(`${c.name}’s identity was not verified.`)
      if (check.engagementSent && !c.engagementSent)
        problems.push(`No engagement letter was sent to ${c.name}.`)
      return checkResult(check, problems.length ? 0 : 1, problems)
    }
    case 'key-date': {
      const m = matterById(s, check.matter)
      const dates =
        m?.keyDates.filter((k) =>
          check.label.some((w) => k.label.toLowerCase().includes(w.toLowerCase())),
        ) ?? []
      if (!dates.length)
        return checkResult(check, 0, [
          `There is no “${check.label[0]}” date on ${check.matter}.`,
        ])
      return dates.some((k) => k.date === check.date)
        ? checkResult(check, 1, [])
        : checkResult(check, 0, [
            `The ${check.label[0]} date is ${dates.at(-1)?.date}; check how it is worked out.`,
          ])
    }
    case 'authorities': {
      const m = matterById(s, check.matter)
      const saved = m?.authorities ?? []
      const problems = [
        ...check.include
          .filter((id) => !saved.includes(id))
          .map(
            (id) =>
              `${s.library.find((a) => a.id === id)?.citation ?? id} was not saved.`,
          ),
        ...check.exclude
          .filter((id) => saved.includes(id))
          .map(
            (id) =>
              `${s.library.find((a) => a.id === id)?.citation ?? id} is not good law, but it was saved.`,
          ),
      ]
      const parts = check.include.length + check.exclude.length || 1
      return checkResult(check, 1 - problems.length / parts, problems)
    }
    case 'clause': {
      const clause = s.contracts
        .find((c) => c.id === check.contract)
        ?.clauses.find((c) => c.id === check.clause)
      if (!clause?.decision)
        return checkResult(check, 0, ['The clause was not reviewed.'])
      if (clause.decision !== check.decision)
        return checkResult(check, 0, [
          `${clause.heading} was marked “${clause.decision}”; compare it with the playbook.`,
        ])
      const gaps = missing(clause.comment, check.mentions)
      return checkResult(
        check,
        check.mentions.length ? 1 - gaps.length / (check.mentions.length * 2) : 1,
        gaps.map((w) => `The comment does not mention ${w[0]}.`),
      )
    }
    case 'time': {
      const entries = s.time.filter((t) => t.matterId === check.matter)
      const hours =
        Math.round(
          entries
            .filter((t) => t.billable)
            .reduce((sum, t) => sum + billableHours(t.minutes), 0) * 10,
        ) / 10
      const problems: string[] = []
      if (Math.abs(hours - check.billableHours) > 0.05)
        problems.push(
          `The billable time comes to ${hours} hours; it should be ${check.billableHours}.`,
        )
      if (check.nonBillableMinutes !== undefined) {
        const off = entries
          .filter((t) => !t.billable)
          .reduce((sum, t) => sum + t.minutes, 0)
        if (off !== check.nonBillableMinutes)
          problems.push(
            'Some time that should not be billed is not recorded as non-billable.',
          )
      }
      return checkResult(check, 1 - problems.length / 2, problems)
    }
    case 'invoice': {
      const invoices = s.invoices.filter((i) => i.matterId === check.matter)
      if (!invoices.length) return checkResult(check, 0, ['No invoice was raised.'])
      return invoices.some((i) => Math.abs(i.total - check.total) < 0.01)
        ? checkResult(check, 1, [])
        : checkResult(check, 0.5, [
            `The invoice is £${invoices.at(-1)?.total.toFixed(2)}; it should be £${check.total.toFixed(2)}.`,
          ])
    }
    case 'document': {
      const d = s.documents.find((x) => x.id === check.doc)
      if (!d?.tag)
        return checkResult(check, 0, [`${d?.title ?? check.doc} was not reviewed.`])
      return d.tag === check.tag
        ? checkResult(check, 1, [])
        : checkResult(check, 0, [`“${d.title}” was tagged ${d.tag}.`])
    }
    case 'no-conflict-breach': {
      const breaches = s.matters.filter(
        (m) => m.status === 'open' && conflictHits(s, m.id).some((h) => h.blocking),
      )
      return checkResult(
        check,
        breaches.length ? 0 : 1,
        breaches.map((m) => `${m.id} was opened against a current client.`),
      )
    }
  }
}

export const legal: ToolDefinition<LegalState, LegalCheck> = {
  id: 'legal',
  name: 'Matter Desk',
  category: 'Law firm practice management (simulation)',
  icon: 'legal',
  sections: [
    {
      id: 'matters',
      name: 'Matters and intake',
      description:
        'Clients, conflict checks, identity, engagement letters and opening matters.',
    },
    {
      id: 'research',
      name: 'Research',
      description:
        'The law library: statutes and cases, and whether they are still good law.',
    },
    {
      id: 'contracts',
      name: 'Contract review',
      description: 'Each clause against the firm’s playbook: accept, amend or reject.',
    },
    {
      id: 'calendar',
      name: 'Calendar',
      description: 'Court and limitation deadlines, worked out by the rules.',
    },
    {
      id: 'billing',
      name: 'Time and billing',
      description: 'Time in six-minute units, and invoices.',
    },
    {
      id: 'discovery',
      name: 'Document review',
      description: 'Tagging documents relevant, not relevant or privileged.',
    },
    { id: 'audit', name: 'Audit log', description: 'Every action, and when.' },
  ],
  state: LegalStateSchema,
  practice: sampleLegal,
  summary: (s) => {
    const open = s.matters.filter((m) => m.status === 'open').length
    return `${open} open matter${open === 1 ? '' : 's'} · ${s.audit.length} actions logged`
  },
  check: LegalCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['Nothing was done in Matter Desk.']),
    ),
  guide: {
    intro:
      'Matter Desk brings together the systems of a law firm: client intake, matters and conflict checks, legal research, contract review, the calendar, time and billing, and document review. It is set in Westmark, a fictional jurisdiction with simplified rules: nothing here is the law of a real country or legal advice.',
    topics: [
      {
        title: 'Taking on a matter',
        body: 'Run the conflict check first. If the other side is a current client, the firm cannot act: decline, and record why. Otherwise verify the client’s identity and send the engagement letter (the scope of the work and the fees) before opening the matter.',
      },
      {
        title: 'Deadlines',
        body: 'Court deadlines count calendar days from the event (21 days for a defence, 28 for an appeal in Westmark). A deadline on a weekend or public holiday moves to the next working day. Limitation periods run from when the claim arose. Put every deadline in the calendar.',
      },
      {
        title: 'Research',
        body: 'Search the library and read each authority. Check it is still good law: an overruled case or repealed section must never be relied on. Save the authorities you will use to the matter.',
      },
      {
        title: 'Contract review',
        body: 'Read each clause against the firm’s playbook. Accept what the playbook allows; amend or reject the rest, with a comment the other side can act on.',
      },
      {
        title: 'Time and billing',
        body: 'Record time as you go, in six-minute units (14 minutes is 0.3 hours). Describe the work clearly. Time spent correcting your own mistakes is not billed to the client.',
      },
      {
        title: 'Document review',
        body: 'Tag each document relevant or not relevant to the issues. Communications giving legal advice between the firm and its client are privileged: they are withheld from disclosure, with the basis recorded.',
      },
    ],
    glossary: [
      {
        term: 'Matter',
        meaning:
          'A piece of legal work for a client, with its own number, file and time.',
      },
      {
        term: 'Conflict of interest',
        meaning:
          'When acting for one client would be against another client’s interests. A firm cannot act against a current client.',
      },
      {
        term: 'Engagement letter',
        meaning: 'The letter setting out what the firm will do and how it will charge.',
      },
      {
        term: 'Limitation period',
        meaning: 'The time within which a claim must be brought.',
      },
      {
        term: 'Good law',
        meaning: 'An authority that has not been overruled or repealed.',
      },
      {
        term: 'Privilege',
        meaning:
          'Protection of confidential legal advice from being disclosed to the other side.',
      },
      {
        term: 'Disclosure (discovery)',
        meaning: 'Sharing relevant documents with the other side in a dispute.',
      },
    ],
  },
}
