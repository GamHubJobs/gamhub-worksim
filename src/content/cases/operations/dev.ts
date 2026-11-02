/** Operations cases: software-development. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const dev: CaseInput = {
  id: 'ops-dev-cloud',
  version: 1,
  careerId: 'software-development',
  kind: 'operations',
  minLevel: 2,
  title: 'The cloud bill is over budget',
  summary:
    'Engineering’s cloud costs have jumped. Find the cause and decide the tool requests.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'working-days-tests' },
  deadlineHours: 6,
  email: {
    subject: 'Cloud bill and tool requests',
    body: `Hi {name},

Our cloud bill this month is well over budget and Finance have asked why. Please find what happened and fix it. There are also three tool requests waiting for a decision.

Samuel`,
  },
  whyItMatters:
    'Cloud costs grow quietly. Developers who read the bill, find waste and decide tool spending sensibly are trusted with budgets.',
  objectives: [
    'Find the cause of a cost overrun',
    'Take corrective action',
    'Decide tool requests within policy and budget',
  ],
  evidence: [
    {
      id: 'bill',
      title: 'Cloud bill this month',
      table: {
        head: ['Item', 'Last month', 'This month'],
        rows: [
          ['Production servers', '£1,100', '£1,120'],
          ['Test environment', '£300', '£310'],
          ['“load-test-temp” servers (16 machines)', '£0', '£1,840'],
          ['Storage', '£200', '£210'],
          ['Total', '£1,600', '£3,480'],
        ],
      },
    },
    {
      id: 'note',
      title: 'Team chat, three weeks ago',
      text: '“Spinning up 16 machines for the load test, will tear them down after.”',
    },
    {
      id: 'tools',
      title: 'Tools we already pay for',
      text: 'Error monitoring (company-wide plan), code hosting, CI pipelines.',
    },
  ],
  steps: [
    {
      id: 'over',
      kind: 'figure',
      title: 'The overspend',
      prompt: 'How much more is this month’s bill than last month’s?',
      points: 20,
      answer: 1880,
      tolerance: 0.5,
      unit: '£',
      why: '£3,480 − £1,600 = £1,880, almost all from the forgotten load-test servers.',
    },
    {
      id: 'fix',
      kind: 'decide',
      title: 'Corrective action',
      prompt: 'What do you do?',
      points: 30,
      options: [
        {
          id: 'teardown',
          label:
            'Shut down the load-test servers today, and add a budget alert and an expiry tag for temporary machines',
          verdict: 'best',
          why: 'It stops the cost now and prevents it happening again.',
          effects: { indicators: { discipline: 4 }, spend: { engineering: -1840 } },
        },
        {
          id: 'teardown-only',
          label: 'Shut down the load-test servers',
          verdict: 'acceptable',
          why: 'It stops the cost, but nothing stops the next forgotten test.',
          effects: { indicators: { discipline: 2 }, spend: { engineering: -1840 } },
        },
        {
          id: 'raise',
          label: 'Ask Finance to raise the cloud budget',
          verdict: 'poor',
          why: 'The money is being wasted; more budget would just fund the waste.',
          effects: { indicators: { discipline: -4 } },
        },
      ],
    },
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Tool requests',
      prompt: 'Approve, reject or escalate each request.',
      points: 50,
      requests: [
        {
          id: 'monitoring',
          summary: 'A second error-monitoring service for one team',
          department: 'engineering',
          amount: 240,
          policyBreach:
            'We already have a company-wide error-monitoring plan; duplicate tools waste money.',
          why: '',
        },
        {
          id: 'test-env',
          summary: 'Extra test environment for a month',
          department: 'engineering',
          amount: 300,
          why: 'A real need, within policy.',
        },
        {
          id: 'database',
          summary: 'Database upgrade for production',
          department: 'engineering',
          amount: 1800,
          why: 'A real need, within policy.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { indicators: { discipline: -4 } },
  },
  replies: replies(
    'Samuel',
    'Great work: the servers are gone, the alert is set up, and Finance are happy with the explanation.',
  ),
  lapseLog: 'The cloud overspend carried on for another week: nobody acted on it.',
  skills: { 'software-design': 20, debugging: 15 },
  xp: 85,
}

export const OPERATIONS_DEV: CaseInput[] = [dev]
