/** Operations cases: accounting. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const accounting: CaseInput = {
  id: 'ops-acc-payment-run',
  version: 1,
  careerId: 'accounting',
  kind: 'operations',
  minLevel: 2,
  title: 'Approve the payment run, and spot the fraud',
  summary: 'Four supplier payments are ready. Two of them should not be paid.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'depreciation-schedule' },
  deadlineHours: 6,
  email: {
    subject: 'Payment run: your approval please',
    body: `Hi {name},

The weekly payment run is ready for approval. Please check each payment before it goes: **approve**, **reject** (it should not be paid) or **escalate** (it needs me).

Daniel`,
  },
  whyItMatters:
    'Payment runs are where companies lose money to duplicates and fraud. Checking every payment against the ledger, and never trusting bank details changed by email, are basic controls every accountant applies.',
  objectives: [
    'Check payments against the ledger before they go',
    'Recognise duplicate payments and payment fraud',
    'Stay within your authority',
  ],
  evidence: [
    {
      id: 'run',
      title: 'Payment run, Friday',
      table: {
        head: ['Supplier', 'Invoice', 'Amount', 'Notes'],
        rows: [
          ['Meadow Office Supplies', 'MOS-2310', '£264', 'Approved invoice'],
          [
            'Clearline Telecom',
            'CL-88410',
            '£3,200',
            'Paid on 3 March (same invoice number)',
          ],
          [
            'Ferris & Co Solicitors',
            'FC-2240',
            '£1,860',
            'Bank details changed last week, by email',
          ],
          ['Northbridge IT Hardware', 'NB-7721', '£2,280', 'Approved invoice, laptops'],
        ],
      },
    },
    {
      id: 'controls',
      title: 'Payment controls',
      text: 'Never pay the same invoice twice. Changes to a supplier’s bank details must be **confirmed by phone** using the number we already hold before any payment.',
    },
  ],
  steps: [
    {
      id: 'warnings',
      kind: 'review',
      title: 'Warning signs',
      prompt: 'Which of these are warning signs in this run?',
      points: 30,
      findings: [
        {
          id: 'duplicate',
          text: 'CL-88410 was already paid on 3 March.',
          issue: true,
          why: 'Paying it again is a duplicate payment.',
        },
        {
          id: 'bank-email',
          text: 'Ferris & Co’s bank details were changed by email.',
          issue: true,
          why: 'This is the classic invoice-fraud pattern; confirm by phone first.',
        },
        {
          id: 'laptops',
          text: 'Northbridge’s invoice is for laptops.',
          issue: false,
          why: 'An approved invoice for equipment is normal.',
        },
      ],
    },
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Approve the payments',
      prompt: 'Approve, reject or escalate each payment.',
      points: 50,
      requests: [
        {
          id: 'meadow',
          summary: 'Meadow Office Supplies MOS-2310',
          department: 'accounting',
          amount: 264,
          why: 'An approved invoice, not yet paid.',
        },
        {
          id: 'clearline',
          summary: 'Clearline Telecom CL-88410',
          department: 'accounting',
          amount: 3200,
          policyBreach:
            'This invoice was already paid on 3 March: paying it again is a duplicate.',
          why: '',
        },
        {
          id: 'ferris',
          summary: 'Ferris & Co Solicitors FC-2240',
          department: 'accounting',
          amount: 1860,
          policyBreach:
            'The bank details were changed by email and not confirmed by phone: hold the payment.',
          why: '',
        },
        {
          id: 'northbridge',
          summary: 'Northbridge IT Hardware NB-7721',
          department: 'accounting',
          amount: 2280,
          why: 'An approved invoice, not yet paid.',
        },
      ],
    },
    {
      id: 'next',
      kind: 'decide',
      title: 'The changed bank details',
      prompt: 'What do you do about Ferris & Co?',
      points: 20,
      options: [
        {
          id: 'phone',
          label: 'Phone Ferris & Co on the number already on file to confirm the change',
          verdict: 'best',
          why: 'It checks the request through a channel a fraudster doesn’t control.',
          effects: { indicators: { risk: -4 } },
        },
        {
          id: 'reply-email',
          label: 'Reply to the email asking them to confirm',
          verdict: 'poor',
          why: 'If the email account is compromised, the fraudster confirms it.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'pay-new',
          label: 'Pay to the new details: the email came from their domain',
          verdict: 'poor',
          why: 'Domains can be spoofed or hacked; this is how companies lose money.',
          effects: { indicators: { risk: 8 } },
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Daniel',
    'Well caught. I phoned Ferris & Co: they never changed their bank details. That email was a fraud attempt.',
  ),
  lapseLog: 'The payment run was late: suppliers were paid after their due dates.',
  skills: { bookkeeping: 25, accuracy: 25, reconciliation: 10 },
  xp: 90,
}

export const OPERATIONS_ACCOUNTING: CaseInput[] = [accounting]
