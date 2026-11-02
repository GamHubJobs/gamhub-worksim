/** Programme cases: software-development. */
import type { CaseInput } from '../schema'
import { brief, replies, stage } from './shared'

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

export const PROGRAMME_DEV: CaseInput[] = [dev1, dev2]
