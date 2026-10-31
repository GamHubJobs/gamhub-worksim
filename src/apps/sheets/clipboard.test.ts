import { describe, expect, it } from 'vitest'
import type { SheetContent } from '../../persistence/schemas'
import { SheetContentSchema } from '../../persistence/schemas'
import { copyCells, fill, parseTsv, pasteCells, pasteText, toTsv } from './clipboard'
import {
  addSheet,
  checkSheetName,
  clearRange,
  createSheetContent,
  formatRange,
  getColumnWidth,
  parseRange,
  rangeToText,
  renameSheet,
  setCellInput,
  setCells,
  setColumnWidth,
  usedSize,
} from './model'

function sheetWith(cells: Record<string, string>): {
  content: SheetContent
  sheetId: string
} {
  let content = createSheetContent()
  const sheetId = content.sheets[0].id
  for (const [address, input] of Object.entries(cells)) {
    content = setCellInput(content, sheetId, address, input)
  }
  return { content, sheetId }
}

function inputs(content: SheetContent, sheetIndex = 0): Record<string, string> {
  return Object.fromEntries(
    Object.entries(content.sheets[sheetIndex].cells).map(([address, cell]) => [
      address,
      cell.input,
    ]),
  )
}

const range = (text: string) => parseRange(text)!

describe('ranges', () => {
  it('reads and writes range text', () => {
    expect(parseRange('B2:D5')).toEqual({ top: 1, left: 1, bottom: 4, right: 3 })
    expect(parseRange('d5:b2')).toEqual({ top: 1, left: 1, bottom: 4, right: 3 })
    expect(rangeToText(range('B2:D5'))).toBe('B2:D5')
    expect(rangeToText(range('C3'))).toBe('C3')
    expect(parseRange('nonsense')).toBeNull()
    expect(parseRange('A1:B2:C3')).toBeNull()
  })
})

describe('formatting', () => {
  it('applies and removes formatting on a range, keeping values', () => {
    const { content, sheetId } = sheetWith({ A1: 'Total', B1: '5' })
    const bold = formatRange(content, sheetId, range('A1:B2'), { bold: true })
    expect(bold.sheets[0].cells.A1).toEqual({ input: 'Total', format: { bold: true } })
    expect(bold.sheets[0].cells.B2).toEqual({ input: '', format: { bold: true } })
    expect(SheetContentSchema.safeParse(bold).success).toBe(true)

    const notBold = formatRange(bold, sheetId, range('A1:B2'), { bold: undefined })
    expect(notBold.sheets[0].cells).toEqual({
      A1: { input: 'Total' },
      B1: { input: '5' },
    })
  })

  it('clearing values keeps formatting, and typing keeps it too', () => {
    const { content, sheetId } = sheetWith({ A1: '5' })
    const formatted = formatRange(content, sheetId, range('A1'), {
      numberFormat: 'currency',
    })
    const cleared = clearRange(formatted, sheetId, range('A1:A3'))
    expect(cleared.sheets[0].cells.A1).toEqual({
      input: '',
      format: { numberFormat: 'currency' },
    })
    const typed = setCellInput(cleared, sheetId, 'A1', '7')
    expect(typed.sheets[0].cells.A1.format).toEqual({ numberFormat: 'currency' })
  })

  it('stores column widths only when they differ from the default', () => {
    const { content, sheetId } = sheetWith({})
    const wide = setColumnWidth(content, sheetId, 1, 250)
    expect(getColumnWidth(wide.sheets[0], 1)).toBe(250)
    expect(wide.sheets[0].columnWidths).toEqual({ B: 250 })
    const tooSmall = setColumnWidth(wide, sheetId, 1, 2)
    expect(getColumnWidth(tooSmall.sheets[0], 1)).toBe(32)
    expect(SheetContentSchema.safeParse(tooSmall).success).toBe(true)
  })

  it('reports the used size of a sheet', () => {
    const { content } = sheetWith({ C120: 'far away', A1: 'x' })
    expect(usedSize(content.sheets[0])).toEqual({ rows: 120, columns: 3 })
  })
})

describe('copy and paste', () => {
  const display = (address: string) => `shown ${address}`

  it('adjusts formulas to their new position', () => {
    const { content, sheetId } = sheetWith({ B2: '2', C2: '3', D2: '=B2*C2' })
    const copied = copyCells(content, sheetId, range('D2'), display)!
    const { content: pasted, range: target } = pasteCells(
      content,
      sheetId,
      range('D3'),
      copied,
    )
    expect(inputs(pasted).D3).toBe('=B3*C3')
    expect(rangeToText(target)).toBe('D3')
  })

  it('repeats a copied cell to fill a larger selection', () => {
    const { content, sheetId } = sheetWith({ D2: '=B2*C2' })
    const copied = copyCells(content, sheetId, range('D2'), display)!
    const { content: pasted } = pasteCells(content, sheetId, range('D3:D5'), copied)
    expect(inputs(pasted)).toMatchObject({ D3: '=B3*C3', D4: '=B4*C4', D5: '=B5*C5' })
  })

  it('copies formatting and empty cells', () => {
    const { content, sheetId } = sheetWith({ A1: 'x', B2: 'old' })
    const formatted = formatRange(content, sheetId, range('A1'), { bold: true })
    const copied = copyCells(formatted, sheetId, range('A1:A2'), display)!
    const { content: pasted } = pasteCells(formatted, sheetId, range('B1'), copied)
    expect(pasted.sheets[0].cells.B1).toEqual({ input: 'x', format: { bold: true } })
    expect(pasted.sheets[0].cells.B2).toBeUndefined() // the empty cell was pasted too
  })

  it('cut and paste moves cells without changing their formulas', () => {
    const { content, sheetId } = sheetWith({ A1: '5', B1: '=A1*2' })
    const cut = copyCells(content, sheetId, range('B1'), display, true)!
    const { content: moved } = pasteCells(content, sheetId, range('C3'), cut)
    expect(inputs(moved)).toEqual({ A1: '5', C3: '=A1*2' })
  })

  it('cut and paste works when the old and new places overlap', () => {
    const { content, sheetId } = sheetWith({ A1: '1', A2: '2' })
    const cut = copyCells(content, sheetId, range('A1:A2'), display, true)!
    const { content: moved } = pasteCells(content, sheetId, range('A2'), cut)
    expect(inputs(moved)).toEqual({ A2: '1', A3: '2' })
  })

  it('cut and paste between sheets', () => {
    const { content, sheetId } = sheetWith({ A1: 'move me' })
    const { content: twoSheets, sheetId: secondId } = addSheet(content)
    const cut = copyCells(twoSheets, sheetId, range('A1'), display, true)!
    const { content: moved } = pasteCells(twoSheets, secondId, range('B2'), cut)
    expect(inputs(moved, 0)).toEqual({})
    expect(inputs(moved, 1)).toEqual({ B2: 'move me' })
  })

  it('gives other programs the values as shown, separated by tabs', () => {
    const { content, sheetId } = sheetWith({ A1: '1', B1: '2' })
    const copied = copyCells(content, sheetId, range('A1:B2'), display)!
    expect(copied.text).toBe('shown A1\tshown B1\nshown A2\tshown B2')
  })

  it('pastes text from other programs into cells', () => {
    const { content, sheetId } = sheetWith({})
    const { content: pasted, range: target } = pasteText(
      content,
      sheetId,
      { row: 1, column: 1 },
      'Item\tCost\r\nPaper\t4.99\r\n',
    )
    expect(inputs(pasted)).toEqual({ B2: 'Item', C2: 'Cost', B3: 'Paper', C3: '4.99' })
    expect(rangeToText(target)).toBe('B2:C3')
  })
})

describe('tab-separated text', () => {
  it('round-trips values with tabs, line breaks and quotes', () => {
    const rows = [
      ['plain', 'with\ttab'],
      ['two\nlines', 'say "hi"'],
    ]
    expect(parseTsv(toTsv(rows))).toEqual(rows)
  })

  it('reads a single value', () => {
    expect(parseTsv('hello')).toEqual([['hello']])
  })
})

describe('fill down and right', () => {
  it('copies the top row down, adjusting formulas', () => {
    const { content, sheetId } = sheetWith({ C1: '=A1*B1', D1: 'label' })
    const filled = fill(content, sheetId, range('C1:D3'), 'down')
    expect(inputs(filled)).toMatchObject({
      C2: '=A2*B2',
      C3: '=A3*B3',
      D2: 'label',
      D3: 'label',
    })
  })

  it('copies the left column to the right', () => {
    const { content, sheetId } = sheetWith({ A5: '=SUM(A1:A4)' })
    const filled = fill(content, sheetId, range('A5:C5'), 'right')
    expect(inputs(filled)).toMatchObject({ B5: '=SUM(B1:B4)', C5: '=SUM(C1:C4)' })
  })
})

describe('sheets', () => {
  it('adds sheets with unique names and renames them', () => {
    const { content } = sheetWith({})
    const { content: two, sheetId } = addSheet(content)
    expect(two.sheets.map((s) => s.name)).toEqual(['Sheet1', 'Sheet2'])
    expect(checkSheetName(two, sheetId, 'sheet1')).toContain('already a sheet')
    expect(checkSheetName(two, sheetId, 'Bad:Name')).toContain('cannot contain')
    expect(checkSheetName(two, sheetId, '  ')).toContain('empty')
    expect(checkSheetName(two, sheetId, 'Prices')).toBeNull()
    expect(renameSheet(two, sheetId, ' Prices ').sheets[1].name).toBe('Prices')
  })

  it('renaming a sheet updates formulas that refer to it', () => {
    const { content, sheetId } = sheetWith({ A1: '=Sheet2!B1*2' })
    const { content: two, sheetId: secondId } = addSheet(content)
    const renamed = renameSheet(two, secondId, 'Price list')
    expect(renamed.sheets[0].cells.A1.input).toBe("='Price list'!B1*2")
    expect(renamed.sheets[0].id).toBe(sheetId)
  })

  it('setCells removes cells that end up empty', () => {
    const { content, sheetId } = sheetWith({ A1: 'x' })
    expect(
      setCells(content, sheetId, { A1: { input: '', format: {} } }).sheets[0].cells,
    ).toEqual({})
  })
})
