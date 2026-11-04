/**
 * Friends outside work: who they are, what they like doing, and the plans
 * they invite the player to. Times are minutes since midnight; money in
 * pence; needs 0–100.
 */
import type { NeedId } from './life'

export type PlanKind = 'dinner' | 'film' | 'run' | 'quiz' | 'drinks' | 'game'

export interface Friend {
  id: string
  name: string
  /** How the player knows them. */
  relation: string
  initials: string
  colour: string
  /** Plans they suggest, in the order they rotate through. */
  likes: PlanKind[]
}

export const FRIENDS: Friend[] = [
  {
    id: 'leo',
    name: 'Leo Martins',
    relation: 'Friend from university',
    initials: 'LM',
    colour: '#2563eb',
    likes: ['game', 'quiz', 'drinks'],
  },
  {
    id: 'aisha',
    name: 'Aisha Rahman',
    relation: 'Your neighbour',
    initials: 'AR',
    colour: '#c2410c',
    likes: ['dinner', 'film'],
  },
  {
    id: 'dan',
    name: 'Dan O’Neill',
    relation: 'From the running club',
    initials: 'DO',
    colour: '#15803d',
    likes: ['run', 'drinks'],
  },
  {
    id: 'mei',
    name: 'Mei Chen',
    relation: 'From the book club',
    initials: 'MC',
    colour: '#7c3aed',
    likes: ['quiz', 'film', 'dinner'],
  },
]

export interface Plan {
  kind: PlanKind
  title: string
  /** The invitation, from the friend (first name is filled in). */
  invite: string
  /** When it starts (home clock). */
  at: number
  minutes: number
  cost: number
  needs: Partial<Record<NeedId, number>>
  energy?: number
  stress?: number
  /** Needs a piece of furniture the player owns (e.g. a games console). */
  needsItem?: string
}

const HOUR = 60

export const PLANS: Record<PlanKind, Plan> = {
  dinner: {
    kind: 'dinner',
    title: 'Dinner at their place',
    invite: 'I’m making a curry tonight, far too much of it. Come over at 7:30?',
    at: 19 * HOUR + 30,
    minutes: 120,
    cost: 0,
    needs: { hunger: 55, social: 40, fun: 20 },
    stress: -8,
  },
  film: {
    kind: 'film',
    title: 'The cinema',
    invite: 'There’s an 8 o’clock showing of that film everyone’s talking about. Coming?',
    at: 20 * HOUR,
    minutes: 150,
    cost: 1100,
    needs: { social: 30, fun: 40 },
    stress: -6,
  },
  run: {
    kind: 'run',
    title: 'A run by the river',
    invite: 'Easy run by the river at 7? Just 5k, I promise.',
    at: 19 * HOUR,
    minutes: 60,
    cost: 0,
    needs: { social: 25, fun: 15, hygiene: -30 },
    energy: -8,
    stress: -15,
  },
  quiz: {
    kind: 'quiz',
    title: 'Quiz night at the Anchor',
    invite: 'Quiz night at the Anchor at 8. We’re one short and you know things!',
    at: 20 * HOUR,
    minutes: 150,
    cost: 800,
    needs: { social: 40, fun: 30 },
    energy: -5,
  },
  drinks: {
    kind: 'drinks',
    title: 'A drink at the Kettle & Crown',
    invite: 'Quick drink at the Kettle & Crown at 6:30? My treat next time.',
    at: 18 * HOUR + 30,
    minutes: 90,
    cost: 1200,
    needs: { social: 35, fun: 20 },
    energy: -5,
  },
  game: {
    kind: 'game',
    title: 'An online game together',
    invite: 'Online game tonight at 9? Bring your best.',
    at: 21 * HOUR,
    minutes: 90,
    cost: 0,
    needs: { social: 20, fun: 35 },
    needsItem: 'games',
  },
}

/** Friendship points (0–100) and what they mean. */
export const FRIENDSHIP_LEVELS: Array<{ from: number; name: string }> = [
  { from: 0, name: 'Drifting apart' },
  { from: 25, name: 'Acquaintance' },
  { from: 45, name: 'Friend' },
  { from: 70, name: 'Good friend' },
  { from: 88, name: 'Close friend' },
]

export const STARTING_FRIENDSHIP = 50

export function getFriend(id: string): Friend | undefined {
  return FRIENDS.find((f) => f.id === id)
}

export function friendshipName(points: number): string {
  return [...FRIENDSHIP_LEVELS].reverse().find((l) => points >= l.from)!.name
}
