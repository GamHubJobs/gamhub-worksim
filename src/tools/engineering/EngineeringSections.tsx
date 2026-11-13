/** Works Desk: project planning, maintenance, inspection, environment and the audit log. */
import { useState } from 'react'
import {
  closeWorkOrder,
  decidePart,
  doStep,
  flagSample,
  partFindings,
  SAFE_ORDER,
  schedule,
  STEP_NAMES,
  toggleCritical,
  unflagSample,
} from './model'
import type { EngineeringState } from './schema'
import { card, field, primary, secondary, type Run } from './styles'

interface ViewProps {
  state: EngineeringState
  canEdit: boolean
  run: Run
}

export function PlanningView({ state, canEdit, run }: ViewProps) {
  return (
    <div className="space-y-3 p-3">
      {state.plans.map((p) => {
        const sch = schedule(p)
        const scale = 360 / Math.max(1, sch.finish)
        return (
          <section
            key={p.id}
            className={card}
            aria-label={p.title}
            data-testid={`plan-${p.id}`}
          >
            <h3 className="font-semibold">
              {p.id}: {p.title}
            </h3>
            <p className="mt-1">
              Each task starts when the tasks it follows have finished. The project
              finishes on <strong>day {sch.finish}</strong>. Mark the tasks on the
              critical path.
            </p>
            <table className="mt-2 w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs">
                <tr>
                  {['Task', 'Days', 'After', 'Schedule', 'Critical?'].map((h) => (
                    <th key={h} className="px-2 py-1">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sch.rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-2 py-1">
                      {r.id}. {r.name}
                    </td>
                    <td className="px-2 py-1">{r.days}</td>
                    <td className="px-2 py-1">{r.after.join(', ') || '—'}</td>
                    <td className="px-2 py-1">
                      <svg
                        viewBox="0 0 370 14"
                        className="h-4 w-[22rem]"
                        role="img"
                        aria-label={`Days ${r.start} to ${r.finish}`}
                      >
                        <rect
                          x={r.start * scale}
                          y="2"
                          width={r.days * scale}
                          height="10"
                          fill={p.critical.includes(r.id) ? '#c2410c' : '#94a3b8'}
                          rx="2"
                        />
                      </svg>
                      <span className="text-xs text-slate-600">
                        day {r.start} to {r.finish}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={p.critical.includes(r.id)}
                        disabled={!canEdit}
                        onChange={() => run((s) => toggleCritical(s, p.id, r.id))}
                        aria-label={`Task ${r.id} is critical`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}

export function MaintenanceView({ state, canEdit, run }: ViewProps) {
  const [readings, setReadings] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  return (
    <div className="space-y-3 p-3">
      {state.workOrders.map((w) => (
        <section
          key={w.id}
          className={card}
          aria-label={`Work order ${w.id}`}
          data-testid={`wo-${w.id}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">
              {w.id}: {w.equipment}
            </h3>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{w.status}</span>
          </div>
          <p className="mt-1">{w.fault}</p>
          <ol className="mt-2 space-y-1">
            {SAFE_ORDER.map((step) => {
              const done = w.steps.includes(step)
              return (
                <li key={step} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={done ? 'text-emerald-700' : 'text-slate-400'}
                  >
                    {done ? '✓' : '○'}
                  </span>
                  {canEdit && !done && w.status !== 'closed' ? (
                    <button
                      type="button"
                      className="text-left underline"
                      onClick={() => run((s) => doStep(s, w.id, step))}
                    >
                      {STEP_NAMES[step]}
                    </button>
                  ) : (
                    <span className={done ? '' : 'text-slate-500'}>
                      {STEP_NAMES[step]}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
          {w.status === 'closed' ? (
            <p className="mt-2 text-emerald-800">
              Closed: reading {w.reading} (limit {w.limit}). {w.note}
            </p>
          ) : (
            canEdit && (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs">
                  Test-run reading (limit {w.limit})
                  <input
                    inputMode="decimal"
                    value={readings[w.id] ?? ''}
                    onChange={(e) =>
                      setReadings((r) => ({ ...r, [w.id]: e.target.value }))
                    }
                    className={`${field} block w-28`}
                    aria-label={`Reading for ${w.id}`}
                  />
                </label>
                <label className="text-xs">
                  What you did
                  <input
                    value={notes[w.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [w.id]: e.target.value }))}
                    className={`${field} block min-w-72`}
                    aria-label={`What you did on ${w.id}`}
                  />
                </label>
                <button
                  type="button"
                  className={primary}
                  onClick={() =>
                    run((s) =>
                      closeWorkOrder(s, w.id, Number(readings[w.id]), notes[w.id] ?? ''),
                    )
                  }
                >
                  Close the work order
                </button>
              </div>
            )
          )}
        </section>
      ))}
    </div>
  )
}

export function InspectionView({ state, canEdit, run }: ViewProps) {
  return (
    <div className="space-y-3 p-3">
      {state.drawings.map((d) => (
        <section
          key={d.id}
          className={card}
          aria-label={d.title}
          data-testid={`drawing-${d.id}`}
        >
          <h3 className="font-semibold">{d.title}</h3>
          <table className="mt-2 w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs">
              <tr>
                <th className="px-2 py-1">Part</th>
                {d.features.map((f) => (
                  <th key={f.id} className="px-2 py-1">
                    {f.name} ({f.nominal} ± {f.tolerance} mm)
                  </th>
                ))}
                <th className="px-2 py-1">Decision</th>
              </tr>
            </thead>
            <tbody>
              {d.parts.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-slate-100"
                  data-testid={`part-${p.id}`}
                >
                  <td className="px-2 py-1 font-medium">{p.id}</td>
                  {partFindings(state, d.id, p.id).map((f) => (
                    <td key={f.feature.id} className="px-2 py-1">
                      {f.value}{' '}
                      <span className="text-xs text-slate-500">
                        ({f.deviation >= 0 ? '+' : ''}
                        {f.deviation})
                      </span>
                    </td>
                  ))}
                  <td className="space-x-1 px-2 py-1 whitespace-nowrap">
                    {p.decision && <strong className="mr-1">{p.decision}</strong>}
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          className={secondary}
                          onClick={() => run((s) => decidePart(s, d.id, p.id, 'accept'))}
                          aria-label={`Accept ${p.id}`}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className={secondary}
                          onClick={() => run((s) => decidePart(s, d.id, p.id, 'reject'))}
                          aria-label={`Reject ${p.id}`}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}

export function EnvironmentView({ state, canEdit, run }: ViewProps) {
  const [actions, setActions] = useState<Record<string, string>>({})
  return (
    <div className="space-y-2 p-3">
      <p className="text-sm text-slate-700">
        This week’s monitoring results against the site’s permit limits (fictional
        limits).
      </p>
      {state.samples.map((x) => (
        <div key={x.id} className={card} data-testid={`sample-${x.id}`}>
          <p>
            <strong>{x.substance}</strong> at {x.point}: {x.value} {x.unit} (limit{' '}
            {x.limit} {x.unit})
          </p>
          {x.flagged && <p className="mt-1 text-amber-900">Flagged: {x.action}</p>}
          {canEdit && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {x.flagged ? (
                <button
                  type="button"
                  className={secondary}
                  onClick={() => run((s) => unflagSample(s, x.id))}
                >
                  Remove the flag
                </button>
              ) : (
                <>
                  <input
                    value={actions[x.id] ?? ''}
                    onChange={(e) =>
                      setActions((a) => ({ ...a, [x.id]: e.target.value }))
                    }
                    placeholder="Who you told, and the next step"
                    aria-label={`Action for ${x.substance}`}
                    className={`${field} min-w-72 flex-1`}
                  />
                  <button
                    type="button"
                    className={primary}
                    onClick={() => run((s) => flagSample(s, x.id, actions[x.id] ?? ''))}
                  >
                    Flag as over the limit
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function AuditView({ state }: { state: EngineeringState }) {
  return (
    <div className="p-3">
      <table
        className="w-full rounded border border-slate-200 bg-white text-sm"
        data-testid="audit-log"
      >
        <thead className="bg-slate-100 text-left text-xs">
          <tr>
            <th className="px-2 py-1">Action</th>
            <th className="px-2 py-1">Detail</th>
          </tr>
        </thead>
        <tbody>
          {[...state.audit].reverse().map((a, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-2 py-1">{a.action}</td>
              <td className="px-2 py-1">{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
