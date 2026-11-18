import { describe, expect, it } from 'vitest'
import {
  ACCESSORIES,
  CATEGORIES,
  TIERS,
  equipmentFor,
  getAccessory,
} from '../content/accessories'
import { CAREERS } from '../content/careers'
import { WEEKLY_PAY } from '../content/life'
import { LifeSchema } from '../persistence/schemas'
import {
  buyAccessory,
  canBuyAccessory,
  capacity,
  packAccessory,
  resaleOf,
  sellAccessory,
  siteKit,
  takeOffAccessory,
  usesOf,
  wearAccessory,
  wearAndTear,
  wornItems,
  wornModels,
} from './accessories'
import { newProfileData, type ProfileData } from './career'
import { withLife } from './lifeTime'

const rich = (): ProfileData => {
  const p = newProfileData('Alex', 1, 'engineering-services')
  return withLife(p, { ...p.work.life, money: 500000 })
}
const uidOf = (p: ProfileData, id: string) =>
  p.work.life.wardrobe.owned.find((o) => o.id === id)!.uid
const buy = (p: ProfileData, ...ids: string[]) =>
  ids.reduce((q, id) => buyAccessory(q, id), p)
const wear = (p: ProfileData, ...ids: string[]) =>
  ids.reduce((q, id) => wearAccessory(q, uidOf(q, id)).profile, p)

describe('the catalogue', () => {
  it('has every category and tier, each item once, with a price, colours and a description', () => {
    const ids = new Set(ACCESSORIES.map((a) => a.id))
    expect(ids.size).toBe(ACCESSORIES.length)
    for (const c of CATEGORIES)
      expect(
        ACCESSORIES.some((a) => a.category === c.id),
        c.id,
      ).toBe(true)
    for (const t of Object.keys(TIERS))
      expect(
        ACCESSORIES.some((a) => a.tier === t),
        t,
      ).toBe(true)
    for (const a of ACCESSORIES) {
      expect(a.price, a.id).toBeGreaterThan(0)
      expect(a.colours.length, a.id).toBeGreaterThan(0)
      expect(a.description.length, a.id).toBeGreaterThan(10)
    }
  })

  it('every career has professional equipment of its own', () => {
    for (const career of CAREERS) {
      const kit = equipmentFor(career.id)
      expect(kit.length, career.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('prices sit against pay: basic is pocket money, luxury takes weeks', () => {
    const week = WEEKLY_PAY[0]
    for (const a of ACCESSORIES) {
      if (a.tier === 'basic') expect(a.price, a.id).toBeLessThan(week * 0.1)
      if (a.tier === 'luxury') expect(a.price, a.id).toBeGreaterThan(week * 0.5)
    }
  })
})

describe('buying and selling', () => {
  it('buying takes the price from the bank and puts it in the wardrobe', () => {
    const p = rich()
    const q = buyAccessory(p, 'watch-smart', 1)
    const item = getAccessory('watch-smart')!
    expect(q.work.life.money).toBe(p.work.life.money - item.price)
    expect(q.work.life.ledger.at(-1)).toMatchObject({ amount: -item.price })
    const owned = q.work.life.wardrobe.owned
    expect(owned).toHaveLength(1)
    expect(owned[0]).toMatchObject({ id: 'watch-smart', colour: 1, condition: 100 })
    expect(q.work.life.wardrobe.history.at(-1)!.text).toBe('Bought Smartwatch')
  })

  it('not without the money', () => {
    const p = newProfileData('Alex', 1, 'legal')
    const poor = withLife(p, { ...p.work.life, money: 1000 })
    expect(canBuyAccessory(poor, 'watch-dress')).toMatch(/costs £1250.00/)
    expect(buyAccessory(poor, 'watch-dress')).toBe(poor)
  })

  it('sells on for part of what was paid, less as it wears; safety kit is not sold', () => {
    let p = buy(rich(), 'sneakers', 'hardhat')
    const shoe = p.work.life.wardrobe.owned[0]
    expect(resaleOf(shoe)).toBe(Math.round((shoe.paid * 0.4) / 100) * 100)
    expect(resaleOf({ ...shoe, condition: 50 })).toBeLessThan(resaleOf(shoe)!)
    expect(resaleOf(p.work.life.wardrobe.owned[1])).toBeNull()
    p = wear(p, 'sneakers')
    const before = p.work.life.money
    const q = sellAccessory(p, shoe.uid)
    expect(q.work.life.money).toBe(before + resaleOf(shoe)!)
    expect(q.work.life.wardrobe.owned.map((o) => o.id)).toEqual(['hardhat'])
    expect(q.work.life.wardrobe.worn).toEqual([])
  })
})

describe('wearing', () => {
  it('one thing per place: a new watch replaces the old one', () => {
    let p = buy(rich(), 'watch-classic', 'watch-smart')
    p = wear(p, 'watch-classic', 'watch-smart')
    expect(wornItems(p.work.life).map((x) => x.item.id)).toEqual(['watch-smart'])
  })

  it('a headphone band does not pass through a hat: the hat comes off, and it says so', () => {
    let p = buy(rich(), 'hardhat', 'headphones')
    p = wear(p, 'hardhat')
    const change = wearAccessory(p, uidOf(p, 'headphones'))
    expect(change.note).toMatch(/Took off the hard hat/)
    expect(wornItems(change.profile.work.life).map((x) => x.item.id)).toEqual([
      'headphones',
    ])
    // Earbuds and earmuffs-free hats are fine together.
    let q = buy(rich(), 'hardhat', 'earbuds')
    q = wear(q, 'hardhat', 'earbuds')
    expect(wornItems(q.work.life)).toHaveLength(2)
  })

  it('compatible things combine freely', () => {
    let p = buy(
      rich(),
      'hardhat',
      'glasses-safety',
      'hivis-vest',
      'safety-boots',
      'work-gloves',
      'tool-belt',
      'watch-digital',
      'earbuds',
    )
    p = wear(
      p,
      'hardhat',
      'glasses-safety',
      'hivis-vest',
      'safety-boots',
      'work-gloves',
      'tool-belt',
      'watch-digital',
      'earbuds',
    )
    expect(wornItems(p.work.life)).toHaveLength(8)
    expect(wornModels(p.work.life).map((m) => m.model)).toContain('hardhat')
  })

  it('four things in the pockets at most', () => {
    let p = buy(
      rich(),
      'wallet',
      'phone-case',
      'keyring',
      'tape-measure',
      'laser-measure',
    )
    p = wear(p, 'wallet', 'phone-case', 'keyring', 'tape-measure')
    const full = wearAccessory(p, uidOf(p, 'laser-measure'))
    expect(full.note).toMatch(/pockets are full/)
    expect(full.profile).toBe(p)
  })
})

describe('bags', () => {
  it('a bag has room for so many work things; taking it off empties it out', () => {
    let p = buy(rich(), 'backpack', 'tape-measure', 'laser-measure', 'multimeter')
    expect(packAccessory(p, uidOf(p, 'tape-measure')).note).toMatch(/Wear a bag/)
    p = wear(p, 'backpack')
    expect(capacity(p.work.life)).toBe(2)
    p = packAccessory(p, uidOf(p, 'tape-measure')).profile
    p = packAccessory(p, uidOf(p, 'laser-measure')).profile
    expect(packAccessory(p, uidOf(p, 'multimeter')).note).toMatch(/bag is full/)
    expect(p.work.life.wardrobe.packed).toHaveLength(2)
    // Packed tools count as with you.
    expect(usesOf(p.work.life).has('tool')).toBe(true)
    p = takeOffAccessory(p, uidOf(p, 'backpack'))
    expect(p.work.life.wardrobe.packed).toEqual([])
  })

  it('clothes and jewellery do not go in a work bag', () => {
    let p = buy(rich(), 'backpack', 'necklace')
    p = wear(p, 'backpack')
    expect(packAccessory(p, uidOf(p, 'necklace')).note).toMatch(/doesn’t go in a bag/)
  })
})

describe('what they do', () => {
  it('the site checks for kit: the player’s own, or lent by the site', () => {
    const none = siteKit(rich().work.life)
    expect(none.every((k) => k.from === 'issued')).toBe(true)
    let p = buy(rich(), 'hardhat', 'safety-boots')
    p = wear(p, 'hardhat', 'safety-boots')
    const kit = siteKit(p.work.life)
    expect(kit.find((k) => k.name === 'Hard hat')).toMatchObject({ from: 'own' })
    expect(kit.find((k) => k.name === 'Safety boots')).toMatchObject({ from: 'own' })
    expect(kit.find((k) => k.name === 'Hi-vis')).toMatchObject({ from: 'issued' })
  })

  it('a smartwatch tells the time and shows messages; earbuds make it quieter', () => {
    let p = buy(rich(), 'watch-smart', 'earbuds-pro')
    p = wear(p, 'watch-smart', 'earbuds-pro')
    const uses = usesOf(p.work.life)
    for (const u of [
      'time',
      'notifications',
      'activity',
      'audio',
      'noise-cancel',
    ] as const)
      expect(uses.has(u), u).toBe(true)
  })

  it('what is worn wears a little, once a day', () => {
    let p = buy(rich(), 'cap', 'watch-dress')
    p = wear(p, 'cap', 'watch-dress')
    const once = wearAndTear(p.work.life, 2)
    expect(wearAndTear(once, 2)).toBe(once)
    const [cap, watch] = once.wardrobe.owned
    expect(cap.condition).toBeLessThan(100)
    // Better things last longer.
    expect(watch.condition).toBeGreaterThan(cap.condition)
  })
})

describe('older saves', () => {
  it('a save from before accessories loads with an empty wardrobe, nothing else changed', () => {
    const old = LifeSchema.parse({})
    const raw = JSON.parse(JSON.stringify(old)) as Record<string, unknown>
    delete raw.wardrobe
    const loaded = LifeSchema.parse(raw)
    expect(loaded.wardrobe).toEqual({
      owned: [],
      worn: [],
      packed: [],
      history: [],
      woreDay: 0,
    })
    expect(loaded.money).toBe(old.money)
  })

  it('a wardrobe survives saving and loading', () => {
    let p = buy(rich(), 'watch-smart', 'backpack', 'tape-measure')
    p = wear(p, 'watch-smart', 'backpack')
    p = packAccessory(p, uidOf(p, 'tape-measure')).profile
    const again = LifeSchema.parse(JSON.parse(JSON.stringify(p.work.life)))
    expect(again.wardrobe).toEqual(p.work.life.wardrobe)
  })
})
