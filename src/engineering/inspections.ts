/**
 * Inspections: the hold points where work stops until an engineer has
 * checked it. The player measures each item on site (a tape in the trench,
 * a meter on a circuit), compares the reading with the approved design and
 * its tolerance, and judges it. A wrong "it's fine" lets a defect through,
 * with consequences later; rejecting good work costs time.
 *
 * Readings are the approved design plus the as-built deviations (from the
 * site's scenarios and the player's own choices). Pure TypeScript.
 */
import { sectionDepth } from './checks'
import { bounds, type Design } from './design'
import { irReadings } from './issues'

export type InspectionId =
  'formation' | 'reinforcement' | 'structure' | 'electrical' | 'final'

export interface InspectionItem {
  id: string
  /** What is measured, and where, e.g. "Trench depth at grid B1". */
  label: string
  unit: string
  /** What the approved design says. */
  design: number
  /** How it passes: within ± tolerance, at least, or at most. */
  rule: 'within' | 'min' | 'max'
  tolerance: number
  /** Where on site it is measured (metres, site coordinates of the plot), for the 3D site. */
  at: { x: number; z: number }
  /** How it is measured, for the activity's prompt. */
  tool: 'tape' | 'level' | 'meter' | 'count' | 'look'
}

export interface InspectionDef {
  id: InspectionId
  title: string
  /** Who would normally sign it with the player. */
  with: string
  items: (design: Design, seed: number) => InspectionItem[]
}

const mm = (n: number) => n / 1000

/** Plot coordinates (metres) of a design point (mm): x east, z south. */
export function plotPoint(
  design: Design,
  x: number,
  y: number,
): { x: number; z: number } {
  if (design.kind === 'bridge') return { x: mm(x), z: -mm(y) }
  const b = bounds(design.outline)
  const cx = (b.x0 + b.x1) / 2
  const cy = (b.y0 + b.y1) / 2
  return { x: mm(x - cx), z: -mm(y - cy) }
}

export const INSPECTIONS: Record<InspectionId, InspectionDef> = {
  formation: {
    id: 'formation',
    title: 'Formation inspection (the excavation)',
    with: 'Building control and the site supervisor',
    items: (d) => {
      if (d.kind === 'bridge') {
        const half = d.span / 2 + 500
        return [
          {
            id: 'depth-west',
            label: 'Excavation depth, west abutment',
            unit: 'mm',
            design: d.abutment.height,
            rule: 'within',
            tolerance: 50,
            at: { x: -mm(half), z: 0 },
            tool: 'tape',
          },
          {
            id: 'depth-east',
            label: 'Excavation depth, east abutment',
            unit: 'mm',
            design: d.abutment.height,
            rule: 'within',
            tolerance: 50,
            at: { x: mm(half), z: 0 },
            tool: 'tape',
          },
          {
            id: 'ground-east',
            label:
              'Ground at the base, east abutment (probe resistance, blows per 100 mm)',
            unit: 'blows',
            design: 8,
            rule: 'min',
            tolerance: 0,
            at: { x: mm(half), z: 0.8 },
            tool: 'look',
          },
        ]
      }
      const b = bounds(d.outline)
      const p = (x: number, y: number) => plotPoint(d, x, y)
      return [
        {
          id: 'depth-a',
          label: 'Trench depth at the south-west corner',
          unit: 'mm',
          design: d.foundation.depth,
          rule: 'within',
          tolerance: 25,
          at: p(b.x0, b.y0),
          tool: 'tape',
        },
        {
          id: 'depth-b',
          label: 'Trench depth at the north-east corner',
          unit: 'mm',
          design: d.foundation.depth,
          rule: 'within',
          tolerance: 25,
          at: p(b.x1, b.y1),
          tool: 'tape',
        },
        {
          id: 'width',
          label: 'Trench width, south wall',
          unit: 'mm',
          design: d.foundation.width,
          rule: 'within',
          tolerance: 25,
          at: p((b.x0 + b.x1) / 2, b.y0),
          tool: 'tape',
        },
        {
          id: 'ground',
          label: 'Ground at the base of the trench (probe resistance, blows per 100 mm)',
          unit: 'blows',
          design: 8,
          rule: 'min',
          tolerance: 0,
          at: p(b.x0, (b.y0 + b.y1) / 2),
          tool: 'look',
        },
      ]
    },
  },
  reinforcement: {
    id: 'reinforcement',
    title: 'Reinforcement inspection (before the pour)',
    with: 'The structural engineer',
    items: (d) => {
      const at =
        d.kind === 'bridge'
          ? { x: -mm(d.span / 2 + 500), z: 0 }
          : plotPoint(d, bounds(d.outline).x0, bounds(d.outline).y0)
      return [
        {
          id: 'spacing',
          label: 'Bar spacing (centres)',
          unit: 'mm',
          design: 200,
          rule: 'within',
          tolerance: 15,
          at,
          tool: 'tape',
        },
        {
          id: 'cover',
          label: 'Concrete cover to the bars',
          unit: 'mm',
          design: 50,
          rule: 'within',
          tolerance: 10,
          at: { x: at.x + 1.2, z: at.z },
          tool: 'tape',
        },
      ]
    },
  },
  structure: {
    id: 'structure',
    title: 'Structural inspection (the frame)',
    with: 'The structural engineer',
    items: (d) => {
      if (d.kind === 'bridge')
        return [
          {
            id: 'girders',
            label: 'Girders in place',
            unit: 'nr',
            design: d.girders.count,
            rule: 'within',
            tolerance: 0,
            at: { x: 0, z: 0 },
            tool: 'count',
          },
          {
            id: 'girder-depth',
            label: `Girder depth (${d.girders.section})`,
            unit: 'mm',
            design: sectionDepth(d.girders.section),
            rule: 'within',
            tolerance: 5,
            at: { x: -mm(d.span / 2), z: mm(d.width / 2) },
            tool: 'tape',
          },
          {
            id: 'bearing-level',
            label: 'Level difference across the bearings',
            unit: 'mm',
            design: 0,
            rule: 'within',
            tolerance: 5,
            at: { x: mm(d.span / 2), z: 0 },
            tool: 'level',
          },
        ]
      const b = bounds(d.outline)
      return [
        {
          id: 'beam-depth',
          label: `Beam depth (${d.beam.section})`,
          unit: 'mm',
          design: sectionDepth(d.beam.section),
          rule: 'within',
          tolerance: 5,
          at: plotPoint(d, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2),
          tool: 'tape',
        },
        {
          id: 'columns',
          label: 'Columns in place',
          unit: 'nr',
          design: d.columns.length,
          rule: 'within',
          tolerance: 0,
          at: plotPoint(d, b.x0 + 1000, (b.y0 + b.y1) / 2),
          tool: 'count',
        },
        {
          id: 'storey-height',
          label: 'Height to the underside of the beams',
          unit: 'mm',
          design: d.wall.height,
          rule: 'within',
          tolerance: 20,
          at: plotPoint(d, b.x1 - 1000, (b.y0 + b.y1) / 2),
          tool: 'tape',
        },
      ]
    },
  },
  electrical: {
    id: 'electrical',
    title: 'Electrical inspection and test',
    with: 'The electrician',
    items: (d, seed) => {
      if (d.kind !== 'building') return []
      const b = bounds(d.outline)
      const board = plotPoint(d, b.x0 + 600, b.y1 - 600)
      return [
        ...irReadings(seed, d.services.circuits).map((_, i) => ({
          id: `ir-${i + 1}`,
          label: `Insulation resistance, circuit ${i + 1}`,
          unit: 'MΩ',
          design: 1,
          rule: 'min' as const,
          tolerance: 0,
          at: board,
          tool: 'meter' as const,
        })),
        {
          id: 'earth',
          label: 'Earth continuity at the board',
          unit: 'Ω',
          design: 0.5,
          rule: 'max',
          tolerance: 0,
          at: { x: board.x + 0.4, z: board.z },
          tool: 'meter',
        },
      ]
    },
  },
  final: {
    id: 'final',
    title: 'Final inspection against the approved drawings',
    with: 'The quality inspector and the client',
    items: (d) => {
      if (d.kind === 'bridge')
        return [
          {
            id: 'span',
            label: 'Clear span',
            unit: 'mm',
            design: d.span,
            rule: 'within',
            tolerance: 20,
            at: { x: 0, z: mm(d.width / 2) + 0.5 },
            tool: 'tape',
          },
          {
            id: 'deck-width',
            label: 'Deck width between parapets',
            unit: 'mm',
            design: d.width,
            rule: 'within',
            tolerance: 15,
            at: { x: 0, z: 0 },
            tool: 'tape',
          },
          {
            id: 'parapet',
            label: 'Parapet height',
            unit: 'mm',
            design: d.parapet.height,
            rule: 'min',
            tolerance: 0,
            at: { x: 1.5, z: mm(d.width / 2) },
            tool: 'tape',
          },
        ]
      const b = bounds(d.outline)
      const p = (x: number, y: number) => plotPoint(d, x, y)
      return [
        {
          id: 'length',
          label: 'Overall length (east–west, wall centres)',
          unit: 'mm',
          design: b.x1 - b.x0,
          rule: 'within',
          tolerance: 20,
          at: p((b.x0 + b.x1) / 2, b.y0 - 1500),
          tool: 'tape',
        },
        {
          id: 'breadth',
          label: 'Overall width (north–south, wall centres)',
          unit: 'mm',
          design: b.y1 - b.y0,
          rule: 'within',
          tolerance: 20,
          at: p(b.x1 + 1500, (b.y0 + b.y1) / 2),
          tool: 'tape',
        },
        {
          id: 'openings',
          label: 'Doors and windows, as on the approved drawings',
          unit: 'nr',
          design: d.openings.length,
          rule: 'within',
          tolerance: 0,
          at: p(b.x0 - 1500, b.y0 - 1500),
          tool: 'count',
        },
        {
          id: 'storey-height',
          label: 'Storey height',
          unit: 'mm',
          design: d.wall.height,
          rule: 'within',
          tolerance: 20,
          at: p(b.x0 + 1500, b.y0 + 1500),
          tool: 'tape',
        },
      ]
    },
  },
}

/** Does a reading conform to its item? */
export function conforms(item: InspectionItem, reading: number): boolean {
  if (item.rule === 'min') return reading >= item.design - item.tolerance
  if (item.rule === 'max') return reading <= item.design + item.tolerance
  return Math.abs(reading - item.design) <= item.tolerance + 1e-9
}

/**
 * What the player measures: the design plus the as-built deviation, with a
 * small, realistic scatter that stays within tolerance.
 */
export function reading(
  item: InspectionItem,
  deviations: Record<string, number>,
  seed: number,
): number {
  const deviation = deviations[item.id] ?? 0
  if (item.id.startsWith('ir-')) {
    if (deviation < 0) return 0.4
    const n = Number(item.id.slice(3))
    return 50 + ((seed * (n + 3)) % 150) + 100
  }
  if (item.id === 'earth') return 0.21 + deviation
  if (item.id === 'ground' || item.id === 'ground-east')
    return deviation < 0 ? 3 : 11 + (Math.abs(seed) % 4)
  if (item.unit === 'nr') return item.design + deviation
  // Scatter: up to a third of the tolerance, the same each time it is measured.
  const hash = [...item.id].reduce(
    (h, ch) => (h * 31 + ch.charCodeAt(0)) % 997,
    seed % 997,
  )
  const scatter = item.tolerance ? Math.round(((hash % 7) - 3) * (item.tolerance / 9)) : 0
  return item.design + deviation + scatter
}

/** "750 mm", "0.4 MΩ". */
export function formatReading(item: InspectionItem, value: number): string {
  const v = item.unit === 'MΩ' || item.unit === 'Ω' ? value.toString() : Math.round(value)
  return `${v} ${item.unit}`
}

/** What a reading must be, e.g. "750 mm ± 25" or "at least 1 MΩ". */
export function requirement(item: InspectionItem): string {
  if (item.rule === 'min') return `at least ${item.design} ${item.unit}`
  if (item.rule === 'max') return `at most ${item.design} ${item.unit}`
  return item.tolerance
    ? `${item.design} ${item.unit} ± ${item.tolerance}`
    : `${item.design} ${item.unit} exactly`
}
