import { describe, expect, it } from 'vitest'
import { ASSIGNMENTS } from '../../../content/assignments'
import { buildStartingContent } from '../../../game/workbooks'
import { SheetContentSchema, type SheetContent } from '../../../persistence/schemas'
import {
  fingerprint,
  numberFormatCode,
  numberFormatOf,
  readWorkbook,
  splitReference,
  workbookCommands,
  type GcWorkbook,
} from './convert'
import { EVERYTHING } from './fixtures/everything'
import built from './fixtures/everything.gridcraft.json'

const book = built as unknown as GcWorkbook
const sorted = (o?: object) => JSON.stringify(Object.entries(o ?? {}).sort())

describe('Grid Craft round trip (the real app, fixtures/everything.gridcraft.json)', () => {
  const back = readWorkbook(book, EVERYTHING)

  it('reads back every cell exactly: what was typed, and its format', () => {
    expect(SheetContentSchema.safeParse(back).success).toBe(true)
    for (const sheet of EVERYTHING.sheets) {
      const read = back.sheets.find((s) => s.name === sheet.name)!
      expect(read.id).toBe(sheet.id)
      expect(Object.keys(read.cells).sort()).toEqual(Object.keys(sheet.cells).sort())
      for (const [address, cell] of Object.entries(sheet.cells)) {
        expect(read.cells[address].input, `${sheet.name}!${address}`).toBe(cell.input)
        expect(sorted(read.cells[address].format), `${sheet.name}!${address}`).toBe(
          sorted(cell.format),
        )
      }
    }
  })

  it('reads back column widths and charts (type, title and the cells drawn)', () => {
    const [budget, notes] = back.sheets
    expect(budget.columnWidths).toEqual({ A: 140, D: 180 })
    expect(budget.charts).toEqual(EVERYTHING.sheets[0].charts)
    expect(notes.charts).toBeUndefined()
  })

  it('keeps what Grid Craft keeps in the file only (validations, conditional formats)', () => {
    expect(back.sheets[1].validations).toEqual(EVERYTHING.sheets[1].validations)
    expect(back.sheets[1].conditionalFormats).toEqual(
      EVERYTHING.sheets[1].conditionalFormats,
    )
  })

  it('without a previous save, numbers are as Grid Craft keeps them and formulas in capitals', () => {
    const cold = readWorkbook(book)
    const budget = cold.sheets[0]
    expect(budget.cells.B2.input).toBe('1200.5')
    expect(budget.cells.C4.input).toBe('=ROUND(B4/B$5,3)')
    expect(budget.cells.D3.input).toBe("'00123")
    expect(budget.cells.D5.input).toBe('2026-03-01')
    expect(budget.cells.D4.input).toBe('TRUE')
    expect(cold.sheets[1].cells.C2.input).toBe("='Q1 Notes & more'!B2*2")
  })

  it('a changed cell takes its new input; an untouched one keeps its old one', () => {
    const before: SheetContent = structuredClone(EVERYTHING)
    before.sheets[0].cells.B2 = { input: '999', format: { numberFormat: 'currency' } }
    before.sheets[0].cells.C2.input = '=B2/B5'
    const read = readWorkbook(book, before).sheets[0]
    expect(read.cells.B2.input).toBe('1200.5')
    expect(read.cells.C2.input).toBe('=B2/B$5')
    expect(read.cells.B3.input).toBe('150')
  })
})

describe('number formats', () => {
  it('WorkSim formats as format codes, and back', () => {
    for (const format of [
      { numberFormat: 'currency' as const },
      { numberFormat: 'currency' as const, decimals: 0 },
      { numberFormat: 'percent' as const },
      { numberFormat: 'percent' as const, decimals: 2 },
      { numberFormat: 'number' as const },
      { numberFormat: 'number' as const, decimals: 4 },
    ])
      expect(numberFormatOf(numberFormatCode(format)!)).toEqual(format)
  })

  it('reads the codes other apps and Grid Craft buttons write', () => {
    expect(
      numberFormatOf('_("$"* #,##0.00_);_("$"* \\(#,##0.00\\);_("$"* "-"??_);_(@_)'),
    ).toEqual({
      numberFormat: 'currency',
    })
    expect(numberFormatOf('[$€-2] #,##0.00')).toEqual({ numberFormat: 'currency' })
    expect(numberFormatOf('\\£#,##0')).toEqual({ numberFormat: 'currency', decimals: 0 })
    expect(numberFormatOf('0.0%')).toEqual({ numberFormat: 'percent', decimals: 1 })
    expect(numberFormatOf('#,##0')).toEqual({ numberFormat: 'number', decimals: 0 })
    expect(numberFormatOf('0.00')).toEqual({ numberFormat: 'number' })
    for (const none of ['General', '@', 'yyyy-mm-dd', 'h:mm AM/PM', '"Total"'])
      expect(numberFormatOf(none), none).toEqual({})
  })
})

describe('building WorkSim workbooks in Grid Craft', () => {
  it('names the sheets, then fills each with its values as WorkSim reads them', () => {
    const commands = workbookCommands(EVERYTHING)
    expect(commands[0]).toEqual(['sheet.rename', { sheet: 0, name: 'Budget' }])
    expect(commands[1]).toEqual([
      'home.insertSheet',
      { name: 'Q1 Notes & more', before: 1 },
    ])
    const values = commands.find(([c]) => c === 'range.setValues')![1]
    expect(values.parse).toBe(false)
    const rows = values.values as unknown[][]
    expect(rows[1].slice(0, 4)).toEqual(['Rent', 1200.5, '=B2/B$5', 'Due on the 1st'])
    expect(rows[2][3]).toBe('00123')
    expect(rows[3][3]).toBe(true)
    expect(rows[4][3]).toBe('2026-03-01')
    expect(commands.at(-1)).toEqual(['selection.set', { range: 'A1' }])
  })

  it('every task’s starting workbook can be built', () => {
    for (const assignment of ASSIGNMENTS.filter((a) => a.workbook)) {
      const commands = workbookCommands(buildStartingContent(assignment))
      expect(commands.length, assignment.id).toBeGreaterThan(1)
      for (const [command, params] of commands)
        expect(JSON.stringify(params).length, `${assignment.id} ${command}`).toBeLessThan(
          2_000_000,
        )
    }
  })
})

describe('helpers', () => {
  it('references with and without quoted sheet names', () => {
    expect(splitReference("'Q1 Notes & more'!$B$2:$B$9")).toEqual({
      sheet: 'Q1 Notes & more',
      range: 'B2:B9',
    })
    expect(splitReference("'It''s'!A1")).toEqual({ sheet: "It's", range: 'A1' })
    expect(splitReference('Sheet1!$A$2')).toEqual({ sheet: 'Sheet1', range: 'A2' })
    expect(splitReference('B3:C4')).toEqual({ sheet: null, range: 'B3:C4' })
    expect(splitReference('#REF!')).toBeNull()
  })

  it('a fingerprint changes with the sheets, not with the kept file', () => {
    const a = fingerprint(EVERYTHING)
    expect(fingerprint(structuredClone(EVERYTHING))).toBe(a)
    expect(
      fingerprint({
        ...EVERYTHING,
        file: { format: 'xlsx', app: 'gridcraft', data: 'x', basis: a },
      }),
    ).toBe(a)
    const changed = structuredClone(EVERYTHING)
    changed.sheets[0].cells.A2.input = 'Rent!'
    expect(fingerprint(changed)).not.toBe(a)
  })
})
