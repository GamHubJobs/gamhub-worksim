/** Social Planner: its registration with the tools framework, and sample data. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { atBestTime, channelOf } from './model'
import { SocialStateSchema, type SocialState } from './schema'

/** Launch week of the spring campaign. */
export function launchWeek(): SocialState {
  return {
    weekStart: '2026-04-20',
    channels: [
      {
        id: 'linkedin',
        name: 'LinkedIn',
        limit: 3000,
        requiresImage: false,
        bestHours: [8, 10],
      },
      { id: 'x', name: 'X', limit: 280, requiresImage: false, bestHours: [12, 14] },
      {
        id: 'instagram',
        name: 'Instagram',
        limit: 2200,
        requiresImage: true,
        bestHours: [18, 21],
      },
    ],
    images: [
      {
        name: 'spring-banner.png',
        description: 'Spring offer banner: “Free business review + 20% off”',
      },
      { name: 'team-workshop.jpg', description: 'Advisers running a client workshop' },
      { name: 'office-plants.jpg', description: 'Plants in the office kitchen' },
    ],
    blackouts: [
      {
        start: '2026-04-22T11:00',
        end: '2026-04-22T13:00',
        reason:
          'the website is down for maintenance (posts would send people to an error page)',
      },
    ],
    rules: [
      'Every post about the offer includes the code SPRING20 and the link cobaltridge.example/spring.',
      'Instagram does not allow links in posts: write “link in bio” instead, and use the spring banner.',
      'One clear call to action per post: book a free review.',
    ],
    posts: [],
  }
}

export const SocialCheckSchema = z.discriminatedUnion('type', [
  /** Scheduled posts on these channels and days, each containing the terms. */
  FileCheckBaseSchema.extend({
    type: z.literal('posts'),
    items: z
      .array(
        z.object({
          channel: z.string(),
          day: z.string(),
          /** Each group: any of these words counts. */
          includes: z.array(z.array(z.string()).min(1)).default([]),
          image: z.string().optional(),
        }),
      )
      .min(1),
  }),
  /** Scheduled posts go out at their channel's best times. */
  FileCheckBaseSchema.extend({ type: z.literal('best-times') }),
  /** Nothing is left in draft. */
  FileCheckBaseSchema.extend({ type: z.literal('no-drafts') }),
])
export type SocialCheck = z.infer<typeof SocialCheckSchema>

function gradeCheck(check: SocialCheck, player: SocialState) {
  const scheduled = player.posts.filter((p) => p.status === 'scheduled')
  switch (check.type) {
    case 'posts': {
      const used = new Set<string>()
      const missing: string[] = []
      for (const item of check.items) {
        const name =
          player.channels.find((c) => c.id === item.channel)?.name ?? item.channel
        const found = scheduled.find(
          (p) =>
            !used.has(p.id) &&
            p.channel === item.channel &&
            p.scheduledAt.startsWith(item.day) &&
            item.includes.every((group) =>
              group.some((t) => p.text.toLowerCase().includes(t.toLowerCase())),
            ) &&
            (!item.image || p.image === item.image),
        )
        if (found) used.add(found.id)
        else {
          const extra = [
            ...item.includes.map((g) => `“${g[0]}”`),
            ...(item.image ? [`the image ${item.image}`] : []),
          ]
          missing.push(
            `No ${name} post scheduled on ${item.day}${extra.length ? ` with ${extra.join(', ')}` : ''}.`,
          )
        }
      }
      return checkResult(check, 1 - missing.length / check.items.length, missing)
    }
    case 'best-times': {
      const off = scheduled.filter((p) => {
        const channel = channelOf(player, p)
        return channel && !atBestTime(channel, p.scheduledAt)
      })
      return checkResult(
        check,
        scheduled.length === 0 ? 0 : 1 - off.length / scheduled.length,
        scheduled.length === 0
          ? ['No posts are scheduled.']
          : off.map(
              (p) =>
                `The ${channelOf(player, p)?.name} post at ${p.scheduledAt.replace('T', ' ')} is outside the best hours.`,
            ),
      )
    }
    case 'no-drafts': {
      const drafts = player.posts.filter((p) => p.status === 'draft')
      return checkResult(
        check,
        drafts.length === 0 ? 1 : 0,
        drafts.map(
          (p) =>
            `A ${channelOf(player, p)?.name ?? ''} draft is not scheduled: schedule or delete it.`,
        ),
      )
    }
  }
}

export const social: ToolDefinition<SocialState, SocialCheck> = {
  id: 'social',
  name: 'Social Planner',
  category: 'Social media scheduling',
  icon: 'social',
  sections: [
    {
      id: 'calendar',
      name: 'Calendar',
      description: 'The week’s scheduled posts, by day and time.',
    },
    {
      id: 'posts',
      name: 'Posts',
      description: 'Write posts, attach images and schedule them.',
    },
  ],
  state: SocialStateSchema,
  practice: () => launchWeek(),
  summary: (state) => {
    const scheduled = state.posts.filter((p) => p.status === 'scheduled').length
    return `${scheduled} scheduled, ${state.posts.length - scheduled} draft${state.posts.length - scheduled === 1 ? '' : 's'}`
  },
  check: SocialCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The plan was not handed in.']),
    ),
  guide: {
    intro:
      'Social Planner is where the week’s posts are written, checked and scheduled across channels. Each channel has its own length limit, its own habits (Instagram needs an image and doesn’t allow links) and its own best times, when our audience is most active.',
    topics: [
      {
        title: 'Write and schedule a post',
        body: 'In Posts, click the channel to start a new post. Write it, watching the character counter, and attach an image if needed. Choose the day and time and click Schedule. The planner checks it first: too long, missing image, a blackout or two posts too close together all stop it.',
      },
      {
        title: 'Timing',
        body: 'Each channel shows its best hours (from last quarter’s results). Avoid blackout periods, such as website maintenance, and space posts on the same channel at least two hours apart.',
      },
      {
        title: 'Changing a scheduled post',
        body: 'Editing a scheduled post takes it back to draft, so it is checked again before it goes out. Remember to schedule it again.',
      },
    ],
    glossary: [
      {
        term: 'Call to action',
        meaning: 'What you want the reader to do next, e.g. “Book your free review”.',
      },
      {
        term: 'Link in bio',
        meaning:
          'Instagram’s convention: the link sits on the profile page, not in the post.',
      },
      {
        term: 'Best times',
        meaning: 'The hours when posts on a channel usually get the most engagement.',
      },
      { term: 'Blackout', meaning: 'A period when nothing should be published.' },
    ],
  },
}
