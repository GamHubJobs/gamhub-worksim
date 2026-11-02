/** Incidents cases: accounting. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const accEthics: CaseInput = {
  id: 'inc-acc-bad-debt',
  version: 1,
  careerId: 'accounting',
  kind: 'incident',
  minLevel: 3,
  title: 'Asked to delay a bad debt',
  summary:
    'A client has gone into administration. You’re asked to leave their debt until next quarter.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'month-end-close' },
  deadlineHours: 5,
  email: {
    subject: 'Steelway: leave it until July?',
    body: `Hi {name},

Steelway Engineering went into administration yesterday, owing us **£18,000**. The administrators say unsecured creditors will get about **10p in the pound**. If we write it off this quarter we miss our profit target. Could we leave it as a normal debt until July? Nobody will notice.

Daniel`,
  },
  whyItMatters:
    'Accounts must show a true and fair view. Delaying a known loss to hit a target misleads directors, lenders and auditors, and accountants have a professional duty to refuse, kindly and clearly, even when the request comes from their manager.',
  objectives: [
    'Apply the rules for doubtful debts',
    'Calculate the loss to recognise',
    'Refuse an improper request professionally',
  ],
  evidence: [
    {
      id: 'administration',
      title: 'Administrator’s notice',
      text: 'Steelway Engineering Ltd entered administration on 28 June. Expected dividend to unsecured creditors: **about 10p in the pound**.',
    },
    {
      id: 'policy',
      title: 'Accounting policy: doubtful debts',
      text: 'When there is evidence that a debt will not be recovered in full, the expected loss is recognised **in the period in which the evidence arises**.',
    },
  ],
  steps: [
    {
      id: 'loss',
      kind: 'figure',
      title: 'The expected loss',
      prompt: 'How much of the £18,000 should be recognised as a loss this quarter?',
      points: 30,
      answer: 16200,
      tolerance: 1,
      unit: '£',
      why: 'At 10p in the pound we expect £1,800 back, so the loss is £16,200.',
    },
    {
      id: 'decision',
      kind: 'decide',
      title: 'Your answer',
      prompt: 'What do you do?',
      points: 40,
      options: [
        {
          id: 'recognise',
          label:
            'Recognise the £16,200 loss this quarter, explain why to Daniel, and offer to help him explain the miss to the directors',
          verdict: 'best',
          why: 'The policy and the law require it, and helping explain the result supports your manager without misleading anyone.',
          effects: { trust: { manager: 1 }, indicators: { risk: -5 } },
        },
        {
          id: 'delay',
          label: 'Leave it until July as asked',
          verdict: 'poor',
          why: 'It misstates profit to directors, lenders and auditors: it is the kind of decision that ends careers.',
          effects: { indicators: { risk: 10 }, reputation: -4 },
        },
        {
          id: 'escalate',
          label: 'Report Daniel to the finance director straight away',
          verdict: 'acceptable',
          why: 'Right if he insists, but a clear conversation first is fairer: many such requests are made under pressure and withdrawn.',
          effects: { trust: { manager: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Daniel Okoro',
      title: 'Reply to Daniel',
      prompt: 'Refuse clearly and kindly, with the reason and a way forward.',
      points: 30,
      minWords: 50,
      mentions: [
        ['16,200', '16200'],
        ['policy', 'true and fair', 'auditor'],
        ['this quarter'],
        ['help', 'explain'],
      ],
      avoid: [{ terms: ['nobody will notice'], why: 'Never agree to hide it.' }],
      model:
        'Hi Daniel, I understand the pressure of the target, but I don’t think we can leave it. The administrators’ notice is evidence that we will only recover about £1,800, so our policy, and the auditors, require us to recognise the £16,200 loss this quarter. I would be glad to help explain the miss to the directors: it is a one-off client failure, not a problem with the business. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 4, indicators: { risk: -3 } },
    fail: { indicators: { risk: 4 } },
    lapse: { indicators: { risk: 5 } },
  },
  replies: replies(
    'Daniel',
    'You’re right, and thank you for putting it so well. I shouldn’t have asked. We’ll explain it to the directors together.',
  ),
  lapseLog: 'The quarter closed without the Steelway debt being dealt with.',
  skills: { 'financial-reporting': 35, accuracy: 15 },
  xp: 120,
}

export const INCIDENT_ACCOUNTING: CaseInput[] = [accEthics]
