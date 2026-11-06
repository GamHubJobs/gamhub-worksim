/**
 * What the people of a place are doing, and where, at any moment of the day:
 * each person has a role, a place of their own (a desk, the reception desk), a
 * day (arriving, meetings, lunch, going home) and errands with a purpose (the
 * printer, a word with a colleague, the manager's office), which differ by
 * person. Everything follows from the clock and the day number, so it is the
 * same every time, is right straight away after time jumps ahead (people are
 * already where they should be), and no one can be sent back and forth for no
 * reason. Pure, for every place; the office's people are in office/scene/officeCast.ts.
 */
import type { ClipId } from '../character/rig'

/** Somewhere a person can be, and what they do there. */
export interface Place {
  x: number
  z: number
  /** The way they face there (radians; 0 faces −z). */
  heading: number
  seated?: boolean
  /** What they do there. */
  clip: ClipId
  /** Other things they do there now and then (reading, the phone), for variety. */
  also?: ClipId[]
  /** What it looks like they are doing, for the development view and tests. */
  label: string
}

export interface Errand {
  /** A place, or `visit:<person>` for a word with someone at their place. */
  to: string
  /** Office minutes it takes, there and back included. */
  minutes: number
  /** How likely in a given hour (0…1). */
  chance: number
}

export interface Meal {
  /** When they go (office minutes since midnight) and for how long. */
  at: number
  minutes: number
  /** Where: a place, or their own place (lunch at the desk), or `out` (they go out). */
  place: string | 'own' | 'out'
}

export interface Person {
  id: string
  role: string
  /** Their own place, where they spend most of the day. */
  own: string
  arrives: number
  leaves: number
  lunch: Meal | null
  /** The meetings they go to, by meeting, at a place for each. */
  meetings: Record<string, string>
  errands: Errand[]
  /** Talked to by the player (the activity's id): comes back to their own place when the player comes to talk. */
  talk?: string
  /** Who they are in a conversation (the speaker's id), so they face the player and talk. */
  speaker?: string
}

export interface Gathering {
  id: string
  /** Weekdays (0 = Monday). */
  days: number[]
  start: number
  minutes: number
}

export type Intent =
  | { kind: 'away' }
  | {
      kind: 'at'
      /** The place's id. */
      place: string
      /** Why they are there. */
      reason: 'own' | 'meeting' | 'lunch' | 'errand' | 'visit' | 'attending'
      /** For a visit: whom. */
      with?: string
    }

/** A small, fixed scramble: the same numbers for the same person, day and hour. */
export function hash(...parts: Array<string | number>): number {
  let h = 2166136261
  for (const part of parts) {
    const s = String(part)
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    h ^= 0x2c
  }
  return ((h >>> 0) % 100000) / 100000
}

/** The errand someone is on at a minute (from the hour's draw), or null. */
export function errandAt(p: Person, day: number, minute: number): Errand | null {
  const hour = Math.floor(minute / 60)
  for (let i = 0; i < p.errands.length; i++) {
    const e = p.errands[i]
    if (hash(p.id, day, hour, i, 'go') >= e.chance) continue
    // Somewhere in the hour, never running past it.
    const start =
      hour * 60 + Math.floor(hash(p.id, day, hour, i, 'at') * (60 - e.minutes))
    if (minute >= start && minute < start + e.minutes) return e
  }
  return null
}

/** Where someone is meant to be (before others are taken into account). */
export function wanted(
  p: Person,
  day: number,
  minute: number,
  gatherings: Gathering[],
  /** The clock for errands, which may run on a little while the game clock stands still. */
  errandMinute = minute,
): Intent {
  if (minute < p.arrives || minute >= p.leaves) return { kind: 'away' }
  const weekday = (((day - 1) % 7) + 7) % 7
  for (const g of gatherings) {
    const place = p.meetings[g.id]
    if (!place || !g.days.includes(weekday)) continue
    if (minute >= g.start && minute < g.start + g.minutes)
      return { kind: 'at', place, reason: 'meeting' }
  }
  const meal = p.lunch
  if (meal && minute >= meal.at && minute < meal.at + meal.minutes) {
    if (meal.place === 'out') return { kind: 'away' }
    return {
      kind: 'at',
      place: meal.place === 'own' ? p.own : meal.place,
      reason: 'lunch',
    }
  }
  // Not in the few minutes before a meeting or lunch: no one sets off just before.
  const soon = (at: number) => at > errandMinute && at - errandMinute < 8
  const busySoon =
    gatherings.some(
      (g) => p.meetings[g.id] && g.days.includes(weekday) && soon(g.start),
    ) ||
    (meal ? soon(meal.at) : false) ||
    soon(p.leaves)
  const errand = busySoon ? null : errandAt(p, day, errandMinute)
  if (errand) {
    if (errand.to.startsWith('visit:'))
      return { kind: 'at', place: errand.to, reason: 'visit', with: errand.to.slice(6) }
    return { kind: 'at', place: errand.to, reason: 'errand' }
  }
  return { kind: 'at', place: p.own, reason: 'own' }
}

/**
 * Where everyone is: what each wants, then sorted out so no two people are
 * at the same place (the second goes back to their own place) and a visit
 * only happens if the person visited is at their own place.
 */
export function everyone(
  people: Person[],
  day: number,
  minute: number,
  gatherings: Gathering[],
  options: {
    errandMinute?: number
    /** People the player has come to talk to: they are at their own place. */
    attending?: ReadonlySet<string>
  } = {},
): Map<string, Intent> {
  const out = new Map<string, Intent>()
  for (const p of people) {
    let intent = wanted(p, day, minute, gatherings, options.errandMinute ?? minute)
    if (options.attending?.has(p.id) && intent.kind === 'at')
      intent = { kind: 'at', place: p.own, reason: 'attending' }
    out.set(p.id, intent)
  }
  // A visit needs the other person at their own place (not a meeting, lunch or errand).
  for (const p of people) {
    const intent = out.get(p.id)!
    if (intent.kind !== 'at' || intent.reason !== 'visit') continue
    const other = out.get(intent.with!)
    const host = people.find((q) => q.id === intent.with)
    if (!other || !host || other.kind !== 'at' || other.place !== host.own)
      out.set(p.id, { kind: 'at', place: p.own, reason: 'own' })
  }
  // One person to a place: the first in the list keeps it.
  const taken = new Set<string>()
  for (const p of people) {
    const intent = out.get(p.id)!
    if (intent.kind !== 'at') continue
    if (taken.has(intent.place))
      out.set(p.id, { kind: 'at', place: p.own, reason: 'own' })
    else taken.add(intent.place)
  }
  return out
}

/** What someone does at a place now: its clip, with a change now and then (by real time). */
export function doingAt(place: Place, id: string, seconds: number): ClipId {
  if (!place.also?.length) return place.clip
  // Every so often, for a little while, something else (reading, the phone).
  const slot = Math.floor(seconds / 20)
  const r = hash(id, slot, 'also')
  return r < 0.3 ? place.also[Math.floor(r * 10) % place.also.length] : place.clip
}
