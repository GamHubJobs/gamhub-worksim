import { describe, expect, it } from 'vitest'
import { LOOKS } from './looks'

/** The warmth of a light colour: red over blue (a warm white is above 1). */
const warmth = (hex: string) =>
  parseInt(hex.slice(1, 3), 16) / parseInt(hex.slice(5, 7), 16)

describe('the light of each kind of workplace', () => {
  it('the ward, the workshop and the law firm each have their own', () => {
    for (const id of ['office', 'clinical', 'workshop', 'law'] as const)
      expect(LOOKS[id], id).toBeDefined()
  })

  it("the law firm's is warmer than the office's but as bright to work by", () => {
    expect(warmth(LOOKS.law.key.color)).toBeGreaterThan(warmth(LOOKS.office.key.color))
    expect(LOOKS.law.key.intensity).toBeGreaterThan(LOOKS.court.key.intensity)
    expect(LOOKS.law.key.intensity).toBeGreaterThanOrEqual(
      LOOKS.office.key.intensity * 0.9,
    )
  })

  it('the ward is the coolest', () => {
    expect(warmth(LOOKS.clinical.key.color)).toBeLessThan(warmth(LOOKS.office.key.color))
  })
})
