import { describe, expect, it } from 'vitest'
import { buildGrid, findPath, standing } from '../../world/physics/nav'
import { BAY_KINDS, bayFor, floorWith, roomAt } from './bays'
import { themeOf } from './themeLayout'
import { WING_DOOR } from './wingShell'

const DESK = { x: 2.4, z: 2.4 }
const DOORWAY = { x: 12.1, z: (WING_DOOR.z0 + WING_DOOR.z1) / 2 }

/** The rooms each wing should have, by a point in each. */
const ROOMS: Record<string, Array<[number, number, string]>> = {
  ward: [
    [13.4, 0, 'Ward corridor'],
    [18, 3.2, 'Bay B'],
    [18, -6.1, 'Side room 1 (isolation)'],
  ],
  workshop: [
    [13.3, 0, 'The fabrication shop'],
    [20, -6, 'The welding bay'],
    [15.6, 5.2, 'The inspection bench'],
  ],
  courtroom: [
    [13.4, 0, 'The corridor'],
    [17.3, -3, 'The records room'],
    [18.6, 2.5, 'The conference room'],
  ],
}

describe.each(BAY_KINDS)('the %s workplace and its wing', (kind) => {
  const bay = bayFor(kind)
  const boxes = floorWith(bay, themeOf(kind))
  const grid = buildGrid(boxes, 0.32)

  it(
    kind in ROOMS ? 'has its own wing, through a doorway' : 'keeps the wall whole',
    () => {
      expect(!!bay.wing).toBe(kind in ROOMS)
      expect(standing(grid, boxes, DOORWAY)).toBe(kind in ROOMS)
    },
  )

  it.runIf(kind in ROOMS)('names the wing’s rooms where they are', () => {
    for (const [x, z, name] of ROOMS[kind]) {
      expect(roomAt(x, z, bay, themeOf(kind)), name).toBe(name)
      expect(findPath(grid, DESK, { x, z }), name).not.toBeNull()
    }
  })

  it.runIf(kind in ROOMS)(
    'has things to do in the wing, each reachable from the desk',
    () => {
      const own = bay.wing!.activities()
      expect(own.length).toBeGreaterThanOrEqual(2)
      for (const a of own) {
        expect(a.anchor.x, a.id).toBeGreaterThan(12.15)
        expect(standing(grid, boxes, a.anchor), a.id).toBe(true)
        expect(findPath(grid, DESK, a.anchor), a.id).not.toBeNull()
      }
    },
  )
})
