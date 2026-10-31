import { describe, expect, it } from 'vitest'
import { createId, isId } from './ids'

describe('createId', () => {
  it('creates an ID in UUID format', () => {
    expect(isId(createId())).toBe(true)
  })

  it('never creates the same ID twice', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      ids.add(createId())
    }
    expect(ids.size).toBe(1000)
  })
})

describe('isId', () => {
  it('rejects values that are not IDs', () => {
    expect(isId('')).toBe(false)
    expect(isId('hello')).toBe(false)
    expect(isId(42)).toBe(false)
    expect(isId(undefined)).toBe(false)
  })
})
