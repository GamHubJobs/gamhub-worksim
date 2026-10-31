import { describe, expect, it } from 'vitest'
import { formatTimeAgo } from './time'

const now = 1_000_000_000

describe('formatTimeAgo', () => {
  it.each([
    [0, 'just now'],
    [30_000, 'just now'],
    [60_000, '1 min ago'],
    [5 * 60_000, '5 min ago'],
    [2 * 3_600_000, '2 h ago'],
  ])('%i ms ago is "%s"', (elapsed, expected) => {
    expect(formatTimeAgo(now - elapsed, now)).toBe(expected)
  })

  it('treats times in the future as just now', () => {
    expect(formatTimeAgo(now + 10_000, now)).toBe('just now')
  })
})
