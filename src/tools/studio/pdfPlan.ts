/**
 * A floor plan drawn into a PDF as vectors (lines, fills and text), to scale:
 * rooms with their names and areas, walls in pieces round their openings,
 * doors with their swing, windows, stairs, furniture, columns, balconies,
 * dimensions, labels and the outside walls' lengths. Sharp at any zoom and
 * when printed; the same plan the editor draws.
 */
import type { jsPDF } from 'jspdf'
import { catalogEntry } from '../../studio/catalog'
import {
  add,
  centroid,
  itemCorners,
  itemSize,
  openingSpan,
  pointAlong,
  polygonArea,
  rectCorners,
  scale as scaleBy,
  wallDir,
  wallLength,
  wallNormal,
  wallPieces,
} from '../../studio/geometry'
import { materialOrDefault } from '../../studio/materials'
import type { Point, StudioState } from '../../studio/model'
import { stairCorners } from '../../studio/ops'
import { formatArea, formatLength } from '../../studio/units'

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** A colour faded towards white (room fills). */
const pale = (hex: string, k = 0.78): [number, number, number] =>
  rgb(hex).map((c) => Math.round(c + (255 - c) * k)) as [number, number, number]

/**
 * Draws one floor. `origin` is where the plan point `from` lands on the page
 * (mm), and 1 mm on paper is `scale` mm in the building (1:scale).
 */
export function drawPlanVector(
  pdf: jsPDF,
  state: StudioState,
  floor: string,
  from: Point,
  origin: Point,
  scale: number,
) {
  const units = state.project.units
  const T = (p: Point) => ({
    x: origin.x + (p.x - from.x) / scale,
    y: origin.y + (p.y - from.y) / scale,
  })
  const poly = (pts: Point[], style: 'F' | 'S' | 'FD') => {
    if (pts.length < 2) return
    const p = pts.map(T)
    const deltas = p.slice(1).map((q, i) => [q.x - p[i].x, q.y - p[i].y])
    pdf.lines(deltas, p[0].x, p[0].y, [1, 1], style, true)
  }
  const line = (a: Point, b: Point) => {
    const p = T(a)
    const q = T(b)
    pdf.line(p.x, p.y, q.x, q.y)
  }
  const polyline = (pts: Point[]) => {
    for (let i = 0; i < pts.length - 1; i++) line(pts[i], pts[i + 1])
  }
  const dashed = (on: boolean) => pdf.setLineDashPattern(on ? [1, 0.8] : [], 0)
  const text = (
    s: string,
    p: Point,
    size: number,
    angle = 0,
    colour: [number, number, number] = [15, 23, 42],
  ) => {
    const q = T(p)
    pdf.setFontSize(size)
    pdf.setTextColor(...colour)
    pdf.text(s, q.x, q.y, { align: 'center', baseline: 'middle', angle: -angle })
  }
  const thin = 0.15
  pdf.setLineWidth(thin)

  // Balconies and terraces.
  for (const s of state.slabs.filter((x) => x.floor === floor)) {
    pdf.setFillColor(...pale(materialOrDefault(s.finish).colour, 0.6))
    pdf.setDrawColor(120, 113, 108)
    dashed(true)
    poly(s.outline, 'FD')
    dashed(false)
    text(s.kind === 'balcony' ? 'Balcony' : 'Terrace', centroid(s.outline), 6)
  }
  // Rooms, filled in the colour of their floor.
  for (const r of state.rooms.filter((x) => x.floor === floor)) {
    pdf.setFillColor(...pale(materialOrDefault(r.floorFinish).colour))
    poly(r.outline, 'F')
  }
  // Stairs: outline, treads and the way up.
  pdf.setDrawColor(51, 65, 85)
  for (const s of state.stairs.filter((x) => x.floor === floor || x.to === floor)) {
    const c = stairCorners(s)
    pdf.setFillColor(248, 250, 252)
    poly(c, 'FD')
    const steps = Math.max(2, Math.round(s.run / 250))
    for (let i = 1; i < steps; i++) {
      const t = i / steps
      line(
        { x: c[0].x + (c[3].x - c[0].x) * t, y: c[0].y + (c[3].y - c[0].y) * t },
        { x: c[1].x + (c[2].x - c[1].x) * t, y: c[1].y + (c[2].y - c[1].y) * t },
      )
    }
    const mid0 = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 }
    const mid1 = { x: (c[2].x + c[3].x) / 2, y: (c[2].y + c[3].y) / 2 }
    line(mid0, mid1)
    text(s.floor === floor ? 'UP' : 'DOWN', { x: mid0.x, y: mid0.y + 200 }, 5)
  }
  // Furniture (rugs first, then the rest), as outlines.
  const items = state.items
    .filter((i) => i.floor === floor)
    .sort(
      (a, b) =>
        (catalogEntry(a.kind)?.symbol === 'rug' ? -1 : 0) -
        (catalogEntry(b.kind)?.symbol === 'rug' ? -1 : 0),
    )
  pdf.setDrawColor(71, 85, 105)
  for (const i of items) {
    const e = catalogEntry(i.kind)
    const { width, depth } = itemSize(i)
    const round = e?.symbol === 'round' || e?.symbol === 'plant' || e?.symbol === 'light'
    const shape = round
      ? Array.from({ length: 20 }, (_, k) => {
          const t = (k / 20) * Math.PI * 2
          const r = (i.rotation * Math.PI) / 180
          const lx = (Math.cos(t) * width) / 2
          const ly = (Math.sin(t) * depth) / 2
          return {
            x: i.x + lx * Math.cos(r) - ly * Math.sin(r),
            y: i.y + lx * Math.sin(r) + ly * Math.cos(r),
          }
        })
      : itemCorners(i)
    pdf.setFillColor(255, 255, 255)
    dashed(i.elevation > 300 || e?.symbol === 'rug')
    poly(shape, e?.walkable && i.elevation > 300 ? 'S' : 'FD')
    dashed(false)
    if (e?.symbol === 'bed') {
      const pillow = rectCorners(0, 0, width * 0.38, depth * 0.16, 0)
      const r = (i.rotation * Math.PI) / 180
      for (const sx of [-0.23, 0.23]) {
        const cx = sx * width
        const cy = -depth / 2 + depth * 0.13
        poly(
          pillow.map((p) => {
            const lx = p.x + cx
            const ly = p.y + cy
            return {
              x: i.x + lx * Math.cos(r) - ly * Math.sin(r),
              y: i.y + lx * Math.sin(r) + ly * Math.cos(r),
            }
          }),
          'S',
        )
      }
    }
  }
  // Walls: the solid, full-height pieces.
  for (const w of state.walls.filter((x) => x.floor === floor)) {
    if (w.type === 'exterior') pdf.setFillColor(30, 41, 59)
    else pdf.setFillColor(71, 85, 105)
    const d = wallDir(w)
    const n = scaleBy(wallNormal(w), w.thickness / 2)
    for (const p of wallPieces(w, state.openings, state.walls)) {
      if (p.bottom !== 0 || p.top !== w.height) continue
      const a = add(w.a, scaleBy(d, p.from))
      const b = add(w.a, scaleBy(d, p.to))
      poly([add(a, n), add(b, n), add(b, scaleBy(n, -1)), add(a, scaleBy(n, -1))], 'F')
    }
    // Doors and windows in it.
    pdf.setDrawColor(30, 41, 59)
    for (const o of state.openings.filter((x) => x.wall === w.id)) {
      const s = openingSpan(o)
      const a = pointAlong(w, s.start)
      const b = pointAlong(w, s.end)
      const nn = wallNormal(w)
      const t = w.thickness / 2
      if (o.kind === 'window') {
        pdf.setFillColor(248, 250, 252)
        poly(
          [
            add(a, scaleBy(nn, t)),
            add(b, scaleBy(nn, t)),
            add(b, scaleBy(nn, -t)),
            add(a, scaleBy(nn, -t)),
          ],
          'FD',
        )
        line(a, b)
      } else if (o.kind === 'pass') {
        dashed(true)
        line(a, b)
        dashed(false)
      } else {
        const side = o.side === 'left' ? 1 : -1
        const leaves =
          o.style === 'double'
            ? [
                { hinge: a, len: o.width / 2, dir: 1 },
                { hinge: b, len: o.width / 2, dir: -1 },
              ]
            : o.style === 'sliding'
              ? []
              : [
                  {
                    hinge: o.hinge === 'start' ? a : b,
                    len: o.width,
                    dir: o.hinge === 'start' ? 1 : -1,
                  },
                ]
        if (o.style === 'sliding') {
          line(
            add(a, scaleBy(nn, t * 0.3)),
            add(pointAlong(w, o.offset + 50), scaleBy(nn, t * 0.3)),
          )
          line(
            add(b, scaleBy(nn, -t * 0.3)),
            add(pointAlong(w, o.offset - 50), scaleBy(nn, -t * 0.3)),
          )
        }
        for (const leaf of leaves) {
          const h = add(leaf.hinge, scaleBy(nn, side * t))
          const open = add(h, scaleBy(nn, side * leaf.len))
          pdf.setLineWidth(0.3)
          line(h, open)
          pdf.setLineWidth(thin)
          // The swing: a quarter circle from the open leaf back to the wall.
          const arc: Point[] = []
          for (let k = 0; k <= 12; k++) {
            const ang = (k / 12) * (Math.PI / 2)
            const along = scaleBy(wallDir(w), leaf.dir * Math.sin(ang) * leaf.len)
            const out = scaleBy(nn, side * Math.cos(ang) * leaf.len)
            arc.push(add(h, add(along, out)))
          }
          dashed(true)
          polyline(arc)
          dashed(false)
        }
      }
    }
  }
  // Columns.
  pdf.setFillColor(51, 65, 85)
  for (const c of state.columns.filter((x) => x.floor === floor))
    poly(rectCorners(c.x, c.y, c.size, c.size, 0), 'F')
  // Room names and areas.
  for (const r of state.rooms.filter((x) => x.floor === floor)) {
    const c = centroid(r.outline)
    text(r.name, { x: c.x, y: c.y - 120 }, 7)
    text(
      formatArea(polygonArea(r.outline), units),
      { x: c.x, y: c.y + 220 },
      5.5,
      0,
      [71, 85, 105],
    )
  }
  // The outside walls' lengths.
  for (const w of state.walls.filter((x) => x.floor === floor && x.type === 'exterior')) {
    const len = wallLength(w)
    if (len < 300) continue
    const p = add(pointAlong(w, len / 2), scaleBy(wallNormal(w), w.thickness / 2 + 350))
    let angle = (Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) * 180) / Math.PI
    if (angle > 90) angle -= 180
    if (angle < -90) angle += 180
    text(formatLength(len, units), p, 5, angle, [71, 85, 105])
  }
  // Dimensions.
  pdf.setDrawColor(15, 118, 110)
  for (const d of state.dimensions.filter((x) => x.floor === floor)) {
    const len = Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y)
    if (len < 1) continue
    const n = { x: -(d.b.y - d.a.y) / len, y: (d.b.x - d.a.x) / len }
    const a = add(d.a, scaleBy(n, d.offset))
    const b = add(d.b, scaleBy(n, d.offset))
    line(d.a, a)
    line(d.b, b)
    line(a, b)
    let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
    if (angle > 90) angle -= 180
    if (angle < -90) angle += 180
    text(
      formatLength(len, units),
      add({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, scaleBy(n, -200)),
      5,
      angle,
      [15, 118, 110],
    )
  }
  // Labels.
  for (const l of state.labels.filter((x) => x.floor === floor))
    text(l.text, l, 6, 0, [124, 45, 18])
  pdf.setTextColor(0, 0, 0)
  pdf.setDrawColor(0, 0, 0)
}
