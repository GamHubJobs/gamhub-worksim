import { describe, expect, it } from 'vitest'
import { getPlace } from '../content/city'
import { newProfileData } from '../game/career'
import type { Profile } from '../persistence/schemas'
import { arrival } from './arrival'
import { openingFor } from './prefs'

describe('which opening plays', () => {
  it('the first time: the whole of it, whatever the choice but Off', () => {
    expect(openingFor({ mode: 'short', seen: false }, true)).toBe('full')
    expect(openingFor({ mode: 'short', seen: false }, false)).toBe('full')
    expect(openingFor({ mode: 'full', seen: false }, true)).toBe('full')
    expect(openingFor({ mode: 'off', seen: false }, true)).toBe('none')
  })
  it('after that: a short one, the whole one if chosen, none if turned off', () => {
    expect(openingFor({ mode: 'short', seen: true }, false)).toBe('short')
    expect(openingFor({ mode: 'full', seen: true }, false)).toBe('full')
    expect(openingFor({ mode: 'off', seen: true }, false)).toBe('none')
  })
})

describe('where the flight ends', () => {
  const profile = (change: (p: Profile) => void) => {
    const p = { ...newProfileData('Ama', 1, 'it-support'), id: 'x' } as unknown as Profile
    change(p)
    return p
  }
  it('at work (and for a new player): the office', () => {
    expect(arrival(null).door).toEqual(getPlace('office')!.door)
    expect(arrival(profile(() => {})).door).toEqual(getPlace('office')!.door)
  })
  it('after work: home, or the place the player is in', () => {
    const home = profile((p) => {
      p.work = { ...p.work, dayOver: true }
      p.work.life = { ...p.work.life, city: { ...p.work.life.city, at: 'home' } }
    })
    expect(arrival(home)).toEqual({ door: getPlace('home')!.door, name: 'home' })
    const cafe = profile((p) => {
      p.work = { ...p.work, dayOver: true }
      p.work.life = { ...p.work.life, city: { ...p.work.life.city, at: 'cafe' } }
    })
    expect(arrival(cafe).door).toEqual(getPlace('cafe')!.door)
  })
})
