import { describe, expect, it } from 'vitest'
import type { SheetContent } from '../../persistence/schemas'
import { SheetContentSchema } from '../../persistence/schemas'
import { createCalculator } from './engine/workbook'
import {
  addChart,
  addConditionalFormat,
  addValidation,
  chartSpec,
  checkInput,
  conditionalStyles,
  dataRegion,
  hiddenRows,
  looksLikeHeader,
  meetsCondition,
  normaliseInput,
  setFilter,
  sortRange,
  validationFor,
} from './features'
import { createSheetContent, parseRange, setCells } from './model'

/** A small budget table: category, budget, actual, and a formula per row. */
function budget(): SheetContent {
  const empty = createSheetContent()
  const id = empty.sheets[0].id
  const inputs: Record<string, string> = {
    A1: 'Category',
    B1: 'Budget',
    C1: 'Actual',
    D1: 'Left',
    A2: 'Travel',
    B2: '1800',
    C2: '1866.25',
    D2: '=B2-C2',
    A3: 'Training',
    B3: '1200',
    C3: '975',
    D3: '=B3-C3',
    A4: 'Software',
    B4: '600',
    C4: '724',
    D4: '=B4-C4',
  }
  return setCells(
    empty,
    id,
    Object.fromEntries(Object.entries(inputs).map(([a, input]) => [a, { input }])),
  )
}

const range = (text: string) => parseRange(text)!

describe('charts', () => {
  it('reads labels from the first column and series from the header row', () => {
    const content = budget()
    const sheetId = content.sheets[0].id
    const { content: withChart, chartId } = addChart(
      content,
      sheetId,
      range('A1:C4'),
      'column',
      'Budget vs actual',
    )
    const sheet = withChart.sheets[0]
    const chart = sheet.charts!.find((c) => c.id === chartId)!
    expect(chart.range).toBe('A1:C4')
    const spec = chartSpec(createCalculator(withChart), sheetId, chart)
    expect(spec.labels).toEqual(['Travel', 'Training', 'Software'])
    expect(spec.series).toEqual([
      { name: 'Budget', values: [1800, 1200, 600] },
      { name: 'Actual', values: [1866.25, 975, 724] },
    ])
    expect(SheetContentSchema.safeParse(withChart).success).toBe(true)
  })

  it('updates as the data changes, and uses calculated values', () => {
    const content = budget()
    const sheetId = content.sheets[0].id
    const { content: withChart } = addChart(content, sheetId, range('A1:A4'), 'bar', '')
    const chart = { ...withChart.sheets[0].charts![0], range: 'D1:D4' }
    expect(chartSpec(createCalculator(withChart), sheetId, chart).series[0]).toEqual({
      name: 'Left',
      values: [-66.25, 225, -124],
    })
  })

  it('shows one series in a pie chart', () => {
    const content = budget()
    const sheetId = content.sheets[0].id
    const chart = { id: sheetId, type: 'pie' as const, title: '', range: 'A1:C4' }
    expect(chartSpec(createCalculator(content), sheetId, chart).series).toHaveLength(1)
  })
})

describe('conditional formatting', () => {
  it('evaluates conditions on numbers and text', () => {
    expect(meetsCondition({ op: 'gt', value: '100' }, 150)).toBe(true)
    expect(meetsCondition({ op: 'gt', value: '100' }, '150')).toBe(true)
    expect(meetsCondition({ op: 'lt', value: '0' }, 5)).toBe(false)
    expect(meetsCondition({ op: 'between', value: '10', value2: '1' }, 5)).toBe(true)
    expect(meetsCondition({ op: 'eq', value: 'over budget' }, 'Over budget')).toBe(true)
    expect(meetsCondition({ op: 'contains', value: 'over' }, 'Over budget')).toBe(true)
    expect(meetsCondition({ op: 'blank', value: '' }, null)).toBe(true)
    expect(meetsCondition({ op: 'gt', value: '100' }, 'Travel')).toBe(false)
  })

  it('styles the cells that meet the rule, using calculated values', () => {
    const base = budget()
    const content = addConditionalFormat(base, base.sheets[0].id, {
      range: 'D2:D4',
      rule: { op: 'lt', value: '0' },
      style: { fill: 'red', bold: true },
    })
    const sheet = content.sheets[0]
    const styles = conditionalStyles(createCalculator(content), sheet)
    expect(styles.get('D2')).toEqual({ fill: 'red', bold: true })
    expect(styles.has('D3')).toBe(false)
    expect(styles.get('D4')).toEqual({ fill: 'red', bold: true })
  })
})

describe('data validation', () => {
  it('allows only list items, matching them regardless of case', () => {
    const base = budget()
    const content = addValidation(base, base.sheets[0].id, {
      range: 'E2:E4',
      rule: { type: 'list', items: ['Approved', 'Rejected'] },
    })
    const validation = validationFor(content.sheets[0], 'E3')
    expect(validation).not.toBeNull()
    expect(validationFor(content.sheets[0], 'F3')).toBeNull()
    expect(checkInput(validation, 'approved')).toBeNull()
    expect(normaliseInput(validation, 'approved')).toBe('Approved')
    expect(checkInput(validation, 'Maybe')).toBe('Choose one of: Approved, Rejected.')
    expect(checkInput(validation, '')).toBeNull()
  })

  it('checks numbers against limits', () => {
    const rule = {
      id: budget().sheets[0].id,
      range: 'B2:B4',
      rule: { type: 'number' as const, min: 0, max: 5000, wholeNumber: true },
    }
    expect(checkInput(rule, '1200')).toBeNull()
    expect(checkInput(rule, 'lots')).toBe('This cell needs a number.')
    expect(checkInput(rule, '-5')).toBe('The number must be at least 0.')
    expect(checkInput(rule, '12.5')).toBe('This cell needs a whole number.')
    expect(checkInput(rule, '=B2*2')).toBeNull()
  })
})

describe('filtering', () => {
  it('hides rows whose values are not chosen', () => {
    const content = budget()
    const sheetId = content.sheets[0].id
    const filtered = setFilter(content, sheetId, {
      range: 'A1:D4',
      shown: { A: ['Travel', 'Software'] },
    })
    const sheet = filtered.sheets[0]
    expect([...hiddenRows(createCalculator(filtered), sheet)]).toEqual([2])
    const cleared = setFilter(filtered, sheetId, undefined)
    expect(cleared.sheets[0].filter).toBeUndefined()
  })

  it('finds the table around a cell', () => {
    const sheet = budget().sheets[0]
    expect(dataRegion(sheet, range('B3'))).toEqual(range('A1:D4'))
  })
})

describe('sorting', () => {
  it('sorts rows by a column, keeps the header and adjusts formulas', () => {
    const content = budget()
    const sheetId = content.sheets[0].id
    const calculator = createCalculator(content)
    expect(looksLikeHeader(calculator, sheetId, range('A1:D4'))).toBe(true)
    const sorted = sortRange(
      content,
      calculator,
      sheetId,
      range('A1:D4'),
      2,
      'desc',
      true,
    )
    const cells = sorted.sheets[0].cells
    expect(cells.A1.input).toBe('Category')
    expect([cells.A2.input, cells.A3.input, cells.A4.input]).toEqual([
      'Travel',
      'Training',
      'Software',
    ])
    const ascending = sortRange(
      content,
      calculator,
      sheetId,
      range('A1:D4'),
      0,
      'asc',
      true,
    )
    const a = ascending.sheets[0].cells
    expect([a.A2.input, a.A3.input, a.A4.input]).toEqual([
      'Software',
      'Training',
      'Travel',
    ])
    // Each row's formula still refers to its own row.
    expect(a.D2.input).toBe('=B2-C2')
    expect(a.D4.input).toBe('=B4-C4')
    expect(createCalculator(ascending).getValue(sheetId, 'D2')).toBe(-124)
  })
})
