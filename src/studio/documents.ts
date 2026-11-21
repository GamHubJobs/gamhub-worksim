/**
 * Documents made from a project, without a browser: the DXF plan for CAD
 * programs, the JSON backup (and reading it back), and the report's content.
 * The drawings (SVG, PNG, PDF) are made by the app from the same plan drawing
 * it shows on screen.
 */
import { analyse, itemPrice, openingPrice, type StudioAnalysis } from './analysis'
import { catalogEntry } from './catalog'
import {
  add,
  bounds,
  itemCorners,
  openingSpan,
  pointAlong,
  scale,
  wallDir,
  wallNormal,
  wallPieces,
} from './geometry'
import { materialOrDefault } from './materials'
import { StudioStateSchema, type Point, type StudioState } from './model'
import { stairCorners } from './ops'
import { formatArea, formatLength } from './units'

// ---------------------------------------------------------------- DXF

const DXF_LAYERS: Record<string, { color: number; note: string }> = {
  'SS-WALL': { color: 7, note: 'Wall outlines' },
  'SS-WALL-CL': { color: 8, note: 'Wall centre lines' },
  'SS-DOOR': { color: 3, note: 'Doors and their swing' },
  'SS-WINDOW': { color: 5, note: 'Windows' },
  'SS-ROOM': { color: 9, note: 'Room outlines' },
  'SS-TEXT': { color: 2, note: 'Room names, areas and labels' },
  'SS-FURNITURE': { color: 4, note: 'Furniture and fittings' },
  'SS-STAIR': { color: 6, note: 'Stairs' },
  'SS-DIM': { color: 1, note: 'Dimensions' },
  'SS-TITLE': { color: 7, note: 'Floor titles' },
}

/** An ASCII DXF R12 of every floor's plan, in millimetres (floors side by side, y up). */
export function projectToDxf(state: StudioState): string {
  const out: string[] = []
  const g = (code: number, value: string | number) =>
    out.push(String(code), typeof value === 'number' ? fmt(value) : value)
  const floors = [...state.floors].sort((a, b) => a.elevation - b.elevation)
  // Floors are laid out left to right, with a gap.
  const allPts = state.walls.flatMap((w) => [w.a, w.b])
  const b = allPts.length
    ? bounds(allPts)
    : { minX: 0, minY: 0, width: 10000, height: 10000 }
  const gap = Math.max(4000, b.width * 0.3)
  const shiftOf = (index: number) => index * (b.width + gap)

  g(0, 'SECTION')
  g(2, 'HEADER')
  g(9, '$ACADVER')
  g(1, 'AC1009')
  g(9, '$INSUNITS')
  g(70, 4)
  g(0, 'ENDSEC')
  g(0, 'SECTION')
  g(2, 'TABLES')
  g(0, 'TABLE')
  g(2, 'LAYER')
  g(70, Object.keys(DXF_LAYERS).length)
  for (const [name, layer] of Object.entries(DXF_LAYERS)) {
    g(0, 'LAYER')
    g(2, name)
    g(70, 0)
    g(62, layer.color)
    g(6, 'CONTINUOUS')
  }
  g(0, 'ENDTAB')
  g(0, 'ENDSEC')
  g(0, 'SECTION')
  g(2, 'ENTITIES')

  floors.forEach((floor, index) => {
    const dx = shiftOf(index)
    const P = (p: Point): [number, number] => [p.x + dx, -p.y]
    const line = (layer: string, p: Point, q: Point) => {
      const [x1, y1] = P(p)
      const [x2, y2] = P(q)
      g(0, 'LINE')
      g(8, layer)
      g(10, x1)
      g(20, y1)
      g(30, 0)
      g(11, x2)
      g(21, y2)
      g(31, 0)
    }
    const poly = (layer: string, pts: Point[]) => {
      g(0, 'POLYLINE')
      g(8, layer)
      g(66, 1)
      g(70, 1)
      for (const p of pts) {
        const [x, y] = P(p)
        g(0, 'VERTEX')
        g(8, layer)
        g(10, x)
        g(20, y)
        g(30, 0)
      }
      g(0, 'SEQEND')
      g(8, layer)
    }
    const text = (layer: string, p: Point, height: number, value: string) => {
      const [x, y] = P(p)
      g(0, 'TEXT')
      g(8, layer)
      g(10, x)
      g(20, y)
      g(30, 0)
      g(40, height)
      g(1, value.replace(/[\r\n]+/g, ' '))
      g(72, 1)
      g(11, x)
      g(21, y)
      g(31, 0)
    }
    text(
      'SS-TITLE',
      { x: b.minX, y: b.minY - 1500 },
      400,
      `${floor.name.toUpperCase()} (level ${Math.round(floor.elevation)} mm)`,
    )
    for (const w of state.walls.filter((x) => x.floor === floor.id)) {
      line('SS-WALL-CL', w.a, w.b)
      const d = wallDir(w)
      const n = scale(wallNormal(w), w.thickness / 2)
      for (const piece of wallPieces(w, state.openings, state.walls)) {
        if (piece.bottom !== 0 || piece.top !== w.height) continue
        const a = add(w.a, scale(d, piece.from))
        const c = add(w.a, scale(d, piece.to))
        poly('SS-WALL', [
          add(a, n),
          add(c, n),
          add(c, scale(n, -1)),
          add(a, scale(n, -1)),
        ])
      }
      for (const o of state.openings.filter((x) => x.wall === w.id)) {
        const s = openingSpan(o)
        const p0 = pointAlong(w, s.start)
        const p1 = pointAlong(w, s.end)
        if (o.kind === 'window') {
          line('SS-WINDOW', add(p0, n), add(p1, n))
          line('SS-WINDOW', p0, p1)
          line('SS-WINDOW', add(p0, scale(n, -1)), add(p1, scale(n, -1)))
        } else if (o.kind === 'door') {
          const side = o.side === 'left' ? 1 : -1
          const hinge = o.hinge === 'start' ? p0 : p1
          const leafEnd = add(
            hinge,
            scale(wallNormal(w), side * (o.width + w.thickness / 2)),
          )
          line(
            'SS-DOOR',
            add(hinge, scale(wallNormal(w), (side * w.thickness) / 2)),
            leafEnd,
          )
          // The swing as an arc from the open leaf to the closed position.
          const [cx, cy] = P(add(hinge, scale(wallNormal(w), (side * w.thickness) / 2)))
          const angleOf = (v: Point) => (Math.atan2(-v.y, v.x) * 180) / Math.PI
          const open = scale(wallNormal(w), side)
          const closed = scale(d, o.hinge === 'start' ? 1 : -1)
          let a1 = angleOf(open)
          let a2 = angleOf(closed)
          if ((a2 - a1 + 360) % 360 > 180) [a1, a2] = [a2, a1]
          g(0, 'ARC')
          g(8, 'SS-DOOR')
          g(10, cx)
          g(20, cy)
          g(30, 0)
          g(40, o.width)
          g(50, a1)
          g(51, a2)
        } else {
          line('SS-DOOR', p0, p1)
        }
      }
    }
    for (const r of state.rooms.filter((x) => x.floor === floor.id)) {
      poly('SS-ROOM', r.outline)
      const c = centroidOf(r.outline)
      text('SS-TEXT', c, 250, r.name)
      text('SS-TEXT', { x: c.x, y: c.y + 380 }, 180, formatArea(polyArea(r.outline), 'm'))
    }
    for (const i of state.items.filter((x) => x.floor === floor.id))
      poly('SS-FURNITURE', itemCorners(i))
    for (const s of state.stairs.filter((x) => x.floor === floor.id))
      poly('SS-STAIR', stairCorners(s))
    for (const d of state.dimensions.filter((x) => x.floor === floor.id)) {
      line('SS-DIM', d.a, d.b)
      text(
        'SS-DIM',
        { x: (d.a.x + d.b.x) / 2, y: (d.a.y + d.b.y) / 2 - 150 },
        150,
        formatLength(Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y), 'mm'),
      )
    }
    for (const l of state.labels.filter((x) => x.floor === floor.id))
      text('SS-TEXT', l, 200, l.text)
  })
  g(0, 'ENDSEC')
  g(0, 'EOF')
  return `${out.join('\n')}\n`
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(3))
const polyArea = (p: Point[]) =>
  Math.abs(
    p.reduce(
      (s, a, i) => s + a.x * p[(i + 1) % p.length].y - p[(i + 1) % p.length].x * a.y,
      0,
    ) / 2,
  )
function centroidOf(p: Point[]): Point {
  return {
    x: p.reduce((s, a) => s + a.x, 0) / p.length,
    y: p.reduce((s, a) => s + a.y, 0) / p.length,
  }
}

// ---------------------------------------------------------------- backup

export const BACKUP_FORMAT = 'gamhub-space-studio'

export function projectToJson(state: StudioState, exportedAt = Date.now()): string {
  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: new Date(exportedAt).toISOString(),
      project: state,
    },
    null,
    2,
  )
}

/** Reads a backup made by projectToJson (or a bare project). Never throws. */
export function projectFromJson(
  text: string,
): { ok: true; state: StudioState } | { ok: false; error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return {
      ok: false,
      error: 'This file is not a Space Studio backup (it is not valid JSON).',
    }
  }
  const body =
    raw && typeof raw === 'object' && 'format' in raw
      ? raw
      : { format: BACKUP_FORMAT, project: raw }
  const b = body as { format?: unknown; project?: unknown }
  if (b.format !== BACKUP_FORMAT)
    return { ok: false, error: 'This file is not a Space Studio backup.' }
  const parsed = StudioStateSchema.safeParse(b.project)
  if (!parsed.success)
    return {
      ok: false,
      error: 'The backup is damaged or incomplete, so it was not imported.',
    }
  // Every opening must sit on a wall in the file.
  const walls = new Set(parsed.data.walls.map((w) => w.id))
  return {
    ok: true,
    state: {
      ...parsed.data,
      openings: parsed.data.openings.filter((o) => walls.has(o.wall)),
    },
  }
}

// ---------------------------------------------------------------- report

export interface ReportData {
  analysis: StudioAnalysis
  rooms: Array<{
    floor: string
    name: string
    use: string
    area: string
    size: string
    floorFinish: string
    doors: number
    windows: number
  }>
  furniture: Array<{
    name: string
    room: string
    size: string
    material: string
    price: number
  }>
  openings: Array<{ kind: string; size: string; room: string; price: number }>
  finishes: Array<{ name: string; where: string }>
}

export function reportData(state: StudioState): ReportData {
  const analysis = analyse(state)
  const units = state.project.units
  const floorName = (id: string) => state.floors.find((f) => f.id === id)?.name ?? ''
  const roomName = (floor: string, p: Point) => {
    const r = analysis.rooms.find((x) => {
      const room = state.rooms.find((y) => y.id === x.id)
      return room && room.floor === floor && inside(p, room.outline)
    })
    return r?.name ?? 'Outside the rooms'
  }
  const finishes = new Map<string, Set<string>>()
  const note = (id: string, where: string) =>
    finishes.set(
      materialOrDefault(id).name,
      (finishes.get(materialOrDefault(id).name) ?? new Set()).add(where),
    )
  for (const r of state.rooms) {
    note(r.floorFinish, `${r.name} floor`)
    if (r.ceiling) note(r.ceilingFinish, `${r.name} ceiling`)
  }
  for (const w of state.walls) {
    note(w.finishLeft, 'walls')
    note(w.finishRight, 'walls')
  }
  return {
    analysis,
    rooms: analysis.rooms.map((r) => {
      const room = state.rooms.find((x) => x.id === r.id)!
      return {
        floor: floorName(r.floor),
        name: r.name,
        use: r.use,
        area: `${r.area.toFixed(2)} m²`,
        size: `${formatLength(r.width, units)} × ${formatLength(r.depth, units)}`,
        floorFinish: materialOrDefault(room.floorFinish).name,
        doors: r.doors.length,
        windows: r.windows.length,
      }
    }),
    furniture: state.items.map((i) => {
      const e = catalogEntry(i.kind)
      return {
        name: e?.name ?? i.kind,
        room: roomName(i.floor, i),
        size: `${i.width ?? e?.width ?? 0} × ${i.depth ?? e?.depth ?? 0} × ${i.height ?? e?.height ?? 0} mm`,
        material: i.material
          ? materialOrDefault(i.material).name
          : 'Colour ' + (i.colour ?? e?.colour ?? ''),
        price: itemPrice(i),
      }
    }),
    openings: state.openings.map((o) => {
      const w = state.walls.find((x) => x.id === o.wall)
      const mid = w ? pointAlong(w, o.offset) : { x: 0, y: 0 }
      return {
        kind:
          o.kind === 'pass'
            ? 'Pass-through'
            : o.kind === 'door'
              ? `Door (${o.style})${o.entrance ? ', entrance' : ''}`
              : `Window (${o.style})`,
        size: `${o.width} × ${o.height} mm`,
        room: w
          ? roomName(w.floor, add(mid, scale(wallNormal(w), w.thickness / 2 + 150)))
          : '',
        price: openingPrice(o),
      }
    }),
    finishes: [...finishes.entries()].map(([name, where]) => ({
      name,
      where: [...where].slice(0, 6).join(', ') + (where.size > 6 ? '…' : ''),
    })),
  }
}

function inside(p: Point, poly: Point[]) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
    if (
      poly[i].y > p.y !== poly[j].y > p.y &&
      p.x <
        ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) +
          poly[i].x
    )
      c = !c
  return c
}

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  )
const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

/** The project report as a standalone HTML page (plans passed in as SVG markup). */
export function reportHtml(
  state: StudioState,
  plans: Array<{ floor: string; svg: string }>,
  date = new Date(),
): string {
  const d = reportData(state)
  const a = d.analysis
  const table = (head: string[], rows: string[][]) =>
    `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(state.project.name)}: project report</title>
<style>
body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#1e293b;max-width:1000px;margin:2rem auto;padding:0 1rem;line-height:1.45}
h1{margin-bottom:.2rem}h2{margin-top:2rem;border-bottom:1px solid #cbd5e1;padding-bottom:.2rem}
table{border-collapse:collapse;width:100%;font-size:.9rem;margin:.5rem 0}th,td{border-bottom:1px solid #e2e8f0;text-align:left;padding:.3rem .4rem}th{background:#f1f5f9}
.plan{border:1px solid #cbd5e1;margin:.5rem 0;background:#fff}.plan svg{width:100%;height:auto}
.muted{color:#64748b;font-size:.85rem}.error{color:#b91c1c}.warning{color:#b45309}.info{color:#475569}
</style></head><body>
<h1>${esc(state.project.name)}</h1>
<p class="muted">${state.project.client ? `Client: ${esc(state.project.client)} · ` : ''}Report made ${date.toLocaleDateString('en-GB')} in GamHub Space Studio (a workplace simulation; prices are fictional).</p>
<h2>Summary</h2>
<p>${a.rooms.length} rooms on ${state.floors.length} floor${state.floors.length === 1 ? '' : 's'}, ${a.totalArea.toFixed(1)} m² in all; ${a.counts.doors} doors and openings, ${a.counts.windows} windows, ${a.counts.items} items of furniture and fittings.</p>
<p>Estimated cost <strong>${money(a.costs.total)}</strong>${state.project.budget !== undefined ? ` against a budget of ${money(state.project.budget)} (${a.costs.total <= state.project.budget ? 'within budget' : `<span class="error">${money(a.costs.total - state.project.budget)} over</span>`})` : ''}.</p>
${state.project.notes ? `<h2>Design statement</h2><p>${esc(state.project.notes).replace(/\n/g, '<br>')}</p>` : ''}
<h2>Plans</h2>
${plans.map((p) => `<h3>${esc(p.floor)}</h3><div class="plan">${p.svg}</div>`).join('\n')}
<h2>Rooms</h2>
${table(
  ['Floor', 'Room', 'Area', 'Size', 'Floor finish', 'Doors', 'Windows'],
  d.rooms.map((r) => [
    esc(r.floor),
    esc(r.name),
    r.area,
    esc(r.size),
    esc(r.floorFinish),
    String(r.doors),
    String(r.windows),
  ]),
)}
<h2>Checks</h2>
${a.issues.length ? `<ul>${a.issues.map((i) => `<li class="${i.severity}">${esc(i.message)}</li>`).join('')}</ul>` : '<p>No problems were found.</p>'}
<h2>Furniture and fittings</h2>
${table(
  ['Item', 'Room', 'Size', 'Finish', 'Price'],
  d.furniture.map((f) => [
    esc(f.name),
    esc(f.room),
    esc(f.size),
    esc(f.material),
    money(f.price),
  ]),
)}
<h2>Doors and windows</h2>
${table(
  ['Type', 'Size', 'Room', 'Price'],
  d.openings.map((o) => [esc(o.kind), esc(o.size), esc(o.room), money(o.price)]),
)}
<h2>Finishes</h2>
${table(
  ['Finish', 'Where'],
  d.finishes.map((f) => [esc(f.name), esc(f.where)]),
)}
<h2>Cost</h2>
${table(
  ['', 'Amount'],
  [
    ['Furniture', money(a.costs.furniture)],
    ['Fittings', money(a.costs.fixtures)],
    ['Doors and windows', money(a.costs.openings)],
    ['Finishes', money(a.costs.finishes)],
    ['<strong>Total</strong>', `<strong>${money(a.costs.total)}</strong>`],
  ],
)}
<p class="muted">Space guidance in the checks is simplified for learning; real projects follow the applicable regulations.</p>
</body></html>`
}
