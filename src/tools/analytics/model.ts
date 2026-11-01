/** Site Analytics: grouping, rates and the funnel. */
import type { AnalyticsState, Dimension, Report, TrafficRow } from './schema'

export const DIMENSION_NAMES: Record<Dimension, string> = {
  source: 'Traffic source',
  device: 'Device',
  landing: 'Landing page',
}

export interface Totals {
  sessions: number
  engaged: number
  pricing: number
  formStarts: number
  bookings: number
  engagementRate: number
  conversionRate: number
  /** Bookings ÷ form starts: how many people who start the form finish it. */
  formCompletion: number
}

const div = (a: number, b: number) => (b === 0 ? 0 : a / b)

export function totals(rows: TrafficRow[]): Totals {
  const sum = (key: 'sessions' | 'engaged' | 'pricing' | 'formStarts' | 'bookings') =>
    rows.reduce((s, r) => s + r[key], 0)
  const sessions = sum('sessions')
  const engaged = sum('engaged')
  const pricing = sum('pricing')
  const formStarts = sum('formStarts')
  const bookings = sum('bookings')
  return {
    sessions,
    engaged,
    pricing,
    formStarts,
    bookings,
    engagementRate: div(engaged, sessions),
    conversionRate: div(bookings, sessions),
    formCompletion: div(bookings, formStarts),
  }
}

export function filtered(
  state: AnalyticsState,
  filters: Report['filters'],
): TrafficRow[] {
  return state.rows.filter(
    (r) =>
      (!filters.source || r.source === filters.source) &&
      (!filters.device || r.device === filters.device),
  )
}

/** One row per value of the dimension, with totals, largest first. */
export function breakdown(
  state: AnalyticsState,
  dimension: Dimension,
  filters: Report['filters'] = {},
) {
  const groups = new Map<string, TrafficRow[]>()
  for (const row of filtered(state, filters)) {
    groups.set(row[dimension], [...(groups.get(row[dimension]) ?? []), row])
  }
  return [...groups.entries()]
    .map(([value, rows]) => ({ value, ...totals(rows) }))
    .sort((a, b) => b.sessions - a.sessions)
}

export function values(state: AnalyticsState, dimension: Dimension): string[] {
  return [...new Set(state.rows.map((r) => r[dimension]))].sort()
}

export function saveReport(
  state: AnalyticsState,
  report: Report,
): { state: AnalyticsState; problems: string[] } {
  if (!report.name.trim()) return { state, problems: ['Give the report a name.'] }
  if (
    state.reports.some((r) => r.name.toLowerCase() === report.name.trim().toLowerCase())
  ) {
    return { state, problems: ['A report with that name already exists.'] }
  }
  return {
    state: {
      ...state,
      reports: [...state.reports, { ...report, name: report.name.trim() }],
    },
    problems: [],
  }
}

export function deleteReport(state: AnalyticsState, name: string): AnalyticsState {
  return { ...state, reports: state.reports.filter((r) => r.name !== name) }
}

export function answer(state: AnalyticsState, id: string, value: string): AnalyticsState {
  return {
    ...state,
    questions: state.questions.map((q) => (q.id === id ? { ...q, answer: value } : q)),
  }
}
