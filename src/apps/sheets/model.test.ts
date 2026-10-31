import { describe, expect, it } from 'vitest'
import { SheetContentSchema } from '../../persistence/schemas'
import {
  columnToLetters,
  countFilledCells,
  createSheetContent,
  getCellInput,
  lettersToColumn,
  looksNumeric,
  parseAddress,
  setCellInput,
  toAddress,
} from './model'

describe('column letters', () => {
  it.each([
    [0, 'A'],
    [25, 'Z'],
    [26, 'AA'],
    [51, 'AZ'],
    [701, 'ZZ'],
    [702, 'AAA'],
  ])('column %i is "%s" and back', (column, letters) => {
    expect(columnToLetters(column)).toBe(letters)
    expect(lettersToColumn(letters)).toBe(column)
  })
})

describe('addresses', () => {
  it('converts between positions and addresses', () => {
    expect(toAddress({ row: 0, column: 0 })).toBe('A1')
    expect(toAddress({ row: 9, column: 2 })).toBe('C10')
    expect(parseAddress('C10')).toEqual({ row: 9, column: 2 })
    expect(parseAddress('AA1')).toEqual({ row: 0, column: 26 })
  })

  it.each(['', 'A0', 'a1', '1A', 'A', 'ABCD1', 'A1:B2'])('rejects "%s"', (text) => {
    expect(parseAddress(text)).toBeNull()
  })
})

describe('sheet content', () => {
  it('creates valid empty content', () => {
    const content = createSheetContent()
    expect(SheetContentSchema.safeParse(content).success).toBe(true)
    expect(countFilledCells(content)).toBe(0)
  })

  it('sets a cell without changing the original content', () => {
    const original = createSheetContent()
    const sheetId = original.sheets[0].id
    const changed = setCellInput(original, sheetId, 'B2', '42')

    expect(getCellInput(changed.sheets[0], 'B2')).toBe('42')
    expect(getCellInput(original.sheets[0], 'B2')).toBe('')
  })

  it('removes a cell when it is set to empty', () => {
    const content = createSheetContent()
    const sheetId = content.sheets[0].id
    const filled = setCellInput(content, sheetId, 'A1', 'Hello')
    const cleared = setCellInput(filled, sheetId, 'A1', '')

    expect(countFilledCells(filled)).toBe(1)
    expect(countFilledCells(cleared)).toBe(0)
    expect('A1' in cleared.sheets[0].cells).toBe(false)
  })

  it('keeps unchanged cells', () => {
    let content = createSheetContent()
    const sheetId = content.sheets[0].id
    content = setCellInput(content, sheetId, 'A1', 'Item')
    content = setCellInput(content, sheetId, 'B1', 'Cost')
    expect(countFilledCells(content)).toBe(2)
    expect(SheetContentSchema.safeParse(content).success).toBe(true)
  })
})

describe('looksNumeric', () => {
  it.each(['42', '-3.5', '0.25', '1,250.00', ' 7 '])('"%s" is numeric', (text) => {
    expect(looksNumeric(text)).toBe(true)
  })

  it.each(['', 'abc', '12abc', '1,25', '=A1', '--1'])('"%s" is not numeric', (text) => {
    expect(looksNumeric(text)).toBe(false)
  })
})
