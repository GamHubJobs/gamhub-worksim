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

/** Digital Marketing: an influencer post without disclosure. */
const mktDisclosure: CaseInput = {
  id: 'adv-mkt-disclosure',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'client',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'An influencer post without #ad',
  summary:
    'A client’s paid influencer post is doing well, but it does not say it is an advert.',
  from: { name: 'Karen Lowe', role: 'Brand Manager', organisation: 'Fernleaf Skincare' },
  trigger: {},
  deadlineHours: 6,
  email: {
    subject: 'Influencer post: brilliant results!',
    body: `Hi,

Mia’s post about our new serum is flying: look at the numbers! Can we book her for three more posts, written the same way? It feels so much more natural without the “ad” label.

Karen
Fernleaf Skincare`,
  },
  whyItMatters:
    'Paid posts must be clearly labelled as adverts. Hiding that misleads customers, risks action by the advertising regulator and damages the brand. Good marketers protect the client from the risk while keeping what works.',
  objectives: [
    'Spot an undisclosed advert',
    'Measure the post’s real cost',
    'Advise the client to keep the results and fix the risk',
  ],
  evidence: [
    {
      id: 'post',
      title: 'The post (first week)',
      table: {
        head: ['Measure', 'Value'],
        rows: [
          ['Fee paid to the influencer', '£2,400'],
          ['Engagements (likes, comments, shares)', '9,600'],
          ['Label on the post', 'None'],
        ],
      },
    },
    {
      id: 'rules',
      title: 'Advertising rules (summary)',
      text: 'If a brand pays for a post or controls its content, the post must be obviously identifiable as an advert, for example with “#ad” at the start.',
    },
  ],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'Review the post',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'is-ad',
          text: 'The post is an advert, because Fernleaf paid for it.',
          issue: true,
          why: 'A paid post is an advert under the rules, however natural it reads.',
        },
        {
          id: 'must-label',
          text: 'The post needs a clear label such as “#ad”.',
          issue: true,
          why: 'Without it, followers cannot tell they are seeing an advert.',
        },
        {
          id: 'natural-ok',
          text: 'Leaving the label off is fine if the influencer really likes the product.',
          issue: false,
          why: 'Payment, not opinion, makes it an advert.',
        },
        {
          id: 'results-wrong',
          text: 'The engagement numbers must be fake.',
          issue: false,
          why: 'There is no sign of that; the problem is the missing label, not the results.',
        },
      ],
    },
    {
      id: 'cost',
      kind: 'figure',
      title: 'Cost per engagement',
      prompt: 'What did each engagement cost?',
      points: 20,
      answer: 0.25,
      tolerance: 0.005,
      unit: '£',
      why: '£2,400 ÷ 9,600 engagements = £0.25 each.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'Your advice',
      prompt: 'What do you advise?',
      points: 25,
      options: [
        {
          id: 'label',
          label:
            'Ask Mia to add “#ad” to the post now, and book the three new posts with the label in the brief',
          verdict: 'best',
          why: 'The risk is fixed today and the partnership that works continues, honestly.',
          effects: { indicators: { risk: -3 } },
        },
        {
          id: 'as-asked',
          label: 'Book three more posts written the same way, without the label',
          verdict: 'poor',
          why: 'It repeats a breach of the rules, risking a ruling against the brand and lost trust.',
          effects: { indicators: { risk: 5 }, reputation: -2 },
        },
        {
          id: 'stop',
          label: 'Stop working with the influencer altogether',
          verdict: 'acceptable',
          why: 'It removes the risk, but throws away a partnership that works well when it is labelled.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Karen Lowe, Fernleaf Skincare',
      title: 'Reply to the client',
      prompt: 'Write to Karen: the results, the problem, and what you recommend.',
      points: 25,
      minWords: 45,
      model:
        'Hi Karen, the results are great: about £0.25 per engagement. One thing needs fixing today: because we paid for the post, the rules say it must be clearly labelled as an advert, for example with #ad at the start. I suggest we ask Mia to add it now and include it in the brief for the three new posts. Labelled posts still perform well, and it protects the brand. Best, {name}',
      mentions: [['0.25'], ['#ad', 'label', 'advert'], ['rules', 'regulator', 'protect']],
      avoid: [
        {
          terms: ['nobody checks', 'get away with'],
          why: 'Never suggest breaking the rules is acceptable if unnoticed.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Karen',
    'I honestly didn’t know. Mia has added #ad, and the new posts are booked with it. Thanks for keeping us out of trouble.',
  ),
  lapseLog: 'The unlabelled post stayed up, and a customer complained to the regulator.',
  skills: { 'content-strategy': 25, 'campaign-analytics': 20 },
  xp: 140,
}

export const ADVANCED_MARKETING: CaseInput[] = [mktAttribution, mktDisclosure]
