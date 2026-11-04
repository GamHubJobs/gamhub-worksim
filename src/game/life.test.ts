import { describe, expect, it } from 'vitest'
import { WEEKLY_PAY, WEEKLY_RENT } from '../content/life'
import { HOURS } from '../content/workday'
import { WorkStateSchema } from '../persistence/schemas'
import { newProfileData, type ProfileData } from './career'
import {
  arrivalFor,
  canDo,
  doHomeAction,
  getHomeAction,
  goHome,
  goToBed,
  leaveForWork,
  lifePhase,
  sleepHours,
} from './life'
import { endDay, passTime } from './workday'

/** A player who has just finished a full working day. */
function afterWork(day = 1): ProfileData {
  let p = newProfileData('Sam', 1)
  p = { ...p, work: { ...p.work, day } }
  p = passTime(p, 8 * 60 + 40, 'work')
  return endDay(p)
}

const act = (p: ProfileData, ...ids: string[]) =>
  ids.reduce((profile, id) => doHomeAction(profile, id), p)

describe('a day of life', () => {
  it('starts at work, and older saves start it on their next evening', () => {
    const fresh = newProfileData('Sam', 1)
    expect(lifePhase(fresh)).toBe('work')
    const { life, ...old } = fresh.work
    expect(life).toBeDefined()
    expect(WorkStateSchema.parse(old).life).toEqual(fresh.work.life)
  })

  it('goes home after work, with the fare paid and needs lowered by the day', () => {
    const home = goHome(afterWork())
    expect(lifePhase(home)).toBe('evening')
    expect(home.work.life.minute).toBeGreaterThan(17 * 60)
    expect(home.work.life.money).toBe(30000 - 250)
    expect(home.work.life.needs.fun).toBeLessThan(70)
    expect(home.work.life.ledger.at(-1)).toMatchObject({ text: 'Bus home', amount: -250 })
  })

  it('pays a week’s salary on Friday, once', () => {
    const friday = goHome(afterWork(5))
    expect(friday.work.life.money).toBe(30000 - 250 + WEEKLY_PAY[0])
    expect(friday.work.life.paidWeek).toBe(1)
  })

  it('home actions take time, cost money, use food and change needs', () => {
    const home = goHome(afterWork())
    const fed = act(home, 'cook')
    expect(fed.work.life.food).toBe(3)
    expect(fed.work.life.needs.hunger).toBeGreaterThan(home.work.life.needs.hunger)
    expect(fed.work.life.minute).toBe(home.work.life.minute + 35)
    const out = act(home, 'out')
    expect(out.work.life.money).toBe(home.work.life.money - 2200)
    expect(out.work.life.needs.social).toBeGreaterThan(home.work.life.needs.social)
  })

  it('explains what cannot be done', () => {
    const home = goHome(afterWork())
    expect(canDo(home, getHomeAction('dress')!)).toBe('Not now: it is the evening.')
    const empty = {
      ...home,
      work: { ...home.work, life: { ...home.work.life, food: 0 } },
    }
    expect(canDo(empty, getHomeAction('cook')!)).toContain('no food')
    const broke = {
      ...home,
      work: { ...home.work, life: { ...home.work.life, money: 100 } },
    }
    expect(canDo(broke, getHomeAction('takeaway')!)).toContain('cannot afford')
    const late = {
      ...home,
      work: { ...home.work, life: { ...home.work.life, minute: 22 * 60 } },
    }
    expect(canDo(late, getHomeAction('out')!)).toContain('Too late')
  })

  it('a good evening and morning make a good start at work', () => {
    let p = act(goHome(afterWork()), 'cook', 'series', 'call')
    p = { ...p, work: { ...p.work, life: { ...p.work.life, minute: 22 * 60 + 30 } } }
    p = goToBed(p)
    expect(lifePhase(p)).toBe('morning')
    expect(p.work.life.minute).toBe(7 * 60)
    p = act(p, 'shower', 'breakfast', 'dress')
    const arrival = arrivalFor(p, 'bus')
    expect(arrival.late).toBe(0)
    const atWork = leaveForWork(p, 'bus')
    expect(lifePhase(atWork)).toBe('work')
    expect(atWork.work.day).toBe(2)
    expect(atWork.work.minute).toBe(HOURS.arrival)
    const problems = atWork.work.today.log.filter((e) => e.tone === 'bad')
    expect(problems).toEqual([])
  })

  it('a late night and a rushed morning show at work', () => {
    let p = goHome(afterWork())
    p = { ...p, work: { ...p.work, life: { ...p.work.life, minute: 25 * 60 + 30 } } }
    expect(sleepHours(25 * 60 + 30)).toBe(5.5)
    p = goToBed(p)
    p = { ...p, work: { ...p.work, life: { ...p.work.life, minute: 8 * 60 + 50 } } }
    const reputation = p.work.reputation
    const atWork = leaveForWork(p, 'walk')
    const log = atWork.work.today.log.map((e) => e.text)
    expect(log).toContain('Arrived 30 minutes late')
    expect(log).toContain('Only 5.5 hours’ sleep last night')
    expect(log).toContain('Started the day hungry')
    expect(log).toContain('Came to work in yesterday’s clothes')
    expect(atWork.work.minute).toBe(9 * 60 + 30)
    expect(atWork.work.reputation).toBeLessThan(reputation)
  })

  it('charges rent on Monday mornings, once a week', () => {
    let p = goHome(afterWork(5))
    p = goToBed(p)
    expect(p.work.life.ledger.at(-1)).toMatchObject({ amount: -WEEKLY_RENT })
    expect(p.work.life.rentWeek).toBe(2)
  })
})
