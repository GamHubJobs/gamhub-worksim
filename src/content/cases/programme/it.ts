/** Programme cases: it-support. */
import type { CaseInput } from '../schema'
import { brief, replies, stage } from './shared'

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

export const PROGRAMME_IT: CaseInput[] = [it1, it2]
