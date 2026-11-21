import { Mesh, Object3D } from 'three'
import { describe, expect, it } from 'vitest'
import {
  addFloor,
  addItem,
  addOpening,
  addRectRoom,
  WALL_PRESETS,
} from '../../../studio/ops'
import { emptyProject } from '../../../studio/model'
import { OPENING_PRESETS } from '../../../studio/catalog'
import { sampleApartment, sampleHouse } from '../../../studio/samples'
import { buildBuilding, type BuildOptions } from './building'

const options = (current: string, extra: Partial<BuildOptions> = {}): BuildOptions => ({
  floors: 'all',
  current,
  walls: 'full',
  ceilings: false,
  roof: true,
  furniture: true,
  lighting: 'day',
  shadows: false,
  ...extra,
})

function refsOf(root: Object3D) {
  const counts: Record<string, number> = {}
  root.traverse((o) => {
    if (o instanceof Mesh && o.userData.ref)
      counts[o.userData.ref.kind] = (counts[o.userData.ref.kind] ?? 0) + 1
  })
  return counts
}

/** World-space box of everything belonging to one part. */
function worldY(root: Object3D, kind: string) {
  root.updateMatrixWorld(true)
  let min = Infinity
  let max = -Infinity
  root.traverse((o) => {
    if (!(o instanceof Mesh) || o.userData.ref?.kind !== kind) return
    o.geometry.computeBoundingBox()
    const b = o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld)
    min = Math.min(min, b.min.y)
    max = Math.max(max, b.max.y)
  })
  return { min, max }
}

describe('the 3D building, from the model', () => {
  it('builds walls, rooms (slab and floor), openings and furniture', () => {
    const s = sampleApartment()
    const built = buildBuilding(s, options('f0'))
    const c = refsOf(built.group)
    expect(c.walls).toBeGreaterThanOrEqual(s.walls.length)
    expect(c.rooms).toBe(s.rooms.length)
    expect(c.openings).toBeGreaterThan(s.openings.length)
    expect(c.items).toBeGreaterThan(s.items.length)
    // The floor finish sits on the slab at floor level; furniture stands on it.
    expect(worldY(built.group, 'rooms').max).toBeCloseTo(0, 3)
    expect(worldY(built.group, 'items').min).toBeGreaterThanOrEqual(-0.001)
    built.dispose()
  })

  it('reflects edits: a moved sofa, a new door, a changed finish', () => {
    let s = addRectRoom(
      emptyProject(),
      'f0',
      { x: 0, y: 0 },
      { x: 4000, y: 3000 },
      { walls: WALL_PRESETS.exterior },
    ).state
    const before = refsOf(buildBuilding(s, options('f0')).group)
    s = addOpening(s, s.walls[0].id, 2000, OPENING_PRESETS[0]).state
    s = addItem(s, 'f0', 'sofa-2', 2000, 1500).state
    const after = refsOf(buildBuilding(s, options('f0')).group)
    expect(after.walls).toBeGreaterThan(before.walls)
    expect(after.openings).toBeGreaterThan(0)
    expect(after.items).toBeGreaterThan(0)
  })

  it('stacks floors at their elevations, and hides floors above the current one when asked', () => {
    const s = sampleHouse()
    const upper = s.floors[1].id
    const all = buildBuilding(s, options('f0'))
    expect(worldY(all.group, 'walls').max).toBeGreaterThan(5)
    const ground = buildBuilding(
      s,
      options('f0', { floors: 'up-to-current', roof: false }),
    )
    expect(worldY(ground.group, 'walls').max).toBeLessThan(3.1)
    expect(refsOf(all.group).stairs).toBeGreaterThan(10)
    expect(refsOf(all.group).roofs).toBe(1)
    void upper
  })

  it('cuts walls down for the low view', () => {
    const s = addFloor(sampleApartment()).state
    const low = buildBuilding(s, options('f0', { walls: 'low', floors: 'up-to-current' }))
    expect(worldY(low.group, 'walls').max).toBeLessThanOrEqual(1.2001)
  })
})
