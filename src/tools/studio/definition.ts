/**
 * Space Studio: its registration with the tools framework. Its saved state is
 * the building model (src/studio/model.ts); tasks are graded on the analysis
 * of the player's actual design, never on clicks.
 */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { analyse, clearWidth, GUIDANCE, type StudioAnalysis } from '../../studio/analysis'
import { catalogEntry } from '../../studio/catalog'
import { samePoint } from '../../studio/geometry'
import { material } from '../../studio/materials'
import { activeDepartment } from '../../content/departments'
import { projectFromJson } from '../../studio/documents'
import { isDxf, projectFromDxf } from '../../studio/dxfImport'
import { reviewDesign, reviewText, type ReviewerRole } from '../../studio/review'
import {
  emptyProject,
  ROOM_USES,
  StudioStateSchema,
  type StudioState,
} from '../../studio/model'
import { sampleApartment, sampleHouse } from '../../studio/samples'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'

const Use = z.enum(ROOM_USES)

export const StudioCheckSchema = z.discriminatedUnion('type', [
  /** At least `min` rooms of a use (each at least `minArea` m², if given). */
  FileCheckBaseSchema.extend({
    type: z.literal('rooms'),
    use: Use,
    min: z.number().int().positive(),
    minArea: z.number().positive().optional(),
  }),
  /** The total floor area (m², all floors) within a range. */
  FileCheckBaseSchema.extend({
    type: z.literal('total-area'),
    min: z.number().nonnegative(),
    max: z.number().positive(),
  }),
  /** A way in, and every room reachable from it through doors (and stairs). */
  FileCheckBaseSchema.extend({ type: z.literal('reachable') }),
  /** Every habitable room has a window (meeting rooms excepted). */
  FileCheckBaseSchema.extend({ type: z.literal('windows') }),
  /** Every room of a use contains at least one of each group of items (catalogue IDs, any of). */
  FileCheckBaseSchema.extend({
    type: z.literal('furnished'),
    use: Use,
    items: z.array(z.array(z.string()).min(1)).min(1),
  }),
  /** Rooms of a use (or all) seat or hold at least so many (seats, beds, workstations). */
  FileCheckBaseSchema.extend({
    type: z.literal('capacity'),
    use: Use.optional(),
    measure: z.enum(['seats', 'beds', 'workstations']),
    min: z.number().int().positive(),
  }),
  /** No furniture through walls, on top of other furniture, or blocking a door. */
  FileCheckBaseSchema.extend({ type: z.literal('clear') }),
  /** The cost of furniture, fittings, openings and finishes within the budget (the brief's, or `max`). */
  FileCheckBaseSchema.extend({
    type: z.literal('budget'),
    max: z.number().positive().optional(),
  }),
  /** At least `min` floors, with stairs arriving in a room on each floor above. */
  FileCheckBaseSchema.extend({ type: z.literal('floors'), min: z.number().int().min(2) }),
  /** Every door at least 775 mm clear (and pass-throughs as wide). */
  FileCheckBaseSchema.extend({ type: z.literal('accessible-doors') }),
  /** Rooms of a use finished in one of the material groups (e.g. tiles or stone in bathrooms). */
  FileCheckBaseSchema.extend({
    type: z.literal('finishes'),
    use: Use,
    groups: z.array(z.string()).min(1),
  }),
  /** None of these problems (analysis issue codes) is left. */
  FileCheckBaseSchema.extend({
    type: z.literal('fixed'),
    codes: z.array(z.string()).min(1),
  }),
  /** The outside walls of the starting plan are kept where they were (a fit-out, not a rebuild). */
  FileCheckBaseSchema.extend({ type: z.literal('keeps-shell') }),
  /** A design statement for the reviewers of at least so many words. */
  FileCheckBaseSchema.extend({
    type: z.literal('statement'),
    minWords: z.number().int().positive(),
  }),
])
export type StudioCheck = z.infer<typeof StudioCheckSchema>

const names = (ids: string[]) =>
  ids.map((id) => catalogEntry(id)?.name ?? id).join(' or ')
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

function gradeCheck(
  check: StudioCheck,
  s: StudioState,
  a: StudioAnalysis,
  start: StudioState,
) {
  switch (check.type) {
    case 'rooms': {
      const rooms = a.rooms.filter((r) => r.use === check.use)
      const big = check.minArea ? rooms.filter((r) => r.area >= check.minArea!) : rooms
      const problems: string[] = []
      if (rooms.length < check.min)
        problems.push(
          `There ${rooms.length === 1 ? 'is' : 'are'} ${plural(rooms.length, check.use + ' room')}; the brief asks for ${check.min}.`,
        )
      for (const r of rooms)
        if (check.minArea && r.area < check.minArea)
          problems.push(
            `${r.name} is ${r.area.toFixed(1)} m²; it needs at least ${check.minArea} m².`,
          )
      return checkResult(check, Math.min(1, big.length / check.min), problems)
    }
    case 'total-area': {
      const ok = a.totalArea >= check.min && a.totalArea <= check.max
      return checkResult(check, ok ? 1 : 0, [
        `The floor area is ${a.totalArea.toFixed(1)} m²; it should be between ${check.min} and ${check.max} m².`,
      ])
    }
    case 'reachable': {
      const problems = a.issues
        .filter((i) => i.code === 'unreachable' || i.code === 'no-entrance')
        .map((i) => i.message)
      if (a.rooms.length === 0) problems.push('There are no rooms yet.')
      const reached = a.rooms.filter((r) => r.reachable).length
      return checkResult(
        check,
        a.rooms.length ? (problems.length ? reached / a.rooms.length / 2 : 1) : 0,
        problems,
      )
    }
    case 'windows': {
      const missing = a.issues.filter((i) => i.code === 'no-window')
      const habitable = a.rooms.filter((r) =>
        [
          'living',
          'bedroom',
          'kitchen',
          'dining',
          'office',
          'open-plan',
          'reception',
        ].includes(r.use),
      )
      if (habitable.length === 0)
        return checkResult(check, 0, ['There are no habitable rooms yet.'])
      return checkResult(
        check,
        1 - missing.length / habitable.length,
        missing.map((i) => i.message),
      )
    }
    case 'furnished': {
      const rooms = a.rooms.filter((r) => r.use === check.use)
      if (rooms.length === 0)
        return checkResult(check, 0, [`There is no ${check.use} room to furnish.`])
      const problems: string[] = []
      let got = 0
      for (const r of rooms) {
        const kinds = new Set(r.items.map((id) => s.items.find((i) => i.id === id)?.kind))
        for (const group of check.items) {
          if (group.some((k) => kinds.has(k))) got++
          else problems.push(`${r.name} has no ${names(group)}.`)
        }
      }
      return checkResult(check, got / (rooms.length * check.items.length), problems)
    }
    case 'capacity': {
      const rooms = check.use ? a.rooms.filter((r) => r.use === check.use) : a.rooms
      const total = rooms.reduce((n, r) => n + r[check.measure], 0)
      return checkResult(check, Math.min(1, total / check.min), [
        `The design has ${plural(total, check.measure.replace(/s$/, ''))}${check.use ? ` in ${check.use} rooms` : ''}; the brief needs ${check.min}.`,
      ])
    }
    case 'clear': {
      const clashes = a.issues.filter((i) =>
        ['item-in-wall', 'items-overlap', 'door-blocked'].includes(i.code),
      )
      return checkResult(
        check,
        clashes.length === 0 ? 1 : clashes.length <= 2 ? 0.5 : 0,
        clashes.map((i) => i.message),
      )
    }
    case 'budget': {
      const max = check.max ?? s.project.budget
      if (max === undefined) return checkResult(check, 1, [])
      const over = a.costs.total - max
      return checkResult(check, over <= 0 ? 1 : over <= max * 0.05 ? 0.5 : 0, [
        `The design costs £${a.costs.total.toLocaleString('en-GB')}, £${over.toLocaleString('en-GB')} over the £${max.toLocaleString('en-GB')} budget.`,
      ])
    }
    case 'floors': {
      const problems: string[] = []
      if (s.floors.length < check.min)
        problems.push(
          `The building has ${plural(s.floors.length, 'floor')}; the brief asks for ${check.min}.`,
        )
      const sorted = [...s.floors].sort((x, y) => x.elevation - y.elevation)
      for (const f of sorted.slice(1)) {
        if (!s.stairs.some((st) => st.to === f.id))
          problems.push(`No stair reaches the ${f.name}.`)
        if (!a.rooms.some((r) => r.floor === f.id))
          problems.push(`The ${f.name} has no rooms.`)
      }
      for (const i of a.issues.filter((x) => x.code === 'stair-landing'))
        problems.push(i.message)
      const parts = [
        s.floors.length >= check.min,
        ...sorted.slice(1).map((f) => s.stairs.some((st) => st.to === f.id)),
      ]
      return checkResult(
        check,
        problems.length ? parts.filter(Boolean).length / (parts.length + 1) : 1,
        problems,
      )
    }
    case 'accessible-doors': {
      const doors = s.openings.filter((o) => o.kind !== 'window')
      if (doors.length === 0) return checkResult(check, 0, ['There are no doors yet.'])
      const narrow = doors.filter((o) => clearWidth(o) < GUIDANCE.doorClearWidth)
      return checkResult(
        check,
        1 - narrow.length / doors.length,
        narrow.map(
          (o) =>
            `A door is ${clearWidth(o)} mm clear; it needs ${GUIDANCE.doorClearWidth} mm.`,
        ),
      )
    }
    case 'finishes': {
      const rooms = s.rooms.filter((r) => r.use === check.use)
      if (rooms.length === 0)
        return checkResult(check, 0, [`There is no ${check.use} room.`])
      const wrong = rooms.filter(
        (r) => !check.groups.includes(material(r.floorFinish)?.group ?? ''),
      )
      return checkResult(
        check,
        1 - wrong.length / rooms.length,
        wrong.map(
          (r) =>
            `${r.name}'s floor is ${material(r.floorFinish)?.name ?? 'unknown'}; use ${check.groups.join(' or ')}.`,
        ),
      )
    }
    case 'fixed': {
      const left = a.issues.filter((i) => check.codes.includes(i.code))
      return checkResult(
        check,
        left.length === 0 ? 1 : 0,
        left.map((i) => i.message),
      )
    }
    case 'keeps-shell': {
      const shell = start.walls.filter((w) => w.type === 'exterior')
      const kept = shell.filter((w) =>
        s.walls.some(
          (x) =>
            x.type === 'exterior' &&
            x.floor === w.floor &&
            ((samePoint(x.a, w.a, 5) && samePoint(x.b, w.b, 5)) ||
              (samePoint(x.a, w.b, 5) && samePoint(x.b, w.a, 5))),
        ),
      )
      if (shell.length === 0) return checkResult(check, 1, [])
      return checkResult(check, kept.length / shell.length, [
        `${shell.length - kept.length} of the building's outside walls were moved or removed; the shell must stay as it is.`,
      ])
    }
    case 'statement': {
      const words = s.project.notes.trim().split(/\s+/).filter(Boolean).length
      return checkResult(check, Math.min(1, words / check.minWords), [
        `The design statement has ${words} words; write at least ${check.minWords}.`,
      ])
    }
  }
}

/** The colleague who gives each review, in the player's own department where there is one. */
export function reviewerName(role: ReviewerRole, s: StudioState): string {
  const department = activeDepartment()
  const byRole = (title: string) =>
    Object.values(department.team ?? {}).find((t) => t.role === title)?.name
  switch (role) {
    case 'lead':
      return /architect/i.test(department.manager.role)
        ? department.manager.name
        : 'The architect'
    case 'interior':
      return byRole('Interior Designer') ?? 'The interior designer'
    case 'pm':
      return byRole('Project Manager') ?? 'The project manager'
    case 'client':
      return s.project.client ? `${s.project.client}` : 'The client'
  }
}

export const studio: ToolDefinition<StudioState, StudioCheck> = {
  id: 'studio',
  name: 'Space Studio',
  category: 'Space planning, architecture and interior design',
  icon: 'studio',
  sections: [
    {
      id: 'plan',
      name: 'Plan',
      description:
        'Draw walls and rooms to exact sizes, add doors, windows, stairs and floors.',
    },
    {
      id: 'model',
      name: '3D and walkthrough',
      description:
        'The same design in 3D: orbit, light it, and walk through it in first person.',
    },
    {
      id: 'library',
      name: 'Library and finishes',
      description: 'Furniture, fittings and finishes, with sizes and prices.',
    },
    {
      id: 'documents',
      name: 'Documents',
      description:
        'Plans to scale (PDF, SVG, PNG, DXF), the project report, and backups.',
    },
  ],
  state: StudioStateSchema,
  practice: sampleApartment,
  summary: (s) => {
    const a = analyse(s)
    return `${plural(a.rooms.length, 'room')}, ${a.totalArea.toFixed(1)} m², ${plural(s.floors.length, 'floor')}`
  },
  check: StudioCheckSchema,
  grade: (checks, player, { start }) => {
    if (!player)
      return checks.map((c) => checkResult(c, 0, ['The project file is missing.']))
    const a = analyse(player)
    return checks.map((c) => gradeCheck(c, player, a, start))
  },
  review: (player, { checks }) =>
    reviewText(
      reviewDesign(
        player,
        checks.map((c) => ({ title: c.title, met: c.status === 'passed' })),
      ),
      (role) => reviewerName(role, player),
    ),
  projects: {
    starters: [
      {
        id: 'blank',
        name: 'Blank',
        description: 'An empty plot with one floor.',
        make: () => emptyProject(),
      },
      {
        id: 'flat',
        name: 'Two-bedroom flat',
        description: 'A furnished flat to change.',
        make: sampleApartment,
      },
      {
        id: 'house',
        name: 'Two-storey house',
        description: 'Two floors joined by a stair, with a roof.',
        make: sampleHouse,
      },
    ],
    // A JSON backup, or a DXF plan from Space Studio or another CAD program.
    fromBackup: (text) => (isDxf(text) ? projectFromDxf(text) : projectFromJson(text)),
    named: (s, name) => ({ ...s, project: { ...s.project, name } }),
  },
  guide: {
    intro:
      'Space Studio is where you plan buildings and interiors. You draw the plan in 2D, and the same design is shown in 3D, can be walked through, checked, costed and exported. Designers use tools like this to test layouts with clients before anything is built.',
    topics: [
      {
        title: 'Draw rooms and walls',
        body: 'Press R and drag for a room (type the size while dragging, e.g. 4200x3600, then Enter). Press W and click corner by corner for walls; Shift keeps them square, Esc finishes, and clicking the first corner closes a room. Select a wall to type its exact length, thickness and height.',
      },
      {
        title: 'Doors and windows',
        body: 'Press D (door) or N (window) and click a wall: the opening appears where it fits, green on hover, red with the reason where it does not. Select it to set its width, height, sill, swing and style, or to mark it as the entrance.',
      },
      {
        title: 'Furnish',
        body: "Open the Library (B), search or browse, and click an item, then click the plan to place it. R rotates by 90° while placing; selected items rotate with the handle or the angle field, and Ctrl+D duplicates. Colours and materials are in the item's panel.",
      },
      {
        title: 'Floors and stairs',
        body: 'Add a floor from the floor menu (it can copy the outside walls up). Stairs (U) need a floor above; they lead from the room they start in to the room above their top step.',
      },
      {
        title: '3D and walkthrough',
        body: 'Switch to 3D at the top: drag to orbit, right-drag to pan, scroll to zoom. Choose the light, cut the walls away, save views and take a screenshot. Walk puts you inside at eye height: W A S D to move, the mouse to look, Esc to stop.',
      },
      {
        title: 'Checks and costs',
        body: 'The Checks panel reads your design as a reviewer would: rooms that cannot be reached, missing windows, small bedrooms, furniture in walls or blocking doors, and the cost against the budget.',
      },
      {
        title: 'Saving, versions and exports',
        body: 'Everything saves as you work; Version history restores any earlier state. Export gives the plans to scale as PDF, SVG, PNG or DXF, a project report, and a JSON backup you can import as a new project.',
      },
    ],
    glossary: [
      {
        term: 'Centre line',
        meaning:
          'The line down the middle of a wall. Room areas here are measured on centre lines.',
      },
      {
        term: 'Clear width',
        meaning:
          'The space a person passes through in a doorway: the door width less its frame.',
      },
      {
        term: 'Sill height',
        meaning: 'How high the bottom of a window is above the floor.',
      },
      {
        term: 'Habitable room',
        meaning:
          'A room people live or work in (not a bathroom, hall or store). It needs daylight.',
      },
      {
        term: 'Circulation',
        meaning:
          'The space people need to move around and between furniture, usually at least 600 mm.',
      },
      {
        term: 'Shell',
        meaning:
          'The outside walls and structure of a building, kept as they are in a fit-out.',
      },
      {
        term: 'Scale 1:100',
        meaning:
          'One millimetre on paper is 100 mm in the building: a 4 m wall is 40 mm long.',
      },
    ],
  },
}
