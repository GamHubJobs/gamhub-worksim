import { describe, expect, it } from 'vitest'
import {
  acceptSuggestion,
  findActiveFunction,
  suggestFunctions,
  syntaxParts,
} from './formulaHelp'

describe('finding the function being typed', () => {
  it.each([
    ['=SUM(', 'SUM', 0],
    ['=SUM(A1, ', 'SUM', 1],
    ['=VLOOKUP(A2, Prices!A:C, 3, ', 'VLOOKUP', 3],
    ['=IF(SUM(A1:A3)>5, ', 'IF', 1],
    ['=IF(SUM(A1:A3', 'SUM', 0],
    ['=IF(A1="a,b", ', 'IF', 1], // commas inside text do not count
    ['=sum(', 'SUM', 0],
  ])('%s → %s, value %i', (text, name, index) => {
    const active = findActiveFunction(text)
    expect(active?.definition.name).toBe(name)
    expect(active?.argumentIndex).toBe(index)
  })

  it.each(['=SUM(A1)', '=A1+B1', 'SUM(', '=UNKNOWN('])('%s → nothing', (text) => {
    expect(findActiveFunction(text)).toBeNull()
  })
})

describe('suggesting function names', () => {
  it('suggests names that start with the typed letters', () => {
    expect(suggestFunctions('=AVER')?.names).toEqual([
      'AVERAGE',
      'AVERAGEIF',
      'AVERAGEIFS',
    ])
    expect(suggestFunctions('=A1+vl')?.names).toEqual(['VLOOKUP'])
    expect(suggestFunctions('=SU')?.names).toEqual([
      'SUM',
      'SUBSTITUTE',
      'SUMIF',
      'SUMIFS',
    ])
    expect(suggestFunctions('=IF(cou')?.names).toEqual([
      'COUNT',
      'COUNTA',
      'COUNTBLANK',
      'COUNTIF',
      'COUNTIFS',
    ])
  })

  it('does not suggest inside text, after a complete name or outside formulas', () => {
    expect(suggestFunctions('=SUM')?.names).not.toContain('SUM')
    expect(suggestFunctions('AVER')).toBeNull()
    expect(suggestFunctions('=SUM(A1)')).toBeNull()
  })

  it('accepting a suggestion completes the name and opens the bracket', () => {
    expect(acceptSuggestion('=A1+vl', 'vl', 'VLOOKUP')).toBe('=A1+VLOOKUP(')
  })
})

describe('syntax display', () => {
  it('splits the syntax into its values', () => {
    expect(
      syntaxParts('VLOOKUP(search_value, range, column_number, [approximate])'),
    ).toEqual({
      name: 'VLOOKUP',
      args: ['search_value', 'range', 'column_number', '[approximate]'],
    })
    expect(syntaxParts('SUM(value1, [value2, ...])').args).toEqual([
      'value1',
      '[value2, ...]',
    ])
  })
})
