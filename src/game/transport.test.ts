import { describe, expect, it } from 'vitest'
import { BIKE, CAR } from '../content/transport'
import { newProfileData, type ProfileData } from './career'
import { enterPlace, goOutside, minutesTo } from './city'
import { arrivalFor, goHome, goToBed, leaveForWork } from './life'
import { canCommute, canDeal, deal, setRiding } from './transport'
import { endDay, passTime } from './workday'

function evening(day = 1): ProfileData {
  let p = newProfileData('Sam', 1)
  p = { ...p, work: { ...p.work, day } }
  return goHome(endDay(passTime(p, 8 * 60 + 40, 'work')))
}

const atGarage = (p: ProfileData) => enterPlace(goOutside(p), 'garage')

describe('getting around', () => {
  it('the bike and the car need owning first', () => {
    const p = goToBed(evening())
    expect(canCommute(p.work.life, 'bike')).toContain('need a bike')
    expect(canCommute(p.work.life, 'car')).toContain('need a car')
    expect(canCommute(p.work.life, 'bus')).toBeNull()
    expect(leaveForWork(p, 'bike')).toBe(p)
  })

  it('buys a bike at Cog & Kerb, rides it to work, and sells it second-hand', () => {
    let p = atGarage(evening())
    expect(canDeal(evening(), 'buy-bike')).toBe('Only at Cog & Kerb.')
    const money = p.work.life.money
    p = deal(p, 'buy-bike')
    expect(p.work.life.money).toBe(money - BIKE.price)
    expect(p.work.life.vehicles.bike).toBe(true)
    // Round the neighbourhood twice as fast.
    p = goOutside(p)
    const walking = minutesTo(p, 'park')
    p = setRiding(p, true)
    expect(minutesTo(p, 'park')).toBe(Math.round(walking / 2))
    p = enterPlace(p, 'home')
    expect(p.work.life.city.riding).toBe(false)
    // To work by bike: quicker than walking, free, warm on arrival.
    p = goToBed(p)
    expect(arrivalFor(p, 'bike').minute).toBeLessThan(arrivalFor(p, 'walk').minute)
    const hygiene = p.work.life.needs.hygiene
    const before = p.work.life.money
    p = leaveForWork(p, 'bike')
    expect(p.work.life.commute).toBe('bike')
    expect(p.work.life.money).toBe(before)
    expect(p.work.life.needs.hygiene).toBe(hygiene - 12)
    // Selling it back.
    p = atGarage(goHome(endDay(passTime(p, 8 * 60, 'work'))))
    const cash = p.work.life.money
    p = deal(p, 'sell-bike')
    expect(p.work.life.money).toBe(cash + BIKE.price * BIKE.resale)
    expect(p.work.life.commute).toBe('bus')
  })

  it('leases a car: a deposit, then a weekly charge on Mondays until handed back', () => {
    let p = atGarage(evening(5))
    const money = p.work.life.money
    p = deal(p, 'lease-car')
    expect(p.work.life.money).toBe(money - CAR.deposit)
    // Monday: rent and the lease.
    p = enterPlace(goOutside(p), 'home')
    const friday = p.work.life.money
    p = goToBed(p)
    const monday = p.work.life.ledger.filter((e) => e.day === 8).map((e) => e.text)
    expect(monday).toContain('Car lease for week 2')
    expect(p.work.life.money).toBe(friday - CAR.weekly - 16000)
    // Driving costs fuel and parking each way.
    const before = p.work.life.money
    p = leaveForWork(p, 'car')
    expect(p.work.life.money).toBe(before - 450)
    // Handing it back.
    p = deal(atGarage(goHome(endDay(passTime(p, 8 * 60, 'work')))), 'end-lease')
    expect(p.work.life.vehicles.car).toBe(false)
    expect(p.work.life.commute).toBe('bus')
  })

  it('Cog & Kerb keeps opening hours', () => {
    let p = atGarage(evening())
    p = { ...p, work: { ...p.work, life: { ...p.work.life, minute: 20 * 60 + 5 } } }
    expect(canDeal(p, 'buy-bike')).toContain('closed')
  })
})
