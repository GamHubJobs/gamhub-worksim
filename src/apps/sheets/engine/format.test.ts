import { describe, expect, it } from 'vitest'
import { displayValue, formatNumber } from './format'
import { makeError } from './values'

describe('number formats', () => {
  it.each([
    [1234.5, 'number', undefined, '1,234.50'],
    [1234.5, 'currency', undefined, '$1,234.50'],
    [-99, 'currency', undefined, '-$99.00'],
    [0.125, 'percent', undefined, '13%'],
    [0.125, 'percent', 1, '12.5%'],
    [1234.5678, 'number', 0, '1,235'],
    [1234.5678, undefined, undefined, '1234.5678'],
  ] as const)('%d as %s (%s decimals) is %s', (value, format, decimals, expected) => {
    expect(formatNumber(value, format, decimals)).toBe(expected)
  })

  it('shows typed numbers the way they were typed', () => {
    expect(displayValue(0.15, '15%', undefined).text).toBe('15%')
    expect(displayValue(0.125, '12.5%', undefined).text).toBe('12.5%')
    expect(displayValue(1200, '$1,200', undefined).text).toBe('$1,200.00')
    expect(displayValue(1500, '1,500', undefined).text).toBe('1,500')
    expect(displayValue(4500, '4,500.00', undefined).text).toBe('4,500.00')
    // A chosen format wins over the typed style.
    expect(displayValue(0.15, '15%', { numberFormat: 'number' }).text).toBe('0.15')
  })

  it('aligns numbers right, text left and errors in the centre', () => {
    expect(displayValue(5, '5', undefined).align).toBe('right')
    expect(displayValue('Paper', 'Paper', undefined).align).toBe('left')
    const error = displayValue(makeError('#N/A'), '=VLOOKUP(1,A1:B2,2,FALSE)', undefined)
    expect(error).toEqual({ text: '#N/A', align: 'center', isError: true })
    expect(displayValue('Paper', 'Paper', { align: 'center' }).align).toBe('center')
  })

  it('shows TRUE/FALSE and empty values', () => {
    expect(displayValue(true, '=1<2', undefined).text).toBe('TRUE')
    expect(displayValue(null, '', undefined).text).toBe('')
  })
})
