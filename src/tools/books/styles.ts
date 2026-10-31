/** Names and styles shared by the Books screens. */
import type { AccountType } from './schema'

export const TYPE_NAMES: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
}

export const cell = 'px-3 py-1.5'
export const numeric = `${cell} text-right tabular-nums`

export const PRIMARY =
  'rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50'
export const SECONDARY =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50'
export const POST =
  'rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800'
