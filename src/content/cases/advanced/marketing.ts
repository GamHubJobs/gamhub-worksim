/** Advanced cases: digital-marketing. */
import type { CaseInput } from '../schema'
import { replies, OUTCOMES } from './shared'

/** Digital Marketing: a client wants to cut a channel that last-click under-credits. */
const mktAttribution: CaseInput = {
  id: 'adv-mkt-attribution',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'client',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'Cut social media?',
  summary: 'A client wants to stop social ads because they seem to bring few bookings.',
  from: {
    name: 'Victor Hale',
    role: 'Marketing Director',
    organisation: 'Hollow Oak Hotels',
  },
  trigger: {},
  deadlineHours: 6,
  email: {
    subject: 'Stop the social ads from next week',
    body: `Hi,

I have looked at last quarter’s report. Social media brought us **20 bookings** for £5,000. That is £250 a booking, ten times what email costs. Please stop all social ads from next week and move the money to search.

Victor Hale
Marketing Director, Hollow Oak Hotels`,
  },
  whyItMatters:
    'Last-click reports give all the credit to the final click. Channels that start the customer’s journey can look useless while they are doing real work. Good marketers question the measure before cutting the spend, and test before betting the budget.',
  objectives: [
    'Read a channel report critically',
    'Compare costs with assisted conversions counted',
    'Recommend a test instead of a guess',
  ],
  evidence: [
    {
      id: 'report',
      title: 'Last quarter by channel',
      table: {
        head: ['Channel', 'Spend', 'Last-click bookings', 'Assisted bookings'],
        rows: [
          ['Search', '£8,000', '300', '60'],
          ['Social media', '£5,000', '20', '180'],
          ['Email', '£1,000', '80', '40'],
        ],
      },
    },
    {
      id: 'note',
      title: 'How the report counts',
      text: '“Last-click” bookings give all the credit to the last ad clicked. “Assisted” bookings are those where the channel appeared earlier in the customer’s journey.',
    },
  ],
  steps: [
    {
      id: 'read',
      kind: 'review',
      title: 'Read the report critically',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'assists',
          text: 'Social media appeared earlier in the journey of 180 bookings that ended on another channel.',
          issue: true,
          why: 'That is what “assisted” means: social started many journeys that search or email finished.',
        },
        {
          id: 'last-click',
          text: 'Last-click reporting gives all the credit to the final channel.',
          issue: true,
          why: 'It ignores every earlier touch, which is why social looks weak.',
        },
        {
          id: 'no-effect',
          text: 'Social brought only 20 bookings, so it has no effect on sales.',
          issue: false,
          why: 'It played a part in 180 more bookings, so the report understates it.',
        },
        {
          id: 'email-cheapest',
          text: 'Email has the lowest cost per last-click booking.',
          issue: true,
          why: '£1,000 ÷ 80 = £12.50, against £26.67 for search and £250 for social.',
        },
      ],
    },
    {
      id: 'assisted-cost',
      kind: 'figure',
      title: 'Social’s cost with assists counted',
      prompt:
        'What does social cost per booking if its assisted bookings are counted too?',
      points: 20,
      answer: 25,
      tolerance: 0.01,
      unit: '£',
      why: '£5,000 ÷ (20 + 180) bookings = £25 a booking.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'What do you recommend?',
      points: 25,
      options: [
        {
          id: 'test',
          label:
            'Halve social spend in two regions for four weeks and compare bookings with the other regions before deciding',
          verdict: 'best',
          why: 'A controlled test shows what social really adds, at little risk, and gives Victor evidence instead of a guess.',
          effects: { indicators: { satisfaction: 2 } },
        },
        {
          id: 'cut',
          label: 'Do as Victor asks and stop all social ads next week',
          verdict: 'poor',
          why: 'If social starts many journeys, bookings through search and email may fall too, and nobody will know why.',
          effects: { indicators: { satisfaction: -3 } },
        },
        {
          id: 'refuse',
          label: 'Keep everything as it is: the report is wrong',
          verdict: 'acceptable',
          why: 'You are right about the report, but refusing to act ignores a fair question about value for money.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Victor Hale, Hollow Oak Hotels',
      title: 'Reply to the client',
      prompt:
        'Write to Victor: what the report misses, what social really costs, and what you suggest.',
      points: 25,
      minWords: 55,
      model:
        'Dear Victor, thanks, it is a fair question. The report only credits the last click: social also appeared earlier in the journey of 180 bookings that finished on search or email. Counting those, social costs about £25 a booking, not £250. Before cutting it, I suggest a four-week test: halve social in two regions and compare bookings with the rest. That will show what it really adds. Best regards, {name}',
      mentions: [
        ['assist', 'journey', 'earlier'],
        ['25'],
        ['test', 'trial', 'experiment'],
      ],
      avoid: [
        {
          terms: ['you are wrong', 'misunderstood'],
          why: 'The client read the report correctly: the report is what misleads. Say so without blaming him.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Victor',
    'I had no idea the report worked like that. Let’s run the test; I will tell the board we are measuring properly before we cut anything.',
  ),
  lapseLog: 'The client stopped the social ads himself before hearing back.',
  skills: { 'campaign-analytics': 25, 'content-strategy': 20 },
  xp: 140,
}

export const ADVANCED_MARKETING: CaseInput[] = [mktAttribution]
