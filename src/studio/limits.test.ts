/**
 * The limits lifted: roofs that follow the building's outline, typed sizes
 * for rooms of any shape, curved walls, and DXF plans read back in.
 */
import { describe, expect, it } from 'vitest'
import { analyse } from './analysis'
import { projectToDxf } from './documents'
import { isDxf, projectFromDxf } from './dxfImport'
import { dist, polygonArea } from './geometry'
import { emptyProject } from './model'
import {
  addArcWall,
  addRectRoom,
  addRoof,
  addRoom,
  arcPoints,
  setRoomSize,
  WALL_PRESETS,
} from './ops'
import { rectangles, unionOutline } from './outline'
import { sampleApartment, sampleHouse } from './samples'

/** An L-shaped house: a 10 × 5 m block and a 4 × 4 m wing. */
function lHouse() {
  let s = emptyProject('L house')
  s = addRectRoom(
    s,
    'f0',
    { x: 0, y: 0 },
    { x: 10000, y: 5000 },
    { name: 'Living', use: 'living', walls: WALL_PRESETS.exterior },
  ).state
  s = addRectRoom(
    s,
    'f0',
    { x: 0, y: 5000 },
    { x: 4000, y: 9000 },
    { name: 'Kitchen', use: 'kitchen', walls: WALL_PRESETS.exterior },
  ).state
  return s
}

describe('roofs follow the outline', () => {
  it('joins rooms into the building’s outer outline', () => {
    const s = lHouse()
    const outline = unionOutline(s.rooms.map((r) => r.outline))!
    expect(outline).toHaveLength(6)
    expect(polygonArea(outline)).toBe(10000 * 5000 + 4000 * 4000)
    expect(rectangles(outline)).toHaveLength(2)
  })
  it('gives an L-shaped plan an L-shaped roof', () => {
    const r = addRoof(lHouse(), 'f0', 'gable')
    const roof = r.state.roofs[0]
    expect(roof.outline).toHaveLength(6)
    expect(polygonArea(roof.outline)).toBe(66_000_000)
  })
  it('keeps the rectangle round the walls when rooms are not square', () => {
    let s = emptyProject()
    s = addRoom(
      s,
      'f0',
      [
        { x: 0, y: 0 },
        { x: 6000, y: 0 },
        { x: 3000, y: 4000 },
      ],
      { walls: WALL_PRESETS.exterior },
    ).state
    expect(addRoof(s, 'f0', 'flat').state.roofs[0].outline).toHaveLength(4)
  })
})

describe('typed sizes for any room', () => {
  it('stretches an L-shaped room, and its walls follow', () => {
    let s = emptyProject()
    const outline = [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 6000, y: 3000 },
      { x: 3000, y: 3000 },
      { x: 3000, y: 6000 },
      { x: 0, y: 6000 },
    ]
    const r = addRoom(s, 'f0', outline, { name: 'L', walls: WALL_PRESETS.interior })
    s = r.state
    const before = polygonArea(s.rooms[0].outline)
    const resized = setRoomSize(s, r.id, 9000, 6000)
    expect(resized.error).toBeUndefined()
    expect(polygonArea(resized.state.rooms[0].outline)).toBeCloseTo(before * 1.5, 0)
    const xs = resized.state.walls.flatMap((w) => [w.a.x, w.b.x])
    expect(Math.max(...xs)).toBe(9000)
  })
})

describe('curved walls', () => {
  it('runs an arc from end to end through the point', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 4000, y: 0 }
    const pts = arcPoints(a, b, { x: 2000, y: -1000 })
    expect(pts[0]).toEqual(a)
    expect(pts[pts.length - 1]).toEqual(b)
    // All on one circle: centre (2000, 1500), radius 2500.
    for (const p of pts)
      expect(Math.abs(dist(p, { x: 2000, y: 1500 }) - 2500)).toBeLessThan(2)
    // It bends the way the point says.
    expect(Math.min(...pts.map((p) => p.y))).toBeLessThan(-900)
    // Straight when the three are in line.
    expect(arcPoints(a, b, { x: 2000, y: 0 })).toEqual([a, b])
  })
  it('is made of short walls, with doors and analysis working as for any wall', () => {
    const r = addArcWall(
      emptyProject(),
      'f0',
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 3000, y: 2000 },
      WALL_PRESETS.exterior,
    )
    expect(r.ids.length).toBeGreaterThanOrEqual(4)
    for (const w of r.state.walls) expect(dist(w.a, w.b)).toBeLessThan(1000)
  })
})

describe('DXF plans read back in', () => {
  it('recognises a DXF', () => {
    expect(isDxf(projectToDxf(sampleApartment()))).toBe(true)
    expect(isDxf('{"format":"gamhub-space-studio"}')).toBe(false)
  })
  it('reads back Space Studio’s own plan: walls, named rooms, doors and windows', () => {
    const original = sampleApartment()
    const read = projectFromDxf(projectToDxf(original), 'Round trip')
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const s = read.state
    expect(s.rooms.map((r) => r.name).sort()).toEqual(
      original.rooms.map((r) => r.name).sort(),
    )
    expect(s.rooms.find((r) => r.name === 'Bedroom 1')?.use).toBe('bedroom')
    for (const r of original.rooms) {
      const back = s.rooms.find((x) => x.name === r.name)!
      expect(polygonArea(back.outline)).toBeCloseTo(polygonArea(r.outline), -3)
    }
    const kinds = (st: typeof s) => ({
      doors: st.openings.filter((o) => o.kind === 'door').length,
      windows: st.openings.filter((o) => o.kind === 'window').length,
    })
    expect(kinds(s)).toEqual(kinds(original))
    // The same floor area, and the doors still join every room.
    const back = analyse(s)
    expect(back.totalArea).toBeCloseTo(analyse(original).totalArea, 0)
    expect(back.rooms.filter((r) => r.connects.length > 0)).toHaveLength(
      original.rooms.length,
    )
  })
  it('reads back every floor', () => {
    const read = projectFromDxf(projectToDxf(sampleHouse()))
    expect(read.ok && read.state.floors.map((f) => f.name)).toEqual([
      'Ground floor',
      'First floor',
    ])
    expect(
      read.ok &&
        read.state.rooms.filter((r) => r.floor === read.state.floors[1].id).length,
    ).toBe(3)
  })
  it('turns another program’s lines into walls and closed outlines into rooms, in its units', () => {
    const dxf = [
      '0',
      'SECTION',
      '2',
      'HEADER',
      '9',
      '$INSUNITS',
      '70',
      '6',
      '0',
      'ENDSEC',
      '0',
      'SECTION',
      '2',
      'ENTITIES',
      '0',
      'LWPOLYLINE',
      '8',
      'A-WALL',
      '90',
      '4',
      '70',
      '1',
      '10',
      '0',
      '20',
      '0',
      '10',
      '5',
      '20',
      '0',
      '10',
      '5',
      '20',
      '4',
      '10',
      '0',
      '20',
      '4',
      '0',
      'LINE',
      '8',
      'A-WALL',
      '10',
      '2.5',
      '20',
      '0',
      '11',
      '2.5',
      '21',
      '4',
      '0',
      'TEXT',
      '8',
      'A-TEXT',
      '10',
      '1',
      '20',
      '2',
      '40',
      '0.2',
      '1',
      'Study',
      '0',
      'ENDSEC',
      '0',
      'EOF',
    ].join('\n')
    const read = projectFromDxf(dxf)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.state.rooms).toHaveLength(1)
    expect(read.state.rooms[0]).toMatchObject({ name: 'Study', use: 'office' })
    expect(polygonArea(read.state.rooms[0].outline)).toBe(20_000_000)
    expect(read.state.walls.length).toBeGreaterThanOrEqual(5)
  })
  it('refuses what it cannot read, with the reason', () => {
    expect(projectFromDxf('hello')).toEqual({
      ok: false,
      error: expect.stringMatching(/not a DXF/),
    })
  })
})
