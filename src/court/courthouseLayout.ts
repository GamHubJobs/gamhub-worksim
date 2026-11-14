/**
 * Westmark County Court (fictional), where a law career's real hearings are
 * held: lawyers go there from the office, sign in and appear in court. Two
 * rooms: the entrance hall (security arch and bag scanner, the usher's desk,
 * the day's cause list and benches for those waiting) and Court 2, laid out
 * like the law firm's moot courtroom (office/scene/courtroomLayout.ts), at
 * the same coordinates, so its furniture is shared.
 *
 * What is solid, where the rooms are, and what the player can do. Drawn in
 * Courthouse.tsx.
 */
import type { Box } from '../world/character/controller'
import type { Activity } from '../world/interaction/activity'
import { COURTROOM_BOXES } from '../office/scene/courtroomLayout'

/** The building's extent (the entrance hall north of Court 2). */
export const HALL = { x0: 2.0, x1: 12.2, z0: -9.4, z1: -0.9 }
export const COURT = { x0: 5.2, x1: 12.2, z0: -0.9, z1: 9.2 }
export const HEIGHT = 3.6

/** The doors into Court 2, in the wall between it and the hall. */
export const COURT_DOOR = { x: 9.5, half: 0.65 }
/** The way in from the street. */
export const ENTRANCE = { x: 4.7, z: HALL.z0 }
export const ARCH = { x: 4.7, z: -4.0 }
export const SCANNER = { x: 3.1, z: -4.0 }
export const USHER_DESK = { x: 10.6, z: -5.6 }
export const CAUSE_LIST = { x: HALL.x1 - 0.05, z: -3.3 }
export const BENCHES = [
  { x: 7.4, z: -1.6 },
  { x: 7.4, z: -7.9 },
]

/** Where the player comes in, facing into the hall. */
export const COURT_START = { x: ENTRANCE.x, z: HALL.z0 + 3.4, heading: Math.PI }

const box = (x: number, z: number, hx: number, hz: number, top = HEIGHT): Box => ({
  x,
  z,
  hx,
  hz,
  top,
})

/** A wall along x (at z) from x0 to x1, or along z (at x) from z0 to z1. */
const alongX = (z: number, x0: number, x1: number) =>
  box((x0 + x1) / 2, z, (x1 - x0) / 2, 0.12)
const alongZ = (x: number, z0: number, z1: number) =>
  box(x, (z0 + z1) / 2, 0.12, (z1 - z0) / 2)

export const COURTHOUSE_BOXES: Box[] = [
  // The outside walls
  alongX(HALL.z0 - 0.12, HALL.x0, HALL.x1 + 0.12),
  alongZ(HALL.x0 - 0.12, HALL.z0, HALL.z1),
  alongZ(HALL.x1 + 0.12, HALL.z0, COURT.z1),
  alongX(COURT.z1 + 0.12, COURT.x0, COURT.x1 + 0.12),
  alongZ(COURT.x0 - 0.12, COURT.z0, COURT.z1),
  // Between the hall and Court 2, with the court's doors
  alongX(HALL.z1, HALL.x0 - 0.12, COURT_DOOR.x - COURT_DOOR.half),
  alongX(HALL.z1, COURT_DOOR.x + COURT_DOOR.half, HALL.x1 + 0.12),
  // The security arch (its two sides) and the bag scanner
  box(ARCH.x - 0.62, ARCH.z, 0.08, 0.3, 2.2),
  box(ARCH.x + 0.62, ARCH.z, 0.08, 0.3, 2.2),
  box(SCANNER.x, SCANNER.z, 0.85, 0.35, 0.95),
  // The usher's desk, and the benches
  box(USHER_DESK.x, USHER_DESK.z, 0.95, 0.4, 1.05),
  ...BENCHES.map((b) => box(b.x, b.z, 1.1, 0.25, 0.5)),
  // Court 2's furniture: the bench, the witness box, counsel's tables, the public seats
  ...COURTROOM_BOXES,
]

export type CourtRoom = 'hall' | 'court'

export const COURT_ROOM_NAMES: Record<CourtRoom, string> = {
  hall: 'The entrance hall',
  court: 'Court 2',
}

/** Which room a point is in. */
export function courtRoomAt(_x: number, z: number): CourtRoom {
  return z > HALL.z1 ? 'court' : 'hall'
}

/** Things to do at the court, at the things themselves (`court:<what>`). */
export function courthouseActivities(): Activity[] {
  return [
    {
      id: 'court-security',
      action: 'court:security',
      prompt: 'go through security',
      spot: { x: ARCH.x, z: ARCH.z - 0.75, reach: 0.9 },
      anchor: { x: ARCH.x, z: ARCH.z - 0.7, heading: Math.PI },
      stages: [
        { clip: 'reach', seconds: 1.2, label: 'Putting your bag through the scanner' },
        {
          clip: 'stand',
          seconds: 0.9,
          label: 'Walking through the arch',
          at: { x: ARCH.x, z: ARCH.z + 0.7, heading: Math.PI },
        },
      ],
    },
    {
      id: 'court-usher',
      action: 'court:usher',
      prompt: 'sign in with the usher',
      spot: { x: USHER_DESK.x, z: USHER_DESK.z + 0.85, reach: 1.0 },
      anchor: { x: USHER_DESK.x, z: USHER_DESK.z + 0.75, heading: 0 },
      stages: [
        {
          clip: 'write',
          seconds: 1.6,
          label: 'Signing in for your hearing',
          hold: { right: 'pen' },
          posture: 'standing',
        },
      ],
    },
    {
      id: 'court-list',
      action: 'court:list',
      prompt: 'read the day’s cause list',
      spot: { x: CAUSE_LIST.x - 0.8, z: CAUSE_LIST.z, reach: 1.0 },
      anchor: { x: CAUSE_LIST.x - 0.7, z: CAUSE_LIST.z, heading: -Math.PI / 2 },
      stages: [{ clip: 'stand', seconds: 1.2, label: 'Finding your case on the list' }],
    },
    {
      id: 'court-leave',
      action: 'court:leave',
      prompt: 'leave the court and go back to the office',
      spot: { x: ENTRANCE.x, z: ENTRANCE.z + 0.55, reach: 0.9 },
      anchor: { x: ENTRANCE.x, z: ENTRANCE.z + 0.5, heading: 0 },
      stages: [{ clip: 'stand', seconds: 0.8, label: 'Heading back to the office' }],
    },
  ]
}
