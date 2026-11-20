import { describe, expect, it } from 'vitest'
import { within } from './where'

describe('the world map stays over the drawn neighbourhood', () => {
  // The drawn ground runs from −90 to 125 (215 across).
  it('leaves a view well inside the map where it is', () => {
    expect(within(0, 120, -90, 215)).toBe(0)
  })
  it('stops a view at the east edge (the hospital end) without empty space', () => {
    // Centred on the hospital (x 79), 120 across: it would show up to 139.
    expect(within(79, 120, -90, 215)).toBe(65)
  })
  it('stops a view at the west edge', () => {
    expect(within(-80, 60, -90, 215)).toBe(-60)
  })
  it('centres a view wider than the whole map', () => {
    expect(within(40, 300, -90, 215)).toBe(17.5)
  })
})
