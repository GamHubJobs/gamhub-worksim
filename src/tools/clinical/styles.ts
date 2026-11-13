/** Shared pieces of the Ward Systems screens. */
import type { Result } from './model'
import type { ClinicalState } from './schema'

/** Runs an action on the current state; returns whether it worked (problems are shown). */
export type Run = (fn: (s: ClinicalState) => Result) => boolean

export const field =
  'rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 disabled:bg-slate-100'
export const primary =
  'rounded bg-teal-700 px-3 py-1 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50'
export const secondary =
  'rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50'
