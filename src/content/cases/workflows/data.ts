/** Workflows cases: data-analytics. */
import type { CaseInput } from '../schema'
import { replies, followUpReplies } from './shared'

const dataSpec: CaseInput = {
  id: 'wf-data-kpi-spec',
  version: 1,
  careerId: 'data-analytics',
  kind: 'workflow',
  minLevel: 2,
  title: 'Turn Operations’ request into a dashboard spec',
  summary:
    'Operations wants a delivery dashboard. Write the specification for the data engineers.',
  from: { name: 'Helen Carter', role: 'Operations Director', organisation: 'Operations' },
  trigger: { afterAssignment: 'studio-dashboard' },
  deadlineHours: 6,
  email: {
    subject: 'Delivery dashboard',
    body: `Hi,

I want a dashboard showing how well we deliver: are jobs on time, and how long do they take? Weekly, please, for the last quarter. The details of how we measure it are in our operations manual (extract attached).

Helen`,
  },
  whyItMatters:
    'A dashboard is only as good as its definitions. Turning a manager’s request into precise metrics (what counts, over what period, from which data) is what lets the data engineers build the right thing first time.',
  objectives: [
    'Define metrics precisely',
    'Translate a business request into a specification',
    'Choose the right data source and period',
  ],
  evidence: [
    {
      id: 'manual',
      title: 'Operations manual (extract)',
      text: 'A job is **on time** if it is completed **on or before** its promised date. Cancelled jobs are **excluded** from delivery measures. Cycle time is measured in **working days** from booking to completion.',
    },
    {
      id: 'sources',
      title: 'Available data',
      table: {
        head: ['Table', 'Contents'],
        rows: [
          ['jobs', 'Booking date, promised date, completed date, status'],
          ['invoices', 'Invoice dates and amounts'],
          ['staff', 'Who worked on what'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The specification',
      prompt: 'Complete the specification for the data engineers.',
      to: 'Data engineering',
      points: 75,
      fields: [
        {
          id: 'source',
          label: 'Source table',
          kind: 'choice',
          options: ['jobs', 'invoices', 'staff'],
          answer: 'jobs',
          why: 'Delivery dates are in the jobs table.',
        },
        {
          id: 'on-time',
          label: 'On-time rule',
          kind: 'choice',
          options: [
            'Completed before the promised date',
            'Completed on or before the promised date',
            'Completed within 5 days of booking',
          ],
          answer: 'Completed on or before the promised date',
          why: 'The manual says on or before the promised date.',
        },
        {
          id: 'cancelled',
          label: 'Cancelled jobs',
          kind: 'choice',
          options: ['Included', 'Excluded'],
          answer: 'Excluded',
          why: 'The manual excludes cancelled jobs from delivery measures.',
        },
        {
          id: 'cycle',
          label: 'Cycle time unit',
          kind: 'choice',
          options: ['Calendar days', 'Working days', 'Hours'],
          answer: 'Working days',
          why: 'The manual measures cycle time in working days.',
        },
        {
          id: 'grain',
          label: 'Time grain',
          kind: 'choice',
          options: ['Daily', 'Weekly', 'Monthly'],
          answer: 'Weekly',
          why: 'Helen asked for weekly figures.',
        },
      ],
    },
    {
      id: 'clarify',
      kind: 'decide',
      title: 'Anything to check?',
      prompt:
        'The manual doesn’t say how to treat jobs still open past their promised date. What do you do?',
      points: 25,
      options: [
        {
          id: 'ask',
          label:
            'Ask Helen, and suggest counting them as late (which is what they will be)',
          verdict: 'best',
          why: 'Definitions belong to the business, and a suggestion makes the decision quick.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'ignore',
          label: 'Leave them out: they aren’t finished',
          verdict: 'poor',
          why: 'Leaving out the latest jobs would make delivery look better than it is.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'guess',
          label: 'Count them as on time until they are completed',
          verdict: 'poor',
          why: 'They are already late; counting them as on time hides problems.',
          effects: { indicators: { risk: 4 } },
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 1, indicators: { satisfaction: 2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Helen',
    'The engineers built it from your spec without a single question. It’s exactly what I wanted.',
    'The engineers have come back with questions about the spec.',
  ),
  lapseLog: 'The delivery dashboard was never specified.',
  skills: { 'data-analysis': 20, 'data-visualisation': 15, 'insight-communication': 10 },
  xp: 85,
}

const dataSpecFix: CaseInput = {
  id: 'wf-data-kpi-spec-fix',
  version: 1,
  careerId: 'data-analytics',
  kind: 'workflow',
  minLevel: 2,
  title: 'The delivery dashboard shows the wrong numbers',
  summary: 'Operations’ on-time figure doesn’t match their own records.',
  from: { name: 'Helen Carter', role: 'Operations Director', organisation: 'Operations' },
  trigger: {
    afterCase: 'wf-data-kpi-spec',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 4,
  email: {
    subject: 'Dashboard numbers look wrong',
    body: `Hi,

The new dashboard says our on-time rate is quite different from what my team measures. The board sees it next week. What’s going on?

Helen`,
  },
  whyItMatters:
    'A wrong definition in a spec turns into wrong numbers in front of the board. Finding and owning it quickly protects everyone.',
  objectives: [
    'Trace a wrong figure to its definition',
    'Correct the specification',
    'Explain it to the business',
  ],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'What do you do?',
      points: 50,
      options: [
        {
          id: 'fix-spec',
          label:
            'Compare the spec with the operations manual, correct the definitions, and have the dashboard rebuilt before the board',
          verdict: 'best',
          why: 'It fixes the cause and the figures together.',
          effects: { indicators: { risk: -3, satisfaction: 2 } },
        },
        {
          id: 'note',
          label: 'Add a note to the dashboard explaining the difference',
          verdict: 'acceptable',
          why: 'Honest, but the board should see the right figures, not an explanation of wrong ones.',
        },
        {
          id: 'defend',
          label: 'Explain that the dashboard is right and the team’s measure is wrong',
          verdict: 'poor',
          why: 'The business owns its definitions; the dashboard must follow the manual.',
          effects: { trust: { manager: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Helen Carter, Operations',
      title: 'Reply to Helen',
      prompt: 'Explain what went wrong and when it will be fixed.',
      points: 50,
      minWords: 35,
      mentions: [
        ['definition', 'spec'],
        ['manual'],
        ['before the board', 'next week', 'fixed'],
      ],
      avoid: [
        {
          terms: ['your team is wrong'],
          why: 'The manual is the agreed definition: the spec should have followed it.',
        },
      ],
      model:
        'Hi Helen, sorry about this: the dashboard specification I wrote did not follow the operations manual’s definitions exactly. I have corrected the spec to match the manual, and the engineers will rebuild the dashboard this week, so the figures will be fixed before the board sees them. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -3, indicators: { risk: 3 } },
  },
  replies: followUpReplies('Helen'),
  lapseLog: 'The board saw the wrong delivery figures.',
  skills: { 'data-analysis': 15, 'insight-communication': 10 },
  xp: 45,
}

export const WORKFLOW_DATA: CaseInput[] = [dataSpec, dataSpecFix]
