/**
 * The corner of the floor that each workplace dresses as its own (where the
 * IT corner is in the office): the hospital's bay of beds, the engineering
 * firm's workshop, the law firm's moot courtroom. What is solid there, what
 * the player can do, and which of the career's tools it opens.
 */
import { workplaceKind } from '../../content/departments'
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'
import { COURTROOM_BOXES, courtroomActivities } from './courtroomLayout'
import { IT_BENCH, IT_CABINET, OFFICE_BOXES } from './officeLayout'
import { WARD_BOXES, wardActivities } from './wardLayout'
import { WORKSHOP_BOXES, workshopActivities } from './workshopLayout'

export interface Bay {
  kind: 'ward' | 'workshop' | 'courtroom'
  /** The career tool it opens (a tool ID). */
  tool: string
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

const BAYS: Record<Bay['kind'], Bay> = {
  ward: {
    kind: 'ward',
    tool: 'clinical',
    title: 'Bay A: beds 1–4',
    button: 'Go to the bedside (Ward Systems)',
    goTo: 'bedside',
    tone: { box: 'bg-teal-50', title: 'text-teal-900', button: 'text-teal-800' },
    boxes: WARD_BOXES,
    activities: wardActivities,
  },
  workshop: {
    kind: 'workshop',
    tool: 'engineering',
    title: 'The workshop: safety glasses on',
    button: 'Go to the test bench (Works Desk)',
    goTo: 'test-bench',
    tone: { box: 'bg-amber-50', title: 'text-amber-900', button: 'text-amber-800' },
    boxes: WORKSHOP_BOXES,
    activities: workshopActivities,
  },
  courtroom: {
    kind: 'courtroom',
    tool: 'legal',
    title: 'The moot courtroom',
    button: 'Take your place at counsel’s table (Matter Desk)',
    goTo: 'counsel-table',
    tone: { box: 'bg-indigo-50', title: 'text-indigo-900', button: 'text-indigo-800' },
    boxes: COURTROOM_BOXES,
    activities: courtroomActivities,
  },
}

/** The active workplace's own corner, or null in the office (the IT corner). */
export function activeBay(): Bay | null {
  const kind = workplaceKind()
  return kind === 'office' ? null : BAYS[kind]
}

/** A workplace's corner by its kind. */
export const bayFor = (kind: Bay['kind']): Bay => BAYS[kind]

/** The office's solids without the IT corner (a bay stands there instead). */
const WITHOUT_IT_CORNER = OFFICE_BOXES.filter(
  (b) =>
    !(b.x === IT_CABINET.x && b.z === IT_CABINET.z) &&
    !(b.x === IT_BENCH.x && b.z === IT_BENCH.z),
)

/** What the player cannot walk through on a floor with this corner (or the office's own). */
export function floorWith(bay: Bay | null): Solid[] {
  return bay ? [...WITHOUT_IT_CORNER, ...bay.boxes] : OFFICE_BOXES
}

/** What the player cannot walk through on the active workplace's floor. */
export const floorBoxes = (): Solid[] => floorWith(activeBay())
