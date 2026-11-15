import { describe, expect, it } from 'vitest'
import { clearance } from '../../../world/character/camera'
import { buildGrid, standing } from '../../../world/physics/nav'
import { GYM_BOXES, GYM_START } from './gymLayout'
import { CAFE, GARAGE, SHOP } from './layouts'

/**
 * On arrival inside a place, the camera starts behind the character (as
 * PlayerRig does: pitch 0.32, 3.6 m back). It needs room behind them, or it
 * sits against the entrance wall and the character fills the view (found in
 * the city audit: the café, the shop, the gym and Cog & Kerb).
 */
const PLACES = {
  cafe: { start: CAFE.start, boxes: CAFE.boxes },
  shop: { start: SHOP.start, boxes: SHOP.boxes },
  garage: { start: GARAGE.start, boxes: GARAGE.boxes },
  gym: { start: GYM_START, boxes: GYM_BOXES },
}

describe.each(Object.entries(PLACES))('arriving in the %s', (_, place) => {
  it('stands somewhere clear, with room behind for the camera', () => {
    const { start, boxes } = place
    expect(standing(buildGrid(boxes, 0.32), boxes, start)).toBe(true)
    const room = clearance(
      [start.x, 1.45, start.z],
      { yaw: start.heading, pitch: 0.32, distance: 3.6 },
      boxes,
    )
    expect(room).toBeGreaterThanOrEqual(2.6)
  })
})
