/** Programme cases: office-admin-finance. */
import type { CaseInput } from '../schema'
import { brief, replies, stage } from './shared'

const fa1: CaseInput = {
  ...stage('office-admin-finance', 1),
  id: 'prog-fa-budget',
  version: 1,
  careerId: 'office-admin-finance',
  title: 'Manchester office: consolidate the programme budget',
  summary:
    'Every department has sent its one-off costs. Consolidate them against the £420,000 budget.',
  from: {
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    organisation: 'Finance & Administration',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'savings-proposal' },
  deadlineHours: 8,
  email: {
    subject: 'Manchester programme: the budget',
    body: `Hi {name},

The board has approved the Manchester office. Every department has sent its one-off costs (attached). Please consolidate them, add a 10% contingency, and tell the programme board whether we fit the £420,000.

Priya`,
  },
  whyItMatters:
    'A programme budget brings every department’s numbers together. Consolidating them correctly, with a contingency for the unexpected, is what lets the board decide with confidence.',
  objectives: [
    'Consolidate costs from several departments',
    'Apply a contingency',
    'Compare against an approved budget',
  ],
  evidence: [
    brief,
    {
      id: 'costs',
      title: 'One-off costs sent by the departments',
      table: {
        head: ['Department', 'Item', 'Cost'],
        rows: [
          ['Operations', 'Fit-out and furniture', '£60,000'],
          ['Operations', 'Lease deposit (3 months)', '£24,000'],
          ['IT Support', 'Laptops, network and phones', '£52,000'],
          ['People & Culture', 'Recruitment fees (20 hires)', '£150,000'],
          ['Marketing', 'Launch campaign', '£30,000'],
          ['Engineering', 'System changes', '£18,000'],
          ['Data & Insight', 'Business case and dashboard', '£6,000'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'total',
      kind: 'figure',
      title: 'Total one-off costs',
      prompt: 'What do the departments’ one-off costs add up to?',
      points: 25,
      answer: 340000,
      tolerance: 1,
      unit: '£',
      why: '60 + 24 + 52 + 150 + 30 + 18 + 6 = £340,000.',
    },
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The budget for the programme board',
      prompt: 'Complete the budget summary for the programme board.',
      to: 'Programme board',
      points: 50,
      fields: [
        {
          id: 'contingency',
          label: 'Contingency at 10% (£)',
          kind: 'number',
          answer: 34000,
          tolerance: 1,
          unit: '£',
          why: '10% of £340,000 = £34,000.',
        },
        {
          id: 'with',
          label: 'Total with contingency (£)',
          kind: 'number',
          answer: 374000,
          tolerance: 1,
          unit: '£',
          why: '£340,000 + £34,000 = £374,000.',
        },
        {
          id: 'headroom',
          label: 'Headroom left in the £420,000 (£)',
          kind: 'number',
          answer: 46000,
          tolerance: 1,
          unit: '£',
          why: '£420,000 − £374,000 = £46,000.',
        },
        {
          id: 'fits',
          label: 'Does it fit the approved budget?',
          kind: 'choice',
          options: ['Yes', 'No'],
          answer: 'Yes',
          why: 'With contingency it is £46,000 under the £420,000.',
        },
      ],
    },
    {
      id: 'largest',
      kind: 'decide',
      title: 'The biggest risk',
      prompt: 'Which cost should the programme board watch most closely, and why?',
      points: 25,
      options: [
        {
          id: 'recruitment',
          label:
            'Recruitment fees (£150,000): the largest cost, and it rises if hiring is slow or agencies are used more',
          verdict: 'best',
          why: 'It is almost half the total and the most uncertain.',
          effects: { indicators: { discipline: 2 } },
        },
        {
          id: 'marketing',
          label: 'The launch campaign: marketing always overspends',
          verdict: 'poor',
          why: 'A prejudice, not evidence: it is £30,000 and agreed.',
        },
        {
          id: 'none',
          label: 'None: the contingency covers everything',
          verdict: 'acceptable',
          why: 'The contingency helps, but the biggest, most uncertain cost still needs watching.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { discipline: 3 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Priya',
    'The programme board approved the budget in ten minutes. Clear and correct.',
  ),
  lapseLog: 'The programme board met without a consolidated budget.',
  skills: { 'finance-basics': 30, formulas: 10, accuracy: 20 },
  xp: 140,
}

const fa2: CaseInput = {
  ...stage('office-admin-finance', 2),
  id: 'prog-fa-review',
  version: 1,
  careerId: 'office-admin-finance',
  title: 'Manchester office: the programme review',
  summary: 'Recruitment is running over. Recommend what to do at the programme review.',
  from: {
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    organisation: 'Finance & Administration',
    personId: 'manager',
  },
  trigger: { afterCase: 'prog-fa-budget' },
  deadlineHours: 6,
  email: {
    subject: 'Programme review: recruitment costs',
    body: `Hi {name},

People & Culture say recruitment will cost **£190,000**, not £150,000, because agencies are filling the developer roles. Please recommend what we do at today’s programme review.

Priya`,
  },
  whyItMatters:
    'Programmes change. Re-forecasting honestly and recommending options with their trade-offs is how budget holders keep programmes on track.',
  objectives: [
    'Re-forecast a programme budget',
    'Recommend an option with its trade-offs',
  ],
  evidence: [brief],
  steps: [
    {
      id: 'forecast',
      kind: 'figure',
      title: 'The new forecast',
      prompt:
        'With recruitment at £190,000 and the same £34,000 contingency, what is the new total?',
      points: 30,
      answer: 414000,
      tolerance: 1,
      unit: '£',
      why: '£340,000 + £40,000 + £34,000 = £414,000: still within £420,000, but only £6,000 to spare.',
    },
    {
      id: 'recommend',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'What do you recommend?',
      points: 35,
      options: [
        {
          id: 'proceed-watch',
          label:
            'Proceed: it still fits, but report that the contingency is nearly used and ask People & Culture to recruit directly where they can',
          verdict: 'best',
          why: 'Honest about the risk and acts on the cause, without stopping the programme.',
          effects: { indicators: { discipline: 3, risk: -2 } },
        },
        {
          id: 'hide',
          label: 'Absorb it quietly in the contingency',
          verdict: 'poor',
          why: 'The board needs to know the contingency is almost gone.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'delay',
          label: 'Delay the opening to save money',
          verdict: 'acceptable',
          why: 'Possible, but the budget still fits; delaying has its own costs.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'The programme board',
      title: 'Your note to the board',
      prompt: 'Summarise the change, the forecast and your recommendation.',
      points: 35,
      minWords: 45,
      mentions: [['190,000', '190k'], ['414,000', '414k'], ['contingency'], ['direct']],
      avoid: [],
      model:
        'Recruitment is now forecast at £190,000 instead of £150,000 because agencies are filling the developer roles. The programme forecast is £414,000 against the £420,000 approved, so it still fits, but the contingency is almost used. I recommend we proceed, with People & Culture recruiting directly wherever possible, and that we report the budget weekly until opening. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Priya',
    'The board agreed: direct hiring saved £22,000 in the end. Great programme work.',
  ),
  lapseLog: 'The programme review went ahead without Finance’s recommendation.',
  skills: { 'finance-basics': 25, presentation: 15 },
  xp: 120,
}

export const PROGRAMME_FINANCE: CaseInput[] = [fa1, fa2]
