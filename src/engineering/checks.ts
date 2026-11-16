/**
 * Checking a design: the geometry (can it be built at all?), the brief, and
 * the engineering calculations a checker would ask for.
 *
 * SIMULATION FOR LEARNING. The formulas are the standard textbook ones
 * (bending M = wL²/8 and σ = M/Z, bearing pressure = load ÷ area), but the
 * loads, the steel catalogue, the allowable stress and the ground's bearing
 * value are simplified and fictional, and every screen says so. Real designs
 * need the applicable codes and a competent, qualified engineer.
 */
import { ALLOWABLE_STRESS, SECTIONS } from '../tools/engineering/data'
import {
  bounds,
  footprintArea,
  insideOutline,
  isOrthogonal,
  perimeter,
  selfIntersects,
  walls,
  type BridgeDesign,
  type BuildingDesign,
  type Design,
} from './design'

/** What the site investigation found (from the project's brief). */
export interface SiteData {
  /** Allowable bearing pressure of the ground (kPa), simplified. */
  bearing: number
  /** Foundations at least this deep (mm): below frost and soft topsoil. */
  minDepth: number
  /** Imposed load on floors (kN/m²): people, furniture, stored goods. */
  imposed: number
}

export type Discipline =
  | 'geometry'
  | 'structural'
  | 'geotechnical'
  | 'electrical'
  | 'plumbing'
  | 'hvac'
  | 'brief'

export interface Finding {
  id: string
  /** An error stops the design being approved; a warning is for the checker. */
  severity: 'error' | 'warning'
  discipline: Discipline
  message: string
}

/** One line of the calculation sheet. */
export interface CalcLine {
  id: string
  discipline: Discipline
  title: string
  /** The working, with the numbers, e.g. "M = wL²/8 = 7.0 × 8.0² ÷ 8 = 56.0 kNm". */
  working: string[]
  /** The result and its limit, e.g. "σ = 151 N/mm² ≤ 165 N/mm²". */
  result: string
  /** How much of the limit is used (1 = exactly at the limit). */
  utilisation: number
  passes: boolean
}

export interface CheckReport {
  findings: Finding[]
  calcs: CalcLine[]
  /** No errors and every calculation passes. */
  passes: boolean
}

/** Simplified loads (kN/m²) used by every check. */
export const LOADS = {
  roofDead: 1.0,
  roofImposed: 0.75,
  floorDead: 3.5,
  /** Spacing of the roof and floor beams (m). */
  beamSpacing: 4.0,
  /** Masonry and concrete weights (kN/m³). */
  wall: 20,
  concrete: 24,
  /** Pedestrian load on a footbridge deck (kN/m²). */
  footbridge: 5.0,
  surfacing: 1.0,
} as const

/** The smallest gap left beside and between openings, and above them (lintels), mm. */
export const PIER = 300
export const LINTEL = 150
export const MIN_DOOR = { width: 800, height: 2000 }
export const MIN_PARAPET = 1150

/**
 * The beams the projects use: Works Desk's catalogue (its tasks are graded
 * against it, so it is left as it is) and heavier sections for longer spans,
 * on the same fictional scale.
 */
export const CATALOGUE: Array<{ id: string; z: number; mass: number }> = [
  ...SECTIONS,
  { id: 'NB-400', z: 900, mass: 60 },
  { id: 'NB-500', z: 1500, mass: 80 },
  { id: 'NB-600', z: 2300, mass: 101 },
  { id: 'NB-700', z: 3200, mass: 125 },
]

export function section(id: string) {
  return CATALOGUE.find((s) => s.id === id)
}

/** A section's depth (mm), from its name ("NB-300" is 300 mm deep). */
export function sectionDepth(id: string): number {
  const n = Number(id.split('-')[1])
  return Number.isFinite(n) && n > 0 ? n : 200
}

const f1 = (n: number) => n.toFixed(1)
const f0 = (n: number) => Math.round(n).toString()

/** Bending of a simply supported beam under a uniform load. */
function bending(
  id: string,
  title: string,
  w: number,
  span: number,
  sectionId: string,
  discipline: Discipline = 'structural',
): CalcLine {
  const s = section(sectionId)
  const m = (w * span * span) / 8
  if (!s)
    return {
      id,
      discipline,
      title,
      working: [`M = wL²/8 = ${f1(w)} × ${f1(span)}² ÷ 8 = ${f1(m)} kNm`],
      result: `${sectionId} is not in the catalogue`,
      utilisation: Infinity,
      passes: false,
    }
  const stress = (m * 1e6) / (s.z * 1e3)
  return {
    id,
    discipline,
    title,
    working: [
      `w = ${f1(w)} kN/m, L = ${f1(span)} m`,
      `M = wL²/8 = ${f1(w)} × ${f1(span)}² ÷ 8 = ${f1(m)} kNm`,
      `σ = M ÷ Z = ${f1(m)} × 10⁶ ÷ (${s.z} × 10³) = ${f0(stress)} N/mm²`,
    ],
    result: `σ = ${f0(stress)} N/mm² ${stress <= ALLOWABLE_STRESS ? '≤' : '>'} ${ALLOWABLE_STRESS} N/mm² allowable (${s.id})`,
    utilisation: stress / ALLOWABLE_STRESS,
    passes: stress <= ALLOWABLE_STRESS,
  }
}

/** The span of the building's beams: across its shorter side, between walls and column lines (m). */
export function beamSpan(design: BuildingDesign): number {
  const b = bounds(design.outline)
  const alongX = b.x1 - b.x0 <= b.y1 - b.y0
  const [lo, hi] = alongX ? [b.x0, b.x1] : [b.y0, b.y1]
  const lines = new Set<number>([lo, hi])
  for (const c of design.columns) {
    const at = alongX ? c.x : c.y
    if (at > lo + 500 && at < hi - 500 && insideOutline(design.outline, c.x, c.y))
      lines.add(Math.round(at / 100) * 100)
  }
  const sorted = [...lines].sort((p, q) => p - q)
  let gap = 0
  for (let i = 1; i < sorted.length; i++) gap = Math.max(gap, sorted[i] - sorted[i - 1])
  return gap / 1000
}

function geometry(design: BuildingDesign): Finding[] {
  const out: Finding[] = []
  const add = (id: string, message: string, severity: Finding['severity'] = 'error') =>
    out.push({ id, severity, discipline: 'geometry', message })
  if (selfIntersects(design.outline))
    add('outline-crosses', 'The outline crosses itself: the walls cannot be built.')
  if (!isOrthogonal(design))
    add(
      'outline-angles',
      'Every wall must run along the grid (square corners): the site builds square corners only.',
    )
  const edges = walls(design)
  edges.forEach((w) => {
    if (w.length < 1000)
      add(
        `wall-short-${w.index}`,
        `Wall ${w.index + 1} is ${f0(w.length)} mm long: at least 1000 mm is needed.`,
      )
  })
  const { thickness, height } = design.wall
  if (thickness < 100 || thickness > 440)
    add(
      'wall-thickness',
      `The walls are ${thickness} mm thick: between 100 and 440 mm is buildable.`,
    )
  if (height < 2400 || height > 4500)
    add(
      'wall-height',
      `A storey is ${height} mm high: between 2400 and 4500 mm is allowed.`,
    )

  // Openings: inside their wall, clear of the ends and of each other, under the lintel.
  for (const o of design.openings) {
    const w = edges[o.wall]
    const name = `${o.kind === 'door' ? 'Door' : 'Window'} ${o.id}`
    if (!w) {
      add(`opening-wall-${o.id}`, `${name} is in a wall that does not exist.`)
      continue
    }
    if (o.storey >= design.storeys)
      add(`opening-storey-${o.id}`, `${name} is on a storey the building does not have.`)
    const start = o.offset - o.width / 2
    const end = o.offset + o.width / 2
    if (start < PIER || end > w.length - PIER)
      add(
        `opening-end-${o.id}`,
        `${name} (${o.width} mm wide) needs ${PIER} mm of wall beside it: wall ${o.wall + 1} is ${f0(w.length)} mm long.`,
      )
    if (o.sill + o.height > height - LINTEL)
      add(
        `opening-lintel-${o.id}`,
        `${name} reaches ${o.sill + o.height} mm: a lintel needs it at most ${height - LINTEL} mm high.`,
      )
    if (o.kind === 'door' && (o.width < MIN_DOOR.width || o.height < MIN_DOOR.height))
      add(
        `door-size-${o.id}`,
        `${name} is ${o.width} × ${o.height} mm: doors must be at least ${MIN_DOOR.width} × ${MIN_DOOR.height} mm.`,
      )
    if (o.kind === 'door' && o.sill !== 0)
      add(`door-sill-${o.id}`, `${name} must start at floor level (sill 0).`)
  }
  for (let i = 0; i < design.openings.length; i++)
    for (let j = i + 1; j < design.openings.length; j++) {
      const a = design.openings[i]
      const b = design.openings[j]
      if (a.wall !== b.wall || a.storey !== b.storey) continue
      const gap = Math.abs(a.offset - b.offset) - (a.width + b.width) / 2
      if (gap < PIER)
        add(
          `opening-gap-${a.id}-${b.id}`,
          `${a.id} and ${b.id} are ${gap < 0 ? 'overlapping' : `${f0(gap)} mm apart`}: leave at least ${PIER} mm of wall between openings.`,
        )
    }
  for (const c of design.columns) {
    if (!section(c.section))
      add(
        `column-section-${c.id}`,
        `Column ${c.id}: ${c.section} is not in the catalogue.`,
      )
    if (!insideOutline(design.outline, c.x, c.y) && !onOutline(design, c.x, c.y))
      add(`column-outside-${c.id}`, `Column ${c.id} is outside the building.`)
  }
  return out
}

function onOutline(design: BuildingDesign, x: number, y: number): boolean {
  return walls(design).some((w) => {
    const t = ((x - w.a[0]) * w.dir[0] + (y - w.a[1]) * w.dir[1]) / Math.max(1, w.length)
    if (t < 0 || t > 1) return false
    const px = w.a[0] + w.dir[0] * t * w.length
    const py = w.a[1] + w.dir[1] * t * w.length
    return Math.hypot(px - x, py - y) <= design.wall.thickness
  })
}

function buildingCalcs(design: BuildingDesign, site: SiteData): CalcLine[] {
  const out: CalcLine[] = []
  const span = beamSpan(design)
  const s = LOADS.beamSpacing
  // Roof beams, and floor beams when there is more than one storey.
  const roofW = (LOADS.roofDead + LOADS.roofImposed) * s
  out.push(bending('roof-beam', 'Roof beams (bending)', roofW, span, design.beam.section))
  if (design.storeys > 1) {
    const floorW = (LOADS.floorDead + site.imposed) * s
    out.push(
      bending('floor-beam', 'Floor beams (bending)', floorW, span, design.beam.section),
    )
  }

  // Foundations: the load each metre of wall brings down, spread over the footing.
  const { foundation, wall, storeys } = design
  const tributary = span / 2
  const wallLoad = (wall.thickness / 1000) * (wall.height / 1000) * storeys * LOADS.wall
  const roofLoad = (LOADS.roofDead + LOADS.roofImposed) * tributary
  const floorLoad = (storeys - 1) * (LOADS.floorDead + site.imposed) * tributary
  const footing = (foundation.width / 1000) * (foundation.depth / 1000) * LOADS.concrete
  if (foundation.type === 'raft') {
    const area = footprintArea(design)
    const total =
      perimeter(design) * wallLoad +
      area * (LOADS.roofDead + LOADS.roofImposed) +
      area * (storeys - 1) * (LOADS.floorDead + site.imposed)
    const pressure = total / area + (foundation.depth / 1000) * LOADS.concrete
    out.push({
      id: 'bearing',
      discipline: 'geotechnical',
      title: 'Raft foundation (bearing pressure)',
      working: [
        `Total load = walls + roof + floors = ${f0(total)} kN`,
        `q = load ÷ area + raft = ${f0(total)} ÷ ${f1(area)} + ${f1((foundation.depth / 1000) * LOADS.concrete)} = ${f1(pressure)} kPa`,
      ],
      result: `q = ${f1(pressure)} kPa ${pressure <= site.bearing ? '≤' : '>'} ${site.bearing} kPa allowable`,
      utilisation: pressure / site.bearing,
      passes: pressure <= site.bearing,
    })
  } else {
    const perMetre = wallLoad + roofLoad + floorLoad + footing
    const pressure = perMetre / (foundation.width / 1000)
    out.push({
      id: 'bearing',
      discipline: 'geotechnical',
      title: `${foundation.type === 'strip' ? 'Strip' : 'Pad'} foundation (bearing pressure)`,
      working: [
        `Walls ${f1(wallLoad)} + roof ${f1(roofLoad)} + floors ${f1(floorLoad)} + footing ${f1(footing)} = ${f1(perMetre)} kN per metre`,
        `q = ${f1(perMetre)} ÷ ${f1(foundation.width / 1000)} m wide = ${f1(pressure)} kPa`,
      ],
      result: `q = ${f1(pressure)} kPa ${pressure <= site.bearing ? '≤' : '>'} ${site.bearing} kPa allowable`,
      utilisation: pressure / site.bearing,
      passes: pressure <= site.bearing,
    })
    const minWidth = wall.thickness + 2 * 150
    out.push({
      id: 'footing-width',
      discipline: 'geotechnical',
      title: 'Footing wider than the wall',
      working: [`Wall ${wall.thickness} mm + 150 mm each side = ${minWidth} mm`],
      result: `${foundation.width} mm ${foundation.width >= minWidth ? '≥' : '<'} ${minWidth} mm`,
      utilisation: minWidth / foundation.width,
      passes: foundation.width >= minWidth,
    })
  }
  out.push({
    id: 'footing-depth',
    discipline: 'geotechnical',
    title: 'Foundation depth (frost and topsoil)',
    working: [`The site investigation asks for at least ${site.minDepth} mm`],
    result: `${foundation.depth} mm ${foundation.depth >= site.minDepth ? '≥' : '<'} ${site.minDepth} mm`,
    utilisation: site.minDepth / foundation.depth,
    passes: foundation.depth >= site.minDepth,
  })

  // Services: simplified Northbank design rules, not regulations.
  const floor = footprintArea(design) * storeys
  const circuits = Math.max(2, Math.ceil(floor / 50))
  out.push({
    id: 'circuits',
    discipline: 'electrical',
    title: 'Electrical circuits (lighting and power)',
    working: [
      `Northbank rule: one circuit per 50 m², at least 2`,
      `${f1(floor)} m² ÷ 50 = ${circuits} circuits`,
    ],
    result: `${design.services.circuits} ${design.services.circuits >= circuits ? '≥' : '<'} ${circuits} needed`,
    utilisation: circuits / Math.max(1, design.services.circuits),
    passes: design.services.circuits >= circuits,
  })
  return out
}

function bridgeCalcs(design: BridgeDesign, site: SiteData): CalcLine[] {
  const out: CalcLine[] = []
  const span = design.span / 1000 + 0.5
  const s = section(design.girders.section)
  const strip = design.width / 1000 / design.girders.count
  const deck = (design.deck.thickness / 1000) * LOADS.concrete + LOADS.surfacing
  const self = s ? (s.mass * 9.81) / 1000 : 0
  const w = (deck + LOADS.footbridge) * strip + self
  out.push(bending('girder', 'Main girders (bending)', w, span, design.girders.section))
  out.push({
    id: 'parapet',
    discipline: 'structural',
    title: 'Parapet height (people must not fall)',
    working: [`At least ${MIN_PARAPET} mm for a footbridge (simplified)`],
    result: `${design.parapet.height} mm ${design.parapet.height >= MIN_PARAPET ? '≥' : '<'} ${MIN_PARAPET} mm`,
    utilisation: MIN_PARAPET / design.parapet.height,
    passes: design.parapet.height >= MIN_PARAPET,
  })
  // Each abutment carries half the bridge, on its base.
  const reaction = (w * span * design.girders.count) / 2
  const plan = (design.abutment.base / 1000) * (design.width / 1000 + 1)
  const own = plan * (design.abutment.height / 1000) * LOADS.concrete
  const q = (reaction + own) / plan
  out.push({
    id: 'bearing',
    discipline: 'geotechnical',
    title: 'Abutment (bearing pressure)',
    working: [
      `Reaction = w × L × girders ÷ 2 = ${f1(w)} × ${f1(span)} × ${design.girders.count} ÷ 2 = ${f0(reaction)} kN`,
      `Abutment ${f0(own)} kN on ${f1(plan)} m²`,
      `q = (${f0(reaction)} + ${f0(own)}) ÷ ${f1(plan)} = ${f1(q)} kPa`,
    ],
    result: `q = ${f1(q)} kPa ${q <= site.bearing ? '≤' : '>'} ${site.bearing} kPa allowable`,
    utilisation: q / site.bearing,
    passes: q <= site.bearing,
  })
  return out
}

/** Every check on a design, against the site. */
export function checkDesign(design: Design, site: SiteData): CheckReport {
  const findings: Finding[] = design.kind === 'building' ? geometry(design) : []
  if (design.kind === 'bridge' && design.width < 1500)
    findings.push({
      id: 'deck-width',
      severity: 'error',
      discipline: 'geometry',
      message: `The deck is ${design.width} mm wide: a footbridge needs at least 1500 mm.`,
    })
  // Calculations only mean something for a buildable shape.
  const calcs =
    design.kind === 'building'
      ? findings.some((f) => f.id === 'outline-crosses')
        ? []
        : buildingCalcs(design, site)
      : bridgeCalcs(design, site)
  for (const c of calcs)
    if (!c.passes)
      findings.push({
        id: `calc-${c.id}`,
        severity: 'error',
        discipline: c.discipline,
        message: `${c.title}: ${c.result}.`,
      })
    else if (c.utilisation > 0.95)
      findings.push({
        id: `calc-close-${c.id}`,
        severity: 'warning',
        discipline: c.discipline,
        message: `${c.title} is at ${Math.round(c.utilisation * 100)}% of its limit: little margin.`,
      })
  return {
    findings,
    calcs,
    passes: !findings.some((f) => f.severity === 'error'),
  }
}

/** The lightest catalogue section whose bending stress passes (for hints). */
export function lightestBeam(w: number, span: number): string | null {
  for (const s of CATALOGUE) {
    const m = (w * span * span) / 8
    if ((m * 1e6) / (s.z * 1e3) <= ALLOWABLE_STRESS) return s.id
  }
  return null
}
