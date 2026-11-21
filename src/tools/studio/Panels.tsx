/**
 * The side panels of Space Studio: the library (furniture, doors and windows),
 * the project tree (floors, rooms and what is in them), and the checks.
 */
import { useMemo, useState } from 'react'
import { analyse, type StudioAnalysis } from '../../studio/analysis'
import {
  CATALOG,
  catalogEntry,
  GROUPS,
  OPENING_PRESETS,
  searchCatalog,
  type GroupId,
} from '../../studio/catalog'
import type { Ref, StudioState } from '../../studio/model'
import { formatArea, formatLength, formatMoney } from '../../studio/units'
import { SIcon } from './icons'
import { ItemPreview } from './PlanDrawing'
import { roomUseName } from './shared'

export function LibraryPanel({
  placing,
  onPick,
  onPickOpening,
  onClose,
  disabled,
}: {
  placing: string | null
  onPick: (kind: string) => void
  onPickOpening: (presetId: string) => void
  onClose: () => void
  disabled: boolean
}) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<GroupId | 'openings' | null>(null)
  const items = useMemo(
    () => (group === 'openings' ? [] : searchCatalog(query, group)),
    [query, group],
  )
  const openings = useMemo(
    () =>
      group === null || group === 'openings'
        ? OPENING_PRESETS.filter((p) =>
            p.name.toLowerCase().includes(query.toLowerCase()),
          )
        : [],
    [query, group],
  )
  return (
    <aside
      className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white"
      data-testid="studio-library"
      aria-label="Library"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Library</h2>
          <p className="text-[11px] text-slate-500">
            {CATALOG.length} items · {OPENING_PRESETS.length} doors and windows
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the library"
          title="Close (B)"
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <SIcon name="close" />
        </button>
      </div>
      <div className="space-y-2 border-b border-slate-200 p-3">
        <label className="flex items-center gap-2 rounded border border-slate-300 px-2 py-1 focus-within:border-blue-500">
          <SIcon name="search" className="h-4 w-4 text-slate-400" />
          <input
            className="w-full text-sm outline-none"
            placeholder="Search: sofa, desk, plant…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            data-testid="library-search"
            aria-label="Search the library"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          {[
            { id: null, name: 'All' },
            ...GROUPS,
            { id: 'openings' as const, name: 'Doors & windows' },
          ].map((g) => (
            <button
              key={g.id ?? 'all'}
              type="button"
              onClick={() => setGroup(g.id)}
              aria-pressed={group === g.id}
              className={`rounded-full border px-2 py-0.5 text-xs ${group === g.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {openings.length > 0 && (
          <>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Doors and windows
            </h3>
            <ul className="mb-3 space-y-1">
              {openings.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPickOpening(p.id)}
                    className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${placing === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                    data-testid={`library-opening-${p.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <SIcon
                        name={
                          p.kind === 'window'
                            ? 'window'
                            : p.kind === 'pass'
                              ? 'pass'
                              : 'door'
                        }
                        className="h-4 w-4 text-slate-500"
                      />
                      {p.name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {p.width}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {items.length > 0 && (
          <ul className="grid grid-cols-2 gap-2">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(c.id)}
                  title={`${c.name}: ${c.width} × ${c.depth} × ${c.height} mm, ${formatMoney(c.price)}`}
                  className={`flex h-full w-full flex-col items-center rounded border p-2 text-center hover:border-blue-400 hover:bg-blue-50/40 disabled:opacity-50 ${placing === c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                  data-testid={`library-item-${c.id}`}
                >
                  <ItemPreview kind={c.id} />
                  <span className="mt-1 text-xs leading-tight font-medium text-slate-800">
                    {c.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {c.width / 10} × {c.depth / 10} cm
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {items.length === 0 && openings.length === 0 && (
          <p className="text-sm text-slate-500">Nothing matches “{query}”.</p>
        )}
      </div>
      <p className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">
        Pick an item, then click the plan. R turns it while placing; Esc cancels.
      </p>
    </aside>
  )
}

/** Floors, rooms and their contents, to select from. */
export function ProjectTree({
  state,
  floor,
  selection,
  onSelect,
  onFloor,
}: {
  state: StudioState
  floor: string
  selection: Ref[]
  onSelect: (refs: Ref[]) => void
  onFloor: (id: string) => void
}) {
  const a = useMemo(() => analyse(state), [state])
  const floors = [...state.floors].sort((x, y) => y.elevation - x.elevation)
  const isSel = (kind: Ref['kind'], id: string) =>
    selection.some((r) => r.kind === kind && r.id === id)
  return (
    <div className="p-2 text-sm" data-testid="project-tree">
      {floors.map((f) => {
        const rooms = a.rooms.filter((r) => r.floor === f.id)
        return (
          <div key={f.id} className="mb-2">
            <button
              type="button"
              onClick={() => onFloor(f.id)}
              className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left font-medium ${f.id === floor ? 'bg-slate-800 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
            >
              <SIcon name="floors" className="h-3.5 w-3.5" /> {f.name}
              <span className="ml-auto text-xs opacity-75">
                {formatArea(
                  (a.floors.find((x) => x.id === f.id)?.area ?? 0) * 1_000_000,
                  state.project.units,
                )}
              </span>
            </button>
            <ul className="mt-1 ml-3 space-y-0.5 border-l border-slate-200 pl-2">
              {rooms.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => (
                      onFloor(f.id),
                      onSelect([{ kind: 'rooms', id: r.id }])
                    )}
                    className={`flex w-full justify-between rounded px-1.5 py-0.5 text-left ${isSel('rooms', r.id) ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span className="truncate">{r.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {r.area.toFixed(1)} m²
                    </span>
                  </button>
                  {r.items.length > 0 && (
                    <ul className="ml-3">
                      {r.items.map((id) => {
                        const item = state.items.find((i) => i.id === id)!
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => (
                                onFloor(f.id),
                                onSelect([{ kind: 'items', id }])
                              )}
                              className={`w-full truncate rounded px-1.5 text-left text-xs ${isSel('items', id) ? 'bg-blue-100 text-blue-900' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                              {catalogEntry(item.kind)?.name ?? item.kind}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              ))}
              {rooms.length === 0 && (
                <li className="px-1.5 text-xs text-slate-400">No rooms yet</li>
              )}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

const TONE = {
  error: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-slate-600',
} as const

/** The design read as a reviewer would: problems, rooms, and costs. */
export function ChecksPanel({
  analysis,
  state,
  onSelect,
}: {
  analysis: StudioAnalysis
  state: StudioState
  onSelect: (refs: Ref[]) => void
}) {
  const units = state.project.units
  const errors = analysis.issues.filter((i) => i.severity === 'error').length
  const warnings = analysis.issues.filter((i) => i.severity === 'warning').length
  return (
    <div className="space-y-3 p-3 text-sm" data-testid="checks-panel">
      <p
        className={
          errors
            ? 'font-medium text-red-700'
            : warnings
              ? 'font-medium text-amber-700'
              : 'font-medium text-emerald-700'
        }
        data-testid="checks-summary"
      >
        {errors || warnings
          ? `${errors} problem${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`
          : analysis.rooms.length
            ? 'No problems found.'
            : 'Draw some rooms to check them.'}
      </p>
      <ul className="space-y-1.5">
        {analysis.issues.map((i, n) => (
          <li key={n}>
            <button
              type="button"
              onClick={() => i.refs.length && onSelect(i.refs)}
              className={`w-full rounded px-1.5 py-1 text-left hover:bg-slate-100 ${TONE[i.severity]}`}
              data-testid="check-issue"
              data-code={i.code}
            >
              <span className="mr-1 text-[10px] font-semibold uppercase">
                {i.severity === 'error'
                  ? 'Fix'
                  : i.severity === 'warning'
                    ? 'Check'
                    : 'Note'}
              </span>
              {i.message}
            </button>
          </li>
        ))}
      </ul>
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Rooms
        </h3>
        <table className="w-full text-xs">
          <tbody>
            {analysis.rooms.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-0.5 pr-1 text-slate-800">{r.name}</td>
                <td className="text-slate-500">{roomUseName(r.use)}</td>
                <td className="text-right font-mono">{r.area.toFixed(1)} m²</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-slate-600">
          Total {analysis.totalArea.toFixed(1)} m² on {state.floors.length} floor
          {state.floors.length === 1 ? '' : 's'} · {analysis.counts.doors} doors ·{' '}
          {analysis.counts.windows} windows
        </p>
      </div>
      <div data-testid="cost-summary">
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Cost (fictional prices)
        </h3>
        <dl className="grid grid-cols-2 gap-x-2 text-xs">
          <dt className="text-slate-600">Furniture</dt>
          <dd className="text-right font-mono">
            {formatMoney(analysis.costs.furniture)}
          </dd>
          <dt className="text-slate-600">Fittings</dt>
          <dd className="text-right font-mono">{formatMoney(analysis.costs.fixtures)}</dd>
          <dt className="text-slate-600">Doors and windows</dt>
          <dd className="text-right font-mono">{formatMoney(analysis.costs.openings)}</dd>
          <dt className="text-slate-600">Finishes</dt>
          <dd className="text-right font-mono">{formatMoney(analysis.costs.finishes)}</dd>
          <dt className="font-semibold text-slate-800">Total</dt>
          <dd className="text-right font-mono font-semibold" data-testid="cost-total">
            {formatMoney(analysis.costs.total)}
          </dd>
          {state.project.budget !== undefined && (
            <>
              <dt className="text-slate-600">Budget</dt>
              <dd
                className={`text-right font-mono ${analysis.costs.total > state.project.budget ? 'text-red-700' : 'text-emerald-700'}`}
              >
                {formatMoney(state.project.budget)}
              </dd>
            </>
          )}
        </dl>
      </div>
      <p className="text-[11px] text-slate-500">
        Space guidance is simplified for learning. Real projects follow the applicable
        regulations. {formatLength(775, units)} is used as the minimum clear door width.
      </p>
    </div>
  )
}

/** The team's review of the design, live: each colleague's verdict, what works and what to change. */
export function ReviewsPanel({
  reviews,
  name,
}: {
  reviews: import('../../studio/review').Review[]
  name: (role: import('../../studio/review').ReviewerRole) => string
}) {
  return (
    <div className="space-y-3 p-3 text-sm" data-testid="reviews-panel">
      <p className="text-xs text-slate-500">
        Your colleagues read the design as it is now. They review it again when you submit
        a task.
      </p>
      {reviews.map((r) => (
        <section
          key={r.role}
          className="rounded-md border border-slate-200 p-2.5"
          data-testid={`review-${r.role}`}
        >
          <header className="flex items-baseline justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{name(r.role)}</h3>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${r.verdict === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
            >
              {r.verdict === 'approved' ? 'Approved' : 'Changes needed'}
            </span>
          </header>
          <p className="text-xs text-slate-500">{r.title}</p>
          {r.praise.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {r.praise.map((p, i) => (
                <li key={i} className="text-emerald-800">
                  + {p}
                </li>
              ))}
            </ul>
          )}
          {r.changes.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {r.changes.map((c, i) => (
                <li key={i} className="text-amber-900">
                  – {c}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
