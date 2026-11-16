/**
 * Drawings: a design as a DXF plan (for CAD Craft, or any CAD program), and
 * a DXF plan read back as a design. This is how a wall moved, a window
 * drawn or a column added in CAD Craft becomes the wall, window or column
 * the site builds.
 *
 * The layers are the contract (docs/ENGINEERING_PROJECTS.md):
 *
 *   WS-OUTLINE   the walls' centreline: one closed polyline        (read)
 *   WS-DOOR      a door: a line along the wall, end to end         (read)
 *   WS-WINDOW    a window: the same                                (read)
 *   WS-COLUMN    a column: a circle at its centre                  (read)
 *   WS-TAG       labels: "D1 H2100", "W2 H1050 S1200", "C1 NB-150" (read)
 *   WS-SPEC      the specification: "WALL THICKNESS 215" …         (read)
 *   WS-DECK, WS-GIRDER (a bridge's deck outline and girder lines)  (read)
 *   WS-WALL, WS-FOUNDATION, WS-GRID, WS-DIM, WS-TITLE              (drawn only)
 *
 * Writes ASCII DXF R12 (millimetres); reads R12 to 2018 ASCII DXF (the
 * entities above as LINE, LWPOLYLINE or POLYLINE, CIRCLE, TEXT and MTEXT).
 * Pure TypeScript.
 */
import {
  DESIGN_FORMAT,
  DESIGN_VERSION,
  bounds,
  walls,
  type BridgeDesign,
  type BuildingDesign,
  type Column,
  type Design,
  type Opening,
} from '../design'
import { sectionDepth } from '../checks'

export const LAYERS: Record<string, { color: number; linetype?: string; note: string }> =
  {
    'WS-OUTLINE': { color: 7, note: 'Wall centreline (closed polyline)' },
    'WS-WALL': { color: 8, note: 'Wall faces' },
    'WS-DOOR': { color: 3, note: 'Doors: a line along the wall' },
    'WS-WINDOW': { color: 5, note: 'Windows: a line along the wall' },
    'WS-COLUMN': { color: 1, note: 'Columns: a circle at the centre' },
    'WS-TAG': { color: 2, note: 'Labels: id, height, sill, storey, section' },
    'WS-SPEC': { color: 6, note: 'Specification lines' },
    'WS-FOUNDATION': { color: 8, linetype: 'DASHED', note: 'Foundation edges' },
    'WS-GRID': { color: 9, linetype: 'DASHED', note: 'Grid' },
    'WS-DIM': { color: 4, note: 'Dimensions' },
    'WS-TITLE': { color: 7, note: 'Title block' },
    'WS-DECK': { color: 7, note: 'Bridge deck outline' },
    'WS-GIRDER': { color: 1, note: 'Bridge girders' },
    'WS-ABUTMENT': { color: 8, note: 'Abutments' },
  }

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

class Writer {
  private out: string[] = []
  pair(code: number, value: string | number) {
    this.out.push(
      String(code),
      typeof value !== 'number'
        ? value
        : integerCode(code)
          ? String(Math.round(value))
          : fmt(value),
    )
  }
  text(): string {
    return `${this.out.join('\r\n')}\r\n`
  }
}

/** DXF group codes whose values are integers (flags, colours, counts). */
function integerCode(code: number): boolean {
  return (
    (code >= 60 && code <= 99) ||
    (code >= 170 && code <= 179) ||
    (code >= 270 && code <= 289) ||
    (code >= 370 && code <= 389) ||
    (code >= 400 && code <= 409)
  )
}

function fmt(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : String(Math.round(n * 1000) / 1000)
}

function line(w: Writer, layer: string, x1: number, y1: number, x2: number, y2: number) {
  w.pair(0, 'LINE')
  w.pair(8, layer)
  w.pair(10, x1)
  w.pair(20, y1)
  w.pair(30, 0)
  w.pair(11, x2)
  w.pair(21, y2)
  w.pair(31, 0)
}

function circle(w: Writer, layer: string, x: number, y: number, r: number) {
  w.pair(0, 'CIRCLE')
  w.pair(8, layer)
  w.pair(10, x)
  w.pair(20, y)
  w.pair(30, 0)
  w.pair(40, r)
}

function text(
  w: Writer,
  layer: string,
  x: number,
  y: number,
  height: number,
  value: string,
  rotation = 0,
) {
  w.pair(0, 'TEXT')
  w.pair(8, layer)
  w.pair(10, x)
  w.pair(20, y)
  w.pair(30, 0)
  w.pair(40, height)
  w.pair(1, value)
  if (rotation) w.pair(50, rotation)
}

function polyline(
  w: Writer,
  layer: string,
  points: Array<[number, number]>,
  closed: boolean,
) {
  w.pair(0, 'POLYLINE')
  w.pair(8, layer)
  w.pair(66, 1)
  w.pair(10, 0)
  w.pair(20, 0)
  w.pair(30, 0)
  w.pair(70, closed ? 1 : 0)
  for (const [x, y] of points) {
    w.pair(0, 'VERTEX')
    w.pair(8, layer)
    w.pair(10, x)
    w.pair(20, y)
    w.pair(30, 0)
  }
  w.pair(0, 'SEQEND')
  w.pair(8, layer)
}

/** A dimension drawn as lines and its figure (plain entities every program reads). */
function dimension(
  w: Writer,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number,
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1) return
  const nx = -dy / len
  const ny = dx / len
  const ax = x1 + nx * offset
  const ay = y1 + ny * offset
  const bx = x2 + nx * offset
  const by = y2 + ny * offset
  line(w, 'WS-DIM', x1, y1, ax + nx * 150, ay + ny * 150)
  line(w, 'WS-DIM', x2, y2, bx + nx * 150, by + ny * 150)
  line(w, 'WS-DIM', ax, ay, bx, by)
  for (const [px, py] of [
    [ax, ay],
    [bx, by],
  ])
    line(w, 'WS-DIM', px - 60, py - 60, px + 60, py + 60)
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  const upright = angle > 90 || angle < -90 ? angle + 180 : angle
  text(
    w,
    'WS-DIM',
    (ax + bx) / 2 + nx * 120,
    (ay + by) / 2 + ny * 120,
    180,
    String(Math.round(len)),
    upright,
  )
}

function header(w: Writer, extents: { x0: number; y0: number; x1: number; y1: number }) {
  w.pair(0, 'SECTION')
  w.pair(2, 'HEADER')
  w.pair(9, '$ACADVER')
  w.pair(1, 'AC1009')
  w.pair(9, '$INSUNITS')
  w.pair(70, 4)
  w.pair(9, '$EXTMIN')
  w.pair(10, extents.x0)
  w.pair(20, extents.y0)
  w.pair(9, '$EXTMAX')
  w.pair(10, extents.x1)
  w.pair(20, extents.y1)
  w.pair(0, 'ENDSEC')
  w.pair(0, 'SECTION')
  w.pair(2, 'TABLES')
  w.pair(0, 'TABLE')
  w.pair(2, 'LTYPE')
  w.pair(70, 2)
  w.pair(0, 'LTYPE')
  w.pair(2, 'CONTINUOUS')
  w.pair(70, 0)
  w.pair(3, 'Solid line')
  w.pair(72, 65)
  w.pair(73, 0)
  w.pair(40, 0)
  w.pair(0, 'LTYPE')
  w.pair(2, 'DASHED')
  w.pair(70, 0)
  w.pair(3, '__ __ __ __')
  w.pair(72, 65)
  w.pair(73, 2)
  w.pair(40, 300)
  w.pair(49, 200)
  w.pair(49, -100)
  w.pair(0, 'ENDTAB')
  w.pair(0, 'TABLE')
  w.pair(2, 'LAYER')
  w.pair(70, Object.keys(LAYERS).length + 1)
  w.pair(0, 'LAYER')
  w.pair(2, '0')
  w.pair(70, 0)
  w.pair(62, 7)
  w.pair(6, 'CONTINUOUS')
  for (const [name, l] of Object.entries(LAYERS)) {
    w.pair(0, 'LAYER')
    w.pair(2, name)
    w.pair(70, 0)
    w.pair(62, l.color)
    w.pair(6, l.linetype ?? 'CONTINUOUS')
  }
  w.pair(0, 'ENDTAB')
  w.pair(0, 'ENDSEC')
  w.pair(0, 'SECTION')
  w.pair(2, 'ENTITIES')
}

function footer(w: Writer) {
  w.pair(0, 'ENDSEC')
  w.pair(0, 'EOF')
}

export interface DrawingInfo {
  project: string
  client: string
  revision: number
  /** e.g. "Approved", "Draft". */
  status: string
}

function titleBlock(w: Writer, x: number, y: number, info: DrawingInfo, drawing: string) {
  const W = 9000
  const H = 2600
  polyline(
    w,
    'WS-TITLE',
    [
      [x, y],
      [x + W, y],
      [x + W, y + H],
      [x, y + H],
    ],
    true,
  )
  line(w, 'WS-TITLE', x, y + H - 700, x + W, y + H - 700)
  text(w, 'WS-TITLE', x + 200, y + H - 500, 300, 'NORTHBANK ENGINEERING LTD')
  text(w, 'WS-TITLE', x + 200, y + H - 1100, 260, info.project.toUpperCase())
  text(w, 'WS-TITLE', x + 200, y + H - 1500, 200, `Client: ${info.client}`)
  text(
    w,
    'WS-TITLE',
    x + 200,
    y + H - 1900,
    200,
    `${drawing} - Revision ${info.revision} - ${info.status}`,
  )
  text(
    w,
    'WS-TITLE',
    x + 200,
    y + 200,
    160,
    'Dimensions in mm. WorkSim simulation, not for construction.',
  )
}

function specLines(design: BuildingDesign): string[] {
  return [
    `WALL THICKNESS ${design.wall.thickness}`,
    `WALL HEIGHT ${design.wall.height}`,
    `WALL MATERIAL ${design.wall.material.toUpperCase()}`,
    `STOREYS ${design.storeys}`,
    `BEAM ${design.beam.section}`,
    `FOUNDATION ${design.foundation.type.toUpperCase()} WIDTH ${design.foundation.width} DEPTH ${design.foundation.depth}`,
    `SLAB ${design.slab.thickness}`,
    `ROOF ${design.roof.type.toUpperCase()}${design.roof.type === 'pitched' ? ` PITCH ${design.roof.pitch}` : ''}`,
    `CIRCUITS ${design.services.circuits}`,
    `SANITARY ${design.services.sanitary}`,
    `HVAC ${design.services.hvac}`,
  ]
}

function openingTag(o: Opening): string {
  return `${o.id} H${o.height}${o.kind === 'window' ? ` S${o.sill}` : ''}${o.storey ? ` F${o.storey}` : ''}`
}

/** Offset a closed outline by `d` (positive: outwards), for square-cornered outlines. */
export function offsetOutline(
  outline: Array<[number, number]>,
  d: number,
): Array<[number, number]> {
  const n = outline.length
  const ccw =
    outline.reduce((s, [x0, y0], i) => {
      const [x1, y1] = outline[(i + 1) % n]
      return s + x0 * y1 - x1 * y0
    }, 0) > 0
  const sign = ccw ? 1 : -1
  return outline.map((p, i) => {
    const prev = outline[(i - 1 + n) % n]
    const next = outline[(i + 1) % n]
    const n1 = normal(prev, p)
    const n2 = normal(p, next)
    // Outward normals for an anticlockwise outline point right of travel.
    const bx = n1[0] + n2[0]
    const by = n1[1] + n2[1]
    const dot = n1[0] * n2[0] + n1[1] * n2[1]
    const k = (d * sign) / (1 + dot || 1)
    return [p[0] + bx * k, p[1] + by * k] as [number, number]
  })
}

function normal(a: [number, number], b: [number, number]): [number, number] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  return [dy / len, -dx / len]
}

function writeBuilding(w: Writer, d: BuildingDesign, info: DrawingInfo) {
  const outline = d.outline.map(([x, y]) => [x, y] as [number, number])
  const b = bounds(outline)
  // Grid lines through the corners.
  const xs = [...new Set(outline.map((p) => p[0]))].sort((p, q) => p - q)
  const ys = [...new Set(outline.map((p) => p[1]))].sort((p, q) => p - q)
  xs.forEach((x, i) => {
    line(w, 'WS-GRID', x, b.y0 - 2500, x, b.y1 + 1500)
    circle(w, 'WS-GRID', x, b.y0 - 2900, 400)
    text(w, 'WS-GRID', x - 120, b.y0 - 3020, 250, String(i + 1))
  })
  ys.forEach((y, i) => {
    line(w, 'WS-GRID', b.x0 - 2500, y, b.x1 + 1500, y)
    circle(w, 'WS-GRID', b.x0 - 2900, y, 400)
    text(w, 'WS-GRID', b.x0 - 3020, y - 120, 250, String.fromCharCode(65 + i))
  })
  polyline(w, 'WS-OUTLINE', outline, true)
  const t = d.wall.thickness / 2
  polyline(w, 'WS-WALL', offsetOutline(outline, t), true)
  polyline(w, 'WS-WALL', offsetOutline(outline, -t), true)
  const f = d.foundation.width / 2
  polyline(w, 'WS-FOUNDATION', offsetOutline(outline, f), true)
  polyline(w, 'WS-FOUNDATION', offsetOutline(outline, -f), true)
  const edges = walls(d)
  for (const o of d.openings) {
    const e = edges[o.wall]
    if (!e) continue
    const s = o.offset - o.width / 2
    const x1 = e.a[0] + e.dir[0] * s
    const y1 = e.a[1] + e.dir[1] * s
    const x2 = x1 + e.dir[0] * o.width
    const y2 = y1 + e.dir[1] * o.width
    line(w, o.kind === 'door' ? 'WS-DOOR' : 'WS-WINDOW', x1, y1, x2, y2)
    // The tag sits inside the building, beside the opening.
    const nx = -e.dir[1]
    const ny = e.dir[0]
    const inward = signedOutline(outline) > 0 ? 1 : -1
    text(
      w,
      'WS-TAG',
      (x1 + x2) / 2 + nx * inward * (t + 350) - e.dir[0] * 400,
      (y1 + y2) / 2 + ny * inward * (t + 350) - e.dir[1] * 400,
      200,
      openingTag(o),
    )
    if (o.kind === 'door') {
      // The door's swing, inwards.
      const r = Math.min(o.width, 1200)
      line(w, 'WS-TAG', x1, y1, x1 + nx * inward * r, y1 + ny * inward * r)
    }
  }
  for (const c of d.columns) {
    circle(w, 'WS-COLUMN', c.x, c.y, 150)
    text(w, 'WS-TAG', c.x + 250, c.y + 250, 200, `${c.id} ${c.section}`)
  }
  // Overall dimensions and each wall's length.
  dimension(w, b.x0, b.y0, b.x1, b.y0, -1800)
  dimension(w, b.x1, b.y0, b.x1, b.y1, -1800)
  for (const e of edges)
    dimension(w, e.a[0], e.a[1], e.b[0], e.b[1], signedOutline(outline) > 0 ? -900 : 900)
  // The specification, at the side.
  specLines(d).forEach((s, i) => text(w, 'WS-SPEC', b.x1 + 3000, b.y1 - i * 400, 220, s))
  titleBlock(w, b.x1 + 3000, b.y0 - 4000, info, 'General arrangement plan')
}

function signedOutline(outline: Array<[number, number]>): number {
  return outline.reduce((s, [x0, y0], i) => {
    const [x1, y1] = outline[(i + 1) % outline.length]
    return s + x0 * y1 - x1 * y0
  }, 0)
}

function writeBridge(w: Writer, d: BridgeDesign, info: DrawingInfo) {
  const half = d.span / 2
  const hw = d.width / 2
  // Plan: the deck, the girders under it, the abutments either side.
  polyline(
    w,
    'WS-DECK',
    [
      [-half, -hw],
      [half, -hw],
      [half, hw],
      [-half, hw],
    ],
    true,
  )
  for (let i = 0; i < d.girders.count; i++) {
    const y = -hw + (d.width * (i + 0.5)) / d.girders.count
    line(w, 'WS-GIRDER', -half - 400, y, half + 400, y)
  }
  text(w, 'WS-TAG', -half + 300, hw + 400, 220, `GIRDERS ${d.girders.section}`)
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -half - d.abutment.base : half
    polyline(
      w,
      'WS-ABUTMENT',
      [
        [x0, -hw - 500],
        [x0 + d.abutment.base, -hw - 500],
        [x0 + d.abutment.base, hw + 500],
        [x0, hw + 500],
      ],
      true,
    )
  }
  dimension(w, -half, -hw, half, -hw, -1500)
  dimension(w, half, -hw, half, hw, -1200)
  // Elevation, below the plan.
  const ey = -hw - 6000
  line(w, 'WS-WALL', -half, ey, half, ey)
  line(
    w,
    'WS-WALL',
    -half,
    ey - sectionDepth(d.girders.section),
    half,
    ey - sectionDepth(d.girders.section),
  )
  line(w, 'WS-WALL', -half, ey + d.parapet.height, half, ey + d.parapet.height)
  text(w, 'WS-DIM', -half, ey + d.parapet.height + 250, 200, 'ELEVATION')
  const spec = [
    `DECK THICKNESS ${d.deck.thickness}`,
    `PARAPET HEIGHT ${d.parapet.height}`,
    `ABUTMENT HEIGHT ${d.abutment.height} BASE ${d.abutment.base}`,
  ]
  spec.forEach((s, i) =>
    text(w, 'WS-SPEC', half + d.abutment.base + 2500, hw - i * 400, 220, s),
  )
  titleBlock(w, half + d.abutment.base + 2500, ey - 2000, info, 'General arrangement')
}

/** The design as a DXF drawing (ASCII, R12, millimetres). */
export function designToDxf(design: Design, info: DrawingInfo): string {
  const w = new Writer()
  if (design.kind === 'building') {
    const b = bounds(design.outline)
    header(w, { x0: b.x0 - 4000, y0: b.y0 - 4500, x1: b.x1 + 12500, y1: b.y1 + 2000 })
    writeBuilding(w, design, info)
  } else {
    const half = design.span / 2 + design.abutment.base
    header(w, {
      x0: -half - 1000,
      y0: -design.width - 9000,
      x1: half + 12000,
      y1: design.width + 1500,
    })
    writeBridge(w, design, info)
  }
  footer(w)
  return w.text()
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

interface Entity {
  type: string
  layer: string
  /** Points in order (a line's two ends, a polyline's vertices, a circle's or text's position). */
  points: Array<[number, number]>
  closed: boolean
  radius: number
  value: string
}

export type DxfRead =
  { ok: true; design: Design; notes: string[] } | { ok: false; error: string }

/** The (code, value) pairs of an ASCII DXF. */
function pairs(source: string): Array<[number, string]> {
  const lines = source.split(/\r?\n/)
  const out: Array<[number, string]> = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim())
    if (!Number.isFinite(code)) throw new Error(`line ${i + 1} is not a group code`)
    out.push([code, lines[i + 1]])
  }
  return out
}

const UNITS: Record<number, number> = { 0: 1, 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000 }

/** The entities of an ASCII DXF, in millimetres. */
export function readEntities(source: string): { entities: Entity[]; scale: number } {
  if (source.startsWith('AutoCAD Binary DXF'))
    throw new Error('this is a binary DXF: save it as an ASCII DXF')
  const all = pairs(source)
  let scale = 1
  const unitsAt = all.findIndex(([c, v]) => c === 9 && v.trim() === '$INSUNITS')
  if (unitsAt >= 0) scale = UNITS[Number(all[unitsAt + 1]?.[1])] ?? 1
  const start = all.findIndex(
    ([c, v], i) =>
      c === 2 && v.trim() === 'ENTITIES' && all[i - 1]?.[1].trim() === 'SECTION',
  )
  if (start < 0) throw new Error('there is no ENTITIES section')
  const entities: Entity[] = []
  let current: Entity | null = null
  let poly: Entity | null = null
  const flush = () => {
    if (current && current.type !== 'VERTEX' && current.type !== 'SEQEND')
      entities.push(current)
    current = null
  }
  for (let i = start + 1; i < all.length; i++) {
    const [code, raw] = all[i]
    const value = raw.trim()
    if (code === 0) {
      // A vertex just read belongs to its polyline.
      if (current?.type === 'VERTEX' && poly) {
        poly.points.push(...current.points)
        current = null
      }
      if (value === 'VERTEX' && poly) {
        current = {
          type: 'VERTEX',
          layer: poly.layer,
          points: [],
          closed: false,
          radius: 0,
          value: '',
        }
        continue
      }
      if (value === 'SEQEND' && poly) {
        current = null
        entities.push(poly)
        poly = null
        continue
      }
      flush()
      if (value === 'ENDSEC' || value === 'EOF') break
      current = {
        type: value,
        layer: '0',
        points: [],
        closed: false,
        radius: 0,
        value: '',
      }
      if (value === 'POLYLINE') {
        poly = current
        current = null
      }
      continue
    }
    const target = current ?? poly
    if (!target) continue
    // A POLYLINE's own point is only its elevation; its corners are its VERTEXes.
    const header = !current && target === poly
    if (code === 8) target.layer = value
    else if (code === 10 && !header) target.points.push([Number(value) * scale, NaN])
    else if (code === 20 && !header) {
      const last = target.points[target.points.length - 1]
      if (last && Number.isNaN(last[1])) last[1] = Number(value) * scale
    } else if (code === 11 && (target.type === 'LINE' || target.type === 'TEXT')) {
      target.points.push([Number(value) * scale, NaN])
    } else if (code === 21 && (target.type === 'LINE' || target.type === 'TEXT')) {
      const last = target.points[target.points.length - 1]
      if (last && Number.isNaN(last[1])) last[1] = Number(value) * scale
    } else if (code === 40 && target.type === 'CIRCLE')
      target.radius = Number(value) * scale
    else if (code === 70 && (target.type === 'LWPOLYLINE' || target.type === 'POLYLINE'))
      target.closed = (Number(value) & 1) === 1
    else if (code === 1 || code === 3) target.value += raw
  }
  flush()
  return {
    entities: entities.filter((e) =>
      e.points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])),
    ),
    scale,
  }
}

/** Text without MTEXT's formatting codes. */
export function plainText(value: string): string {
  return value
    .replace(/\\P/g, ' ')
    .replace(/\\[A-Za-z][^;]*;/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const snap = (n: number) => Math.round(n / 5) * 5

function textsOn(entities: Entity[], layer: string) {
  return entities
    .filter(
      (e) => e.layer.toUpperCase() === layer && (e.type === 'TEXT' || e.type === 'MTEXT'),
    )
    .map((e) => ({ at: e.points[0], value: plainText(e.value).toUpperCase() }))
}

function num(text: string, re: RegExp): number | undefined {
  const m = text.match(re)
  return m ? Number(m[1]) : undefined
}

function readSpec(texts: string[], base: BuildingDesign): BuildingDesign {
  const all = texts.join('\n')
  const material = all.match(/WALL MATERIAL ([A-Z-]+)/)?.[1]?.toLowerCase()
  const roof = all.match(/ROOF (FLAT|PITCHED)(?: PITCH (\d+(?:\.\d+)?))?/)
  const foundation = all.match(
    /FOUNDATION (STRIP|PAD|RAFT)(?: WIDTH (\d+))?(?: DEPTH (\d+))?/,
  )
  const known = ['blockwork', 'brick', 'timber-frame', 'cladding'] as const
  return {
    ...base,
    wall: {
      thickness: num(all, /WALL THICKNESS (\d+)/) ?? base.wall.thickness,
      height: num(all, /WALL HEIGHT (\d+)/) ?? base.wall.height,
      material: known.find((k) => k === material) ?? base.wall.material,
    },
    storeys: num(all, /STOREYS (\d+)/) ?? base.storeys,
    beam: { section: all.match(/BEAM (NB-\d+)/)?.[1] ?? base.beam.section },
    foundation: foundation
      ? {
          type: foundation[1].toLowerCase() as BuildingDesign['foundation']['type'],
          width: foundation[2] ? Number(foundation[2]) : base.foundation.width,
          depth: foundation[3] ? Number(foundation[3]) : base.foundation.depth,
        }
      : base.foundation,
    slab: { thickness: num(all, /SLAB (\d+)/) ?? base.slab.thickness },
    roof: roof
      ? {
          type: roof[1].toLowerCase() as BuildingDesign['roof']['type'],
          pitch: roof[1] === 'PITCHED' ? Number(roof[2] ?? base.roof.pitch) : 0,
        }
      : base.roof,
    services: {
      circuits: num(all, /CIRCUITS (\d+)/) ?? base.services.circuits,
      sanitary: num(all, /SANITARY (\d+)/) ?? base.services.sanitary,
      hvac: num(all, /HVAC (\d+)/) ?? base.services.hvac,
    },
  }
}

function readBuilding(entities: Entity[], base: BuildingDesign): DxfRead {
  const notes: string[] = []
  const outlines = entities.filter(
    (e) =>
      e.layer.toUpperCase() === 'WS-OUTLINE' &&
      (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE'),
  )
  const closed = outlines
    .filter(
      (e) =>
        e.closed ||
        (e.points.length > 3 && same(e.points[0], e.points[e.points.length - 1])),
    )
    .sort((a, b) => area(b.points) - area(a.points))
  if (!closed.length)
    return {
      ok: false,
      error: 'There is no closed polyline on layer WS-OUTLINE (the walls’ centreline).',
    }
  let outline = closed[0].points.map(([x, y]) => [snap(x), snap(y)] as [number, number])
  if (same(outline[0], outline[outline.length - 1])) outline = outline.slice(0, -1)
  outline = outline.filter((p, i) => !same(p, outline[(i + 1) % outline.length]))
  if (outline.length < 3)
    return { ok: false, error: 'The outline needs at least three corners.' }
  if (closed.length > 1) notes.push('More than one outline: the largest is the building.')

  let design: BuildingDesign = readSpec(
    textsOn(entities, 'WS-SPEC').map((t) => t.value),
    { ...base, outline },
  )
  const edges = walls(design)
  const tags = textsOn(entities, 'WS-TAG')
  const nearTag = (x: number, y: number, prefix: string) => {
    let best: { value: string; d: number } | null = null
    for (const t of tags) {
      if (!t.value.startsWith(prefix)) continue
      const d = Math.hypot(t.at[0] - x, t.at[1] - y)
      if (d < 2500 && (!best || d < best.d)) best = { value: t.value, d }
    }
    return best?.value ?? null
  }

  // Openings: lines along a wall.
  const openings: Opening[] = []
  const used = new Set<string>()
  const baseById = new Map(base.openings.map((o) => [o.id, o]))
  const segments = entities.filter(
    (e) =>
      (e.layer.toUpperCase() === 'WS-DOOR' || e.layer.toUpperCase() === 'WS-WINDOW') &&
      (e.type === 'LINE' || e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') &&
      e.points.length >= 2,
  )
  const tolerance = design.wall.thickness / 2 + 60
  const found: Array<{
    kind: Opening['kind']
    wall: number
    offset: number
    width: number
    tag: string | null
    id: string | null
  }> = []
  for (const seg of segments) {
    const kind: Opening['kind'] =
      seg.layer.toUpperCase() === 'WS-DOOR' ? 'door' : 'window'
    const [p, q] = [seg.points[0], seg.points[seg.points.length - 1]]
    const wall = edges.find((e) => onEdge(e, p, tolerance) && onEdge(e, q, tolerance))
    if (!wall)
      return {
        ok: false,
        error: `A ${kind} line (from ${Math.round(p[0])},${Math.round(p[1])}) is not on any wall: draw it along the wall’s centreline.`,
      }
    const tp = along(wall, p)
    const tq = along(wall, q)
    const mid: [number, number] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
    const tag = nearTag(mid[0], mid[1], kind === 'door' ? 'D' : 'W')
    const id = tag?.match(/^([DW]\d+)/)?.[1] ?? null
    found.push({
      kind,
      wall: wall.index,
      offset: snap((tp + tq) / 2),
      width: snap(Math.abs(tq - tp)),
      tag,
      // The first opening to claim a label keeps it.
      id: id && !used.has(id) ? id : null,
    })
    if (id && !used.has(id)) used.add(id)
  }
  for (const f of found) {
    const prefix = f.kind === 'door' ? 'D' : 'W'
    let id = f.id
    if (!id) {
      let n = 1
      while (used.has(`${prefix}${n}`)) n++
      id = `${prefix}${n}`
      used.add(id)
      notes.push(`A ${f.kind} without its own label was found: it is ${id}.`)
    }
    const { kind, tag, width, offset } = f
    const was = baseById.get(id)
    /** A number from the opening's label, if it has one. */
    const label = (re: RegExp) => (tag ? num(tag, re) : undefined)
    openings.push({
      id,
      kind,
      wall: f.wall,
      offset,
      width,
      height: label(/\bH(\d+)/) ?? was?.height ?? (kind === 'door' ? 2100 : 1050),
      sill: kind === 'door' ? 0 : (label(/\bS(\d+)/) ?? was?.sill ?? 1050),
      storey: label(/\bF(\d+)/) ?? was?.storey ?? 0,
    })
  }

  // Columns: circles.
  const columns: Column[] = entities
    .filter(
      (e) =>
        e.layer.toUpperCase() === 'WS-COLUMN' && e.type === 'CIRCLE' && e.points.length,
    )
    .map((e, i) => {
      const [x, y] = e.points[0]
      const tag = nearTag(x, y, 'C')
      return {
        id: tag?.match(/^(C\d+)/)?.[1] ?? `C${i + 1}`,
        x: snap(x),
        y: snap(y),
        section: tag?.match(/(NB-\d+)/)?.[1] ?? base.columns[0]?.section ?? 'NB-150',
      }
    })
  design = { ...design, openings, columns }
  return { ok: true, design, notes }
}

function readBridge(entities: Entity[], base: BridgeDesign): DxfRead {
  const deck = entities
    .filter((e) => e.layer.toUpperCase() === 'WS-DECK' && e.points.length >= 4)
    .sort((a, b) => area(b.points) - area(a.points))[0]
  if (!deck) return { ok: false, error: 'There is no deck outline on layer WS-DECK.' }
  const xs = deck.points.map((p) => p[0])
  const ys = deck.points.map((p) => p[1])
  const girders = entities.filter(
    (e) => e.layer.toUpperCase() === 'WS-GIRDER' && e.type === 'LINE',
  )
  const tags = textsOn(entities, 'WS-TAG').map((t) => t.value)
  const spec = textsOn(entities, 'WS-SPEC')
    .map((t) => t.value)
    .join('\n')
  const section = tags.join(' ').match(/GIRDERS (NB-\d+)/)?.[1] ?? base.girders.section
  return {
    ok: true,
    notes: [],
    design: {
      ...base,
      span: snap(Math.max(...xs) - Math.min(...xs)),
      width: snap(Math.max(...ys) - Math.min(...ys)),
      girders: { count: girders.length || base.girders.count, section },
      deck: { thickness: num(spec, /DECK THICKNESS (\d+)/) ?? base.deck.thickness },
      parapet: { height: num(spec, /PARAPET HEIGHT (\d+)/) ?? base.parapet.height },
      abutment: {
        height: num(spec, /ABUTMENT HEIGHT (\d+)/) ?? base.abutment.height,
        base: num(spec, /BASE (\d+)/) ?? base.abutment.base,
      },
    },
  }
}

/**
 * A DXF drawing read as a design. What the plan does not show (heights,
 * materials, services) comes from its WS-SPEC lines, else from `base`.
 */
export function dxfToDesign(source: string, base: Design): DxfRead {
  let entities: Entity[]
  try {
    entities = readEntities(source).entities
  } catch (error) {
    return {
      ok: false,
      error: `The drawing could not be read: ${error instanceof Error ? error.message : String(error)}.`,
    }
  }
  const result =
    base.kind === 'building' ? readBuilding(entities, base) : readBridge(entities, base)
  if (!result.ok) return result
  return {
    ...result,
    design: {
      ...result.design,
      format: DESIGN_FORMAT,
      version: DESIGN_VERSION,
    } as Design,
  }
}

function same(a: [number, number], b: [number, number]) {
  return Math.abs(a[0] - b[0]) < 1 && Math.abs(a[1] - b[1]) < 1
}

function area(points: Array<[number, number]>) {
  return Math.abs(signedOutline(points)) / 2
}

function along(e: ReturnType<typeof walls>[number], p: [number, number]) {
  return (p[0] - e.a[0]) * e.dir[0] + (p[1] - e.a[1]) * e.dir[1]
}

function onEdge(
  e: ReturnType<typeof walls>[number],
  p: [number, number],
  tolerance: number,
) {
  const t = along(e, p)
  if (t < -tolerance || t > e.length + tolerance) return false
  const px = e.a[0] + e.dir[0] * t
  const py = e.a[1] + e.dir[1] * t
  return Math.hypot(px - p[0], py - p[1]) <= tolerance
}
