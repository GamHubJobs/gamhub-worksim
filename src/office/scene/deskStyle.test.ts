import { describe, expect, it } from 'vitest'
import { deskStyleFor, deskTop } from './deskStyle'

describe('each workplace’s own desks', () => {
  it('drawing boards in engineering, but the player keeps a computer', () => {
    expect(deskStyleFor('engineering', false)).toBe('drafting')
    expect(deskStyleFor('engineering', true)).toBe('office')
  })

  it('clinical worktops in the hospital and walnut desks at the law firm, with computers', () => {
    for (const computer of [true, false]) {
      expect(deskStyleFor('hospital', computer)).toBe('clinical')
      expect(deskStyleFor('law', computer)).toBe('legal')
      expect(deskStyleFor('office', computer)).toBe('office')
    }
    expect(deskTop('clinical')).toBe('#f1f5f9')
    expect(deskTop('legal')).not.toBeNull()
    expect(deskTop('office')).toBeNull()
  })
})
