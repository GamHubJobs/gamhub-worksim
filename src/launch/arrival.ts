/** Where the opening's flight ends: the player's own building. */
import { getPlace, type PlaceId } from '../content/city'
import type { Profile } from '../persistence/schemas'

/** Where the player is: the door the flight ends at, and its name. */
export function arrival(profile: Profile | null): {
  door: [number, number]
  name: string
} {
  const office = getPlace('office')!
  if (!profile || !profile.work.dayOver)
    return { door: office.door, name: office.name ?? 'the office' }
  const at = profile.work.life.city.at as PlaceId
  const place = getPlace(at) ?? getPlace('home')!
  return { door: place.door, name: at === 'home' ? 'home' : place.name }
}
