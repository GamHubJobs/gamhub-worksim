/** Small shared pieces for the IT Operations screens. */
import { useState, type ReactNode } from 'react'
import type { DeployResult } from './deployment'
import type { Result } from './model'
import type { ItopsState } from './schema'

export const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
export const PRIMARY =
  'rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40'
export const INPUT =
  'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-teal-600 focus:outline-none'
export const CARD = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'

export type Tone = 'green' | 'red' | 'amber' | 'slate' | 'blue'

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const tones: Record<Tone, string> = {
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-900',
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-900',
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const tone = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-teal-600'
  return (
    <span className="flex items-center gap-2" title={`${label} ${pct}%`}>
      <span
        className="block h-1.5 w-full min-w-12 max-w-24 overflow-hidden rounded-full bg-slate-200"
        role="meter"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className={`block h-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-9 text-xs text-slate-700 tabular-nums">{pct}%</span>
    </span>
  )
}

/** A consequential action: asks once more, in place, saying what it will do. */
export function ConfirmButton({
  label,
  confirm,
  onConfirm,
  disabled,
}: {
  label: string
  confirm: string
  onConfirm: () => void
  disabled?: boolean
}) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button
        type="button"
        className={BUTTON}
        disabled={disabled}
        onClick={() => setAsking(true)}
      >
        {label}
      </button>
    )
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-950">
      {confirm}
      <button
        type="button"
        className="rounded bg-red-700 px-2 py-0.5 font-medium text-white"
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        Yes, {label.toLowerCase()}
      </button>
      <button
        type="button"
        className="rounded px-1.5 py-0.5 underline"
        onClick={() => setAsking(false)}
      >
        Cancel
      </button>
    </span>
  )
}

export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: Array<[T, string]>
  value: T
  onChange: (id: T) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-1 border-b border-slate-200"
    >
      {tabs.map(([id, name]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${
            value === id
              ? 'border-teal-700 font-medium text-teal-900'
              : 'border-transparent text-slate-700 hover:text-slate-900'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

export interface Feedback {
  problems: string[]
  note?: string
}

export function FeedbackBar({
  feedback,
  onClose,
}: {
  feedback: Feedback
  onClose: () => void
}) {
  if (!feedback.problems.length && !feedback.note) return null
  const bad = feedback.problems.length > 0
  return (
    <div
      role={bad ? 'alert' : 'status'}
      data-testid="itops-feedback"
      className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm ${
        bad ? 'bg-red-50 text-red-900' : 'bg-emerald-50 text-emerald-950'
      }`}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        {feedback.problems.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {feedback.note && <p>{feedback.note}</p>}
      </div>
      <button type="button" className="text-xs underline" onClick={onClose}>
        Dismiss
      </button>
    </div>
  )
}

/** What every section gets from the workspace. */
export interface SectionProps {
  state: ItopsState
  editable: boolean
  /** Runs an action: applied only when it has no problems. */
  act: (fn: (s: ItopsState) => Result, done?: string) => Result
  /** Runs a deployment action: always applied (mistakes are counted). */
  deploy: (fn: (s: ItopsState) => DeployResult) => DeployResult
  now: () => number
  officeTime: () => string
  open: (section: string) => void
  tickets: Array<{ id: string; title: string; open: boolean }>
  setFeedback: (f: Feedback) => void
}
