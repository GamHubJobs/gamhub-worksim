import { describe, expect, it } from 'vitest'
import { analyse } from './analysis'
import { CATALOG, catalogEntry, OPENING_PRESETS, searchCatalog } from './catalog'
import {
  collide,
  isRectangle,
  itemCorners,
  openingFits,
  polygonArea,
  wallLength,
  wallPieces,
} from './geometry'
import { MATERIALS, material } from './materials'
import { emptyProject, StudioStateSchema, type StudioState } from './model'
import {
  addFloor,
  addItem,
  addOpening,
  addRectRoom,
  addStair,
  addWall,
  allParts,
  copyParts,
  deleteFloor,
  deleteParts,
  hitTest,
  lockAngle,
  moveVertex,
  moveWall,
  partsInBox,
  pasteParts,
  rotateParts,
  setRoomSize,
  setWallLength,
  snapPoint,
  translateParts,
  updateOpening,
  WALL_PRESETS,
} from './ops'
import { formatLength, parseLength } from './units'

const door = OPENING_PRESETS.find((p) => p.id === 'door-single')!
const window_ = OPENING_PRESETS.find((p) => p.id === 'window-casement')!

/** A 4 m × 3 m room at the origin, with exterior walls. */
function oneRoom(): { state: StudioState; room: string } {
  const r = addRectRoom(
    emptyProject('Test'),
    'f0',
    { x: 0, y: 0 },
    { x: 4000, y: 3000 },
    {
      name: 'Living room',
      use: 'living',
      walls: WALL_PRESETS.exterior,
    },
  )
  return { state: r.state, room: r.id }
}

describe('units', () => {
  it('shows lengths in each unit', () => {
    expect(formatLength(3600, 'mm')).toBe('3600 mm')
    expect(formatLength(3600, 'cm')).toBe('360 cm')
    expect(formatLength(3600, 'm')).toBe('3.60 m')
    expect(formatLength(3581.4, 'ft-in')).toBe(`11' 9"`)
  })
  it('reads typed lengths with or without a unit', () => {
    expect(parseLength('3600', 'mm')).toBe(3600)
    expect(parseLength('360', 'cm')).toBe(3600)
    expect(parseLength('3.6', 'm')).toBe(3600)
    expect(parseLength('3.6 m', 'mm')).toBe(3600)
    expect(parseLength('360cm', 'm')).toBe(3600)
    expect(parseLength(`11' 9"`, 'mm')).toBeCloseTo(3581.4, 1)
    expect(parseLength('12ft', 'mm')).toBeCloseTo(3657.6, 1)
    expect(parseLength('40in', 'mm')).toBe(1016)
    expect(parseLength('wide', 'mm')).toBeNull()
  })
})

describe('the model', () => {
  it('starts with one floor and validates', () => {
    const s = emptyProject()
    expect(s.floors).toHaveLength(1)
    expect(StudioStateSchema.safeParse(s).success).toBe(true)
  })
  it('fills defaults when an older or partial file is read', () => {
    const s = StudioStateSchema.parse({
      project: {},
      floors: [{ id: 'f0', name: 'G', elevation: 0 }],
    })
    expect(s.walls).toEqual([])
    expect(s.floors[0].height).toBe(3000)
    expect(s.project.units).toBe('mm')
  })
  it('has a catalogue and materials with unique IDs and valid sizes', () => {
    expect(new Set(CATALOG.map((c) => c.id)).size).toBe(CATALOG.length)
    expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(MATERIALS.length)
    for (const c of CATALOG) {
      expect(c.width * c.depth * c.height).toBeGreaterThan(0)
      expect(c.build(c.width, c.depth, c.height).length).toBeGreaterThan(0)
      if (c.material) expect(material(c.material)).toBeDefined()
    }
    expect(CATALOG.length).toBeGreaterThanOrEqual(60)
    expect(searchCatalog('sofa').map((c) => c.id)).toContain('sofa-3')
    expect(searchCatalog('bed', 'bedroom').every((c) => c.group === 'bedroom')).toBe(true)
  })
})

describe('rooms and walls', () => {
  it('draws a rectangle room with four walls and the right area', () => {
    const { state, room } = oneRoom()
    expect(state.walls).toHaveLength(4)
    const r = state.rooms.find((x) => x.id === room)!
    expect(polygonArea(r.outline)).toBe(12_000_000)
    expect(isRectangle(r.outline)).toBe(true)
  })
  it('does not double a wall shared with the next room', () => {
    const { state } = oneRoom()
    const next = addRectRoom(
      state,
      'f0',
      { x: 4000, y: 0 },
      { x: 7000, y: 3000 },
      { walls: WALL_PRESETS.interior },
    )
    // The shared wall at x = 4000 is already there: three new walls, not four.
    expect(next.state.walls).toHaveLength(7)
  })
  it('adds only the missing part of a wall that partly overlaps one', () => {
    const { state } = oneRoom()
    const next = addWall(
      state,
      'f0',
      { x: 2000, y: 0 },
      { x: 6000, y: 0 },
      WALL_PRESETS.interior,
    )
    expect(next.ids).toHaveLength(1)
    const w = next.state.walls.find((x) => x.id === next.ids[0])!
    expect(w.a).toEqual({ x: 4000, y: 0 })
    expect(wallLength(w)).toBe(2000)
  })
  it('moves a corner and the joined walls and the room follow', () => {
    const { state, room } = oneRoom()
    const next = moveVertex(state, 'f0', { x: 4000, y: 3000 }, { x: 5000, y: 3000 })
    const r = next.rooms.find((x) => x.id === room)!
    expect(r.outline).toContainEqual({ x: 5000, y: 3000 })
    const touching = next.walls.filter(
      (w) => (w.a.x === 5000 && w.a.y === 3000) || (w.b.x === 5000 && w.b.y === 3000),
    )
    expect(touching).toHaveLength(2)
  })
  it('moves a whole wall, stretching its neighbours', () => {
    const { state, room } = oneRoom()
    const right = state.walls.find((w) => w.a.x === 4000 && w.b.x === 4000)!
    const next = moveWall(state, right.id, 500, 0)
    expect(polygonArea(next.rooms.find((x) => x.id === room)!.outline)).toBe(4500 * 3000)
  })
  it('sets a wall length exactly', () => {
    const { state } = oneRoom()
    const top = state.walls.find((w) => w.a.y === 0 && w.b.y === 0)!
    const next = setWallLength(state, top.id, 4500)
    expect(wallLength(next.walls.find((w) => w.id === top.id)!)).toBe(4500)
  })
  it('sets a room size exactly, carrying its furniture and the shared walls', () => {
    const { state, room } = oneRoom()
    const withSofa = addItem(state, 'f0', 'sofa-2', 3000, 1500)
    const next = setRoomSize(withSofa.state, room, 5000, 3600)
    expect(next.error).toBeUndefined()
    const r = next.state.rooms.find((x) => x.id === room)!
    expect(polygonArea(r.outline)).toBe(5000 * 3600)
    const sofa = next.state.items.find((i) => i.id === withSofa.id)!
    expect(sofa.x).toBe(3750)
    expect(sofa.y).toBe(1800)
    expect(setRoomSize(state, room, 200, 3000).error).toMatch(/at least/)
  })
})

describe('doors and windows', () => {
  it('places a door on a wall, and refuses one that does not fit', () => {
    const { state } = oneRoom()
    const wall = state.walls[0]
    const ok = addOpening(state, wall.id, 1000, door)
    expect(ok.error).toBeUndefined()
    expect(ok.state.openings).toHaveLength(1)
    expect(addOpening(ok.state, wall.id, 1200, door).error).toMatch(/overlaps/)
    expect(addOpening(state, wall.id, 100, door).error).toMatch(/past the end/)
  })
  it('keeps windows under the wall height', () => {
    const { state } = oneRoom()
    const wall = state.walls[0]
    const r = addOpening(state, wall.id, 2000, window_)
    const o = r.state.openings[0]
    expect(openingFits({ ...o, height: 3000 }, wall, r.state.openings)).toEqual({
      ok: false,
      reason: expect.stringMatching(/taller/),
    })
    expect(updateOpening(r.state, o.id, { height: 3000 }).error).toMatch(/taller/)
  })
  it('builds a wall in pieces around its openings', () => {
    const { state } = oneRoom()
    const wall = state.walls[0]
    let s = addOpening(state, wall.id, 1000, door).state
    s = addOpening(s, wall.id, 2800, window_).state
    const pieces = wallPieces(s.walls[0], s.openings, s.walls)
    // Solid, above the door, solid, below the window, above the window, solid.
    expect(pieces).toHaveLength(6)
    const belowWindow = pieces.find((p) => p.bottom === 0 && p.top === 900)
    expect(belowWindow).toBeDefined()
    // The corners are closed: the wall reaches half a thickness past its ends.
    expect(pieces[0].from).toBe(-150)
    expect(pieces[pieces.length - 1].to).toBe(4150)
  })
  it('keeps an opening on its wall when the wall gets shorter, and drops it when it cannot fit', () => {
    const { state } = oneRoom()
    const top = state.walls.find((w) => w.a.y === 0 && w.b.y === 0)!
    const s = addOpening(state, top.id, 3300, door).state
    const shorter = setWallLength(s, top.id, 3000)
    const o = shorter.openings[0]
    expect(o.offset + o.width / 2).toBeLessThanOrEqual(3000 - 150 - 50)
    expect(setWallLength(s, top.id, 900).openings).toHaveLength(0)
  })
})

describe('selection, clipboard and floors', () => {
  it('moves, rotates, copies and pastes a selection', () => {
    const { state } = oneRoom()
    const a = addItem(state, 'f0', 'armchair', 1000, 1000)
    const moved = translateParts(a.state, [{ kind: 'items', id: a.id }], 200, -100)
    expect(moved.items[0]).toMatchObject({ x: 1200, y: 900 })
    const turned = rotateParts(moved, [{ kind: 'items', id: a.id }], 90)
    expect(turned.items[0].rotation).toBe(90)
    const clip = copyParts(turned, [{ kind: 'items', id: a.id }])
    const pasted = pasteParts(turned, clip, 'f0', 500, 0)
    expect(pasted.state.items).toHaveLength(2)
    expect(pasted.refs[0].id).not.toBe(a.id)
  })
  it('copies a room with its walls, doors and furniture', () => {
    const { state, room } = oneRoom()
    let s = addOpening(state, state.walls[0].id, 1000, door).state
    s = addItem(s, 'f0', 'sofa-2', 2000, 1500).state
    const clip = copyParts(s, [{ kind: 'rooms', id: room }])
    expect(clip.walls).toHaveLength(4)
    expect(clip.openings).toHaveLength(1)
    expect(clip.items).toHaveLength(1)
    const pasted = pasteParts(s, clip, 'f0', 6000, 0).state
    expect(pasted.rooms).toHaveLength(2)
    expect(pasted.openings).toHaveLength(2)
    expect(pasted.openings[1].wall).not.toBe(pasted.openings[0].wall)
  })
  it('deletes a room with its walls, and a wall with its openings', () => {
    const { state, room } = oneRoom()
    const s = addOpening(state, state.walls[0].id, 1000, door).state
    expect(deleteParts(s, [{ kind: 'walls', id: s.walls[0].id }]).openings).toHaveLength(
      0,
    )
    const gone = deleteParts(s, [{ kind: 'rooms', id: room }])
    expect(gone.rooms).toHaveLength(0)
    expect(gone.walls).toHaveLength(0)
  })
  it('selects by box and all', () => {
    const { state } = oneRoom()
    const s = addItem(state, 'f0', 'side-table', 1000, 1000).state
    expect(partsInBox(s, 'f0', { x: 500, y: 500 }, { x: 1500, y: 1500 })).toEqual([
      { kind: 'items', id: s.items[0].id },
    ])
    expect(allParts(s, 'f0').length).toBe(4 + 1 + 1)
  })
  it('picks the smallest thing under the pointer', () => {
    const { state, room } = oneRoom()
    const s = addItem(state, 'f0', 'rug', 2000, 1500).state
    const t = addItem(s, 'f0', 'coffee-table', 2000, 1500)
    expect(hitTest(t.state, 'f0', { x: 2000, y: 1500 }, 50)).toEqual({
      kind: 'items',
      id: t.id,
    })
    expect(hitTest(t.state, 'f0', { x: 500, y: 2500 }, 50)).toEqual({
      kind: 'rooms',
      id: room,
    })
    expect(hitTest(t.state, 'f0', { x: 2000, y: 10 }, 50)?.kind).toBe('walls')
  })
  it('adds floors (copying the outside walls), stairs between them, and deletes floors', () => {
    const { state } = oneRoom()
    expect(addStair(state, 'f0', 1000, 2500).error).toMatch(/floor above/)
    const up = addFloor(state, { copyWalls: true })
    expect(up.state.floors).toHaveLength(2)
    expect(up.state.walls.filter((w) => w.floor === up.id)).toHaveLength(4)
    const stair = addStair(up.state, 'f0', 1000, 2800)
    expect(stair.error).toBeUndefined()
    expect(stair.state.stairs[0].to).toBe(up.id)
    const back = deleteFloor(stair.state, up.id)
    expect(back.state.floors).toHaveLength(1)
    expect(back.state.stairs).toHaveLength(0)
    expect(deleteFloor(state, 'f0').error).toMatch(/at least one/)
  })
  it('snaps to corners, walls and the grid, and locks angles', () => {
    const { state } = oneRoom()
    const opts = { grid: 100, radius: 200, useGrid: true }
    expect(snapPoint(state, 'f0', { x: 3900, y: 80 }, opts)).toEqual({
      point: { x: 4000, y: 0 },
      to: 'corner',
    })
    expect(snapPoint(state, 'f0', { x: 2030, y: 60 }, opts)).toEqual({
      point: { x: 2000, y: 0 },
      to: 'wall',
    })
    expect(snapPoint(state, 'f0', { x: 1234, y: 1666 }, opts)).toEqual({
      point: { x: 1200, y: 1700 },
      to: 'grid',
    })
    const locked = lockAngle({ x: 0, y: 0 }, { x: 1000, y: 80 })
    expect(Math.round(locked.y)).toBe(0)
  })
})

describe('the walker', () => {
  it('stops at walls but passes through a doorway', () => {
    const { state } = oneRoom()
    const left = state.walls.find((w) => w.a.x === 0 && w.b.x === 0)!
    const s = addOpening(state, left.id, 1500, door).state
    // Walking into the solid top wall from inside: pushed back.
    const p = collide({ x: 2000, y: 100 }, 250, s, 'f0')
    expect(p.y).toBeGreaterThanOrEqual(150 + 250 - 1)
    // Standing in the doorway on the left wall (y = 1500): not pushed.
    const d = collide({ x: 0, y: 1500 }, 250, s, 'f0')
    expect(d).toEqual({ x: 0, y: 1500 })
  })
  it('stops at furniture when asked', () => {
    const { state } = oneRoom()
    const s = addItem(state, 'f0', 'dining-table-4', 2000, 1500).state
    const p = collide({ x: 2000, y: 1500 }, 250, s, 'f0', [itemCorners(s.items[0])])
    expect(Math.abs(p.y - 1500) > 400 || Math.abs(p.x - 2000) > 600).toBe(true)
  })
})

describe('analysis', () => {
  function flat() {
    let s = emptyProject('Flat')
    s = addRectRoom(
      s,
      'f0',
      { x: 0, y: 0 },
      { x: 4000, y: 4000 },
      { name: 'Living room', use: 'living', walls: WALL_PRESETS.exterior },
    ).state
    s = addRectRoom(
      s,
      'f0',
      { x: 4000, y: 0 },
      { x: 7000, y: 4000 },
      { name: 'Bedroom', use: 'bedroom', walls: WALL_PRESETS.exterior },
    ).state
    return s
  }
  const wallAt = (s: StudioState, test: (w: StudioState['walls'][number]) => boolean) =>
    s.walls.find(test)!

  it('finds rooms without a way in, and with one through the doors', () => {
    let s = flat()
    let a = analyse(s)
    expect(a.issues.map((i) => i.code)).toContain('no-entrance')
    const front = wallAt(
      s,
      (w) => w.a.y === 4000 && w.b.y === 4000 && Math.max(w.a.x, w.b.x) === 4000,
    )
    s = addOpening(s, front.id, 2000, door).state
    a = analyse(s)
    expect(a.rooms.find((r) => r.name === 'Living room')!.reachable).toBe(true)
    expect(a.rooms.find((r) => r.name === 'Bedroom')!.reachable).toBe(false)
    expect(a.issues.find((i) => i.code === 'unreachable')?.message).toMatch(/Bedroom/)
    const shared = wallAt(s, (w) => w.a.x === 4000 && w.b.x === 4000)
    s = addOpening(s, shared.id, 2000, door).state
    a = analyse(s)
    expect(a.rooms.every((r) => r.reachable)).toBe(true)
    expect(a.rooms.find((r) => r.name === 'Bedroom')!.connects).toContain(
      a.rooms.find((r) => r.name === 'Living room')!.id,
    )
  })
  it('measures rooms and checks bedroom sizes and windows', () => {
    const s = addItem(flat(), 'f0', 'bed-double', 5500, 2000).state
    const a = analyse(s)
    const bed = a.rooms.find((r) => r.name === 'Bedroom')!
    expect(bed.area).toBe(12)
    expect(bed.beds).toBe(2)
    expect(a.issues.filter((i) => i.code === 'no-window').map((i) => i.message)).toEqual([
      'Living room has no window.',
      'Bedroom has no window.',
    ])
    expect(a.totalArea).toBe(28)
  })
  it('finds furniture in walls, overlapping, and in a door swing', () => {
    let s = flat()
    const shared = wallAt(s, (w) => w.a.x === 4000 && w.b.x === 4000)
    s = addOpening(s, shared.id, 2000, door).state
    s = addItem(s, 'f0', 'wardrobe', 4000, 600).state // through the shared wall
    s = addItem(s, 'f0', 'armchair', 1500, 1500).state
    s = addItem(s, 'f0', 'armchair', 1700, 1500).state // on top of the first
    // Plants each side of the shared door: one stands in its swing.
    s = addItem(s, 'f0', 'plant-large', 3550, 2000).state // just inside the living room by the door
    s = addItem(s, 'f0', 'plant-large', 4450, 2000).state
    const codes = analyse(s).issues.map((i) => i.code)
    expect(codes).toContain('item-in-wall')
    expect(codes).toContain('items-overlap')
    expect(codes).toContain('door-blocked')
  })
  it('lets chairs tuck under tables', () => {
    let s = flat()
    s = addItem(s, 'f0', 'dining-table-4', 2000, 2000).state
    s = addItem(s, 'f0', 'dining-chair', 2000, 2350).state
    expect(analyse(s).issues.map((i) => i.code)).not.toContain('items-overlap')
  })
  it('costs the design and flags it over budget', () => {
    let s = flat()
    s = addItem(s, 'f0', 'sofa-3', 2000, 2000).state
    let a = analyse(s)
    expect(a.costs.furniture).toBe(catalogEntry('sofa-3')!.price)
    expect(a.costs.finishes).toBeGreaterThan(0)
    expect(a.costs.total).toBe(
      a.costs.furniture + a.costs.fixtures + a.costs.openings + a.costs.finishes,
    )
    s = { ...s, project: { ...s.project, budget: 1000 } }
    a = analyse(s)
    expect(a.issues.map((i) => i.code)).toContain('over-budget')
  })
})
