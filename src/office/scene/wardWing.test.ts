import { describe, expect, it } from 'vitest'
import { buildGrid, findPath, standing } from '../../world/physics/nav'
import { bayFor, floorWith, roomAt } from './bays'
import { WARD_BEDS } from './wardLayout'
import {
  BAY_B_BEDS,
  SIDE_BEDS,
  WING_BED_X,
  WING_DOOR,
  wingActivities,
  wingRoomAt,
} from './wardWing'

const ward = bayFor('ward')
const boxes = floorWith(ward, 'hospital')
const grid = buildGrid(boxes, 0.32)
const DESK = { x: 2.4, z: 2.4 }

describe('the ward wing: a corridor with a bay and side rooms off it', () => {
  it('is reached from Bay A, through the doorway in its outer wall', () => {
    const doorway = { x: 12.1, z: (WING_DOOR.z0 + WING_DOOR.z1) / 2 }
    expect(standing(grid, boxes, doorway)).toBe(true)
    // Only on the ward: elsewhere the wall is whole.
    const office = floorWith(null)
    expect(standing(buildGrid(office, 0.32), office, doorway)).toBe(false)
  })

  it('has its rooms where they are named', () => {
    expect(wingRoomAt(13.4, 0)).toBe('Ward corridor')
    expect(wingRoomAt(18, BAY_B_BEDS[1].z)).toBe('Bay B')
    expect(wingRoomAt(18, SIDE_BEDS[0].z)).toBe('Side room 1 (isolation)')
    expect(wingRoomAt(18, SIDE_BEDS[1].z)).toBe('Side room 2')
    expect(wingRoomAt(8, 3)).toBeNull()
    expect(roomAt(18, 3.2, ward, 'hospital')).toBe('Bay B')
    expect(roomAt(9, 3, ward, 'hospital')).toBe('Bay A')
  })

  it('lets the player walk from their desk to every bedside in the wing', () => {
    for (const b of [...BAY_B_BEDS, ...SIDE_BEDS]) {
      const at = { x: WING_BED_X - 1.75, z: b.z }
      expect(standing(grid, boxes, at), b.id).toBe(true)
      expect(findPath(grid, DESK, at), b.id).not.toBeNull()
    }
  })

  it('puts gloves and an apron on before the isolation room', () => {
    const iso = wingActivities().find((a) => a.id === 'side-room')!
    expect(iso.stages[0].label).toMatch(/gloves and an apron/)
    const bed = iso.stages[1].at!
    expect(wingRoomAt(bed.x, bed.z)).toBe('Side room 1 (isolation)')
    expect(findPath(grid, iso.anchor!, bed)).not.toBeNull()
  })

  it('keeps Bay A as it was', () => {
    for (const b of WARD_BEDS) expect(roomAt(9, b.z, ward, 'hospital')).toBe('Bay A')
  })
})
