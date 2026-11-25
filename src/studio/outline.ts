/**
 * Outlines made of right angles (rooms drawn on a plan): the outer outline of
 * several rooms together, and an outline cut into rectangles. Roofs use them
 * to follow the building's real shape (an L-shaped house gets an L-shaped
 * roof). Pure geometry on a grid of the outlines' own coordinates.
 */
import { pointInPolygon, signedArea } from './geometry'
import type { Point } from './model'

const EPS = 0.5

/** Whether every edge of the outline runs along x or y. */
export function isRectilinear(outline: Point[]): boolean {
  return outline.every((p, i) => {
    const q = outline[(i + 1) % outline.length]
    return Math.abs(p.x - q.x) < EPS || Math.abs(p.y - q.y) < EPS
  })
}

const uniqueSorted = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.filter((v, i) => i === 0 || v - sorted[i - 1] > EPS)
}

/** The grid of cells between the outlines' coordinates, and which cells are inside. */
function cells(outlines: Point[][]) {
  const xs = uniqueSorted(outlines.flatMap((o) => o.map((p) => p.x)))
  const ys = uniqueSorted(outlines.flatMap((o) => o.map((p) => p.y)))
  const inside: boolean[][] = []
  for (let i = 0; i < xs.length - 1; i++) {
    inside.push([])
    for (let j = 0; j < ys.length - 1; j++) {
      const c = { x: (xs[i] + xs[i + 1]) / 2, y: (ys[j] + ys[j + 1]) / 2 }
      inside[i].push(outlines.some((o) => pointInPolygon(c, o)))
    }
  }
  return { xs, ys, inside }
}

/**
 * The outer outline of rectilinear outlines put together (clockwise on the
 * plan); the largest piece if they do not touch. Null if there is nothing.
 */
export function unionOutline(outlines: Point[][]): Point[] | null {
  if (outlines.length === 0) return null
  const { xs, ys, inside } = cells(outlines)
  const at = (i: number, j: number) => inside[i]?.[j] ?? false
  // The boundary edges, each running clockwise round the inside (plan y down).
  const key = (p: Point) => `${p.x},${p.y}`
  const next = new Map<string, Point[]>()
  const addEdge = (a: Point, b: Point) =>
    next.set(key(a), [...(next.get(key(a)) ?? []), b])
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < ys.length - 1; j++) {
      if (!at(i, j)) continue
      const [x0, x1, y0, y1] = [xs[i], xs[i + 1], ys[j], ys[j + 1]]
      if (!at(i, j - 1)) addEdge({ x: x0, y: y0 }, { x: x1, y: y0 })
      if (!at(i + 1, j)) addEdge({ x: x1, y: y0 }, { x: x1, y: y1 })
      if (!at(i, j + 1)) addEdge({ x: x1, y: y1 }, { x: x0, y: y1 })
      if (!at(i - 1, j)) addEdge({ x: x0, y: y1 }, { x: x0, y: y0 })
    }
  // Chain the edges into loops; keep the biggest.
  const loops: Point[][] = []
  for (;;) {
    const startKey = [...next.keys()].find((k) => (next.get(k) ?? []).length > 0)
    if (!startKey) break
    const [sx, sy] = startKey.split(',').map(Number)
    const loop: Point[] = [{ x: sx, y: sy }]
    let current = startKey
    for (let guard = 0; guard < 10_000; guard++) {
      const outs = next.get(current)!
      const to = outs.shift()!
      if (key(to) === startKey) break
      loop.push(to)
      current = key(to)
      if (!next.get(current)?.length) break
    }
    loops.push(loop)
  }
  const best = loops.sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)))[0]
  return best ? simplify(best) : null
}

/** Drops points in the middle of straight runs. */
export function simplify(loop: Point[]): Point[] {
  return loop.filter((p, i) => {
    const a = loop[(i - 1 + loop.length) % loop.length]
    const b = loop[(i + 1) % loop.length]
    return Math.abs((p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x)) > EPS
  })
}

export interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * A rectilinear outline cut into few rectangles: strips along x, then strips
 * that share the same span joined up, then the other way round, keeping the
 * cut with fewer rectangles.
 */
export function rectangles(outline: Point[]): Rect[] {
  const { xs, ys, inside } = cells([outline])
  const along = (horizontal: boolean): Rect[] => {
    const out: Rect[] = []
    const n = horizontal ? ys.length - 1 : xs.length - 1
    const m = horizontal ? xs.length - 1 : ys.length - 1
    let open: Rect[] = []
    for (let k = 0; k < n; k++) {
      // Runs of inside cells in this strip.
      const runs: Array<[number, number]> = []
      let start = -1
      for (let l = 0; l <= m; l++) {
        const isIn = l < m && (horizontal ? inside[l][k] : inside[k][l])
        if (isIn && start < 0) start = l
        if (!isIn && start >= 0) {
          runs.push([start, l])
          start = -1
        }
      }
      const strip = runs.map(([a, b]) =>
        horizontal
          ? { x0: xs[a], x1: xs[b], y0: ys[k], y1: ys[k + 1] }
          : { x0: xs[k], x1: xs[k + 1], y0: ys[a], y1: ys[b] },
      )
      const stillOpen: Rect[] = []
      for (const r of strip) {
        const same = open.find((o) =>
          horizontal
            ? Math.abs(o.x0 - r.x0) < EPS && Math.abs(o.x1 - r.x1) < EPS
            : Math.abs(o.y0 - r.y0) < EPS && Math.abs(o.y1 - r.y1) < EPS,
        )
        if (same) {
          if (horizontal) same.y1 = r.y1
          else same.x1 = r.x1
          stillOpen.push(same)
        } else stillOpen.push({ ...r })
      }
      for (const o of open) if (!stillOpen.includes(o)) out.push(o)
      open = stillOpen
    }
    return [...out, ...open]
  }
  const a = along(true)
  const b = along(false)
  return a.length <= b.length ? a : b
}
