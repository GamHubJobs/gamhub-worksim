/**
 * Who is on site and what they are doing, from the stage the work is at:
 * the surveyor at the instrument, the plant operator digging, steel fixers in
 * the trenches, the gang at the pour, bricklayers at the walls with a
 * labourer bringing blocks from the stores, roofers up on the scaffold,
 * the electrician and plumber inside, the supervisor walking the site and
 * the construction manager at the cabin. When the site is held up, the crew
 * stands by. Pure.
 */
import { HI_VIS } from '../../content/scenarios/looks'
import type { PersonLook } from '../../office/scene/people'
import type { ClipId } from '../../world/character/rig'
import { bounds, walls, type Design } from '../design'
import { plotPoint } from '../inspections'
import type { StageId } from '../quantities'
import type { SiteLayout } from './siteLayout'

export interface CrewMember {
  id: string
  look: PersonLook
  /** Walks round these points (pausing to work at each); one point: works there. */
  path: Array<{ x: number; z: number }>
  clip: ClipId
  /** Faces this way while working (radians; 0 faces −z). */
  heading: number
  /** Carries something between the points (blocks, bars). */
  carry?: 'block' | 'bar' | 'clipboard'
  /** Standing up on the scaffold or roof (metres). */
  y?: number
}

const LOOKS: Record<string, PersonLook> = {
  'manager-site': HI_VIS(3, 'short', 1, { hardhat: '#f8fafc' }),
  supervisor: HI_VIS(1, 'ponytail', 2, { hardhat: '#f8fafc' }),
  surveyor: HI_VIS(5, 'crop', 0, { hardhat: '#3b82f6' }),
  operator: HI_VIS(4, 'short', 0, { hardhat: '#facc15' }),
  fixer: HI_VIS(2, 'bun', 3, { hardhat: '#facc15', glasses: true }),
  bricklayer: HI_VIS(6, 'crop', 0, { hardhat: '#facc15' }),
  labourer: HI_VIS(0, 'side', 4, { hardhat: '#facc15' }),
  electrician: HI_VIS(3, 'bob', 0, { hardhat: '#facc15', glasses: true }),
  plumber: HI_VIS(1, 'bald', 0, { hardhat: '#facc15', beard: true }),
}

export function crewLook(id: string): PersonLook {
  return LOOKS[id] ?? LOOKS.labourer
}

/** Where the work is now: a point on the walls, the trench, the deck… */
function workPoints(
  design: Design,
  n: number,
): Array<{ x: number; z: number; heading: number }> {
  if (design.kind === 'bridge') {
    // On the banks, by the abutments, facing the mill race (until there is a deck to stand on).
    const half = design.span / 2000 + design.abutment.base / 2000
    return Array.from({ length: n }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (half + 0.8),
        z: (Math.floor(i / 2) - 0.5) * 1.6,
        heading: side < 0 ? -Math.PI / 2 : Math.PI / 2,
      }
    })
  }
  const edges = walls(design)
  const total = edges.reduce((s, e) => s + e.length, 0)
  const b = bounds(design.outline)
  const cx = (b.x0 + b.x1) / 2
  const cy = (b.y0 + b.y1) / 2
  return Array.from({ length: n }, (_, i) => {
    let along = ((i + 0.5) / n) * total
    const e = edges.find((w) => {
      if (along <= w.length) return true
      along -= w.length
      return false
    })!
    const px = e.a[0] + e.dir[0] * along
    const py = e.a[1] + e.dir[1] * along
    // Stand outside the wall, facing it.
    const ox = px - cx
    const oy = py - cy
    const len = Math.hypot(ox, oy) || 1
    const p = plotPoint(design, px + (ox / len) * 900, py + (oy / len) * 900)
    // Facing (−sin h, −cos h) towards the wall: inwards is (−ox, +oy) in the scene.
    return { x: p.x, z: p.z, heading: Math.atan2(ox / len, -oy / len) }
  })
}

export function crewFor(
  design: Design,
  layout: SiteLayout,
  stage: StageId | null,
  blocked: boolean,
): CrewMember[] {
  const at = (
    id: string,
    p: { x: number; z: number },
    clip: ClipId,
    heading = 0,
    more: Partial<CrewMember> = {},
  ): CrewMember => ({
    id,
    look: crewLook(id),
    path: [p],
    clip,
    heading,
    ...more,
  })
  const points = workPoints(design, 4)
  const stores = { x: layout.stores.x - 3, z: layout.stores.z + 2.5 }
  const height =
    design.kind === 'building' ? (design.wall.height * design.storeys) / 1000 : 0
  const out: CrewMember[] = [
    // The construction manager by the cabin, the supervisor walking the site.
    at(
      'manager-site',
      { x: layout.cabin.x + 2.2, z: layout.cabin.z + 2.2 },
      'phone',
      Math.PI * 0.8,
    ),
    {
      id: 'supervisor',
      look: crewLook('supervisor'),
      path: blocked
        ? [{ x: layout.viewpoint.x + 1.5, z: layout.viewpoint.z - 0.5 }]
        : [
            ...points.map((p) => ({ x: p.x, z: p.z })),
            { x: layout.viewpoint.x + 1.5, z: layout.viewpoint.z - 0.5 },
          ],
      clip: 'write',
      heading: Math.PI,
      carry: 'clipboard',
    },
  ]
  if (!stage || blocked) {
    // Standing by: the crew waits at the cabin.
    out.push(
      at(
        'labourer',
        { x: layout.cabin.x - 1.5, z: layout.cabin.z + 2.3 },
        'talk',
        Math.PI,
      ),
      at(
        'operator',
        { x: layout.cabin.x - 0.4, z: layout.cabin.z + 2.6 },
        'drink',
        Math.PI,
      ),
    )
    return out
  }
  const p0 = points[0]
  const p1 = points[1]
  const p2 = points[2]
  switch (stage) {
    case 'survey':
      out.push(at('surveyor', { x: p0.x, z: p0.z }, 'reach', p0.heading))
      break
    case 'excavation':
      out.push(at('labourer', { x: p1.x, z: p1.z }, 'crouch', p1.heading))
      break
    case 'reinforcement':
      out.push(at('fixer', { x: p0.x, z: p0.z }, 'crouch', p0.heading), {
        id: 'labourer',
        look: crewLook('labourer'),
        path: [stores, { x: p1.x, z: p1.z }],
        clip: 'reach',
        heading: p1.heading,
        carry: 'bar',
      })
      break
    case 'foundations':
    case 'slab':
      out.push(
        at('labourer', { x: p0.x, z: p0.z }, 'reach', p0.heading),
        at('fixer', { x: p1.x, z: p1.z }, 'crouch', p1.heading),
      )
      break
    case 'structure':
      out.push(
        at(
          'operator',
          { x: layout.crane.x - 1.6, z: layout.crane.z + 1.5 },
          'reach',
          -Math.PI / 2,
        ),
        at('fixer', { x: p2.x, z: p2.z }, 'reach', p2.heading),
      )
      break
    case 'walls':
      out.push(
        at('bricklayer', { x: p0.x, z: p0.z }, 'reach', p0.heading),
        at('fixer', { x: p2.x, z: p2.z }, 'reach', p2.heading),
        {
          id: 'labourer',
          look: crewLook('labourer'),
          path: [stores, { x: p1.x, z: p1.z }],
          clip: 'reach',
          heading: p1.heading,
          carry: 'block',
        },
      )
      break
    case 'openings':
      out.push(
        at('bricklayer', { x: p0.x, z: p0.z }, 'reach', p0.heading),
        at('labourer', { x: p1.x, z: p1.z }, 'reach', p1.heading),
      )
      break
    case 'roofing':
      out.push(
        at('bricklayer', { x: p0.x, z: p0.z }, 'reach', p0.heading, {
          y: Math.max(0, height - 1.9),
        }),
        at('labourer', { x: p1.x, z: p1.z }, 'reach', p1.heading, {
          y: Math.max(0, height - 1.9),
        }),
      )
      break
    case 'electrical':
      out.push(at('electrician', { x: p0.x, z: p0.z }, 'reach', p0.heading))
      break
    case 'plumbing':
    case 'hvac':
      out.push(at('plumber', { x: p1.x, z: p1.z }, 'crouch', p1.heading))
      break
    case 'finishing':
      out.push(at('bricklayer', { x: p0.x, z: p0.z }, 'reach', p0.heading), {
        id: 'labourer',
        look: crewLook('labourer'),
        path: [p1, p2],
        clip: 'reach',
        heading: p2.heading,
      })
      break
    case 'inspection':
    case 'handover':
      out.push(
        at(
          'labourer',
          { x: layout.cabin.x - 1.5, z: layout.cabin.z + 2.3 },
          'talk',
          Math.PI,
        ),
      )
      break
  }
  return out
}
