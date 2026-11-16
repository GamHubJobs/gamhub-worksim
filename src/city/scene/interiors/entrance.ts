/**
 * The front door of a place in the neighbourhood (every room has it on its
 * street side, the +z wall: see common.tsx), and walking through it: in from the
 * street (the player appears in the doorway and walks on in, the way they were
 * going) and back out (to the door, it opens, through it), so going in and out
 * is walked, not a jump. The street does the same on its side (CityScene).
 */
import type { Activity } from '../../../world/interaction/activity'

/** Along the street wall. */
export const ENTRANCE = { x: 1.25 }

/** Facing into the room (-z), and out of it (+z). */
const IN = 0
const OUT = Math.PI

/** Where the player is as they come in: in the doorway, facing in. */
export function arriveAt(depth: number): { x: number; z: number; heading: number } {
  return { x: ENTRANCE.x, z: depth / 2 + 0.35, heading: IN }
}

/** Going back out to the street: to the door, it opens, through it. */
export function leaveActivity(depth: number): Activity {
  const wall = depth / 2
  return {
    id: 'leave',
    action: 'leave',
    prompt: 'go back out to the street',
    spot: { x: ENTRANCE.x, z: wall - 0.9, reach: 1.1 },
    anchor: { x: ENTRANCE.x, z: wall - 0.6, heading: OUT },
    stages: [
      { clip: 'push-door', seconds: 0.7, label: 'Opening the door' },
      {
        clip: 'stand',
        seconds: 0.1,
        label: 'Going out',
        at: { x: ENTRANCE.x, z: wall + 0.7, heading: OUT },
        through: true,
      },
    ],
    sounds: [{ at: 0.2, id: 'door' }],
  }
}
