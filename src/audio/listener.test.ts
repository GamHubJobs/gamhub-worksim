import { describe, expect, it } from 'vitest'
import { PerspectiveCamera } from 'three'
import { hearFrom, listenerNow, spatial } from './listener'

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

describe('hearing from a real camera', () => {
  it('reads where a three.js camera is and faces (it fills the direction in itself)', () => {
    const camera = new PerspectiveCamera()
    camera.position.set(3, 1.6, 4)
    camera.lookAt(3, 1.6, -10)
    camera.updateMatrixWorld()
    hearFrom(camera)
    const ear = listenerNow()
    expect(ear).toMatchObject({ x: 3, z: 4, active: true })
    expect(Math.abs(ear.yaw)).toBeLessThan(1e-6)
    // A sound to the camera's right is heard on the right.
    expect(spatial(8, 4).pan).toBeGreaterThan(0.5)
    hearFrom(null)
    expect(listenerNow().active).toBe(false)
  })
})
