import { describe, expect, it } from 'vitest'
import { isLow } from './graphics'

describe('graphics quality', () => {
  it('auto follows the computer; high and low are the player’s choice', () => {
    expect(isLow('auto', true)).toBe(true)
    expect(isLow('auto', false)).toBe(false)
    expect(isLow('high', true)).toBe(false)
    expect(isLow('low', false)).toBe(true)
  })
})
