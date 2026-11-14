/**
 * The neighbourhood around the player's home: one main street with a café, a
 * food shop, a gym and a park, the player's building, and the road to the
 * office. Where things are (in metres-ish scene units), when they are open, and
 * what the player can do inside. Times are minutes; money is in pence.
 */
import { activeEmployer } from './departments'
import type { LifeAction } from './life'

export type PlaceId = 'home' | 'office' | 'cafe' | 'shop' | 'gym' | 'park' | 'garage'

export interface Place {
  id: PlaceId
  name: string
  /** What kind of place it is, in a few words. */
  kind: string
  description: string
  /** The door, on the edge of the street (x, z). */
  door: [number, number]
  /** Open from and until (minutes since midnight; past 24:00 is after midnight), or always. */
  open: [number, number] | null
  /** The colour it is known by (its awning, sign or front). */
  colour: string
}

const HOUR = 60

export const PLACES: Place[] = [
  {
    id: 'home',
    name: 'Home',
    kind: 'Your building',
    description: 'Your front door, three floors up.',
    door: [-40, 8],
    open: null,
    colour: '#b45309',
  },
  {
    id: 'cafe',
    name: 'Kettle & Crumb',
    kind: 'Café',
    description: 'Coffee, cake and simple meals, with tables by the window.',
    door: [-40, -8],
    open: [7 * HOUR, 22 * HOUR],
    colour: '#be123c',
  },
  {
    id: 'shop',
    name: 'Daily Basket',
    kind: 'Food shop',
    description: 'Groceries for the week, cheaper than having them delivered.',
    door: [0, -8],
    open: [7 * HOUR, 23 * HOUR],
    colour: '#15803d',
  },
  {
    id: 'gym',
    name: 'Forge Fitness',
    kind: 'Gym',
    description: 'Weights, classes, and showers in the changing rooms.',
    door: [0, 8],
    open: [6 * HOUR, 23 * HOUR],
    colour: '#1d4ed8',
  },
  {
    id: 'park',
    name: 'Millpond Park',
    kind: 'Park',
    description: 'Paths round a pond, benches, and people walking their dogs.',
    door: [40, -8],
    open: null,
    colour: '#4d7c0f',
  },
  {
    id: 'garage',
    name: 'Cog & Kerb',
    kind: 'Bikes and car hire',
    description: 'Bikes to buy, and small cars on a weekly lease.',
    door: [-23, -8],
    open: [8 * HOUR, 20 * HOUR],
    colour: '#7c3aed',
  },
  {
    id: 'office',
    // Named for the player's own workplace: the hospital, the law firm, …
    get name() {
      return activeEmployer().shortName
    },
    kind: 'The road to work',
    get description() {
      return `The way to work: ${activeEmployer().name}.`
    },
    door: [62, 8],
    open: null,
    colour: '#475569',
  },
]

export function getPlace(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id)
}

/** Why a place is closed at this minute, or null if it is open. */
export function closedReason(place: Place, minute: number): string | null {
  if (!place.open) return null
  const [from, until] = place.open
  if (minute < from) return `${place.name} opens at ${clock(from)}.`
  if (minute >= until) return `${place.name} closed at ${clock(until)}.`
  return null
}

const clock = (minute: number) =>
  `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`

/** Walking speed in scene units a minute (the street is about 130 units long). */
export const WALK_UNITS_A_MINUTE = 9

/** Things to do inside the places in the neighbourhood. */
export interface PlaceAction extends LifeAction {
  place: Exclude<PlaceId, 'home' | 'office' | 'garage'>
}

export const PLACE_ACTIONS: PlaceAction[] = [
  {
    id: 'cafe-breakfast',
    place: 'cafe',
    label: 'Breakfast at the café',
    phases: ['morning'],
    minutes: 20,
    cost: 650,
    needs: { hunger: 50, social: 5 },
    energy: 6,
    marks: 'ate',
    done: 'Had breakfast at Kettle & Crumb',
  },
  {
    id: 'cafe-coffee',
    place: 'cafe',
    label: 'Coffee and a slice of cake',
    phases: ['evening', 'morning'],
    minutes: 25,
    cost: 480,
    needs: { fun: 10, social: 8, hunger: 10 },
    energy: 5,
    until: 21 * HOUR + 45,
    done: 'Had a coffee and cake at Kettle & Crumb',
  },
  {
    id: 'cafe-dinner',
    place: 'cafe',
    label: 'Dinner at the café',
    phases: ['evening'],
    minutes: 50,
    cost: 1350,
    needs: { hunger: 55, fun: 12, social: 10 },
    stress: -4,
    marks: 'ate',
    until: 21 * HOUR + 45,
    done: 'Had dinner at Kettle & Crumb',
  },
  {
    id: 'shop-groceries',
    place: 'shop',
    label: 'Buy a week of groceries (7 meals)',
    phases: ['evening', 'morning'],
    minutes: 25,
    cost: 2400,
    food: -7,
    done: 'Bought groceries for the week',
  },
  {
    id: 'shop-meal',
    place: 'shop',
    label: 'Buy a ready meal for the fridge',
    phases: ['evening', 'morning'],
    minutes: 5,
    cost: 420,
    food: -1,
    done: 'Bought a ready meal',
  },
  {
    id: 'gym-workout',
    place: 'gym',
    label: 'Work out (day pass)',
    phases: ['evening', 'morning'],
    minutes: 60,
    cost: 700,
    needs: { fun: 15, hygiene: -40 },
    energy: -6,
    stress: -15,
    done: 'Worked out at Forge Fitness',
  },
  {
    id: 'gym-class',
    place: 'gym',
    label: 'Join a fitness class',
    phases: ['evening'],
    minutes: 45,
    cost: 900,
    needs: { fun: 20, social: 15, hygiene: -35 },
    energy: -5,
    stress: -12,
    until: 21 * HOUR,
    done: 'Did a fitness class',
  },
  {
    id: 'gym-shower',
    place: 'gym',
    label: 'Shower in the changing rooms',
    phases: ['evening', 'morning'],
    minutes: 15,
    needs: { hygiene: 100 },
    energy: 2,
    marks: 'showered',
    done: 'Showered at the gym',
  },
  {
    id: 'park-walk',
    place: 'park',
    label: 'Walk round the pond',
    phases: ['evening', 'morning'],
    minutes: 30,
    needs: { fun: 10 },
    energy: 2,
    stress: -10,
    done: 'Walked round Millpond Park',
  },
  {
    id: 'park-run',
    place: 'park',
    label: 'Run a few laps',
    phases: ['evening', 'morning'],
    minutes: 35,
    needs: { fun: 15, hygiene: -30 },
    energy: -6,
    stress: -14,
    until: 22 * HOUR,
    done: 'Ran laps of Millpond Park',
  },
  {
    id: 'park-bench',
    place: 'park',
    label: 'Sit on a bench and watch the world go by',
    phases: ['evening', 'morning'],
    minutes: 20,
    needs: { fun: 6, social: 4 },
    stress: -6,
    done: 'Sat by the pond for a while',
  },
]
