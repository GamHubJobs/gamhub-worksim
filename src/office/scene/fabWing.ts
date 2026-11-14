/**
 * Northbank Engineering's fabrication shop (the engineering career): beyond
 * the workshop, through a doorway in its outer wall. One long shop floor with
 * a marked walkway, steel stock on racks, a lathe with its fabricator, a
 * welding bay behind amber screens (hot work only under a permit), an
 * inspection bench with a granite surface plate, and the roller shutter to
 * the yard. What is solid, which area is where, and what the player can do.
 * Drawn in fabWing.view.tsx.
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

/** The welding bay: screens round the far corner, open towards the walkway. */
export const WELD_BAY = { x0: 17.2, z1: -3.4, opening: { x0: 17.2, x1: 18.6 } }
export const LATHE = { x: 19.6, z: 1.2 }
export const STOCK_RACK = { x: 21.2, z: 5.6 }
export const INSPECTION = { x: 15.6, z: 6.4 }
export const PERMIT_BOARD = { x: 16.2, z: -3.5 }
export const FORKLIFT = { x: 15.7, z: -6.4 }
export const FABRICATOR = { x: 19.6, z: 2.25 }
/** The walkway's edges (yellow lines), for the drawing. */
export const WALKWAY = { x0: 12.4, x1: 14.2 }

/** The welding bay's screens (the side, and the front with its opening). */
export const WELD_SCREENS: Solid[] = [
  alongZ(WELD_BAY.x0, WING.z0, WELD_BAY.z1, 2.0),
  alongX(WELD_BAY.z1, WELD_BAY.opening.x1, WING.x1, 2.0),
]

export const FAB_BOXES: Solid[] = [
  ...SPLIT_RIGHT_WALL,
  ...OUTER_WALLS,
  ...WELD_SCREENS,
  wall(LATHE.x, LATHE.z, 1.2, 0.4, 1.2),
  wall(STOCK_RACK.x, STOCK_RACK.z, 0.5, 2.6, 2.2),
  wall(INSPECTION.x, INSPECTION.z, 0.7, 0.5, 0.9),
  wall(FORKLIFT.x, FORKLIFT.z, 0.6, 1.1, 2.1),
  // The permit board, on its stand by the bay
  wall(PERMIT_BOARD.x, PERMIT_BOARD.z - 0.05, 0.4, 0.06, 1.8),
  // The welding bench, inside the bay
  wall(20.2, -6.2, 1.0, 0.45, 0.9),
]

export function fabRoomAt(x: number, z: number): string | null {
  if (!inWing(x)) return null
  if (x > WELD_BAY.x0 && z < WELD_BAY.z1) return 'The welding bay'
  if (x > 14.6 && z > 4.6 && x < 17) return 'The inspection bench'
  return 'The fabrication shop'
}

/** At the lathe, the inspection bench and the welding bay's permit board: Works Desk there. */
export function fabActivities(): Activity[] {
  return [
    {
      id: 'inspection-bench',
      action: 'bay',
      prompt: 'measure a part at the inspection bench (Works Desk)',
      spot: { x: INSPECTION.x - 1.15, z: INSPECTION.z, reach: 1.1 },
      anchor: { x: INSPECTION.x - 1.1, z: INSPECTION.z, heading: -Math.PI / 2 },
      stages: [
        { clip: 'reach', seconds: 1.2, label: 'Setting the part on the surface plate' },
        { clip: 'write', seconds: 1.2, label: 'Reading the gauge', posture: 'standing' },
      ],
    },
    {
      id: 'hot-work-permit',
      action: 'bay',
      prompt: 'check the hot-work permit at the welding bay (Works Desk)',
      spot: { x: PERMIT_BOARD.x, z: PERMIT_BOARD.z + 0.8, reach: 1.0 },
      anchor: { x: PERMIT_BOARD.x, z: PERMIT_BOARD.z + 0.7, heading: 0 },
      stages: [
        { clip: 'stand', seconds: 1.0, label: 'Reading the permit: valid until 4 pm' },
        { clip: 'reach', seconds: 0.8, label: 'Checking the fire watch is signed' },
      ],
    },
    {
      id: 'lathe',
      action: 'bay',
      prompt: 'talk the job through at the lathe (Works Desk)',
      spot: { x: LATHE.x - 1.6, z: LATHE.z + 0.9, reach: 1.1 },
      anchor: { x: LATHE.x - 1.5, z: LATHE.z + 0.9, heading: -Math.PI / 2 },
      stages: [
        {
          clip: 'talk',
          seconds: 1.4,
          label: 'Going over the drawing with the fabricator',
        },
      ],
    },
  ]
}

export const FAB_WING: WingPlan = {
  boxes: FAB_BOXES,
  activities: fabActivities,
  roomAt: fabRoomAt,
}
