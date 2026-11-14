import { describe, expect, it } from 'vitest'
import { RADIUS } from '../../world/character/controller'
import { buildGrid, findPath, standing } from '../../world/physics/nav'
import { bayFor, floorWith, type Bay } from './bays'

/** In front of the player's own desk: where they usually start. */
const DESK = { x: 2.4, z: 2.4 }

describe.each<Bay['kind']>(['ward', 'workshop', 'courtroom'])('the %s corner', (kind) => {
  const bay = bayFor(kind)
  const boxes = floorWith(bay)
  const grid = buildGrid(boxes, RADIUS)

  it('opens a career tool and has things to do', () => {
    expect(['clinical', 'engineering', 'legal']).toContain(bay.tool)
    expect(bay.activities().length).toBeGreaterThan(0)
    expect(bay.activities().map((a) => a.id)).toContain(bay.goTo)
  })

  it.each(
    bayFor(kind)
      .activities()
      .map((a) => [a.id, a] as const),
  )('%s: the player can stand there and walk there from the desk', (_, activity) => {
    const at = { x: activity.anchor!.x, z: activity.anchor!.z }
    expect(standing(grid, boxes, at)).toBe(true)
    expect(findPath(grid, DESK, at)).not.toBeNull()
  })

  it('replaces the IT corner rather than adding to it', () => {
    expect(boxes.length).toBe(floorWith(null).length - 2 + bay.boxes.length)
  })
})
