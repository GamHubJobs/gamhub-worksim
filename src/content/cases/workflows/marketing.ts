/** Workflows cases: digital-marketing. */
import type { CaseInput } from '../schema'
import { replies, followUpReplies } from './shared'

const mktBudget: CaseInput = {
  id: 'wf-mkt-budget-request',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'workflow',
  minLevel: 2,
  title: 'Ask Finance for a campaign budget',
  summary: 'Turn the summer campaign plan into the budget request Finance needs.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'ab-test' },
  deadlineHours: 6,
  email: {
    subject: 'Summer campaign: budget request to Finance',
    body: `Hi {name},

The summer campaign plan is agreed (attached). Please send Finance the budget request: they need the total, the cost centre, the months and the return we expect.

Sofia`,
  },
  whyItMatters:
    'Marketing gets its money through Finance’s process. A clear, correct request with the expected return is approved quickly; a vague or wrong one is sent back.',
  objectives: [
    'Turn a plan into a budget request',
    'Calculate the expected return',
    'Use Finance’s codes and periods',
  ],
  evidence: [
    {
      id: 'plan',
      title: 'Summer campaign plan',
      table: {
        head: ['Line', 'June', 'July', 'August'],
        rows: [
          ['Search ads', '£2,000', '£2,000', '£1,500'],
          ['Social ads', '£1,200', '£1,200', '£1,000'],
          ['Design and video', '£1,600', '', ''],
        ],
      },
    },
    {
      id: 'forecast',
      title: 'Forecast',
      text: 'Expected: **210 leads**; about 1 in 7 becomes a client, worth **£1,500** each on average.',
    },
    {
      id: 'finance',
      title: 'Finance: how to request budget',
      text: 'Marketing cost centre: **MKT-200**. Give the total, the months, and the expected revenue.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The budget request',
      prompt: 'Complete the request for Finance.',
      to: 'Finance (budget requests)',
      points: 70,
      fields: [
        {
          id: 'total',
          label: 'Total budget (£)',
          kind: 'number',
          answer: 10500,
          tolerance: 0.5,
          unit: '£',
          why: 'Search £5,500 + social £3,400 + design £1,600 = £10,500.',
        },
        {
          id: 'centre',
          label: 'Cost centre',
          kind: 'text',
          accept: ['mkt-200', 'mkt200'],
          why: 'Marketing’s cost centre is MKT-200.',
        },
        {
          id: 'months',
          label: 'Months',
          kind: 'choice',
          options: ['June', 'June to August', 'July to September'],
          answer: 'June to August',
          why: 'The plan runs June, July and August.',
        },
        {
          id: 'revenue',
          label: 'Expected revenue (£)',
          kind: 'number',
          answer: 45000,
          tolerance: 1,
          unit: '£',
          why: '210 leads ÷ 7 = 30 clients × £1,500 = £45,000.',
        },
      ],
    },
    {
      id: 'roi',
      kind: 'figure',
      title: 'Return on the spend',
      prompt:
        'How many pounds of revenue are expected for every £1 spent (to 1 decimal place)?',
      points: 30,
      answer: 4.3,
      tolerance: 0.05,
      unit: '',
      why: '£45,000 ÷ £10,500 ≈ 4.3.',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 1, indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -1 } },
    lapse: { indicators: { discipline: -2 } },
  },
  replies: replies(
    'Sofia',
    'Finance approved it the same day: they said it was the clearest request they’ve had this year.',
    'Finance has sent the request back with questions.',
  ),
  lapseLog: 'The summer campaign budget request was never sent to Finance.',
  skills: { 'campaign-analytics': 25, 'data-analysis': 10 },
  xp: 80,
}

const mktBudgetFix: CaseInput = {
  id: 'wf-mkt-budget-request-fix',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'workflow',
  minLevel: 2,
  title: 'Finance sends the budget request back',
  summary: 'Finance can’t approve the summer campaign request as it is.',
  from: {
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    organisation: 'Finance & Administration',
  },
  trigger: {
    afterCase: 'wf-mkt-budget-request',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 4,
  email: {
    subject: 'Summer campaign request: returned',
    body: `Hi,

I can’t approve the summer campaign request: some of it doesn’t match the plan you attached. Please correct and resubmit. Approvals close on Friday.

Priya`,
  },
  whyItMatters:
    'Rework costs everyone time; correcting a request promptly keeps the campaign on schedule.',
  objectives: [
    'Correct and resubmit a request',
    'Check figures against the source before sending',
  ],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'Next step',
      prompt: 'What do you do?',
      points: 50,
      options: [
        {
          id: 'correct',
          label:
            'Recheck every figure against the plan, correct the request and resubmit before Friday',
          verdict: 'best',
          why: 'It fixes the request and meets Finance’s deadline.',
          effects: { indicators: { discipline: 2 } },
        },
        {
          id: 'round-up',
          label: 'Resubmit with a round £12,000 to be safe',
          verdict: 'poor',
          why: 'Asking for more than the plan without saying why undermines trust in every future request.',
          effects: { indicators: { discipline: -3 } },
        },
        {
          id: 'argue',
          label: 'Ask Priya to approve it anyway',
          verdict: 'poor',
          why: 'Finance can’t approve figures that don’t match the plan.',
          effects: { trust: { manager: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Priya Raman, Finance',
      title: 'Reply to Priya',
      prompt: 'Thank her and confirm the corrected request.',
      points: 50,
      minWords: 30,
      mentions: [['10,500', '10500'], ['MKT-200'], ['corrected', 'resubmit']],
      avoid: [],
      model:
        'Hi Priya, thanks for catching it, and sorry for the extra work. I have corrected the request to match the plan: £10,500 on cost centre MKT-200, June to August, with £45,000 expected revenue, and resubmitted it today. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -2, indicators: { discipline: -3 } },
  },
  replies: followUpReplies('Priya'),
  lapseLog: 'The summer campaign missed Finance’s approval round.',
  skills: { 'campaign-analytics': 10, accuracy: 10 },
  xp: 45,
}

export const WORKFLOW_MARKETING: CaseInput[] = [mktBudget, mktBudgetFix]
