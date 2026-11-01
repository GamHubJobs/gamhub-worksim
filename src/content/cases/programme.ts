/**
 * The Manchester office programme: every career delivers its own workstream
 * in two stages (its contribution, then the programme review), using what
 * the other departments hand over. Simulated colleagues deliver the other
 * workstreams. Each career's two stages form a project in the portfolio.
 */
import { PROGRAMME } from '../programme'
import type { CaseInput } from './schema'

const brief = {
  id: 'programme',
  title: 'Programme brief: the Manchester office',
  text: PROGRAMME.facts.join('\n\n'),
}

const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks: a solid contribution to the programme.

${sender}`,
  pass: `Hi {name},

Thanks. A few things need another look before the programme board.

${sender}`,
  fail: `Hi {name},

This isn’t ready for the programme board yet.

${sender}`,
})

const stage = (careerId: string, n: 1 | 2) => ({
  projectId: `expansion-${careerId}`,
  kind: 'programme' as const,
  minLevel: 3,
  ...(n === 1 ? {} : {}),
})

// ---------------------------------------------------------------------------
// Finance & Admin: the programme budget
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Accounting: accounting set-up
// ---------------------------------------------------------------------------

const acc1: CaseInput = {
  ...stage('accounting', 1),
  id: 'prog-acc-setup',
  version: 1,
  careerId: 'accounting',
  title: 'Manchester office: set up the accounting',
  summary: 'Classify the programme’s costs and set up the new cost centre.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'books-payroll' },
  deadlineHours: 8,
  email: {
    subject: 'Manchester programme: accounting set-up',
    body: `Hi {name},

Accounting’s part of the Manchester programme: set up the new office’s cost centre, and classify the one-off costs Finance has consolidated as capital (on the balance sheet) or running costs (in the profit and loss).

Daniel`,
  },
  whyItMatters:
    'Classifying costs correctly decides what hits this year’s profit and what is spread over the years an asset is used. A new office has lots of both.',
  objectives: [
    'Classify capital and running costs',
    'Set up a cost centre',
    'Calculate depreciation',
  ],
  evidence: [
    brief,
    {
      id: 'policy',
      title: 'Capital expenditure policy',
      text: 'Items over £1,000 that will be used for more than a year are **capital**. Everything else is a **running cost**. New cost centres follow the pattern **CC-[site]-[number]**; Manchester is site **MAN**, and the first number is **01**.',
    },
  ],
  steps: [
    {
      id: 'classify',
      kind: 'review',
      title: 'Which costs are capital?',
      prompt: 'Tick the costs that are capital expenditure.',
      points: 35,
      findings: [
        {
          id: 'fitout',
          text: 'Fit-out and furniture (£60,000)',
          issue: true,
          why: 'Used for years, over £1,000: capital.',
        },
        {
          id: 'network',
          text: 'Network equipment and laptops (£52,000)',
          issue: true,
          why: 'Used for several years: capital.',
        },
        {
          id: 'recruitment',
          text: 'Recruitment fees (£150,000)',
          issue: false,
          why: 'A service, used up when people are hired: a running cost.',
        },
        {
          id: 'campaign',
          text: 'Launch campaign (£30,000)',
          issue: false,
          why: 'Marketing is a running cost.',
        },
      ],
    },
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The accounting set-up',
      prompt: 'Complete the set-up for the asset register and the ledger.',
      to: 'Asset register and Books',
      points: 40,
      fields: [
        {
          id: 'centre',
          label: 'Cost centre code',
          kind: 'text',
          accept: ['cc-man-01'],
          why: 'The pattern is CC-[site]-[number]: CC-MAN-01.',
        },
        {
          id: 'monthly',
          label: 'Monthly depreciation of the fit-out (£)',
          kind: 'number',
          answer: 1000,
          tolerance: 0.5,
          unit: '£',
          why: '£60,000 over 5 years = £12,000 a year = £1,000 a month.',
        },
        {
          id: 'capital',
          label: 'Total capital expenditure (£)',
          kind: 'number',
          answer: 112000,
          tolerance: 1,
          unit: '£',
          why: 'Fit-out £60,000 + equipment £52,000 = £112,000.',
        },
      ],
    },
    {
      id: 'deposit',
      kind: 'decide',
      title: 'The lease deposit',
      prompt: 'How should the £24,000 lease deposit be recorded?',
      points: 25,
      options: [
        {
          id: 'asset',
          label: 'As an asset (a deposit we get back at the end of the lease)',
          verdict: 'best',
          why: 'It is refundable, so it is money owed to us, not a cost.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'cost',
          label: 'As rent this year',
          verdict: 'poor',
          why: 'It isn’t rent: it is returned at the end of the lease.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'capital',
          label: 'As capital expenditure, depreciated',
          verdict: 'poor',
          why: 'A deposit doesn’t wear out: it is a receivable, not a fixed asset.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Daniel',
    'Set up exactly right. The auditors will have nothing to ask about Manchester.',
  ),
  lapseLog: 'Manchester’s costs were posted without a cost centre or classification.',
  skills: { 'financial-reporting': 30, bookkeeping: 20 },
  xp: 140,
}

const acc2: CaseInput = {
  ...stage('accounting', 2),
  id: 'prog-acc-review',
  version: 1,
  careerId: 'accounting',
  title: 'Manchester office: the first quarter’s figures',
  summary: 'Present Manchester’s first quarter to the programme review.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterCase: 'prog-acc-setup' },
  deadlineHours: 6,
  email: {
    subject: 'Programme review: Manchester’s first quarter',
    body: `Hi {name},

The programme review wants Manchester’s first quarter: costs so far, and whether the office is on track. One director thinks we should leave depreciation out “because it isn’t real money”.

Daniel`,
  },
  whyItMatters:
    'Reporting a new site’s results honestly, including non-cash costs, lets the board judge it fairly.',
  objectives: ['Report a site’s results completely', 'Explain non-cash costs'],
  evidence: [
    brief,
    {
      id: 'quarter',
      title: 'Manchester, first quarter',
      table: {
        head: ['Line', 'Amount'],
        rows: [
          ['Rent (3 months)', '£24,000'],
          ['Salaries', '£310,000'],
          ['Other running costs', '£18,000'],
          ['Depreciation (3 months)', '£3,000'],
          ['Revenue', '£290,000'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'result',
      kind: 'figure',
      title: 'The quarter’s result',
      prompt:
        'What was Manchester’s profit or loss in its first quarter (a loss as a negative number)?',
      points: 35,
      answer: -65000,
      tolerance: 1,
      unit: '£',
      why: '£290,000 − (£24,000 + £310,000 + £18,000 + £3,000) = −£65,000.',
    },
    {
      id: 'depreciation',
      kind: 'decide',
      title: 'Leaving out depreciation',
      prompt: 'What do you say to the director?',
      points: 30,
      options: [
        {
          id: 'include',
          label:
            'Keep it in: the fit-out is being used up, and leaving it out would flatter the result. Explain it in one sentence.',
          verdict: 'best',
          why: 'A true picture includes the cost of the assets the office uses.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'remove',
          label: 'Remove it: it’s only £3,000',
          verdict: 'poor',
          why: 'Small or not, results must be complete and consistent.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'both',
          label: 'Show the result with and without it, and let the board choose',
          verdict: 'acceptable',
          why: 'Transparent, but the board should see one correct figure, with depreciation explained.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'The programme review',
      title: 'Your summary',
      prompt: 'Summarise the first quarter and what it means.',
      points: 35,
      minWords: 40,
      mentions: [
        ['65,000', '65k'],
        ['depreciation'],
        ['first quarter', 'expected', 'ramp'],
      ],
      avoid: [
        {
          terms: ['disaster', 'failing'],
          why: 'A new office making a first-quarter loss is normal: report it calmly.',
        },
      ],
      model:
        'Manchester made a loss of £65,000 in its first quarter: revenue of £290,000 against £355,000 of costs, including £3,000 of depreciation on the fit-out. A first-quarter loss is expected while new staff ramp up; revenue grew each month, and the business case expects the office to break even in its third quarter. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { reputation: -1 },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Daniel',
    'The board appreciated the honest figures, and the director accepted the depreciation point.',
  ),
  lapseLog: 'The programme review had no figures for Manchester.',
  skills: { 'financial-reporting': 30, accuracy: 10 },
  xp: 120,
}

// ---------------------------------------------------------------------------
// IT Help Desk: technology and equipment
// ---------------------------------------------------------------------------

const it1: CaseInput = {
  ...stage('it-support', 1),
  id: 'prog-it-equipment',
  version: 1,
  careerId: 'it-support',
  title: 'Manchester office: the technology plan',
  summary:
    'Work out the laptops for the new hires from People & Culture’s plan, and hand the order to Finance.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'network-printing' },
  deadlineHours: 8,
  email: {
    subject: 'Manchester programme: IT’s part',
    body: `Hi {name},

People & Culture have sent the hiring plan for Manchester. Please work out the laptops we need (by our standards), and hand the order to Finance so it fits their budget.

Ravi`,
  },
  whyItMatters:
    'IT’s plan depends on HR’s hiring plan and feeds Finance’s budget: a wrong number in the middle of that chain becomes a wrong order and a wrong budget.',
  objectives: [
    'Turn another department’s plan into an equipment order',
    'Apply equipment standards',
    'Hand costs to Finance correctly',
  ],
  evidence: [
    brief,
    {
      id: 'standards',
      title: 'IT equipment standards',
      text: 'Standard laptop **£1,100**: consultants and administrators. Analyst laptop **£1,600**: analysts and developers. Transferring staff bring their laptops.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The laptop order',
      prompt: 'Complete the order for Finance.',
      to: 'Finance (programme budget)',
      points: 70,
      fields: [
        {
          id: 'standard',
          label: 'Standard laptops',
          kind: 'number',
          answer: 10,
          tolerance: 0,
          unit: '',
          why: '8 consultants + 2 administrators = 10.',
        },
        {
          id: 'analyst',
          label: 'Analyst laptops',
          kind: 'number',
          answer: 10,
          tolerance: 0,
          unit: '',
          why: '6 analysts + 4 developers = 10.',
        },
        {
          id: 'cost',
          label: 'Total laptop cost (£)',
          kind: 'number',
          answer: 27000,
          tolerance: 1,
          unit: '£',
          why: '10 × £1,100 + 10 × £1,600 = £27,000.',
        },
        {
          id: 'by',
          label: 'Needed by',
          kind: 'choice',
          options: ['1 September', 'The week before 1 September', '1 October'],
          answer: 'The week before 1 September',
          why: 'Laptops must be set up before people start.',
        },
      ],
    },
    {
      id: 'transfers',
      kind: 'decide',
      title: 'The five transfers',
      prompt: 'Do the five transferring staff need anything?',
      points: 30,
      options: [
        {
          id: 'access',
          label:
            'No new laptops, but update their office location, printers and site access',
          verdict: 'best',
          why: 'They keep their laptops, but their set-up must follow them to Manchester.',
          effects: { indicators: { satisfaction: 2 } },
        },
        {
          id: 'new',
          label: 'New laptops for them too, for consistency',
          verdict: 'poor',
          why: 'The standard says they bring theirs: £5,500+ wasted.',
          effects: { indicators: { discipline: -3 } },
        },
        {
          id: 'nothing',
          label: 'Nothing: they’re already set up',
          verdict: 'acceptable',
          why: 'Their laptops are fine, but printers and access at the new site would be missing.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Ravi',
    'Finance confirmed the order fits the budget, and the laptops arrive the week before opening.',
  ),
  lapseLog: 'Manchester’s equipment was never ordered.',
  skills: { troubleshooting: 15, accuracy: 15, 'customer-service': 10 },
  xp: 140,
}

const it2: CaseInput = {
  ...stage('it-support', 2),
  id: 'prog-it-review',
  version: 1,
  careerId: 'it-support',
  title: 'Manchester office: the opening moves earlier',
  summary: 'The opening is brought forward two weeks. Decide how IT copes.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
    personId: 'manager',
  },
  trigger: { afterCase: 'prog-it-equipment' },
  deadlineHours: 6,
  email: {
    subject: 'Programme review: opening two weeks earlier',
    body: `Hi {name},

The programme board wants to open Manchester on **18 August**, two weeks early, because a big client wants to start there. The internet line can only be installed on **25 August**. What do we recommend?

Ravi`,
  },
  whyItMatters:
    'Programme dates move. Finding a safe way to meet the business need, and being clear about what can’t be done, is better than saying yes and failing on the day.',
  objectives: [
    'Assess a change against technical constraints',
    'Recommend a workable option',
  ],
  evidence: [brief],
  steps: [
    {
      id: 'option',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'What do you recommend?',
      points: 50,
      options: [
        {
          id: 'temporary',
          label:
            'Open on 18 August with 4G routers as a temporary connection, and switch to the line on 25 August',
          verdict: 'best',
          why: 'The client gets their start date, with a realistic, tested temporary solution.',
          effects: { indicators: { satisfaction: 3 } },
        },
        {
          id: 'promise',
          label: 'Promise it will all be ready on the 18th',
          verdict: 'poor',
          why: 'The line can’t be installed in time: the office would open without internet.',
          effects: { indicators: { risk: 5 } },
        },
        {
          id: 'refuse',
          label: 'Say IT can’t support an earlier opening',
          verdict: 'acceptable',
          why: 'Honest, but there is a workable option.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'The programme board',
      title: 'Your note to the board',
      prompt: 'Explain the constraint and your recommendation.',
      points: 50,
      minWords: 40,
      mentions: [['25 August'], ['4G', 'temporary'], ['18 August']],
      avoid: [],
      model:
        'IT can support opening on 18 August. The permanent internet line can only be installed on 25 August, so for the first week we will use 4G routers as a temporary connection, tested in advance, and switch over on the 25th. Video calls may be a little slower that week. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Ravi',
    'The office opened on the 18th and the client never noticed the 4G week. Brilliant.',
  ),
  lapseLog: 'The programme board decided the new date without IT’s input.',
  skills: { troubleshooting: 20, 'technical-writing': 15 },
  xp: 120,
}

// ---------------------------------------------------------------------------
// Digital Marketing: the launch campaign
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Data Analysis: business case and measures
// ---------------------------------------------------------------------------

const data1: CaseInput = {
  ...stage('data-analytics', 1),
  id: 'prog-data-case',
  version: 1,
  careerId: 'data-analytics',
  title: 'Manchester office: check the business case',
  summary:
    'Check the business case’s numbers and its assumptions before the board relies on it.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'portfolio-review' },
  deadlineHours: 8,
  email: {
    subject: 'Manchester programme: the business case',
    body: `Hi {name},

Our part of the Manchester programme: check the business case before it goes back to the board (summary attached). Is the payback right, and are the assumptions sound?

Amara`,
  },
  whyItMatters:
    'Business cases drive big decisions. An analyst’s job is to check the arithmetic and, just as important, the assumptions behind it.',
  objectives: ['Check a payback calculation', 'Challenge assumptions with evidence'],
  evidence: [
    brief,
    {
      id: 'case',
      title: 'Business case summary (from Finance)',
      text: 'One-off cost **£420,000**. Expected profit from Manchester **£140,000 a year** from year 2. Assumes the team is fully productive **from day one** and that **all 20 hires** start by 1 September.',
    },
  ],
  steps: [
    {
      id: 'payback',
      kind: 'figure',
      title: 'Payback',
      prompt: 'How many years of £140,000 profit pay back the £420,000?',
      points: 30,
      answer: 3,
      tolerance: 0,
      unit: 'years',
      why: '£420,000 ÷ £140,000 = 3 years.',
    },
    {
      id: 'assumptions',
      kind: 'review',
      title: 'The assumptions',
      prompt: 'Which assumptions are risky?',
      points: 40,
      findings: [
        {
          id: 'day-one',
          text: 'Fully productive from day one.',
          issue: true,
          why: 'New teams take months to ramp up.',
        },
        {
          id: 'all-hires',
          text: 'All 20 hires starting by 1 September.',
          issue: true,
          why: 'Recruitment is already running late for developers.',
        },
        {
          id: 'cost',
          text: 'The one-off cost of £420,000.',
          issue: false,
          why: 'That is the approved budget, with contingency.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'Amara Nwosu',
      title: 'Your note',
      prompt: 'Summarise your check for the board.',
      points: 30,
      minWords: 40,
      mentions: [
        ['3 years', 'three years'],
        ['ramp', 'day one'],
        ['hire', 'recruit'],
      ],
      avoid: [],
      model:
        'The arithmetic is right: £420,000 paid back by £140,000 a year takes 3 years. But two assumptions are optimistic: the team won’t be fully productive from day one, as new teams take months to ramp up, and not all 20 hires will start by 1 September. I suggest the board also sees a cautious case with a slower ramp-up. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Amara',
    'The board asked for the cautious case, and approved the programme knowing the real risks. Exactly our job.',
  ),
  lapseLog: 'The business case went to the board unchecked.',
  skills: { 'data-analysis': 25, 'insight-communication': 20 },
  xp: 140,
}

const data2: CaseInput = {
  ...stage('data-analytics', 2),
  id: 'prog-data-review',
  version: 1,
  careerId: 'data-analytics',
  title: 'Manchester office: measure success fairly',
  summary: 'Leadership wants to compare Manchester with London. Recommend fair measures.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
    personId: 'manager',
  },
  trigger: { afterCase: 'prog-data-case' },
  deadlineHours: 6,
  email: {
    subject: 'Programme review: how do we judge Manchester?',
    body: `Hi {name},

A director wants to judge Manchester by comparing its revenue per person with London’s, after three months. What do you recommend?

Amara`,
  },
  whyItMatters:
    'Unfair comparisons lead to bad decisions about people and offices. Analysts design measures that compare like with like.',
  objectives: ['Design fair success measures', 'Explain why a comparison is unfair'],
  evidence: [
    brief,
    {
      id: 'compare',
      title: 'Revenue per person, last quarter',
      text: 'London: £38,000 (established, 95 staff). Manchester: £11,600 (first quarter, team still hiring).',
    },
  ],
  steps: [
    {
      id: 'measure',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'How should Manchester be judged?',
      points: 50,
      options: [
        {
          id: 'trajectory',
          label:
            'Against its own ramp-up plan, and against London’s first year, not London today',
          verdict: 'best',
          why: 'It compares like with like and shows whether the office is on track.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'london',
          label: 'Against London today: the business needs the same results',
          verdict: 'poor',
          why: 'An established office will always look better than a three-month-old one.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'none',
          label: 'Don’t measure it for a year',
          verdict: 'acceptable',
          why: 'Avoids unfairness, but a new office needs early signs of whether it is on track.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'The programme review',
      title: 'Your note',
      prompt: 'Explain your recommendation.',
      points: 50,
      minWords: 40,
      mentions: [['ramp', 'plan'], ['first year', 'like with like'], ['London']],
      avoid: [{ terms: ['underperforming'], why: 'It isn’t: it is new.' }],
      model:
        'Comparing Manchester with London today isn’t like with like: London is established, Manchester is three months old and still hiring. I recommend we judge Manchester against its own ramp-up plan, and against London’s figures from its own first year. On that basis it is on track. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { reputation: -1 },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Amara',
    'Leadership adopted your measures. The Manchester team felt fairly treated, and they’re ahead of plan.',
  ),
  lapseLog: 'Manchester was judged against London without a fair comparison.',
  skills: { 'insight-communication': 25, 'data-analysis': 15 },
  xp: 120,
}

// ---------------------------------------------------------------------------
// Software Development: system changes
// ---------------------------------------------------------------------------

const dev1: CaseInput = {
  ...stage('software-development', 1),
  id: 'prog-dev-systems',
  version: 1,
  careerId: 'software-development',
  title: 'Manchester office: the system changes',
  summary:
    'Work out which systems must change for a second office, and hand the plan to the programme.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'api-testing' },
  deadlineHours: 8,
  email: {
    subject: 'Manchester programme: Engineering’s part',
    body: `Hi {name},

Our part of the Manchester programme: our systems assume one office. Please review the requirements the other departments sent, decide which changes are really needed before opening, and give the programme a plan with the effort.

Samuel`,
  },
  whyItMatters:
    'Cross-department programmes generate many requirements. Engineers who separate what is needed for go-live from nice-to-haves keep the programme on time.',
  objectives: [
    'Assess requirements from other departments',
    'Separate must-haves from later work',
    'Estimate effort',
  ],
  evidence: [
    brief,
    {
      id: 'requirements',
      title: 'Requirements sent to Engineering (estimates in developer days)',
      table: {
        head: ['From', 'Requirement', 'Days'],
        rows: [
          ['Accounting', 'Office field on timesheets (cost centre CC-MAN-01)', '3'],
          ['People & Culture', 'Office in staff records', '2'],
          ['Operations', 'Room booking for the new site', '4'],
          ['Marketing', 'A Manchester page on the website', '2'],
          ['Data & Insight', 'Office filter on every dashboard', '5'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'needed',
      kind: 'review',
      title: 'What must be ready for opening day',
      prompt: 'Tick the changes needed before opening.',
      points: 40,
      findings: [
        {
          id: 'timesheets',
          text: 'Office field on timesheets',
          issue: true,
          why: 'Without it, Manchester’s costs can’t be charged to its cost centre from day one.',
        },
        {
          id: 'staff',
          text: 'Office in staff records',
          issue: true,
          why: 'Payroll and access depend on where people work.',
        },
        {
          id: 'web',
          text: 'A Manchester page on the website',
          issue: true,
          why: 'The launch campaign sends people to it.',
        },
        {
          id: 'rooms',
          text: 'Room booking for the new site',
          issue: false,
          why: 'Useful, but people can book by email for the first weeks.',
        },
        {
          id: 'dashboards',
          text: 'Office filter on every dashboard',
          issue: false,
          why: 'Needed for reporting later, not on day one.',
        },
      ],
    },
    {
      id: 'effort',
      kind: 'figure',
      title: 'Effort before opening',
      prompt: 'How many developer days are the must-have changes?',
      points: 30,
      answer: 7,
      tolerance: 0,
      unit: 'days',
      why: 'Timesheets 3 + staff records 2 + website 2 = 7 days.',
    },
    {
      id: 'plan',
      kind: 'decide',
      title: 'The rest',
      prompt: 'What about room booking and dashboards?',
      points: 30,
      options: [
        {
          id: 'after',
          label:
            'Plan them for the month after opening, and tell Operations and Data when',
          verdict: 'best',
          why: 'They are needed, just not on day one; giving dates keeps both departments on side.',
          effects: { indicators: { satisfaction: 2 } },
        },
        {
          id: 'all-now',
          label: 'Do everything before opening',
          verdict: 'acceptable',
          why: 'Possible, but 16 days squeezes the testing of the must-haves.',
        },
        {
          id: 'drop',
          label: 'Drop them',
          verdict: 'poor',
          why: 'Operations and Data need them; dropping them without a word damages trust.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Samuel',
    'A clear plan: the must-haves are on track, and Operations and Data know when their changes come.',
  ),
  lapseLog: 'Engineering’s Manchester plan was never sent.',
  skills: { 'software-design': 25, programming: 10 },
  xp: 140,
}

const dev2: CaseInput = {
  ...stage('software-development', 2),
  id: 'prog-dev-review',
  version: 1,
  careerId: 'software-development',
  title: 'Manchester office: a release in opening week',
  summary: 'A big feature wants to ship in opening week. Decide at the programme review.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: { afterCase: 'prog-dev-systems' },
  deadlineHours: 6,
  email: {
    subject: 'Programme review: release timing',
    body: `Hi {name},

Sales want the new client portal released in Manchester’s opening week, “to impress the new clients”. The programme review needs our recommendation.

Samuel`,
  },
  whyItMatters:
    'Release timing is a risk decision. Avoiding big changes at the same time as big business events is a basic engineering discipline.',
  objectives: ['Judge release risk around a business event', 'Recommend a release plan'],
  evidence: [brief],
  steps: [
    {
      id: 'decision',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'When should the portal be released?',
      points: 50,
      options: [
        {
          id: 'freeze',
          label:
            'Freeze big releases in opening week; release the portal the week after, with Manchester staff trained first',
          verdict: 'best',
          why: 'If something breaks, it won’t be during opening week, and staff can support clients properly.',
          effects: { indicators: { risk: -3 } },
        },
        {
          id: 'ship',
          label: 'Release it in opening week as Sales asked',
          verdict: 'poor',
          why: 'Two big changes at once doubles the risk, and new staff can’t support it yet.',
          effects: { indicators: { risk: 5 } },
        },
        {
          id: 'month',
          label: 'Wait three months until things settle',
          verdict: 'acceptable',
          why: 'Safe, but delays a feature clients want for no strong reason.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'The programme review',
      title: 'Your note',
      prompt: 'Explain the recommendation to Sales and the board.',
      points: 50,
      minWords: 40,
      mentions: [
        ['opening week'],
        ['week after', 'following week'],
        ['train', 'support'],
      ],
      avoid: [
        {
          terms: ['Sales don’t understand'],
          why: 'Respect the business reason: offer a better date.',
        },
      ],
      model:
        'We recommend not releasing the client portal in opening week: two big changes at once doubles the risk, and the new Manchester staff need training to support it. We will release it the following week, after training, so new clients get a smooth first experience. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Samuel',
    'Opening week was smooth, and the portal launched the week after without a hitch.',
  ),
  lapseLog: 'The release was decided without Engineering’s view.',
  skills: { 'software-design': 20, 'technical-writing': 15 },
  xp: 120,
}

export const PROGRAMME_CASES: CaseInput[] = [
  fa1,
  fa2,
  acc1,
  acc2,
  it1,
  it2,
  mkt1,
  mkt2,
  data1,
  data2,
  dev1,
  dev2,
]
