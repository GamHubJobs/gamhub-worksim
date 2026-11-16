/**
 * The engineering design: the one description of a project that every part
 * of the Engineer career shares. CAD Craft (drawings, `cad/dxf.ts`), FreeCAD
 * (3D models, `cad/freecad.ts`), the plan editor, the calculations, the bill
 * of quantities, the documents and the construction site all read and write
 * this, so a wall changed in a drawing is the wall the workers build.
 *
 * "WorkSim design" format 1 (documented in docs/ENGINEERING_PROJECTS.md):
 * millimetres, x east and y north on plan (z up), integers.
 *
 * Pure TypeScript: no React, no 3D, no storage.
 */
import { z } from 'zod'

export const DESIGN_FORMAT = 'worksim-design'
export const DESIGN_VERSION = 1

const Mm = z.number().int().min(-1_000_000).max(1_000_000)
const Size = (min: number, max: number) => z.number().int().min(min).max(max)

export const WALL_MATERIALS = ['blockwork', 'brick', 'timber-frame', 'cladding'] as const
export const FOUNDATION_TYPES = ['strip', 'pad', 'raft'] as const
export const ROOF_TYPES = ['flat', 'pitched'] as const

/** A door or window, in a wall of the outline. */
export const OpeningSchema = z.object({
  id: z.string().min(1).max(20),
  kind: z.enum(['door', 'window']),
  /** The outline's edge it is in: 0 is from point 0 to point 1. */
  wall: z.number().int().min(0).max(63),
  /** From the edge's start to the opening's centre (mm). */
  offset: Mm,
  width: Size(100, 12_000),
  height: Size(100, 6_000),
  /** Height of the bottom above the floor (0 for doors). */
  sill: Size(0, 4_000),
  /** Which storey (0 is the ground floor). */
  storey: z.number().int().min(0).max(4).default(0),
})
export type Opening = z.infer<typeof OpeningSchema>

/** A steel column of the frame, on plan. */
export const ColumnSchema = z.object({
  id: z.string().min(1).max(20),
  x: Mm,
  y: Mm,
  section: z.string().min(1).max(20),
})
export type Column = z.infer<typeof ColumnSchema>

export const BuildingDesignSchema = z.object({
  format: z.literal(DESIGN_FORMAT),
  version: z.literal(DESIGN_VERSION),
  kind: z.literal('building'),
  /** The external walls' centreline, a closed polygon (mm), anticlockwise or not. */
  outline: z
    .array(z.tuple([Mm, Mm]))
    .min(3)
    .max(64),
  wall: z.object({
    thickness: Size(50, 1_000),
    /** Height of one storey, floor to floor (mm). */
    height: Size(1_000, 8_000),
    material: z.enum(WALL_MATERIALS),
  }),
  storeys: z.number().int().min(1).max(5),
  openings: z.array(OpeningSchema).max(80),
  columns: z.array(ColumnSchema).max(80),
  /** The beams that carry the roof and floors, spanning the building's width. */
  beam: z.object({ section: z.string().min(1).max(20) }),
  foundation: z.object({
    type: z.enum(FOUNDATION_TYPES),
    width: Size(100, 5_000),
    depth: Size(100, 5_000),
  }),
  slab: z.object({ thickness: Size(50, 600) }),
  roof: z.object({
    type: z.enum(ROOF_TYPES),
    /** Degrees, for a pitched roof. */
    pitch: z.number().min(0).max(60),
  }),
  services: z.object({
    /** Electrical circuits (lighting and power). */
    circuits: z.number().int().min(0).max(80),
    /** WCs and wash basins. */
    sanitary: z.number().int().min(0).max(40),
    /** Heating and ventilation units. */
    hvac: z.number().int().min(0).max(40),
  }),
})
export type BuildingDesign = z.infer<typeof BuildingDesignSchema>

export const BridgeDesignSchema = z.object({
  format: z.literal(DESIGN_FORMAT),
  version: z.literal(DESIGN_VERSION),
  kind: z.literal('bridge'),
  /** Clear span between the abutments' faces (mm). */
  span: Size(2_000, 60_000),
  /** Deck width between parapets (mm). */
  width: Size(1_000, 12_000),
  girders: z.object({
    count: z.number().int().min(2).max(8),
    section: z.string().min(1).max(20),
  }),
  deck: z.object({ thickness: Size(50, 500) }),
  abutment: z.object({
    height: Size(500, 8_000),
    /** Length of the base along the bridge (mm). */
    base: Size(500, 8_000),
  }),
  parapet: z.object({ height: Size(500, 2_500) }),
})
export type BridgeDesign = z.infer<typeof BridgeDesignSchema>

export const DesignSchema = z.discriminatedUnion('kind', [
  BuildingDesignSchema,
  BridgeDesignSchema,
])
export type Design = z.infer<typeof DesignSchema>

/** A point on plan (mm). */
export type Point = [number, number]

/** One edge of the outline: a wall, from `a` to `b` (mm). */
export interface WallEdge {
  index: number
  a: Point
  b: Point
  length: number
  /** Unit direction along the wall. */
  dir: Point
}

export function walls(design: BuildingDesign): WallEdge[] {
  const pts = design.outline
  return pts.map((a, index) => {
    const b = pts[(index + 1) % pts.length]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const length = Math.hypot(dx, dy)
    return {
      index,
      a,
      b,
      length,
      dir: length > 0 ? [dx / length, dy / length] : [1, 0],
    }
  })
}

/** Signed area of the outline (mm²): positive anticlockwise. */
export function signedArea(outline: ReadonlyArray<readonly [number, number]>): number {
  let sum = 0
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[(i + 1) % outline.length]
    sum += x0 * y1 - x1 * y0
  }
  return sum / 2
}

/** Floor area of one storey on the wall centreline (m²). */
export function footprintArea(design: BuildingDesign): number {
  return Math.abs(signedArea(design.outline)) / 1e6
}

/** Length of the walls' centreline (m). */
export function perimeter(design: BuildingDesign): number {
  return walls(design).reduce((sum, w) => sum + w.length, 0) / 1000
}

/** The outline's bounding box (mm). */
export function bounds(outline: ReadonlyArray<readonly [number, number]>) {
  const xs = outline.map((p) => p[0])
  const ys = outline.map((p) => p[1])
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  }
}

/** Where an opening is on plan: its two ends along the wall (mm). */
export function openingEnds(design: BuildingDesign, o: Opening): [Point, Point] | null {
  const w = walls(design)[o.wall]
  if (!w) return null
  const s = o.offset - o.width / 2
  const e = o.offset + o.width / 2
  return [
    [w.a[0] + w.dir[0] * s, w.a[1] + w.dir[1] * s],
    [w.a[0] + w.dir[0] * e, w.a[1] + w.dir[1] * e],
  ]
}

/** Is every wall along x or y (the construction kit builds square corners only)? */
export function isOrthogonal(design: BuildingDesign): boolean {
  return walls(design).every((w) => w.a[0] === w.b[0] || w.a[1] === w.b[1])
}

/** Is a point inside the outline (mm)? */
export function insideOutline(
  outline: ReadonlyArray<readonly [number, number]>,
  x: number,
  y: number,
): boolean {
  let inside = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, yi] = outline[i]
    const [xj, yj] = outline[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Do two edges of the outline cross (not counting neighbours sharing a corner)? */
export function selfIntersects(outline: ReadonlyArray<readonly [number, number]>) {
  const n = outline.length
  const cross = (
    p: readonly [number, number],
    q: readonly [number, number],
    r: readonly [number, number],
  ) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  for (let i = 0; i < n; i++) {
    const a = outline[i]
    const b = outline[(i + 1) % n]
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      const c = outline[j]
      const d = outline[(j + 1) % n]
      const d1 = cross(c, d, a)
      const d2 = cross(c, d, b)
      const d3 = cross(a, b, c)
      const d4 = cross(a, b, d)
      if (d1 * d2 < 0 && d3 * d4 < 0) return true
    }
  }
  return false
}

/** Rounds every length to whole millimetres (designs read from files may have decimals). */
export function tidyDesign(design: Design): Design {
  const r = Math.round
  if (design.kind === 'bridge') return design
  return {
    ...design,
    outline: design.outline.map(([x, y]) => [r(x), r(y)] as [number, number]),
    openings: design.openings.map((o) => ({ ...o, offset: r(o.offset) })),
    columns: design.columns.map((c) => ({ ...c, x: r(c.x), y: r(c.y) })),
  }
}

/** A short description, e.g. "12.0 × 8.0 m, 1 storey, 2 doors, 3 windows". */
export function describe(design: Design): string {
  if (design.kind === 'bridge')
    return `${(design.span / 1000).toFixed(1)} m span, ${(design.width / 1000).toFixed(1)} m wide, ${design.girders.count} × ${design.girders.section} girders`
  const b = bounds(design.outline)
  const doors = design.openings.filter((o) => o.kind === 'door').length
  const windows = design.openings.length - doors
  return `${((b.x1 - b.x0) / 1000).toFixed(1)} × ${((b.y1 - b.y0) / 1000).toFixed(1)} m, ${design.storeys} ${design.storeys === 1 ? 'storey' : 'storeys'}, ${doors} ${doors === 1 ? 'door' : 'doors'}, ${windows} ${windows === 1 ? 'window' : 'windows'}`
}

/** A design read from somewhere else (a file, a macro's output): checked against the format. */
export function parseDesign(
  value: unknown,
): { ok: true; design: Design } | { ok: false; error: string } {
  const result = DesignSchema.safeParse(value)
  if (result.success) return { ok: true, design: tidyDesign(result.data) }
  const issue = result.error.issues[0]
  return {
    ok: false,
    error: `${issue.path.join('.') || 'the design'}: ${issue.message}`,
  }
}
