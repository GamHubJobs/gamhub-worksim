/**
 * The neighbourhood as one set of data, shared by the 3D street and the maps
 * (the world map and the mini-map): the road and its pavements, the crossings,
 * the buildings along both sides, and the places (with their doors). Anything
 * drawn on a map is where it is in 3D, because it is the same data.
 * Coordinates: x along the street (west to east), z across it (north is −z).
 */
import { PLACES, type PlaceId } from '../content/city'

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
  { x: 16, side: -1, w: 14, h: 16, color: '#bfb3a3' },
  { x: 64, side: -1, w: 10, h: 10, color: '#d4cbbd' },
  { x: -56, side: 1, w: 14, h: 11, color: '#cbbfae' },
  { x: -40, side: 1, w: 16, h: 18, color: '#b7795a' },
  { x: -23, side: 1, w: 14, h: 13, color: '#d9cdbd' },
  { x: 0, side: 1, w: 16, h: 9, color: '#cbd5e1' },
  { x: 16, side: 1, w: 14, h: 12, color: '#c2b5a3' },
  { x: 32, side: 1, w: 14, h: 15, color: '#d6c7b1' },
  { x: 48, side: 1, w: 14, h: 10, color: '#bdb0a0' },
]

/** How deep the buildings are, back from the pavement (as drawn in 3D). */
export const BUILDING_DEPTH = 14
/** How far from the middle of the road the buildings' fronts are. */
export const BUILDING_FRONT = 10

/** The park's lawns, behind its gate (north side, as drawn in 3D). */
export const PARK = { minX: 25, maxX: 59, minZ: -44, maxZ: -10 }

export const ICONS: Record<PlaceId, string> = {
  home: '🏠',
  office: '🏢',
  cafe: '☕',
  shop: '🛒',
  gym: '🏋️',
  park: '🌳',
  garage: '🚲',
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
}

/** A place's door on the street. */
export function doorOf(id: PlaceId): { x: number; z: number } {
  const p = PLACES.find((q) => q.id === id)!
  return { x: p.door[0], z: p.door[1] }
}
