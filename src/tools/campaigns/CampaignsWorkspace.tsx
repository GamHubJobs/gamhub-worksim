/** Ad Campaigns: the screens of the paid advertising manager. */
import { useState } from 'react'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '../checks'
import type { ToolWorkspaceProps } from '../ui'
import { campaigns as tool } from './definition'
import { findAdSet, metrics, pacing, recent, setDailyBudget, setStatus } from './model'
import type { CampaignsState } from './schema'

type Props = ToolWorkspaceProps<CampaignsState>
type Act = (
  fn: (s: CampaignsState) => { state: CampaignsState; problems: string[] },
) => void

const cell = 'px-2.5 py-1.5'
const num = `${cell} text-right tabular-nums`
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export default function CampaignsWorkspace({
  state,
  readOnly,
  onUpdate,
  lockedSections,
}: Props) {
  const [section, setSection] = useState('overview')
  const [problems, setProblems] = useState<string[]>([])
  const editable = !readOnly && !!onUpdate
  const act: Act = (fn) => {
    const result = fn(state)
    if (result.problems.length > 0) return setProblems(result.problems)
    setProblems([])
    onUpdate?.((s) => fn(s).state)
  }
  return (
    <div className="flex h-full min-h-0 bg-slate-50" data-testid="campaigns">
      <nav
        aria-label="Ad Campaigns sections"
        className="w-48 shrink-0 space-y-0.5 border-r border-slate-200 bg-white p-2"
      >
        <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {state.account}
        </p>
        {tool.sections.map((s) => {
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
      <div
        className="min-w-0 flex-1 overflow-y-auto p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
        // Scrollable, so it can be reached and scrolled with the keyboard.
        tabIndex={0}
        role="region"
        aria-label="Work area"
      >
        {problems.length > 0 && (
          <ul
            role="alert"
            className="mb-3 list-disc rounded-md bg-red-50 p-3 pl-7 text-sm text-red-800"
          >
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {section === 'overview' && <Overview state={state} />}
        {section === 'adsets' && <AdSets state={state} editable={editable} act={act} />}
        {section === 'changes' && <Changes state={state} />}
      </div>
    </div>
  )
}

function Card({
  label,
  value,
  note,
  tone = 'slate',
}: {
  label: string
  value: string
  note: string
  tone?: 'slate' | 'red' | 'green'
}) {
  const tones = {
    slate: 'border-slate-200 bg-white',
    red: 'border-red-300 bg-red-50',
    green: 'border-emerald-300 bg-emerald-50',
  }
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-slate-600">{note}</p>
    </div>
  )
}

function PacingCards({ state }: { state: CampaignsState }) {
  const p = pacing(state)
  const share = p.projected / p.budget
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="pacing">
      <Card
        label="Month budget"
        value={formatMoney(p.budget)}
        note={`${p.remainingDays} days left, including today`}
      />
      <Card
        label="Spent so far"
        value={formatMoney(p.spent)}
        note={`${Math.round((p.spent / p.budget) * 100)}% of the budget`}
      />
      <Card
        label="Projected for the month"
        value={formatMoney(p.projected)}
        note={
          p.over > 0
            ? `${formatMoney(p.over)} over budget`
            : `${formatMoney(-p.over)} under budget (${Math.round(share * 100)}%)`
        }
        tone={p.over > 0 ? 'red' : share >= 0.95 ? 'green' : 'slate'}
      />
      <Card
        label="Daily budget (active)"
        value={formatMoney(p.daily)}
        note={`${formatMoney(p.sustainableDaily)} a day lands exactly on budget · limit ${formatMoney(state.dailyCap)}`}
      />
    </div>
  )
}

function Overview({ state }: { state: CampaignsState }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Overview</h2>
      <PacingCards state={state} />
      <h3 className="mt-6 mb-2 font-semibold text-slate-900">Campaigns, last 14 days</h3>
      <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
          <tr>
            <th className={cell}>Campaign</th>
            <th className={`${cell} text-right`}>Spend</th>
            <th className={`${cell} text-right`}>Conversions</th>
            <th className={`${cell} text-right`}>CPA</th>
            <th className={`${cell} text-right`}>ROAS</th>
          </tr>
        </thead>
        <tbody>
          {state.campaigns.map((c) => {
            const m = metrics(c.adSets.flatMap((a) => a.results))
            return (
              <tr key={c.id} className="border-t border-slate-100">
                <td className={cell}>
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-xs text-slate-500">{c.objective}</span>
                </td>
                <td className={num}>{formatMoney(m.spend)}</td>
                <td className={num}>{m.conversions}</td>
                <td className={num}>{formatMoney(m.cpa)}</td>
                <td className={`${num} ${m.roas < 1 ? 'text-red-700' : ''}`}>
                  {m.roas.toFixed(2)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BudgetInput({
  value,
  label,
  disabled,
  onCommit,
}: {
  value: number
  label: string
  disabled: boolean
  onCommit: (n: number) => void
}) {
  const [text, setText] = useState(String(value))
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number(text.replace(/[£,\s]/g, ''))
        if (Number.isFinite(n) && n !== value) onCommit(n)
        else setText(String(value))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className="w-20 rounded border border-slate-300 px-2 py-0.5 text-right tabular-nums disabled:border-transparent disabled:bg-transparent"
    />
  )
}

function AdSets({
  state,
  editable,
  act,
}: {
  state: CampaignsState
  editable: boolean
  act: Act
}) {
  const [days, setDays] = useState(14)
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Campaigns and ad sets</h2>
        <label className="flex items-center gap-2 text-sm">
          Results for
          <select
            aria-label="Period"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
          </select>
        </label>
      </div>
      <PacingCards state={state} />
      {state.campaigns.map((c) => (
        <section key={c.id} className="mt-5">
          <h3 className="mb-1 font-semibold text-slate-900">
            {c.name}{' '}
            <span className="text-sm font-normal text-slate-500">· {c.objective}</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
              <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
                <tr>
                  <th className={cell}>Ad set</th>
                  <th className={cell}>Status</th>
                  <th className={`${cell} text-right`}>Daily budget</th>
                  <th className={`${cell} text-right`}>Spend</th>
                  <th className={`${cell} text-right`}>CTR</th>
                  <th className={`${cell} text-right`}>Conv.</th>
                  <th className={`${cell} text-right`}>CPA</th>
                  <th className={`${cell} text-right`}>Revenue</th>
                  <th className={`${cell} text-right`}>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {c.adSets.map((a) => {
                  const m = metrics(recent(a, days))
                  return (
                    <tr
                      key={a.id}
                      className="border-t border-slate-100"
                      data-testid="adset-row"
                    >
                      <td className={cell}>
                        <span className="font-medium">{a.name}</span>
                        <span className="block text-xs text-slate-500">{a.audience}</span>
                      </td>
                      <td className={cell}>
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            role="switch"
                            aria-label={`${a.name} on`}
                            checked={a.status === 'active'}
                            disabled={!editable}
                            onChange={(e) =>
                              act((s) =>
                                setStatus(
                                  s,
                                  a.id,
                                  e.target.checked ? 'active' : 'paused',
                                ),
                              )
                            }
                          />
                          {a.status === 'active' ? 'On' : 'Paused'}
                        </label>
                      </td>
                      <td className={num}>
                        £
                        <BudgetInput
                          key={a.dailyBudget}
                          value={a.dailyBudget}
                          label={`${a.name} daily budget`}
                          disabled={!editable}
                          onCommit={(n) => act((s) => setDailyBudget(s, a.id, n))}
                        />
                      </td>
                      <td className={num}>{formatMoney(m.spend)}</td>
                      <td className={num}>{pct(m.ctr)}</td>
                      <td className={num}>{m.conversions}</td>
                      <td className={num}>{m.conversions ? formatMoney(m.cpa) : '—'}</td>
                      <td className={num}>{formatMoney(m.revenue)}</td>
                      <td
                        className={`${num} font-semibold ${m.roas < 1 ? 'text-red-700' : m.roas >= 3 ? 'text-emerald-700' : ''}`}
                      >
                        {m.roas.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

function Changes({ state }: { state: CampaignsState }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Change history</h2>
      {state.changes.length === 0 ? (
        <p className="text-sm text-slate-500">No changes yet.</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {state.changes.map((c, i) => (
            <li key={i} className="rounded border border-slate-200 bg-white px-3 py-1.5">
              <span className="font-medium">
                {findAdSet(state, c.adSet)?.name ?? c.adSet}
              </span>
              : {c.change}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
