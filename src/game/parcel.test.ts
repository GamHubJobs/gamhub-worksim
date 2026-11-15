import { describe, expect, it } from 'vitest'
import { newProfileData, type ProfileData } from './career'
import { canDo, doHomeAction, getHomeAction, goHome } from './life'
import { PARCEL_AT, PARCEL_WAITS, parcelDay, parcelShown, parcelStage } from './parcel'
import { friendOf, NEIGHBOUR } from './social'
import { endDay, passTime } from './workday'

/** Home from work on the evening of a day, at a minute. */
function evening(day: number, minute: number): ProfileData {
  let p = newProfileData('Sam', 1)
  p = { ...p, work: { ...p.work, day } }
  p = goHome(endDay(passTime(p, 8 * 60 + 40, 'work')))
  return { ...p, work: { ...p.work, life: { ...p.work.life, minute } } }
}
const stage = (p: ProfileData) => parcelStage(p.work.life, p.work.day, true)
const can = (p: ProfileData, id: string) => canDo(p, getHomeAction(id)!)

describe('a parcel for next door', () => {
  it('comes on Thursday evenings at seven, and waits at the door a little while', () => {
    expect([1, 2, 3, 4, 5, 11].filter(parcelDay)).toEqual([4, 11])
    expect(stage(evening(3, PARCEL_AT))).toBe('none')
    expect(stage(evening(4, PARCEL_AT - 30))).toBe('coming')
    expect(stage(evening(4, PARCEL_AT + 1))).toBe('at-door')
    expect(stage(evening(4, PARCEL_AT + PARCEL_WAITS))).toBe('done')
    expect(parcelShown('coming', 'parcel-door')).toBe(false)
    expect(parcelShown('at-door', 'parcel-door')).toBe(true)
  })

  it('taken in at the door, then taken round: the neighbour is grateful, once', () => {
    let p = evening(4, PARCEL_AT + 2)
    expect(can(p, 'parcel-return')).toBe('You have no parcel to take round.')
    expect(can(p, 'parcel-door')).toBeNull()
    p = doHomeAction(p, 'parcel-door')
    expect(stage(p)).toBe('held')
    expect(can(p, 'parcel-door')).toBe('No one is at the door.')
    const before = friendOf(p.work.life, NEIGHBOUR).friendship
    p = doHomeAction(p, 'parcel-return')
    expect(stage(p)).toBe('done')
    expect(friendOf(p.work.life, NEIGHBOUR).friendship).toBe(before + 5)
    expect(p.work.life.social.messages.at(-1)).toMatchObject({ from: NEIGHBOUR })
    expect(p.work.life.social.messages.at(-1)?.text).toContain('taking in my parcel')
    expect(doHomeAction(p, 'parcel-return')).toBe(p)
  })
})
