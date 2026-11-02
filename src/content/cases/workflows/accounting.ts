/** Workflows cases: accounting. */
import type { CaseInput } from '../schema'
import { replies, followUpReplies } from './shared'

const accBilling: CaseInput = {
  id: 'wf-acc-billing',
  version: 1,
  careerId: 'accounting',
  kind: 'workflow',
  minLevel: 2,
  title: 'Set up billing for a new contract',
  summary: 'Sales has signed a new client. Set up the billing schedule correctly.',
  from: { name: 'Chloe Martin', role: 'Sales Manager', organisation: 'Sales' },
  trigger: { afterAssignment: 'books-bank-rec' },
  deadlineHours: 6,
  email: {
    subject: 'Signed: Steelway Engineering retainer',
    body: `Hi,

Great news: Steelway Engineering has signed a 12-month advisory retainer (contract summary attached). Can Accounting set up the billing?

Chloe`,
  },
  whyItMatters:
    'Sales agree the terms; Accounting turns them into invoices. Misreading a contract (the fee, the start date, the payment terms) means wrong invoices and a client who loses confidence in you.',
  objectives: [
    'Read a contract for billing terms',
    'Set up a billing schedule correctly',
    'Spot a discount and its end date',
  ],
  evidence: [
    {
      id: 'contract',
      title: 'Contract summary: Steelway Engineering',
      text: '12-month advisory retainer starting **1 May**. Monthly fee **£4,500** excluding VAT, invoiced at the start of each month. **Introductory discount: 10% for the first three months.** Payment terms: **30 days**.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The billing schedule',
      prompt: 'Complete the billing schedule for invoicing.',
      to: 'Invoicing (Books)',
      points: 70,
      fields: [
        {
          id: 'first',
          label: 'First invoice month',
          kind: 'choice',
          options: ['April', 'May', 'June'],
          answer: 'May',
          why: 'The retainer starts on 1 May, invoiced at the start of the month.',
        },
        {
          id: 'intro',
          label: 'Monthly fee for the first three months, excluding VAT (£)',
          kind: 'number',
          answer: 4050,
          tolerance: 0.5,
          unit: '£',
          why: '£4,500 less 10% = £4,050.',
        },
        {
          id: 'standard',
          label: 'Monthly fee from month four, excluding VAT (£)',
          kind: 'number',
          answer: 4500,
          tolerance: 0.5,
          unit: '£',
          why: 'The discount ends after three months.',
        },
        {
          id: 'terms',
          label: 'Payment terms (days)',
          kind: 'number',
          answer: 30,
          tolerance: 0,
          unit: 'days',
          why: 'The contract says 30 days.',
        },
      ],
    },
    {
      id: 'year',
      kind: 'figure',
      title: 'First-year value',
      prompt: 'What is the contract worth over the 12 months, excluding VAT?',
      points: 30,
      answer: 52650,
      tolerance: 1,
      unit: '£',
      why: '3 × £4,050 + 9 × £4,500 = £12,150 + £40,500 = £52,650.',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 1, indicators: { satisfaction: 2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Chloe',
    'Brilliant, the client has had their first invoice and it’s exactly what they agreed.',
    'The client has questioned their first invoice.',
  ),
  lapseLog:
    'Steelway Engineering’s first invoice went out late: billing was never set up.',
  skills: { bookkeeping: 25, accuracy: 20 },
  xp: 85,
}

const accBillingFix: CaseInput = {
  id: 'wf-acc-billing-fix',
  version: 1,
  careerId: 'accounting',
  kind: 'workflow',
  minLevel: 2,
  title: 'The new client questions their invoice',
  summary: 'Steelway Engineering says their first invoice doesn’t match the contract.',
  from: {
    name: 'Owen Price',
    role: 'Finance Director',
    organisation: 'Steelway Engineering',
  },
  trigger: { afterCase: 'wf-acc-billing', onlyIf: { step: 'handoff', outcome: 'wrong' } },
  deadlineHours: 4,
  email: {
    subject: 'Our first invoice is wrong',
    body: `Hello,

Our first invoice doesn’t match our contract: we agreed £4,050 a month for the first three months (the 10% introductory discount), from May. Please send a corrected invoice.

Owen Price
Finance Director, Steelway Engineering`,
  },
  whyItMatters:
    'A new client’s first invoice sets the tone of the relationship. Correcting it quickly and gracefully matters.',
  objectives: ['Correct an invoice properly', 'Apologise to a new client professionally'],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'Correct it',
      prompt: 'How do you correct the invoice?',
      points: 50,
      options: [
        {
          id: 'credit',
          label:
            'Issue a credit note for the wrong invoice and a new invoice for £4,050 plus VAT, and fix the billing schedule',
          verdict: 'best',
          why: 'A credit note keeps the records clean, and fixing the schedule stops the next two invoices being wrong too.',
          effects: { indicators: { satisfaction: 3, risk: -2 } },
        },
        {
          id: 'edit',
          label: 'Edit the original invoice to the right amount',
          verdict: 'poor',
          why: 'Issued invoices must not be edited: it breaks the audit trail.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'next-month',
          label: 'Ask them to pay it and adjust next month’s invoice',
          verdict: 'poor',
          why: 'It makes the client pay more than agreed and complicates every invoice after.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Owen Price, Steelway Engineering',
      title: 'Reply to the client',
      prompt: 'Apologise and explain the correction.',
      points: 50,
      minWords: 35,
      mentions: [['sorry', 'apologise', 'apologies'], ['credit note'], ['4,050', '4050']],
      avoid: [],
      model:
        'Dear Owen, my apologies: your first invoice did not apply the 10% introductory discount. I have issued a credit note for it and a new invoice for £4,050 plus VAT, and corrected your billing schedule so the next two months are right too. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -2, indicators: { satisfaction: -4 } },
  },
  replies: followUpReplies('Owen'),
  lapseLog: 'Steelway Engineering escalated their wrong invoice to {manager}.',
  skills: { bookkeeping: 15, accuracy: 10 },
  xp: 45,
}

export const WORKFLOW_ACCOUNTING: CaseInput[] = [accBilling, accBillingFix]
