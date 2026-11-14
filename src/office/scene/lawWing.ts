/**
 * Kestrel & Vane's records room and conference suite (the law career):
 * beyond the moot courtroom, through a doorway in its outer wall. A corridor
 * hung with framed prints; off it the records room (rolling shelving, deed
 * boxes, the scanning station and the records clerk) and the conference room
 * (a long table for client meetings, with a screen at the end). What is
 * solid, which room is where, and what the player can do there. Drawn in
 * lawWing.view.tsx.
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

export const LAW_CORRIDOR_WALL = 14.6
/** Records room (north) | conference room (south). */
export const LAW_SPLIT = -0.6
export const LAW_DOORS = {
  records: { z0: -3.4, z1: -2.2 },
  conference: { z0: 0.6, z1: 2.0 },
}
/** Rolling shelves, in rows across the records room. */
export const SHELVES = [16.4, 18.2, 20.0].map((x) => ({ x, z: -5.6 }))
export const SCANNER = { x: 21.2, z: -1.6 }
export const CLERK = { x: 20.6, z: -1.6 }
export const CONF_TABLE = { x: 18.6, z: 4.6 }
export const CONF_SCREEN = { x: WING.x1 - 0.05, z: 4.6 }

/** The corridor and the rooms' walls (drawn as they are). */
export const LAW_WALLS: Solid[] = [
  ...OUTER_WALLS,
  alongZ(LAW_CORRIDOR_WALL, WING.z0, LAW_DOORS.records.z0),
  alongZ(LAW_CORRIDOR_WALL, LAW_DOORS.records.z1, LAW_DOORS.conference.z0),
  alongZ(LAW_CORRIDOR_WALL, LAW_DOORS.conference.z1, WING.z1),
  alongX(LAW_SPLIT, LAW_CORRIDOR_WALL, WING.x1),
]

export const LAW_BOXES: Solid[] = [
  ...SPLIT_RIGHT_WALL,
  ...LAW_WALLS,
  ...SHELVES.map((s) => wall(s.x, s.z, 0.45, 2.0, 2.2)),
  wall(SCANNER.x, SCANNER.z, 0.45, 0.4, 1.0),
  wall(CONF_TABLE.x, CONF_TABLE.z, 1.0, 2.2, 0.76),
]

export function lawRoomAt(x: number, z: number): string | null {
  if (!inWing(x)) return null
  if (x < LAW_CORRIDOR_WALL) return 'The corridor'
  return z < LAW_SPLIT ? 'The records room' : 'The conference room'
}

/** In the records room and the conference room: Matter Desk there. */
export function lawActivities(): Activity[] {
  return [
    {
      id: 'records-room',
      action: 'bay',
      prompt: 'pull the deeds and files in the records room (Matter Desk)',
      spot: { x: 17.3, z: -3.0, reach: 1.1 },
      anchor: { x: 17.3, z: -2.95, heading: 0 },
      stages: [
        { clip: 'reach', seconds: 1.2, label: 'Winding the shelves apart' },
        { clip: 'reach', seconds: 1.0, label: 'Taking down the deed box' },
      ],
    },
    {
      id: 'conference-room',
      action: 'bay',
      prompt: 'set up the conference room for a client meeting (Matter Desk)',
      // At the head of the table, by the door.
      spot: { x: CONF_TABLE.x, z: CONF_TABLE.z - 2.9, reach: 1.1 },
      anchor: { x: CONF_TABLE.x, z: CONF_TABLE.z - 2.85, heading: Math.PI },
      stages: [
        { clip: 'reach', seconds: 1.2, label: 'Laying out the bundles and a notepad' },
        { clip: 'stand', seconds: 0.8, label: 'Checking the screen works' },
      ],
    },
  ]
}

export const LAW_WING: WingPlan = {
  boxes: LAW_BOXES,
  activities: lawActivities,
  roomAt: lawRoomAt,
}
