/**
 * The rest of Ward 4 (the healthcare career): a wing beyond Bay A, through
 * a doorway in the bay's outer wall. A ward corridor runs its length; off it
 * are Bay B (four beds), side room 1 (an isolation room, with gloves and
 * aprons on a trolley outside its door) and side room 2. So the hospital's
 * floor is no longer the office's: it is a ward, with bays and side rooms
 * off a corridor. What is solid, which room is where, and what the player
 * can do there. Drawn in wardWing.tsx.
 */
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'
import {
  alongX,
  alongZ,
  inWing,
  OUTER_WALLS,
  SPLIT_RIGHT_WALL,
  wall,
  WING,
  type WingPlan,
} from './wingShell'

export { WING, WING_DOOR } from './wingShell'

/** The wall between the corridor and the rooms. */
export const CORRIDOR_WALL = 14.6
/** Between the rooms: side room 1 | side room 2 | Bay B. */
export const ROOM_SPLITS = { side1: -4.2, side2: -0.4 }
/** Doors off the corridor. */
export const DOORS = {
  side1: { z0: -6.8, z1: -5.6 },
  side2: { z0: -3.0, z1: -1.8 },
  bayB: { z0: 0.2, z1: 2.2 },
}

/** The beds: headboards against the wing's far wall. */
export const WING_BED_X = 20.85
export const BAY_B_BEDS: Array<{
  id: string
  z: number
  patient: string | null
  blanket: string
}> = [
  { id: '4B-1', z: 1.0, patient: 'J. Mensah', blanket: '#c7d2fe' },
  { id: '4B-2', z: 3.2, patient: 'L. Novak', blanket: '#bbf7d0' },
  { id: '4B-3', z: 5.4, patient: null, blanket: '#e2e8f0' },
  { id: '4B-4', z: 7.6, patient: 'R. Shah', blanket: '#fed7aa' },
]
export const SIDE_BEDS: typeof BAY_B_BEDS = [
  { id: 'SR1', z: -6.1, patient: 'E. Lindqvist', blanket: '#fef08a' },
  { id: 'SR2', z: -2.3, patient: 'T. Adebayo', blanket: '#a5f3fc' },
]
/** Gloves and aprons, outside the isolation room's door. */
export const PPE_TROLLEY = { x: 13.35, z: -7.25 }
export const LINEN_TROLLEY = { x: 13.3, z: 5.4 }
/** The nurse looking after Bay B. */
export const BAY_B_NURSE = { x: 18.4, z: 5.4 }

/** The wing's walls (drawn as they are). */
export const WING_WALLS: Solid[] = [
  ...OUTER_WALLS,
  // The corridor wall, with the doors off it
  alongZ(CORRIDOR_WALL, WING.z0, DOORS.side1.z0),
  alongZ(CORRIDOR_WALL, DOORS.side1.z1, DOORS.side2.z0),
  alongZ(CORRIDOR_WALL, DOORS.side2.z1, DOORS.bayB.z0),
  alongZ(CORRIDOR_WALL, DOORS.bayB.z1, WING.z1),
  // Between the rooms
  alongX(ROOM_SPLITS.side1, CORRIDOR_WALL, WING.x1),
  alongX(ROOM_SPLITS.side2, CORRIDOR_WALL, WING.x1),
]

export const WING_BOXES: Solid[] = [
  ...SPLIT_RIGHT_WALL,
  ...WING_WALLS,
  ...[...BAY_B_BEDS, ...SIDE_BEDS].map((b) => wall(WING_BED_X, b.z, 1.05, 0.5, 0.75)),
  wall(PPE_TROLLEY.x, PPE_TROLLEY.z, 0.35, 0.3, 1.1),
  wall(LINEN_TROLLEY.x, LINEN_TROLLEY.z, 0.3, 0.5, 1.2),
]

/** Which room of the wing a point is in, or null when not in the wing. */
export function wingRoomAt(x: number, z: number): string | null {
  if (!inWing(x)) return null
  if (x < CORRIDOR_WALL) return 'Ward corridor'
  if (z < ROOM_SPLITS.side1) return 'Side room 1 (isolation)'
  if (z < ROOM_SPLITS.side2) return 'Side room 2'
  return 'Bay B'
}

/** In the wing: Bay B's bedsides, and the isolation room (gloves and apron first). */
export function wingActivities(): Activity[] {
  const bedside = (z: number) => ({ x: WING_BED_X - 1.75, z, heading: -Math.PI / 2 })
  return [
    {
      id: 'bay-b',
      action: 'bedside',
      prompt: 'see your patients in Bay B (Ward Systems)',
      spot: { ...bedside(3.2), reach: 1.3 },
      anchor: bedside(3.2),
      stages: [
        { clip: 'reach', seconds: 1.0, label: 'Cleaning your hands with the gel' },
        { clip: 'talk', seconds: 1.2, label: 'Introducing yourself to Mr Novak' },
      ],
    },
    {
      id: 'side-room',
      action: 'bedside',
      prompt: 'see the patient in side room 1: isolation (Ward Systems)',
      // Start at the trolley outside the door: gloves and an apron first.
      spot: { x: PPE_TROLLEY.x, z: PPE_TROLLEY.z + 0.75, reach: 1.1 },
      anchor: { x: PPE_TROLLEY.x, z: PPE_TROLLEY.z + 0.68, heading: 0 },
      stages: [
        {
          clip: 'reach',
          seconds: 1.4,
          label: 'Putting on gloves and an apron (isolation)',
        },
        {
          clip: 'talk',
          seconds: 1.2,
          label: 'Checking the wristband at the bedside',
          at: bedside(SIDE_BEDS[0].z),
        },
      ],
    },
  ]
}

/** The ward wing, as the ward's corner adds it (bays.ts). */
export const WARD_WING: WingPlan = {
  boxes: WING_BOXES,
  activities: wingActivities,
  roomAt: wingRoomAt,
}
