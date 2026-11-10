/**
 * Finding the way (see world/map/): the destination, recent destinations and
 * the places the player has found (been to, or walked past). Getting there is
 * always on foot (or by bike or car): nothing here moves the player. Pure.
 */
import { PLACES, type PlaceId } from '../content/city'
import type { ProfileData } from './career'

/** How near a door the player must pass to have found the place. */
export const FIND_DISTANCE = 14

export function setDestination(profile: ProfileData, id: PlaceId | null): ProfileData {
  const life = profile.work.life
  const recent = id
    ? [id, ...life.nav.recent.filter((r) => r !== id)].slice(0, 5)
    : life.nav.recent
  return {
    ...profile,
    work: {
      ...profile.work,
      life: { ...life, nav: { ...life.nav, destination: id, recent } },
    },
  }
}

/** Places found: those whose door is near enough to where the player is now. */
export function foundNear(found: PlaceId[], x: number, z: number): PlaceId[] {
  const add = PLACES.filter(
    (p) =>
      !found.includes(p.id) && Math.hypot(p.door[0] - x, p.door[1] - z) < FIND_DISTANCE,
  ).map((p) => p.id)
  return add.length ? [...found, ...add] : found
}

export function withFound(profile: ProfileData, found: PlaceId[]): ProfileData {
  const life = profile.work.life
  return {
    ...profile,
    work: { ...profile.work, life: { ...life, nav: { ...life.nav, found } } },
  }
}

/** There: the destination is reached (inside it), so it is cleared. */
export function arrived(profile: ProfileData): boolean {
  const life = profile.work.life
  const d = life.nav.destination
  if (!d) return false
  if (d === 'office') return life.phase === 'work'
  return life.phase !== 'work' && life.city.inside && life.city.at === d
}
