/**
 * The construction site, laid out around the project's design: the
 * hoarding and its gate, the site cabin, the stores compound, the crane's
 * place, and (for the footbridge) the mill race with a temporary access
 * walkway across it. What is solid grows with the work: the walls as built,
 * with gaps where the doors are. What the engineer can do here, where.
 *
 * Metres; x east, z south; the plot is centred on the origin. Pure.
 */
import type { Box } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'
import { bounds, type Design } from '../design'
import type { InspectionItem } from '../inspections'
import { wallPieces, type BuildState } from './build'

export interface SiteLayout {
  /** The hoarding's inside edge. */
  x0: number
  x1: number
  z0: number
  z1: number
  gate: { x: number; z: number }
  cabin: { x: number; z: number }
  stores: { x: number; z: number }
  crane: { x: number; z: number }
  /** Where to stand and watch the work. */
  viewpoint: { x: number; z: number }
  start: { x: number; z: number; heading: number }
  /** The footbridge's mill race (x from, to) and the temporary walkway's z. */
  river?: { x0: number; x1: number; walkway: number }
}

export function siteLayout(design: Design): SiteLayout {
  if (design.kind === 'bridge') {
    const half = design.span / 2000
    const base = design.abutment.base / 1000
    const w = half + base + 9
    return {
      x0: -w,
      x1: w,
      z0: -12,
      z1: 12,
      gate: { x: -w + 4, z: 12 },
      cabin: { x: -w + 3.5, z: -7 },
      stores: { x: w - 4.5, z: -6.5 },
      crane: { x: -half - base - 3.5, z: -4.5 },
      viewpoint: { x: -half - base - 2.5, z: 6 },
      start: { x: -w + 4, z: 9.5, heading: 0 },
      river: { x0: -half + 0.3, x1: half - 0.3, walkway: 7.5 },
    }
  }
  const b = bounds(design.outline)
  const hw = (b.x1 - b.x0) / 2000
  const hd = (b.y1 - b.y0) / 2000
  const x1 = Math.max(16, hw + 10)
  const z1 = Math.max(13, hd + 8)
  return {
    x0: -x1,
    x1,
    z0: -z1,
    z1,
    gate: { x: -x1 + 5, z: z1 },
    cabin: { x: -x1 + 3.5, z: -z1 + 4 },
    stores: { x: x1 - 4.5, z: -z1 + 4.5 },
    crane: { x: hw + 4.5, z: -hd - 3 },
    viewpoint: { x: -hw - 3.5, z: hd + 3.5 },
    start: { x: -x1 + 5, z: z1 - 2.5, heading: 0 },
  }
}

const box = (x: number, z: number, hx: number, hz: number, top = 2.4): Box => ({
  x,
  z,
  hx,
  hz,
  top,
})

/** What is solid on site: the hoarding, the cabin and stores, the river, and the walls built so far. */
export function siteBoxes(design: Design, layout: SiteLayout, state: BuildState): Box[] {
  const { x0, x1, z0, z1, gate } = layout
  const out: Box[] = [
    // The hoarding, with the gate (3 m) in the south side.
    box((x0 + x1) / 2, z0 - 0.1, (x1 - x0) / 2 + 0.2, 0.1),
    box(x0 - 0.1, (z0 + z1) / 2, 0.1, (z1 - z0) / 2 + 0.2),
    box(x1 + 0.1, (z0 + z1) / 2, 0.1, (z1 - z0) / 2 + 0.2),
    box((x0 + gate.x - 1.5) / 2, z1 + 0.1, (gate.x - 1.5 - x0) / 2, 0.1),
    box((gate.x + 1.5 + x1) / 2, z1 + 0.1, (x1 - gate.x - 1.5) / 2, 0.1),
    // The site cabin and the stores compound.
    box(layout.cabin.x, layout.cabin.z, 3, 1.3, 2.7),
    box(layout.stores.x, layout.stores.z, 2.6, 2.1, 1.6),
    box(layout.crane.x, layout.crane.z, 1.5, 1.5, 3),
  ]
  if (layout.river && design.kind === 'bridge') {
    const { x0: r0, x1: r1, walkway } = layout.river
    // The mill race is solid except over the temporary walkway (1.2 m wide)
    // and, once it is cast, the deck between its parapets.
    const gaps: Array<[number, number]> = [[walkway - 0.6, walkway + 0.6]]
    if ((state.slab ?? 0) >= 1)
      gaps.push([-design.width / 2000 + 0.1, design.width / 2000 - 0.1])
    gaps.sort((p, q) => p[0] - q[0])
    let from = z0
    for (const [g0, g1] of [...gaps, [z1, z1] as [number, number]]) {
      if (g0 > from)
        out.push(box((r0 + r1) / 2, (from + g0) / 2, (r1 - r0) / 2, (g0 - from) / 2, 0.5))
      from = Math.max(from, g1)
    }
    return out
  }
  if (design.kind !== 'building') return out
  // The walls, as high as they are built, around their openings (doors are gaps to walk through).
  const built = (state.walls ?? 0) * design.wall.height * design.storeys
  if (built < 300) return out
  const cx = (bounds(design.outline).x0 + bounds(design.outline).x1) / 2
  const cy = (bounds(design.outline).y0 + bounds(design.outline).y1) / 2
  design.outline.forEach((_, index) => {
    const { edge, pieces } = wallPieces(design, index)
    for (const p of pieces) {
      if (p.z0 > 0) continue
      const a = [edge.a[0] + edge.dir[0] * p.s, edge.a[1] + edge.dir[1] * p.s]
      const e = [edge.a[0] + edge.dir[0] * p.e, edge.a[1] + edge.dir[1] * p.e]
      const mx = ((a[0] + e[0]) / 2 - cx) / 1000
      const mz = -((a[1] + e[1]) / 2 - cy) / 1000
      const len = Math.hypot(e[0] - a[0], e[1] - a[1]) / 2000
      const t = design.wall.thickness / 2000
      const alongX = Math.abs(edge.dir[0]) > 0.5
      out.push(
        box(mx, mz, alongX ? len : t, alongX ? t : len, Math.min(built, p.z1) / 1000),
      )
    }
  })
  return out
}

/** Which part of the site the player is in, for the panel. */
export function siteAreaAt(layout: SiteLayout, x: number, z: number): string {
  if (Math.hypot(x - layout.cabin.x, z - layout.cabin.z) < 4.5) return 'By the site cabin'
  if (Math.hypot(x - layout.stores.x, z - layout.stores.z) < 4.5)
    return 'At the stores compound'
  if (Math.abs(z - layout.z1) < 3 && Math.abs(x - layout.gate.x) < 4)
    return 'At the site gate'
  return 'On site'
}

/**
 * The things to do on site (`site:<what>`): measure each item of the
 * inspection due, talk to the supervisor about an open issue, watch the
 * work, and leave.
 */
export function siteActivities(
  layout: SiteLayout,
  items: Array<{ inspection: string; item: InspectionItem }>,
  supervisor: { x: number; z: number } | null,
): Activity[] {
  const acts: Activity[] = [
    {
      id: 'site-leave',
      action: 'site:leave',
      prompt: 'leave the site and go back to the office',
      spot: { x: layout.gate.x, z: layout.z1 - 0.6, reach: 1.2 },
      anchor: { x: layout.gate.x, z: layout.z1 - 0.5, heading: Math.PI },
      stages: [{ clip: 'stand', seconds: 0.8, label: 'Signing out at the gate' }],
    },
    {
      id: 'site-watch',
      action: 'site:watch',
      prompt: 'watch the work for half an hour',
      spot: { x: layout.viewpoint.x, z: layout.viewpoint.z, reach: 1.3 },
      anchor: { x: layout.viewpoint.x, z: layout.viewpoint.z, heading: -Math.PI / 4 },
      stages: [
        { clip: 'stand', seconds: 1.4, label: 'Watching the crew at work' },
        {
          clip: 'write',
          seconds: 1.0,
          label: 'Notes for the site diary',
          hold: { right: 'pen', left: 'clipboard' },
          posture: 'standing',
        },
      ],
    },
  ]
  if (supervisor)
    acts.push({
      id: 'site-issue',
      action: 'site:issue',
      prompt: 'talk to the site supervisor',
      spot: { x: supervisor.x, z: supervisor.z + 1.1, reach: 1.4 },
      anchor: { x: supervisor.x, z: supervisor.z + 1.0, heading: 0 },
      view: 'side',
      stages: [{ clip: 'talk', seconds: 1.4, label: 'Hearing what has happened' }],
    })
  for (const { inspection, item } of items) {
    const crouch = item.tool === 'tape' || item.tool === 'look'
    acts.push({
      id: `site-measure-${inspection}-${item.id}`,
      action: `site:measure:${inspection}:${item.id}`,
      prompt: `measure: ${item.label.charAt(0).toLowerCase()}${item.label.slice(1)}`,
      spot: { x: item.at.x, z: item.at.z + 0.9, reach: 1.2 },
      anchor: { x: item.at.x, z: item.at.z + 0.7, heading: 0 },
      stages: [
        {
          clip: crouch ? 'crouch' : 'reach',
          seconds: 1.6,
          label:
            item.tool === 'meter'
              ? 'Testing with the meter'
              : item.tool === 'count'
                ? 'Counting against the drawing'
                : item.tool === 'level'
                  ? 'Reading the level'
                  : item.tool === 'look'
                    ? 'Probing the ground'
                    : 'Measuring with the tape',
        },
        {
          clip: 'write',
          seconds: 0.9,
          label: 'Writing down the reading',
          hold: { right: 'pen', left: 'clipboard' },
          posture: 'standing',
        },
      ],
    })
  }
  return acts
}
