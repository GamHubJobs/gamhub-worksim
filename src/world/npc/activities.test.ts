import { describe, expect, it } from 'vitest'
import { CAFE_PLACES, SHOP_PLACES } from '../../city/scene/interiors/customerPlaces'
import { OFFICE_PLACES } from '../../office/scene/officeCast'
import type { Anchor } from '../anchors'
import {
  armTo,
  BODY,
  handAt,
  hipHeight,
  seatOn,
  shoulderOf,
  sitting,
} from '../character/fit'
import { ARMS_ONLY, clipFrame, SIT, type RigFrame } from '../character/rig'
import {
  ACTIVITIES,
  activityFrame,
  fitToWorld,
  holdsFor,
  resolvePlace,
} from './activities'
import type { Place } from './schedule'

const seat = (id: string, x: number, z: number, top = 0.51, heading = 0): Anchor => ({
  id,
  kind: 'seat',
  x,
  y: top,
  z,
  heading,
  top,
})
const keyboard: Anchor = {
  id: 'k',
  kind: 'keyboard',
  x: 0,
  y: 0.784,
  z: -0.6,
  heading: 0,
}
const place = (p: Partial<Place>): Place => ({
  x: 0,
  z: 0,
  heading: 0,
  clip: 'stand',
  label: '',
  ...p,
})

/** Where the soles of the shoes are, from a pose (forward kinematics of the leg). */
function soles(f: RigFrame) {
  const hip = hipHeight(f)
  const knee = hip - BODY.thigh * Math.cos(f.hipL)
  return knee - BODY.shin * Math.cos(f.hipL + f.kneeL)
}

describe('sitting on real seats', () => {
  it('the hips rest on the cushion and the feet on the floor, whatever the seat height', () => {
    for (const top of [0.42, 0.45, 0.475, 0.51, 0.55]) {
      const f = seatOn(SIT, top)
      expect(hipHeight(f)).toBeCloseTo(top + BODY.seatContact, 5)
      expect(Math.abs(soles(f))).toBeLessThan(0.01)
    }
  })

  it('the old fixed seated height sank people into an office chair', () => {
    // Hips at 0.49 m: the thigh's underside 0.40 m, a cushion at 0.51 m.
    expect(BODY.hipSeated - BODY.seatContact).toBeLessThan(0.51 - 0.08)
  })

  it('sitting down and standing up go smoothly from one to the other', () => {
    const seated = seatOn(clipFrame('type', 0, 'seated'), 0.51)
    expect(hipHeight(sitting(seated, 0))).toBeCloseTo(BODY.hipStanding, 5)
    expect(hipHeight(sitting(seated, 1))).toBeCloseTo(0.51 + BODY.seatContact, 5)
    let last = hipHeight(sitting(seated, 0))
    for (let k = 0.1; k <= 1; k += 0.1) {
      const h = hipHeight(sitting(seated, k))
      expect(h).toBeLessThanOrEqual(last + 1e-9)
      last = h
    }
  })
})

describe('postures: reading at a standing desk is done standing', () => {
  it('every arms-only clip can be done standing (hips at full height) or seated', () => {
    for (const clip of ARMS_ONLY) {
      expect(clipFrame(clip, 1, 'standing').seated, clip).toBe(false)
      expect(hipHeight(clipFrame(clip, 1, 'standing'))).toBeCloseTo(BODY.hipStanding, 5)
      expect(clipFrame(clip, 1, 'seated').seated, clip).toBe(true)
    }
  })
})

describe('hands on what they use', () => {
  it('the arm is solved as two bones: the hand ends where it was sent', () => {
    for (const [forward, down, lean] of [
      [0.4, 0.25, 0.1],
      [0.3, 0.45, 0],
      [0.45, 0.05, 0.2],
    ]) {
      const { shoulder, elbow } = armTo(forward, down, lean)
      const hand = handAt(shoulder, elbow, lean)
      expect(hand.forward).toBeCloseTo(forward, 4)
      expect(hand.down).toBeCloseTo(down, 4)
    }
  })

  it('typing: seated on the chair, both hands on the keys of the keyboard', () => {
    const at = resolvePlace(place({ seated: true, clip: 'type' }), [
      seat('s', 0, 0),
      keyboard,
    ])
    expect(at.clips).toEqual(['type'])
    const f = activityFrame('type', 0, at, at.targets.type)
    const s = shoulderOf(f)
    for (const [sh, el] of [
      [f.shoulderL[0], f.elbowL],
      [f.shoulderR[0], f.elbowR],
    ]) {
      const hand = handAt(sh, el, f.lean)
      // Within a few centimetres of the keys (the fingers move a little).
      expect(Math.abs(s.forward + hand.forward - 0.6)).toBeLessThan(0.04)
      expect(Math.abs(s.y - hand.down - (keyboard.y + 0.03))).toBeLessThan(0.04)
    }
  })
})

describe('activities are checked against what is really there', () => {
  it('a seated place uses the nearest free seat, and faces the way it faces', () => {
    const r = resolvePlace(place({ seated: true, x: 0.1, clip: 'sit' }), [
      seat('far', 2, 0),
      seat('near', 0.2, 0.1, 0.48, 0.5),
    ])
    expect(r.seat?.id).toBe('near')
    expect(r).toMatchObject({ x: 0.2, z: 0.1, heading: 0.5 })
    // Someone else's seat is not taken.
    const taken = resolvePlace(
      place({ seated: true, clip: 'sit' }),
      [seat('near', 0.2, 0.1)],
      new Set(['near']),
    )
    expect(taken.seat).toBeNull()
  })

  it('no seat: nothing seated is done (no sitting on air), and they stand', () => {
    const r = resolvePlace(place({ seated: true, clip: 'sit-relax', also: ['read'] }), [])
    expect(r.seat).toBeNull()
    expect(r.clips).toEqual(['read'])
    expect(r.rejected).toEqual([{ clip: 'sit-relax', why: 'no seat here' }])
    expect(hipHeight(activityFrame('read', 0, r))).toBeCloseTo(BODY.hipStanding, 5)
  })

  it('no keyboard: no typing; no shelf or printer: no reaching', () => {
    const r = resolvePlace(place({ seated: true, clip: 'type', also: ['read'] }), [
      seat('s', 0, 0),
    ])
    expect(r.clips).toEqual(['read'])
    expect(r.rejected[0]).toMatchObject({ clip: 'type' })
    const reach = resolvePlace(place({ clip: 'reach' }), [])
    expect(reach.clips).toEqual(['stand'])
  })

  it('what is held matches what is done (and what it is done with)', () => {
    expect(holdsFor('phone')).toEqual({ right: 'phone' })
    expect(holdsFor('read')).toEqual({ left: 'document' })
    expect(holdsFor('write')).toEqual({ left: 'clipboard', right: 'pen' })
    expect(holdsFor('drink')).toEqual({ right: 'cup' })
    expect(holdsFor('reach', { ...keyboard, kind: 'plant' })).toEqual({
      right: 'watering-can',
    })
    expect(
      holdsFor('reach', { ...keyboard, kind: 'shelf', carry: { left: 'basket' } }),
    ).toEqual({ left: 'basket' })
  })

  it('the player, too: on the seat under them, hands on the keyboard', () => {
    const f = fitToWorld(clipFrame('type', 0), 'type', 0, { x: 0, z: 0, heading: 0 }, [
      seat('s', 0.1, 0),
      keyboard,
    ])
    expect(hipHeight(f)).toBeCloseTo(0.51 + BODY.seatContact, 5)
    // Standing, or nothing to sit on: left as it is.
    const stand = clipFrame('stand', 0)
    expect(fitToWorld(stand, 'stand', 0, { x: 0, z: 0, heading: 0 }, [])).toBe(stand)
  })

  it('every activity the places of the world ask for is one people can do, in its posture', () => {
    for (const [name, places] of Object.entries({
      office: OFFICE_PLACES,
      cafe: CAFE_PLACES,
      shop: SHOP_PLACES,
    }))
      for (const [id, p] of Object.entries(places))
        for (const clip of [p.clip, ...(p.also ?? [])]) {
          const spec = ACTIVITIES[clip]
          expect(spec, `${name} ${id}: ${clip}`).toBeDefined()
          if (spec!.posture === 'seated')
            expect(p.seated, `${name} ${id}: ${clip}`).toBe(true)
          if (spec!.posture === 'standing')
            expect(!!p.seated, `${name} ${id}: ${clip}`).toBe(false)
        }
  })
})
