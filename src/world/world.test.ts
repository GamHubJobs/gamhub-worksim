import { describe, expect, it } from 'vitest'
import { cameraAt, clampOrbit, rayBox } from './character/camera'
import {
  NO_INPUT,
  RADIUS,
  SPEED,
  body,
  collide,
  nearest,
  step,
  turnTowards,
  walkTo,
  type Box,
} from './character/controller'
import { barDepth, clipFrame, SIT, STAND, type ClipId } from './character/rig'
import {
  effectsAt,
  heldAt,
  soundsBetween,
  stageAt,
  totalSeconds,
  type Activity,
} from './interaction/activity'

const wall: Box = { x: 0, z: -3, hx: 5, hz: 0.1, top: 3 }
const run = (
  b: ReturnType<typeof body>,
  input = NO_INPUT,
  yaw = 0,
  seconds = 1,
  boxes: Box[] = [],
) => {
  for (let i = 0; i < seconds * 60; i++) b = step(b, input, yaw, 1 / 60, boxes)
  return b
}

describe('moving the character', () => {
  it('walks forward away from the camera, faster when running', () => {
    const walked = run(body(0, 0), { ...NO_INPUT, forward: 1 })
    expect(walked.z).toBeLessThan(-1.4)
    expect(Math.abs(walked.x)).toBeLessThan(0.01)
    const ran = run(body(0, 0), { ...NO_INPUT, forward: 1, run: true })
    expect(ran.z).toBeLessThan(walked.z - 1.5)
    expect(ran.speed).toBeCloseTo(SPEED.run, 1)
  })

  it('moves relative to the camera, and faces the way it goes', () => {
    // The camera looking along +x (yaw −π/2): forward is +x.
    const b = run(body(0, 0), { ...NO_INPUT, forward: 1 }, -Math.PI / 2)
    expect(b.x).toBeGreaterThan(1.4)
    expect(Math.abs(b.z)).toBeLessThan(0.01)
    // Sideways: right of a camera looking along -z is +x.
    const side = run(body(0, 0), { ...NO_INPUT, right: 1 })
    expect(side.x).toBeGreaterThan(1.4)
    expect(side.heading).toBeCloseTo(-Math.PI / 2, 1)
  })

  it('starts and stops smoothly rather than instantly', () => {
    const first = step(body(0, 0), { ...NO_INPUT, forward: 1 }, 0, 1 / 60, [])
    expect(first.speed).toBeGreaterThan(0)
    expect(first.speed).toBeLessThan(SPEED.walk / 2)
    const moving = run(body(0, 0), { ...NO_INPUT, forward: 1 })
    const coasting = step(moving, NO_INPUT, 0, 1 / 60, [])
    expect(coasting.z).toBeLessThan(moving.z)
    expect(run(moving).speed).toBe(0)
  })

  it('cannot walk through a wall, and slides along it', () => {
    const b = run(body(0, 0), { ...NO_INPUT, forward: 1, right: 0.5 }, 0, 3, [wall])
    expect(b.z).toBeGreaterThanOrEqual(wall.z + wall.hz + RADIUS - 1e-6)
    expect(b.x).toBeGreaterThan(1)
    // From inside the wall, out by the nearer side.
    expect(collide(0, -2.95, RADIUS, [wall])[1]).toBeCloseTo(-3 + 0.1 + RADIUS)
  })

  it('jumps and lands; crouching is slower and does not jump', () => {
    const up = step(body(0, 0), { ...NO_INPUT, jump: true }, 0, 1 / 60, [])
    expect(up.grounded).toBe(false)
    expect(up.y).toBeGreaterThan(0)
    expect(run(up).grounded).toBe(true)
    const crouched = run(body(0, 0), {
      ...NO_INPUT,
      forward: 1,
      crouch: true,
      jump: true,
    })
    expect(crouched.y).toBe(0)
    expect(crouched.speed).toBeCloseTo(SPEED.crouch, 1)
  })

  it('walks itself to an activity and arrives', () => {
    let b = body(0, 0)
    let arrived = false
    for (let i = 0; i < 600 && !arrived; i++)
      ({ body: b, arrived } = walkTo(b, 2, -1, 1 / 60, []))
    expect(arrived).toBe(true)
    expect([b.x, b.z]).toEqual([2, -1])
    // The short way round: 3 to -3 radians is a small turn through π.
    const turned = turnTowards(3, -3, 10)
    expect(Math.cos(turned)).toBeCloseTo(Math.cos(-3), 5)
    expect(Math.sin(turned)).toBeCloseTo(Math.sin(-3), 5)
    expect(Math.abs(turned - 3)).toBeLessThan(0.3)
  })

  it('finds the nearest thing within reach', () => {
    const points = [
      { id: 'a', x: 1, z: 0, reach: 1.5 },
      { id: 'b', x: 0.5, z: 0, reach: 1 },
      { id: 'c', x: 5, z: 0, reach: 1 },
    ]
    expect(nearest(0, 0, points)?.id).toBe('b')
    expect(nearest(4.5, 0, points)?.id).toBe('c')
    expect(nearest(10, 0, points)).toBeNull()
  })
})

describe('the camera', () => {
  it('sits behind and above, and comes in front of a wall in the way', () => {
    const clear = cameraAt([0, 1.6, 0], { yaw: 0, pitch: 0.3, distance: 4 }, [])
    expect(clear[2]).toBeGreaterThan(3.5)
    expect(clear[1]).toBeGreaterThan(1.6)
    const behind: Box = { x: 0, z: 2, hx: 5, hz: 0.1, top: 3 }
    const blocked = cameraAt([0, 1.6, 0], { yaw: 0, pitch: 0.3, distance: 4 }, [behind])
    expect(blocked[2]).toBeLessThan(1.9)
    expect(cameraAt([0, 1.6, 0], { yaw: 0, pitch: 1, distance: 6 }, [], 3)[1]).toBe(2.85)
    expect(
      rayBox([0, 1, 0], [0, 1, 10], { x: 0, z: 5, hx: 1, hz: 1, top: 2 }),
    ).toBeCloseTo(0.4)
    expect(clampOrbit({ yaw: 0, pitch: 3, distance: 50 })).toEqual({
      yaw: 0,
      pitch: 1.15,
      distance: 7,
    })
  })
})

describe('animations', () => {
  it('every clip gives a sensible frame at any moment', () => {
    const clips: ClipId[] = [
      'stand',
      'crouch',
      'sit',
      'sit-relax',
      'type',
      'read',
      'write',
      'eat',
      'drink',
      'phone',
      'talk',
      'present',
      'reach',
      'pay',
      'cook',
      'wash-hands',
      'brush-teeth',
      'shower',
      'dress',
      'lie-down',
      'sleep',
      'bench-lie',
      'bench-press',
      'curl',
      'squat',
      'cycle',
      'stretch',
      'yoga',
      'drive',
      'push-door',
      'run-in-place',
    ]
    for (const clip of clips)
      for (const t of [0, 0.7, 3.3, 11]) {
        const f = clipFrame(clip, t)
        for (const v of [f.lean, f.hipL, f.kneeL, f.elbowR, f.y, f.pitch, ...f.shoulderR])
          expect(Number.isFinite(v), `${clip} at ${t}`).toBe(true)
      }
    expect(clipFrame('sit', 0).seated).toBe(true)
    expect(clipFrame('sleep', 0).pitch).toBeCloseTo(Math.PI / 2)
  })

  it('a bench press: lying down, the elbows bend as the bar comes down', () => {
    const top = clipFrame('bench-press', 0.001)
    const bottom = clipFrame('bench-press', 1.4)
    expect(top.pitch).toBeCloseTo(Math.PI / 2)
    expect(bottom.elbowL).toBeGreaterThan(top.elbowL + 1)
    expect(barDepth(1.4)).toBeCloseTo(1, 2)
    expect(barDepth(2.8)).toBeCloseTo(0, 5)
  })

  it('curls alternate, squats go down and up, eating lifts the hand', () => {
    expect(clipFrame('curl', 1.1).elbowL).toBeGreaterThan(clipFrame('curl', 1.1).elbowR)
    expect(clipFrame('squat', 1.3).y).toBeLessThan(-0.44)
    expect(clipFrame('squat', 0).y).toBeCloseTo(0)
    expect(clipFrame('eat', 1.6).elbowR).toBeGreaterThan(SIT.elbowR + 1)
    expect(STAND.seated).toBe(false)
  })
})

describe('activities', () => {
  const bench: Activity = {
    id: 'bench',
    action: 'gym-workout',
    prompt: 'use the bench press',
    spot: { x: 0, z: 0, reach: 1.2 },
    anchor: { x: 0, z: 0, heading: 0 },
    stages: [
      { clip: 'sit', seconds: 1 },
      { clip: 'bench-press', seconds: 5.6, label: 'Bench press' },
      { clip: 'sit', seconds: 1 },
    ],
    sounds: [{ at: 1.5, id: 'step', every: 2.8, until: 6.6 }],
    effects: [{ kind: 'sweat', from: 3, to: 7.6, at: [0, 1, 0] }],
  }

  it('plays its stages in order, and is done only at the end', () => {
    expect(totalSeconds(bench)).toBeCloseTo(7.6)
    expect(stageAt(bench, 0.5).stage.clip).toBe('sit')
    expect(stageAt(bench, 2).stage.clip).toBe('bench-press')
    expect(stageAt(bench, 2).local).toBeCloseTo(1)
    expect(stageAt(bench, 7).index).toBe(2)
    expect(stageAt(bench, 7).done).toBe(false)
    expect(stageAt(bench, 7.6).done).toBe(true)
  })

  it('sounds come once at their moments, and effects run in their window', () => {
    expect(soundsBetween(bench, 0, 1.5)).toEqual(['step'])
    expect(soundsBetween(bench, 1.5, 4.3)).toEqual(['step'])
    expect(soundsBetween(bench, 0, 7.6)).toHaveLength(2)
    expect(effectsAt(bench, 2)).toHaveLength(0)
    expect(effectsAt(bench, 4)).toHaveLength(1)
    expect(heldAt(bench, 2)).toEqual({})
  })
})
