/**
 * A workplace's own wing, beyond the office floor's right-hand wall: the
 * hospital's ward wing (wardWing.ts), the engineering firm's fabrication
 * shop (fabWing.ts) and the law firm's records room and conference suite
 * (lawWing.ts). Each goes through a doorway from the workplace's corner, so
 * the floor is that workplace's own, not the office's. What every wing
 * shares: where it is, the doorway, and its outer walls.
 */
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'

/** The wing's extent, east of the office floor's right-hand wall (x 12.1). */
export const WING = { x0: 12.2, x1: 22, z0: -8, z1: 9.2 }
/** The doorway from the corner into the wing, in the floor's right-hand wall. */
export const WING_DOOR = { z0: -0.8, z1: 0.6 }

export const wall = (x: number, z: number, hx: number, hz: number, top = 2.9): Solid => ({
  x,
  z,
  hx,
  hz,
  top,
})
/** A wall along z at x, from z0 to z1. */
export const alongZ = (x: number, z0: number, z1: number, top = 2.6) =>
  wall(x, (z0 + z1) / 2, 0.08, (z1 - z0) / 2, top)
/** A wall along x at z, from x0 to x1. */
export const alongX = (z: number, x0: number, x1: number, top = 2.6) =>
  wall((x0 + x1) / 2, z, (x1 - x0) / 2, 0.08, top)

/** The floor's right-hand wall, with the doorway into the wing. */
export const SPLIT_RIGHT_WALL: Solid[] = [
  wall(12.1, (-8 + WING_DOOR.z0) / 2, 0.15, (WING_DOOR.z0 + 8) / 2),
  wall(12.1, (WING_DOOR.z1 + 9) / 2, 0.15, (9 - WING_DOOR.z1) / 2),
]

/** The wing's outside: the far end, the far side, a low edge at the front (for the camera). */
export const OUTER_WALLS: Solid[] = [
  wall((WING.x0 + WING.x1) / 2, WING.z0 - 0.1, (WING.x1 - WING.x0) / 2 + 0.1, 0.15),
  wall(WING.x1 + 0.1, (WING.z0 + WING.z1) / 2, 0.15, (WING.z1 - WING.z0) / 2),
  wall((WING.x0 + WING.x1) / 2, WING.z1, (WING.x1 - WING.x0) / 2 + 0.1, 0.15, 0.3),
]

/** In the wing at all (beyond the doorway). */
export const inWing = (x: number) => x > 12.15

/** What a wing adds to its corner: solids, things to do, and its rooms' names. */
export interface WingPlan {
  /** Everything solid, including the split right-hand wall and the wing's walls. */
  boxes: Solid[]
  activities: () => Activity[]
  /** The room at a point in the wing, or null outside it. */
  roomAt: (x: number, z: number) => string | null
}
