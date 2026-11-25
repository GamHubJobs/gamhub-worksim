/**
 * Every edit to a Space Studio project, as a pure function from one state to
 * the next. The editor only calls these, so undo and redo are exact, and the
 * 2D plan, the 3D view and the checks always agree.
 */
import { catalogEntry, type OpeningPreset } from './catalog'
import { isRectilinear, unionOutline } from './outline'
import {
  bounds,
  dist,
  EPS,
  isRectangle,
  itemCorners,
  openingFits,
  openingSpan,
  pointAlong,
  pointInPolygon,
  projectOnSegment,
  samePoint,
  signedArea,
  wallDir,
  wallLength,
  wallRect,
} from './geometry'
import {
  PARTS,
  type Floor,
  type Item,
  type Opening,
  type PartKind,
  type Point,
  type Ref,
  type Room,
  type RoomUse,
  type StudioState,
  type Wall,
  type WallType,
} from './model'

let counter = 0
/** A new unique ID (unique within a session and practically across saves). */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1_000_000
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export interface WallStyle {
  thickness: number
  height: number
  type: WallType
}

export const WALL_PRESETS: Record<WallType, WallStyle> = {
  exterior: { thickness: 300, height: 2700, type: 'exterior' },
  interior: { thickness: 150, height: 2700, type: 'interior' },
  partition: { thickness: 100, height: 2700, type: 'partition' },
}

// ---------------------------------------------------------------- snapping

export const snapValue = (v: number, grid: number) => Math.round(v / grid) * grid

export function snapToGrid(p: Point, grid: number): Point {
  return { x: snapValue(p.x, grid), y: snapValue(p.y, grid) }
}

/**
 * Snaps a point: first to a wall end or corner within `radius`, then onto a
 * wall's centre line, then to the grid. Returns what it snapped to.
 */
export function snapPoint(
  state: StudioState,
  floor: string,
  p: Point,
  options: { grid: number; radius: number; useGrid: boolean },
): { point: Point; to: 'corner' | 'wall' | 'grid' | 'none' } {
  let best: Point | null = null
  let bestD = options.radius
  for (const w of state.walls) {
    if (w.floor !== floor) continue
    for (const end of [w.a, w.b]) {
      const d = dist(end, p)
      if (d < bestD) {
        bestD = d
        best = end
      }
    }
  }
  for (const r of state.rooms) {
    if (r.floor !== floor) continue
    for (const v of r.outline) {
      const d = dist(v, p)
      if (d < bestD) {
        bestD = d
        best = v
      }
    }
  }
  if (best) return { point: { ...best }, to: 'corner' }
  for (const w of state.walls) {
    if (w.floor !== floor) continue
    const proj = projectOnSegment(p, w.a, w.b)
    if (proj.distance < options.radius * 0.6) {
      // Along the wall, still on the grid where possible.
      const along = options.useGrid ? snapValue(proj.along, options.grid) : proj.along
      return { point: pointAlong(w, Math.max(0, Math.min(proj.len, along))), to: 'wall' }
    }
  }
  if (options.useGrid) return { point: snapToGrid(p, options.grid), to: 'grid' }
  return { point: p, to: 'none' }
}

/** Keeps the line from `from` to `p` at a multiple of 45° (Shift while drawing). */
export function lockAngle(from: Point, p: Point): Point {
  const len = dist(from, p)
  const angle = Math.atan2(p.y - from.y, p.x - from.x)
  const step = Math.PI / 4
  const a = Math.round(angle / step) * step
  return { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len }
}

// ---------------------------------------------------------------- walls and rooms

/** The parts of segment ab not already covered by a collinear wall on the floor. */
function uncoveredParts(state: StudioState, floor: string, a: Point, b: Point) {
  const len = dist(a, b)
  if (len < EPS) return []
  const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
  const covered: Array<[number, number]> = []
  for (const w of state.walls) {
    if (w.floor !== floor) continue
    // Both ends on the infinite line through ab?
    const onLine = (p: Point) => Math.abs((p.x - a.x) * d.y - (p.y - a.y) * d.x) < 1
    if (!onLine(w.a) || !onLine(w.b)) continue
    const t1 = (w.a.x - a.x) * d.x + (w.a.y - a.y) * d.y
    const t2 = (w.b.x - a.x) * d.x + (w.b.y - a.y) * d.y
    const lo = Math.max(0, Math.min(t1, t2))
    const hi = Math.min(len, Math.max(t1, t2))
    if (hi - lo > EPS) covered.push([lo, hi])
  }
  covered.sort((p, q) => p[0] - q[0])
  const parts: Array<[Point, Point]> = []
  let cursor = 0
  for (const [lo, hi] of covered) {
    if (lo - cursor > 10) parts.push([at(a, d, cursor), at(a, d, lo)])
    cursor = Math.max(cursor, hi)
  }
  if (len - cursor > 10) parts.push([at(a, d, cursor), at(a, d, len)])
  return parts
}
const at = (a: Point, d: Point, t: number): Point => ({
  x: Math.round((a.x + d.x * t) * 10) / 10,
  y: Math.round((a.y + d.y * t) * 10) / 10,
})

/** Adds a wall from a to b (the parts not already walled). Returns the new walls' IDs. */
export function addWall(
  state: StudioState,
  floor: string,
  a: Point,
  b: Point,
  style: WallStyle,
): { state: StudioState; ids: string[] } {
  const ids: string[] = []
  const walls: Wall[] = uncoveredParts(state, floor, a, b).map(([p, q]) => {
    const id = newId('w')
    ids.push(id)
    return {
      id,
      floor,
      a: p,
      b: q,
      thickness: style.thickness,
      height: style.height,
      type: style.type,
      finishLeft: style.type === 'exterior' ? 'render-white' : 'paint-white',
      finishRight: 'paint-white',
    }
  })
  return { state: { ...state, walls: [...state.walls, ...walls] }, ids }
}

/** Orders an outline clockwise on the plan (y down), so faces and areas are consistent. */
export function clockwise(points: Point[]): Point[] {
  return signedArea(points) < 0 ? [...points].reverse() : points
}

/** Adds a room with its outline (and the walls round it, where there are none). */
export function addRoom(
  state: StudioState,
  floor: string,
  outline: Point[],
  options: { name?: string; use?: RoomUse; walls?: WallStyle | null } = {},
): { state: StudioState; id: string } {
  let next = state
  const ring = clockwise(outline)
  if (options.walls) {
    for (let i = 0; i < ring.length; i++)
      next = addWall(
        next,
        floor,
        ring[i],
        ring[(i + 1) % ring.length],
        options.walls,
      ).state
  }
  const id = newId('r')
  const count = next.rooms.filter((r) => r.floor === floor).length + 1
  const room: Room = {
    id,
    floor,
    name: options.name ?? `Room ${count}`,
    use: options.use ?? 'other',
    outline: ring,
    floorFinish: defaultFloorFinish(options.use ?? 'other'),
    ceilingFinish: 'paint-white',
    ceiling: true,
  }
  return { state: { ...next, rooms: [...next.rooms, room] }, id }
}

/** A rectangle room from two opposite corners. */
export function addRectRoom(
  state: StudioState,
  floor: string,
  p: Point,
  q: Point,
  options: { name?: string; use?: RoomUse; walls?: WallStyle | null } = {},
) {
  const x0 = Math.min(p.x, q.x)
  const x1 = Math.max(p.x, q.x)
  const y0 = Math.min(p.y, q.y)
  const y1 = Math.max(p.y, q.y)
  return addRoom(
    state,
    floor,
    [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ],
    options,
  )
}

export function defaultFloorFinish(use: RoomUse): string {
  switch (use) {
    case 'bathroom':
    case 'wc':
    case 'utility':
      return 'white-tiles'
    case 'kitchen':
      return 'porcelain-grey'
    case 'office':
    case 'meeting':
    case 'open-plan':
      return 'carpet-grey'
    case 'reception':
    case 'retail':
      return 'terrazzo'
    case 'plant':
    case 'storage':
      return 'concrete'
    default:
      return 'oak-boards'
  }
}

/**
 * Moves every wall end and room corner at `from` (on the floor) to `to`, so
 * joined walls stay joined and rooms stay closed. Openings keep their
 * distance from their wall's start, kept on the wall if it gets shorter.
 */
export function moveVertex(
  state: StudioState,
  floor: string,
  from: Point,
  to: Point,
): StudioState {
  return movePoints(state, floor, [{ from, to }])
}

/** Moves several points at once (each joined point moves with its original). */
export function movePoints(
  state: StudioState,
  floor: string,
  moves: Array<{ from: Point; to: Point }>,
): StudioState {
  const target = (p: Point): Point => {
    for (const m of moves) if (samePoint(p, m.from)) return { x: m.to.x, y: m.to.y }
    return p
  }
  const walls = state.walls.map((w) =>
    w.floor === floor ? { ...w, a: target(w.a), b: target(w.b) } : w,
  )
  const rooms = state.rooms.map((r) =>
    r.floor === floor ? { ...r, outline: r.outline.map(target) } : r,
  )
  const slabs = state.slabs.map((s) =>
    s.floor === floor ? { ...s, outline: s.outline.map(target) } : s,
  )
  return keepOpeningsOnWalls({ ...state, walls, rooms, slabs })
}

/** Slides openings back onto walls that got shorter (or drops those that no longer fit at all). */
export function keepOpeningsOnWalls(state: StudioState): StudioState {
  const openings = state.openings.flatMap((o) => {
    const wall = state.walls.find((w) => w.id === o.wall)
    if (!wall) return []
    const len = wallLength(wall)
    const margin = wall.thickness / 2 + 50
    const half = o.width / 2
    if (len - 2 * margin < o.width) return [] // no longer fits anywhere on the wall
    const offset = Math.max(margin + half, Math.min(len - margin - half, o.offset))
    return [offset === o.offset ? o : { ...o, offset }]
  })
  return { ...state, openings }
}

/** Moves a whole wall by (dx, dy): its ends move, and walls joined to them stretch. */
export function moveWall(
  state: StudioState,
  wallId: string,
  dx: number,
  dy: number,
): StudioState {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return state
  return movePoints(state, wall.floor, [
    { from: wall.a, to: { x: wall.a.x + dx, y: wall.a.y + dy } },
    { from: wall.b, to: { x: wall.b.x + dx, y: wall.b.y + dy } },
  ])
}

/** Sets a wall's length exactly, keeping its start and direction (joined walls follow its end). */
export function setWallLength(
  state: StudioState,
  wallId: string,
  length: number,
): StudioState {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall || length <= 0) return state
  const d = wallDir(wall)
  return moveVertex(state, wall.floor, wall.b, {
    x: Math.round((wall.a.x + d.x * length) * 10) / 10,
    y: Math.round((wall.a.y + d.y * length) * 10) / 10,
  })
}

/**
 * Sets a rectangular room's width and depth, keeping its top-left corner. Its
 * walls (and the neighbours' walls they share) move, and the furniture inside
 * keeps its place relative to the room.
 */
export function setRoomSize(
  state: StudioState,
  roomId: string,
  width: number,
  depth: number,
): { state: StudioState; error?: string } {
  const room = state.rooms.find((r) => r.id === roomId)
  if (!room) return { state, error: 'The room is missing.' }
  if (width < 500 || depth < 500)
    return { state, error: 'A room must be at least 500 mm each way.' }
  const b = bounds(room.outline)
  const sx = width / b.width
  const sy = depth / b.height
  const moveX = (x: number) => Math.round((b.minX + (x - b.minX) * sx) * 10) / 10
  const moveY = (y: number) => Math.round((b.minY + (y - b.minY) * sy) * 10) / 10
  const onRight = (p: Point) =>
    Math.abs(p.x - b.maxX) < EPS && p.y > b.minY - EPS && p.y < b.maxY + EPS
  const onBottom = (p: Point) =>
    Math.abs(p.y - b.maxY) < EPS && p.x > b.minX - EPS && p.x < b.maxX + EPS
  // A rectangle: its right and bottom sides move out (or in). Any other shape
  // is stretched: every point on its outline keeps its place in proportion.
  const onOutline = (p: Point) =>
    room.outline.some((a, i) => {
      const q = room.outline[(i + 1) % room.outline.length]
      return projectOnSegment(p, a, q).distance < EPS
    })
  const rect = isRectangle(room.outline)
  const move = (p: Point): Point =>
    rect
      ? { x: onRight(p) ? b.minX + width : p.x, y: onBottom(p) ? b.minY + depth : p.y }
      : onOutline(p)
        ? { x: moveX(p.x), y: moveY(p.y) }
        : p
  const floor = room.floor
  const inside = (x: number, y: number) => pointInPolygon({ x, y }, room.outline)
  const walls = state.walls.map((w) =>
    w.floor === floor ? { ...w, a: move(w.a), b: move(w.b) } : w,
  )
  const rooms = state.rooms.map((r) =>
    r.floor === floor ? { ...r, outline: r.outline.map(move) } : r,
  )
  const items = state.items.map((i) =>
    i.floor === floor && inside(i.x, i.y) ? { ...i, x: moveX(i.x), y: moveY(i.y) } : i,
  )
  return { state: keepOpeningsOnWalls({ ...state, walls, rooms, items }) }
}

// ---------------------------------------------------------------- openings

export function addOpening(
  state: StudioState,
  wallId: string,
  offset: number,
  preset: Pick<OpeningPreset, 'kind' | 'width' | 'height' | 'sill' | 'style'>,
): { state: StudioState; id?: string; error?: string } {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return { state, error: 'Choose a wall.' }
  const id = newId('o')
  const opening: Opening = {
    id,
    wall: wallId,
    kind: preset.kind,
    offset: Math.round(offset),
    width: preset.width,
    height: Math.min(preset.height, wall.height - preset.sill),
    sill: preset.kind === 'window' ? preset.sill : 0,
    hinge: 'start',
    side: 'left',
    style: preset.style,
    entrance: false,
  }
  const fit = openingFits(opening, wall, state.openings)
  if (!fit.ok) return { state, error: fit.reason }
  return { state: { ...state, openings: [...state.openings, opening] }, id }
}

/** Changes an opening, refusing the change (with the reason) if it would no longer fit. */
export function updateOpening(
  state: StudioState,
  id: string,
  patch: Partial<Opening>,
): { state: StudioState; error?: string } {
  const current = state.openings.find((o) => o.id === id)
  if (!current) return { state, error: 'The opening is missing.' }
  const next = { ...current, ...patch }
  const wall = state.walls.find((w) => w.id === next.wall)
  if (!wall) return { state, error: 'The wall is missing.' }
  const fit = openingFits(next, wall, state.openings)
  if (!fit.ok) return { state, error: fit.reason }
  // Only one entrance.
  const openings = state.openings.map((o) =>
    o.id === id ? next : patch.entrance && o.entrance ? { ...o, entrance: false } : o,
  )
  return { state: { ...state, openings } }
}

// ---------------------------------------------------------------- items and other parts

export function addItem(
  state: StudioState,
  floor: string,
  kind: string,
  x: number,
  y: number,
  rotation = 0,
): { state: StudioState; id: string } {
  const entry = catalogEntry(kind)
  const id = newId('i')
  const item: Item = {
    id,
    floor,
    kind,
    x: Math.round(x),
    y: Math.round(y),
    rotation,
    colour: entry?.colour,
    material: entry?.material,
    elevation: entry?.elevation ?? 0,
  }
  return { state: { ...state, items: [...state.items, item] }, id }
}

/** The floor above (by elevation), if there is one. */
export function floorAbove(state: StudioState, floorId: string): Floor | undefined {
  const floor = state.floors.find((f) => f.id === floorId)
  if (!floor) return undefined
  return [...state.floors]
    .filter((f) => f.elevation > floor.elevation)
    .sort((a, b) => a.elevation - b.elevation)[0]
}

export function addStair(
  state: StudioState,
  floor: string,
  x: number,
  y: number,
  rotation = 0,
): { state: StudioState; id?: string; error?: string } {
  const above = floorAbove(state, floor)
  if (!above)
    return { state, error: 'Add a floor above first: stairs need somewhere to go.' }
  const id = newId('s')
  const here = state.floors.find((f) => f.id === floor)!
  const rise = above.elevation - here.elevation
  // About 220 mm of going per 180 mm rise.
  const run = Math.round(Math.max(1800, (rise / 180) * 220) / 10) * 10
  return {
    state: {
      ...state,
      stairs: [
        ...state.stairs,
        {
          id,
          floor,
          x: Math.round(x),
          y: Math.round(y),
          rotation,
          width: 1000,
          run,
          to: above.id,
        },
      ],
    },
    id,
  }
}

export function addColumn(state: StudioState, floor: string, x: number, y: number) {
  const id = newId('c')
  return {
    state: {
      ...state,
      columns: [
        ...state.columns,
        {
          id,
          floor,
          x: Math.round(x),
          y: Math.round(y),
          size: 300,
          round: false,
          finish: 'concrete',
        },
      ],
    },
    id,
  }
}

export function addLabel(
  state: StudioState,
  floor: string,
  x: number,
  y: number,
  text: string,
) {
  const id = newId('l')
  return { state: { ...state, labels: [...state.labels, { id, floor, x, y, text }] }, id }
}

export function addDimension(state: StudioState, floor: string, a: Point, b: Point) {
  const id = newId('d')
  return {
    state: {
      ...state,
      dimensions: [...state.dimensions, { id, floor, a, b, offset: 400 }],
    },
    id,
  }
}

export function addSlab(
  state: StudioState,
  floor: string,
  kind: 'balcony' | 'terrace',
  p: Point,
  q: Point,
) {
  const id = newId('b')
  const x0 = Math.min(p.x, q.x)
  const x1 = Math.max(p.x, q.x)
  const y0 = Math.min(p.y, q.y)
  const y1 = Math.max(p.y, q.y)
  const outline = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ]
  return {
    state: {
      ...state,
      slabs: [
        ...state.slabs,
        {
          id,
          floor,
          kind,
          outline,
          railing: kind === 'balcony',
          finish: kind === 'balcony' ? 'timber-decking' : 'stone-paving',
        },
      ],
    },
    id,
  }
}

/** A roof over the floor's walls (their outline's bounding box), or a given rectangle. */
export function addRoof(
  state: StudioState,
  floor: string,
  kind: 'flat' | 'gable' | 'hip',
  area?: { p: Point; q: Point },
): { state: StudioState; id?: string; error?: string } {
  let outline: Point[]
  if (area) {
    const x0 = Math.min(area.p.x, area.q.x)
    const x1 = Math.max(area.p.x, area.q.x)
    const y0 = Math.min(area.p.y, area.q.y)
    const y1 = Math.max(area.p.y, area.q.y)
    outline = [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ]
  } else {
    const pts = state.walls.filter((w) => w.floor === floor).flatMap((w) => [w.a, w.b])
    if (pts.length < 2)
      return { state, error: 'Draw the walls first: the roof covers them.' }
    // The building's own outline (an L-shaped plan gets an L-shaped roof),
    // when its rooms are drawn square; otherwise the rectangle round its walls.
    const rooms = state.rooms.filter((r) => r.floor === floor).map((r) => r.outline)
    const union = rooms.length && rooms.every(isRectilinear) ? unionOutline(rooms) : null
    const b = bounds(pts)
    outline = union ?? [
      { x: b.minX, y: b.minY },
      { x: b.maxX, y: b.minY },
      { x: b.maxX, y: b.maxY },
      { x: b.minX, y: b.maxY },
    ]
  }
  const id = newId('roof')
  return {
    state: {
      ...state,
      roofs: [
        ...state.roofs,
        {
          id,
          floor,
          kind,
          outline,
          pitch: kind === 'flat' ? 0 : 35,
          overhang: kind === 'flat' ? 0 : 300,
          finish: kind === 'flat' ? 'roof-membrane' : 'roof-tiles',
        },
      ],
    },
    id,
  }
}

/** Changes one part's fields (anything but its ID). */
export function updatePart<K extends PartKind>(
  state: StudioState,
  kind: K,
  id: string,
  patch: Partial<StudioState[K][number]>,
): StudioState {
  const list = state[kind] as Array<{ id: string }>
  return { ...state, [kind]: list.map((x) => (x.id === id ? { ...x, ...patch, id } : x)) }
}

export function getPart(
  state: StudioState,
  ref: Ref,
): { id: string; floor?: string } | undefined {
  return (state[ref.kind] as Array<{ id: string; floor?: string }>).find(
    (x) => x.id === ref.id,
  )
}

/** The floor a part is on (openings: their wall's floor). */
export function partFloor(state: StudioState, ref: Ref): string | undefined {
  if (ref.kind === 'openings') {
    const o = state.openings.find((x) => x.id === ref.id)
    return state.walls.find((w) => w.id === o?.wall)?.floor
  }
  return getPart(state, ref)?.floor
}

// ---------------------------------------------------------------- selection edits

/**
 * Deletes parts. A wall takes its doors and windows with it; a room takes the
 * walls round it that no other room uses.
 */
export function deleteParts(state: StudioState, refs: Ref[]): StudioState {
  const ids = (kind: PartKind) =>
    new Set(refs.filter((r) => r.kind === kind).map((r) => r.id))
  const roomIds = ids('rooms')
  const wallIds = ids('walls')
  for (const room of state.rooms.filter((r) => roomIds.has(r.id))) {
    const others = state.rooms.filter((r) => r.floor === room.floor && !roomIds.has(r.id))
    for (const w of state.walls) {
      if (w.floor !== room.floor) continue
      const onEdge = (outline: Point[]) =>
        outline.some((p, i) => {
          const q = outline[(i + 1) % outline.length]
          return (
            projectOnSegment(w.a, p, q).distance < 1 &&
            projectOnSegment(w.b, p, q).distance < 1
          )
        })
      if (onEdge(room.outline) && !others.some((r) => onEdge(r.outline)))
        wallIds.add(w.id)
    }
  }
  const next: StudioState = { ...state }
  for (const kind of PARTS) {
    const remove = kind === 'walls' ? wallIds : kind === 'rooms' ? roomIds : ids(kind)
    if (remove.size === 0) continue
    ;(next as Record<PartKind, Array<{ id: string }>>)[kind] = (
      state[kind] as Array<{ id: string }>
    ).filter((x) => !remove.has(x.id))
  }
  next.openings = next.openings.filter((o) => next.walls.some((w) => w.id === o.wall))
  return next
}

/** The points a selection carries when it moves (wall ends, room corners). */
function selectionPoints(state: StudioState, refs: Ref[]): Point[] {
  const pts: Point[] = []
  for (const ref of refs) {
    if (ref.kind === 'walls') {
      const w = state.walls.find((x) => x.id === ref.id)
      if (w) pts.push(w.a, w.b)
    } else if (ref.kind === 'rooms') {
      const r = state.rooms.find((x) => x.id === ref.id)
      if (r) pts.push(...r.outline)
    }
  }
  return pts.filter((p, i) => pts.findIndex((q) => samePoint(p, q)) === i)
}

/**
 * Moves a selection by (dx, dy). Walls and rooms move their points (and joined
 * walls stretch to follow); a room carries the furniture inside it; everything
 * else moves as it is. Openings move along with their wall.
 */
export function translateParts(
  state: StudioState,
  refs: Ref[],
  dx: number,
  dy: number,
): StudioState {
  if (refs.length === 0 || (dx === 0 && dy === 0)) return state
  const shift = (p: Point): Point => ({
    x: Math.round((p.x + dx) * 10) / 10,
    y: Math.round((p.y + dy) * 10) / 10,
  })
  let next = state
  const byFloor = new Map<string, Point[]>()
  for (const ref of refs) {
    if (ref.kind !== 'walls' && ref.kind !== 'rooms') continue
    const f = partFloor(state, ref)
    if (!f) continue
    byFloor.set(f, [...(byFloor.get(f) ?? []), ...selectionPoints(state, [ref])])
  }
  for (const [floor, pts] of byFloor) {
    const unique = pts.filter((p, i) => pts.findIndex((q) => samePoint(p, q)) === i)
    next = movePoints(
      next,
      floor,
      unique.map((p) => ({ from: p, to: shift(p) })),
    )
  }
  // Furniture inside a moved room comes with it (unless it is selected itself).
  const carried = new Set<string>()
  for (const ref of refs.filter((r) => r.kind === 'rooms')) {
    const room = state.rooms.find((r) => r.id === ref.id)
    if (!room) continue
    for (const i of state.items)
      if (i.floor === room.floor && pointInPolygon(i, room.outline)) carried.add(i.id)
  }
  const sel = (kind: PartKind) =>
    new Set(refs.filter((r) => r.kind === kind).map((r) => r.id))
  const items = sel('items')
  for (const id of carried) items.add(id)
  const moveXY = <T extends { id: string; x: number; y: number }>(
    list: T[],
    set: Set<string>,
  ) => list.map((x) => (set.has(x.id) ? { ...x, ...shift(x) } : x))
  next = {
    ...next,
    items: moveXY(next.items, items),
    stairs: moveXY(next.stairs, sel('stairs')),
    columns: moveXY(next.columns, sel('columns')),
    labels: moveXY(next.labels, sel('labels')),
    dimensions: next.dimensions.map((d) =>
      sel('dimensions').has(d.id) ? { ...d, a: shift(d.a), b: shift(d.b) } : d,
    ),
    slabs: next.slabs.map((s) =>
      sel('slabs').has(s.id) ? { ...s, outline: s.outline.map(shift) } : s,
    ),
    roofs: next.roofs.map((r) =>
      sel('roofs').has(r.id) ? { ...r, outline: r.outline.map(shift) } : r,
    ),
  }
  // A selected opening slides along its wall by the part of the move along it.
  for (const ref of refs.filter((r) => r.kind === 'openings')) {
    const o = next.openings.find((x) => x.id === ref.id)
    const w = next.walls.find((x) => x.id === o?.wall)
    if (!o || !w) continue
    const d = wallDir(w)
    const offset = o.offset + dx * d.x + dy * d.y
    next = updateOpening(next, o.id, { offset }).state
  }
  return next
}

/** Rotates a selection by `degrees` about a centre (its middle by default). */
export function rotateParts(
  state: StudioState,
  refs: Ref[],
  degrees: number,
  centre?: Point,
): StudioState {
  if (refs.length === 0 || degrees % 360 === 0) return state
  const c = centre ?? selectionCentre(state, refs)
  if (!c) return state
  const r = (degrees * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const turn = (p: Point): Point => ({
    x: Math.round((c.x + (p.x - c.x) * cos - (p.y - c.y) * sin) * 10) / 10,
    y: Math.round((c.y + (p.x - c.x) * sin + (p.y - c.y) * cos) * 10) / 10,
  })
  const norm = (a: number) => (((Math.round(a * 10) / 10) % 360) + 360) % 360
  let next = state
  const byFloor = new Map<string, Point[]>()
  for (const ref of refs) {
    if (ref.kind !== 'walls' && ref.kind !== 'rooms') continue
    const f = partFloor(state, ref)
    if (f) byFloor.set(f, [...(byFloor.get(f) ?? []), ...selectionPoints(state, [ref])])
  }
  for (const [floor, pts] of byFloor)
    next = movePoints(
      next,
      floor,
      pts.map((p) => ({ from: p, to: turn(p) })),
    )
  const sel = (kind: PartKind) =>
    new Set(refs.filter((x) => x.kind === kind).map((x) => x.id))
  const turnXY = <T extends { id: string; x: number; y: number; rotation?: number }>(
    list: T[],
    set: Set<string>,
  ) =>
    list.map((x) =>
      set.has(x.id)
        ? {
            ...x,
            ...turn(x),
            ...(x.rotation !== undefined ? { rotation: norm(x.rotation + degrees) } : {}),
          }
        : x,
    )
  return {
    ...next,
    items: turnXY(next.items, sel('items')),
    stairs: turnXY(next.stairs, sel('stairs')),
    columns: turnXY(next.columns, sel('columns')),
    labels: turnXY(next.labels, sel('labels')),
  }
}

/** The middle of a selection's bounding box. */
export function selectionCentre(state: StudioState, refs: Ref[]): Point | null {
  const pts = refs.flatMap((ref) => refPoints(state, ref))
  if (pts.length === 0) return null
  const b = bounds(pts)
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
}

/** The points of a part on the plan (for bounds, box selection and centres). */
export function refPoints(state: StudioState, ref: Ref): Point[] {
  switch (ref.kind) {
    case 'walls': {
      const w = state.walls.find((x) => x.id === ref.id)
      return w ? wallRect(w) : []
    }
    case 'openings': {
      const o = state.openings.find((x) => x.id === ref.id)
      const w = state.walls.find((x) => x.id === o?.wall)
      if (!o || !w) return []
      const s = openingSpan(o)
      return [pointAlong(w, s.start), pointAlong(w, s.end)]
    }
    case 'rooms':
      return state.rooms.find((x) => x.id === ref.id)?.outline ?? []
    case 'items': {
      const i = state.items.find((x) => x.id === ref.id)
      return i ? itemCorners(i) : []
    }
    case 'stairs': {
      const s = state.stairs.find((x) => x.id === ref.id)
      return s ? stairCorners(s) : []
    }
    case 'columns': {
      const c = state.columns.find((x) => x.id === ref.id)
      return c
        ? [
            { x: c.x - c.size / 2, y: c.y - c.size / 2 },
            { x: c.x + c.size / 2, y: c.y + c.size / 2 },
          ]
        : []
    }
    case 'labels': {
      const l = state.labels.find((x) => x.id === ref.id)
      return l ? [{ x: l.x, y: l.y }] : []
    }
    case 'dimensions': {
      const d = state.dimensions.find((x) => x.id === ref.id)
      return d ? [d.a, d.b] : []
    }
    case 'slabs':
      return state.slabs.find((x) => x.id === ref.id)?.outline ?? []
    case 'roofs':
      return state.roofs.find((x) => x.id === ref.id)?.outline ?? []
  }
}

/** A stair's footprint: from its bottom edge, `run` long in its climbing direction. */
export function stairCorners(s: {
  x: number
  y: number
  rotation: number
  width: number
  run: number
}): Point[] {
  const r = (s.rotation * Math.PI) / 180
  // Climbing direction: −y turned by rotation.
  const up = { x: Math.sin(r), y: -Math.cos(r) }
  const side = { x: Math.cos(r), y: Math.sin(r) }
  const hw = s.width / 2
  const p0 = { x: s.x - side.x * hw, y: s.y - side.y * hw }
  const p1 = { x: s.x + side.x * hw, y: s.y + side.y * hw }
  return [
    p0,
    p1,
    { x: p1.x + up.x * s.run, y: p1.y + up.y * s.run },
    { x: p0.x + up.x * s.run, y: p0.y + up.y * s.run },
  ]
}

// ---------------------------------------------------------------- clipboard

export interface Clipboard {
  walls: Wall[]
  openings: Opening[]
  rooms: Room[]
  items: Item[]
  stairs: StudioState['stairs']
  columns: StudioState['columns']
  labels: StudioState['labels']
  dimensions: StudioState['dimensions']
  slabs: StudioState['slabs']
  roofs: StudioState['roofs']
}

/** Copies a selection (a wall brings its doors and windows; a room its walls and contents). */
export function copyParts(state: StudioState, refs: Ref[]): Clipboard {
  const has = (kind: PartKind, id: string) =>
    refs.some((r) => r.kind === kind && r.id === id)
  const rooms = state.rooms.filter((r) => has('rooms', r.id))
  const onRoomEdge = (w: Wall) =>
    rooms.some(
      (room) =>
        room.floor === w.floor &&
        room.outline.some((p, i) => {
          const q = room.outline[(i + 1) % room.outline.length]
          return (
            projectOnSegment(w.a, p, q).distance < 1 &&
            projectOnSegment(w.b, p, q).distance < 1
          )
        }),
    )
  const inRoom = (floor: string, p: Point) =>
    rooms.some((r) => r.floor === floor && pointInPolygon(p, r.outline))
  const walls = state.walls.filter((w) => has('walls', w.id) || onRoomEdge(w))
  const wallIds = new Set(walls.map((w) => w.id))
  return {
    walls,
    openings: state.openings.filter((o) => wallIds.has(o.wall)),
    rooms,
    items: state.items.filter((i) => has('items', i.id) || inRoom(i.floor, i)),
    stairs: state.stairs.filter((s) => has('stairs', s.id)),
    columns: state.columns.filter((c) => has('columns', c.id)),
    labels: state.labels.filter((l) => has('labels', l.id)),
    dimensions: state.dimensions.filter((d) => has('dimensions', d.id)),
    slabs: state.slabs.filter((s) => has('slabs', s.id)),
    roofs: state.roofs.filter((r) => has('roofs', r.id)),
  }
}

export const clipboardIsEmpty = (c: Clipboard) =>
  PARTS.every((k) => (c[k] as unknown[]).length === 0)

/** Pastes a copy onto a floor, moved by (dx, dy), with new IDs. Returns the new parts. */
export function pasteParts(
  state: StudioState,
  clip: Clipboard,
  floor: string,
  dx: number,
  dy: number,
): { state: StudioState; refs: Ref[] } {
  const shift = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy })
  const wallMap = new Map<string, string>()
  const refs: Ref[] = []
  const fresh = <T extends { id: string }>(kind: PartKind, prefix: string, x: T): T => {
    const id = newId(prefix)
    if (kind === 'walls') wallMap.set(x.id, id)
    refs.push({ kind, id })
    return { ...x, id }
  }
  const walls = clip.walls.map((w) =>
    fresh('walls', 'w', { ...w, floor, a: shift(w.a), b: shift(w.b) }),
  )
  const openings = clip.openings.map((o) =>
    fresh('openings', 'o', {
      ...o,
      wall: wallMap.get(o.wall) ?? o.wall,
      entrance: false,
    }),
  )
  const rooms = clip.rooms.map((r) =>
    fresh('rooms', 'r', {
      ...r,
      floor,
      name: `${r.name} (copy)`,
      outline: r.outline.map(shift),
    }),
  )
  const items = clip.items.map((i) => fresh('items', 'i', { ...i, floor, ...shift(i) }))
  const columns = clip.columns.map((c) =>
    fresh('columns', 'c', { ...c, floor, ...shift(c) }),
  )
  const labels = clip.labels.map((l) =>
    fresh('labels', 'l', { ...l, floor, ...shift(l) }),
  )
  const dimensions = clip.dimensions.map((d) =>
    fresh('dimensions', 'd', { ...d, floor, a: shift(d.a), b: shift(d.b) }),
  )
  const slabs = clip.slabs.map((s) =>
    fresh('slabs', 'b', { ...s, floor, outline: s.outline.map(shift) }),
  )
  const roofs = clip.roofs.map((r) =>
    fresh('roofs', 'roof', { ...r, floor, outline: r.outline.map(shift) }),
  )
  // Stairs keep their destination only when pasted on their own floor.
  const stairs = clip.stairs
    .filter((s) => s.floor === floor)
    .map((s) => fresh('stairs', 's', { ...s, ...shift(s) }))
  return {
    state: {
      ...state,
      walls: [...state.walls, ...walls],
      openings: [...state.openings, ...openings],
      rooms: [...state.rooms, ...rooms],
      items: [...state.items, ...items],
      stairs: [...state.stairs, ...stairs],
      columns: [...state.columns, ...columns],
      labels: [...state.labels, ...labels],
      dimensions: [...state.dimensions, ...dimensions],
      slabs: [...state.slabs, ...slabs],
      roofs: [...state.roofs, ...roofs],
    },
    refs,
  }
}

// ---------------------------------------------------------------- floors

/** Adds a floor on top, optionally with the outside walls of the floor below copied up. */
export function addFloor(
  state: StudioState,
  options: { copyWalls?: boolean; name?: string } = {},
): { state: StudioState; id: string } {
  const top = [...state.floors].sort((a, b) => b.elevation - a.elevation)[0]
  const id = newId('f')
  const level = state.floors.length
  const floor: Floor = {
    id,
    name:
      options.name ??
      (level === 1 ? 'First floor' : level === 2 ? 'Second floor' : `Floor ${level}`),
    elevation: top.elevation + top.height,
    height: top.height,
    slab: 200,
  }
  let next: StudioState = { ...state, floors: [...state.floors, floor] }
  if (options.copyWalls) {
    const outside = state.walls.filter((w) => w.floor === top.id && w.type === 'exterior')
    next = {
      ...next,
      walls: [
        ...next.walls,
        ...outside.map((w) => ({ ...w, id: newId('w'), floor: id })),
      ],
    }
  }
  return { state: next, id }
}

/** Deletes a floor and everything on it (the last floor cannot be deleted). */
export function deleteFloor(
  state: StudioState,
  floorId: string,
): { state: StudioState; error?: string } {
  if (state.floors.length <= 1)
    return { state, error: 'A project needs at least one floor.' }
  const refs: Ref[] = []
  for (const kind of PARTS) {
    if (kind === 'openings') continue
    for (const x of state[kind] as Array<{ id: string; floor: string }>)
      if (x.floor === floorId) refs.push({ kind, id: x.id })
  }
  const next = deleteParts(state, refs)
  return {
    state: {
      ...next,
      floors: next.floors.filter((f) => f.id !== floorId),
      stairs: next.stairs.filter((s) => s.to !== floorId),
    },
  }
}

// ---------------------------------------------------------------- picking

/** The parts on a floor, in the order they are picked (smaller and on top first). */
export function hitTest(
  state: StudioState,
  floor: string,
  p: Point,
  tolerance: number,
): Ref | null {
  for (const o of state.openings) {
    const w = state.walls.find((x) => x.id === o.wall)
    if (!w || w.floor !== floor) continue
    const proj = projectOnSegment(p, w.a, w.b)
    const s = openingSpan(o)
    if (
      proj.distance < w.thickness / 2 + tolerance &&
      proj.along > s.start &&
      proj.along < s.end
    )
      return { kind: 'openings', id: o.id }
  }
  for (const l of state.labels)
    if (l.floor === floor && dist(l, p) < tolerance * 2)
      return { kind: 'labels', id: l.id }
  for (const c of state.columns)
    if (
      c.floor === floor &&
      Math.abs(p.x - c.x) < c.size / 2 + tolerance &&
      Math.abs(p.y - c.y) < c.size / 2 + tolerance
    )
      return { kind: 'columns', id: c.id }
  // Items: the smallest one under the point.
  const items = state.items
    .filter((i) => i.floor === floor && pointInPolygon(p, itemCorners(i)))
    .sort((a, b) => area(itemCorners(a)) - area(itemCorners(b)))
  if (items[0]) return { kind: 'items', id: items[0].id }
  for (const s of state.stairs)
    if (s.floor === floor && pointInPolygon(p, stairCorners(s)))
      return { kind: 'stairs', id: s.id }
  for (const d of state.dimensions)
    if (d.floor === floor && projectOnSegment(p, d.a, d.b).distance < tolerance)
      return { kind: 'dimensions', id: d.id }
  for (const w of state.walls)
    if (
      w.floor === floor &&
      projectOnSegment(p, w.a, w.b).distance < w.thickness / 2 + tolerance
    )
      return { kind: 'walls', id: w.id }
  const rooms = state.rooms
    .filter((r) => r.floor === floor && pointInPolygon(p, r.outline))
    .sort((a, b) => area(a.outline) - area(b.outline))
  if (rooms[0]) return { kind: 'rooms', id: rooms[0].id }
  for (const s of state.slabs)
    if (s.floor === floor && pointInPolygon(p, s.outline))
      return { kind: 'slabs', id: s.id }
  return null
}
const area = (pts: Point[]) => Math.abs(signedArea(pts))

/** Everything on a floor whose points all lie inside a box. */
export function partsInBox(state: StudioState, floor: string, p: Point, q: Point): Ref[] {
  const x0 = Math.min(p.x, q.x)
  const x1 = Math.max(p.x, q.x)
  const y0 = Math.min(p.y, q.y)
  const y1 = Math.max(p.y, q.y)
  const inside = (pt: Point) => pt.x >= x0 && pt.x <= x1 && pt.y >= y0 && pt.y <= y1
  return allParts(state, floor).filter((ref) => {
    const pts = refPoints(state, ref)
    return pts.length > 0 && pts.every(inside)
  })
}

/** Every part on a floor (Select all). Roofs are left out: they belong to the floor below's top. */
export function allParts(state: StudioState, floor: string): Ref[] {
  const refs: Ref[] = []
  for (const kind of PARTS) {
    if (kind === 'roofs') continue
    for (const x of state[kind] as Array<{ id: string; floor?: string }>) {
      const f = kind === 'openings' ? partFloor(state, { kind, id: x.id }) : x.floor
      if (f === floor) refs.push({ kind, id: x.id })
    }
  }
  return refs
}

/** The room a point is in (smallest first), on a floor. */
export function roomAt(state: StudioState, floor: string, p: Point): Room | undefined {
  return state.rooms
    .filter((r) => r.floor === floor && pointInPolygon(p, r.outline))
    .sort((a, b) => area(a.outline) - area(b.outline))[0]
}

// ---------------------------------------------------------------- curved walls

/**
 * Points along the arc from a to b that passes through `through`, about every
 * `segment` mm (4 to 32 pieces). A straight line if the three are in line.
 */
export function arcPoints(a: Point, b: Point, through: Point, segment = 400): Point[] {
  const c = through
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-6 || dist(a, b) < 1) return [a, b]
  const sq = (p: Point) => p.x * p.x + p.y * p.y
  const ux = (sq(a) * (b.y - c.y) + sq(b) * (c.y - a.y) + sq(c) * (a.y - b.y)) / d
  const uy = (sq(a) * (c.x - b.x) + sq(b) * (a.x - c.x) + sq(c) * (b.x - a.x)) / d
  const r = Math.hypot(a.x - ux, a.y - uy)
  // A bend too slight to see (or a circle bigger than 100 m): keep it straight.
  if (r > 100_000) return [a, b]
  const angle = (p: Point) => Math.atan2(p.y - uy, p.x - ux)
  const turn = (from: number, to: number) =>
    (((to - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const ta = angle(a)
  const toB = turn(ta, angle(b))
  const sweep = turn(ta, angle(c)) < toB ? toB : toB - 2 * Math.PI
  const n = Math.max(4, Math.min(32, Math.ceil((Math.abs(sweep) * r) / segment)))
  const pts: Point[] = [a]
  for (let i = 1; i < n; i++) {
    const t = ta + (sweep * i) / n
    pts.push({ x: Math.round(ux + r * Math.cos(t)), y: Math.round(uy + r * Math.sin(t)) })
  }
  pts.push(b)
  return pts
}

/** A curved wall from a to b through a point: short straight walls along the arc. */
export function addArcWall(
  state: StudioState,
  floor: string,
  a: Point,
  b: Point,
  through: Point,
  style: WallStyle,
): { state: StudioState; ids: string[] } {
  const pts = arcPoints(a, b, through)
  let next = state
  const ids: string[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const r = addWall(next, floor, pts[i], pts[i + 1], style)
    next = r.state
    ids.push(...r.ids)
  }
  return { state: next, ids }
}
