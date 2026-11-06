/**
 * Everyone the player can talk to in the place on screen: who they are, where
 * they stand, and what they are doing (see game/encounters.ts for what they
 * say). The people of a place put themselves here as they move (the office's
 * crowd, the barista, the cashier), so any person shown is someone the player
 * can walk up to, with E or a click, and future people are included simply by
 * appearing. Only one place is shown at a time, so one list serves.
 *
 * Also who is talking to the player right now ("engaged"): they stop what they
 * are doing, turn to the player and talk, and go back to their day once the
 * conversation ends.
 */
import type { Box } from '../character/controller'
import { overlap } from '../character/controller'
import type { Availability, Who } from '../../game/encounters'

export interface Npc {
  who: Who
  x: number
  z: number
  /** Which way they face (radians; 0 faces −z). */
  heading: number
  /** How near the player must be to talk (further across a counter). */
  reach: number
  /** What they are doing now. */
  availability: Availability
  doing?: string
  /** Who they are talking with, when chatting (their id). */
  with?: string
  /** Seated (they turn their head and shoulders, not stand up). */
  seated?: boolean
}

const people = new Map<string, Npc>()

/** Puts someone in the list, or updates where they are and what they do. */
export function setNpc(entry: Npc): void {
  const was = people.get(entry.who.id)
  if (was) Object.assign(was, entry)
  else people.set(entry.who.id, { ...entry })
}

/** Gone from view (or the view is being rebuilt): a conversation with them carries on until it ends. */
export function removeNpc(id: string): void {
  people.delete(id)
}

export function npc(id: string): Npc | undefined {
  return people.get(id)
}

export function allNpcs(): Npc[] {
  return [...people.values()]
}

// ---------------------------------------------------------------------------
// Talking to the player
// ---------------------------------------------------------------------------

const engaged = new Map<string, number>()
/** How each was when the player came up (what they were doing, before stopping). */
const met = new Map<string, Npc>()

/** These people are talking to the player (stopped, turned to them). */
export function engage(ids: string[]): void {
  const now = performance.now()
  for (const id of ids)
    if (!engaged.has(id)) {
      engaged.set(id, now)
      const n = people.get(id)
      if (n) met.set(id, { ...n })
    }
}

/** Someone as they were when the player came up to them (or as they are, if not). */
export function metAs(id: string): Npc | undefined {
  return met.get(id) ?? people.get(id)
}

/** The conversation is over: everyone goes back to their day. */
export function release(): void {
  engaged.clear()
  met.clear()
}

/** Seconds since they started talking to the player, or -1 if they are not. */
export function engagedFor(id: string): number {
  const at = engaged.get(id)
  return at === undefined ? -1 : (performance.now() - at) / 1000
}

export function engagedIds(): string[] {
  return [...engaged.keys()]
}

// A click on someone: the page walks the player over.
let listener: ((id: string) => void) | null = null

export function onTalkRequest(fn: (id: string) => void): () => void {
  listener = fn
  return () => {
    if (listener === fn) listener = null
  }
}

export function requestTalk(id: string): void {
  listener?.(id)
}

// ---------------------------------------------------------------------------
// Where to stand, and whether they can be seen
// ---------------------------------------------------------------------------

/** How far from someone the player stands to talk. */
export const TALK_DISTANCE = 0.95

/** Where the player stands to talk to someone (on the player's side), facing them. */
export function approachPoint(
  n: Pick<Npc, 'x' | 'z' | 'reach'>,
  from: { x: number; z: number },
): { x: number; z: number; heading: number } {
  const dx = from.x - n.x
  const dz = from.z - n.z
  const d = Math.hypot(dx, dz) || 1
  // Across a counter (someone with a long reach), as near as the counter lets the player be.
  const keep = n.reach > 1.8 ? n.reach - 0.2 : TALK_DISTANCE
  const x = n.x + (dx / d) * keep
  const z = n.z + (dz / d) * keep
  return { x, z, heading: Math.atan2(-(n.x - x), -(n.z - z)) }
}

/** Things at least this tall block the view (a desk or a counter does not). */
const SIGHT = 1.5

/** Whether nothing tall (a wall, a shelf) stands between two points. */
export function canSee(
  a: { x: number; z: number },
  b: { x: number; z: number },
  tall: Box[],
): boolean {
  const d = Math.hypot(b.x - a.x, b.z - a.z)
  // Not the last stretch: the person may stand against a shelf or a wall.
  const steps = Math.ceil(Math.max(0, d - 0.35) / 0.12)
  for (let i = 1; i <= steps; i++) {
    const t = (i * 0.12) / d
    const x = a.x + (b.x - a.x) * t
    const z = a.z + (b.z - a.z) * t
    for (const box of tall) if (box.top >= SIGHT && overlap(x, z, 0.01, box)) return false
  }
  return true
}

/** The nearest person the player can talk to from here: near enough and in sight. */
export function nearestNpc(
  x: number,
  z: number,
  tall: Box[],
): { npc: Npc; distance: number } | null {
  let best: { npc: Npc; distance: number } | null = null
  for (const n of people.values()) {
    const d = Math.hypot(n.x - x, n.z - z)
    if (d > n.reach || (best && d >= best.distance)) continue
    if (!canSee({ x, z }, n, tall)) continue
    best = { npc: n, distance: d }
  }
  return best
}

/** "Talk to Leila (Accounts assistant)". */
export function talkPrompt(n: Npc): string {
  return `talk to ${n.who.name.split(' ')[0]} (${n.who.role})`
}

// In development, browser tests can see who is here and ask to talk to someone.
if (import.meta.env.DEV && typeof window !== 'undefined')
  Object.assign(window, {
    __worksimPeople: () =>
      allNpcs().map((n) => ({
        id: n.who.id,
        name: n.who.name,
        kind: n.who.kind,
        availability: n.availability,
        x: n.x,
        z: n.z,
        heading: n.heading,
        talking: engagedFor(n.who.id) >= 0,
      })),
    __worksimTalk: requestTalk,
  })
