/**
 * The corner of the floor that each workplace dresses as its own (where the
 * IT team has its IT corner): the hospital's bay of beds, the engineering
 * firm's workshop, the law firm's moot courtroom, and each Cobalt Ridge
 * department's room. What is solid there, what the player can do, and what
 * it opens. With the whole-floor theme (themeLayout.ts), this is everything
 * that differs between workplaces.
 */
import { workplaceKind } from '../../content/departments'
import type { DialogueAction } from '../../game/office'
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'
import {
  DEVTEAM_BOXES,
  devteamActivities,
  INSIGHTS_BOXES,
  insightsActivities,
  POSTROOM_BOXES,
  postroomActivities,
  RECORDS_BOXES,
  recordsActivities,
  STUDIO_BOXES,
  studioActivities,
} from './cornersLayout'
import { COURTROOM_BOXES, courtroomActivities } from './courtroomLayout'
import { IT_BENCH, IT_CABINET, OFFICE_BOXES } from './officeLayout'
import {
  MEETING,
  ROOM_NAMES,
  SUPPORT,
  THEME_BOXES,
  themeActivities,
  themeOf,
  type Theme,
} from './themeLayout'
import { WARD_BOXES, wardActivities } from './wardLayout'
import { WORKSHOP_BOXES, workshopActivities } from './workshopLayout'

export type Opens = DialogueAction['open']

export interface Bay {
  kind: Exclude<ReturnType<typeof workplaceKind>, 'office'>
  /** What its main activity opens on the computer (an app, or a career tool). */
  opens: Opens
  /** The room's name, shown while the player is in it. */
  room: string
  /** The panel beside the view: its heading and the button that goes there. */
  title: string
  button: string
  /** The activity the button walks to. */
  goTo: string
  /** The panel's colours (Tailwind classes). */
  tone: { box: string; title: string; button: string }
  boxes: Solid[]
  activities: () => Activity[]
}

const tool = (id: string): Opens => ({ app: 'tool', tool: id })

const BAYS: Record<Bay['kind'], Bay> = {
  ward: {
    kind: 'ward',
    room: 'Bay A',
    opens: tool('clinical'),
    title: 'Bay A: beds 1–4',
    button: 'Go to the bedside (Ward Systems)',
    goTo: 'bedside',
    tone: { box: 'bg-teal-50', title: 'text-teal-900', button: 'text-teal-800' },
    boxes: WARD_BOXES,
    activities: wardActivities,
  },
  workshop: {
    kind: 'workshop',
    room: 'The workshop',
    opens: tool('engineering'),
    title: 'The workshop: safety glasses on',
    button: 'Go to the test bench (Works Desk)',
    goTo: 'test-bench',
    tone: { box: 'bg-amber-50', title: 'text-amber-900', button: 'text-amber-800' },
    boxes: WORKSHOP_BOXES,
    activities: workshopActivities,
  },
  courtroom: {
    kind: 'courtroom',
    room: 'The moot courtroom',
    opens: tool('legal'),
    title: 'The moot courtroom',
    button: 'Take your place at counsel’s table (Matter Desk)',
    goTo: 'counsel-table',
    tone: { box: 'bg-indigo-50', title: 'text-indigo-900', button: 'text-indigo-800' },
    boxes: COURTROOM_BOXES,
    activities: courtroomActivities,
  },
  postroom: {
    kind: 'postroom',
    room: 'The post & print room',
    opens: { app: 'sheets' },
    title: 'The post & print room',
    button: 'Check the supplies cupboard (Grid Craft)',
    goTo: 'supplies-cupboard',
    tone: { box: 'bg-stone-100', title: 'text-stone-900', button: 'text-stone-800' },
    boxes: POSTROOM_BOXES,
    activities: postroomActivities,
  },
  records: {
    kind: 'records',
    room: 'The records room',
    opens: tool('books'),
    title: 'The records room',
    button: 'Go to the ledger desk (Books)',
    goTo: 'ledger-desk',
    tone: { box: 'bg-slate-100', title: 'text-slate-900', button: 'text-slate-800' },
    boxes: RECORDS_BOXES,
    activities: recordsActivities,
  },
  studio: {
    kind: 'studio',
    room: 'The content studio',
    opens: tool('social'),
    title: 'The content studio',
    button: 'Go to the photo set (Social Planner)',
    goTo: 'photo-set',
    tone: { box: 'bg-rose-50', title: 'text-rose-900', button: 'text-rose-800' },
    boxes: STUDIO_BOXES,
    activities: studioActivities,
  },
  insights: {
    kind: 'insights',
    room: 'The insights wall',
    opens: tool('datastudio'),
    title: 'The insights wall',
    button: 'Review the dashboards (Data Studio)',
    goTo: 'dashboard-wall',
    tone: { box: 'bg-sky-50', title: 'text-sky-900', button: 'text-sky-800' },
    boxes: INSIGHTS_BOXES,
    activities: insightsActivities,
  },
  devteam: {
    kind: 'devteam',
    room: 'The dev team area',
    opens: { app: 'code' },
    title: 'The dev team area',
    button: 'Go to the pairing desk (Code)',
    goTo: 'pairing-desk',
    tone: { box: 'bg-emerald-50', title: 'text-emerald-900', button: 'text-emerald-800' },
    boxes: DEVTEAM_BOXES,
    activities: devteamActivities,
  },
}

/** The active workplace's own corner, or null in the office (the IT corner). */
export function activeBay(): Bay | null {
  const kind = workplaceKind()
  return kind === 'office' ? null : BAYS[kind]
}

/** A workplace's corner by its kind. */
export const bayFor = (kind: Bay['kind']): Bay => BAYS[kind]
export const BAY_KINDS = Object.keys(BAYS) as Array<Bay['kind']>

/** The active workplace's whole-floor theme (hospital, law firm, engineering firm, office). */
export const activeTheme = (): Theme => themeOf(workplaceKind())

/**
 * What an activity's action opens: `bay` (or the ward's `bedside`) opens the
 * corner's own; `open:<app>` an app; `open:tool:<id>` a career tool.
 */
export function opensFor(action: string | null, bay: Bay | null): Opens | null {
  if (!action) return null
  if (action === 'bay' || action === 'bedside') return bay?.opens ?? null
  if (!action.startsWith('open:')) return null
  const [, app, id] = action.split(':')
  if (app === 'tool') return id ? tool(id) : null
  return { app: app as Opens['app'] }
}

/**
 * The room the player is standing in, within the four areas: the corner on the
 * right, or one of the theme's own rooms. Null on the open floor.
 */
export function roomAt(
  x: number,
  z: number,
  bay: Bay | null,
  theme: Theme,
): string | null {
  if (x > 5.3 && z > -0.8) return bay?.room ?? 'The IT corner'
  const rooms = ROOM_NAMES[theme]
  if (!rooms) return null
  const inside = (r: { x0: number; x1: number; z0: number; z1: number }) =>
    x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1
  if (inside(SUPPORT)) return rooms.support
  if (inside(MEETING)) return rooms.meeting
  return null
}

/** The office's solids without the IT corner (a bay stands there instead). */
const WITHOUT_IT_CORNER = OFFICE_BOXES.filter(
  (b) =>
    !(b.x === IT_CABINET.x && b.z === IT_CABINET.z) &&
    !(b.x === IT_BENCH.x && b.z === IT_BENCH.z),
)

/** What the player cannot walk through on a floor with this corner and theme. */
export function floorWith(bay: Bay | null, theme: Theme = 'office'): Solid[] {
  return [
    ...(bay ? [...WITHOUT_IT_CORNER, ...bay.boxes] : OFFICE_BOXES),
    ...THEME_BOXES[theme],
  ]
}

/** What the player cannot walk through on the active workplace's floor. */
export const floorBoxes = (): Solid[] => floorWith(activeBay(), activeTheme())

/** Everything the player can do in the workplace's own corner and rooms. */
export function workplaceActivities(bay: Bay | null, theme: Theme): Activity[] {
  return [...(bay?.activities() ?? []), ...themeActivities(theme)]
}
