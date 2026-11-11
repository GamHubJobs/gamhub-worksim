import { describe, expect, it } from 'vitest'
import { visitAt, wanted, type Person } from './schedule'

// A customer's day (see city/scene/interiors/Customers.tsx): in and out
// again, all the time the place is open, counter first or checkout last.
const base: Person = {
  id: 'cafe:walkin1',
  role: 'customer',
  own: 'window',
  arrives: 7 * 60,
  leaves: 22 * 60,
  lunch: null,
  meetings: {},
  errands: [],
}
const cafe: Person = {
  ...base,
  visits: { every: 50, stay: 30, offset: 0, before: { place: 'counter', minutes: 4 } },
}
const shop: Person = {
  ...base,
  own: 'aisle',
  visits: { every: 50, stay: 20, offset: 10, after: { place: 'checkout', minutes: 3 } },
}
const at = (p: Person, minute: number) => {
  const i = wanted(p, 1, minute, [])
  return i.kind === 'at' ? i.place : 'away'
}

describe('customers coming and going', () => {
  it('in for a while, then out, again and again while the place is open', () => {
    expect(at(cafe, 6 * 60)).toBe('away')
    expect(at(cafe, 7 * 60)).toBe('counter')
    expect(at(cafe, 7 * 60 + 3)).toBe('counter')
    expect(at(cafe, 7 * 60 + 4)).toBe('window')
    expect(at(cafe, 7 * 60 + 29)).toBe('window')
    expect(at(cafe, 7 * 60 + 30)).toBe('away')
    expect(at(cafe, 7 * 60 + 50)).toBe('counter')
    expect(at(cafe, 19 * 60)).toBe('window')
    expect(at(cafe, 22 * 60)).toBe('away')
    // Visits do not run past closing.
    expect(visitAt({ ...cafe, leaves: 21 * 60 + 20 }, 21 * 60 + 15)!.left).toBe(5)
  })

  it('the shop: browsing, then the checkout on the way out', () => {
    expect(at(shop, 7 * 60 + 5)).toBe('away')
    expect(at(shop, 7 * 60 + 10)).toBe('aisle')
    expect(at(shop, 7 * 60 + 26)).toBe('aisle')
    expect(at(shop, 7 * 60 + 27)).toBe('checkout')
    expect(at(shop, 7 * 60 + 29)).toBe('checkout')
    expect(at(shop, 7 * 60 + 30)).toBe('away')
  })

  it('come and go while the player stands about (the errand clock runs on)', () => {
    const i = wanted(cafe, 1, 7 * 60 + 49, [], 7 * 60 + 50)
    expect(i).toMatchObject({ kind: 'at', place: 'counter' })
  })
})
