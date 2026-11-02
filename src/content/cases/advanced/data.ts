/** Advanced cases: data-analytics. */
import type { CaseInput } from '../schema'
import { replies, OUTCOMES } from './shared'

/** Data Analysis: a director wants to present a biased survey as everyone's view. */
const dataBias: CaseInput = {
  id: 'adv-data-survey-bias',
  version: 1,
  careerId: 'data-analytics',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: '“Customers love the app”',
  summary: 'Sales wants to tell the board that 92% of customers are happy with the app.',
  from: { name: 'Gemma Ward', role: 'Sales Director', organisation: 'Sales' },
  trigger: {},
  deadlineHours: 5,
  email: {
    subject: 'Headline for the board: 92% love the app',
    body: `Hi,

Great news from the in-app survey: **92% satisfied**! Can you put “92% of customers are satisfied with the app” on the first slide of tomorrow’s board pack?

Gemma`,
  },
  whyItMatters:
    'Who answered a survey decides what it can tell you. An in-app survey only hears from people still using the app. Analysts protect decision-makers from conclusions the data cannot support, and still give them the useful finding.',
  objectives: [
    'Spot a biased sample',
    'Say exactly what the data shows',
    'Suggest how to get a fair answer',
  ],
  evidence: [
    {
      id: 'survey',
      title: 'The in-app survey',
      table: {
        head: ['Measure', 'Value'],
        rows: [
          ['Customers', '12,000'],
          ['Customers using the app this month', '2,000'],
          ['Survey responses (shown inside the app)', '250'],
          ['Satisfied or very satisfied', '230 (92%)'],
        ],
      },
    },
    {
      id: 'complaints',
      title: 'Complaints log',
      text: '140 complaints about the app this month, mostly from customers who say they have stopped using it.',
    },
  ],
  steps: [
    {
      id: 'sample',
      kind: 'review',
      title: 'Who answered?',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'app-only',
          text: 'Only customers who use the app could answer the survey.',
          issue: true,
          why: 'It was shown inside the app, so non-users never saw it.',
        },
        {
          id: 'all-customers',
          text: '92% of all customers are satisfied with the app.',
          issue: false,
          why: 'The 92% is of 250 app users who answered, not of 12,000 customers.',
        },
        {
          id: 'leavers',
          text: 'Customers who stopped using the app could not be asked.',
          issue: true,
          why: 'Those are the people most likely to be unhappy, and the complaints log suggests there are many.',
        },
        {
          id: 'too-few',
          text: '250 responses are too few to say anything at all.',
          issue: false,
          why: 'They say something useful about people who still use the app; they just cannot speak for everyone.',
        },
      ],
    },
    {
      id: 'rate',
      kind: 'figure',
      title: 'Response rate',
      prompt: 'What percentage of this month’s app users answered the survey?',
      points: 20,
      answer: 12.5,
      tolerance: 0.05,
      unit: '%',
      why: '250 ÷ 2,000 = 12.5%.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What goes on the slide',
      prompt: 'What do you put in the board pack?',
      points: 25,
      options: [
        {
          id: 'qualified',
          label:
            '“92% of app users who answered are satisfied”, with the sample and the complaints shown, and a proposal to survey all customers',
          verdict: 'best',
          why: 'The board gets the good news and its limits, and a way to find out what all customers think.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'headline',
          label: '“92% of customers are satisfied with the app”, as Gemma asked',
          verdict: 'poor',
          why: 'It tells the board something the data does not show, and they may decide on it.',
          effects: { indicators: { risk: 5 }, reputation: -2 },
        },
        {
          id: 'nothing',
          label: 'Leave the survey out of the pack: it is biased',
          verdict: 'acceptable',
          why: 'You avoid misleading anyone, but throw away a useful finding about current users.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Gemma Ward, Sales',
      title: 'Reply to the Sales Director',
      prompt:
        'Write to Gemma: what the survey shows, what it cannot show, and what you propose.',
      points: 25,
      minWords: 50,
      model:
        'Hi Gemma, it is a good result for people who use the app, and I will put it in the pack. I need to word it as “92% of app users who answered”, though: the survey was only shown in the app, and only 12.5% of users answered, so it misses customers who have stopped using it, and we have 140 complaints from them this month. I suggest we survey a sample of all customers next month. Best, {name}',
      mentions: [
        ['app users', 'use the app'],
        ['12.5'],
        ['all customers', 'sample', 'representative'],
      ],
      avoid: [
        {
          terms: ['fake', 'lying', 'misleading on purpose'],
          why: 'Gemma is sharing good news, not trying to deceive: explain the limits, do not accuse.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Gemma',
    'Fair enough, and better that I hear it from you than from the board. Your wording is on the slide, and they approved the survey of all customers.',
  ),
  lapseLog:
    'The board pack went out with Gemma’s headline because nobody replied in time.',
  skills: { 'insight-communication': 25, 'data-analysis': 20 },
  xp: 140,
}

export const ADVANCED_DATA: CaseInput[] = [dataBias]
