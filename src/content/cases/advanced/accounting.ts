/** Advanced cases: accounting. */
import type { CaseInput } from '../schema'
import { replies, OUTCOMES } from './shared'

/** Accounting: a client wants a January sale counted in December. */
const accCutoff: CaseInput = {
  id: 'adv-acc-year-end-sale',
  version: 1,
  careerId: 'accounting',
  kind: 'client',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'A sale in the wrong year',
  summary: 'A client wants a January sale counted in December to meet its bank’s target.',
  from: {
    name: 'Fiona Marsh',
    role: 'Finance Director',
    organisation: 'Alder Engineering',
  },
  trigger: {},
  deadlineHours: 6,
  email: {
    subject: 'Year-end accounts: one more sale for December',
    body: `Hi,

Before you finalise our year-end accounts, please include the **£48,000** order for Calder Pumps in December. We invoiced it on 30 December. Our bank needs December revenue of at least **£1,300,000**, and this gets us there.

Thanks,

Fiona Marsh
Finance Director, Alder Engineering`,
  },
  whyItMatters:
    'Revenue belongs to the period in which the goods are delivered, not when an invoice is dated. Moving it to hit a target misleads the bank, and the accountant who books it shares the responsibility. The professional answer is accurate accounts, plus help with the real problem.',
  objectives: [
    'Apply the cut-off rule: revenue when the goods are delivered',
    'Work out the true position',
    'Say no to a client clearly and help them with the real problem',
  ],
  evidence: [
    {
      id: 'order',
      title: 'The Calder Pumps order',
      table: {
        head: ['Event', 'Date', 'Amount'],
        rows: [
          ['Order signed', '12 December', '£48,000'],
          ['Deposit received (recorded as deferred income)', '15 December', '£4,800'],
          ['Invoice dated', '30 December', '£48,000'],
          ['Goods despatched and delivered', '3 January', ''],
        ],
      },
    },
    {
      id: 'revenue',
      title: 'December revenue (draft)',
      text: 'Recorded December revenue, without the Calder Pumps order: **£1,260,000**. Year end: 31 December. The bank covenant requires at least £1,300,000.',
    },
  ],
  steps: [
    {
      id: 'cutoff',
      kind: 'review',
      title: 'Apply the cut-off rule',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'january',
          text: 'The sale belongs in January, because the goods were delivered on 3 January.',
          issue: true,
          why: 'Revenue is recognised when the customer gets the goods, which was after the year end.',
        },
        {
          id: 'invoice-date',
          text: 'Dating the invoice 30 December makes it December revenue.',
          issue: false,
          why: 'The invoice date does not decide the period; delivery does.',
        },
        {
          id: 'deposit',
          text: 'The £4,800 deposit is rightly recorded as deferred income, not revenue.',
          issue: true,
          why: 'Money received before delivery is owed back as goods, so it is a liability until delivery.',
        },
        {
          id: 'draft',
          text: 'The draft December revenue of £1,260,000 is wrong because it leaves the order out.',
          issue: false,
          why: 'Leaving the order out is correct: £1,260,000 is the right December figure.',
        },
      ],
    },
    {
      id: 'gap',
      kind: 'figure',
      title: 'The real position',
      prompt:
        'By how much is December revenue, recorded correctly, short of the bank’s £1,300,000?',
      points: 20,
      answer: 40000,
      tolerance: 0.5,
      unit: '£',
      why: '£1,300,000 − £1,260,000 = £40,000 short.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'How do you handle the request?',
      points: 25,
      options: [
        {
          id: 'january',
          label:
            'Record the sale in January, explain why, and suggest Fiona talks to the bank now about the £40,000 shortfall',
          verdict: 'best',
          why: 'The accounts are right, and Fiona gets help with her real problem: banks deal far better with early honesty than with surprises.',
          effects: { indicators: { risk: -2, discipline: 2 } },
        },
        {
          id: 'include',
          label:
            'Include it in December: the invoice is dated December and it is only four days',
          verdict: 'poor',
          why: 'It overstates revenue to mislead a lender. That is misstatement, whoever asks for it, and you would share the responsibility.',
          effects: { indicators: { risk: 6 }, reputation: -3 },
        },
        {
          id: 'january-only',
          label: 'Record it in January and leave the bank to Fiona',
          verdict: 'acceptable',
          why: 'The accounting is right, but the client is left alone with a problem you could help her face.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Fiona Marsh, Alder Engineering',
      title: 'Reply to the client',
      prompt:
        'Write to Fiona: what you will do, why, and how you can help with the bank.',
      points: 25,
      minWords: 50,
      model:
        'Dear Fiona, thank you. I cannot include the Calder Pumps sale in December: the goods were delivered on 3 January, so under the cut-off rules it is January revenue, whatever the invoice date. Recorded correctly, December revenue is £1,260,000, £40,000 short of the covenant. I suggest we speak to the bank now, before the accounts are final; I am happy to help prepare the figures and the January order book. Kind regards, {name}',
      mentions: [['January'], ['40,000', '40000'], ['bank', 'lender', 'covenant']],
      avoid: [
        {
          terms: ['no problem', 'happy to include'],
          why: 'Do not suggest the sale could be moved: it cannot.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Fiona',
    'Thank you for being straight with me. I called the bank this morning; they have agreed to look at the January order book, and we are fine.',
  ),
  lapseLog: 'The year-end accounts were held up waiting for an answer to the client.',
  skills: { 'financial-reporting': 25, bookkeeping: 20 },
  xp: 140,
}

export const ADVANCED_ACCOUNTING: CaseInput[] = [accCutoff]
