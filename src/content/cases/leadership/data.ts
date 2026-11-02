/** Leadership cases: data-analytics. */
import type { CaseInput } from '../schema'
import { replies, FEEDBACK_AVOID } from './shared'

const dataLead: CaseInput = {
  id: 'lead-data-team',
  version: 1,
  careerId: 'data-analytics',
  kind: 'leadership',
  minLevel: 4,
  title: 'Prioritise the team’s requests and review an analysis',
  summary:
    'Too many requests, too few analysts. Prioritise, review a junior’s analysis and give feedback.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'churn-clean' },
  deadlineHours: 8,
  email: {
    subject: 'The team’s work queue',
    body: `Hi {name},

As Lead Analyst you now run the team’s queue. Four requests are waiting and we have three analysts this week. Please allocate them, review Priyanka’s first analysis before it goes to Operations, and give her feedback.

Amara`,
  },
  whyItMatters:
    'Data teams always have more requests than people. Leads decide what matters most, match work to people, and protect the quality of what leaves the team.',
  objectives: [
    'Allocate analysts to requests',
    'Review an analysis for errors',
    'Coach a new analyst',
  ],
  evidence: [
    {
      id: 'analysis',
      title: 'Priyanka’s analysis: “Training made staff 18% more productive”',
      text: 'Compared output of staff who attended training with those who didn’t. Attenders chose to attend. Sample: 14 attenders, 6 non-attenders. Clear charts and well-commented SQL.',
    },
  ],
  steps: [
    {
      id: 'allocate',
      kind: 'assign',
      title: 'Allocate the requests',
      prompt: 'Give each request to the right analyst.',
      points: 25,
      members: [
        {
          id: 'priyanka',
          name: 'Priyanka Shah',
          strengths: 'New; strong SQL, learning statistics',
          capacity: 1,
        },
        {
          id: 'owen',
          name: 'Owen Bell',
          strengths: 'Statistics and experiments',
          capacity: 1,
        },
        {
          id: 'leah',
          name: 'Leah Moss',
          strengths: 'Dashboards; works with the board',
          capacity: 2,
        },
      ],
      items: [
        {
          id: 'board',
          label: 'Board KPI dashboard refresh (due tomorrow)',
          best: ['leah'],
          why: 'Leah builds the board dashboards and knows what they need.',
        },
        {
          id: 'experiment',
          label: 'Design the pricing experiment',
          best: ['owen'],
          why: 'Experiments need statistics expertise.',
        },
        {
          id: 'extract',
          label: 'Customer data extract for Sales',
          best: ['priyanka'],
          why: 'A well-defined SQL task suits a new analyst with strong SQL.',
        },
        {
          id: 'dash2',
          label: 'Delivery dashboard tweaks',
          best: ['leah'],
          why: 'More dashboard work for Leah, who has room for two.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review Priyanka’s analysis',
      prompt: 'Which of these are real problems with the conclusion?',
      points: 30,
      findings: [
        {
          id: 'selection',
          text: 'Staff chose to attend, so attenders may have been more productive anyway.',
          issue: true,
          why: 'Self-selection means the comparison can’t show the training caused the difference.',
        },
        {
          id: 'sample',
          text: 'Six non-attenders is too few to support a precise 18%.',
          issue: true,
          why: 'Small samples make precise figures misleading.',
        },
        {
          id: 'charts',
          text: 'The charts and SQL are poor.',
          issue: false,
          why: 'They are clear and well commented: worth praising.',
        },
      ],
    },
    {
      id: 'scope',
      kind: 'decide',
      title: 'What goes to Operations',
      prompt: 'Operations wants the result today. What do you do?',
      points: 15,
      options: [
        {
          id: 'reframe',
          label:
            'Send it today as an early indication with the limits stated, and offer a proper comparison next month',
          verdict: 'best',
          why: 'Operations gets something useful today without a claim the data can’t support.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'send',
          label: 'Send it as it is: it’s a positive story',
          verdict: 'poor',
          why: 'An unsupported 18% could drive real spending decisions.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'hold',
          label: 'Hold it until it can be redone properly',
          verdict: 'acceptable',
          why: 'Safe, but an honest early indication is more useful than nothing.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Priyanka Shah',
      title: 'Feedback for Priyanka',
      prompt: 'Give Priyanka constructive feedback that helps her grow.',
      points: 30,
      minWords: 50,
      mentions: [
        ['charts', 'SQL'],
        ['chose', 'self-selection', 'choose'],
        ['sample'],
        ['help', 'together', 'show you'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Priyanka, great first analysis: the charts are clear and your SQL is beautifully commented. One thing to learn from: staff chose whether to attend, so attenders may have been more productive anyway, and with only six non-attenders the sample is too small for a precise 18%. Let’s send Operations an early indication with those limits, and next week I will show you how we can design a fairer comparison together. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { risk: -2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -4 },
  },
  replies: replies(
    'Amara',
    'The board dashboard was on time, and Priyanka said your feedback was the best she’s had. That’s leadership.',
  ),
  lapseLog: 'The team’s requests piled up without priorities.',
  skills: { 'insight-communication': 25, 'data-analysis': 15 },
  xp: 150,
}

export const LEADERSHIP_DATA: CaseInput[] = [dataLead]
