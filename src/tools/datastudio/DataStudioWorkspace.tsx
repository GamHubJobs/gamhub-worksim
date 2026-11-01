/** Data Studio: data and cleaning steps, SQL, statistics, dashboard and questions. */
import { useState } from 'react'
import { ChartView } from '../../ui/ChartView'
import { Icon } from '../../ui/Icon'
import type { ToolWorkspaceProps } from '../ui'
import { dataStudio } from './definition'
import { runSql } from './runSql'
import {
  COLUMN_TYPES,
  type DataStudioState,
  type Result,
  type Step,
  type Tile,
  type Value,
} from './schema'
import { correlation, describeCorrelation, numbers, summarise } from './stats'
import { cleanTable, describeStep, profile, type Table } from './transform'

type Props = ToolWorkspaceProps<DataStudioState>
type Update = (change: (s: DataStudioState) => DataStudioState) => void

const cell = 'px-2 py-1 whitespace-nowrap'
const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50 disabled:opacity-40'
const PRIMARY =
  'rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50'
const show = (v: Value) =>
  v === null
    ? ''
    : typeof v === 'number'
      ? v.toLocaleString('en-GB', { maximumFractionDigits: 4 })
      : v
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—')

export default function DataStudioWorkspace({
  state,
  readOnly,
  onUpdate,
  lockedSections,
}: Props) {
  const [section, setSection] = useState('data')
  const editable = !readOnly && !!onUpdate
  const update: Update = (change) => onUpdate?.(change)
  return (
    <div className="flex h-full min-h-0 bg-slate-50" data-testid="datastudio">
      <nav
        aria-label="Data Studio sections"
        className="w-44 shrink-0 space-y-0.5 border-r border-slate-200 bg-white p-2"
      >
        {dataStudio.sections
          .filter((s) => s.id !== 'questions' || state.questions.length > 0)
          .map((s) => {
            const locked = lockedSections[s.id]
            return (
              <button
                key={s.id}
                type="button"
                disabled={!!locked}
                title={locked ? `Unlocks when you become ${locked}.` : s.description}
                onClick={() => setSection(s.id)}
                aria-current={section === s.id ? 'page' : undefined}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${
                  section === s.id
                    ? 'bg-indigo-50 font-medium text-indigo-900'
                    : locked
                      ? 'text-slate-400'
                      : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {s.name}
                {locked && <Icon name="lock" className="h-3.5 w-3.5" />}
              </button>
            )
          })}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        {section === 'data' && <Data state={state} editable={editable} update={update} />}
        {section === 'sql' && <Sql state={state} editable={editable} update={update} />}
        {section === 'stats' && <Stats state={state} />}
        {section === 'dashboard' && (
          <Dashboard state={state} editable={editable} update={update} />
        )}
        {section === 'questions' && (
          <Questions state={state} editable={editable} update={update} />
        )}
      </div>
    </div>
  )
}

function Grid({
  table,
  limit = 50,
  testId,
}: {
  table: Table | Result
  limit?: number
  testId?: string
}) {
  const columns = table.columns.map((c) => (typeof c === 'string' ? c : c.name))
  return (
    <div
      className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white"
      data-testid={testId}
    >
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-100 text-left text-slate-600">
          <tr>
            {columns.map((c) => (
              <th key={c} className={`${cell} font-mono`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {table.rows.slice(0, limit).map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {row.map((v, k) => (
                <td
                  key={k}
                  className={`${cell} ${typeof v === 'number' ? 'text-right' : ''} ${v === null || v === '' ? 'bg-amber-50' : ''}`}
                >
                  {typeof v === 'string' && v !== v.trim() ? (
                    <span className="bg-amber-100">“{v}”</span>
                  ) : (
                    show(v)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.rows.length > limit && (
        <p className="p-2 text-xs text-slate-500">
          Showing {limit} of {table.rows.length} rows.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data and cleaning
// ---------------------------------------------------------------------------

const STEP_KINDS: Array<[Step['kind'], string]> = [
  ['trim', 'Trim spaces'],
  ['case', 'Change capitals'],
  ['replace', 'Replace text'],
  ['type', 'Change type'],
  ['dedupe', 'Remove duplicates'],
  ['remove-blank', 'Remove blank rows'],
  ['fill', 'Fill blanks'],
  ['filter', 'Keep rows where…'],
  ['calculate', 'Calculated column'],
  ['rename', 'Rename column'],
  ['remove-column', 'Remove column'],
]

function Data({
  state,
  editable,
  update,
}: {
  state: DataStudioState
  editable: boolean
  update: Update
}) {
  const [name, setName] = useState(state.datasets[0].name)
  const [view, setView] = useState<'clean' | 'raw'>('clean')
  const dataset = state.datasets.find((d) => d.name === name) ?? state.datasets[0]
  const { table, errors } = cleanTable(dataset)
  const shown: Table =
    view === 'raw' ? { columns: dataset.columns, rows: dataset.rows } : table
  const index = state.datasets.findIndex((d) => d.name === dataset.name)
  const setSteps = (fn: (steps: Step[]) => Step[]) =>
    update((s) => ({
      ...s,
      datasets: s.datasets.map((d, i) =>
        i === index ? { ...d, steps: fn(d.steps) } : d,
      ),
    }))
  return (
    <div className="space-y-4" data-testid="data-section">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Dataset"
          value={dataset.name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 font-mono text-sm"
        >
          {state.datasets.map((d) => (
            <option key={d.name}>{d.name}</option>
          ))}
        </select>
        <span className="text-sm text-slate-600">{dataset.description}</span>
        <div className="ml-auto flex gap-1" role="tablist">
          {(['clean', 'raw'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded px-2.5 py-1 text-sm ${view === v ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700'}`}
            >
              {v === 'clean'
                ? `Clean (${table.rows.length} rows)`
                : `Raw (${dataset.rows.length} rows)`}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="profiles">
        {shown.columns.map((c) => {
          const p = profile(shown, c.name)
          return (
            <div
              key={c.name}
              className="rounded border border-slate-200 bg-white p-2 text-xs"
            >
              <p className="font-mono font-semibold">
                {c.name}{' '}
                <span className="font-sans font-normal text-slate-500">· {c.type}</span>
              </p>
              <p className="text-slate-600">
                {p.distinct} distinct ·{' '}
                <span className={p.blanks ? 'text-amber-700' : ''}>{p.blanks} blank</span>
                {c.type === 'number' &&
                  ` · total ${show(numbers(shown, c.name).reduce((s, v) => s + v, 0))}`}
              </p>
            </div>
          )
        })}
      </div>
      <Grid table={shown} testId="data-grid" />
      <section
        className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
        data-testid="steps"
      >
        <h3 className="mb-2 font-semibold text-slate-900">Applied steps</h3>
        {dataset.steps.length === 0 ? (
          <p className="text-slate-500">No steps yet: the clean table is the raw data.</p>
        ) : (
          <ol className="mb-3 space-y-1">
            {dataset.steps.map((step, i) => {
              const error = errors.find((e) => e.step === i)
              return (
                <li
                  key={i}
                  className="flex items-center justify-between rounded bg-slate-50 px-2 py-1"
                  data-testid="step"
                >
                  <span>
                    {i + 1}. {describeStep(step)}
                    {error && (
                      <span className="ml-2 text-red-700">({error.message})</span>
                    )}
                  </span>
                  {editable && (
                    <button
                      type="button"
                      aria-label={`Remove step ${i + 1}`}
                      className="text-xs text-slate-500 underline"
                      onClick={() => setSteps((steps) => steps.filter((_, k) => k !== i))}
                    >
                      Remove
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        {editable && (
          <AddStep
            columns={table.columns.map((c) => c.name)}
            onAdd={(step) => setSteps((steps) => [...steps, step])}
          />
        )}
      </section>
    </div>
  )
}

function AddStep({ columns, onAdd }: { columns: string[]; onAdd: (step: Step) => void }) {
  const [kind, setKind] = useState<Step['kind']>('trim')
  const [column, setColumn] = useState(columns[0] ?? '')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [op, setOp] = useState('=')
  const field = (label: string, value: string, set: (v: string) => void) => (
    <input
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => set(e.target.value)}
      className="w-36 rounded border border-slate-300 px-2 py-1"
    />
  )
  const columnPicker = (
    <select
      aria-label="Step column"
      value={column}
      onChange={(e) => setColumn(e.target.value)}
      className="rounded border border-slate-300 px-2 py-1 font-mono"
    >
      {columns.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  )
  const build = (): Step | null => {
    switch (kind) {
      case 'trim':
      case 'remove-blank':
      case 'remove-column':
        return { kind, column }
      case 'case':
        return { kind, column, to: (a || 'proper') as 'upper' | 'lower' | 'proper' }
      case 'type':
        return { kind, column, to: (a || 'number') as 'text' | 'number' | 'date' }
      case 'replace':
        return a ? { kind, column, find: a, with: b } : null
      case 'fill':
        return { kind, column, value: a }
      case 'filter':
        return { kind, column, op: op as '=' | '!=' | '>' | '<' | 'contains', value: a }
      case 'rename':
        return /^[a-z][a-z0-9_]*$/.test(a) ? { kind, column, to: a } : null
      case 'dedupe':
        return { kind, columns: column ? [column] : [] }
      case 'calculate':
        return /^[a-z][a-z0-9_]*$/.test(a) && b
          ? { kind, name: a, left: column, op: op as '+' | '-' | '*' | '/', right: b }
          : null
    }
  }
  const step = build()
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"
      data-testid="add-step"
    >
      <select
        aria-label="Step"
        value={kind}
        onChange={(e) => {
          setKind(e.target.value as Step['kind'])
          setA('')
          setB('')
          setOp(e.target.value === 'calculate' ? '-' : '=')
        }}
        className="rounded border border-slate-300 px-2 py-1"
      >
        {STEP_KINDS.map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      {kind === 'dedupe' ? (
        <>
          <span className="text-slate-600">by</span>
          {columnPicker}
        </>
      ) : kind === 'calculate' ? (
        <>
          {field('New column name', a, setA)} <span>=</span> {columnPicker}
          <select
            aria-label="Operator"
            value={op}
            onChange={(e) => setOp(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {['+', '-', '*', '/'].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          {field('Column or number', b, setB)}
        </>
      ) : (
        columnPicker
      )}
      {kind === 'case' && (
        <select
          aria-label="Capitals"
          value={a || 'proper'}
          onChange={(e) => setA(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        >
          <option value="proper">Capitalise Each Word</option>
          <option value="upper">UPPER CASE</option>
          <option value="lower">lower case</option>
        </select>
      )}
      {kind === 'type' && (
        <select
          aria-label="New type"
          value={a || 'number'}
          onChange={(e) => setA(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        >
          {COLUMN_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      )}
      {kind === 'replace' && (
        <>
          {field('Find', a, setA)}
          {field('Replace with', b, setB)}
        </>
      )}
      {kind === 'fill' && field('Value', a, setA)}
      {kind === 'rename' && field('New name', a, setA)}
      {kind === 'filter' && (
        <>
          <select
            aria-label="Condition"
            value={op}
            onChange={(e) => setOp(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {['=', '!=', '>', '<', 'contains'].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          {field('Value', a, setA)}
        </>
      )}
      <button
        type="button"
        className={PRIMARY}
        disabled={!step}
        onClick={() => step && onAdd(step)}
      >
        Add step
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

function cleanTables(state: DataStudioState) {
  return state.datasets.map((d) => ({ name: d.name, table: cleanTable(d).table }))
}

function Sql({
  state,
  editable,
  update,
}: {
  state: DataStudioState
  editable: boolean
  update: Update
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const query = state.queries.find((q) => q.id === selected) ?? null
  const [sql, setSql] = useState(query?.sql ?? '')
  const [result, setResult] = useState<Result | null>(query?.result ?? null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [name, setName] = useState('')
  const open = (id: string | null) => {
    const q = state.queries.find((x) => x.id === id)
    setSelected(id)
    setSql(q?.sql ?? '')
    setResult(q?.result ?? null)
    setError(q?.error ?? '')
  }
  const run = async () => {
    setRunning(true)
    setError('')
    try {
      const r = await runSql(cleanTables(state), sql)
      setResult(r)
      if (query)
        update((s) => ({
          ...s,
          queries: s.queries.map((q) =>
            q.id === query.id ? { ...q, sql, result: r, error: '' } : q,
          ),
        }))
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setResult(null)
      setError(message)
      if (query)
        update((s) => ({
          ...s,
          queries: s.queries.map((q) =>
            q.id === query.id ? { ...q, sql, result: null, error: message } : q,
          ),
        }))
    }
    setRunning(false)
  }
  return (
    <div className="flex gap-4" data-testid="sql-section">
      <aside className="w-52 shrink-0 space-y-3 text-sm">
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-500 uppercase">Tables</p>
          {cleanTables(state).map(({ name: t, table }) => (
            <details key={t} className="mb-1">
              <summary className="cursor-pointer font-mono">{t}</summary>
              <ul className="pl-4 font-mono text-xs text-slate-600">
                {table.columns.map((c) => (
                  <li key={c.name}>
                    {c.name} <span className="text-slate-400">{c.type}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-500 uppercase">
            Saved queries
          </p>
          <button
            type="button"
            onClick={() => open(null)}
            className={`mb-1 w-full rounded px-2 py-1 text-left ${selected === null ? 'bg-indigo-50' : 'hover:bg-slate-100'}`}
          >
            + New query
          </button>
          {state.queries.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => open(q.id)}
              data-testid="saved-query"
              className={`block w-full truncate rounded px-2 py-1 text-left ${selected === q.id ? 'bg-indigo-50' : 'hover:bg-slate-100'}`}
            >
              {q.name}
            </button>
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-2">
        <textarea
          aria-label="SQL"
          value={sql}
          rows={7}
          spellCheck={false}
          disabled={!editable}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void run()
          }}
          placeholder="SELECT service, SUM(amount) AS revenue FROM orders GROUP BY service"
          className="w-full rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-sm text-slate-100"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={PRIMARY}
            disabled={running || !editable}
            onClick={() => void run()}
          >
            {running ? 'Running…' : 'Run'}
          </button>
          <span className="text-xs text-slate-500">Ctrl+Enter runs the query.</span>
          {editable && !query && (
            <form
              className="ml-auto flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim() || !result) return
                let id = ''
                update((s) => {
                  let n = s.queries.length + 1
                  while (s.queries.some((q) => q.id === `q${n}`)) n++
                  id = `q${n}`
                  return {
                    ...s,
                    queries: [
                      ...s.queries,
                      { id, name: name.trim(), sql, result, error: '' },
                    ],
                  }
                })
                setSelected(id)
                setName('')
              }}
            >
              <input
                aria-label="Query name"
                placeholder="Name, to save it"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-48 rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <button type="submit" className={BUTTON} disabled={!result || !name.trim()}>
                Save query
              </button>
            </form>
          )}
          {editable && query && (
            <button
              type="button"
              className={`ml-auto ${BUTTON}`}
              onClick={() => {
                update((s) => ({
                  ...s,
                  queries: s.queries.filter((q) => q.id !== query.id),
                  dashboard: {
                    ...s.dashboard,
                    tiles: s.dashboard.tiles.filter((t) => t.query !== query.id),
                  },
                }))
                open(null)
              }}
            >
              Delete “{query.name}”
            </button>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded bg-red-50 p-2 font-mono text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {result && (
          <>
            <p className="text-xs text-slate-500" data-testid="row-count">
              {result.rows.length} row{result.rows.length === 1 ? '' : 's'}
            </p>
            <Grid table={result} limit={200} testId="sql-result" />
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function Stats({ state }: { state: DataStudioState }) {
  const [name, setName] = useState(state.datasets[state.datasets.length - 1].name)
  const dataset = state.datasets.find((d) => d.name === name) ?? state.datasets[0]
  const { table } = cleanTable(dataset)
  const numeric = table.columns.filter((c) => c.type === 'number').map((c) => c.name)
  const text = table.columns.filter((c) => c.type === 'text').map((c) => c.name)
  const [column, setColumn] = useState(numeric[0] ?? '')
  const [group, setGroup] = useState('')
  const [x, setX] = useState(numeric[0] ?? '')
  const [y, setY] = useState(numeric[1] ?? '')
  const gi = table.columns.findIndex((c) => c.name === group)
  const groups =
    gi === -1 ? [null] : [...new Set(table.rows.map((r) => String(r[gi] ?? '')))].sort()
  const r = x && y ? correlation(table, x, y) : null
  const pick = (
    label: string,
    value: string,
    set: (v: string) => void,
    options: string[],
    empty?: string,
  ) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => set(e.target.value)}
      className="rounded border border-slate-300 px-2 py-1 font-mono text-sm"
    >
      {empty !== undefined && <option value="">{empty}</option>}
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  )
  return (
    <div className="space-y-5" data-testid="stats-section">
      <div className="flex items-center gap-2 text-sm">
        Dataset{' '}
        {pick(
          'Statistics dataset',
          dataset.name,
          setName,
          state.datasets.map((d) => d.name),
        )}
        <span className="text-xs text-slate-500">
          (uses the clean table: add calculated columns in Data)
        </span>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <h3 className="mb-2 font-semibold">Summary</h3>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          Column {pick('Summary column', column, setColumn, numeric)} split by{' '}
          {pick('Group by', group, setGroup, text, '(no split)')}
        </div>
        <table className="w-full text-sm" data-testid="summary">
          <thead className="text-left text-xs text-slate-500 uppercase">
            <tr>
              {[
                'Group',
                'Count',
                'Mean',
                'Median',
                'Std dev',
                'Min',
                'Q1',
                'Q3',
                'Max',
              ].map((h) => (
                <th key={h} className={cell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const s = summarise(
                numbers(
                  table,
                  column,
                  g === null ? undefined : (row) => String(row[gi] ?? '') === g,
                ),
              )
              return (
                <tr
                  key={g ?? 'all'}
                  className="border-t border-slate-100 tabular-nums"
                  data-testid="summary-row"
                >
                  <td className={cell}>{g ?? 'All'}</td>
                  <td className={cell}>{s.count}</td>
                  <td className={cell}>{fmt(s.mean)}</td>
                  <td className={cell}>{fmt(s.median)}</td>
                  <td className={cell}>{fmt(s.sd)}</td>
                  <td className={cell}>{fmt(s.min)}</td>
                  <td className={cell}>{fmt(s.q1)}</td>
                  <td className={cell}>{fmt(s.q3)}</td>
                  <td className={cell}>{fmt(s.max)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
      <section
        className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
        data-testid="correlation"
      >
        <h3 className="mb-2 font-semibold">Correlation</h3>
        <div className="flex flex-wrap items-center gap-2">
          {pick('Correlation x', x, setX, numeric)} and{' '}
          {pick('Correlation y', y, setY, numeric)}
        </div>
        {r && Number.isFinite(r.r) && (
          <p className="mt-2">
            r = <strong data-testid="r-value">{r.r.toFixed(2)}</strong> (
            {describeCorrelation(r.r)}, {r.n} rows). Correlation shows that two measures
            move together, not that one causes the other.
          </p>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard and questions
// ---------------------------------------------------------------------------

function tileChart(state: DataStudioState, tile: Tile) {
  const result = state.queries.find((q) => q.id === tile.query)?.result
  if (!result) return null
  const li = result.columns.indexOf(tile.label)
  const vi = result.columns.indexOf(tile.value)
  if (vi === -1) return null
  return {
    labels: result.rows.map((r) => String(li === -1 ? '' : (r[li] ?? ''))),
    values: result.rows.map((r) =>
      typeof r[vi] === 'number' ? (r[vi] as number) : Number(r[vi]) || 0,
    ),
  }
}

function Dashboard({
  state,
  editable,
  update,
}: {
  state: DataStudioState
  editable: boolean
  update: Update
}) {
  const [query, setQuery] = useState(state.queries[0]?.id ?? '')
  const [chart, setChart] = useState<Tile['chart']>('column')
  const [title, setTitle] = useState('')
  const result = state.queries.find((q) => q.id === query)?.result
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const columns = result?.columns ?? []
  return (
    <div className="space-y-4" data-testid="dashboard-section">
      <h2 className="text-lg font-semibold text-slate-900">{state.dashboard.title}</h2>
      {editable && (
        <div
          className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
          data-testid="add-tile"
        >
          {state.queries.length === 0 ? (
            <p className="text-slate-500">
              Save a query in SQL first: charts are built from saved queries.
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                Query
                <select
                  aria-label="Tile query"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setLabel('')
                    setValue('')
                  }}
                  className="rounded border border-slate-300 px-2 py-1"
                >
                  {state.queries.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Chart
                <select
                  aria-label="Tile chart"
                  value={chart}
                  onChange={(e) => setChart(e.target.value as Tile['chart'])}
                  className="rounded border border-slate-300 px-2 py-1"
                >
                  {['column', 'bar', 'line', 'pie', 'number'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {chart !== 'number' && (
                <label className="flex flex-col gap-1">
                  Labels
                  <select
                    aria-label="Tile labels"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 font-mono"
                  >
                    <option value="">Choose…</option>
                    {columns.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1">
                Values
                <select
                  aria-label="Tile values"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 font-mono"
                >
                  <option value="">Choose…</option>
                  {columns.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1">
                Title
                <input
                  aria-label="Tile title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <button
                type="button"
                className={PRIMARY}
                disabled={!query || !value || (chart !== 'number' && !label)}
                onClick={() => {
                  update((s) => {
                    let n = s.dashboard.tiles.length + 1
                    while (s.dashboard.tiles.some((t) => t.id === `t${n}`)) n++
                    const tile: Tile = {
                      id: `t${n}`,
                      query,
                      chart,
                      label,
                      value,
                      title:
                        title.trim() ||
                        (s.queries.find((q) => q.id === query)?.name ?? ''),
                    }
                    return {
                      ...s,
                      dashboard: { ...s.dashboard, tiles: [...s.dashboard.tiles, tile] },
                    }
                  })
                  setTitle('')
                }}
              >
                Add chart
              </button>
            </>
          )}
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {state.dashboard.tiles.map((tile) => {
          const data = tileChart(state, tile)
          return (
            <section
              key={tile.id}
              className="rounded-lg border border-slate-200 bg-white p-3"
              data-testid="tile"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{tile.title}</h3>
                {editable && (
                  <button
                    type="button"
                    className="text-xs text-slate-500 underline"
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        dashboard: {
                          ...s.dashboard,
                          tiles: s.dashboard.tiles.filter((t) => t.id !== tile.id),
                        },
                      }))
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
              {!data ? (
                <p className="text-sm text-slate-500">
                  Run the query to show this chart.
                </p>
              ) : tile.chart === 'number' ? (
                <p className="py-6 text-center text-4xl font-semibold tabular-nums">
                  {data.values[0]?.toLocaleString('en-GB') ?? '—'}
                </p>
              ) : (
                <ChartView
                  className="w-full"
                  chart={{
                    type: tile.chart,
                    title: '',
                    labels: data.labels,
                    series: [{ name: tile.value, values: data.values }],
                  }}
                />
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Questions({
  state,
  editable,
  update,
}: {
  state: DataStudioState
  editable: boolean
  update: Update
}) {
  const set = (id: string, answer: string) =>
    update((s) => ({
      ...s,
      questions: s.questions.map((q) => (q.id === id ? { ...q, answer } : q)),
    }))
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
                onChange={(e) => set(q.id, e.target.value)}
                className="mt-2 rounded border border-slate-300 px-2 py-1"
              >
                <option value="">Choose…</option>
                {q.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <AnswerBox
                label={q.question}
                value={q.answer}
                unit={q.unit}
                disabled={!editable}
                onCommit={(v) => set(q.id, v)}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function AnswerBox({
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
