import { describe, expect, it } from 'vitest'
import { PLACES, PLACE_ACTIONS, closedReason, getPlace } from '../content/city'
import { BOUNDS, nearestDoor, standAt } from '../city/streets'
import { newProfileData, type ProfileData } from './career'
import {
  canEnter,
  canGoOut,
  enterPlace,
  goOutside,
  isOutside,
  minutesTo,
  walkMinutes,
} from './city'
import { canDo, doHomeAction, getHomeAction, goHome, goToBed } from './life'
import { endDay, passTime } from './workday'
import { WorkStateSchema } from '../persistence/schemas'

function evening(): ProfileData {
  return goHome(endDay(passTime(newProfileData('Sam', 1), 8 * 60 + 40, 'work')))
}

const at = (p: ProfileData, minute: number): ProfileData => ({
  ...p,
  work: { ...p.work, life: { ...p.work.life, minute } },
})

describe('the neighbourhood', () => {
  it('has six places with doors on the street', () => {
    expect(PLACES.map((p) => p.id)).toEqual([
      'home',
      'cafe',
      'shop',
      'gym',
      'park',
      'office',
    ])
    for (const action of PLACE_ACTIONS) expect(getPlace(action.place)).toBeDefined()
    expect(new Set(PLACE_ACTIONS.map((a) => a.id)).size).toBe(PLACE_ACTIONS.length)
  })

  it('walking takes longer the further the place is', () => {
    expect(walkMinutes('home', 'home')).toBe(0)
    expect(walkMinutes('home', 'cafe')).toBeLessThan(walkMinutes('home', 'shop'))
    expect(walkMinutes('home', 'shop')).toBeLessThan(walkMinutes('home', 'park'))
    expect(walkMinutes('cafe', 'park')).toBe(walkMinutes('park', 'cafe'))
  })

  it('goes out, walks to the café, eats and walks home', () => {
    let p = evening()
    expect(canGoOut(p)).toBeNull()
    expect(canDo(p, getHomeAction('cafe-dinner')!)).toBe('Only at Kettle & Crumb.')
    p = goOutside(p)
    expect(isOutside(p)).toBe(true)
    expect(canDo(p, getHomeAction('cook')!)).toBe('You are not at home.')
    const start = p.work.life.minute
    p = enterPlace(p, 'cafe')
    expect(p.work.life.city).toEqual({ at: 'cafe', inside: true })
    expect(p.work.life.minute).toBe(start + walkMinutes('home', 'cafe'))
    const money = p.work.life.money
    p = doHomeAction(p, 'cafe-dinner')
    expect(p.work.life.money).toBe(money - 1350)
    expect(p.work.life.ready.ate).toBe(true)
    // Bed only at home.
    expect(goToBed(p)).toBe(p)
    p = enterPlace(goOutside(p), 'home')
    expect(p.work.life.city).toEqual({ at: 'home', inside: true })
    expect(p.work.life.log.some((l) => l.includes('Walked home'))).toBe(true)
    expect(goToBed(p).work.life.phase).toBe('morning')
  })

  it('the shop is cheaper than having groceries delivered', () => {
    let p = enterPlace(goOutside(evening()), 'shop')
    const food = p.work.life.food
    p = doHomeAction(p, 'shop-groceries')
    expect(p.work.life.food).toBe(food + 7)
    expect(getHomeAction('shop-groceries')!.cost!).toBeLessThan(
      getHomeAction('groceries')!.cost!,
    )
  })

  it('places have opening hours, and the office is only for the morning', () => {
    const cafe = getPlace('cafe')!
    expect(closedReason(cafe, 6 * 60)).toBe('Kettle & Crumb opens at 07:00.')
    expect(closedReason(cafe, 22 * 60 + 5)).toBe('Kettle & Crumb closed at 22:00.')
    expect(closedReason(getPlace('park')!, 3 * 60)).toBeNull()
    const out = goOutside(evening())
    expect(canEnter(at(out, 22 * 60), 'cafe')).toContain('closed')
    expect(canEnter(out, 'office')).toContain('closed until tomorrow')
    expect(canEnter(at(out, 25 * 60 + 30), 'park')).toContain('time to go home')
    expect(canEnter(at(out, 25 * 60 + 30), 'home')).toBeNull()
    expect(canEnter(evening(), 'cafe')).toBe('Go outside first.')
  })

  it('in the morning: breakfast at the café, a gym shower, then the walk to work', () => {
    let p = goToBed(evening())
    p = enterPlace(goOutside(p), 'cafe')
    p = doHomeAction(p, 'cafe-breakfast')
    p = enterPlace(goOutside(p), 'gym')
    p = doHomeAction(p, 'gym-shower')
    expect(p.work.life.ready).toMatchObject({ ate: true, showered: true })
    p = goOutside(p)
    expect(canEnter(p, 'office')).toBeNull()
    expect(minutesTo(p, 'office')).toBe(40)
    const day = p.work.day
    p = enterPlace(p, 'office')
    expect(p.work.dayOver).toBe(false)
    expect(p.work.day).toBeGreaterThan(day)
    expect(p.work.life.commute).toBe('walk')
    expect(p.work.life.city).toEqual({ at: 'home', inside: true })
  })

  it('older saves start at home', () => {
    const { work } = newProfileData('Sam', 1)
    const { city, ...old } = work.life
    expect(city).toBeDefined()
    expect(WorkStateSchema.parse({ ...work, life: old }).life.city).toEqual({
      at: 'home',
      inside: true,
    })
  })
})

describe('walking the street', () => {
  it('starts at a door, knows which door is near, and keeps to the street', () => {
    for (const place of PLACES) {
      const [x, z] = standAt(place.id)
      expect(nearestDoor(x, z)).toBe(place.id)
      expect(x).toBeGreaterThanOrEqual(BOUNDS.minX)
      expect(x).toBeLessThanOrEqual(BOUNDS.maxX)
      expect(Math.abs(z)).toBeLessThanOrEqual(BOUNDS.maxZ)
    }
    expect(nearestDoor(-20, 0)).toBeNull()
  })
})
