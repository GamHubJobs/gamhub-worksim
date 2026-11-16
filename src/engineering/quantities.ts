/**
 * From a design to what it takes to build: the bill of quantities (how much
 * of everything), its cost, and the construction programme (the stages, in
 * order, each with its duration in working days).
 *
 * The rates, outputs and prices are simplified and fictional, for learning.
 * Pure TypeScript.
 */
import { section } from './checks'
import {
  footprintArea,
  perimeter,
  type BridgeDesign,
  type BuildingDesign,
  type Design,
} from './design'

/** Every construction stage the site knows, in the order they can happen. */
export const STAGE_IDS = [
  'survey',
  'excavation',
  'reinforcement',
  'foundations',
  'slab',
  'structure',
  'walls',
  'openings',
  'roofing',
  'electrical',
  'plumbing',
  'hvac',
  'finishing',
  'inspection',
  'handover',
] as const
export type StageId = (typeof STAGE_IDS)[number]

export interface StageInfo {
  name: string
  /** What the crew does, for the site and the programme. */
  work: string
}

export const STAGES: Record<StageId, StageInfo> = {
  survey: { name: 'Site survey and setting out', work: 'Surveying and pegging out' },
  excavation: { name: 'Excavation', work: 'Digging the foundations' },
  reinforcement: { name: 'Reinforcement', work: 'Fixing the steel reinforcement' },
  foundations: { name: 'Foundations (concrete)', work: 'Pouring the concrete' },
  slab: { name: 'Floors and slabs', work: 'Casting the slab' },
  structure: { name: 'Columns and beams', work: 'Erecting the steel frame' },
  walls: { name: 'Walls and partitions', work: 'Building the walls' },
  openings: { name: 'Doors and windows', work: 'Fitting doors and windows' },
  roofing: { name: 'Roofing', work: 'Building the roof' },
  electrical: { name: 'Electrical installation', work: 'Wiring and testing circuits' },
  plumbing: { name: 'Plumbing installation', work: 'Fitting pipework and sanitaryware' },
  hvac: { name: 'Heating and ventilation', work: 'Installing the units and ducts' },
  finishing: { name: 'Finishing', work: 'Finishes and cleaning' },
  inspection: { name: 'Quality inspection', work: 'Snagging and the final inspection' },
  handover: { name: 'Handover', work: 'Handing over to the client' },
}

/** The stage names a bridge's crew uses for the same work. */
const BRIDGE_NAMES: Partial<Record<StageId, StageInfo>> = {
  excavation: { name: 'Excavation (abutments)', work: 'Digging out the abutments' },
  reinforcement: { name: 'Reinforcement (abutments)', work: 'Fixing the abutment steel' },
  foundations: { name: 'Abutments (concrete)', work: 'Pouring the abutments' },
  structure: { name: 'Girders (crane lift)', work: 'Lifting the girders into place' },
  slab: { name: 'Deck', work: 'Casting the deck' },
  finishing: { name: 'Parapets and surfacing', work: 'Fitting parapets and surfacing' },
}

export function stageInfo(id: StageId, design: Design): StageInfo {
  return (design.kind === 'bridge' && BRIDGE_NAMES[id]) || STAGES[id]
}

export interface BoqLine {
  code: string
  item: string
  unit: 'm³' | 'm²' | 'm' | 'kg' | 'nr' | 'item'
  quantity: number
  /** £ per unit (fictional). */
  rate: number
  amount: number
  stage: StageId
}

const r1 = (n: number) => Math.round(n * 10) / 10

function line(
  code: string,
  item: string,
  unit: BoqLine['unit'],
  quantity: number,
  rate: number,
  stage: StageId,
): BoqLine {
  const q = r1(quantity)
  return { code, item, unit, quantity: q, rate, amount: Math.round(q * rate), stage }
}

const WALL_RATES: Record<BuildingDesign['wall']['material'], [string, number]> = {
  blockwork: ['Blockwork walls', 45],
  brick: ['Brick walls', 70],
  'timber-frame': ['Timber-frame walls', 60],
  cladding: ['Cladding panels on rails', 55],
}

/** Rebar per cubic metre of reinforced concrete (kg/m³, simplified). */
export const REBAR_DENSITY = 90

export function openingArea(design: BuildingDesign): number {
  return design.openings.reduce((sum, o) => sum + (o.width * o.height) / 1e6, 0)
}

function buildingBoq(d: BuildingDesign): BoqLine[] {
  const area = footprintArea(d)
  const run = perimeter(d)
  const fw = d.foundation.width / 1000
  const fd = d.foundation.depth / 1000
  const footing = d.foundation.type === 'raft' ? area * fd : run * fw * fd
  const slab = area * (d.slab.thickness / 1000) * d.storeys
  const dig = footing + area * 0.15
  const wallArea = run * (d.wall.height / 1000) * d.storeys - openingArea(d)
  const beamSec = section(d.beam.section)
  const spanMetres = Math.sqrt(area) // a fair length of beam per bay
  const beamLength = (area / 4) * d.storeys + spanMetres
  const columnLength = d.columns.length * (d.wall.height / 1000) * d.storeys
  const colMass = d.columns.reduce((sum, c) => sum + (section(c.section)?.mass ?? 0), 0)
  const steel =
    beamLength * (beamSec?.mass ?? 0) +
    (d.columns.length ? (colMass / d.columns.length) * columnLength : 0)
  const roof =
    d.roof.type === 'pitched' ? area / Math.cos((d.roof.pitch * Math.PI) / 180) : area
  const doors = d.openings.filter((o) => o.kind === 'door')
  const windows = d.openings.filter((o) => o.kind === 'window')
  const [wallItem, wallRate] = WALL_RATES[d.wall.material]
  const lines: BoqLine[] = [
    line('1.1', 'Site survey and setting out', 'item', 1, 1500, 'survey'),
    line('2.1', 'Excavate foundations and slab', 'm³', dig, 35, 'excavation'),
    line(
      '3.1',
      'Reinforcement bars',
      'kg',
      footing * REBAR_DENSITY,
      1.2,
      'reinforcement',
    ),
    line('3.2', 'Concrete in foundations', 'm³', footing, 140, 'foundations'),
    line('4.1', 'Concrete floor slabs', 'm³', slab, 150, 'slab'),
    line('5.1', 'Structural steel (beams and columns)', 'kg', steel, 2.8, 'structure'),
    line('6.1', wallItem, 'm²', wallArea, wallRate, 'walls'),
    line('7.1', 'Doors, supplied and fitted', 'nr', doors.length, 650, 'openings'),
    line(
      '7.2',
      'Windows, supplied and fitted',
      'm²',
      windows.reduce((s, o) => s + (o.width * o.height) / 1e6, 0),
      300,
      'openings',
    ),
    line(
      '8.1',
      d.roof.type === 'pitched' ? 'Pitched roof, tiled' : 'Flat roof, membrane',
      'm²',
      roof,
      d.roof.type === 'pitched' ? 110 : 85,
      'roofing',
    ),
    line(
      '9.1',
      'Electrical circuits, wired and tested',
      'nr',
      d.services.circuits,
      900,
      'electrical',
    ),
  ]
  if (d.services.sanitary > 0)
    lines.push(
      line(
        '10.1',
        'Sanitaryware and pipework',
        'nr',
        d.services.sanitary,
        1100,
        'plumbing',
      ),
    )
  if (d.services.hvac > 0)
    lines.push(
      line('11.1', 'Heating and ventilation units', 'nr', d.services.hvac, 2400, 'hvac'),
    )
  lines.push(
    line('12.1', 'Internal finishes', 'm²', area * d.storeys, 35, 'finishing'),
    line('13.1', 'Final inspection and handover file', 'item', 1, 800, 'inspection'),
  )
  return lines
}

function bridgeBoq(d: BridgeDesign): BoqLine[] {
  const span = d.span / 1000
  const width = d.width / 1000
  const abutment = 2 * (d.abutment.base / 1000) * (width + 1) * (d.abutment.height / 1000)
  const deck = (span + 1) * width * (d.deck.thickness / 1000)
  const girder = d.girders.count * (span + 1) * (section(d.girders.section)?.mass ?? 0)
  return [
    line('1.1', 'Site survey and setting out', 'item', 1, 1500, 'survey'),
    line('2.1', 'Excavate abutments', 'm³', abutment * 1.3, 35, 'excavation'),
    line(
      '3.1',
      'Reinforcement bars',
      'kg',
      (abutment + deck) * REBAR_DENSITY,
      1.2,
      'reinforcement',
    ),
    line('3.2', 'Concrete in abutments', 'm³', abutment, 160, 'foundations'),
    line('5.1', 'Steel girders, lifted in', 'kg', girder, 3.2, 'structure'),
    line('4.1', 'Concrete deck', 'm³', deck, 170, 'slab'),
    line('12.1', 'Parapets', 'm', 2 * (span + 1), 220, 'finishing'),
    line('12.2', 'Deck surfacing', 'm²', (span + 1) * width, 45, 'finishing'),
    line('13.1', 'Final inspection and handover file', 'item', 1, 800, 'inspection'),
  ]
}

/** Preliminaries: site set-up, welfare, supervision (a share of the works). */
export const PRELIMS = 0.12

export interface Estimate {
  lines: BoqLine[]
  works: number
  prelims: number
  total: number
}

export function billOfQuantities(design: Design): Estimate {
  const lines = design.kind === 'building' ? buildingBoq(design) : bridgeBoq(design)
  const works = lines.reduce((s, l) => s + l.amount, 0)
  const prelims = Math.round(works * PRELIMS)
  return { lines, works, prelims, total: works + prelims }
}

export interface ProgrammeStage {
  id: StageId
  name: string
  days: number
  /** Working day the stage starts on (0 is the first day on site). */
  start: number
}

const qty = (e: Estimate, code: string) =>
  e.lines.find((l) => l.code === code)?.quantity ?? 0
const days = (n: number) => Math.max(1, Math.ceil(n))

/** Which stages a design needs, in order. */
export function stagesFor(design: Design): StageId[] {
  if (design.kind === 'bridge')
    return [
      'survey',
      'excavation',
      'reinforcement',
      'foundations',
      'structure',
      'slab',
      'finishing',
      'inspection',
      'handover',
    ]
  return STAGE_IDS.filter((id) => {
    if (id === 'plumbing') return design.services.sanitary > 0
    if (id === 'hvac') return design.services.hvac > 0
    return true
  })
}

/** The construction programme: each stage's duration from its quantities (working days). */
export function programme(design: Design): ProgrammeStage[] {
  const e = billOfQuantities(design)
  const duration: Record<StageId, number> = {
    survey: 1,
    excavation: days(qty(e, '2.1') / 25),
    reinforcement: days(qty(e, '3.1') / 400),
    foundations: days(qty(e, '3.2') / 15) + 1,
    slab: days(qty(e, '4.1') / 12) + 1,
    structure: days(qty(e, '5.1') / 1500) + 1,
    walls: days(qty(e, '6.1') / 12),
    openings: days((qty(e, '7.1') + qty(e, '7.2') / 2) * 0.5),
    roofing: days(qty(e, '8.1') / 40),
    electrical: days(qty(e, '9.1')),
    plumbing: days(qty(e, '10.1')),
    hvac: days(qty(e, '11.1') * 1.5),
    finishing: days(design.kind === 'bridge' ? qty(e, '12.1') / 10 : qty(e, '12.1') / 40),
    inspection: 1,
    handover: 1,
  }
  let start = 0
  return stagesFor(design).map((id) => {
    const stage = { id, name: stageInfo(id, design).name, days: duration[id], start }
    start += duration[id]
    return stage
  })
}

export function programmeDays(design: Design): number {
  return programme(design).reduce((s, p) => s + p.days, 0)
}

/** "£12,345". */
export function money(n: number): string {
  return `£${Math.round(n).toLocaleString('en-GB')}`
}
