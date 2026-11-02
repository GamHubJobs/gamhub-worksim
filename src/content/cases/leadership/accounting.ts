/** Leadership cases: accounting. */
import type { CaseInput } from '../schema'
import { replies, FEEDBACK_AVOID } from './shared'

const accLead: CaseInput = {
  id: 'lead-acc-review',
  version: 1,
  careerId: 'accounting',
  kind: 'leadership',
  minLevel: 4,
  title: 'Review the team’s work and settle a disagreement',
  summary: 'Two team members disagree about an accrual; another’s journal needs review.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'books-month-end-close' },
  deadlineHours: 8,
  email: {
    subject: 'Over to you: reviews and a disagreement',
    body: `Hi {name},

As Senior Accountant you now review the team’s journals and sort out disagreements. Ola has posted the insurance journal for your review, and Jay and Ola disagree about whether to accrue the March cleaning invoice. Can you handle both, and the quarter’s work allocation?

Daniel`,
  },
  whyItMatters:
    'Senior accountants are judged by the quality of the team’s work, not just their own. Reviewing carefully, deciding disagreements on the principles, and explaining why, is how a team improves.',
  objectives: [
    'Review a junior’s journal',
    'Decide a disagreement on principle',
    'Allocate work fairly',
  ],
  evidence: [
    {
      id: 'journal',
      title: 'Ola’s journal: annual insurance paid 1 March',
      table: {
        head: ['Account', 'Debit', 'Credit'],
        rows: [
          ['6700 Professional fees (insurance)', '£4,800', ''],
          ['1200 Bank', '', '£4,800'],
        ],
      },
    },
    {
      id: 'cleaning',
      title: 'The disagreement',
      text: 'Cleaning for March (£650) was done in March but the invoice will arrive in April. **Jay**: “Accrue it in March.” **Ola**: “Book it when the invoice arrives; that’s simpler.”',
    },
  ],
  steps: [
    {
      id: 'allocate',
      kind: 'assign',
      title: 'Allocate the quarter-end work',
      prompt: 'Give each piece of quarter-end work to the right person.',
      points: 10,
      members: [
        {
          id: 'ola',
          name: 'Ola Bakare',
          strengths: 'Junior; journals, learning accruals',
          capacity: 1,
        },
        {
          id: 'jay',
          name: 'Jay Patel',
          strengths: 'Reconciliations and VAT',
          capacity: 2,
        },
        {
          id: 'ruth',
          name: 'Ruth Adeyemi',
          strengths: 'Part-time bookkeeper; supplier statements',
          capacity: 1,
        },
      ],
      items: [
        {
          id: 'bank',
          label: 'Bank and credit card reconciliations',
          best: ['jay'],
          why: 'Reconciliations are Jay’s strength.',
        },
        {
          id: 'vat',
          label: 'The quarterly VAT return',
          best: ['jay'],
          why: 'Jay handles VAT.',
        },
        {
          id: 'statements',
          label: 'Supplier statement checks',
          best: ['ruth'],
          why: 'Ruth checks supplier statements.',
        },
        {
          id: 'journals',
          label: 'Routine month-end journals',
          best: ['ola'],
          why: 'Routine journals build Ola’s experience, with your review.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review Ola’s journal',
      prompt: 'Which of these are true?',
      points: 20,
      findings: [
        {
          id: 'prepay',
          text: 'Eleven months of the insurance belong to later months and should be a prepayment.',
          issue: true,
          why: 'Only March’s £400 is a March cost; £4,400 is prepaid.',
        },
        {
          id: 'bank',
          text: 'The bank side of the journal is right.',
          issue: true,
          why: '£4,800 did leave the bank.',
        },
        {
          id: 'fine',
          text: 'Booking the whole year as a March cost is fine because it was paid in March.',
          issue: false,
          why: 'Costs belong to the period they relate to, not when they are paid.',
        },
      ],
    },
    {
      id: 'prepaid',
      kind: 'figure',
      title: 'The prepayment',
      prompt: 'How much should be moved to prepayments?',
      points: 15,
      answer: 4400,
      tolerance: 0.5,
      unit: '£',
      why: '£4,800 ÷ 12 = £400 a month; 11 months are prepaid: £4,400.',
    },
    {
      id: 'disagreement',
      kind: 'decide',
      title: 'Settle the disagreement',
      prompt: 'Who is right about the cleaning invoice, and how do you decide it?',
      points: 20,
      options: [
        {
          id: 'principle',
          label:
            'Accrue it in March, and explain the accruals principle to both so it’s a shared rule, not a win for Jay',
          verdict: 'best',
          why: 'The cost belongs to March; explaining the principle settles future cases too and keeps both on side.',
          effects: { trust: { senior: 2 } },
        },
        {
          id: 'simpler',
          label: 'Book it in April: simpler is better',
          verdict: 'poor',
          why: 'March’s profit would be overstated by £650.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'split',
          label: 'Ask them to agree between themselves',
          verdict: 'acceptable',
          why: 'Avoids taking sides, but there is a right answer and it’s your job to give it.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Ola',
      title: 'Feedback for Ola',
      prompt: 'Give Ola constructive feedback on the journal.',
      points: 35,
      minWords: 50,
      mentions: [
        ['prepayment', 'prepaid'],
        ['4,400', '4400'],
        ['good', 'thank', 'well'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Ola, thanks for posting the insurance journal so promptly; the bank side is spot on. One thing to change: the policy covers twelve months, so only £400 is a March cost. Please move the other £4,400 to prepayments, and release £400 each month. It is a really common one to miss, and once you have done it once it sticks. Happy to go through it together. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3, senior: 2 }, reputation: 4, indicators: { risk: -2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -4 },
  },
  replies: replies(
    'Daniel',
    'Exactly how I’d have handled it. Ola said it was the most useful feedback she’s had.',
  ),
  lapseLog: 'The team’s journals waited for review, and the disagreement simmered.',
  skills: { 'financial-reporting': 25, bookkeeping: 15 },
  xp: 150,
}

export const LEADERSHIP_ACCOUNTING: CaseInput[] = [accLead]
