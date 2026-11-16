/**
 * Northbank's engineering projects (fictional clients and sites): what each
 * client asked for, what the site investigation found, the budget, and the
 * concept design the player starts from. Each concept is deliberately not
 * yet right: checking it (calculations, the brief) and correcting it in CAD
 * is the engineer's job.
 */
import type { SiteData } from './checks'
import {
  DESIGN_FORMAT,
  DESIGN_VERSION,
  bounds,
  footprintArea,
  type Design,
} from './design'
import type { StageId } from './quantities'

export type ProjectId = 'yard-store' | 'mill-footbridge' | 'workshop-office'

export interface Requirement {
  id: string
  text: string
  met: (design: Design) => boolean
}

export interface ProjectBrief {
  id: ProjectId
  title: string
  client: { name: string; organisation: string }
  /** Where, for documents. */
  location: string
  /** The career level (index) from which it is offered. */
  minLevel: number
  summary: string
  requirements: Requirement[]
  site: SiteData
  /** The client's budget for the works (£). */
  budget: number
  /** The programme the client expects (working days). */
  targetDays: number
  concept: Design
  /** The scenarios that come up on this site, in order. */
  issues: string[]
  /** The inspections (hold points) and the stage each follows. */
  holds: Partial<Record<StageId, string>>
  /**
   * What the site gets wrong whatever the player does (a setting-out error,
   * soft ground): deviations by inspection item, found only by measuring.
   */
  asBuilt: Record<string, number>
}

const building = (
  d: Omit<Extract<Design, { kind: 'building' }>, 'format' | 'version' | 'kind'>,
): Design => ({
  format: DESIGN_FORMAT,
  version: DESIGN_VERSION,
  kind: 'building',
  ...d,
})

const isBuilding = (d: Design) => d.kind === 'building'
const doors = (d: Design) =>
  d.kind === 'building' ? d.openings.filter((o) => o.kind === 'door') : []
const windows = (d: Design) =>
  d.kind === 'building' ? d.openings.filter((o) => o.kind === 'window') : []
const size = (d: Design) => {
  if (d.kind !== 'building') return { w: 0, h: 0 }
  const b = bounds(d.outline)
  return { w: b.x1 - b.x0, h: b.y1 - b.y0 }
}

export const BRIEFS: ProjectBrief[] = [
  {
    id: 'yard-store',
    title: 'Yard store',
    client: { name: 'Carol Hughes', organisation: 'Northbank Facilities' },
    location: 'Northbank yard, east of the fabrication shop',
    minLevel: 0,
    summary:
      'A single-storey blockwork store in the yard for steel stock and the forklift, with a wide door for the forklift and daylight inside.',
    requirements: [
      {
        id: 'area',
        text: 'At least 90 m² of floor',
        met: (d) => isBuilding(d) && d.kind === 'building' && footprintArea(d) >= 90,
      },
      {
        id: 'plot',
        text: 'Fits the plot: at most 16 m by 12 m',
        met: (d) => {
          const s = size(d)
          return isBuilding(d) && s.w <= 16000 && s.h <= 12000
        },
      },
      {
        id: 'forklift',
        text: 'A door at least 3000 mm wide and 3000 mm high for the forklift',
        met: (d) => doors(d).some((o) => o.width >= 3000 && o.height >= 3000),
      },
      {
        id: 'daylight',
        text: 'At least three windows',
        met: (d) => windows(d).length >= 3,
      },
    ],
    site: { bearing: 100, minDepth: 750, imposed: 5.0 },
    budget: 95_000,
    targetDays: 48,
    concept: building({
      outline: [
        [0, 0],
        [12000, 0],
        [12000, 8000],
        [0, 8000],
      ],
      wall: { thickness: 215, height: 3600, material: 'blockwork' },
      storeys: 1,
      openings: [
        {
          id: 'D1',
          kind: 'door',
          wall: 0,
          offset: 6000,
          width: 900,
          height: 2100,
          sill: 0,
          storey: 0,
        },
        {
          id: 'W1',
          kind: 'window',
          wall: 2,
          offset: 6000,
          width: 1200,
          height: 1050,
          sill: 1200,
          storey: 0,
        },
      ],
      columns: [],
      beam: { section: 'NB-150' },
      foundation: { type: 'strip', width: 450, depth: 600 },
      slab: { thickness: 150 },
      roof: { type: 'flat', pitch: 0 },
      services: { circuits: 2, sanitary: 0, hvac: 0 },
    }),
    issues: [
      'excavator-hose',
      'rebar-short',
      'rain-pour',
      'client-window',
      'harness',
      'ir-test',
    ],
    holds: {
      excavation: 'formation',
      reinforcement: 'reinforcement',
      electrical: 'electrical',
      inspection: 'final',
    },
    // The surveyor set the north-east corner out from the wrong peg: 150 mm shallow.
    asBuilt: { 'depth-b': -150 },
  },
  {
    id: 'mill-footbridge',
    title: 'Mill race footbridge',
    client: { name: 'Owen Price', organisation: 'Millbrook Parish Council' },
    location: 'The mill race path, Millbrook',
    minLevel: 1,
    summary:
      'A steel footbridge over the mill race for walkers and cyclists, replacing a closed timber bridge.',
    requirements: [
      {
        id: 'span',
        text: 'Clears the mill race: a span of at least 14 m',
        met: (d) => d.kind === 'bridge' && d.span >= 14000,
      },
      {
        id: 'cycle',
        text: 'Wide enough for cyclists to pass walkers: at least 2000 mm',
        met: (d) => d.kind === 'bridge' && d.width >= 2000,
      },
    ],
    site: { bearing: 75, minDepth: 1000, imposed: 5.0 },
    budget: 160_000,
    targetDays: 40,
    concept: {
      format: DESIGN_FORMAT,
      version: DESIGN_VERSION,
      kind: 'bridge',
      span: 14000,
      width: 1800,
      girders: { count: 2, section: 'NB-500' },
      deck: { thickness: 150 },
      abutment: { height: 1500, base: 2000 },
      parapet: { height: 1000 },
    },
    issues: ['excavator-hose', 'rain-pour', 'harness', 'budget'],
    holds: {
      excavation: 'formation',
      reinforcement: 'reinforcement',
      structure: 'structure',
      inspection: 'final',
    },
    // A soft, silty pocket under the east abutment.
    asBuilt: { 'ground-east': -1 },
  },
  {
    id: 'workshop-office',
    title: 'Workshop and offices',
    client: { name: 'Priya Desai', organisation: 'Desai Precision Ltd' },
    location: 'Unit 4, Harbour Road industrial estate',
    minLevel: 2,
    summary:
      'A two-storey building: a machine workshop on the ground floor and offices above, heated and ventilated, with washrooms.',
    requirements: [
      {
        id: 'area',
        text: 'At least 170 m² on each floor',
        met: (d) => d.kind === 'building' && footprintArea(d) >= 170,
      },
      {
        id: 'storeys',
        text: 'Two storeys',
        met: (d) => d.kind === 'building' && d.storeys === 2,
      },
      {
        id: 'plot',
        text: 'Fits the plot: at most 20 m by 12 m',
        met: (d) => {
          const s = size(d)
          return isBuilding(d) && s.w <= 20000 && s.h <= 12000
        },
      },
      {
        id: 'washrooms',
        text: 'At least four WCs and basins',
        met: (d) => d.kind === 'building' && d.services.sanitary >= 4,
      },
      {
        id: 'heating',
        text: 'At least four heating and ventilation units',
        met: (d) => d.kind === 'building' && d.services.hvac >= 4,
      },
      {
        id: 'entrance',
        text: 'A loading door at least 2400 mm wide',
        met: (d) => doors(d).some((o) => o.width >= 2400),
      },
    ],
    site: { bearing: 150, minDepth: 900, imposed: 2.5 },
    budget: 420_000,
    targetDays: 110,
    concept: building({
      outline: [
        [0, 0],
        [18000, 0],
        [18000, 10000],
        [0, 10000],
      ],
      wall: { thickness: 300, height: 3200, material: 'cladding' },
      storeys: 2,
      openings: [
        {
          id: 'D1',
          kind: 'door',
          wall: 0,
          offset: 4000,
          width: 2400,
          height: 2700,
          sill: 0,
          storey: 0,
        },
        {
          id: 'D2',
          kind: 'door',
          wall: 0,
          offset: 12000,
          width: 1000,
          height: 2100,
          sill: 0,
          storey: 0,
        },
        {
          id: 'W1',
          kind: 'window',
          wall: 0,
          offset: 8000,
          width: 1800,
          height: 1200,
          sill: 1000,
          storey: 1,
        },
        {
          id: 'W2',
          kind: 'window',
          wall: 0,
          offset: 14500,
          width: 1800,
          height: 1200,
          sill: 1000,
          storey: 1,
        },
        {
          id: 'W3',
          kind: 'window',
          wall: 2,
          offset: 9000,
          width: 2400,
          height: 1200,
          sill: 1000,
          storey: 1,
        },
      ],
      columns: [],
      beam: { section: 'NB-300' },
      foundation: { type: 'strip', width: 600, depth: 900 },
      slab: { thickness: 200 },
      roof: { type: 'pitched', pitch: 15 },
      services: { circuits: 4, sanitary: 2, hvac: 2 },
    }),
    issues: [
      'excavator-hose',
      'rebar-short',
      'rain-pour',
      'harness',
      'ir-test',
      'budget',
    ],
    holds: {
      excavation: 'formation',
      reinforcement: 'reinforcement',
      structure: 'structure',
      electrical: 'electrical',
      inspection: 'final',
    },
    // The steel erectors packed the first-floor beams 40 mm low.
    asBuilt: { 'storey-height': -40 },
  },
]

export function getBrief(id: string): ProjectBrief | undefined {
  return BRIEFS.find((b) => b.id === id)
}

/** The brief's requirements a design does not meet. */
export function unmetRequirements(brief: ProjectBrief, design: Design): Requirement[] {
  return brief.requirements.filter((r) => !r.met(design))
}
