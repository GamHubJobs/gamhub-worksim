/** Shared pieces of the Works Desk screens. */
import type { Result } from './model'
import type { EngineeringState } from './schema'

/** Runs an action on the current state; returns whether it worked (problems are shown). */
export type Run = (fn: (s: EngineeringState) => Result) => boolean

export const field =
  'rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 disabled:bg-slate-100'
export const primary =
  'rounded bg-orange-700 px-3 py-1 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-50'
export const secondary =
  'rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50'
export const card = 'rounded border border-slate-200 bg-white p-3 text-sm'
