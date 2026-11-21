/**
 * Geometry of the building model: lengths, areas, where an opening sits on its
 * wall, whether it fits, the solid pieces a wall is built from around its
 * openings, and the shapes collision and checks use. Pure functions.
 */
import type { Item, Opening, Point, Room, StudioState, Wall } from './model'
import { catalogEntry } from './catalog'

export const EPS = 0.5 // mm: points closer than this are the same point

export const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)
export const samePoint = (a: Point, b: Point, eps = EPS) => dist(a, b) <= eps
export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k })
export const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y
export const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x

export const wallLength = (w: Pick<Wall, 'a' | 'b'>) => dist(w.a, w.b)

/** Unit vector from a to b (or along x for a zero-length wall). */
export function wallDir(w: Pick<Wall, 'a' | 'b'>): Point {
  const len = wallLength(w)
  return len < 1e-9 ? { x: 1, y: 0 } : scale(sub(w.b, w.a), 1 / len)
}

/** Unit normal pointing to the wall's left face (seen walking a → b on the plan). */
export function wallNormal(w: Pick<Wall, 'a' | 'b'>): Point {
  const d = wallDir(w)
  // Plan y runs down, so "left" of the direction (dx, dy) is (dy, −dx).
  return { x: d.y, y: -d.x }
}

/** The angle of a wall on the plan, in degrees (0 = along +x, clockwise positive). */
export const wallAngle = (w: Pick<Wall, 'a' | 'b'>) =>
  (Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) * 180) / Math.PI

export const pointAlong = (w: Pick<Wall, 'a' | 'b'>, t: number): Point =>
  add(w.a, scale(wallDir(w), t))

/** The closest point on segment ab to p: its distance along (0..len) and the gap. */
export function projectOnSegment(p: Point, a: Point, b: Point) {
  const len = dist(a, b)
  if (len < 1e-9) return { along: 0, point: a, distance: dist(p, a), len }
  const d = scale(sub(b, a), 1 / len)
  const along = Math.max(0, Math.min(len, dot(sub(p, a), d)))
  const point = add(a, scale(d, along))
  return { along, point, distance: dist(p, point), len }
}

/** Signed area of a polygon (positive when clockwise on the plan, y down). */
export function signedArea(points: Point[]): number {
  let s = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    s += p.x * q.y - q.x * p.y
  }
  return s / 2
}

/** Area in mm². */
export const polygonArea = (points: Point[]) => Math.abs(signedArea(points))

/** Square metres from mm², to two decimals. */
export const squareMetres = (mm2: number) => Math.round(mm2 / 10_000) / 100

export function centroid(points: Point[]): Point {
  const a = signedArea(points)
  if (Math.abs(a) < 1e-6) {
    const n = points.length
    return {
      x: points.reduce((s, p) => s + p.x, 0) / n,
      y: points.reduce((s, p) => s + p.y, 0) / n,
    }
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    const f = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * f
    cy += (p.y + q.y) * f
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside
  }
  return inside
}

export function bounds(points: Point[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/** A room's size: the width and depth of its outline's bounding box (mm). */
export function roomSize(room: Pick<Room, 'outline'>) {
  const b = bounds(room.outline)
  return { width: b.width, depth: b.height }
}

/** Whether the outline is an axis-aligned rectangle (so its size can be typed). */
export function isRectangle(outline: Point[]): boolean {
  if (outline.length !== 4) return false
  const b = bounds(outline)
  return outline.every(
    (p) =>
      (Math.abs(p.x - b.minX) < EPS || Math.abs(p.x - b.maxX) < EPS) &&
      (Math.abs(p.y - b.minY) < EPS || Math.abs(p.y - b.maxY) < EPS),
  )
}

// ---------------------------------------------------------------- openings

/** Where an opening runs along its wall: from start to end (mm from a). */
export function openingSpan(o: Pick<Opening, 'offset' | 'width'>) {
  return { start: o.offset - o.width / 2, end: o.offset + o.width / 2 }
}

/** Space kept clear at a wall's ends and between openings (mm). */
export const OPENING_MARGIN = 50

/**
 * Whether an opening fits on its wall: within its length (leaving the
 * thickness of the walls it meets), under its height, clear of the others.
 * Returns the reason when it does not.
 */
export function openingFits(
  opening: Pick<Opening, 'id' | 'offset' | 'width' | 'height' | 'sill' | 'kind'>,
  wall: Wall,
  others: Opening[],
): { ok: true } | { ok: false; reason: string } {
  const len = wallLength(wall)
  const { start, end } = openingSpan(opening)
  const margin = wall.thickness / 2 + OPENING_MARGIN
  if (opening.width > len - 2 * margin)
    return {
      ok: false,
      reason: `The wall is too short for a ${opening.width} mm opening.`,
    }
  if (start < margin || end > len - margin)
    return { ok: false, reason: 'It runs past the end of the wall.' }
  if (opening.sill + opening.height > wall.height)
    return { ok: false, reason: `It is taller than the wall (${wall.height} mm).` }
  for (const other of others) {
    if (other.id === opening.id || other.wall !== wall.id) continue
    const s = openingSpan(other)
    if (start < s.end + OPENING_MARGIN && end > s.start - OPENING_MARGIN)
      return { ok: false, reason: 'It overlaps another door or window.' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------- walls in 3D

/** How far each end of a wall is extended so corners close (half the thickness of a wall joined there). */
export function wallEndExtensions(wall: Wall, walls: Wall[]) {
  const joinedAt = (p: Point) =>
    walls.some(
      (w) =>
        w.id !== wall.id &&
        w.floor === wall.floor &&
        (samePoint(w.a, p) || samePoint(w.b, p)) &&
        // Not collinear (a straight continuation needs no extension).
        Math.abs(cross(wallDir(w), wallDir(wall))) > 0.01,
    )
  const ext = wall.thickness / 2
  return { start: joinedAt(wall.a) ? ext : 0, end: joinedAt(wall.b) ? ext : 0 }
}

/**
 * The solid boxes a wall is built from, in wall coordinates: `from`..`to`
 * along the wall (mm from a; may be negative at an extended start), and
 * `bottom`..`top` above the floor. Openings leave gaps; windows keep the piece
 * below the sill and above the head, doors and pass-throughs the piece above.
 */
export function wallPieces(wall: Wall, openings: Opening[], walls: Wall[] = []) {
  const len = wallLength(wall)
  const ext = wallEndExtensions(wall, walls)
  const own = openings
    .filter((o) => o.wall === wall.id)
    .map((o) => ({ ...openingSpan(o), o }))
    .sort((p, q) => p.start - q.start)
  const pieces: Array<{ from: number; to: number; bottom: number; top: number }> = []
  let cursor = -ext.start
  for (const { start, end, o } of own) {
    const s = Math.max(cursor, start)
    if (s > cursor) pieces.push({ from: cursor, to: s, bottom: 0, top: wall.height })
    const head = Math.min(wall.height, o.sill + o.height)
    if (o.sill > 0) pieces.push({ from: s, to: end, bottom: 0, top: o.sill })
    if (head < wall.height)
      pieces.push({ from: s, to: end, bottom: head, top: wall.height })
    cursor = Math.max(cursor, end)
  }
  if (cursor < len + ext.end)
    pieces.push({ from: cursor, to: len + ext.end, bottom: 0, top: wall.height })
  return pieces.filter((p) => p.to - p.from > 0.5 && p.top - p.bottom > 0.5)
}

// ---------------------------------------------------------------- furniture shapes

/** An item's size, from the catalogue unless overridden (mm). */
export function itemSize(item: Item) {
  const entry = catalogEntry(item.kind)
  return {
    width: item.width ?? entry?.width ?? 500,
    depth: item.depth ?? entry?.depth ?? 500,
    height: item.height ?? entry?.height ?? 500,
  }
}

/** The four corners of a rectangle centred at (x, y), turned by `rotation` degrees. */
export function rectCorners(
  x: number,
  y: number,
  w: number,
  d: number,
  rotation: number,
) {
  const r = (rotation * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ].map(([px, py]) => ({ x: x + px * c - py * s, y: y + px * s + py * c }))
}

export function itemCorners(item: Item) {
  const { width, depth } = itemSize(item)
  return rectCorners(item.x, item.y, width, depth, item.rotation)
}

/** Whether two convex polygons overlap (separating axis test), by more than `tolerance` mm. */
export function convexOverlap(p: Point[], q: Point[], tolerance = 1): boolean {
  for (const poly of [p, q]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]
      const axis = { x: -(b.y - a.y), y: b.x - a.x }
      const len = Math.hypot(axis.x, axis.y)
      if (len < 1e-9) continue
      const n = scale(axis, 1 / len)
      const range = (pts: Point[]) => {
        let min = Infinity
        let max = -Infinity
        for (const pt of pts) {
          const v = dot(pt, n)
          min = Math.min(min, v)
          max = Math.max(max, v)
        }
        return { min, max }
      }
      const r1 = range(p)
      const r2 = range(q)
      if (r1.max - tolerance <= r2.min || r2.max - tolerance <= r1.min) return false
    }
  }
  return true
}

/** The rectangle a wall occupies on the plan (its thickness about its centre line). */
export function wallRect(wall: Wall): Point[] {
  const n = scale(wallNormal(wall), wall.thickness / 2)
  return [add(wall.a, n), add(wall.b, n), sub(wall.b, n), sub(wall.a, n)]
}

// ---------------------------------------------------------------- collision

/**
 * Pushes a circle (the walker, radius r, in mm) out of the solid parts of the
 * walls on a floor. Gaps in walls (doors and pass-throughs, and the space above
 * a low window sill is still solid) let it through. Returns the corrected position.
 */
export function collide(
  p: Point,
  r: number,
  state: Pick<StudioState, 'walls' | 'openings'>,
  floor: string,
  extra: Point[][] = [],
): Point {
  let pos = { ...p }
  for (let pass = 0; pass < 3; pass++) {
    for (const wall of state.walls) {
      if (wall.floor !== floor) continue
      for (const piece of wallPieces(wall, state.openings, state.walls)) {
        // Only pieces that reach down to the floor block a walker.
        if (piece.bottom > 300) continue
        const d = wallDir(wall)
        const a = add(wall.a, scale(d, piece.from))
        const b = add(wall.a, scale(d, piece.to))
        const proj = projectOnSegment(pos, a, b)
        const minGap = r + wall.thickness / 2
        if (proj.distance < minGap) {
          const away =
            proj.distance > 1e-6
              ? scale(sub(pos, proj.point), 1 / proj.distance)
              : wallNormal(wall)
          pos = add(proj.point, scale(away, minGap))
        }
      }
    }
    for (const poly of extra) pos = pushOutOfPolygon(pos, r, poly)
  }
  return pos
}

/** Pushes a circle out of a convex polygon (furniture). */
export function pushOutOfPolygon(p: Point, r: number, poly: Point[]): Point {
  const inside = pointInPolygon(p, poly)
  let best = { distance: Infinity, point: p }
  for (let i = 0; i < poly.length; i++) {
    const proj = projectOnSegment(p, poly[i], poly[(i + 1) % poly.length])
    if (proj.distance < best.distance)
      best = { distance: proj.distance, point: proj.point }
  }
  if (!inside && best.distance >= r) return p
  const dir =
    best.distance > 1e-6 ? scale(sub(p, best.point), 1 / best.distance) : { x: 1, y: 0 }
  // From inside, go back out through the nearest edge.
  return add(best.point, scale(inside ? scale(dir, -1) : dir, r))
}
