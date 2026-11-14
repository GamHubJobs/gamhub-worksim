import { describe, expect, it } from 'vitest'
import { overShoulder } from './overShoulder'

describe('the camera over the shoulder, on a tool used where it is', () => {
  it('stands behind and above the player, looking ahead of them', () => {
    // Facing −z (heading 0): the camera is behind (+z), the look point ahead (−z).
    const v = overShoulder({ x: 1, z: 2, heading: 0 })
    expect(v.from[2]).toBeGreaterThan(2)
    expect(v.looks[2]).toBeLessThan(2)
    expect(v.from[1]).toBeGreaterThan(v.looks[1])
    // The look point is to the right, so the thing sits left of the frame.
    expect(v.looks[0]).toBeGreaterThan(1)
  })

  it('turns with the player', () => {
    // Facing +x (heading −π/2): behind is −x, ahead is +x.
    const v = overShoulder({ x: 0, z: 0, heading: -Math.PI / 2 })
    expect(v.from[0]).toBeLessThan(0)
    expect(v.looks[0]).toBeGreaterThan(0)
  })
})
