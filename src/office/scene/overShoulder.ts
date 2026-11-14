/**
 * A camera over the player's shoulder, looking at what they are using: from
 * behind and above, the thing a little to the left of the middle of the view.
 */
export function overShoulder(at: { x: number; z: number; heading: number }): {
  from: [number, number, number]
  looks: [number, number, number]
} {
  const f = { x: -Math.sin(at.heading), z: -Math.cos(at.heading) }
  const r = { x: Math.cos(at.heading), z: -Math.sin(at.heading) }
  return {
    from: [at.x - f.x * 1.9 - r.x * 0.35, 2.0, at.z - f.z * 1.9 - r.z * 0.35],
    looks: [at.x + f.x * 0.8 + r.x * 1.0, 0.9, at.z + f.z * 0.8 + r.z * 1.0],
  }
}
