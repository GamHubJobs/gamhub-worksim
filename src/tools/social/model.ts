/** Social Planner: the posting rules and the actions on posts. */
import type { Channel, Post, SocialState } from './schema'

type Result = { state: SocialState; problems: string[] }

export function channelOf(state: SocialState, post: Post): Channel | undefined {
  return state.channels.find((c) => c.id === post.channel)
}

/** The five working days of the week, as YYYY-MM-DD. */
export function weekDays(state: SocialState): string[] {
  const start = new Date(`${state.weekStart}T00:00:00Z`).getTime()
  return Array.from({ length: 5 }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10),
  )
}

const minutes = (dateTime: string) => new Date(`${dateTime}:00Z`).getTime() / 60_000

/** Why a post can't be published as it is (or at this time). */
export function postProblems(
  state: SocialState,
  post: Post,
  at = post.scheduledAt,
): string[] {
  const problems: string[] = []
  const channel = channelOf(state, post)
  if (!channel) return ['Choose a channel.']
  const text = post.text.trim()
  if (!text) problems.push('Write the post.')
  if (text.length > channel.limit) {
    problems.push(
      `${channel.name} allows ${channel.limit} characters; this post has ${text.length}.`,
    )
  }
  if (channel.requiresImage && !post.image)
    problems.push(`${channel.name} posts need an image.`)
  if (at) {
    if (!weekDays(state).includes(at.slice(0, 10)))
      problems.push('Schedule it on a working day of this week.')
    const blackout = state.blackouts.find((b) => at >= b.start && at < b.end)
    if (blackout) problems.push(`Nothing can go out then: ${blackout.reason}.`)
    const clash = state.posts.find(
      (p) =>
        p.id !== post.id &&
        p.status === 'scheduled' &&
        p.channel === post.channel &&
        Math.abs(minutes(p.scheduledAt) - minutes(at)) < 120,
    )
    if (clash)
      problems.push(
        `Another ${channel.name} post is scheduled within two hours (${clash.scheduledAt.slice(11)}).`,
      )
  }
  return problems
}

/** Whether a time falls in the channel's best hours. */
export function atBestTime(channel: Channel, at: string): boolean {
  const hour = Number(at.slice(11, 13))
  return hour >= channel.bestHours[0] && hour < channel.bestHours[1]
}

export function addPost(
  state: SocialState,
  channel: string,
): { state: SocialState; id: string } {
  let n = state.posts.length + 1
  while (state.posts.some((p) => p.id === `post${n}`)) n++
  const post: Post = {
    id: `post${n}`,
    channel,
    text: '',
    image: '',
    scheduledAt: '',
    status: 'draft',
  }
  return { state: { ...state, posts: [...state.posts, post] }, id: post.id }
}

/** Edits a post. A scheduled post goes back to draft: it must be checked and scheduled again. */
export function updatePost(
  state: SocialState,
  id: string,
  change: Partial<Pick<Post, 'channel' | 'text' | 'image'>>,
): SocialState {
  return {
    ...state,
    posts: state.posts.map((p) =>
      p.id === id ? { ...p, ...change, status: 'draft' as const, scheduledAt: '' } : p,
    ),
  }
}

export function schedulePost(state: SocialState, id: string, at: string): Result {
  const post = state.posts.find((p) => p.id === id)
  if (!post) return { state, problems: ['That post no longer exists.'] }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at))
    return { state, problems: ['Choose a day and a time.'] }
  const problems = postProblems(state, post, at)
  if (problems.length > 0) return { state, problems }
  return {
    state: {
      ...state,
      posts: state.posts.map((p) =>
        p.id === id ? { ...p, scheduledAt: at, status: 'scheduled' as const } : p,
      ),
    },
    problems: [],
  }
}

export function unschedulePost(state: SocialState, id: string): SocialState {
  return {
    ...state,
    posts: state.posts.map((p) =>
      p.id === id ? { ...p, scheduledAt: '', status: 'draft' as const } : p,
    ),
  }
}

export function deletePost(state: SocialState, id: string): SocialState {
  return { ...state, posts: state.posts.filter((p) => p.id !== id) }
}
