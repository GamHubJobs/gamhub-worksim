import { describe, expect, it } from 'vitest'
import type { PersonLook } from './people'
import { dressFor, playerWorkwear } from './workwear'

const base: PersonLook = {
  skin: 2,
  hair: 'short',
  hairColor: 0,
  outfit: 'shirt',
  top: '#ffffff',
  trousers: '#111827',
}

describe('what people wear in each workplace', () => {
  it('scrubs on the ward, navy for the ward manager, a coat for the pharmacist', () => {
    expect(dressFor('ward', 'manager', base)).toMatchObject({
      outfit: 'scrubs',
      top: '#1e3a8a',
      stethoscope: true,
    })
    expect(dressFor('ward', 'backM', base).outfit).toBe('scrubs')
    expect(dressFor('ward', 'analyst', base).outfit).toBe('coat')
    expect(dressFor('ward', 'reception', base).outfit).toBe('shirt')
  })

  it('hi-vis in the workshop, dark suits at a law firm, casual in a software team', () => {
    expect(dressFor('workshop', 'senior', base).outfit).toBe('hivis')
    expect(dressFor('courtroom', 'senior', base)).toMatchObject({ outfit: 'blazer' })
    expect(dressFor('devteam', 'backM', base).outfit).toBe('hoodie')
    expect(dressFor('records', 'senior', base)).toMatchObject({
      outfit: 'shirt',
      badge: '#1d4ed8',
    })
  })

  it('the player is dressed for the place too', () => {
    expect(playerWorkwear('ward', base).outfit).toBe('scrubs')
    expect(playerWorkwear('workshop', base).outfit).toBe('hivis')
    expect(playerWorkwear('courtroom', base)).toMatchObject({
      outfit: 'blazer',
      tie: '#7f1d1d',
    })
    expect(playerWorkwear('records', base)).toMatchObject({
      outfit: 'shirt',
      tie: '#1e3a8a',
    })
  })
})
