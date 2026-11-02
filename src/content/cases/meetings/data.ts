/** Meetings cases: data-analytics. */
import type { CaseInput } from '../schema'
import { replies, people } from './shared'

const dataReview: CaseInput = {
  id: 'mtg-data-review',
  version: 1,
  careerId: 'data-analytics',
  kind: 'meeting',
  minLevel: 3,
  title: 'Present the client portfolio findings',
  summary:
    'Present the portfolio review to the leadership team and agree what happens next.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'portfolio-review' },
  deadlineHours: 8,
  meeting: {
    title: 'Leadership project review',
    inHours: 3,
    minutes: 40,
    room: 'Board room',
  },
  email: {
    subject: 'Leadership review: your findings',
    body: `Hi {name},

Leadership want the client portfolio findings at today’s project review. Please prepare **4 to 6 slides**: the key finding (**3 clients bring 52% of revenue**), the risk that creates, and your recommendations.

Amara`,
  },
  whyItMatters:
    'Analysis only creates value when leaders understand it and act on it. Presenting a clear message, standing by the evidence and leaving with owned actions is what turns insight into decisions.',
  objectives: [
    'Present findings to leaders',
    'Stand by the evidence under pressure',
    'Turn insight into owned actions',
  ],
  evidence: [
    {
      id: 'findings',
      title: 'Portfolio review: key findings',
      text: '3 of 42 clients bring **52%** of revenue. Losing any one of them would cut revenue by at least 14%. The next 10 clients are growing fastest.',
    },
  ],
  steps: [
    {
      id: 'deck',
      kind: 'document',
      phase: 'prepare',
      title: 'The slides',
      prompt: 'Prepare 4 to 6 slides: the finding, the risk and the recommendations.',
      points: 35,
      deliverable: {
        kind: 'slides',
        title: 'Client portfolio: findings',
        template: 'business-review',
        checks: [
          {
            id: 'length',
            type: 'length',
            min: 4,
            max: 6,
            title: 'Four to six slides',
            points: 10,
            why: 'Leaders have little time.',
            hint: 'Keep 4 to 6 slides.',
          },
          {
            id: 'finding',
            type: 'figures',
            title: 'The key finding',
            figures: [{ label: 'share of revenue from 3 clients', value: 52 }],
            points: 15,
            why: 'Lead with the headline.',
            hint: '3 clients bring 52% of revenue.',
          },
          {
            id: 'recommend',
            type: 'mentions',
            title: 'Risk and recommendations',
            terms: [['risk'], ['recommend']],
            points: 10,
            why: 'Findings need a “so what”.',
            hint: 'Say what the risk is and what to do.',
          },
        ],
      },
    },
    {
      id: 'pressure',
      kind: 'decide',
      phase: 'meeting',
      title: 'A challenge in the room',
      prompt:
        'A director says: “Those three are our best clients; there’s no risk, take that slide out.” What do you do?',
      points: 25,
      options: [
        {
          id: 'evidence',
          label:
            'Keep it, calmly: agree they are valuable, and show that losing one would cut revenue by at least 14%',
          verdict: 'best',
          why: 'You respect the point and stand by the evidence: that is what leaders need from an analyst.',
          effects: { trust: { manager: 2 }, indicators: { risk: -2 } },
        },
        {
          id: 'remove',
          label: 'Take the slide out to avoid conflict',
          verdict: 'poor',
          why: 'Hiding a real risk to please someone is how organisations get surprised.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'argue',
          label: 'Tell the director they are wrong',
          verdict: 'acceptable',
          why: 'The evidence is on your side, but winning the argument matters less than being heard.',
          effects: { trust: { manager: -1 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action the right owner.',
      points: 25,
      people: people(['me', 'You'], ['sales', 'Head of Sales'], ['amara', 'Amara Nwosu']),
      items: [
        {
          id: 'growth',
          label: 'Plan account growth for the 10 fastest-growing clients',
          owner: 'sales',
          why: 'Account plans belong to Sales.',
        },
        {
          id: 'monitor',
          label: 'Add a client-concentration measure to the monthly dashboard',
          owner: 'me',
          why: 'You built the analysis and own the dashboard.',
        },
        {
          id: 'board',
          label: 'Take the risk to the board’s risk register',
          owner: 'amara',
          why: 'The head of the team reports risks to the board.',
        },
      ],
    },
    {
      id: 'recap',
      kind: 'reply',
      phase: 'after',
      to: 'The leadership team',
      title: 'Send the summary',
      prompt: 'Summarise the finding and the agreed actions.',
      points: 15,
      minWords: 35,
      mentions: [['52%', '52 per cent'], ['dashboard'], ['risk register', 'board']],
      avoid: [],
      model:
        'Thank you all. Summary: 3 clients bring 52% of our revenue, so losing one would cut revenue by at least 14%. Actions: Sales will plan growth for our 10 fastest-growing clients; I will add a client-concentration measure to the monthly dashboard; Amara will add the risk to the board’s risk register. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Amara',
    'Leadership adopted every recommendation. And thank you for holding your ground on the risk slide.',
  ),
  lapseLog: 'The project review went ahead without your findings.',
  skills: { 'insight-communication': 30, 'data-visualisation': 15 },
  xp: 110,
}

export const MEETING_DATA: CaseInput[] = [dataReview]
