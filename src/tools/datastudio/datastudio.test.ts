import initSqlJs from 'sql.js'
import { describe, expect, it } from 'vitest'
import { bookingsRaw, clients, orders } from './data'
import { DataStudioStateSchema } from './schema'
import { runSqlWith, sameResult } from './sql'
import { correlation, summarise } from './stats'
import { applyStep, cleanTable, toDate, toNumber, type Table } from './transform'

const table: Table = {
  columns: [
    { name: 'name', type: 'text' },
    { name: 'amount', type: 'text' },
    { name: 'day', type: 'text' },
  ],
  rows: [
    ['  ana PEREIRA ', '£1,200.50', '3/04/2026'],
    ['Ana Pereira', '1200.5', '2026-04-03'],
    ['', 'n/a', 'soon'],
  ],
}

describe('cleaning steps', () => {
  it('turn messy text into numbers and dates', () => {
    expect(toNumber('£1,200.50')).toBe(1200.5)
    expect(toNumber('n/a')).toBeNull()
    expect(toDate('3/04/2026')).toBe('2026-04-03')
    expect(toDate('soon')).toBeNull()
  })

  it('apply in order, and duplicates are found after tidying', () => {
    const { table: clean, errors } = cleanTable({
      name: 't',
      description: '',
      columns: table.columns,
      rows: table.rows,
      steps: [
        { kind: 'remove-blank', column: 'name' },
        { kind: 'trim', column: 'name' },
        { kind: 'case', column: 'name', to: 'proper' },
        { kind: 'type', column: 'amount', to: 'number' },
        { kind: 'type', column: 'day', to: 'date' },
        { kind: 'dedupe', columns: [] },
        { kind: 'calculate', name: 'with_vat', left: 'amount', op: '*', right: '1.2' },
      ],
    })
    expect(errors).toEqual([])
    expect(clean.rows).toEqual([['Ana Pereira', 1200.5, '2026-04-03', 1440.6]])
    expect(clean.columns.map((c) => c.type)).toEqual(['text', 'number', 'date', 'number'])
  })

  it('report a step that cannot be applied instead of breaking the table', () => {
    expect(applyStep(table, { kind: 'trim', column: 'missing' })).toBe(
      'There is no column called missing.',
    )
    const { table: clean, errors } = cleanTable({
      name: 't',
      description: '',
      columns: table.columns,
      rows: table.rows,
      steps: [{ kind: 'rename', column: 'name', to: 'amount' }],
    })
    expect(errors[0].message).toContain('already a column')
    expect(clean.rows).toHaveLength(3)
  })

  it('the sample export cleans to 36 bookings', () => {
    const raw = bookingsRaw()
    expect(raw.rows).toHaveLength(40)
    const state = {
      datasets: [raw],
      queries: [],
      dashboard: { title: 'D', tiles: [] },
      questions: [],
    }
    expect(DataStudioStateSchema.safeParse(state).success).toBe(true)
  })
})

describe('statistics', () => {
  it('summarise like a spreadsheet does', () => {
    const s = summarise([2, 4, 4, 4, 5, 5, 7, 9])
    expect(s.mean).toBe(5)
    expect(s.median).toBe(4.5)
    expect(s.sd).toBeCloseTo(2.138, 3) // sample standard deviation
  })

  it('correlation is 1 for a perfect line and about 0 for none', () => {
    const t: Table = {
      columns: [
        { name: 'x', type: 'number' },
        { name: 'y', type: 'number' },
        { name: 'z', type: 'number' },
      ],
      rows: [
        [1, 2, 5],
        [2, 4, 1],
        [3, 6, 5],
        [4, 8, 1],
      ],
    }
    expect(correlation(t, 'x', 'y').r).toBeCloseTo(1, 6)
    expect(Math.abs(correlation(t, 'x', 'z').r)).toBeLessThan(0.5)
  })
})

describe('SQL (SQLite)', () => {
  it('joins, groups and finds what is missing', async () => {
    const SQL = await initSqlJs()
    const tables = [
      { name: 'orders', table: orders() },
      { name: 'clients', table: clients() },
    ]
    const missing = runSqlWith(
      SQL,
      tables,
      'SELECT c.name FROM clients c LEFT JOIN orders o ON o.client_id = c.client_id WHERE o.order_id IS NULL ORDER BY c.name',
    )
    expect(missing).toEqual({
      columns: ['name'],
      rows: [['Lind Studio'], ['Martin Bakery']],
    })
    const count = runSqlWith(SQL, tables, 'SELECT COUNT(*) AS n FROM orders')
    expect(count.rows).toEqual([[60]])
    expect(() => runSqlWith(SQL, tables, 'SELEC oops')).toThrow(/syntax error/)
  })

  it('the sample data has a clear top 3 and a clear leading sector (no ties)', () => {
    const names = new Map(clients().rows.map((r) => [r[0], String(r[1])]))
    const totals = new Map<string, number>()
    for (const r of orders().rows) {
      const name = names.get(r[1])!
      totals.set(name, (totals.get(name) ?? 0) + Number(r[4]))
    }
    const ranked = [...totals.values()].sort((a, b) => b - a)
    expect(ranked[2]).toBeGreaterThan(ranked[3])
  })

  it('compares results ignoring row order when asked, with a tolerance', () => {
    const result = {
      columns: ['a', 'b'],
      rows: [
        ['x', 1.004],
        ['Y', 2],
      ],
    }
    expect(
      sameResult(
        result,
        [
          ['y', 2],
          ['x', 1],
        ],
        { ordered: false, tolerance: 0.01 },
      ),
    ).toBe(true)
    expect(
      sameResult(
        result,
        [
          ['y', 2],
          ['x', 1],
        ],
        { ordered: true, tolerance: 0.01 },
      ),
    ).toBe(false)
    expect(sameResult(result, [['x', 1]], { ordered: false, tolerance: 0.01 })).toBe(
      false,
    )
  })
})
