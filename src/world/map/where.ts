import { PLACES } from '../../content/city'
import type { ProfileData } from '../../game/career'
import type { Pose } from './store'

/** Where the player is on the map: in the street, or at the place they are in. */
export function playerOnMap(profile: ProfileData, pose: Pose | null) {
  if (pose) return pose
  const life = profile.work.life
  const at = life.phase === 'work' ? 'office' : life.city.at
  const p = PLACES.find((q) => q.id === at)!
  return { x: p.door[0], z: p.door[1], heading: 0 }
}

/**
 * A view's centre along one axis, kept so the view (`size` across) stays over
 * the drawn area (from `start`, `extent` across); centred on it when the view
 * is wider than the whole area.
 */
export function within(centre: number, size: number, start: number, extent: number) {
  if (size >= extent) return start + extent / 2
  return Math.min(start + extent - size / 2, Math.max(start + size / 2, centre))
}
