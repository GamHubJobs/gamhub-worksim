import { describe, expect, it } from 'vitest'
import { fingerprintText, fingerprintValue } from './fingerprint'

describe('fingerprints', () => {
  it('are short and stable, and change with the text', () => {
    expect(fingerprintText('hello')).toBe(fingerprintText('hello'))
    expect(fingerprintText('hello')).not.toBe(fingerprintText('hello!'))
    expect(fingerprintText('hello').length).toBeLessThanOrEqual(12)
  })

  it('of a value do not depend on the order of its keys (saving reorders them)', () => {
    const a = {
      type: 'text',
      x: 1,
      style: { size: 24, bold: true },
      list: [{ b: 1, a: 2 }],
    }
    const b = {
      list: [{ a: 2, b: 1 }],
      style: { bold: true, size: 24 },
      x: 1,
      type: 'text',
    }
    expect(fingerprintValue(a)).toBe(fingerprintValue(b))
    expect(fingerprintValue({ ...a, x: 2 })).not.toBe(fingerprintValue(a))
    // The order of a list's items still counts.
    expect(fingerprintValue([1, 2])).not.toBe(fingerprintValue([2, 1]))
  })
})
