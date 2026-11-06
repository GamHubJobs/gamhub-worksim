/**
 * Where the people in the current place are standing (the player and
 * everyone else), so they do not walk through one another: each one puts
 * itself here as it moves, and reads the others. Only one place is shown at
 * a time, so one list serves.
 */
import type { Box } from '../character/controller'

const bodies = new Map<string, { x: number; z: number; r: number }>()

export function setBody(id: string, x: number, z: number, r: number): void {
  const b = bodies.get(id)
  if (b) {
    b.x = x
    b.z = z
    b.r = r
  } else bodies.set(id, { x, z, r })
}

export function removeBody(id: string): void {
  bodies.delete(id)
}

/** Everyone but `id`, as round solid shapes. */
export function othersThan(id: string): Box[] {
  const out: Box[] = []
  for (const [key, b] of bodies)
    if (key !== id) out.push({ x: b.x, z: b.z, hx: b.r, hz: b.r, top: 1.7, round: true })
  return out
}

/** Where someone is (the player is `player`), if shown. */
export function bodyOf(id: string): { x: number; z: number } | undefined {
  return bodies.get(id)
}
