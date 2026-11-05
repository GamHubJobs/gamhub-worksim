/**
 * Life outside work: the rooms of the player's flat, what they can do there,
 * what things cost, what the job pays, and the ways to get to work. Times are
 * minutes; money is in pence; needs are 0–100 (high is good).
 */

export type NeedId = 'hunger' | 'hygiene' | 'social' | 'fun'

export const NEEDS: Array<{ id: NeedId; name: string; low: string }> = [
  { id: 'hunger', name: 'Hunger', low: 'You are hungry.' },
  { id: 'hygiene', name: 'Hygiene', low: 'You need a shower.' },
  { id: 'social', name: 'Social', low: 'You have not talked to a friend in a while.' },
  { id: 'fun', name: 'Fun', low: 'You need some time to enjoy yourself.' },
]

export type RoomId = 'kitchen' | 'bathroom' | 'bedroom' | 'living' | 'door'

export const ROOMS: Array<{ id: RoomId; name: string; description: string }> = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    description: 'A small kitchen with a fridge and a hob.',
  },
  { id: 'bathroom', name: 'Bathroom', description: 'A shower, a basin and a mirror.' },
  {
    id: 'bedroom',
    name: 'Bedroom',
    description: 'Your bed and a wardrobe of work clothes.',
  },
  {
    id: 'living',
    name: 'Living room',
    description: 'A sofa, a television and your phone.',
  },
  { id: 'door', name: 'Front door', description: 'The way out: to work, or into town.' },
]

export type LifePhase = 'evening' | 'morning'

/** Something the player can do out of work hours, at home or in town. */
export interface LifeAction {
  id: string
  label: string
  /** When it can be done. */
  phases: LifePhase[]
  minutes: number
  /** In pence. */
  cost?: number
  needs?: Partial<Record<NeedId, number>>
  /** Changes to energy and stress (the working wellbeing). */
  energy?: number
  stress?: number
  /** Meals used from the fridge (or added, if negative). */
  food?: number
  /** Today's routine it completes. */
  marks?: 'ate' | 'showered' | 'dressed'
  /** Not after this home-clock minute (e.g. going out in the evening). */
  until?: number
  /** One line shown in the day's log. */
  done: string
  /** Needs a piece of furniture that enables it (see content/home.ts). */
  needsItem?: boolean
  /** Skill XP added to the career skill the player has least of (studying). */
  skillXp?: number
}

export interface HomeAction extends LifeAction {
  room: RoomId
}

const HOUR = 60

export const HOME_ACTIONS: HomeAction[] = [
  {
    id: 'cook',
    room: 'kitchen',
    label: 'Cook dinner',
    phases: ['evening'],
    minutes: 35,
    food: 1,
    needs: { hunger: 55, fun: 5 },
    marks: 'ate',
    done: 'Cooked dinner',
  },
  {
    id: 'breakfast',
    room: 'kitchen',
    label: 'Make breakfast',
    phases: ['morning'],
    minutes: 15,
    food: 1,
    needs: { hunger: 45 },
    energy: 5,
    marks: 'ate',
    done: 'Had breakfast',
  },
  {
    id: 'takeaway',
    room: 'kitchen',
    label: 'Order a takeaway',
    phases: ['evening'],
    minutes: 40,
    cost: 1450,
    needs: { hunger: 50, fun: 10 },
    marks: 'ate',
    until: 23 * HOUR,
    done: 'Had a takeaway',
  },
  {
    id: 'groceries',
    room: 'kitchen',
    label: 'Order a week of groceries (7 meals)',
    phases: ['evening'],
    minutes: 15,
    cost: 3200,
    food: -7,
    until: 22 * HOUR,
    done: 'Ordered groceries for the week',
  },
  {
    id: 'shower',
    room: 'bathroom',
    label: 'Have a shower',
    phases: ['evening', 'morning'],
    minutes: 15,
    needs: { hygiene: 100 },
    energy: 3,
    stress: -3,
    marks: 'showered',
    done: 'Showered',
  },
  {
    id: 'dress',
    room: 'bedroom',
    label: 'Get dressed for work',
    phases: ['morning'],
    minutes: 10,
    marks: 'dressed',
    done: 'Got dressed for work',
  },
  {
    id: 'read',
    room: 'bedroom',
    label: 'Read a book',
    phases: ['evening'],
    minutes: 45,
    needs: { fun: 15 },
    stress: -6,
    done: 'Read for a while',
  },
  {
    id: 'series',
    room: 'living',
    label: 'Watch a series',
    phases: ['evening'],
    minutes: 60,
    needs: { fun: 25 },
    stress: -8,
    done: 'Watched a series',
  },
  {
    id: 'call',
    room: 'living',
    label: 'Call a friend',
    phases: ['evening'],
    minutes: 30,
    needs: { social: 35, fun: 5 },
    stress: -5,
    until: 23 * HOUR,
    done: 'Called a friend',
  },
  {
    id: 'coffee',
    room: 'kitchen',
    label: 'Make a proper coffee',
    phases: ['morning'],
    minutes: 5,
    energy: 8,
    needsItem: true,
    done: 'Made a coffee',
  },
  {
    id: 'study',
    room: 'living',
    label: 'Study for work (an hour)',
    phases: ['evening'],
    minutes: 60,
    needs: { fun: -5 },
    stress: 2,
    energy: -3,
    needsItem: true,
    skillXp: 15,
    until: 23 * HOUR,
    done: 'Studied for an hour',
  },
  {
    id: 'games',
    room: 'living',
    label: 'Play video games',
    phases: ['evening'],
    minutes: 90,
    needs: { fun: 35, social: 5 },
    stress: -6,
    energy: -4,
    needsItem: true,
    done: 'Played video games',
  },
  {
    id: 'yoga',
    room: 'bedroom',
    label: 'Stretch and do yoga',
    phases: ['evening', 'morning'],
    minutes: 25,
    needs: { fun: 5 },
    stress: -12,
    energy: 3,
    needsItem: true,
    done: 'Did some yoga',
  },
  {
    id: 'run',
    room: 'door',
    label: 'Go for a run',
    phases: ['evening', 'morning'],
    minutes: 40,
    needs: { fun: 15, hygiene: -30 },
    energy: -8,
    stress: -12,
    until: 22 * HOUR,
    done: 'Went for a run',
  },
  {
    id: 'out',
    room: 'door',
    label: 'Meet friends in town',
    phases: ['evening'],
    minutes: 150,
    cost: 2200,
    needs: { social: 50, fun: 35, hunger: 20 },
    energy: -10,
    stress: -10,
    until: 21 * HOUR + 30,
    done: 'Met friends in town',
  },
]

/** How needs fall per hour (at home; the working day is worked out when it ends). */
export const NEED_DECAY: Record<NeedId, number> = {
  hunger: 6,
  hygiene: 2.5,
  social: 2,
  fun: 3,
}

/** The alarm on workdays, and the latest the player can stay up. */
export const ALARM = 7 * HOUR
export const LATEST_BEDTIME = 26 * HOUR
/** Hours of sleep the body needs. */
export const SLEEP_NEEDED = 8

export type CommuteId = 'walk' | 'bike' | 'bus' | 'car' | 'taxi'

export interface Commute {
  id: CommuteId
  name: string
  minutes: number
  /** Each way, in pence (fares, or fuel and parking). */
  cost: number
  energy: number
  stress?: number
  /** What the journey does for needs (cycling is fun, and makes you hot). */
  needs?: Partial<Record<NeedId, number>>
  /** Something the player must own (see content/transport.ts). */
  vehicle?: 'bike' | 'car'
  description: string
}

export const COMMUTES: Commute[] = [
  {
    id: 'walk',
    name: 'Walk',
    minutes: 40,
    cost: 0,
    energy: -4,
    description: 'Free, and some fresh air on the way.',
  },
  {
    id: 'bike',
    name: 'Bike',
    minutes: 20,
    cost: 0,
    energy: -2,
    stress: -3,
    needs: { fun: 5, hygiene: -12 },
    vehicle: 'bike',
    description: 'Free and quick, and good for you; you arrive a little warm.',
  },
  {
    id: 'bus',
    name: 'Bus',
    minutes: 25,
    cost: 250,
    energy: 0,
    description: 'Cheap and reliable.',
  },
  {
    id: 'car',
    name: 'Car',
    minutes: 15,
    cost: 450,
    energy: 0,
    stress: 3,
    vehicle: 'car',
    description: 'Quick and dry, but fuel and parking add up, and so does the traffic.',
  },
  {
    id: 'taxi',
    name: 'Taxi',
    minutes: 12,
    cost: 1400,
    energy: 0,
    description: 'Quick, but dear.',
  },
]

/** Weekly take-home pay by career level (first level first), in pence. */
export const WEEKLY_PAY = [38000, 46000, 56000, 68000, 82000, 98000]

/** Weekly rent for the flat, in pence, taken each Monday morning. */
export const WEEKLY_RENT = 16000

/** Money and food at the start of a new life. */
export const STARTING_MONEY = 30000
export const STARTING_FOOD = 4

export function formatMoney(pence: number): string {
  const sign = pence < 0 ? '−' : ''
  return `${sign}£${(Math.abs(pence) / 100).toFixed(2)}`
}
