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
