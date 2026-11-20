/**
 * The neighbourhood as one set of data, shared by the 3D street and the maps
 * (the world map and the mini-map): the road and its pavements, the crossings,
 * the buildings along both sides, and the places (with their doors). Anything
 * drawn on a map is where it is in 3D, because it is the same data.
 * Coordinates: x along the street (west to east), z across it (north is −z).
 */
import { PLACES, type PlaceId } from '../content/city'
import type { IconName } from '../ui/Icon'

export const ROAD = { minX: -75, maxX: 75, halfWidth: 5 }
/** The pavements either side of the road (centre z and width). */
export const PAVEMENTS = [
  { z: -7.5, width: 5 },
  { z: 7.5, width: 5 },
]
/** Zebra crossings, by x. */
export const CROSSINGS = [-20, 30]

/** Buildings along the street: centre x, which side, width, height and colour. */
export const BUILDINGS: Array<{
  x: number
  side: 1 | -1
  w: number
  h: number
  color: string
}> = [
  { x: -56, side: -1, w: 14, h: 12, color: '#d6cfc4' },
  { x: -40, side: -1, w: 16, h: 8, color: '#efe2d3' },
  { x: -23, side: -1, w: 14, h: 14, color: '#c9b8a6' },
  { x: 0, side: -1, w: 16, h: 7, color: '#e7e5e4' },
  { x: 64, side: -1, w: 10, h: 10, color: '#d4cbbd' },
  { x: -56, side: 1, w: 14, h: 11, color: '#cbbfae' },
  { x: -40, side: 1, w: 16, h: 18, color: '#b7795a' },
  { x: -23, side: 1, w: 14, h: 13, color: '#d9cdbd' },
  { x: 0, side: 1, w: 16, h: 9, color: '#cbd5e1' },
  { x: 16, side: 1, w: 14, h: 12, color: '#c2b5a3' },
  { x: 32, side: 1, w: 14, h: 15, color: '#d6c7b1' },
  { x: 48, side: 1, w: 14, h: 10, color: '#bdb0a0' },
]

/**
 * Westmark County Court (fictional), on the north side of the street: where a
 * law career's hearings are held (see court/). Lawyers go there from work; it
 * sits on weekdays from 10:00 to 16:00, so it is closed whenever the player is
 * out in the street (before work, and in the evening).
 */
export const COURTHOUSE = {
  x: 16,
  side: -1 as const,
  w: 14,
  h: 13,
  color: '#e7e2d6',
  name: 'Westmark County Court',
  /** Its door on the street (x, z). */
  door: [16, -8] as [number, number],
  closed:
    'Westmark County Court is closed now: it hears cases on weekdays from 10 am to 4 pm. Lawyers come here from work.',
}

/** How deep the buildings are, back from the pavement (as drawn in 3D). */
export const BUILDING_DEPTH = 14
/** How far from the middle of the road the buildings' fronts are. */
export const BUILDING_FRONT = 10

/** The park's lawns, behind its gate (north side, as drawn in 3D). */
export const PARK = { minX: 25, maxX: 59, minZ: -44, maxZ: -10 }

export const ICONS: Record<PlaceId, IconName> = {
  home: 'home',
  office: 'building',
  cafe: 'cup',
  shop: 'basket',
  gym: 'dumbbell',
  park: 'tree',
  garage: 'bike',
  offices: 'briefcase',
}

/** What each kind of place is called on the map's key. */
export const KINDS: Record<PlaceId, string> = {
  home: 'Home',
  office: 'Work',
  cafe: 'Café',
  shop: 'Supermarket',
  gym: 'Gym',
  park: 'Park',
  garage: 'Bikes and cars',
  offices: 'Interviews',
}

/** A place's door on the street. */
export function doorOf(id: PlaceId): { x: number; z: number } {
  const p = PLACES.find((q) => q.id === id)!
  return { x: p.door[0], z: p.door[1] }
}

/**
 * The business district at the end of the street (as drawn in 3D), walked
 * about to get to work: each workplace's building, and the car parks.
 */
export const DISTRICT_BUILDINGS: Array<{
  name: string
  x0: number
  x1: number
  z0: number
  z1: number
  color: string
}> = [
  {
    name: 'Northbank Engineering',
    x0: 60.5,
    x1: 77.5,
    z0: 25.8,
    z1: 29,
    color: '#cbd5e1',
  },
  {
    name: 'Riverside Community Hospital',
    x0: 79,
    x1: 93,
    z0: -26,
    z1: -4,
    color: '#f1f5f9',
  },
  { name: 'Cobalt Ridge Consulting', x0: 79, x1: 93, z0: 15, z1: 29, color: '#93c5fd' },
  { name: 'Kestrel & Vane LLP', x0: 98, x1: 110, z0: 0, z1: 12, color: '#a8a29e' },
]
export const DISTRICT_PARKING = [
  { x0: 56.5, x1: 72, z0: 15.5, z1: 21.5 },
  { x0: 67.5, x1: 75, z0: -29, z1: -23 },
]
