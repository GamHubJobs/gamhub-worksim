/**
 * Remembers a visit to court on this device, so reloading the page during it
 * finds the player still at court (the save already has the journey there in
 * its clock and log). Only for the same working day, while it is still on.
 */
import type { CourtVisit } from './CourtPanel'

export const VISIT_KEY = 'gamhub-worksim:court-visit'

interface Stored {
  who: string
  day: number
  visit: CourtVisit
}

/** Whose working day it is: the same person in the same career, on that day. */
function whoOf(name: string, careerId: string): string {
  return `${careerId}:${name}`
}

interface Where {
  name: string
  careerId: string
  day: number
  dayOver: boolean
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function storage(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Records the visit (or that the player is back at the office). */
export function saveVisit(
  where: Where,
  visit: CourtVisit | null,
  s: Store | null = storage(),
): void {
  if (!s) return
  try {
    if (!visit) s.removeItem(VISIT_KEY)
    else {
      const stored: Stored = {
        who: whoOf(where.name, where.careerId),
        day: where.day,
        visit,
      }
      s.setItem(VISIT_KEY, JSON.stringify(stored))
    }
  } catch {
    // Storage blocked: a reload returns the player to the office.
  }
}

/** The visit under way for this working day, if one was recorded. */
export function loadVisit(where: Where, s: Store | null = storage()): CourtVisit | null {
  if (!s || where.dayOver) return null
  try {
    const raw = s.getItem(VISIT_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<Stored>
    if (v.who !== whoOf(where.name, where.careerId) || v.day !== where.day) return null
    const visit = v.visit
    if (
      !visit ||
      typeof visit.security !== 'boolean' ||
      typeof visit.signedIn !== 'boolean'
    )
      return null
    return {
      security: visit.security,
      signedIn: visit.signedIn,
      note: typeof visit.note === 'string' ? visit.note : null,
    }
  } catch {
    return null
  }
}
