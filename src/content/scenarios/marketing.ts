/**
 * Digital Marketing: a campaign review with a client at the content studio's
 * campaign wall. Read the results properly (clicks are not customers), turn
 * down a misleading advertising claim, move budget to what works, propose a
 * fair test, and recommend next month's plan. Fictional client and figures.
 */
import { SMART } from './looks'
import type { Scenario } from './types'

const WALL = { x: 11.9, z: 7.1 }

export const CAMPAIGN_REVIEW: Scenario = {
  id: 'mkt-campaign-review',
  careerId: 'digital-marketing',
  title: 'Campaign review with a client',
  summary:
    'Review last month’s campaign with a dental practice: read the results right, turn down a misleading claim, and plan what is next.',
  workplace: 'studio',
  room: 'The content studio',
  minLevel: 1,
  player: { at: { x: 10.25, z: 6.05 }, faces: WALL },
  camera: { from: [7.2, 3.1, 4.4], looks: [11.0, 1.2, 7.0] },
  cast: [
    {
      id: 'ella',
      name: 'Dr Ella Grant',
      role: 'Client: owner, Grant & Co Dental',
      look: SMART(1, 'long', 3, '#0d9488'),
      at: { x: 9.3, z: 7.55 },
      faces: { x: 10.6, z: 6.6 },
    },
    {
      id: 'leo',
      name: 'Leo Brennan',
      role: 'Senior Digital Marketer',
      look: SMART(3, 'side', 1, '#c2410c'),
      at: { x: 10.95, z: 5.1 },
      faces: { x: 10.2, z: 6.2 },
      personId: 'senior',
    },
    {
      id: 'sofia',
      name: 'Sofia Alvarez',
      role: 'Marketing Manager',
      look: SMART(4, 'bun', 0, '#be123c'),
      at: { x: 8.7, z: 6.0 },
      faces: { x: 10.4, z: 6.4 },
      personId: 'manager',
    },
  ],
  exhibits: [
    {
      id: 'report',
      title: 'Campaign report, May',
      text: 'Social ads: 41,000 impressions, 1,230 clicks (CTR 3%), 9 bookings, £1,200 spent. Search ads: 6,500 impressions, 390 clicks (CTR 6%), 31 bookings, £800 spent.',
    },
    {
      id: 'moodboard',
      title: 'Mood board: summer posts',
      text: 'Smiling family, bright colours, “Book your check-up” call to action.',
    },
    {
      id: 'reviews',
      title: 'Google reviews',
      text: '4.7 stars from 212 reviews. Frequent words: friendly, gentle, on time.',
    },
  ],
  beats: [
    {
      id: 'hello',
      kind: 'say',
      who: 'ella',
      gesture: 'talk',
      text: 'The social ads got over a thousand clicks! Should we double the social budget?',
    },
    {
      id: 'read',
      kind: 'exhibit',
      who: 'ella',
      prompt: 'Show Ella what the results really say.',
      points: 10,
      items: ['moodboard', 'report', 'reviews'],
      correct: 'report',
      right: [
        {
          who: 'narrator',
          text: 'Social: 9 bookings for £1,200. Search: 31 bookings for £800.',
        },
      ],
      wrong: [{ who: 'ella', text: 'That’s lovely, but how did the campaign do?' }],
      lesson: 'Judge a campaign on results (bookings, cost per booking), not on clicks.',
    },
    {
      id: 'explain',
      kind: 'choose',
      prompt: 'How do you answer Ella’s question about doubling social?',
      points: 20,
      options: [
        {
          id: 'cost-per',
          label:
            '“Clicks aren’t patients. Social cost about £133 per booking; search about £26. I’d move most of the budget to search, and keep some social for awareness.”',
          score: 1,
          reply: [
            {
              who: 'ella',
              text: 'Oh. That’s a completely different picture. Yes, let’s do that.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Cost per result tells you where money works; clicks alone can mislead.',
        },
        {
          id: 'double',
          label: '“Yes: more clicks means more patients.”',
          score: 0,
          reply: [
            {
              who: 'leo',
              text: 'Social clicks barely turned into bookings. Search did far better.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -1 } },
          lesson:
            'Vanity metrics like clicks and likes are easy to grow and easy to misread.',
        },
      ],
    },
    {
      id: 'claim-ask',
      kind: 'say',
      who: 'ella',
      gesture: 'talk',
      text: 'For the summer ads, can we say “The best dentist in town: perfect teeth guaranteed”?',
    },
    {
      id: 'claim',
      kind: 'choose',
      prompt: 'Ella wants “The best dentist in town: perfect teeth guaranteed”.',
      points: 20,
      options: [
        {
          id: 'honest',
          label:
            'Advise against it: claims must be true and provable, and no one can guarantee results. Offer honest, strong lines from her real reviews: “4.7 stars from 212 patients: friendly, gentle, on time.”',
          score: 1,
          reply: [
            {
              who: 'ella',
              text: 'I like that better. It sounds like us.',
              gesture: 'talk',
            },
            { who: 'sofia', text: 'And it’s something we can stand behind.' },
          ],
          effects: { reputation: 2 },
          lesson:
            'Advertising must not mislead: use claims you can prove, like real reviews.',
        },
        {
          id: 'write-it',
          label: 'Write it: it’s what the client wants.',
          score: 0,
          reply: [
            {
              who: 'sofia',
              text: 'We can’t run that. It’s unprovable and would breach the advertising rules.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -3 }, reputation: -2 },
          lesson: 'Unprovable claims risk complaints, fines and the client’s reputation.',
        },
        {
          id: 'soften',
          label: 'Change it to “Probably the best dentist in town”.',
          score: 0.3,
          reply: [{ who: 'leo', text: 'Still not something we can prove.' }],
          lesson: 'Hedging an unprovable claim doesn’t make it provable.',
        },
      ],
    },
    {
      id: 'test',
      kind: 'choose',
      who: 'leo',
      prompt: 'Leo: “How do we find out which summer post works best?”',
      points: 15,
      options: [
        {
          id: 'ab',
          label:
            'Run an A/B test: two versions of the post, one change only (the headline), same audience and budget, judged on bookings.',
          score: 1,
          reply: [
            {
              who: 'leo',
              text: 'One change at a time, judged on bookings. Perfect.',
              gesture: 'talk',
            },
          ],
          lesson: 'A fair test changes one thing and measures the result that matters.',
        },
        {
          id: 'many',
          label: 'Try five completely different posts and see which gets the most likes.',
          score: 0.3,
          reply: [{ who: 'leo', text: 'Too many changes, and likes aren’t bookings.' }],
          lesson: 'Changing everything at once tells you nothing about why one won.',
        },
      ],
    },
    {
      id: 'meeting-decision',
      kind: 'choose',
      who: 'ella',
      prompt: 'Ella: “Great results, so let’s cut the budget by 30%.”',
      points: 15,
      options: [
        {
          id: 'reallocate',
          label:
            'Suggest keeping the budget but moving display money into search, which brings bookings at £24',
          score: 1,
          reply: [
            {
              who: 'sofia',
              text: 'Good answer. It answers their wish to spend wisely with evidence, and grows bookings.',
              gesture: 'talk',
            },
          ],
          lesson:
            'It answers their wish to spend wisely with evidence, and grows bookings.',
        },
        {
          id: 'agree',
          label: 'Agree to the 30% cut',
          score: 0.4,
          reply: [
            {
              who: 'sofia',
              text: 'Their choice, but you haven’t shown them the better option.',
              gesture: 'talk',
            },
          ],
          lesson: 'Their choice, but you haven’t shown them the better option.',
        },
        {
          id: 'refuse',
          label: 'Say a cut would ruin the results',
          score: 0,
          reply: [
            {
              who: 'sofia',
              text: 'Defensive, and it doesn’t offer anything.',
              gesture: 'talk',
            },
          ],
          lesson: 'Defensive, and it doesn’t offer anything.',
        },
      ],
    },
    {
      id: 'plan',
      kind: 'speak',
      who: 'sofia',
      prompt: 'Summarise next month’s plan for Ella in your own words.',
      points: 35,
      minWords: 30,
      mentions: [
        ['search'],
        ['booking', 'cost per'],
        ['review', '4.7', 'honest'],
        ['test', 'A/B'],
      ],
      model:
        'Next month we move most of the budget to search, which cost about £26 per booking against £133 on social, and keep a little social for awareness. The summer ads use your real reviews, 4.7 stars from 212 patients, rather than claims we can’t prove. We will A/B test two headlines and judge them on bookings.',
      good: [
        {
          who: 'ella',
          text: 'That’s clear. Let’s carry on for another three months.',
          gesture: 'talk',
        },
      ],
      weak: [{ who: 'ella', text: 'I’m not sure what we’re actually doing next.' }],
      lesson:
        'End a review with a plan the client can repeat back: what, why and how it is measured.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Client renews, with an honest, testable campaign',
      feedback:
        'You read the numbers right, protected the client from a bad claim and gave a clear plan.',
      effects: { trust: { manager: 3, senior: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Client renews',
      feedback: 'Good review. Lead with cost per booking next time.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Client renews for one month',
      feedback:
        'Ella stayed, but she wasn’t convinced. Let’s practise reporting results.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Client asks for a meeting with the manager',
      feedback:
        'Some advice today would have wasted her money or broken the rules. Let’s review together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 110,
  skills: { 'campaign-analytics': 25, copywriting: 15, 'content-strategy': 20 },
  caseLink: {
    caseId: 'mtg-mkt-review',
    answers: [
      {
        beat: 'meeting-decision',
        step: 'cut',
        options: { reallocate: 'reallocate', agree: 'agree', refuse: 'refuse' },
      },
    ],
  },
}
