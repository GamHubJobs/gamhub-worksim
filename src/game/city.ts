/**
 * Out in the neighbourhood: stepping out of the front door (or out of a
 * place), walking along the street, and going into the café, the shop, the
 * gym, the park, back home, or (in the morning) on to the office. Walking
 * takes time on the home clock, and needs fall on the way, as everywhere.
 */
import {
  WALK_UNITS_A_MINUTE,
  closedReason,
  getPlace,
  type PlaceId,
} from '../content/city'
import { LATEST_BEDTIME } from '../content/life'
import type { Life } from '../persistence/schemas'
import type { ProfileData } from './career'
import { commuteMinutes, leaveForWork, lifePhase } from './life'
import { decayed, note, withLife, withWellbeing } from './lifeTime'

/** Minutes on foot between two places, along the street. */
export function walkMinutes(from: PlaceId, to: PlaceId): number {
  if (from === to) return 0
  const a = getPlace(from)!.door
  const b = getPlace(to)!.door
  const distance = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])
  return Math.max(1, Math.round(distance / WALK_UNITS_A_MINUTE))
}

/** Whether the player is out in the street (not inside anywhere). */
export function isOutside(profile: ProfileData): boolean {
  return profile.work.dayOver && !profile.work.life.city.inside
}

/** Why the player cannot step outside now, or null. */
export function canGoOut(profile: ProfileData): string | null {
  const phase = lifePhase(profile)
  if (phase === 'work') return 'You are at work.'
  const life = profile.work.life
  if (!life.city.inside) return 'You are already outside.'
  if (phase === 'evening' && life.minute >= LATEST_BEDTIME - 30)
    return 'It is very late: time for bed.'
  return null
}

/** Steps out of the front door, or out of the place the player is in. */
export function goOutside(profile: ProfileData): ProfileData {
  if (canGoOut(profile)) return profile
  const life = profile.work.life
  const place = getPlace(life.city.at)!
  return withLife(
    profile,
    note(
      { ...life, city: { ...life.city, inside: false } },
      place.id === 'home' ? 'Went out into the neighbourhood' : `Left ${place.name}`,
    ),
  )
}

/** Minutes to walk from where the player is to a place (the office: the walk to work). */
export function minutesTo(profile: ProfileData, id: PlaceId): number {
  const life = profile.work.life
  if (id === 'office') return commuteMinutes(life, 'walk')
  const walk = walkMinutes(life.city.at, id)
  // On the bike, twice as quick.
  return life.city.riding && walk ? Math.max(1, Math.round(walk / 2)) : walk
}

/** Why the player cannot go into a place now, or null. */
export function canEnter(profile: ProfileData, id: PlaceId): string | null {
  const phase = lifePhase(profile)
  if (phase === 'work') return 'You are at work.'
  const life = profile.work.life
  if (life.city.inside) return 'Go outside first.'
  const place = getPlace(id)
  if (!place) return 'There is no such place.'
  if (id === 'office')
    return phase === 'morning' ? null : 'The office is closed until tomorrow morning.'
  if (id === 'home') return null
  const arrival = life.minute + minutesTo(profile, id)
  if (arrival >= LATEST_BEDTIME - 30) return 'It is very late: time to go home.'
  return closedReason(place, arrival)
}

/**
 * Walks to a place and goes in. Walking to the office in the morning is the
 * walk to work: the working day starts when the player arrives.
 */
export function enterPlace(profile: ProfileData, id: PlaceId): ProfileData {
  if (canEnter(profile, id)) return profile
  if (id === 'office') return leaveForWork(profile, 'walk')
  const life = profile.work.life
  const place = getPlace(id)!
  const minutes = minutesTo(profile, id)
  let next: Life = {
    ...life,
    minute: life.minute + minutes,
    needs: decayed(life.needs, minutes),
    // The bike is left at home; elsewhere it waits outside.
    city: { at: id, inside: true, riding: id === 'home' ? false : life.city.riding },
  }
  next = note(
    { ...next, minute: life.minute },
    id === 'home'
      ? `${life.city.riding ? 'Cycled' : 'Walked'} home (${minutes} min)`
      : `${life.city.riding ? 'Cycled' : 'Walked'} to ${place.name} (${minutes} min)`,
  )
  next = { ...next, minute: life.minute + minutes }
  // A short walk is good for you; a long one is tiring.
  const energy = minutes > 20 ? -Math.round(minutes / 20) : 0
  return withLife(profile, next, withWellbeing(profile.work, energy, minutes ? -1 : 0))
}
