/** Incidents cases: office-admin-finance. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const faColleague: CaseInput = {
  id: 'inc-fa-colleague-error',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'incident',
  minLevel: 2,
  title: 'A colleague’s mistake that could hurt a supplier',
  summary: 'Marcus paid a small supplier £48 instead of £4,800, and doesn’t know yet.',
  from: { name: 'Lisa Moore', role: 'Owner', organisation: 'Moore Catering' },
  trigger: { afterAssignment: 'petty-cash' },
  deadlineHours: 4,
  email: {
    subject: 'Payment received: only £48?',
    body: `Hello,

We received £48.00 from you today for our invoice **MC-118 (£4,800)** for the conference catering. Was that a mistake? We’re a small business and we’re relying on that payment to pay our staff on Friday.

Lisa Moore
Moore Catering`,
  },
  whyItMatters:
    'Everyone makes mistakes. What matters is that they are fixed fast, honestly and without blame, and small suppliers depend on being paid correctly.',
  objectives: [
    'Investigate a payment error',
    'Handle a colleague’s mistake fairly',
    'Put it right for the supplier quickly',
  ],
  evidence: [
    {
      id: 'payment',
      title: 'This morning’s payment run',
      text: 'Moore Catering, invoice MC-118, amount entered **£48.00** (invoice total £4,800.00). Prepared by Marcus Webb, approved in the batch.',
    },
    {
      id: 'urgent',
      title: 'Same-day payments',
      text: 'An urgent same-day payment can be made before 3 pm with the manager’s approval.',
    },
  ],
  steps: [
    {
      id: 'owed',
      kind: 'figure',
      title: 'What is still owed',
      prompt: 'How much do we still owe Moore Catering?',
      points: 20,
      answer: 4752,
      tolerance: 0.5,
      unit: '£',
      why: '£4,800 − £48 = £4,752.',
    },
    {
      id: 'handle',
      kind: 'decide',
      title: 'How you handle it',
      prompt: 'What do you do?',
      points: 45,
      options: [
        {
          id: 'fix-together',
          label:
            'Arrange a same-day payment of £4,752 with Priya’s approval, tell Marcus privately so he can learn from it, and suggest a check on large differences in the payment run',
          verdict: 'best',
          why: 'The supplier is paid today, Marcus is treated fairly, and the process is improved.',
          effects: {
            trust: { senior: 3, manager: 2 },
            indicators: { satisfaction: 3, risk: -2 },
          },
        },
        {
          id: 'announce',
          label: 'Tell the whole team in the meeting that Marcus made the mistake',
          verdict: 'poor',
          why: 'Public blame humiliates a colleague and makes people hide mistakes.',
          effects: { trust: { senior: -5 } },
        },
        {
          id: 'next-run',
          label: 'Add the balance to next week’s payment run',
          verdict: 'poor',
          why: 'The supplier can’t pay their staff on Friday because of our mistake.',
          effects: { indicators: { satisfaction: -4 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Lisa Moore, Moore Catering',
      title: 'Reply to the supplier',
      prompt: 'Apologise, confirm the amount and when it arrives.',
      points: 35,
      minWords: 40,
      mentions: [['sorry', 'apologise', 'apologies'], ['4,752', '4752'], ['today']],
      avoid: [
        {
          terms: ['Marcus'],
          why: 'Don’t name colleagues to suppliers: the company made the mistake.',
        },
      ],
      model:
        'Dear Lisa, I am so sorry: that was our mistake, an error when the payment was entered. We are sending the remaining £4,752 today as a same-day payment, so it will be with you this afternoon, well before Friday. Thank you for letting us know so quickly. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -3 } },
    lapse: { reputation: -3, indicators: { satisfaction: -5 } },
  },
  replies: replies(
    'Lisa',
    'The payment arrived this afternoon. Thank you for sorting it so quickly and kindly.',
  ),
  lapseLog:
    'Moore Catering could not pay their staff on time because of our underpayment.',
  skills: { accuracy: 20, 'finance-basics': 20 },
  xp: 100,
}

export const INCIDENT_FINANCE: CaseInput[] = [faColleague]
