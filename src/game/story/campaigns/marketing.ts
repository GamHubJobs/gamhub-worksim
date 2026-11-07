/**
 * Digital Marketing: "Launch Week". A first job in the marketing team. A
 * client changes the brief halfway through a campaign; then the launch, a
 * paid post that someone wants to pass off as an honest review, and a client
 * unhappy with the results. What the player says about the paid post comes
 * back when the numbers do. Original story.
 */
import type { Campaign } from '../types'
import { answer, scene, SHARED_CAST, standup, talk } from './kit'

export const MARKETING_STORY: Campaign = {
  id: 'digital-marketing',
  careerId: 'digital-marketing',
  title: 'Launch Week',
  premise:
    'Your first job in a marketing team. Clients want results yesterday, and everybody has an opinion about the colour of the button.',
  cast: { ...SHARED_CAST, manager: 'Sofia Alvarez', senior: 'Leo Brennan' },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · The brief',
      missions: [
        {
          id: 'first-day',
          type: 'main',
          title: 'Hello, marketing',
          from: 'manager',
          intro: [
            'First day in Marketing. Sofia wants to meet you; Leo will show you the campaign board.',
          ],
          objectives: [
            talk(
              'sofia',
              'manager',
              'mkt-sofia',
              'Meet Sofia, the marketing manager',
              'manager',
            ),
            talk(
              'leo',
              'senior',
              'mkt-leo',
              'Ask Leo about the campaigns running now',
              'desk',
            ),
          ],
          reward: { xp: 20, trust: { manager: 2 } },
          summary: () =>
            'Sofia talks in outcomes; Leo talks in ideas. The best campaigns, you suspect, need both.',
        },
        {
          id: 'brief-change',
          type: 'main',
          title: 'The brief, changed',
          from: 'senior',
          after: ['first-day'],
          intro: [
            'Halfway through the Northwind Bikes campaign, the client wants a different audience, and the same deadline.',
          ],
          objectives: [
            talk(
              'carmen',
              'front2',
              'mkt-carmen',
              'Ask Carmen what the budget can stretch to',
              'desk',
            ),
            answer(
              'case',
              'mkt-brief-change',
              'Reply to the client about the changed brief (Cases)',
            ),
            talk('leo', 'senior', 'mkt-leo-brief', 'Tell Leo how you handled it', 'desk'),
          ],
          reward: { xp: 40 },
          summary: (flags) =>
            flags.includes('mkt-pushed-back')
              ? 'You told the client what the change would cost, in time and money, before agreeing to it. They agreed to an extra week. Leo calls it “the grown-up email”.'
              : 'You said yes to everything. The team will be working late on Friday.',
        },
        {
          id: 'carmen-coffee',
          type: 'side',
          title: 'Coffee with Carmen',
          from: 'front2',
          after: ['first-day'],
          intro: [
            'Carmen, from payroll, runs the office’s unofficial book club. She thinks you might be a reader.',
          ],
          objectives: [
            talk(
              'carmen',
              'front2',
              'mkt-carmen-book',
              'Have a coffee with Carmen (the break room)',
              'breakroom',
            ),
          ],
          reward: { xp: 10, trust: { front2: 3 } },
          summary: () =>
            'You have joined a book club. You have also been lent a very large book.',
        },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter 2 · Launch',
      missions: [
        {
          id: 'paid-post',
          type: 'main',
          title: 'The paid post',
          from: 'senior',
          after: ['brief-change'],
          intro: [
            'Launch week. Leo has a deal with a popular cycling vlogger, and an idea about how to present it.',
          ],
          objectives: [
            talk(
              'leo',
              'senior',
              'mkt-leo-paid',
              'Hear Leo out about the vlogger',
              'desk',
            ),
            talk('sofia', 'manager', 'mkt-sofia-paid', 'Take it to Sofia', 'manager'),
          ],
          reward: { xp: 40 },
          summary: (flags) =>
            flags.includes('mkt-disclosed')
              ? 'The vlogger’s video says “paid partnership” at the start, clearly. It is still a great video.'
              : 'The video went out as an “honest review”. It is a great video. It is not an honest review.',
        },
        {
          id: 'results',
          type: 'main',
          title: 'The results',
          from: 'manager',
          after: ['paid-post'],
          intro: [
            'Two weeks after the launch. The client has seen the numbers, and is not happy.',
          ],
          objectives: [
            standup('Be at the stand-up: the results are the only topic'),
            answer('case', 'mkt-unhappy-results', 'Reply to the unhappy client (Cases)'),
            talk('sofia', 'manager', 'mkt-sofia-end', 'Sofia wants a word', 'manager'),
          ],
          flags: ['story-complete'],
          reward: { xp: 70 },
          summary: (flags) =>
            flags.includes('mkt-disclosed')
              ? 'The end of “Launch Week”. The numbers were modest and honest, and the client stayed: they trust what you tell them. Sofia gives you your own client.'
              : 'The end of “Launch Week”. A viewer worked out the video was paid for, and the comments turned. The client is gone. Sofia says it is not your fault. You know it partly is.',
        },
      ],
    },
  ],
  scenes: {
    'mkt-sofia': scene(
      'mkt-sofia',
      'manager',
      () => [
        '*Sofia’s whiteboard is covered in arrows.*',
        'Welcome, {name}. Here we measure everything, and we tell clients the truth about what we measure. Even when it is boring. Especially then.',
      ],
      [
        {
          id: 'ok',
          label: 'Say you are looking forward to it',
          reply: [
            'Good. Leo will show you round. Do not let him talk you into anything purple.',
          ],
          trust: { manager: 2 },
        },
      ],
    ),
    'mkt-leo': scene(
      'mkt-leo',
      'senior',
      () => [
        '*Leo spins his chair round, delighted to have an audience.*',
        'Four campaigns, one budget, and a client who has changed their logo twice this month. Marketing! Do you have ideas? Everyone has ideas. I want yours.',
      ],
      [
        {
          id: 'idea',
          label: 'Share an idea for the bikes campaign',
          reply: [
            'Oh, I like that. Write it down; I will steal it, but I will credit you.',
          ],
          trust: { senior: 3 },
        },
        {
          id: 'listen',
          label: 'Say you would rather listen first',
          reply: ['Wise. Rare, in here.'],
          trust: { senior: 1 },
        },
      ],
    ),
    'mkt-carmen': scene(
      'mkt-carmen',
      'front2',
      () => [
        '*Carmen pulls up the spend.*',
        'The bikes campaign has eleven thousand left. A new audience means new ads, new targeting, a week at least. It can stretch, but not for free.',
      ],
      [
        {
          id: 'thanks',
          label: 'Thank Carmen, and take the numbers to the client',
          reply: ['Good. Make them say yes to the cost, not just the idea.'],
          flags: ['mkt-pushed-back'],
          trust: { front2: 2 },
        },
        {
          id: 'squeeze',
          label: 'Ask if it can be squeezed in without telling them',
          reply: ['It can. Your Friday nights can’t, though.'],
        },
      ],
    ),
    'mkt-leo-brief': scene(
      'mkt-leo-brief',
      'senior',
      (flags) =>
        flags.includes('mkt-pushed-back')
          ? [
              '*Leo reads your email.*',
              'You gave them the cost before you said yes. That is the grown-up email. I have been trying to write that email for eight years.',
            ]
          : [
              '*Leo winces.*',
              'You said yes to all of it? Brave. I will order pizza for Friday.',
            ],
      [
        {
          id: 'ok',
          label: 'Smile',
          reply: ['Next time, you write the scary email and I hold your hand.'],
          trust: { senior: 2 },
        },
      ],
    ),
    'mkt-carmen-book': scene(
      'mkt-carmen-book',
      'front2',
      () => [
        '*Carmen produces a book the size of a brick.*',
        'You look like a reader. We meet on the last Friday. There is cake, and arguing.',
      ],
      [
        {
          id: 'yes',
          label: 'Say yes to the book club',
          reply: ['Wonderful. Chapter one by Friday. No pressure.'],
          trust: { front2: 3 },
        },
      ],
    ),
    'mkt-leo-paid': scene(
      'mkt-leo-paid',
      'senior',
      () => [
        '*Leo is excited.*',
        'The vlogger loves the bikes. We pay her, she reviews them. If we just… do not put “paid” in big letters, it feels honest, and honest converts. Everyone does it.',
      ],
      [
        {
          id: 'disclose',
          label: 'Say it has to be clearly marked as paid',
          reply: [
            '*He deflates a little.* You are right. Sofia would say the same. Fine: “paid partnership”, up front.',
          ],
          flags: ['mkt-disclosed'],
          trust: { senior: -1, manager: 2 },
        },
        {
          id: 'go',
          label: 'Go along with it',
          reply: ['Great. It will fly.'],
          flags: ['mkt-hidden'],
          trust: { senior: 2 },
        },
      ],
    ),
    'mkt-sofia-paid': scene(
      'mkt-sofia-paid',
      'manager',
      (flags) => [
        '*Sofia listens to the plan.*',
        flags.includes('mkt-disclosed')
          ? 'Marked as paid, up front. Good. People are not stupid, and they remember being lied to.'
          : 'Not marked as paid? That is not a grey area, {name}. Are you sure about this?',
      ],
      [
        {
          id: 'stand',
          label: 'Stand by what was decided',
          reply: ['All right. It is your name on it too.'],
        },
        {
          id: 'change',
          label: 'Change it: mark it clearly as paid',
          reply: ['Thank you. That was the right call, and it was not easy.'],
          flags: ['mkt-disclosed'],
          trust: { manager: 3 },
        },
      ],
    ),
    'mkt-sofia-end': scene(
      'mkt-sofia-end',
      'manager',
      (flags) => [
        '*Sofia has the client’s email open.*',
        flags.includes('mkt-disclosed')
          ? 'They are disappointed with the numbers, and staying with us anyway. “At least you are straight with us,” they said. That is worth more than a good month.'
          : 'They have seen the comments about the video. They are leaving. I am not going to pretend that did not matter.',
      ],
      [
        {
          id: 'own',
          label: 'Own your part in it',
          reply: ['Thank you. We learn, and we do better.'],
          trust: { manager: 2 },
        },
        {
          id: 'next',
          label: 'Ask what is next',
          reply: ['A client of your own. Do it the honest way.'],
          trust: { manager: 1 },
        },
      ],
    ),
  },
}
