/** Site Analytics: explore, funnel, saved reports and questions. */
import { useState } from 'react'
import type { ToolWorkspaceProps } from '../ui'
import { analytics } from './definition'
import {
  answer,
  breakdown,
  deleteReport,
  DIMENSION_NAMES,
  filtered,
  saveReport,
  totals,
  values,
} from './model'
import { DIMENSIONS, type AnalyticsState, type Dimension, type Report } from './schema'

type Props = ToolWorkspaceProps<AnalyticsState>
type Update = (change: (s: AnalyticsState) => AnalyticsState) => void

const cell = 'px-2.5 py-1.5'
const num = `${cell} text-right tabular-nums`
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50 disabled:opacity-40'

export default function AnalyticsWorkspace({ state, readOnly, onUpdate }: Props) {
  const [section, setSection] = useState('explore')
  const [dimension, setDimension] = useState<Dimension>('source')
  const [filters, setFilters] = useState<Report['filters']>({})
  const editable = !readOnly && !!onUpdate
  const update: Update = (change) => onUpdate?.(change)
  const open = (report: Report) => {
    setDimension(report.dimension)
    setFilters(report.filters)
    setSection('explore')
  }
  return (
    <div className="flex h-full min-h-0 bg-slate-50" data-testid="analytics">
      <nav
        aria-label="Site Analytics sections"
        className="w-48 shrink-0 space-y-0.5 border-r border-slate-200 bg-white p-2"
      >
        <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {state.site}
        </p>
        {analytics.sections
          .filter((s) => s.id !== 'questions' || state.questions.length > 0)
          .map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={section === s.id ? 'page' : undefined}
              className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm ${section === s.id ? 'bg-indigo-50 font-medium text-indigo-900' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              {s.name}
            </button>
          ))}
        <p className="px-2 pt-3 text-xs text-slate-500">{state.period}</p>
      </nav>
      <div
        className="min-w-0 flex-1 overflow-y-auto p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
        // Scrollable, so it can be reached and scrolled with the keyboard.
        tabIndex={0}
        role="region"
        aria-label="Work area"
      >
        {(section === 'explore' || section === 'funnel') && (
          <Filters state={state} filters={filters} onChange={setFilters} />
        )}
        {section === 'explore' && (
          <Explore
            state={state}
            dimension={dimension}
            filters={filters}
            onDimension={setDimension}
            editable={editable}
            update={update}
          />
        )}
        {section === 'funnel' && <Funnel state={state} filters={filters} />}
        {section === 'reports' && (
          <Reports state={state} editable={editable} update={update} onOpen={open} />
        )}
        {section === 'questions' && (
          <Questions state={state} editable={editable} update={update} />
        )}
      </div>
    </div>
  )
}

function Filters({
  state,
  filters,
  onChange,
}: {
  state: AnalyticsState
  filters: Report['filters']
  onChange: (f: Report['filters']) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate-600">Filters:</span>
      {(['source', 'device'] as const).map((key) => (
        <select
          key={key}
          aria-label={`Filter by ${DIMENSION_NAMES[key].toLowerCase()}`}
          value={filters[key] ?? ''}
          onChange={(e) => onChange({ ...filters, [key]: e.target.value || undefined })}
          className="rounded border border-slate-300 px-2 py-1"
        >
          <option value="">All {key === 'source' ? 'sources' : 'devices'}</option>
          {values(state, key).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      ))}
    </div>
  )
}

function Explore({
  state,
  dimension,
  filters,
  onDimension,
  editable,
  update,
}: {
  state: AnalyticsState
  dimension: Dimension
  filters: Report['filters']
  onDimension: (d: Dimension) => void
  editable: boolean
  update: Update
}) {
  const rows = breakdown(state, dimension, filters)
  const all = totals(filtered(state, filters))
  const [name, setName] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <div data-testid="explore">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-lg font-semibold text-slate-900">Explore</h2>
        <div className="flex gap-1" role="tablist">
          {DIMENSIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={dimension === d}
              onClick={() => onDimension(d)}
              className={`rounded-md px-3 py-1 text-sm ${dimension === d ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            >
              {DIMENSION_NAMES[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
            <tr>
              <th className={cell}>{DIMENSION_NAMES[dimension]}</th>
              <th className={`${cell} text-right`}>Sessions</th>
              <th className={`${cell} text-right`}>Engagement</th>
              <th className={`${cell} text-right`}>Pricing views</th>
              <th className={`${cell} text-right`}>Form starts</th>
              <th className={`${cell} text-right`}>Bookings</th>
              <th className={`${cell} text-right`}>Form completion</th>
              <th className={`${cell} text-right`}>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.value}
                className="border-t border-slate-100"
                data-testid="explore-row"
              >
                <td className={cell}>{r.value}</td>
                <td className={num}>{r.sessions.toLocaleString('en-GB')}</td>
                <td className={num}>{pct(r.engagementRate)}</td>
                <td className={num}>{r.pricing.toLocaleString('en-GB')}</td>
                <td className={num}>{r.formStarts.toLocaleString('en-GB')}</td>
                <td className={num}>{r.bookings}</td>
                <td className={num}>{pct(r.formCompletion)}</td>
                <td className={num}>{pct(r.conversionRate)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-semibold">
              <td className={cell}>Total</td>
              <td className={num}>{all.sessions.toLocaleString('en-GB')}</td>
              <td className={num}>{pct(all.engagementRate)}</td>
              <td className={num}>{all.pricing.toLocaleString('en-GB')}</td>
              <td className={num}>{all.formStarts.toLocaleString('en-GB')}</td>
              <td className={num}>{all.bookings}</td>
              <td className={num}>{pct(all.formCompletion)}</td>
              <td className={num}>{pct(all.conversionRate)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {editable && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            const report = { name, dimension, filters }
            const result = saveReport(state, report)
            if (result.problems.length > 0) return setProblem(result.problems[0])
            setProblem(null)
            update((s) => saveReport(s, report).state)
            setName('')
          }}
        >
          <input
            aria-label="Report name"
            placeholder="Name this view to save it"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64 rounded border border-slate-300 px-2 py-1"
          />
          <button type="submit" className={BUTTON}>
            Save report
          </button>
          {problem && (
            <span className="text-red-700" role="alert">
              {problem}
            </span>
          )}
        </form>
      )}
    </div>
  )
}

function Funnel({
  state,
  filters,
}: {
  state: AnalyticsState
  filters: Report['filters']
}) {
  const t = totals(filtered(state, filters))
  const steps = [
    ['Arrived (sessions)', t.sessions],
    ['Viewed pricing', t.pricing],
    ['Started the booking form', t.formStarts],
    ['Booked a review', t.bookings],
  ] as const
  return (
    <div data-testid="funnel">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Booking funnel</h2>
      <div className="space-y-2">
        {steps.map(([label, value], i) => {
          const prev = i === 0 ? value : steps[i - 1][1]
          return (
            <div
              key={label}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
              data-testid="funnel-step"
            >
              <div className="flex justify-between">
                <span className="font-medium">{label}</span>
                <span className="tabular-nums">
                  {value.toLocaleString('en-GB')}
                  {i > 0 && (
                    <span className="ml-2 text-slate-500">
                      ({pct(prev === 0 ? 0 : value / prev)} of the step before)
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-2 h-3 rounded bg-slate-100">
                <div
                  className="h-3 rounded bg-indigo-500"
                  style={{
                    width: `${steps[0][1] === 0 ? 0 : Math.max(0.5, (value / steps[0][1]) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Reports({
  state,
  editable,
  update,
  onOpen,
}: {
  state: AnalyticsState
  editable: boolean
  update: Update
  onOpen: (r: Report) => void
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Saved reports</h2>
      {state.reports.length === 0 ? (
        <p className="text-sm text-slate-500">
          No saved reports. Save a view from Explore.
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {state.reports.map((r) => (
            <li
              key={r.name}
              className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-1.5"
              data-testid="saved-report"
            >
              <button
                type="button"
                className="text-left text-indigo-700 underline"
                onClick={() => onOpen(r)}
              >
                {r.name}
              </button>
              <span className="text-xs text-slate-500">
                by {DIMENSION_NAMES[r.dimension].toLowerCase()}
                {r.filters.source && ` · ${r.filters.source}`}
                {r.filters.device && ` · ${r.filters.device}`}
              </span>
              {editable && (
                <button
                  type="button"
                  className="text-xs text-slate-500 underline"
                  onClick={() => update((s) => deleteReport(s, r.name))}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Questions({
  state,
  editable,
  update,
}: {
  state: AnalyticsState
  editable: boolean
  update: Update
}) {
  return (
    <div data-testid="questions">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Questions</h2>
      <ol className="space-y-3">
        {state.questions.map((q, i) => (
          <li
            key={q.id}
            className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
          >
            <p className="font-medium">
              {i + 1}. {q.question}
            </p>
            {q.kind === 'choice' ? (
              <select
                aria-label={q.question}
                value={q.answer}
                disabled={!editable}
                onChange={(e) => update((s) => answer(s, q.id, e.target.value))}
                className="mt-2 rounded border border-slate-300 px-2 py-1"
              >
                <option value="">Choose…</option>
                {q.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <NumberAnswer
                label={q.question}
                value={q.answer}
                unit={q.unit}
                disabled={!editable}
                onCommit={(v) => update((s) => answer(s, q.id, v))}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function NumberAnswer({
  label,
  value,
  unit,
  disabled,
  onCommit,
}: {
  label: string
  value: string
  unit: string
  disabled: boolean
  onCommit: (v: string) => void
}) {
  const [text, setText] = useState(value)
  return (
    <span className="mt-2 flex items-center gap-1">
      <input
        aria-label={label}
        value={text}
        disabled={disabled}
        inputMode="decimal"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== value && onCommit(text.trim())}
        className="w-28 rounded border border-slate-300 px-2 py-1 text-right"
      />
      {unit}
    </span>
  )
}
