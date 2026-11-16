/**
 * Design revisions: what changed between two versions of a design, who must
 * check it, and which construction stages it touches. An approved revision
 * changes the site's plan; work already built to the old design is rework.
 * Pure TypeScript.
 */
import type { Design, Opening } from './design'
import type { StageId } from './quantities'

export type ChangeKind = 'structural' | 'architectural' | 'services'

export interface DesignChange {
  kind: ChangeKind
  /** e.g. "Window W3 added in wall 2". */
  text: string
  /** The construction stages it affects. */
  stages: StageId[]
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const ABOVE_GROUND: StageId[] = ['walls', 'openings', 'roofing', 'finishing']

function openingText(o: Opening) {
  return `${o.kind === 'door' ? 'Door' : 'Window'} ${o.id}`
}

/** Every change from `before` to `after`. */
export function diffDesigns(before: Design, after: Design): DesignChange[] {
  const out: DesignChange[] = []
  if (before.kind !== after.kind)
    return [
      {
        kind: 'structural',
        text: 'A different kind of structure',
        stages: [
          'excavation',
          'reinforcement',
          'foundations',
          'slab',
          'structure',
          ...ABOVE_GROUND,
        ],
      },
    ]
  if (before.kind === 'bridge' && after.kind === 'bridge') {
    if (before.span !== after.span)
      out.push({
        kind: 'structural',
        text: `Span ${before.span} → ${after.span} mm`,
        stages: ['excavation', 'foundations', 'structure', 'slab', 'finishing'],
      })
    if (before.width !== after.width)
      out.push({
        kind: 'structural',
        text: `Deck width ${before.width} → ${after.width} mm`,
        stages: ['foundations', 'structure', 'slab', 'finishing'],
      })
    if (!same(before.girders, after.girders))
      out.push({
        kind: 'structural',
        text: `Girders ${before.girders.count} × ${before.girders.section} → ${after.girders.count} × ${after.girders.section}`,
        stages: ['structure'],
      })
    if (!same(before.deck, after.deck))
      out.push({
        kind: 'structural',
        text: `Deck ${before.deck.thickness} → ${after.deck.thickness} mm thick`,
        stages: ['slab'],
      })
    if (!same(before.abutment, after.abutment))
      out.push({
        kind: 'structural',
        text: 'Abutments resized',
        stages: ['excavation', 'reinforcement', 'foundations'],
      })
    if (!same(before.parapet, after.parapet))
      out.push({
        kind: 'architectural',
        text: `Parapets ${before.parapet.height} → ${after.parapet.height} mm high`,
        stages: ['finishing'],
      })
    return out
  }
  if (before.kind !== 'building' || after.kind !== 'building') return out

  if (!same(before.outline, after.outline))
    out.push({
      kind: 'structural',
      text: 'The building’s outline (wall positions or lengths)',
      stages: [
        'survey',
        'excavation',
        'reinforcement',
        'foundations',
        'slab',
        ...ABOVE_GROUND,
      ],
    })
  if (before.wall.thickness !== after.wall.thickness)
    out.push({
      kind: 'structural',
      text: `Walls ${before.wall.thickness} → ${after.wall.thickness} mm thick`,
      stages: ['foundations', 'walls'],
    })
  if (before.wall.height !== after.wall.height)
    out.push({
      kind: 'structural',
      text: `Storey height ${before.wall.height} → ${after.wall.height} mm`,
      stages: ['structure', 'walls', 'roofing'],
    })
  if (before.wall.material !== after.wall.material)
    out.push({
      kind: 'architectural',
      text: `Walls in ${before.wall.material} → ${after.wall.material}`,
      stages: ['walls'],
    })
  if (before.storeys !== after.storeys)
    out.push({
      kind: 'structural',
      text: `${before.storeys} → ${after.storeys} storeys`,
      stages: ['foundations', 'slab', 'structure', ...ABOVE_GROUND],
    })
  if (!same(before.foundation, after.foundation))
    out.push({
      kind: 'structural',
      text: `Foundations ${before.foundation.width} × ${before.foundation.depth} → ${after.foundation.width} × ${after.foundation.depth} mm (${after.foundation.type})`,
      stages: ['excavation', 'reinforcement', 'foundations'],
    })
  if (!same(before.slab, after.slab))
    out.push({
      kind: 'structural',
      text: `Slab ${before.slab.thickness} → ${after.slab.thickness} mm`,
      stages: ['slab'],
    })
  if (before.beam.section !== after.beam.section)
    out.push({
      kind: 'structural',
      text: `Beams ${before.beam.section} → ${after.beam.section}`,
      stages: ['structure'],
    })
  if (!same(before.columns, after.columns))
    out.push({
      kind: 'structural',
      text: `Columns: ${before.columns.length} → ${after.columns.length}${before.columns.length === after.columns.length ? ' (moved or resized)' : ''}`,
      stages: ['foundations', 'structure'],
    })
  if (!same(before.roof, after.roof))
    out.push({
      kind: 'structural',
      text: `Roof ${before.roof.type}${before.roof.type === 'pitched' ? ` ${before.roof.pitch}°` : ''} → ${after.roof.type}${after.roof.type === 'pitched' ? ` ${after.roof.pitch}°` : ''}`,
      stages: ['roofing'],
    })
  // Openings by ID: added, removed, made wider (a new lintel), or moved.
  const old = new Map(before.openings.map((o) => [o.id, o]))
  const now = new Map(after.openings.map((o) => [o.id, o]))
  for (const o of after.openings) {
    const was = old.get(o.id)
    if (!was)
      out.push({
        kind: 'structural',
        text: `${openingText(o)} added in wall ${o.wall + 1}`,
        stages: ['walls', 'openings'],
      })
    else if (was.width !== o.width || was.wall !== o.wall || was.height !== o.height)
      out.push({
        kind: 'structural',
        text: `${openingText(o)} resized or moved to another wall`,
        stages: ['walls', 'openings'],
      })
    else if (!same(was, o))
      out.push({
        kind: 'architectural',
        text: `${openingText(o)} moved along its wall`,
        stages: ['walls', 'openings'],
      })
  }
  for (const o of before.openings)
    if (!now.has(o.id))
      out.push({
        kind: 'architectural',
        text: `${openingText(o)} removed`,
        stages: ['walls', 'openings'],
      })
  const s = before.services
  const t = after.services
  if (s.circuits !== t.circuits)
    out.push({
      kind: 'services',
      text: `Electrical circuits ${s.circuits} → ${t.circuits}`,
      stages: ['electrical'],
    })
  if (s.sanitary !== t.sanitary)
    out.push({
      kind: 'services',
      text: `Sanitaryware ${s.sanitary} → ${t.sanitary}`,
      stages: ['plumbing'],
    })
  if (s.hvac !== t.hvac)
    out.push({
      kind: 'services',
      text: `Heating and ventilation units ${s.hvac} → ${t.hvac}`,
      stages: ['hvac'],
    })
  return out
}

/** Who checks a revision: structural changes go to the structural engineer. */
export function reviewerFor(
  changes: DesignChange[],
): 'structural' | 'services' | 'manager' {
  if (changes.some((c) => c.kind === 'structural')) return 'structural'
  if (changes.some((c) => c.kind === 'services')) return 'services'
  return 'manager'
}

/** The stages a set of changes affects, without repeats. */
export function affectedStages(changes: DesignChange[]): StageId[] {
  return [...new Set(changes.flatMap((c) => c.stages))]
}
