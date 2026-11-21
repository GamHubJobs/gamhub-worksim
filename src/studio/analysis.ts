/**
 * Reads a project the way a reviewer would: each room's size, its doors and
 * windows, whether every room can be reached from the entrance, furniture in
 * each room, clashes and blocked doors, and what it all costs. The checks,
 * the colleagues' reviews, the report and the status bar all use this.
 *
 * Space guidance here follows common UK practice in simplified form, for
 * learning; real projects follow the applicable regulations.
 */
import { catalogEntry, OPENING_PRESETS } from './catalog'
import {
  add,
  centroid,
  convexOverlap,
  dist,
  itemCorners,
  itemSize,
  openingFits,
  pointAlong,
  pointInPolygon,
  polygonArea,
  projectOnSegment,
  rectCorners,
  roomSize,
  scale,
  wallDir,
  wallLength,
  wallNormal,
  wallRect,
} from './geometry'
import { materialOrDefault } from './materials'
import type { Item, Opening, Ref, Room, RoomUse, StudioState } from './model'
import { stairCorners } from './ops'

export const HABITABLE: RoomUse[] = [
  'living',
  'bedroom',
  'kitchen',
  'dining',
  'office',
  'meeting',
  'open-plan',
  'reception',
]

/** Simplified space guidance (m², mm), for learning. */
export const GUIDANCE = {
  doubleBedroomArea: 11.5,
  singleBedroomArea: 7.5,
  doubleBedroomWidth: 2750,
  bedroomWidth: 2150,
  doorClearWidth: 775,
  /** Minimum clear space in front of furniture used daily (mm). */
  circulation: 600,
  /** Office: floor area per workstation (m²). */
  workstationArea: 5,
}

export interface RoomInfo {
  id: string
  name: string
  use: RoomUse
  floor: string
  /** m² on the walls' centre lines. */
  area: number
  width: number
  depth: number
  doors: string[]
  windows: string[]
  /** Glazed area of its windows (m²). */
  glazing: number
  items: string[]
  /** Neighbours through doors and pass-throughs: room IDs, or 'outside'. */
  connects: string[]
  reachable: boolean
  hasCeilingLight: boolean
  beds: number
  seats: number
  workstations: number
}

export type Severity = 'error' | 'warning' | 'info'

export interface Issue {
  code:
    | 'unreachable'
    | 'no-entrance'
    | 'no-window'
    | 'small-room'
    | 'narrow-room'
    | 'narrow-door'
    | 'opening-misfit'
    | 'item-in-wall'
    | 'items-overlap'
    | 'door-blocked'
    | 'open-edge'
    | 'stair-landing'
    | 'over-budget'
    | 'no-light'
  severity: Severity
  message: string
  refs: Ref[]
}

export interface Costs {
  furniture: number
  fixtures: number
  openings: number
  finishes: number
  total: number
}

export interface StudioAnalysis {
  rooms: RoomInfo[]
  floors: Array<{ id: string; name: string; area: number; rooms: number }>
  totalArea: number
  issues: Issue[]
  costs: Costs
  /** The entrance door, if any. */
  entrance: string | null
  counts: {
    walls: number
    doors: number
    windows: number
    items: number
    stairs: number
    floors: number
  }
}

const m2 = (mm2: number) => Math.round(mm2 / 10_000) / 100

/** The rooms (or 'outside') each side of an opening, a short step from its middle. */
export function openingSides(
  state: StudioState,
  o: Opening,
): { left: Room | null; right: Room | null } {
  const wall = state.walls.find((w) => w.id === o.wall)
  if (!wall) return { left: null, right: null }
  const mid = pointAlong(wall, o.offset)
  const n = wallNormal(wall)
  const step = wall.thickness / 2 + 150
  const find = (p: { x: number; y: number }) =>
    state.rooms
      .filter((r) => r.floor === wall.floor && pointInPolygon(p, r.outline))
      .sort((a, b) => polygonArea(a.outline) - polygonArea(b.outline))[0] ?? null
  return { left: find(add(mid, scale(n, step))), right: find(add(mid, scale(n, -step))) }
}

function roomOf(
  state: StudioState,
  floor: string,
  p: { x: number; y: number },
): Room | null {
  return (
    state.rooms
      .filter((r) => r.floor === floor && pointInPolygon(p, r.outline))
      .sort((a, b) => polygonArea(a.outline) - polygonArea(b.outline))[0] ?? null
  )
}

/** The clear width of a door (its leaf width less the frame, ~40 mm each side). */
export const clearWidth = (o: Opening) => (o.kind === 'pass' ? o.width : o.width - 80)

/** The price of an opening: its preset's, scaled by size. */
export function openingPrice(o: Opening): number {
  const preset =
    OPENING_PRESETS.find(
      (p) => p.kind === o.kind && p.style === o.style && Math.abs(p.width - o.width) < 1,
    ) ??
    OPENING_PRESETS.find((p) => p.kind === o.kind && p.style === o.style) ??
    OPENING_PRESETS.find((p) => p.kind === o.kind)!
  const ratio = (o.width * o.height) / (preset.width * preset.height)
  return Math.round(preset.price * (0.6 + 0.4 * ratio))
}

export function itemPrice(item: Item): number {
  const entry = catalogEntry(item.kind)
  if (!entry) return 0
  const { width, depth, height } = itemSize(item)
  const ratio = (width * depth * height) / (entry.width * entry.depth * entry.height)
  // A bigger version costs more, but not in proportion.
  return Math.round(entry.price * (0.7 + 0.3 * ratio))
}

/** Seats and beds an item gives. */
function capacity(kind: string) {
  const beds = /^bed-(double|king)/.test(kind) ? 2 : kind === 'bed-single' ? 1 : 0
  const seats =
    kind === 'sofa-3'
      ? 3
      : kind === 'sofa-2'
        ? 2
        : /chair|stool/.test(kind)
          ? 1
          : kind === 'waiting-bench'
            ? 3
            : 0
  const workstations = kind === 'workstation' || kind === 'desk' ? 1 : 0
  return { beds, seats, workstations }
}

/** Items that tuck under or against others without clashing. */
const TUCKS = /chair|stool/
const SURFACES = /table|desk|workstation|island|counter|reception/

export function analyse(state: StudioState): StudioAnalysis {
  const issues: Issue[] = []
  const floorsSorted = [...state.floors].sort((a, b) => a.elevation - b.elevation)
  const ground = floorsSorted[0]?.id

  // Doors, windows and the rooms they join.
  const doorsByRoom = new Map<string, Set<string>>()
  const windowsByRoom = new Map<string, Set<string>>()
  const links: Array<[string, string]> = []
  const put = (map: Map<string, Set<string>>, room: string, id: string) =>
    map.set(room, (map.get(room) ?? new Set()).add(id))
  for (const o of state.openings) {
    const wall = state.walls.find((w) => w.id === o.wall)
    if (!wall) continue
    const { left, right } = openingSides(state, o)
    if (o.kind === 'window') {
      if (left) put(windowsByRoom, left.id, o.id)
      if (right) put(windowsByRoom, right.id, o.id)
      continue
    }
    if (left) put(doorsByRoom, left.id, o.id)
    if (right) put(doorsByRoom, right.id, o.id)
    const outsideHere = wall.floor === ground ? 'outside' : null
    const a = left?.id ?? outsideHere
    const b = right?.id ?? outsideHere
    if (a && b && a !== b) links.push([a, b])
    if (!fitsNow(state, o, wall.id))
      issues.push({
        code: 'opening-misfit',
        severity: 'error',
        message: `A ${o.kind === 'pass' ? 'pass-through' : o.kind} no longer fits its wall.`,
        refs: [{ kind: 'openings', id: o.id }],
      })
    if (o.kind === 'door' && clearWidth(o) < GUIDANCE.doorClearWidth)
      issues.push({
        code: 'narrow-door',
        severity: 'warning',
        message: `A door ${left ? `in ${left.name} ` : ''}is ${clearWidth(o)} mm clear; ${GUIDANCE.doorClearWidth} mm is the usual minimum for access.`,
        refs: [{ kind: 'openings', id: o.id }],
      })
  }
  for (const o of state.openings) {
    const wall = state.walls.find((w) => w.id === o.wall)
    if (wall && o.kind === 'window' && !fitsNow(state, o, wall.id))
      issues.push({
        code: 'opening-misfit',
        severity: 'error',
        message: 'A window no longer fits its wall.',
        refs: [{ kind: 'openings', id: o.id }],
      })
  }
  // Stairs join a room below to the room at the top.
  for (const s of state.stairs) {
    const corners = stairCorners(s)
    const bottom = roomOf(state, s.floor, { x: s.x, y: s.y })
    const topMid = {
      x: (corners[2].x + corners[3].x) / 2,
      y: (corners[2].y + corners[3].y) / 2,
    }
    const top = roomOf(state, s.to, topMid)
    if (bottom && top) links.push([bottom.id, top.id])
    if (!top || !state.floors.some((f) => f.id === s.to))
      issues.push({
        code: 'stair-landing',
        severity: 'error',
        message: 'A stair does not arrive in a room on the floor above.',
        refs: [{ kind: 'stairs', id: s.id }],
      })
  }

  // Which rooms can be reached from outside.
  const entranceDoor = state.openings.find((o) => o.entrance) ?? null
  const reach = new Set<string>(['outside'])
  for (let changed = true; changed;) {
    changed = false
    for (const [a, b] of links) {
      if (reach.has(a) !== reach.has(b)) {
        reach.add(a)
        reach.add(b)
        changed = true
      }
    }
  }
  const hasWayIn = links.some(([a, b]) => a === 'outside' || b === 'outside')

  // Rooms.
  const itemsByRoom = new Map<string, Item[]>()
  for (const item of state.items) {
    const room = roomOf(state, item.floor, item)
    if (room) itemsByRoom.set(room.id, [...(itemsByRoom.get(room.id) ?? []), item])
  }
  const rooms: RoomInfo[] = state.rooms.map((r) => {
    const { width, depth } = roomSize(r)
    const items = itemsByRoom.get(r.id) ?? []
    const windows = [...(windowsByRoom.get(r.id) ?? [])]
    const glazing = windows.reduce((s, id) => {
      const o = state.openings.find((x) => x.id === id)!
      return s + (o.width * o.height) / 1_000_000
    }, 0)
    const cap = items.reduce(
      (acc, i) => {
        const c = capacity(i.kind)
        return {
          beds: acc.beds + c.beds,
          seats: acc.seats + c.seats,
          workstations: acc.workstations + c.workstations,
        }
      },
      { beds: 0, seats: 0, workstations: 0 },
    )
    return {
      id: r.id,
      name: r.name,
      use: r.use,
      floor: r.floor,
      area: m2(polygonArea(r.outline)),
      width: Math.round(Math.min(width, depth)),
      depth: Math.round(Math.max(width, depth)),
      doors: [...(doorsByRoom.get(r.id) ?? [])],
      windows,
      glazing: Math.round(glazing * 100) / 100,
      items: items.map((i) => i.id),
      connects: links
        .filter(([a, b]) => a === r.id || b === r.id)
        .map(([a, b]) => (a === r.id ? b : a)),
      reachable: reach.has(r.id),
      hasCeilingLight: items.some((i) => catalogEntry(i.kind)?.light),
      ...cap,
    }
  })

  if (state.rooms.length > 0 && !hasWayIn)
    issues.push({
      code: 'no-entrance',
      severity: 'error',
      message: 'There is no door to the outside on the ground floor.',
      refs: [],
    })
  for (const r of rooms) {
    const ref: Ref[] = [{ kind: 'rooms', id: r.id }]
    if (hasWayIn && !r.reachable)
      issues.push({
        code: 'unreachable',
        severity: 'error',
        message: `${r.name} cannot be reached: it has no door to the rest of the building.`,
        refs: ref,
      })
    if (HABITABLE.includes(r.use) && r.windows.length === 0 && r.use !== 'meeting')
      issues.push({
        code: 'no-window',
        severity: 'warning',
        message: `${r.name} has no window.`,
        refs: ref,
      })
    if (r.use === 'bedroom') {
      const double = r.beds >= 2
      const minArea = double ? GUIDANCE.doubleBedroomArea : GUIDANCE.singleBedroomArea
      if (r.area < minArea)
        issues.push({
          code: 'small-room',
          severity: 'warning',
          message: `${r.name} is ${r.area.toFixed(1)} m²; a ${double ? 'double' : 'single'} bedroom needs at least ${minArea} m².`,
          refs: ref,
        })
      const minWidth = double ? GUIDANCE.doubleBedroomWidth : GUIDANCE.bedroomWidth
      if (r.width < minWidth)
        issues.push({
          code: 'narrow-room',
          severity: 'warning',
          message: `${r.name} is ${r.width} mm wide; a ${double ? 'double' : 'single'} bedroom should be at least ${minWidth} mm.`,
          refs: ref,
        })
    }
    if (HABITABLE.includes(r.use) && !r.hasCeilingLight && r.items.length > 0)
      issues.push({
        code: 'no-light',
        severity: 'info',
        message: `${r.name} has no light fitting.`,
        refs: ref,
      })
  }

  // Rooms whose edges have no wall (open to the next space): worth knowing.
  for (const r of state.rooms) {
    const walls = state.walls.filter((w) => w.floor === r.floor)
    const open = r.outline.some((p, i) => {
      const q = r.outline[(i + 1) % r.outline.length]
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
      return !walls.some((w) => projectOnSegment(mid, w.a, w.b).distance < 2)
    })
    if (open)
      issues.push({
        code: 'open-edge',
        severity: 'info',
        message: `${r.name} has a side with no wall (open to the space next to it).`,
        refs: [{ kind: 'rooms', id: r.id }],
      })
  }

  // Furniture clashes: with walls, with each other, in a door's swing.
  const floorItems = state.items.filter((i) => {
    const e = catalogEntry(i.kind)
    return !(e?.walkable || i.elevation > 300)
  })
  for (const item of floorItems) {
    const corners = itemCorners(item)
    const wall = state.walls.find(
      (w) => w.floor === item.floor && convexOverlap(corners, wallRect(w), 15),
    )
    if (wall)
      issues.push({
        code: 'item-in-wall',
        severity: 'error',
        message: `${catalogEntry(item.kind)?.name ?? 'An item'} runs into a wall.`,
        refs: [{ kind: 'items', id: item.id }],
      })
  }
  for (let i = 0; i < floorItems.length; i++) {
    for (let j = i + 1; j < floorItems.length; j++) {
      const a = floorItems[i]
      const b = floorItems[j]
      if (a.floor !== b.floor) continue
      if (
        (TUCKS.test(a.kind) && SURFACES.test(b.kind)) ||
        (TUCKS.test(b.kind) && SURFACES.test(a.kind))
      )
        continue
      if (convexOverlap(itemCorners(a), itemCorners(b), 20))
        issues.push({
          code: 'items-overlap',
          severity: 'warning',
          message: `${catalogEntry(a.kind)?.name ?? 'An item'} and ${catalogEntry(b.kind)?.name ?? 'another item'} overlap.`,
          refs: [
            { kind: 'items', id: a.id },
            { kind: 'items', id: b.id },
          ],
        })
    }
  }
  for (const o of state.openings) {
    if (o.kind !== 'door' || o.style === 'sliding') continue
    const swing = doorSwing(state, o)
    if (!swing) continue
    const blocker = floorItems.find(
      (i) => i.floor === swing.floor && convexOverlap(itemCorners(i), swing.area, 20),
    )
    if (blocker)
      issues.push({
        code: 'door-blocked',
        severity: 'warning',
        message: `${catalogEntry(blocker.kind)?.name ?? 'Furniture'} is in the way of a door opening.`,
        refs: [
          { kind: 'openings', id: o.id },
          { kind: 'items', id: blocker.id },
        ],
      })
  }

  // Costs.
  let furniture = 0
  let fixtures = 0
  for (const item of state.items) {
    const price = itemPrice(item)
    if (catalogEntry(item.kind)?.fixture) fixtures += price
    else furniture += price
  }
  const openings = state.openings.reduce((s, o) => s + openingPrice(o), 0)
  let finishes = 0
  for (const r of state.rooms) {
    const area = polygonArea(r.outline) / 1_000_000
    finishes += area * materialOrDefault(r.floorFinish).price
    if (r.ceiling) finishes += area * materialOrDefault(r.ceilingFinish).price
  }
  for (const w of state.walls) {
    const faceArea = (wallLength(w) * w.height) / 1_000_000
    const holes = state.openings
      .filter((o) => o.wall === w.id)
      .reduce((s, o) => s + (o.width * o.height) / 1_000_000, 0)
    const net = Math.max(0, faceArea - holes)
    finishes +=
      net *
      (materialOrDefault(w.finishLeft).price + materialOrDefault(w.finishRight).price)
  }
  const costs: Costs = {
    furniture: Math.round(furniture),
    fixtures: Math.round(fixtures),
    openings: Math.round(openings),
    finishes: Math.round(finishes),
    total: Math.round(furniture + fixtures + openings + finishes),
  }
  const budget = state.project.budget
  if (budget !== undefined && costs.total > budget)
    issues.push({
      code: 'over-budget',
      severity: 'error',
      message: `The design costs £${costs.total.toLocaleString('en-GB')}, over the £${budget.toLocaleString('en-GB')} budget.`,
      refs: [],
    })

  const floors = floorsSorted.map((f) => {
    const own = rooms.filter((r) => r.floor === f.id)
    return {
      id: f.id,
      name: f.name,
      area: Math.round(own.reduce((s, r) => s + r.area, 0) * 100) / 100,
      rooms: own.length,
    }
  })
  return {
    rooms,
    floors,
    totalArea: Math.round(floors.reduce((s, f) => s + f.area, 0) * 100) / 100,
    issues,
    costs,
    entrance: entranceDoor?.id ?? null,
    counts: {
      walls: state.walls.length,
      doors: state.openings.filter((o) => o.kind !== 'window').length,
      windows: state.openings.filter((o) => o.kind === 'window').length,
      items: state.items.length,
      stairs: state.stairs.length,
      floors: state.floors.length,
    },
  }
}

function fitsNow(state: StudioState, o: Opening, wallId: string) {
  const wall = state.walls.find((w) => w.id === wallId)
  return wall ? openingFits(o, wall, state.openings).ok : false
}

/** The square a hinged door sweeps as it opens (on its opening side), on the plan. */
export function doorSwing(state: StudioState, o: Opening) {
  const wall = state.walls.find((w) => w.id === o.wall)
  if (!wall) return null
  const d = wallDir(wall)
  const n = scale(wallNormal(wall), o.side === 'left' ? 1 : -1)
  const leaf = o.style === 'double' ? o.width / 2 : o.width
  const mid = pointAlong(wall, o.offset)
  const centre = add(mid, scale(n, wall.thickness / 2 + leaf / 2))
  const angle = (Math.atan2(d.y, d.x) * 180) / Math.PI
  return {
    floor: wall.floor,
    area: rectCorners(centre.x, centre.y, o.width, leaf, angle),
  }
}

/** A short plain summary of a room for reviews and the report, e.g. "Bedroom 1, 12.6 m², 3.2 × 3.9 m". */
export function describeRoom(r: RoomInfo): string {
  return `${r.name}, ${r.area.toFixed(1)} m² (${(r.width / 1000).toFixed(2)} × ${(r.depth / 1000).toFixed(2)} m)`
}

/** The middle of a room's outline (for labels). */
export const roomCentre = (room: Room) => centroid(room.outline)

export const distance = dist
