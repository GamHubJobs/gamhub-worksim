import { describe, expect, it } from 'vitest'
import { PLACES } from '../content/city'
import { BOUNDS, standAt } from '../city/streets'
import { BUILDING_FRONT, BUILDINGS, ICONS, PAVEMENTS } from '../city/worldMap'
import { LifeSchema } from '../persistence/schemas'
import { newProfileData } from './career'
import { arrived, foundNear, setDestination } from './nav'

describe('the map is the world', () => {
  it('every place has an icon, and its door is at the edge of a pavement, on the street', () => {
    for (const p of PLACES) {
      expect(ICONS[p.id], p.id).toBeTruthy()
      const [x, z] = p.door
      expect(x).toBeGreaterThanOrEqual(BOUNDS.minX)
      expect(x).toBeLessThanOrEqual(BOUNDS.maxX)
      expect(Math.abs(z)).toBeGreaterThanOrEqual(PAVEMENTS[1].z - PAVEMENTS[1].width / 2)
      expect(Math.abs(z)).toBeLessThanOrEqual(BUILDING_FRONT)
      // Where the player stands to go in is on the walkable pavement.
      const [sx, sz] = standAt(p.id)
      expect(Math.abs(sz)).toBeLessThanOrEqual(BOUNDS.maxZ)
      expect(sx).toBe(x)
    }
  })

  it('the buildings are where the 3D street draws them (one list, shared)', () => {
    expect(BUILDINGS.length).toBeGreaterThan(10)
    for (const b of BUILDINGS) expect(Math.abs(b.side)).toBe(1)
  })
})

describe('finding the way', () => {
  it('a destination, and recent destinations (newest first, no repeats)', () => {
    let p = newProfileData('Alex Rivera', 0)
    p = setDestination(p, 'gym')
    p = setDestination(p, 'cafe')
    p = setDestination(p, 'gym')
    expect(p.work.life.nav.destination).toBe('gym')
    expect(p.work.life.nav.recent).toEqual(['gym', 'cafe'])
    expect(setDestination(p, null).work.life.nav.destination).toBeNull()
  })

  it('places are found by walking past them; home and work are known from the start', () => {
    const p = newProfileData('Alex Rivera', 0)
    expect(p.work.life.nav.found).toEqual(['home', 'office'])
    const cafe = PLACES.find((q) => q.id === 'cafe')!
    expect(foundNear(p.work.life.nav.found, cafe.door[0], 0)).toContain('cafe')
    expect(foundNear(p.work.life.nav.found, cafe.door[0] + 40, 0)).not.toContain('cafe')
  })

  it('arriving (inside the destination) is recognised; walking past it is not', () => {
    const base = setDestination(newProfileData('Alex Rivera', 0), 'cafe')
    const life = base.work.life
    const out = {
      ...base,
      work: {
        ...base.work,
        life: {
          ...life,
          phase: 'evening' as const,
          city: { ...life.city, at: 'cafe' as const, inside: false },
        },
      },
    }
    expect(arrived(out)).toBe(false)
    const inside = {
      ...out,
      work: {
        ...out.work,
        life: { ...out.work.life, city: { ...out.work.life.city, inside: true } },
      },
    }
    expect(arrived(inside)).toBe(true)
  })

  it('older saves load with no destination and home and work found', () => {
    const { nav: _n, ...old } = newProfileData('Alex Rivera', 0).work.life
    void _n
    expect(LifeSchema.parse(old).nav).toEqual({
      destination: null,
      recent: [],
      found: ['home', 'office'],
    })
  })
})
