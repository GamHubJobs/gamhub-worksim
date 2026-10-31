/**
 * When work is due. Tasks handed out in the morning are due at the end of the
 * day; later ones are due at midday on the next working day.
 */
import { HOURS } from '../content/workday'
import type { WorkState } from '../persistence/schemas'
import { absoluteTime, nextWorkday, splitTime } from './clock'

/** Tasks received up to this time are due the same day. */
export const SAME_DAY_CUTOFF = 11 * 60

export const NEXT_DAY_DUE = 12 * 60

export function dueTimeFor(receivedAt: number): number {
  const { day, minute } = splitTime(receivedAt)
  return minute <= SAME_DAY_CUTOFF
    ? absoluteTime(day, HOURS.end)
    : absoluteTime(nextWorkday(day), NEXT_DAY_DUE)
}

export function now(work: WorkState): number {
  return absoluteTime(work.day, work.minute)
}

/** Gives a newly received task its deadline (once). */
export function addDeadline(work: WorkState, assignmentId: string): WorkState {
  if (work.deadlines[assignmentId]) return work
  return {
    ...work,
    deadlines: {
      ...work.deadlines,
      [assignmentId]: { due: dueTimeFor(now(work)), status: 'open', extended: false },
    },
  }
}

/** One extra working day, if the player asks before the deadline. */
export function extendedDue(due: number): number {
  const { day, minute } = splitTime(due)
  return absoluteTime(nextWorkday(day), minute)
}
