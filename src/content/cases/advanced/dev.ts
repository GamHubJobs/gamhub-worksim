/** Advanced cases: software-development. */
import type { CaseInput } from '../schema'
import { replies, OUTCOMES } from './shared'

/** Software Development: a report got slow after a release. */
const devPerformance: CaseInput = {
  id: 'adv-dev-slow-report',
  version: 1,
  careerId: 'software-development',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'The month-end report got slow',
  summary:
    'Since the last release, Finance’s month-end report takes 9 minutes instead of 40 seconds.',
  from: {
    name: 'Irene Shaw',
    role: 'Financial Controller',
    organisation: 'Finance & Administration',
  },
  trigger: {},
  deadlineHours: 6,
  email: {
    subject: 'Month-end report: 9 minutes!',
    body: `Hi,

Since Tuesday’s release, the month-end report takes **9 minutes** to run instead of 40 seconds. Month-end close is on Friday and we run it many times a day. Can you fix it?

Irene Shaw
Financial Controller`,
  },
  whyItMatters:
    'Performance problems are bugs. Finding the cause from evidence (what changed, and by how much) beats guessing, and a test that measures speed stops the same problem coming back.',
  objectives: [
    'Find the cause of a slowdown from the evidence',
    'Estimate the cost of a design choice',
    'Fix it properly and protect it with a test',
  ],
  evidence: [
    {
      id: 'timings',
      title: 'Report run times',
      table: {
        head: ['Release', 'Invoices in report', 'Run time'],
        rows: [
          ['4.1', '6,000', '40 seconds'],
          ['4.2 (Tuesday)', '6,000', '9 minutes'],
        ],
      },
    },
    {
      id: 'changes',
      title: 'Changes in release 4.2',
      text: '1. Each invoice line now shows its amount in pounds, using the exchange rates service: one call for each invoice (about 85 ms per call). 2. A new font for the PDF. 3. Extra logging when the report starts and ends.',
    },
  ],
  steps: [
    {
      id: 'diagnose',
      kind: 'review',
      title: 'Find the cause',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'started',
          text: 'The slowdown started with release 4.2.',
          issue: true,
          why: 'The same 6,000 invoices took 40 seconds on 4.1 and 9 minutes on 4.2.',
        },
        {
          id: 'font',
          text: 'The new font is the most likely cause.',
          issue: false,
          why: 'A font changes the PDF once, not per invoice; it cannot add minutes.',
        },
        {
          id: 'rates',
          text: 'Calling the exchange rates service once per invoice accounts for most of the slowdown.',
          issue: true,
          why: '6,000 calls at about 85 ms is about 8.5 minutes, almost exactly the difference.',
        },
        {
          id: 'rollback',
          text: 'Rolling back release 4.2 would also remove the currency feature Finance asked for.',
          issue: true,
          why: 'That is why a fix is better than a rollback, unless the fix takes too long.',
        },
      ],
    },
    {
      id: 'cost',
      kind: 'figure',
      title: 'The cost of one call per invoice',
      prompt: 'How many seconds do 6,000 calls of 85 ms each add?',
      points: 20,
      answer: 510,
      tolerance: 0.5,
      unit: 'seconds',
      why: '6,000 × 0.085 s = 510 seconds, or 8.5 minutes.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'The fix',
      prompt: 'What do you do?',
      points: 25,
      options: [
        {
          id: 'cache',
          label:
            'Fetch each currency’s rate once per report and reuse it, and add a test that fails if the report takes more than a minute',
          verdict: 'best',
          why: 'It removes thousands of calls, keeps the feature, and the test stops the problem returning.',
          effects: { indicators: { risk: -2 }, trust: { manager: 2 } },
        },
        {
          id: 'overnight',
          label: 'Ask Finance to run the report overnight instead',
          verdict: 'poor',
          why: 'It hides the defect and does not work for a team that runs the report many times a day at month end.',
          effects: { indicators: { satisfaction: -3 } },
        },
        {
          id: 'rollback',
          label: 'Roll back release 4.2 until there is time to look into it',
          verdict: 'acceptable',
          why: 'It restores speed quickly, but removes a feature Finance needs and leaves the real problem unsolved.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Irene Shaw, Finance & Administration',
      title: 'Reply to Finance',
      prompt:
        'Write to Irene: the cause, the fix, when, and how you will stop it happening again.',
      points: 25,
      minWords: 50,
      model:
        'Hi Irene, sorry about this, and thanks for the clear report. The new currency feature calls the exchange rate service once for every invoice: 6,000 calls add about 8.5 minutes. I will fetch each rate once per report and reuse it, which should bring it back under a minute, and add a test that fails if the report slows down again. You will have the fix tomorrow, well before Friday. Best, {name}',
      mentions: [
        ['exchange rate', 'currency', 'rates'],
        ['once', 'reuse', 'cache'],
        ['test'],
      ],
      avoid: [
        {
          terms: ['works on my machine', 'not a bug'],
          why: 'A nine-minute report is a defect; own it.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Irene',
    'The report runs in 35 seconds now, quicker than before. Thank you, and for explaining it so clearly.',
  ),
  lapseLog: 'Finance spent the day waiting nine minutes for every report run.',
  skills: { debugging: 25, 'software-testing': 20 },
  xp: 140,
}

export const ADVANCED_DEV: CaseInput[] = [devPerformance]
