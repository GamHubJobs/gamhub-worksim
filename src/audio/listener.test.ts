import { describe, expect, it } from 'vitest'
import { spatial } from './listener'

// Facing along -z (yaw 0), as the cameras do at rest.
const at = (x: number, z: number, yaw = 0) =>
  spatial(x, z, { x: 0, z: 0, yaw, active: true })

describe('sounds heard from where they are', () => {
  it('from the right on the right, from the left on the left', () => {
    expect(at(3, 0).pan).toBeGreaterThan(0.5)
    expect(at(-3, 0).pan).toBeLessThan(-0.5)
    expect(Math.abs(at(0, -4).pan)).toBeLessThan(0.01)
  })

  it('quieter further away, and a little quieter behind', () => {
    expect(at(0, -1).gain).toBe(1)
    expect(at(0, -10).gain).toBeLessThan(at(0, -4).gain)
    expect(at(0, 6).gain).toBeLessThan(at(0, -6).gain)
  })

  it('turning round swaps the sides', () => {
    expect(at(3, 0, Math.PI).pan).toBeLessThan(-0.5)
  })

  it('without a 3D view, in the middle at full volume', () => {
    expect(spatial(5, 5, { x: 0, z: 0, yaw: 0, active: false })).toEqual({
      pan: 0,
      gain: 1,
    })
  })
})
