/**
 * Walking the street: where the player can go, where they stand at a door,
 * and which door they are near. Pure, so it can be tested without 3D.
 */
import { PLACES, doorOut, type PlaceId } from '../content/city'

/** The part of the street, for its sounds: homes, the high street, the park, offices. */
export type Area = 'residential' | 'street' | 'park' | 'district'

export function areaAt(x: number): Area {
  if (x < -28) return 'residential'
  if (x < 28) return 'street'
  if (x < 52) return 'park'
  return 'district'
}

/** What is underfoot: the road between the kerbs, the pavement either side. */
export function surfaceAt(z: number): 'road' | 'pavement' {
  return Math.abs(z) < 5 ? 'road' : 'pavement'
}

/** Where the player can walk: the street and its pavements. */
export const BOUNDS = { minX: -64, maxX: 66, minZ: -8.6, maxZ: 8.6 }
/**
 * And the business district at the end of the street, open to walk about: its
 * workplaces (the hospital, Northbank, the two towers), their car parks and
 * paths. Its buildings are solid (read from what is drawn).
 */
export const DISTRICT = { minX: 52, maxX: 112, minZ: -34, maxZ: 34 }
/** How close to a door the player must be to go in. */
export const NEAR_DOOR = 3.5

/** Where the player stands at a door: a few steps out from it (on the pavement, or the path). */
export function standAt(id: PlaceId): [number, number] {
  const place = PLACES.find((p) => p.id === id)!
  const [x, z] = place.door
  const [ox, oz] = doorOut(place)
  return [x + ox * 3, z + oz * 3]
}

/** The door the player is near, if any. */
export function nearestDoor(x: number, z: number): PlaceId | null {
  let best: PlaceId | null = null
  let distance = NEAR_DOOR
  for (const place of PLACES) {
    const d = Math.hypot(place.door[0] - x, place.door[1] - z)
    if (d < distance) {
      distance = d
      best = place.id
    }
  }
  return best
}
