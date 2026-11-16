import { describe, expect, it } from 'vitest'
import { arriveAt, ENTRANCE, leaveActivity } from './entrance'
import { CAFE, GARAGE, SHOP } from './layouts'

describe('the front door of a place', () => {
  it('the player comes in from the doorway, facing into the room', () => {
    for (const layout of [CAFE, SHOP, GARAGE]) {
      const from = arriveAt(layout.size.depth)
      expect(from.x).toBe(ENTRANCE.x)
      // In the doorway (just outside the wall), facing in (-z).
      expect(from.z).toBeGreaterThan(layout.size.depth / 2)
      expect(from.heading).toBe(0)
      // And walks on in, to where the player starts, a short way.
      expect(Math.hypot(layout.start.x - from.x, layout.start.z - from.z)).toBeLessThan(4)
    }
  })

  it('going out: to the door, it opens, then walked through it to the street', () => {
    const leave = leaveActivity(9)
    expect(leave.action).toBe('leave')
    expect(leave.stages[0].clip).toBe('push-door')
    const out = leave.stages[1]
    expect(out.through).toBe(true)
    // Past the wall, through the doorway (not round it).
    expect(out.at!.z).toBeGreaterThan(4.5)
    expect(out.at!.x).toBe(ENTRANCE.x)
  })
})
