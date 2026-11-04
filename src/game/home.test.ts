import { describe, expect, it } from 'vitest'
import { getFurniture } from '../content/home'
import { newProfileData, type ProfileData } from './career'
import {
  buyFurniture,
  canBuy,
  canMove,
  enables,
  moveHome,
  recolour,
  sellFurniture,
} from './home'
import { arrivalFor, canDo, doHomeAction, getHomeAction, goHome, goToBed } from './life'
import { endDay, passTime } from './workday'

function evening(money = 300000): ProfileData {
  let p = newProfileData('Sam', 1)
  p = endDay(passTime(p, 8 * 60 + 40, 'work'))
  p = goHome(p)
  return { ...p, work: { ...p.work, life: { ...p.work.life, money } } }
}

describe('furniture and homes', () => {
  it('starts in the studio with the basics', () => {
    const p = newProfileData('Sam', 1)
    expect(p.work.life.home.id).toBe('studio')
    expect(Object.keys(p.work.life.home.furniture).sort()).toEqual([
      'bed',
      'kitchen',
      'shower',
      'table',
    ])
  })

  it('furniture makes activities possible, and says what is missing', () => {
    let p = evening()
    expect(canDo(p, getHomeAction('games')!)).toBe(
      'You need a games console (in the shop).',
    )
    p = buyFurniture(p, 'console', 1)
    expect(enables(p.work.life, 'games')).toBe(true)
    expect(canDo(p, getHomeAction('games')!)).toBeNull()
    expect(p.work.life.home.furniture.console).toEqual({ item: 'console', colour: 1 })
    expect(p.work.life.money).toBe(300000 - getFurniture('console')!.price)
  })

  it('better furniture makes activities better', () => {
    const plain = doHomeAction(evening(), 'series')
    const comfy = doHomeAction(
      buyFurniture(buyFurniture(evening(), 'sofa-small'), 'tv-small'),
      'series',
    )
    expect(comfy.work.life.needs.fun).toBeGreaterThan(plain.work.life.needs.fun)
  })

  it('studying adds skill XP to the weakest career skill', () => {
    const p = doHomeAction(buyFurniture(evening(), 'desk-study'), 'study')
    expect(Object.values(p.skills).reduce((a, b) => a + b, 0)).toBe(15)
  })

  it('replacing an item trades in the old one; selling and recolouring work', () => {
    let p = buyFurniture(evening(), 'bed-comfy')
    const bed = getFurniture('bed-basic')!
    expect(p.work.life.ledger.map((e) => e.text)).toContain(`Sold ${bed.name}`)
    p = recolour(p, 'bed', 2)
    expect(p.work.life.home.furniture.bed.colour).toBe(2)
    const before = p.work.life.money
    p = sellFurniture(p, 'bed')
    expect(p.work.life.home.furniture.bed).toBeUndefined()
    expect(p.work.life.money).toBeGreaterThan(before)
  })

  it('cannot buy what it cannot afford, or shop from work', () => {
    expect(canBuy(evening(100), 'console')).toContain('cannot afford')
    expect(canBuy(newProfileData('Sam', 1), 'console')).toBe(
      'Shop from home, after work.',
    )
  })

  it('moving costs money, changes the rent and the commute, and keeps the furniture', () => {
    let p = evening()
    const bus = arrivalFor(goToBed(p), 'bus').minute
    expect(canMove(evening(1000), 'flat')).toContain('You need')
    p = moveHome(p, 'flat')
    expect(p.work.life.home.id).toBe('flat')
    expect(p.work.life.home.furniture.bed.item).toBe('bed-basic')
    expect(arrivalFor(goToBed(p), 'bus').minute).toBe(bus - 10)
  })
})
