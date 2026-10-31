/** The result of each check of a submission: what was right, what to fix and why it matters. */
import { useState } from 'react'
import type { Assignment } from '../../content/schemas'
import type { Attempt } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'

const STATUS_STYLES = {
  passed: { icon: 'bg-emerald-600 text-white', label: 'Done well' },
  partial: { icon: 'bg-amber-500 text-white', label: 'Partly right' },
  failed: { icon: 'bg-red-600 text-white', label: 'Needs work' },
} as const

export function CheckResultsList({
  assignment,
  checks,
}: {
  assignment: Assignment
  checks: Attempt['checks']
}) {
  const [whyOpen, setWhyOpen] = useState<Set<string>>(new Set())

  return (
    <ul className="space-y-2" data-testid="check-results">
      {checks.map((check) => {
        const definition =
          assignment.checks.find((c) => c.id === check.id) ??
          assignment.deliverables.flatMap((d) => d.checks).find((c) => c.id === check.id)
        const style = STATUS_STYLES[check.status]
        return (
          <li
            key={check.id}
            className="rounded-lg border border-slate-200 bg-white p-3"
            data-status={check.status}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.icon}`}
                aria-label={style.label}
              >
                {check.status === 'passed' ? (
                  <Icon name="check" className="h-3.5 w-3.5" />
                ) : check.status === 'partial' ? (
                  '~'
                ) : (
                  '!'
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-slate-900">
                    {definition?.title ?? check.id}
                  </p>
                  <span className="shrink-0 text-sm text-slate-500 tabular-nums">
                    {check.earned}/{check.points} points
                  </span>
                </div>
                {check.problems.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                    {check.problems.map((problem) => (
                      <li key={problem}>• {problem}</li>
                    ))}
                  </ul>
                )}
                {check.status !== 'passed' && definition && (
                  <p className="mt-2 rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-900">
                    <strong>How to fix it:</strong> {definition.hint}
                  </p>
                )}
                {definition &&
                  (whyOpen.has(check.id) ? (
                    <p className="mt-2 text-sm text-slate-600">
                      <strong>Why it matters:</strong> {definition.why}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWhyOpen(new Set(whyOpen).add(check.id))}
                      className="mt-1 text-sm text-blue-700 hover:underline"
                    >
                      Why it matters
                    </button>
                  ))}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
