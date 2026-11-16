/**
 * Plays a sound from a place in the 3D world, if the player is within
 * `range` metres of it: heard from that side and quieter further away (see
 * listener.ts). True if it played.
 */
import { listenerNow } from './listener'
import { audio, type EffectId } from './manager'

export function playFrom(id: EffectId, x: number, z: number, range: number): boolean {
  const ear = listenerNow()
  if (!ear.active || Math.hypot(x - ear.x, z - ear.z) > range) return false
  return audio.play(id, { at: { x, z } })
}
