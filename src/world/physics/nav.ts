/**
 * Finding a way round things: the floor as a grid of small cells, each free or
 * blocked for a body of a given radius, built from the same solid shapes the
 * player collides with, and a shortest route between two points (A*, then
 * straightened so the walk does not zig-zag). Used for walking to an activity
 * and by the people in the office. Pure, so it can be tested; built once per
 * set of shapes, not every frame.
 */
import { blocked, overlap, type Box } from '../character/controller'

export interface Grid {
  x0: number
  z0: number
  cell: number
  w: number
  h: number
  /** 1 = blocked. */
  cells: Uint8Array
  radius: number
}

export type Point = { x: number; z: number }

/** The area a set of shapes covers, with a margin. */
function bounds(boxes: Box[]): { x0: number; z0: number; x1: number; z1: number } {
  let x0 = Infinity
  let z0 = Infinity
  let x1 = -Infinity
  let z1 = -Infinity
  for (const b of boxes) {
    const r = Math.max(b.hx, b.hz) * (b.yaw ? Math.SQRT2 : 1)
    x0 = Math.min(x0, b.x - r)
    x1 = Math.max(x1, b.x + r)
    z0 = Math.min(z0, b.z - r)
    z1 = Math.max(z1, b.z + r)
  }
  if (!Number.isFinite(x0)) return { x0: -10, z0: -10, x1: 10, z1: 10 }
  return { x0: x0 - 1, z0: z0 - 1, x1: x1 + 1, z1: z1 + 1 }
}

export function buildGrid(boxes: Box[], radius: number, area = bounds(boxes)): Grid {
  // Fine enough to get between chairs; coarser for a long street.
  const extent = Math.max(area.x1 - area.x0, area.z1 - area.z0)
  const cell = Math.max(0.15, extent / 500)
  const w = Math.max(1, Math.ceil((area.x1 - area.x0) / cell))
  const h = Math.max(1, Math.ceil((area.z1 - area.z0) / cell))
  const cells = new Uint8Array(w * h)
  for (const b of boxes) {
    // Only the cells near each shape need testing.
    const r = Math.max(b.hx, b.hz) * (b.yaw ? Math.SQRT2 : 1) + radius
    const i0 = Math.max(0, Math.floor((b.x - r - area.x0) / cell))
    const i1 = Math.min(w - 1, Math.ceil((b.x + r - area.x0) / cell))
    const j0 = Math.max(0, Math.floor((b.z - r - area.z0) / cell))
    const j1 = Math.min(h - 1, Math.ceil((b.z + r - area.z0) / cell))
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const k = j * w + i
        if (cells[k]) continue
        const x = area.x0 + (i + 0.5) * cell
        const z = area.z0 + (j + 0.5) * cell
        if (overlap(x, z, radius, b)) cells[k] = 1
      }
  }
  return { x0: area.x0, z0: area.z0, cell, w, h, cells, radius }
}

const index = (g: Grid, p: Point) => {
  const i = Math.floor((p.x - g.x0) / g.cell)
  const j = Math.floor((p.z - g.z0) / g.cell)
  return i < 0 || j < 0 || i >= g.w || j >= g.h ? -1 : j * g.w + i
}
const centreOf = (g: Grid, k: number): Point => ({
  x: g.x0 + ((k % g.w) + 0.5) * g.cell,
  z: g.z0 + (Math.floor(k / g.w) + 0.5) * g.cell,
})

export function free(g: Grid, p: Point): boolean {
  const k = index(g, p)
  return k >= 0 && !g.cells[k]
}

/** The nearest free cell to a point (searching outwards up to `within` metres), or null. */
export function nearestFree(g: Grid, p: Point, within = 3): Point | null {
  if (free(g, p)) return p
  const ci = Math.floor((p.x - g.x0) / g.cell)
  const cj = Math.floor((p.z - g.z0) / g.cell)
  const rings = Math.ceil(within / g.cell)
  for (let r = 1; r <= rings; r++) {
    let best: Point | null = null
    let bestD = Infinity
    for (let j = cj - r; j <= cj + r; j++)
      for (let i = ci - r; i <= ci + r; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue
        if (i < 0 || j < 0 || i >= g.w || j >= g.h || g.cells[j * g.w + i]) continue
        const c = centreOf(g, j * g.w + i)
        const d = Math.hypot(c.x - p.x, c.z - p.z)
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
    if (best) return best
  }
  return null
}

/** Whether a straight walk between two points stays on free cells. */
export function clear(g: Grid, a: Point, b: Point): boolean {
  const d = Math.hypot(b.x - a.x, b.z - a.z)
  const n = Math.max(1, Math.ceil(d / (g.cell * 0.5)))
  for (let s = 0; s <= n; s++) {
    const t = s / n
    if (!free(g, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false
  }
  return true
}

/** A small binary heap of cell numbers by cost. */
class Heap {
  items: number[] = []
  costs: number[] = []
  push(item: number, cost: number) {
    const { items, costs } = this
    let i = items.length
    items.push(item)
    costs.push(cost)
    while (i > 0) {
      const up = (i - 1) >> 1
      if (costs[up] <= costs[i]) break
      ;[items[up], items[i]] = [items[i], items[up]]
      ;[costs[up], costs[i]] = [costs[i], costs[up]]
      i = up
    }
  }
  pop(): number {
    const { items, costs } = this
    const top = items[0]
    const lastItem = items.pop()!
    const lastCost = costs.pop()!
    if (items.length) {
      items[0] = lastItem
      costs[0] = lastCost
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < items.length && costs[l] < costs[m]) m = l
        if (r < items.length && costs[r] < costs[m]) m = r
        if (m === i) break
        ;[items[m], items[i]] = [items[i], items[m]]
        ;[costs[m], costs[i]] = [costs[i], costs[m]]
        i = m
      }
    }
    return top
  }
  get size() {
    return this.items.length
  }
}

/**
 * The way from `from` to `to` as points to walk through (ending at `to`, or
 * at the nearest free place to it if it is inside something), or null if
 * there is no way. A start inside something begins from the nearest free cell.
 */
export function findPath(g: Grid, from: Point, to: Point): Point[] | null {
  const start = nearestFree(g, from)
  const goal = nearestFree(g, to)
  if (!start || !goal) return null
  const s = index(g, start)
  const t = index(g, goal)
  if (s < 0 || t < 0) return null
  const tail = (goal === to ? [] : [goal]).concat([to])
  if (s === t || clear(g, start, goal)) return start === from ? tail : [start, ...tail]
  const cost = new Float32Array(g.w * g.h).fill(Infinity)
  const came = new Int32Array(g.w * g.h).fill(-1)
  const heap = new Heap()
  const goalC = centreOf(g, t)
  const guess = (k: number) => {
    const c = centreOf(g, k)
    return Math.hypot(c.x - goalC.x, c.z - goalC.z)
  }
  cost[s] = 0
  heap.push(s, guess(s))
  const steps: Array<[number, number, number]> = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ]
  let found = false
  // A limit, so a huge grid cannot take long.
  for (let visits = 0; heap.size && visits < 200_000; visits++) {
    const k = heap.pop()
    if (k === t) {
      found = true
      break
    }
    const i = k % g.w
    const j = Math.floor(k / g.w)
    for (const [di, dj, len] of steps) {
      const ni = i + di
      const nj = j + dj
      if (ni < 0 || nj < 0 || ni >= g.w || nj >= g.h) continue
      const n = nj * g.w + ni
      if (g.cells[n]) continue
      // No cutting a corner diagonally.
      if (di && dj && (g.cells[j * g.w + ni] || g.cells[nj * g.w + i])) continue
      const c = cost[k] + len * g.cell
      if (c < cost[n]) {
        cost[n] = c
        came[n] = k
        heap.push(n, c + guess(n))
      }
    }
  }
  if (!found) return null
  const cells: Point[] = []
  for (let k = t; k !== -1 && k !== s; k = came[k]) cells.push(centreOf(g, k))
  cells.reverse()
  // Straightened: from each point, on to the furthest one in plain view.
  const route: Point[] = []
  let at = start
  let i = 0
  while (i < cells.length) {
    let j = cells.length - 1
    while (j > i && !clear(g, at, cells[j])) j--
    at = cells[j]
    route.push(at)
    i = j + 1
  }
  route.pop()
  return [...(start === from ? [] : [start]), ...route, ...tail]
}

/** Whether a body of the grid's radius at this point is clear of every shape. */
export function standing(g: Grid, boxes: Box[], p: Point): boolean {
  return !blocked(p.x, p.z, g.radius, boxes)
}
