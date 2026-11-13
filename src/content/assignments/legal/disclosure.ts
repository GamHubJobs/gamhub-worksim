import type { AssignmentInput } from '../../schemas'
import { createInvoice, tagDocument } from '../../../tools/legal/model'
import { CHECK_NO_CONFLICT, firm, must } from './common'

/**
 * Law (senior paralegal): disclosure and the month's bill. Teaches tagging
 * documents for disclosure, protecting privilege, and billing accurately.
 */
const start = firm((s) => ({
  ...s,
  time: [
    {
      id: 't1',
      matterId: 'M-2041',
      date: '2026-02-20',
      minutes: 90,
      description: 'Drafting the letter of claim',
      billable: true,
      invoiced: false,
    },
    {
      id: 't2',
      matterId: 'M-2041',
      date: '2026-02-24',
      minutes: 45,
      description: 'Reviewing Millstone’s response',
      billable: true,
      invoiced: false,
    },
    {
      id: 't3',
      matterId: 'M-2041',
      date: '2026-02-26',
      minutes: 20,
      description: 'Call with the client',
      billable: true,
      invoiced: false,
    },
    {
      id: 't4',
      matterId: 'M-2041',
      date: '2026-02-26',
      minutes: 25,
      description: 'Re-filing a misnamed document',
      billable: false,
      invoiced: false,
    },
  ],
}))

function solution() {
  let s = must(tagDocument(start, 'D-01', 'relevant'))
  s = must(tagDocument(s, 'D-02', 'relevant'))
  s = must(
    tagDocument(s, 'D-03', 'privileged', 'Legal advice from the firm to its client'),
  )
  s = must(tagDocument(s, 'D-04', 'not-relevant'))
  s = must(createInvoice(s, 'M-2041'))
  return s
}

export const legalDisclosure: AssignmentInput = {
  id: 'legal-disclosure',
  version: 1,
  careerId: 'legal',
  levelId: 'senior-paralegal',
  order: 5,
  kind: 'tool',
  title: 'Disclosure, and February’s bill',
  summary:
    'Review Brightwater’s documents for disclosure, protect privilege, and raise the month’s invoice.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Disclosure and billing for M-2041',
    body: `Hi {name},

Two things on Brightwater v Millstone (M-2041):

**1. Disclosure.** The court has ordered both sides to disclose their relevant documents. In **Document review**, tag each of Brightwater’s documents **relevant** or **not relevant** to the dispute (the quality of the flour and what it cost Brightwater). Anything that is our **legal advice** to the client is **privileged**: tag it so, with the basis, so it is withheld.

**2. Billing.** Raise February’s invoice in **Time and billing**. Check the entries first: only billable time goes on it.

Eleanor`,
  },
  whyItMatters:
    'Disclosure is a duty to the court: relevant documents must be shared, even unhelpful ones. Privileged advice must never be disclosed by mistake. And an accurate invoice is part of acting honestly for the client.',
  objectives: [
    'Tag documents for disclosure',
    'Protect privileged advice',
    'Raise an accurate invoice',
  ],
  steps: [
    {
      id: 'tag',
      title: 'Tag the documents',
      instructions:
        'Read each document and tag it. Give the basis for anything privileged.',
    },
    {
      id: 'invoice',
      title: 'Raise the invoice',
      instructions: 'Check the unbilled total for M-2041, then **Raise invoice**.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'legal',
    title: 'Matter Desk: disclosure and billing',
    start,
    solution: solution(),
    checks: [
      {
        id: 'd1',
        type: 'document',
        doc: 'D-01',
        tag: 'relevant',
        title: 'The delivery note: relevant',
        points: 15,
        why: 'It shows what was delivered and when.',
        hint: 'Is it about the flour?',
      },
      {
        id: 'd2',
        type: 'document',
        doc: 'D-02',
        tag: 'relevant',
        title: 'The mould email: relevant',
        points: 15,
        why: 'It is the key evidence of the defect.',
        hint: 'Is it about the flour?',
      },
      {
        id: 'd3',
        type: 'document',
        doc: 'D-03',
        tag: 'privileged',
        title: 'Our advice: privileged',
        points: 25,
        why: 'Legal advice from the firm to its client is privileged: disclosing it would hand Millstone our view of the risks.',
        hint: 'Who wrote D-03, to whom, and why?',
      },
      {
        id: 'd4',
        type: 'document',
        doc: 'D-04',
        tag: 'not-relevant',
        title: 'The staff rota: not relevant',
        points: 10,
        why: 'It has nothing to do with the flour or its cost.',
        hint: 'Does it bear on the dispute?',
      },
      {
        id: 'invoice',
        type: 'invoice',
        matter: 'M-2041',
        total: 486,
        title: 'The invoice is right',
        points: 25,
        why: '90, 45 and 20 minutes are 1.5, 0.8 and 0.4 hours in six-minute units: 2.7 hours at £180 is £486. The re-filing is not billed.',
        hint: 'Only billable entries are invoiced; check the unbilled total.',
      },
      CHECK_NO_CONFLICT,
    ],
  },
  passScore: 75,
  xp: 120,
  skills: { 'professional-ethics': 30, 'case-management': 30, accuracy: 25 },
  feedback: {
    excellent: `Hi {name},

Disclosure done properly and our advice kept safe, and the invoice is exact. Thank you.

Eleanor`,
    good: `Hi {name},

Good; one thing to fix before this goes out. See the notes.

Eleanor`,
    pass: `Hi {name},

Some of this can’t go to the other side as it is. See the notes.

Eleanor`,
    fail: `Hi {name},

Not yet. Start with D-03: who wrote it, and to whom?

Eleanor`,
  },
}
