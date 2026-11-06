/**
 * The people of the office and their days: who they are, where they work and
 * what they do (see world/npc/schedule.ts for how a day is worked out).
 * Coordinates match OfficeScene.tsx.
 *
 * - Nina, the receptionist, stays at reception: the phone, the visitors' book,
 *   lunch at the desk.
 * - The manager works in her office, walks out to see people, hosts the
 *   stand-up and the weekly planning, and has lunch at her desk.
 * - The senior colleague, the analysts and the office coordinator work at
 *   their desks, go to the stand-up, the printer, the water cooler, have a
 *   word with each other, and lunch in the break room, at the desk or out.
 * - Tom, from facilities, keeps the kitchen going, sees to the printer and
 *   waters the plants.
 * Each has their own hours and habits: some quiet, some sociable.
 */
import { MEETINGS } from '../../content/workday'
import type { Gathering, Person, Place } from '../../world/npc/schedule'

/** Facing from a spot towards a point. */
const face = (x: number, z: number, tx: number, tz: number) =>
  Math.atan2(-(tx - x), -(tz - z))

const at = (h: number, m = 0) => h * 60 + m

/** Where people come in and leave: just inside the front doors. */
export const DOOR = { x: -10.9, z: 7.6 }

/** The printer, by the back windows (drawn in OfficeScene). */
export const PRINTER = { x: 1.8, z: -3.6 }
/** The coordinator's standing desk. */
export const STANDING_DESK = { x: 3.6, z: -4.4 }

const WHITEBOARD = { x: -2.9, z: 2.4, facing: 0.5 }

/** Standing round the team whiteboard for the stand-up, facing it. */
function round(offset: number, distance: number): Place {
  const a = WHITEBOARD.facing + offset
  const x = WHITEBOARD.x + Math.sin(a) * distance
  const z = WHITEBOARD.z + Math.cos(a) * distance
  return {
    x,
    z,
    heading: face(x, z, WHITEBOARD.x, WHITEBOARD.z),
    clip: 'stand',
    also: ['talk'],
    label: 'at the stand-up',
  }
}

const desk = (x: number, front: boolean, label: string, also: Place['also']): Place => ({
  x,
  z: front ? 1.65 : -1.0,
  heading: front ? 0 : Math.PI,
  seated: true,
  clip: 'type',
  also,
  label,
})

/** Standing beside someone's desk to talk to them. */
const beside = (x: number, z: number, tx: number, tz: number): Place => ({
  x,
  z,
  heading: face(x, z, tx, tz),
  clip: 'talk',
  label: 'talking to a colleague',
})

export const OFFICE_PLACES: Record<string, Place> = {
  reception: {
    x: -6.2,
    z: 3.4,
    heading: Math.PI,
    clip: 'stand',
    also: ['phone', 'write', 'read'],
    label: 'at reception',
  },
  'desk:senior': desk(-1.2, true, 'working at the desk', ['read', 'write', 'phone']),
  'desk:front2': desk(2.4, true, 'working at the desk', ['read', 'drink']),
  'desk:backL': desk(-1.2, false, 'working quietly', ['read']),
  'desk:backM': desk(0.6, false, 'working at the desk', ['phone', 'drink', 'read']),
  'desk:backR': desk(2.4, false, 'reading documents', ['write', 'read']),
  filing: {
    x: 4.3,
    z: -0.95,
    heading: 0,
    clip: 'reach',
    also: ['read', 'write'],
    label: 'filing',
  },
  manager: {
    x: 8.4,
    z: -5.1,
    heading: Math.PI,
    seated: true,
    clip: 'type',
    also: ['phone', 'read', 'write'],
    label: 'working in her office',
  },
  coffee: {
    x: -8.4,
    z: -6.2,
    heading: Math.PI + 0.5,
    clip: 'stand',
    also: ['drink', 'reach'],
    label: 'seeing to the kitchen',
  },
  standing: {
    x: STANDING_DESK.x,
    z: STANDING_DESK.z + 0.6,
    heading: 0,
    clip: 'write',
    also: ['read', 'phone'],
    label: 'at the standing desk',
  },
  // The break room table: one chair is the player's (east); the others are for lunch.
  'table:north': {
    x: -7.4,
    z: -2.6,
    heading: 0,
    seated: true,
    clip: 'type',
    also: ['read', 'drink'],
    label: 'working at the break room table',
  },
  'table:south': {
    x: -7.4,
    z: -4.6,
    heading: Math.PI,
    seated: true,
    clip: 'eat',
    also: ['drink'],
    label: 'having lunch',
  },
  'table:west': {
    x: -8.45,
    z: -3.6,
    heading: -Math.PI / 2,
    seated: true,
    clip: 'eat',
    also: ['drink'],
    label: 'having lunch',
  },
  counter: {
    x: -9.9,
    z: -6.85,
    heading: 0,
    clip: 'eat',
    also: ['drink'],
    label: 'lunch at the counter',
  },
  printer: {
    x: PRINTER.x,
    z: PRINTER.z + 0.7,
    heading: 0,
    clip: 'reach',
    also: ['read'],
    label: 'at the printer',
  },
  water: {
    x: -4.8,
    z: -6.75,
    heading: 0,
    clip: 'drink',
    label: 'at the water cooler',
  },
  'plant:reception': {
    x: -3.35,
    z: 3.6,
    heading: face(-3.35, 3.6, -3.7, 3.0),
    clip: 'reach',
    label: 'watering the plants',
  },
  'plant:corner': {
    x: 3.75,
    z: 3.6,
    heading: face(3.75, 3.6, 4.4, 3.6),
    clip: 'reach',
    label: 'watering the plants',
  },
  'stretch:backR': {
    x: 3.05,
    z: -1.7,
    heading: Math.PI,
    clip: 'stretch',
    label: 'stretching',
  },
  // Stand-up, round the whiteboard (the manager at its side, leading it).
  'standup:host': { ...round(-1.35, 1.15), clip: 'present', also: ['talk'] },
  'standup:0': round(-0.75, 2.0),
  'standup:1': round(-0.3, 2.2),
  'standup:2': round(0.15, 2.2),
  'standup:3': round(0.6, 2.1),
  'standup:4': round(1.0, 1.95),
  'standup:5': round(1.35, 1.75),
  // Weekly planning, in the manager's office (the west chair is the player's).
  'planning:0': {
    x: 9.0,
    z: -3.3,
    heading: 0,
    seated: true,
    clip: 'talk',
    also: ['write'],
    label: 'at the planning meeting',
  },
  'planning:1': {
    x: 9.9,
    z: -3.7,
    heading: face(9.9, -3.7, 8.4, -4.6),
    clip: 'stand',
    also: ['talk'],
    label: 'at the planning meeting',
  },
  'planning:2': {
    x: 7.0,
    z: -3.8,
    heading: face(7.0, -3.8, 8.4, -4.6),
    clip: 'stand',
    also: ['write'],
    label: 'at the planning meeting',
  },
  'planning:3': {
    x: 6.6,
    z: -2.6,
    heading: face(6.6, -2.6, 8.4, -4.6),
    clip: 'stand',
    also: ['talk'],
    label: 'at the planning meeting',
  },
  // A word with someone, beside their place.
  'visit:reception': beside(-5.5, 4.85, -6.2, 3.4),
  'visit:senior': beside(-1.85, 2.25, -1.2, 1.65),
  'visit:front2': beside(3.05, 2.3, 2.4, 1.65),
  'visit:backL': beside(-1.85, -1.6, -1.2, -1.0),
  'visit:backM': beside(0.0, -1.65, 0.6, -1.0),
  'visit:backR': beside(1.8, -1.65, 2.4, -1.0),
  'visit:manager': beside(8.4, -3.55, 8.4, -5.1),
}

export const OFFICE_PEOPLE: Person[] = [
  {
    id: 'reception',
    role: 'Receptionist',
    own: 'reception',
    arrives: at(8, 25),
    leaves: at(17, 40),
    lunch: { at: at(13, 15), minutes: 40, place: 'own' },
    meetings: {},
    errands: [],
    talk: 'receptionist',
    speaker: 'reception',
  },
  {
    id: 'manager',
    role: 'Manager',
    own: 'manager',
    arrives: at(8, 20),
    leaves: at(18, 15),
    lunch: { at: at(13, 0), minutes: 30, place: 'own' },
    meetings: { standup: 'standup:host', planning: 'manager', 'one-to-one': 'manager' },
    errands: [
      { to: 'visit:senior', minutes: 10, chance: 0.3 },
      { to: 'visit:backR', minutes: 8, chance: 0.2 },
    ],
    talk: 'manager',
    speaker: 'manager',
  },
  {
    id: 'senior',
    role: 'Senior colleague',
    own: 'desk:senior',
    arrives: at(8, 40),
    leaves: at(17, 45),
    lunch: { at: at(12, 30), minutes: 40, place: 'table:south' },
    meetings: { standup: 'standup:0', planning: 'planning:0' },
    errands: [
      { to: 'printer', minutes: 6, chance: 0.35 },
      { to: 'visit:backM', minutes: 10, chance: 0.2 },
    ],
    talk: 'senior',
    speaker: 'senior',
  },
  {
    id: 'facilities',
    role: 'Facilities',
    own: 'coffee',
    arrives: at(8, 10),
    leaves: at(16, 30),
    lunch: { at: at(13, 15), minutes: 35, place: 'table:west' },
    meetings: {},
    errands: [
      { to: 'printer', minutes: 10, chance: 0.35 },
      { to: 'plant:reception', minutes: 6, chance: 0.25 },
      { to: 'plant:corner', minutes: 6, chance: 0.25 },
    ],
    talk: 'colleague',
    speaker: 'facilities',
  },
  {
    // Sociable: often over at someone's desk.
    id: 'backM',
    role: 'Accounts assistant',
    own: 'desk:backM',
    arrives: at(8, 50),
    leaves: at(17, 30),
    lunch: { at: at(12, 15), minutes: 45, place: 'table:west' },
    meetings: { standup: 'standup:3', planning: 'planning:1' },
    errands: [
      { to: 'visit:backL', minutes: 8, chance: 0.4 },
      { to: 'visit:front2', minutes: 8, chance: 0.3 },
      { to: 'water', minutes: 5, chance: 0.3 },
    ],
  },
  {
    // Reads a lot, and stands up to stretch now and then.
    id: 'backR',
    role: 'Financial analyst',
    own: 'desk:backR',
    arrives: at(8, 57),
    leaves: at(17, 50),
    lunch: { at: at(13, 0), minutes: 30, place: 'counter' },
    meetings: { standup: 'standup:4', planning: 'planning:2' },
    errands: [
      { to: 'stretch:backR', minutes: 3, chance: 0.35 },
      { to: 'printer', minutes: 6, chance: 0.3 },
      { to: 'visit:manager', minutes: 10, chance: 0.2 },
    ],
  },
  {
    // Quiet: long stretches at the desk, lunch there too.
    id: 'backL',
    role: 'Bookkeeper',
    own: 'desk:backL',
    arrives: at(8, 35),
    leaves: at(17, 0),
    lunch: { at: at(12, 45), minutes: 30, place: 'own' },
    meetings: { standup: 'standup:2' },
    errands: [{ to: 'printer', minutes: 5, chance: 0.15 }],
  },
  {
    // Prints a lot.
    id: 'front2',
    role: 'Payroll officer',
    own: 'desk:front2',
    arrives: at(8, 55),
    leaves: at(17, 15),
    lunch: { at: at(12, 0), minutes: 50, place: 'out' },
    meetings: { standup: 'standup:1' },
    errands: [
      { to: 'printer', minutes: 6, chance: 0.5 },
      { to: 'water', minutes: 5, chance: 0.2 },
    ],
  },
  {
    // Takes papers between the team and the manager (the colleague once seen pacing).
    id: 'coordinator',
    role: 'Office coordinator',
    own: 'standing',
    arrives: at(8, 45),
    leaves: at(17, 20),
    lunch: { at: at(12, 30), minutes: 45, place: 'out' },
    meetings: { standup: 'standup:5', planning: 'planning:3' },
    errands: [
      { to: 'visit:manager', minutes: 8, chance: 0.45 },
      { to: 'printer', minutes: 6, chance: 0.4 },
      { to: 'visit:senior', minutes: 8, chance: 0.3 },
    ],
  },
  {
    id: 'admin',
    role: 'Office administrator',
    own: 'filing',
    arrives: at(8, 30),
    leaves: at(16, 45),
    lunch: { at: at(13, 15), minutes: 40, place: 'table:south' },
    meetings: {},
    errands: [
      { to: 'printer', minutes: 6, chance: 0.4 },
      { to: 'visit:reception', minutes: 6, chance: 0.4 },
      { to: 'visit:manager', minutes: 6, chance: 0.2 },
    ],
  },
  {
    // Hot-desks at the break room table on a laptop.
    id: 'analyst',
    role: 'Data analyst',
    own: 'table:north',
    arrives: at(9, 20),
    leaves: at(16, 40),
    lunch: { at: at(12, 30), minutes: 30, place: 'own' },
    meetings: {},
    errands: [
      { to: 'water', minutes: 5, chance: 0.3 },
      { to: 'printer', minutes: 6, chance: 0.2 },
    ],
  },
]

/** The meetings everyone keeps to (from the working day). */
export const OFFICE_GATHERINGS: Gathering[] = MEETINGS.map((m) => ({
  id: m.id,
  days: m.days,
  start: m.start,
  minutes: m.minutes,
}))
