import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'
import { describe, expect, it } from 'vitest'
import {
  blocked,
  body,
  collide,
  NO_INPUT,
  overlap,
  RADIUS,
  step,
  type Box,
} from '../character/controller'
import { rayBox } from '../character/camera'
import { buildGrid, clear, findPath, nearestFree } from './nav'
import { scanSolids, tall } from './solids'

const box = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  extra: Partial<Box> = {},
): Box => ({
  x,
  z,
  hx,
  hz,
  top: 1,
  ...extra,
})

describe('solid shapes', () => {
  it('a turned box blocks along its own length, not its square', () => {
    // A bench 2 m long turned 45°.
    const bench = box(0, 0, 1, 0.2, { yaw: Math.PI / 4 })
    // Along its length (towards x = 0.7, z = −0.7): inside.
    expect(overlap(0.6, -0.6, 0.3, bench)).not.toBeNull()
    // Off to the side where an unturned box would be: clear.
    expect(overlap(0.6, 0.6, 0.1, bench)).toBeNull()
  })

  it('a round thing pushes out evenly', () => {
    const post = box(0, 0, 0.5, 0.5, { round: true })
    const [x, z] = collide(0.3, 0.3, 0.3, [post])
    expect(Math.hypot(x, z)).toBeCloseTo(0.8, 3)
  })

  it('running cannot pass through a thin wall, however slow the frame', () => {
    const wall = box(1, 0, 0.03, 5)
    let b = body(0, 0, Math.PI / 2)
    // Running east for a whole second in one step.
    for (let i = 0; i < 5; i++)
      b = step(b, { ...NO_INPUT, forward: 1, run: true }, Math.PI / 2 + Math.PI, 0.2, [
        wall,
      ])
    expect(b.x).toBeLessThan(1 - 0.03 - RADIUS + 0.01)
  })

  it('a character inside something is pushed out to the nearest side', () => {
    const sofa = box(0, 0, 1, 0.45)
    const [x, z] = collide(0.2, 0.3, RADIUS, [sofa])
    expect(blocked(x, z, RADIUS, [sofa])).toBe(false)
    expect(z).toBeCloseTo(0.45 + RADIUS, 3)
  })

  it('the camera ray meets a turned box where it really is', () => {
    const b = box(0, 0, 1, 0.1, { yaw: Math.PI / 2, top: 2 })
    // Turned 90°, the long side runs along z: a ray along x at z = 0.8 hits it.
    expect(rayBox([-2, 1, 0.8], [2, 1, 0.8], b)).toBeLessThan(1)
    // And a ray along z at x = 0.8 misses it.
    expect(rayBox([0.8, 1, -2], [0.8, 1, 2], b)).toBe(1)
  })
})

describe('reading what is solid from the scene', () => {
  const mat = new MeshBasicMaterial()
  function room() {
    const root = new Group()
    // A sofa: 2 m by 0.9 m, 0.8 m high, turned to face the room.
    const sofa = new Mesh(new BoxGeometry(2, 0.8, 0.9), mat)
    sofa.position.set(3, 0.4, 1)
    sofa.rotation.y = Math.PI / 2
    // A round table.
    const table = new Mesh(new CylinderGeometry(0.5, 0.5, 0.75, 16), mat)
    table.position.set(-2, 0.375, 0)
    // A rug, a lamp overhead, and someone standing.
    const rug = new Mesh(new PlaneGeometry(3, 2), mat)
    rug.rotation.x = -Math.PI / 2
    const lamp = new Mesh(new BoxGeometry(0.3, 0.3, 0.3), mat)
    lamp.position.set(0, 2.2, 0)
    const person = new Group()
    person.userData.person = true
    person.position.set(0, 0, 3)
    person.add(new Mesh(new BoxGeometry(0.4, 1.7, 0.3), mat))
    // Moving traffic, left out.
    const traffic = new Group()
    traffic.userData.passable = true
    traffic.add(new Mesh(new BoxGeometry(4, 1.4, 2), mat))
    root.add(sofa, table, rug, lamp, person, traffic)
    return root
  }

  it('finds the sofa (turned), the round table and the person, not the rug or the lamp', () => {
    const solids = scanSolids(room())
    expect(solids).toHaveLength(3)
    const sofa = solids.find((b) => !b.round)!
    expect(sofa.x).toBeCloseTo(3)
    expect(sofa.z).toBeCloseTo(1)
    expect(sofa.top).toBeCloseTo(0.8)
    // Turned 90°: it now runs along z.
    expect(blocked(3, 1.8, 0.1, [sofa])).toBe(true)
    expect(blocked(3.8, 1, 0.1, [sofa])).toBe(false)
    const round = solids.filter((b) => b.round)
    expect(round.map((b) => b.hx).sort()).toEqual([0.24, 0.5])
  })

  it('the camera keeps clear only of tall things', () => {
    expect(tall(scanSolids(room()))).toHaveLength(1)
  })

  it('the player cannot walk into the sofa from any side', () => {
    const solids = scanSolids(room())
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      // Start 2 m away on each side, walking straight at it for 3 seconds.
      let b = body(3 + Math.sin(yaw) * 2, 1 + Math.cos(yaw) * 2)
      for (let i = 0; i < 90; i++)
        b = step(b, { ...NO_INPUT, forward: 1, run: true }, yaw, 1 / 30, solids)
      expect(blocked(b.x, b.z, RADIUS, solids)).toBe(false)
    }
  })
})

describe('finding the way', () => {
  // A room 10 m square with a wall across the middle, open at one end.
  const walls = [
    box(0, -5, 5, 0.1),
    box(0, 5, 5, 0.1),
    box(-5, 0, 0.1, 5),
    box(5, 0, 0.1, 5),
    box(-1, 0, 4, 0.1),
  ]
  const grid = buildGrid(walls, 0.3)

  it('goes round the wall through the gap rather than through it', () => {
    const path = findPath(grid, { x: -2, z: -2 }, { x: -2, z: 2 })!
    expect(path).not.toBeNull()
    expect(path.at(-1)).toEqual({ x: -2, z: 2 })
    // Every leg is clear of the walls, and it passes the open end (x > 3).
    let at = { x: -2, z: -2 }
    for (const p of path) {
      expect(clear(grid, at, p)).toBe(true)
      at = p
    }
    expect(Math.max(...path.map((p) => p.x))).toBeGreaterThan(3)
  })

  it('a straight way needs no turns', () => {
    expect(findPath(grid, { x: -3, z: -2 }, { x: 2, z: -2 })).toEqual([{ x: 2, z: -2 }])
  })

  it('a spot inside furniture is reached from the nearest clear floor', () => {
    const chair = box(2, 2, 0.3, 0.3)
    const g = buildGrid([...walls, chair], 0.3)
    const path = findPath(g, { x: -2, z: 2 }, { x: 2, z: 2 })!
    expect(path.at(-1)).toEqual({ x: 2, z: 2 })
    expect(blocked(path.at(-2)!.x, path.at(-2)!.z, 0.3, [chair])).toBe(false)
  })

  it('no way at all is reported, not walked into forever', () => {
    const shut = [...walls, box(4, 0, 1, 0.1)]
    const g = buildGrid(shut, 0.3)
    expect(findPath(g, { x: -2, z: -2 }, { x: -2, z: 2 })).toBeNull()
    expect(nearestFree(g, { x: 0, z: 0 })).not.toBeNull()
  })
})

describe('narrow gaps', () => {
  it('a gap narrower than the body cannot be squeezed into', () => {
    // A chair and a wall 0.5 m apart: the character (0.6 m across) is pushed into it.
    const solids = [box(0, 0, 3, 0.05), box(0, -0.85, 0.3, 0.3)]
    let b = body(-2, -0.4, Math.PI / 2)
    for (let i = 0; i < 120; i++)
      b = step(b, { ...NO_INPUT, forward: 1 }, -Math.PI / 2, 1 / 30, solids)
    expect(blocked(b.x, b.z, RADIUS, solids)).toBe(false)
    expect(b.x).toBeLessThan(0)
  })
})
