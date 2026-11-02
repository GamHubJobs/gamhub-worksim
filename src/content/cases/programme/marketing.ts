/** Programme cases: digital-marketing. */
import type { CaseInput } from '../schema'
import { brief, replies, stage } from './shared'

const mkt1: CaseInput = {
  ...stage('digital-marketing', 1),
  id: 'prog-mkt-launch',
  version: 1,
  careerId: 'digital-marketing',
  title: 'Manchester office: plan the launch campaign',
  summary: 'Plan the £30,000 launch campaign and hand the budget split to Finance.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'funnel-analysis' },
  deadlineHours: 8,
  email: {
    subject: 'Manchester programme: the launch',
    body: `Hi {name},

Our part of the Manchester programme: a **£30,000** launch campaign to win local clients. Please split the budget (the agreed shares are attached), work out what it should deliver, and hand the split to Finance.

Sofia`,
  },
  whyItMatters:
    'A launch campaign has to fit the programme budget and the office’s readiness, and Finance needs the split to track it.',
  objectives: ['Split a campaign budget', 'Forecast results', 'Hand the plan to Finance'],
  evidence: [
    brief,
    {
      id: 'split',
      title: 'Agreed shares',
      text: 'Search 50%, local events 30%, social 20%. Expected cost per qualified lead: **£75**.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The budget split for Finance',
      prompt: 'Complete the split.',
      to: 'Finance (programme budget)',
      points: 60,
      fields: [
        {
          id: 'search',
          label: 'Search (£)',
          kind: 'number',
          answer: 15000,
          tolerance: 1,
          unit: '£',
          why: '50% of £30,000.',
        },
        {
          id: 'events',
          label: 'Local events (£)',
          kind: 'number',
          answer: 9000,
          tolerance: 1,
          unit: '£',
          why: '30% of £30,000.',
        },
        {
          id: 'social',
          label: 'Social (£)',
          kind: 'number',
          answer: 6000,
          tolerance: 1,
          unit: '£',
          why: '20% of £30,000.',
        },
      ],
    },
    {
      id: 'leads',
      kind: 'figure',
      title: 'Expected leads',
      prompt: 'How many qualified leads should the campaign bring?',
      points: 20,
      answer: 400,
      tolerance: 0,
      unit: 'leads',
      why: '£30,000 ÷ £75 = 400 leads.',
    },
    {
      id: 'timing',
      kind: 'decide',
      title: 'When to launch',
      prompt: 'When should the campaign start?',
      points: 20,
      options: [
        {
          id: 'two-weeks',
          label:
            'Two weeks before opening, so enquiries arrive when the team is there to answer them',
          verdict: 'best',
          why: 'Leads go cold if nobody can respond.',
          effects: { indicators: { satisfaction: 2 } },
        },
        {
          id: 'now',
          label: 'Straight away, to build awareness',
          verdict: 'poor',
          why: 'Months of enquiries with no Manchester team to answer them.',
          effects: { indicators: { discipline: -2 } },
        },
        {
          id: 'after',
          label: 'A month after opening',
          verdict: 'acceptable',
          why: 'Safe, but the new team would start with no clients.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { indicators: { discipline: -1 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Sofia',
    'Finance has the split, and the campaign is booked for two weeks before opening.',
  ),
  lapseLog: 'Manchester’s launch campaign was never planned.',
  skills: { 'campaign-analytics': 25, 'content-strategy': 20 },
  xp: 140,
}

const mkt2: CaseInput = {
  ...stage('digital-marketing', 2),
  id: 'prog-mkt-review',
  version: 1,
  careerId: 'digital-marketing',
  title: 'Manchester office: the launch at the programme review',
  summary: 'Leads are coming in fast but most aren’t followed up. Recommend what to do.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterCase: 'prog-mkt-launch' },
  deadlineHours: 6,
  email: {
    subject: 'Programme review: Manchester leads',
    body: `Hi {name},

The launch has brought **260 leads** in its first two weeks, but the Manchester team has only contacted **90**. The programme review wants our view.

Sofia`,
  },
  whyItMatters:
    'A launch only succeeds when marketing and the people who answer the leads work together. Fixing the hand-over matters more than more leads.',
  objectives: [
    'Find where a campaign’s results are lost',
    'Recommend a cross-department fix',
  ],
  evidence: [brief],
  steps: [
    {
      id: 'uncontacted',
      kind: 'figure',
      title: 'Leads not contacted',
      prompt: 'How many leads have not been contacted?',
      points: 25,
      answer: 170,
      tolerance: 0,
      unit: 'leads',
      why: '260 − 90 = 170.',
    },
    {
      id: 'fix',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'What do you recommend?',
      points: 40,
      options: [
        {
          id: 'slow-route',
          label:
            'Slow the spend for two weeks and route leads automatically to named consultants, with a 48-hour response target',
          verdict: 'best',
          why: 'It fixes the follow-up gap with the Manchester team instead of buying leads nobody answers.',
          effects: { indicators: { satisfaction: 3, discipline: 2 } },
        },
        {
          id: 'more',
          label: 'Increase spend: more leads will mean more clients',
          verdict: 'poor',
          why: 'More leads into a team that can’t answer them wastes money and annoys prospects.',
          effects: { indicators: { discipline: -3 } },
        },
        {
          id: 'blame',
          label: 'Report that the Manchester team isn’t doing its job',
          verdict: 'poor',
          why: 'The team is new and stretched; blame doesn’t fix the process.',
          effects: { reputation: -2 },
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'The programme review',
      title: 'Your note',
      prompt: 'Explain the problem and the fix.',
      points: 35,
      minWords: 40,
      mentions: [['170'], ['48'], ['consultant', 'route']],
      avoid: [{ terms: ['lazy'], why: 'Don’t blame the new team.' }],
      model:
        'The launch is working: 260 leads in two weeks. But 170 haven’t been contacted yet, because the new team is still small. I recommend slowing the spend for two weeks and routing each lead automatically to a named consultant, with a 48-hour response target, so every enquiry gets an answer. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { reputation: -1 },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Sofia',
    'Response times are now under a day, and the conversion rate doubled. Great joined-up thinking.',
  ),
  lapseLog: 'The programme review went ahead without Marketing’s view on the leads.',
  skills: { 'campaign-analytics': 25, 'content-strategy': 15 },
  xp: 120,
}

export const PROGRAMME_MARKETING: CaseInput[] = [mkt1, mkt2]
