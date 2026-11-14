/**
 * How a whole workplace floor is dressed beyond its own corner (bays.ts):
 * the hospital ward, the law firm and the engineering firm each turn the
 * office's spare spaces into the rooms such workplaces really have, and
 * dress reception, the desks, the manager's office and the break room.
 * Drawn in themes.tsx.
 *
 * From published layouts and design guidance:
 * - a hospital ward: a nurses' station, a treatment/clean utility room with
 *   the medicines, a dirty utility (sluice), the ward manager's office, a
 *   relatives' (interview) room and a staff room with lockers;
 * - a law firm: reception with a client meeting room off it (clients do not
 *   cross the working floor), partners' offices, an open-plan floor for
 *   paralegals, and a smaller library and file room;
 * - an engineering firm: a design office, a project room for reviewing
 *   drawings, a plot room and stores, and lockers and PPE for site work.
 *
 * Two spaces are used: behind the desks on the left (the support room) and
 * behind reception's feature wall (the meeting room). The office itself
 * (Cobalt Ridge) keeps both as open floor.
 */
import type { Department } from '../../content/departments/types'
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'

export type Theme = 'office' | 'hospital' | 'law' | 'engineering'

export function themeOf(workplace: Department['workplace']): Theme {
  if (workplace === 'ward') return 'hospital'
  if (workplace === 'courtroom') return 'law'
  if (workplace === 'workshop') return 'engineering'
  return 'office'
}

/** Colours of the floor and walls for each theme (null keeps the office's own). */
export const PALETTE: Record<
  Theme,
  { floor: string | null; workspace: string | null; accent: string; accentText: string }
> = {
  office: {
    floor: null,
    workspace: null,
    accent: '#1e3a8a',
    accentText: 'text-blue-200',
  },
  // Hospital vinyl throughout: easy to clean, no carpet.
  hospital: {
    floor: '#dfe7e4',
    workspace: '#cfe3de',
    accent: '#0f766e',
    accentText: 'text-teal-100',
  },
  law: {
    floor: null,
    workspace: '#6b2f3a',
    accent: '#3f1d24',
    accentText: 'text-amber-200',
  },
  engineering: {
    floor: '#c9ccd1',
    workspace: '#8fa3b8',
    accent: '#1f2937',
    accentText: 'text-orange-300',
  },
}

// The support room, behind the desks on the left: glass walls, a doorway
// facing the desks (x −1.0 to 0.0).
export const SUPPORT = { x0: -3.9, x1: 0.9, z0: -7.85, z1: -2.7, door: [-1.0, 0.0] }
const SUPPORT_WALLS: Solid[] = [
  {
    x: (SUPPORT.x0 + SUPPORT.door[0]) / 2,
    z: SUPPORT.z1,
    hx: (SUPPORT.door[0] - SUPPORT.x0) / 2,
    hz: 0.05,
    top: 2.3,
  },
  {
    x: (SUPPORT.door[1] + SUPPORT.x1) / 2,
    z: SUPPORT.z1,
    hx: (SUPPORT.x1 - SUPPORT.door[1]) / 2,
    hz: 0.05,
    top: 2.3,
  },
  {
    x: SUPPORT.x1,
    z: (SUPPORT.z0 + SUPPORT.z1) / 2,
    hx: 0.05,
    hz: (SUPPORT.z1 - SUPPORT.z0) / 2,
    top: 2.3,
  },
]

// The meeting room, behind reception's feature wall: glass walls, a doorway
// on its right side (z −0.4 to 0.8), so the way to the break room stays open.
export const MEETING = { x0: -11.9, x1: -8.6, z0: -1.7, z1: 1.95, door: [-0.4, 0.8] }
const MEETING_WALLS: Solid[] = [
  {
    x: (MEETING.x0 + MEETING.x1) / 2,
    z: MEETING.z0,
    hx: (MEETING.x1 - MEETING.x0) / 2,
    hz: 0.05,
    top: 2.3,
  },
  {
    x: MEETING.x1,
    z: (MEETING.z0 + MEETING.door[0]) / 2,
    hx: 0.05,
    hz: (MEETING.door[0] - MEETING.z0) / 2,
    top: 2.3,
  },
  {
    x: MEETING.x1,
    z: (MEETING.door[1] + MEETING.z1) / 2,
    hx: 0.05,
    hz: (MEETING.z1 - MEETING.door[1]) / 2,
    top: 2.3,
  },
]

/** The names of the theme's two rooms (shown as "Now in: …"). */
export const ROOM_NAMES: Record<Theme, { support: string; meeting: string } | null> = {
  office: null,
  hospital: { support: 'Treatment room', meeting: 'Relatives’ room' },
  law: { support: 'Library & file room', meeting: 'Client meeting room' },
  engineering: { support: 'Plot room & stores', meeting: 'Project room' },
}

/** The meeting room's table (every theme that has the room). */
export const MEETING_TABLE = { x: -10.25, z: 0.1 }

// Hospital ------------------------------------------------------------------
export const HOSPITAL = {
  medicines: { x: -3.55, z: -5.0 },
  fridge: { x: -3.5, z: -3.4 },
  shelves: { x: -1.4, z: -7.55 },
  couch: { x: 0.2, z: -5.3 },
  lockers: { x: -6.1, z: -7.55 },
  statusBoard: { x: -3.35, z: 0.4 },
  wheelchair: { x: -10.95, z: 5.3 },
}

// Law -------------------------------------------------------------------------
export const LAW = {
  bookcases: { x: -1.4, z: -7.55 },
  files: { x: -3.5, z: -5.2 },
  reading: { x: -1.6, z: -5.1 },
  partnerShelves: { x: 11.65, z: -4.4 },
}

// Engineering -----------------------------------------------------------------
export const ENGINEERING = {
  plotter: { x: -1.6, z: -7.4 },
  planChest: { x: 0.25, z: -6.4 },
  stores: { x: -3.5, z: -5.2 },
  hardHats: { x: -11.85, z: 5.4 },
  signIn: { x: -4.4, z: 4.9 },
  lockers: { x: -6.1, z: -7.55 },
}

export const THEME_BOXES: Record<Theme, Solid[]> = {
  office: [],
  hospital: [
    ...SUPPORT_WALLS,
    ...MEETING_WALLS,
    { x: HOSPITAL.medicines.x, z: HOSPITAL.medicines.z, hx: 0.3, hz: 0.7, top: 2.0 },
    { x: HOSPITAL.fridge.x, z: HOSPITAL.fridge.z, hx: 0.3, hz: 0.3, top: 1.5 },
    { x: HOSPITAL.shelves.x, z: HOSPITAL.shelves.z, hx: 1.6, hz: 0.25, top: 2.0 },
    { x: HOSPITAL.couch.x, z: HOSPITAL.couch.z, hx: 0.38, hz: 0.95, top: 0.7 },
    { x: HOSPITAL.lockers.x, z: HOSPITAL.lockers.z, hx: 0.7, hz: 0.3, top: 1.9 },
    { x: HOSPITAL.statusBoard.x, z: HOSPITAL.statusBoard.z, hx: 0.3, hz: 0.55, top: 1.9 },
    { x: HOSPITAL.wheelchair.x, z: HOSPITAL.wheelchair.z, hx: 0.35, hz: 0.35, top: 0.9 },
    { x: MEETING_TABLE.x, z: MEETING_TABLE.z, hx: 0.45, hz: 0.45, top: 0.45 },
  ],
  law: [
    ...SUPPORT_WALLS,
    ...MEETING_WALLS,
    { x: LAW.bookcases.x, z: LAW.bookcases.z, hx: 2.2, hz: 0.25, top: 2.2 },
    { x: LAW.files.x, z: LAW.files.z, hx: 0.32, hz: 1.4, top: 2.0 },
    { x: LAW.reading.x, z: LAW.reading.z, hx: 0.8, hz: 0.5, top: 0.76 },
    { x: LAW.partnerShelves.x, z: LAW.partnerShelves.z, hx: 0.3, hz: 1.1, top: 2.2 },
    { x: MEETING_TABLE.x, z: MEETING_TABLE.z, hx: 0.6, hz: 0.6, top: 0.76 },
  ],
  engineering: [
    ...SUPPORT_WALLS,
    ...MEETING_WALLS,
    { x: ENGINEERING.plotter.x, z: ENGINEERING.plotter.z, hx: 0.95, hz: 0.35, top: 1.15 },
    {
      x: ENGINEERING.planChest.x,
      z: ENGINEERING.planChest.z,
      hx: 0.5,
      hz: 0.6,
      top: 0.9,
    },
    { x: ENGINEERING.stores.x, z: ENGINEERING.stores.z, hx: 0.32, hz: 1.5, top: 2.0 },
    { x: ENGINEERING.hardHats.x, z: ENGINEERING.hardHats.z, hx: 0.15, hz: 0.5, top: 1.8 },
    { x: ENGINEERING.signIn.x, z: ENGINEERING.signIn.z, hx: 0.22, hz: 0.22, top: 1.3 },
    { x: ENGINEERING.lockers.x, z: ENGINEERING.lockers.z, hx: 0.7, hz: 0.3, top: 1.9 },
    { x: MEETING_TABLE.x, z: MEETING_TABLE.z, hx: 0.7, hz: 1.0, top: 0.8 },
  ],
}

const TO_LEFT = Math.PI / 2 // facing −x
const TO_BACK = Math.PI // facing −z

/** What the player does in the theme's own rooms: each opens the career's tool there. */
export function themeActivities(theme: Theme): Activity[] {
  if (theme === 'hospital')
    return [
      {
        id: 'treatment-room',
        action: 'open:tool:clinical',
        prompt: 'prepare medicines in the treatment room (Ward Systems)',
        spot: { x: HOSPITAL.medicines.x + 0.95, z: HOSPITAL.medicines.z, reach: 1.2 },
        anchor: {
          x: HOSPITAL.medicines.x + 0.9,
          z: HOSPITAL.medicines.z,
          heading: TO_LEFT,
        },
        stages: [
          { clip: 'wash-hands', seconds: 1.2, label: 'Cleaning your hands with the gel' },
          { clip: 'reach', seconds: 1.0, label: 'Unlocking the medicines cupboard' },
          { clip: 'stand', seconds: 1.0, label: 'Checking the label against the chart' },
        ],
      },
    ]
  if (theme === 'law')
    return [
      {
        id: 'law-library',
        action: 'open:tool:legal',
        prompt: 'research at the library table (Matter Desk)',
        spot: { x: LAW.reading.x, z: LAW.reading.z + 1.0, reach: 1.2 },
        anchor: { x: LAW.reading.x, z: LAW.reading.z + 0.95, heading: TO_BACK },
        stages: [
          { clip: 'reach', seconds: 1.0, label: 'Taking down the law reports' },
          { clip: 'stand', seconds: 1.2, label: 'Checking the case is still good law' },
        ],
      },
      {
        id: 'client-room',
        action: 'open:tool:legal',
        prompt: 'get the client meeting room ready (Matter Desk: intake)',
        spot: { x: MEETING_TABLE.x + 1.1, z: MEETING_TABLE.z, reach: 1.2 },
        anchor: { x: MEETING_TABLE.x + 1.05, z: MEETING_TABLE.z, heading: TO_LEFT },
        stages: [
          {
            clip: 'reach',
            seconds: 1.0,
            label: 'Laying out the engagement letter and ID forms',
          },
        ],
      },
    ]
  if (theme === 'engineering')
    return [
      {
        id: 'plot-room',
        action: 'open:tool:engineering',
        prompt: 'collect the plotted drawings (Works Desk)',
        spot: { x: ENGINEERING.plotter.x, z: ENGINEERING.plotter.z + 0.8, reach: 1.2 },
        anchor: {
          x: ENGINEERING.plotter.x,
          z: ENGINEERING.plotter.z + 0.75,
          heading: TO_BACK,
        },
        stages: [
          {
            clip: 'reach',
            seconds: 1.2,
            label: 'Taking the A1 drawings off the plotter',
          },
        ],
      },
      {
        id: 'project-room',
        action: 'open:tool:engineering',
        prompt: 'review the drawings in the project room (Works Desk)',
        spot: { x: MEETING_TABLE.x + 1.25, z: MEETING_TABLE.z, reach: 1.2 },
        anchor: { x: MEETING_TABLE.x + 1.2, z: MEETING_TABLE.z, heading: TO_LEFT },
        stages: [
          {
            clip: 'present',
            seconds: 1.2,
            label: 'Checking the dimensions against the calculation',
          },
        ],
      },
    ]
  return []
}
