/** Programme cases: accounting. */
import type { CaseInput } from '../schema'
import { brief, replies, stage } from './shared'

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

export const PROGRAMME_ACCOUNTING: CaseInput[] = [acc1, acc2]
