/**
 * Reads a DXF plan as a new project. A plan exported by Space Studio comes
 * back with its floors, walls, rooms (named), doors, windows and labels; any
 * other plan gives a wall for every line and a room for every closed outline.
 * ASCII DXF (R12 to 2018): LINE, LWPOLYLINE, POLYLINE, ARC, TEXT and MTEXT,
 * in the drawing's units ($INSUNITS). Pure; never throws.
 */
import { pointInPolygon, projectOnSegment, wallDir } from './geometry'
import { StudioStateSchema, type Point, type RoomUse, type StudioState } from './model'
import { addOpening, addRoom, addWall, WALL_PRESETS } from './ops'

interface DxfEntity {
  type: string
  layer: string
  points: Point[]
  closed: boolean
  text?: string
  /** ARC: centre, radius, and its start and end angles (degrees, y up). */
  arc?: { c: Point; r: number; a1: number; a2: number }
}

/** The group code / value pairs of an ASCII DXF. */
export function dxfPairs(text: string): Array<[number, string]> {
  const lines = text.replace(/\r/g, '').split('\n')
  const out: Array<[number, string]> = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim())
    if (lines[i].trim() === '' || !Number.isFinite(code)) break
    out.push([code, lines[i + 1].trim()])
  }
  return out
}

/** Whether a file looks like a DXF drawing. */
export function isDxf(text: string): boolean {
  return /^\s*0\s*\r?\n\s*SECTION/.test(text) && /\bENTITIES\b/.test(text)
}

/** Millimetres per drawing unit, from $INSUNITS (millimetres when not stated). */
function dxfScale(pairs: Array<[number, string]>): number {
  const i = pairs.findIndex(([c, v]) => c === 9 && v === '$INSUNITS')
  const units = i >= 0 ? Number(pairs[i + 1]?.[1]) : 4
  const table: Record<number, number> = { 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000 }
  return table[units] ?? 1
}

function dxfEntities(pairs: Array<[number, string]>, unit: number): DxfEntity[] {
  const start = pairs.findIndex(([c, v]) => c === 2 && v === 'ENTITIES')
  if (start < 0) return []
  const out: DxfEntity[] = []
  // The plan's y runs down; the drawing's runs up.
  const P = (x = '0', y = '0'): Point => ({ x: Number(x) * unit, y: -Number(y) * unit })
  let i = start + 1
  while (i < pairs.length) {
    if (pairs[i][0] !== 0) {
      i++
      continue
    }
    const type = pairs[i][1]
    if (type === 'ENDSEC' || type === 'EOF') break
    const fields: Array<[number, string]> = []
    i++
    while (i < pairs.length && pairs[i][0] !== 0) fields.push(pairs[i++])
    const get = (c: number) => fields.find(([k]) => k === c)?.[1]
    const layer = get(8) ?? '0'
    if (type === 'LINE') {
      out.push({
        type,
        layer,
        closed: false,
        points: [P(get(10), get(20)), P(get(11), get(21))],
      })
    } else if (type === 'LWPOLYLINE') {
      const xs = fields.filter(([k]) => k === 10).map(([, v]) => v)
      const ys = fields.filter(([k]) => k === 20).map(([, v]) => v)
      out.push({
        type,
        layer,
        closed: (Number(get(70) ?? 0) & 1) === 1,
        points: xs.map((x, n) => P(x, ys[n])),
      })
    } else if (type === 'POLYLINE') {
      const closed = (Number(get(70) ?? 0) & 1) === 1
      const points: Point[] = []
      while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'SEQEND')) {
        if (pairs[i][0] === 0 && pairs[i][1] === 'VERTEX') {
          const vertex: Array<[number, string]> = []
          i++
          while (i < pairs.length && pairs[i][0] !== 0) vertex.push(pairs[i++])
          const v = (c: number) => vertex.find(([k]) => k === c)?.[1]
          points.push(P(v(10), v(20)))
        } else i++
      }
      out.push({ type, layer, closed, points })
    } else if (type === 'TEXT' || type === 'MTEXT') {
      const text = (get(1) ?? '').replace(/\\P/g, ' ').replace(/[{}]/g, '')
      out.push({ type, layer, closed: false, points: [P(get(10), get(20))], text })
    } else if (type === 'ARC') {
      const c = P(get(10), get(20))
      const arc = {
        c,
        r: Number(get(40) ?? 0) * unit,
        a1: Number(get(50) ?? 0),
        a2: Number(get(51) ?? 0),
      }
      out.push({ type, layer, closed: false, points: [c], arc })
    }
  }
  return out
}

const whole = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) })

function guessUse(name: string): RoomUse {
  const n = name.toLowerCase()
  if (/bed/.test(n)) return 'bedroom'
  if (/bath|shower/.test(n)) return 'bathroom'
  if (/\bwc\b|toilet/.test(n)) return 'wc'
  if (/kitchen/.test(n)) return 'kitchen'
  if (/living|lounge/.test(n)) return 'living'
  if (/dining/.test(n)) return 'dining'
  if (/hall|landing|corridor/.test(n)) return 'hall'
  if (/office|study/.test(n)) return 'office'
  if (/meeting/.test(n)) return 'meeting'
  if (/reception/.test(n)) return 'reception'
  if (/store|storage/.test(n)) return 'storage'
  return 'other'
}

export function projectFromDxf(
  text: string,
  name = 'Imported plan',
): { ok: true; state: StudioState } | { ok: false; error: string } {
  try {
    const pairs = dxfPairs(text)
    if (!pairs.some(([c, v]) => c === 2 && v === 'ENTITIES'))
      return {
        ok: false,
        error: 'This file is not a DXF drawing (it has no ENTITIES section).',
      }
    const all = dxfEntities(pairs, dxfScale(pairs))
    if (all.length === 0)
      return { ok: false, error: 'The drawing has nothing in it to import.' }
    const ours = all.some((e) => e.layer === 'SS-WALL-CL')
    let state = StudioStateSchema.parse({
      project: { name },
      floors: [{ id: 'f0', name: 'Ground floor', elevation: 0, height: 3000, slab: 200 }],
    })
    // Space Studio lays floors side by side, each under its title.
    const titles = ours
      ? all
          .filter((e) => e.layer === 'SS-TITLE' && e.text)
          .sort((a, b) => a.points[0].x - b.points[0].x)
      : []
    const parts: Array<DxfEntity | null> = titles.length ? titles : [null]
    parts.forEach((title, n) => {
      const id = n === 0 ? 'f0' : `f${n}`
      const level = title?.text?.match(/level (-?\d+)/)
      const titled = title?.text
        ? title.text.replace(/\s*\(level.*$/, '')
        : 'Ground floor'
      const floorName = titled.charAt(0) + titled.slice(1).toLowerCase()
      const dx = title ? title.points[0].x - titles[0].points[0].x : 0
      const x0 = title ? title.points[0].x - 1000 : -Infinity
      const next = titles[n + 1]
      const x1 = next ? next.points[0].x - 1000 : Infinity
      const mine = all.filter((e) => e.points.every((p) => p.x >= x0 && p.x < x1))
      const shift = (p: Point) => whole({ x: p.x - dx, y: p.y })
      const elevation = level ? Number(level[1]) : n * 3000
      if (n === 0) state.floors[0] = { ...state.floors[0], name: floorName, elevation }
      else state.floors.push({ id, name: floorName, elevation, height: 3000, slab: 200 })

      // Walls: Space Studio's centre lines, or every line of another drawing.
      for (const e of mine.filter((x) =>
        ours ? x.layer === 'SS-WALL-CL' : !x.text && !x.arc,
      )) {
        const pts = e.points.map(shift)
        const segments = pts.slice(0, -1).map((p, k) => [p, pts[k + 1]] as const)
        if (e.closed && pts.length > 2) segments.push([pts[pts.length - 1], pts[0]])
        for (const [a, b] of segments)
          if (Math.hypot(b.x - a.x, b.y - a.y) >= 100)
            state = addWall(state, id, a, b, WALL_PRESETS.interior).state
      }
      // Rooms: closed outlines, named by the text inside them (not their area).
      const outlines = mine
        .filter(
          (e) => e.closed && e.points.length >= 3 && (!ours || e.layer === 'SS-ROOM'),
        )
        .map((e) => e.points.map(shift))
      const texts = mine.filter(
        (e) => e.text && !/m²|\bm2\b/.test(e.text) && (!ours || e.layer === 'SS-TEXT'),
      )
      outlines.forEach((outline, k) => {
        const label = texts.find((t) => pointInPolygon(shift(t.points[0]), outline))
        const roomName = label?.text || `Room ${k + 1}`
        state = addRoom(state, id, outline, {
          name: roomName,
          use: guessUse(roomName),
        }).state
      })
      if (!ours) return
      // Doors and windows, on the walls they sit in.
      const walls = state.walls.filter((w) => w.floor === id)
      const nearest = (p: Point) =>
        walls
          .map((w) => ({ w, proj: projectOnSegment(p, w.a, w.b) }))
          .sort((a, b) => a.proj.distance - b.proj.distance)[0]
      for (const e of mine.filter((x) => x.layer === 'SS-WINDOW' && x.type === 'LINE')) {
        const [a, b] = e.points.map(shift)
        const hit = nearest({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
        // Of a window's three lines, the middle one lies on the wall's centre line.
        if (!hit || hit.proj.distance > 2) continue
        const width = Math.round(Math.hypot(b.x - a.x, b.y - a.y))
        state = addOpening(state, hit.w.id, hit.proj.along, {
          kind: 'window',
          width,
          height: 1200,
          sill: 900,
          style: 'casement',
        }).state
      }
      for (const e of mine.filter((x) => x.layer === 'SS-DOOR' && x.arc)) {
        const { c, r, a1, a2 } = e.arc!
        const hinge = shift(c)
        const hit = nearest(hinge)
        if (!hit || hit.proj.distance > hit.w.thickness) continue
        // The door runs from its hinge along the wall, towards the end of its swing that lies on the wall.
        const ends = [a1, a2].map((deg) => {
          const t = (deg * Math.PI) / 180
          return { x: hinge.x + Math.cos(t) * r, y: hinge.y - Math.sin(t) * r }
        })
        const onWall = ends.sort(
          (p, q) =>
            projectOnSegment(p, hit.w.a, hit.w.b).distance -
            projectOnSegment(q, hit.w.a, hit.w.b).distance,
        )[0]
        const d = wallDir(hit.w)
        const towards =
          Math.sign((onWall.x - hinge.x) * d.x + (onWall.y - hinge.y) * d.y) || 1
        const width = Math.round(r)
        state = addOpening(state, hit.w.id, hit.proj.along + (towards * width) / 2, {
          kind: 'door',
          width,
          height: 2040,
          sill: 0,
          style: 'single',
        }).state
      }
      // Labels: text not inside a room.
      for (const e of mine.filter((x) => x.layer === 'SS-TEXT' && x.text)) {
        const at = shift(e.points[0])
        if (outlines.some((o) => pointInPolygon(at, o))) continue
        state = {
          ...state,
          labels: [
            ...state.labels,
            { id: `l-${id}-${state.labels.length + 1}`, floor: id, ...at, text: e.text! },
          ],
        }
      }
    })
    if (state.walls.length === 0)
      return { ok: false, error: 'No walls could be read from the drawing.' }
    return { ok: true, state: StudioStateSchema.parse(state) }
  } catch {
    return { ok: false, error: 'The drawing could not be read.' }
  }
}
