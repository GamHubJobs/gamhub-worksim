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
  // Into the box's own frame (it may be turned; a round thing is taken as its square).
  if (b.yaw) {
    const c = Math.cos(b.yaw)
    const s = Math.sin(b.yaw)
    const local = (p: [number, number, number]): [number, number, number] => {
      const wx = p[0] - b.x
      const wz = p[2] - b.z
      return [b.x + wx * c - wz * s, p[1], b.z + wx * s + wz * c]
    }
    return rayBox(local(from), local(to), { ...b, yaw: 0 })
  }
  let t0 = 0
  let t1 = 1
  const hz = b.round ? b.hx : b.hz
  const lo = [b.x - b.hx, 0, b.z - hz]
  const hi = [b.x + b.hx, b.top, b.z + hz]
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
  // In a tight spot the camera rises to look down rather than squash up against
  // the character (rooms without a ceiling, like the cutaway home).
  // Under a ceiling, rising does not help: the camera just comes in closer.
  if (Number.isFinite(ceiling)) return place(target, orbit, boxes, ceiling).at
  // Rise until most of the chosen distance is kept: settling 1.5 m behind the
  // head in a small room leaves the character filling the view.
  const near = Math.min(orbit.distance, Math.max(1.5, orbit.distance * 0.75))
  let best: { at: [number, number, number]; clear: number } | null = null
  const from = Number.isFinite(orbit.pitch) ? orbit.pitch : 0.3
  for (let i = 0; i < 12; i++) {
    const pitch = from + i * 0.12
    if (pitch > 1.35) break
    const { at, clear } = place(target, { ...orbit, pitch }, boxes, ceiling)
    if (!best || clear > best.clear) best = { at, clear }
    if (clear >= near) return at
  }
  return best ? best.at : place(target, orbit, boxes, ceiling).at
}

/** How far the camera can be from the target, at this orbit, before something is in the way. */
export function clearance(
  target: [number, number, number],
  orbit: Orbit,
  boxes: Box[],
): number {
  return place(target, orbit, boxes, Infinity).clear
}

function place(
  target: [number, number, number],
  orbit: Orbit,
  boxes: Box[],
  ceiling: number,
): { at: [number, number, number]; clear: number } {
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
  // A ceiling caps the height (and then the camera cannot rise past it).
  const capped = out[1] > ceiling - 0.15
  out[1] = Math.min(out[1], ceiling - 0.15)
  return { at: out, clear: capped ? pull * distance * 0.6 : pull * distance }
}
