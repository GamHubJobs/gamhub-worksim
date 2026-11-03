import { describe, expect, it } from 'vitest'
import { safeFileName } from './download'

describe('safe file names', () => {
  it('removes characters that are not allowed, and path separators', () => {
    expect(safeFileName('../../etc/passwd')).toBe('.. .. etc passwd')
    expect(safeFileName('Budget: Q3 <draft>?')).toBe('Budget Q3 draft')
  })

  it('avoids names Windows refuses', () => {
    expect(safeFileName('CON')).toBe('CON_')
    expect(safeFileName('nul.txt')).toBe('nul_.txt')
    expect(safeFileName('Report.')).toBe('Report')
    expect(safeFileName('   ')).toBe('file')
  })
})
