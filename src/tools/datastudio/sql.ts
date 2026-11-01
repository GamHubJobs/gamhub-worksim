/**
 * Runs SQL against the clean tables, with SQLite (sql.js, MIT licence). This
 * core works anywhere sql.js is loaded; in the browser it runs in a worker
 * (see sqlWorker.ts) so a slow query can't freeze the page.
 */
import type { SqlJsStatic } from 'sql.js'
import type { Result, Value } from './schema'
import type { Table } from './transform'

export const MAX_RESULT_ROWS = 500

export interface NamedTable {
  name: string
  table: Table
}

export function runSqlWith(SQL: SqlJsStatic, tables: NamedTable[], sql: string): Result {
  const db = new SQL.Database()
  try {
    for (const { name, table } of tables) {
      const columns = table.columns
        .map((c) => `"${c.name}" ${c.type === 'number' ? 'REAL' : 'TEXT'}`)
        .join(', ')
      db.run(`CREATE TABLE "${name}" (${columns})`)
      const insert = db.prepare(
        `INSERT INTO "${name}" VALUES (${table.columns.map(() => '?').join(', ')})`,
      )
      for (const row of table.rows)
        insert.run(row.map((v) => (v === undefined ? null : v)))
      insert.free()
    }
    if (!sql.trim()) throw new Error('Write a query first.')
    const results = db.exec(sql)
    const last = results[results.length - 1]
    if (!last) return { columns: [], rows: [] }
    return {
      columns: last.columns,
      rows: last.values.slice(0, MAX_RESULT_ROWS).map((row) =>
        row.map((v): Value => {
          if (typeof v === 'number') return Math.round(v * 1e6) / 1e6
          if (v === null) return null
          return String(v)
        }),
      ),
    }
  } finally {
    db.close()
  }
}

/** Whether a result matches the expected rows (numbers to a tolerance, text ignoring case). */
export function sameResult(
  result: Result,
  expected: Value[][],
  { ordered, tolerance }: { ordered: boolean; tolerance: number },
): boolean {
  if (result.rows.length !== expected.length) return false
  const cellEqual = (a: Value, b: Value) =>
    typeof a === 'number' && typeof b === 'number'
      ? Math.abs(a - b) <= tolerance
      : String(a ?? '')
          .trim()
          .toLowerCase() ===
        String(b ?? '')
          .trim()
          .toLowerCase()
  const rowEqual = (a: Value[], b: Value[]) =>
    a.length === b.length && a.every((v, i) => cellEqual(v, b[i]))
  if (ordered) return expected.every((row, i) => rowEqual(result.rows[i], row))
  const remaining = [...result.rows]
  return expected.every((row) => {
    const i = remaining.findIndex((r) => rowEqual(r, row))
    if (i === -1) return false
    remaining.splice(i, 1)
    return true
  })
}
