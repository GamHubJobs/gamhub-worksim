/**
 * A moment of affection between the player and someone (see game/dates.ts):
 * holding hands at the table or on the bench, then, saying goodnight, a hug
 * or a kiss standing face to face (or a wave). Only ever after they said yes.
 * Both characters read it: the player's character (PlayerRig) and theirs
 * (DatePartner), so the two move together.
 */
import type { ClipId } from '../character/rig'

export type MomentKind = 'hands' | 'kiss' | 'hug' | 'wave' | 'dance'

export interface Moment {
  kind: MomentKind
  /** Who with (their id). */
  with: string
  /** Where: at the café table, or on the park bench. */
  place: 'cafe' | 'park'
  /** When it started (performance.now()), and how long it lasts (seconds). */
  at: number
  seconds: number
}

let current: Moment | null = null

/** Starts a moment now, or (waiting) when the player gets there (see beginMoment). */
export function startMoment(m: Omit<Moment, 'at'>, waiting = false): void {
  current = { ...m, at: waiting ? Infinity : performance.now() }
}

/** The player has arrived: a waiting moment starts now. */
export function beginMoment(): void {
  if (current && current.at === Infinity) current = { ...current, at: performance.now() }
}

export function endMoment(): void {
  current = null
}

/** The moment now (and how far in, seconds), if it has not finished. */
export function momentNow(): { moment: Moment; t: number } | null {
  if (!current) return null
  // Waiting for the player: at the start.
  const t = current.at === Infinity ? 0 : (performance.now() - current.at) / 1000
  if (t > current.seconds) {
    // Holding hands carries on until the next moment; the others end.
    if (current.kind !== 'hands') {
      current = null
      return null
    }
  }
  return { moment: current, t }
}

/** Standing to say goodnight (beside the table, or in front of the bench). */
export const standing = (k: MomentKind) => k !== 'hands'

/** What each of them does in a moment: the player, and the other person. */
export function momentClips(m: Moment): { player: ClipId; partner: ClipId } {
  switch (m.kind) {
    case 'hands':
      return m.place === 'cafe'
        ? { player: 'hold-hands-across', partner: 'hold-hands-across' }
        : // On the bench the other person sits on the player's right.
          { player: 'hold-hands-right', partner: 'hold-hands-left' }
    case 'kiss':
      return { player: 'kiss', partner: 'kiss' }
    case 'hug':
      return { player: 'hug', partner: 'hug' }
    case 'dance':
      return { player: 'dance', partner: 'dance' }
    case 'wave':
      return { player: 'wave', partner: 'wave' }
  }
}

/**
 * Where the two stand to say goodnight, face to face: beside the café's
 * window table, or in front of the park bench. [player, partner], each with
 * the way they face.
 */
export function goodnightSpots(place: 'cafe' | 'park') {
  // Clear of the table (centre −3, 1.6) and in front of the bench (−3.4, 2.2).
  const y = place === 'cafe' ? 1.6 : 1.3
  const x = place === 'cafe' ? -4.6 : -3.7
  return {
    player: { x, z: y, heading: -Math.PI / 2 },
    // Close: a hug or a kiss is at arm’s length or less.
    partner: { x: x + 0.5, z: y, heading: Math.PI / 2 },
  }
}
