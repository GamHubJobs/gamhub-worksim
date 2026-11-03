import { describe, expect, it } from 'vitest'
import { neutraliseFormula, toCsv } from './formats'

describe('safe CSV', () => {
  it('marks text that a spreadsheet would run as a formula, and leaves numbers alone', () => {
    expect(neutraliseFormula('=HYPERLINK("http://x","click")')).toBe(
      `'=HYPERLINK("http://x","click")`,
    )
    expect(neutraliseFormula('+1234')).toBe(`'+1234`)
    expect(neutraliseFormula('@SUM(A1)')).toBe(`'@SUM(A1)`)
    expect(neutraliseFormula('-cmd')).toBe(`'-cmd`)
    expect(neutraliseFormula('-12.5')).toBe('-12.5')
    expect(neutraliseFormula('-15%')).toBe('-15%')
    expect(neutraliseFormula('Paid £552')).toBe('Paid £552')
    expect(toCsv({ head: ['Note'], rows: [['=1+1']] })).toContain(`'=1+1`)
  })
})
