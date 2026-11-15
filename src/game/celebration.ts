/**
 * The team's Friday celebration: at a quarter past four on Fridays, everyone
 * gathers round the break room table for cake to mark the week's work (the
 * office's people go there by themselves; see office/scene/officeCast.ts).
 * The player can join them while it is on, once: some time away from the
 * desk, a lift in the mood, and a little more trust with the team.
 */
import type { WorkState } from '../persistence/schemas'
import type { ProfileData } from './career'
import { applyEffects } from './scenes'
import { CELEBRATION } from '../content/workday'

export { CELEBRATION }

/** Recorded in the day's talks under this key, so it is joined once. */
const JOINED = '@celebration'

/** The colleagues who are there (and whose trust it builds). */
export const CELEBRATING = ['manager', 'senior', 'backM', 'backR', 'front2', 'starter']

const weekday = (day: number) => (((day - 1) % 7) + 7) % 7

/** Whether the celebration is on now. */
export function celebrationOn(work: WorkState): boolean {
  return (
    !work.dayOver &&
    CELEBRATION.days.includes(weekday(work.day)) &&
    work.minute >= CELEBRATION.start &&
    work.minute < CELEBRATION.start + CELEBRATION.minutes
  )
}

export function joinedCelebration(work: WorkState): boolean {
  return (work.today.talks[JOINED] ?? 0) > 0
}

/** Why the player cannot join the celebration now, or null. */
export function canJoinCelebration(profile: ProfileData): string | null {
  const work = profile.work
  if (joinedCelebration(work)) return 'You have had your cake.'
  if (!celebrationOn(work)) return 'The team celebrates on Fridays at 4:15.'
  return null
}

/** Joins the team for cake in the break room. */
export function joinCelebration(profile: ProfileData): ProfileData {
  if (canJoinCelebration(profile)) return profile
  // Time away from the desk first, then what it does for the mood and the team.
  const later = applyEffects(profile, { minutes: 15 })
  const next = applyEffects(later, {
    wellbeing: { stress: -6, engagement: 6 },
    trust: Object.fromEntries(CELEBRATING.map((id) => [id, 1])),
    log: { text: 'Friday cake with the team in the break room', tone: 'good' },
  })
  return {
    ...next,
    work: {
      ...next.work,
      today: {
        ...next.work.today,
        talks: { ...next.work.today.talks, [JOINED]: 1 },
      },
    },
  }
}
