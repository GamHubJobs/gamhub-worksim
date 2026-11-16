/**
 * Small pieces the Projects app's tabs share: cards, measures, the
 * simulation note, revision badges.
 */
import type { ReactNode } from 'react'
import type { Revision } from '../../engineering/state'

export function Card({
  title,
  children,
  actions,
  testId,
}: {
  title?: ReactNode
  children: ReactNode
  actions?: ReactNode
  testId?: string
}) {
  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      data-testid={testId}
    >
      {(title || actions) && (
        <div className="mb-2 flex items-start justify-between gap-3">
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Measure({
  label,
  value,
  max = 100,
}: {
  label: string
  value: number
  max?: number
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const colour = pct >= 70 ? 'bg-emerald-600' : pct >= 45 ? 'bg-amber-500' : 'bg-red-600'
  return (
    <div className="text-xs">
      <div className="flex justify-between text-slate-600">
        <span>{label}</span>
        <span className="font-medium text-slate-900">{Math.round(value)}</span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={`h-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SimulationNote() {
  return (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
      Simulation for learning: standard formulas with simplified, fictional loads, limits
      and prices. Real designs need the applicable codes and a qualified engineer.
    </p>
  )
}

const BADGE: Record<Revision['status'], string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-300',
  submitted: 'bg-blue-50 text-blue-800 ring-blue-200',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-red-50 text-red-800 ring-red-200',
  superseded: 'bg-slate-50 text-slate-500 ring-slate-200',
}

const STATUS: Record<Revision['status'], string> = {
  draft: 'Draft',
  submitted: 'Being checked',
  approved: 'Approved',
  rejected: 'Returned',
  superseded: 'Superseded',
}

export function RevisionBadge({ revision }: { revision: Revision }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${BADGE[revision.status]}`}
      data-testid="revision-badge"
    >
      Revision {revision.n} · {STATUS[revision.status]}
    </span>
  )
}

export const BUTTON =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
export const PRIMARY =
  'rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50'
