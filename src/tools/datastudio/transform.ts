/**
 * Cleaning and transforming: each dataset's steps applied in order to its
 * raw rows. Pure, so the clean table can be shown, queried and graded.
 */
import type { Column, ColumnType, Dataset, Step, Value } from './schema'

export interface Table {
  columns: Column[]
  rows: Value[][]
}

const isBlank = (v: Value) => v === null || (typeof v === 'string' && v.trim() === '')

/** Text that looks like a number ("£1,200.50", " 42 ") becomes the number; otherwise null. */
export function toNumber(v: Value): number | null {
  if (typeof v === 'number') return v
  if (v === null) return null
  const text = v.replace(/[£$€,\s]/g, '')
  if (text === '' || !/^-?\d+(\.\d+)?$/.test(text)) return null
  return Number(text)
}

/** Dates as YYYY-MM-DD, from YYYY-MM-DD or DD/MM/YYYY; otherwise null. */
export function toDate(v: Value): string | null {
  if (v === null) return null
  const text = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)
  if (uk) return `${uk[3]}-${uk[2].padStart(2, '0')}-${uk[1].padStart(2, '0')}`
  return null
}

const proper = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())

function convert(v: Value, to: ColumnType): Value {
  if (to === 'number') return toNumber(v)
  if (to === 'date') return toDate(v)
  return v === null ? null : String(v)
}

function compare(v: Value, op: string, target: string): boolean {
  if (op === 'contains')
    return String(v ?? '')
      .toLowerCase()
      .includes(target.toLowerCase())
  const n = toNumber(target)
  const left = typeof v === 'number' && n !== null ? v : String(v ?? '').toLowerCase()
  const right = typeof v === 'number' && n !== null ? n : target.toLowerCase()
  if (op === '=') return left === right
  if (op === '!=') return left !== right
  if (op === '>') return left > right
  return left < right
}

/** Applies one step. Returns an error message instead if it can't be applied. */
export function applyStep(table: Table, step: Step): Table | string {
  const index =
    'column' in step ? table.columns.findIndex((c) => c.name === step.column) : -1
  if ('column' in step && index === -1) return `There is no column called ${step.column}.`
  const mapColumn = (fn: (v: Value) => Value): Table => ({
    columns: table.columns,
    rows: table.rows.map((r) => r.map((v, i) => (i === index ? fn(v) : v))),
  })
  switch (step.kind) {
    case 'trim':
      return mapColumn((v) =>
        typeof v === 'string' ? v.trim().replace(/\s{2,}/g, ' ') : v,
      )
    case 'case':
      return mapColumn((v) =>
        typeof v !== 'string'
          ? v
          : step.to === 'upper'
            ? v.toUpperCase()
            : step.to === 'lower'
              ? v.toLowerCase()
              : proper(v),
      )
    case 'replace':
      return mapColumn((v) =>
        typeof v === 'string' && step.find !== ''
          ? v.split(step.find).join(step.with)
          : v,
      )
    case 'type': {
      const converted = mapColumn((v) => convert(v, step.to))
      return {
        columns: table.columns.map((c, i) => (i === index ? { ...c, type: step.to } : c)),
        rows: converted.rows,
      }
    }
    case 'dedupe': {
      const keys = step.columns.length
        ? step.columns.map((name) => table.columns.findIndex((c) => c.name === name))
        : table.columns.map((_, i) => i)
      if (keys.includes(-1)) return 'One of the columns does not exist.'
      const seen = new Set<string>()
      return {
        columns: table.columns,
        rows: table.rows.filter((r) => {
          const key = JSON.stringify(
            keys.map((k) =>
              typeof r[k] === 'string' ? (r[k] as string).toLowerCase() : r[k],
            ),
          )
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }),
      }
    }
    case 'remove-blank':
      return {
        columns: table.columns,
        rows: table.rows.filter((r) => !isBlank(r[index])),
      }
    case 'fill':
      return mapColumn((v) =>
        isBlank(v) ? convert(step.value, table.columns[index].type) : v,
      )
    case 'filter':
      return {
        columns: table.columns,
        rows: table.rows.filter((r) => compare(r[index], step.op, step.value)),
      }
    case 'rename':
      if (table.columns.some((c) => c.name === step.to))
        return `There is already a column called ${step.to}.`
      return {
        columns: table.columns.map((c, i) => (i === index ? { ...c, name: step.to } : c)),
        rows: table.rows,
      }
    case 'calculate': {
      if (table.columns.some((c) => c.name === step.name)) {
        return `There is already a column called ${step.name}.`
      }
      const left = table.columns.findIndex((c) => c.name === step.left)
      if (left === -1) return `There is no column called ${step.left}.`
      const rightColumn = table.columns.findIndex((c) => c.name === step.right)
      const constant = rightColumn === -1 ? toNumber(step.right) : null
      if (rightColumn === -1 && constant === null) {
        return `“${step.right}” is not a column or a number.`
      }
      return {
        columns: [...table.columns, { name: step.name, type: 'number' }],
        rows: table.rows.map((r) => {
          const a = toNumber(r[left])
          const b = rightColumn === -1 ? constant : toNumber(r[rightColumn])
          let v: number | null = null
          if (a !== null && b !== null) {
            if (step.op === '+') v = a + b
            else if (step.op === '-') v = a - b
            else if (step.op === '*') v = a * b
            else v = b === 0 ? null : a / b
          }
          return [...r, v === null ? null : Math.round(v * 1e6) / 1e6]
        }),
      }
    }
    case 'remove-column':
      return {
        columns: table.columns.filter((_, i) => i !== index),
        rows: table.rows.map((r) => r.filter((_, i) => i !== index)),
      }
  }
}

/** The clean table: every step applied. A step that fails is reported, and skipped. */
export function cleanTable(dataset: Dataset): {
  table: Table
  errors: Array<{ step: number; message: string }>
} {
  let table: Table = { columns: dataset.columns, rows: dataset.rows }
  const errors: Array<{ step: number; message: string }> = []
  dataset.steps.forEach((step, i) => {
    const next = applyStep(table, step)
    if (typeof next === 'string') errors.push({ step: i, message: next })
    else table = next
  })
  return { table, errors }
}

export function describeStep(step: Step): string {
  switch (step.kind) {
    case 'trim':
      return `Trim spaces in ${step.column}`
    case 'case':
      return `${step.to === 'proper' ? 'Capitalise each word' : step.to === 'upper' ? 'UPPER CASE' : 'lower case'} in ${step.column}`
    case 'replace':
      return `Replace “${step.find}” with “${step.with}” in ${step.column}`
    case 'type':
      return `Change ${step.column} to ${step.to}`
    case 'dedupe':
      return step.columns.length
        ? `Remove duplicate rows (by ${step.columns.join(', ')})`
        : 'Remove duplicate rows'
    case 'remove-blank':
      return `Remove rows where ${step.column} is blank`
    case 'fill':
      return `Fill blanks in ${step.column} with “${step.value}”`
    case 'filter':
      return `Keep rows where ${step.column} ${step.op} ${step.value}`
    case 'rename':
      return `Rename ${step.column} to ${step.to}`
    case 'remove-column':
      return `Remove column ${step.column}`
    case 'calculate':
      return `New column ${step.name} = ${step.left} ${step.op} ${step.right}`
  }
}

/** Quality summary of a column: blanks, distinct values, values that aren't numbers. */
export function profile(table: Table, column: string) {
  const i = table.columns.findIndex((c) => c.name === column)
  const values = table.rows.map((r) => r[i])
  const blanks = values.filter(isBlank).length
  const distinct = new Set(values.filter((v) => !isBlank(v)).map((v) => String(v))).size
  const notNumbers = values.filter((v) => !isBlank(v) && toNumber(v) === null).length
  return { blanks, distinct, notNumbers, count: values.length }
}
