import { describe, expect, it } from 'vitest'
import { getHomeAction, canDo, doHomeAction, goHome } from './life'
import { newProfileData, type ProfileData } from './career'
import { endDay, passTime } from './workday'
import {
  boilerBreaksOn,
  ENGINEER_MINUTES,
  ENGINEER_WAITS,
  REPAIR_COST,
  repairShown,
  repairStage,
} from './repair'

/** Home from work on the evening of a day. */
function evening(day: number): ProfileData {
  let p = newProfileData('Sam', 1)
  p = { ...p, work: { ...p.work, day } }
  return goHome(endDay(passTime(p, 8 * 60 + 40, 'work')))
}

const can = (p: ProfileData, id: string) => canDo(p, getHomeAction(id)!)
const later = (p: ProfileData, minutes: number): ProfileData => ({
  ...p,
  work: { ...p.work, life: { ...p.work.life, minute: p.work.life.minute + minutes } },
})

describe('the boiler breaks down now and then, and an engineer fixes it', () => {
  it('breaks on set days, never at random', () => {
    expect([1, 2, 3, 4, 5, 18, 19, 20, 34].filter(boilerBreaksOn)).toEqual([4, 19, 34])
    expect(repairStage(evening(3).work.life)).toBe('none')
    const broken = evening(4).work.life
    expect(repairStage(broken)).toBe('broken')
    expect(
      broken.log.some((l) => l.endsWith('The boiler has broken down: no hot water')),
    ).toBe(true)
  })

  it('no shower without hot water; the repair steps only while there is one', () => {
    const fine = evening(3)
    expect(can(fine, 'shower')).toBeNull()
    expect(repairShown(fine.work.life, 'repair-call')).toBe(false)
    expect(repairShown(fine.work.life, 'shower')).toBe(true)
    const p = evening(4)
    expect(can(p, 'shower')).toContain('No hot water')
    expect(repairShown(p.work.life, 'repair-call')).toBe(true)
    expect(can(p, 'repair-call')).toBeNull()
    expect(can(p, 'repair-door')).toBe('No one is at the door.')
  })

  it('called, waited for, let in, paid once, and hot water again', () => {
    let p = evening(4)
    const money = p.work.life.money
    p = doHomeAction(p, 'repair-call')
    expect(repairStage(p.work.life)).toBe('coming')
    expect(can(p, 'repair-call')).toBe('The engineer is already on the way.')
    expect(can(p, 'repair-door')).toMatch(/^On the way: about \d+ minutes\.$/)
    // Waiting lasts until the bell.
    p = doHomeAction(p, 'repair-wait')
    expect(repairStage(p.work.life)).toBe('at-door')
    p = doHomeAction(p, 'repair-door')
    expect(repairStage(p.work.life)).toBe('none')
    expect(p.work.life.money).toBe(money - REPAIR_COST)
    expect(can(p, 'shower')).toBeNull()
    expect(
      p.work.life.log.some((l) =>
        l.endsWith('The heating engineer fixed the boiler: hot water again'),
      ),
    ).toBe(true)
    // Nothing to answer, nothing paid twice.
    expect(doHomeAction(p, 'repair-door')).toBe(p)
  })

  it('if no one answers, the engineer goes, and the player books again', () => {
    let p = doHomeAction(evening(4), 'repair-call')
    p = later(p, ENGINEER_MINUTES + ENGINEER_WAITS)
    expect(repairStage(p.work.life)).toBe('broken')
    expect(can(p, 'repair-call')).toBeNull()
  })

  it('the action costs what the repair costs', () => {
    expect(getHomeAction('repair-door')!.cost).toBe(REPAIR_COST)
  })
})
