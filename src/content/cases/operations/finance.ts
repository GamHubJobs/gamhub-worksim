/** Operations cases: office-admin-finance. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const finance: CaseInput = {
  id: 'ops-fa-purchases',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'operations',
  minLevel: 2,
  title: 'This week’s purchase requests',
  summary:
    'Five purchase requests are waiting for a decision, and one requester needs an answer.',
  from: {
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    organisation: 'Finance & Administration',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'budget-report' },
  deadlineHours: 7,
  email: {
    subject: 'Purchase requests for you to decide',
    body: `Hi {name},

From this week you approve purchase requests up to your limit. Five are waiting in the queue. For each one: **approve** it if it is within policy, your limit and the department’s remaining budget; **reject** it if it breaks the policy; **escalate** it to me if it is above your limit or the budget.

Then let Ben know about his request, kindly.

Priya`,
  },
  whyItMatters:
    'Approvals are how organisations control spending. Applying the same rules to everyone, staying within your authority and explaining decisions kindly keeps money safe without slowing the business down.',
  objectives: [
    'Apply the purchasing policy',
    'Stay within your approval limit and the budget',
    'Explain a refusal helpfully',
  ],
  evidence: [
    {
      id: 'policy',
      title: 'Purchasing policy (extract)',
      text: 'Company money is **not** spent on alcohol. Personal items are not company purchases. Purchases over **£1,000** need **two quotes**. Requests above your approval limit, or above the department’s remaining budget, go to the budget holder.',
    },
  ],
  steps: [
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Decide each request',
      prompt: 'Approve, reject or escalate each request.',
      points: 60,
      requests: [
        {
          id: 'stationery',
          summary: 'Stationery restock (Facilities)',
          department: 'finance',
          amount: 180,
          why: 'Routine supplies within policy.',
        },
        {
          id: 'chair',
          summary: 'Ergonomic chair (medical note attached)',
          department: 'people',
          amount: 420,
          why: 'A reasonable adjustment, within policy.',
        },
        {
          id: 'wine',
          summary: 'Team celebration: dinner and wine',
          department: 'operations',
          amount: 350,
          policyBreach: 'Company money is not spent on alcohol.',
          why: '',
        },
        {
          id: 'printer',
          summary: 'Replacement printer, two quotes attached',
          department: 'finance',
          amount: 1450,
          why: 'Within policy, with quotes.',
        },
        {
          id: 'tablet',
          summary: 'Tablet for a manager’s home use',
          department: 'operations',
          amount: 480,
          policyBreach: 'Personal items are not company purchases.',
          why: '',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Ben Adeyemi, Operations',
      title: 'Tell Ben about the team dinner',
      prompt:
        'Explain why the dinner request can’t be approved as it is, and what he can do.',
      points: 40,
      minWords: 40,
      mentions: [['alcohol', 'wine'], ['policy'], ['resubmit', 'without', 'food']],
      avoid: [
        {
          terms: ['you should know', 'obviously'],
          why: 'Be kind: the rule isn’t well known.',
        },
      ],
      model:
        'Hi Ben, thanks for organising a celebration for the team. I can’t approve this request as it is, because the purchasing policy doesn’t allow company money to be spent on alcohol. If you resubmit it for the meal without the wine, I will approve it straight away. Sorry I can’t do more! {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { discipline: 3 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { indicators: { satisfaction: -3, discipline: -2 } },
  },
  replies: replies(
    'Priya',
    'Spot on: the right ones approved, the rest rejected or sent to me with the reasons. Ben has resubmitted without the wine.',
  ),
  lapseLog:
    'Purchase requests waited all week for a decision: the requesters complained to {manager}.',
  skills: { 'finance-basics': 30, accuracy: 20 },
  xp: 90,
}

export const OPERATIONS_FINANCE: CaseInput[] = [finance]
