/** Descriptive statistics and correlation for the Statistics section. */
import type { Table } from './transform'
import { toNumber } from './transform'

export function numbers(
  table: Table,
  column: string,
  where?: (row: Table['rows'][number]) => boolean,
): number[] {
  const i = table.columns.findIndex((c) => c.name === column)
  if (i === -1) return []
  return table.rows
    .filter((r) => !where || where(r))
    .map((r) => toNumber(r[i]))
    .filter((v): v is number => v !== null)
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN
  const pos = (sorted.length - 1) * q
  const low = Math.floor(pos)
  const high = Math.ceil(pos)
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low)
}

export interface Summary {
  count: number
  mean: number
  median: number
  sd: number
  min: number
  max: number
  q1: number
  q3: number
}

export function summarise(values: number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b)
  const count = values.length
  const mean = count ? values.reduce((s, v) => s + v, 0) / count : NaN
  // Sample standard deviation (n − 1), as spreadsheets' STDEV does.
  const sd =
    count > 1
      ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (count - 1))
      : NaN
  return {
    count,
    mean,
    median: quantile(sorted, 0.5),
    sd,
    min: sorted[0] ?? NaN,
    max: sorted[count - 1] ?? NaN,
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
  }
}

/** Pearson correlation of two columns, using rows where both are numbers. */
export function correlation(
  table: Table,
  a: string,
  b: string,
): { r: number; n: number } {
  const ia = table.columns.findIndex((c) => c.name === a)
  const ib = table.columns.findIndex((c) => c.name === b)
  const pairs = table.rows
    .map((row) => [toNumber(row[ia]), toNumber(row[ib])] as const)
    .filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null)
  const n = pairs.length
  if (n < 3) return { r: NaN, n }
  const ma = pairs.reduce((s, p) => s + p[0], 0) / n
  const mb = pairs.reduce((s, p) => s + p[1], 0) / n
  let cov = 0
  let va = 0
  let vb = 0
  for (const [x, y] of pairs) {
    cov += (x - ma) * (y - mb)
    va += (x - ma) ** 2
    vb += (y - mb) ** 2
  }
  return { r: cov / Math.sqrt(va * vb), n }
}

export function describeCorrelation(r: number): string {
  const a = Math.abs(r)
  const strength =
    a >= 0.7 ? 'strong' : a >= 0.4 ? 'moderate' : a >= 0.2 ? 'weak' : 'little or no'
  return `${strength}${a >= 0.2 ? (r > 0 ? ' positive' : ' negative') : ''} relationship`
}
