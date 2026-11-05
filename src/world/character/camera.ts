/**
 * The third-person camera: behind and above the character, turned by the
 * mouse (or the arrow keys), zoomed with the wheel, and pulled in when a wall
 * or anything solid would come between it and the character. Pure.
 */
import type { Box } from './controller'

export interface Orbit {
  /** Around the character (0 looks along -z). */
  yaw: number
  /** Down onto the character: 0.05 nearly level … 1.2 from above. */
  pitch: number
  /** How far back, metres. */
  distance: number
}

export const ORBIT_LIMITS = {
  minPitch: 0.05,
  maxPitch: 1.15,
  minDistance: 1.6,
  maxDistance: 7,
}

export function clampOrbit(o: Orbit): Orbit {
  return {
    yaw: o.yaw,
    pitch: Math.min(ORBIT_LIMITS.maxPitch, Math.max(ORBIT_LIMITS.minPitch, o.pitch)),
    distance: Math.min(
      ORBIT_LIMITS.maxDistance,
      Math.max(ORBIT_LIMITS.minDistance, o.distance),
    ),
  }
}

/** Where a ray from `from` towards `to` first enters a box, as a fraction (1 = clear). */
export function rayBox(
  from: [number, number, number],
  to: [number, number, number],
  b: Box,
): number {
  let t0 = 0
  let t1 = 1
  const lo = [b.x - b.hx, 0, b.z - b.hz]
  const hi = [b.x + b.hx, b.top, b.z + b.hz]
  for (let axis = 0; axis < 3; axis++) {
    const d = to[axis] - from[axis]
    if (Math.abs(d) < 1e-9) {
      if (from[axis] < lo[axis] || from[axis] > hi[axis]) return 1
      continue
    }
    let a = (lo[axis] - from[axis]) / d
    let c = (hi[axis] - from[axis]) / d
    if (a > c) [a, c] = [c, a]
    t0 = Math.max(t0, a)
    t1 = Math.min(t1, c)
    if (t0 > t1) return 1
  }
  return t0 > 0 ? t0 : 1
}

/**
 * The camera's position for a target (the character's head), kept clear of
 * solid boxes and below a ceiling (if there is one).
 */
export function cameraAt(
  target: [number, number, number],
  orbit: Orbit,
  boxes: Box[],
  ceiling = Infinity,
): [number, number, number] {
  const { yaw, pitch, distance } = orbit
  const back: [number, number, number] = [
    target[0] + Math.sin(yaw) * Math.cos(pitch) * distance,
    target[1] + Math.sin(pitch) * distance,
    target[2] + Math.cos(yaw) * Math.cos(pitch) * distance,
  ]
  let k = 1
  for (const b of boxes) k = Math.min(k, rayBox(target, back, b))
  // Stop a little short of whatever is in the way.
  const pull = k < 1 ? Math.max(0.15, k - 0.12 / distance) : 1
  const out: [number, number, number] = [
    target[0] + (back[0] - target[0]) * pull,
    target[1] + (back[1] - target[1]) * pull,
    target[2] + (back[2] - target[2]) * pull,
  ]
  out[1] = Math.min(out[1], ceiling - 0.15)
  return out
}
