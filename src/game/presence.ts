/**
 * Where a colleague is, for the chat's availability: from the office's own
 * schedule (their hours, lunch and the meetings they go to), the same that
 * moves them around the 3D office. Deterministic for a given day and time.
 */
import { OFFICE_GATHERINGS, OFFICE_PEOPLE } from '../office/scene/officeCast'
import { weekdayIndex } from './clock'

export type Presence = 'available' | 'busy' | 'away'

export function presenceOf(person: string, day: number, minute: number): Presence {
  const who = OFFICE_PEOPLE.find((p) => p.id === person)
  if (!who) return 'available'
  if (minute < who.arrives || minute >= who.leaves) return 'away'
  if (who.lunch && minute >= who.lunch.at && minute < who.lunch.at + who.lunch.minutes)
    return 'away'
  const weekday = weekdayIndex(day)
  const meeting = OFFICE_GATHERINGS.some(
    (g) =>
      who.meetings[g.id] !== undefined &&
      g.days.includes(weekday) &&
      minute >= g.start &&
      minute < g.start + g.minutes,
  )
  return meeting ? 'busy' : 'available'
}
