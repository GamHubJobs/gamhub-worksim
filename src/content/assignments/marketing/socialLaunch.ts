import type { AssignmentInput } from '../../schemas'
import { launchWeek } from '../../../tools/social/definition'
import { addPost, schedulePost, updatePost } from '../../../tools/social/model'
import type { SocialState } from '../../../tools/social/schema'

/**
 * Digital Marketing (Marketing Assistant): plan the spring launch week in
 * Social Planner. Teaches: writing to each channel's limits and habits,
 * scheduling at the right times, and working around a blackout.
 */
const start = launchWeek()

const plan: Array<{ channel: string; at: string; text: string; image?: string }> = [
  {
    channel: 'linkedin',
    at: '2026-04-20T08:30',
    text: 'Spring is when growing businesses plan the year ahead. This month, book a free 30-minute review with one of our senior advisers and get 20% off your first quarter with code SPRING20. Book yours: cobaltridge.example/spring',
  },
  {
    channel: 'x',
    at: '2026-04-20T12:30',
    text: 'Free 30-minute business review with a senior adviser, plus 20% off your first quarter with SPRING20. Book now: cobaltridge.example/spring',
  },
  {
    channel: 'instagram',
    at: '2026-04-21T18:30',
    text: 'Spring is here, and so is our free business review. Book 30 minutes with a senior adviser and use code SPRING20 for 20% off your first quarter. Link in bio.',
    image: 'spring-banner.png',
  },
  {
    channel: 'x',
    at: '2026-04-22T13:15',
    text: 'Still planning your year? Book a free 30-minute review this week and save 20% with SPRING20: cobaltridge.example/spring',
  },
  {
    channel: 'linkedin',
    at: '2026-04-23T09:00',
    text: '“We left our review with three changes we made the same week.” Book your own free 30-minute review before the end of April, with 20% off your first quarter: code SPRING20. cobaltridge.example/spring',
  },
]

function solution(): SocialState {
  let s = start
  for (const post of plan) {
    const added = addPost(s, post.channel)
    s = updatePost(added.state, added.id, { text: post.text, image: post.image ?? '' })
    const result = schedulePost(s, added.id, post.at)
    if (result.problems.length > 0) throw new Error(result.problems.join(' '))
    s = result.state
  }
  return s
}

const offer = [['SPRING20'], ['cobaltridge.example/spring']]

export const socialLaunch: AssignmentInput = {
  id: 'social-launch',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'marketing-assistant',
  order: 3,
  kind: 'tool',
  title: 'Schedule the launch week',
  summary:
    'Write and schedule the spring launch posts across three channels in Social Planner.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Launch week posts: please schedule them in Social Planner',
    body: `Hi {name},

The spring offer launches on Monday 20 April. Please write and schedule these posts in **Social Planner**:

• **Monday**: one LinkedIn post and one X post announcing the offer.
• **Tuesday**: one Instagram post with the **spring banner** image.
• **Wednesday**: one X reminder. Careful: the website is down for maintenance on Wednesday from 11:00 to 13:00, so nothing can go out then.
• **Thursday**: one LinkedIn post with a client quote and a last call to book.

Every post must include the code **SPRING20**, and the link **cobaltridge.example/spring**, except on Instagram, which doesn’t allow links: write “link in bio” there. Post at each channel’s best times (they’re on the left of the planner), and don’t leave anything in draft.

Sofia`,
  },
  whyItMatters:
    'Social media is planned, not improvised. Writing to each channel’s limits and habits, timing posts for when the audience is there, and never sending people to a broken website are the basics of every social media role.',
  objectives: [
    'Write posts to each channel’s limits and rules',
    'Schedule at the best times, around a blackout',
    'Keep every post on brand: offer, code and link',
  ],
  steps: [
    {
      id: 'write',
      title: 'Write the posts',
      instructions:
        'In **Posts**, click **New LinkedIn post** (or X, or Instagram). Write the text and watch the counter: X allows 280 characters.',
      hint: 'One clear call to action: book a free review.',
    },
    {
      id: 'instagram',
      title: 'Instagram',
      instructions:
        'Choose the spring banner as the image, and write “link in bio” instead of the link.',
    },
    {
      id: 'schedule',
      title: 'Schedule them',
      instructions:
        'Choose the day and time and click **Schedule**. Best times: LinkedIn 08:00–10:00, X 12:00–14:00, Instagram 18:00–21:00. On Wednesday, the maintenance window covers part of the X best time: pick a best time after 13:00.',
    },
    {
      id: 'check',
      title: 'Check the calendar',
      instructions:
        'Open **Calendar** to see the week at a glance. Then click **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'social',
    title: 'Social Planner: launch week',
    start,
    solution: solution(),
    checks: [
      {
        id: 'monday',
        type: 'posts',
        items: [
          { channel: 'linkedin', day: '2026-04-20', includes: offer },
          { channel: 'x', day: '2026-04-20', includes: offer },
        ],
        title: 'Monday’s launch posts',
        points: 20,
        why: 'Launch day needs the offer on the channels our clients use most.',
        hint: 'A LinkedIn post and an X post on Monday, each with SPRING20 and the link.',
      },
      {
        id: 'instagram',
        type: 'posts',
        items: [
          {
            channel: 'instagram',
            day: '2026-04-21',
            includes: [['SPRING20'], ['link in bio']],
            image: 'spring-banner.png',
          },
        ],
        title: 'Tuesday’s Instagram post',
        points: 20,
        why: 'Instagram is visual and doesn’t allow links: the banner and “link in bio” do the job.',
        hint: 'Instagram on Tuesday, with the spring banner, SPRING20 and “link in bio”.',
      },
      {
        id: 'later',
        type: 'posts',
        items: [
          { channel: 'x', day: '2026-04-22', includes: offer },
          { channel: 'linkedin', day: '2026-04-23', includes: offer },
        ],
        title: 'Reminders on Wednesday and Thursday',
        points: 20,
        why: 'Most people need to see an offer several times before they act.',
        hint: 'An X post on Wednesday (outside the maintenance window) and a LinkedIn post on Thursday.',
      },
      {
        id: 'timing',
        type: 'best-times',
        title: 'Posted at the best times',
        points: 25,
        why: 'A post at the wrong time is a post nobody sees.',
        hint: 'LinkedIn 08:00–10:00, X 12:00–14:00 (on Wednesday, only after the maintenance ends at 13:00), Instagram 18:00–21:00.',
      },
      {
        id: 'no-drafts',
        type: 'no-drafts',
        title: 'Nothing left in draft',
        points: 15,
        why: 'A draft never goes out: the campaign would have a hole in it.',
        hint: 'Schedule or delete every draft.',
      },
    ],
  },
  passScore: 70,
  xp: 110,
  skills: { copywriting: 35, 'content-strategy': 40, accuracy: 15 },
  feedback: {
    excellent: `Hi {name},

A perfect launch week: every post on brand and on time, and nothing sends people to the website while it’s down. {senior} called it the tidiest launch calendar in months.

Sofia`,
    good: `Hi {name},

A good plan; a couple of posts need adjusting. See the notes.

Sofia`,
    pass: `Hi {name},

Some posts are missing or at the wrong time. The notes say which.

Sofia`,
    fail: `Hi {name},

Not yet. Start with Monday’s LinkedIn post, then work through the week.

Sofia`,
  },
}
