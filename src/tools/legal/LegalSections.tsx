/** Matter Desk: research, contract review, calendar, billing, document review and the audit log. */
import { useState } from 'react'
import {
  addDays,
  billableHours,
  deadline,
  limitationDate,
  WESTMARK,
} from './jurisdiction'
import {
  addKeyDate,
  createInvoice,
  logTime,
  matterById,
  removeAuthority,
  removeKeyDate,
  reviewClause,
  saveAuthority,
  searchLibrary,
  tagDocument,
  unbilled,
} from './model'
import type { LegalState } from './schema'
import { card, field, primary, secondary, type Run } from './styles'

interface ViewProps {
  state: LegalState
  canEdit: boolean
  run: Run
}

function MatterPicker({
  state,
  value,
  onChange,
  only,
}: {
  state: LegalState
  value: string
  onChange: (id: string) => void
  only?: 'open'
}) {
  return (
    <label className="text-sm">
      Matter{' '}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={field}
        aria-label="Matter"
      >
        {state.matters
          .filter((m) => !only || m.status === only)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}: {m.title}
            </option>
          ))}
      </select>
    </label>
  )
}

const firstOpen = (s: LegalState) =>
  s.matters.find((m) => m.status === 'open')?.id ?? s.matters[0]?.id ?? ''

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

export function ResearchView({ state, canEdit, run }: ViewProps) {
  const [query, setQuery] = useState('')
  const [matterId, setMatterId] = useState(firstOpen(state))
  const matter = matterById(state, matterId)
  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the law library"
          aria-label="Search the law library"
          className={`${field} min-w-72`}
        />
        <MatterPicker state={state} value={matterId} onChange={setMatterId} />
      </div>
      <ul className="space-y-2" data-testid="library-results">
        {searchLibrary(state, query).map((a) => {
          const saved = matter?.authorities.includes(a.id)
          return (
            <li key={a.id} className={card}>
              <p className="font-semibold">
                {a.citation}{' '}
                <span className="font-normal text-slate-600">· {a.kind}</span>
              </p>
              <p className="text-slate-800">{a.title}</p>
              <p className="mt-1">{a.summary}</p>
              {!a.goodLaw && (
                <p className="mt-1 font-semibold text-red-700">NOT GOOD LAW: {a.note}</p>
              )}
              {canEdit && matter && (
                <button
                  type="button"
                  className={`${secondary} mt-2`}
                  onClick={() =>
                    run((s) =>
                      saved
                        ? removeAuthority(s, matterId, a.id)
                        : saveAuthority(s, matterId, a.id),
                    )
                  }
                  aria-label={`${saved ? 'Remove' : 'Save'} ${a.citation} ${saved ? 'from' : 'to'} ${matterId}`}
                >
                  {saved ? `Remove from ${matterId}` : `Save to ${matterId}`}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contract review
// ---------------------------------------------------------------------------

export function ContractsView({ state, canEdit, run }: ViewProps) {
  const [comments, setComments] = useState<Record<string, string>>({})
  return (
    <div className="space-y-3 p-3">
      {state.contracts.map((k) => (
        <section key={k.id} aria-label={k.title} className="space-y-2">
          <h3 className="font-semibold">
            {k.title}{' '}
            <span className="text-sm font-normal text-slate-600">({k.matterId})</span>
          </h3>
          {k.clauses.map((c) => (
            <div key={c.id} className={card} data-testid={`clause-${c.id}`}>
              <p className="font-semibold">{c.heading}</p>
              <p className="mt-1">{c.text}</p>
              <p className="mt-1 rounded bg-indigo-50 p-1.5 text-xs text-indigo-950">
                Playbook: {c.playbook}
              </p>
              {c.decision && (
                <p className="mt-1 text-xs">
                  Decision: <strong>{c.decision}</strong>
                  {c.comment && ` · “${c.comment}”`}
                </p>
              )}
              {canEdit && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={comments[c.id] ?? ''}
                    onChange={(e) =>
                      setComments((x) => ({ ...x, [c.id]: e.target.value }))
                    }
                    placeholder="Comment for the other side"
                    aria-label={`Comment on ${c.heading}`}
                    className={`${field} min-w-72 flex-1`}
                  />
                  {(['accept', 'amend', 'reject'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={d === 'accept' ? secondary : primary}
                      onClick={() =>
                        run((s) => reviewClause(s, k.id, c.id, d, comments[c.id] ?? ''))
                      }
                    >
                      {d[0].toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export function CalendarView({ state, canEdit, run }: ViewProps) {
  const [matterId, setMatterId] = useState(firstOpen(state))
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [from, setFrom] = useState(state.today)
  const [days, setDays] = useState(String(WESTMARK.defenceDays))
  const matter = matterById(state, matterId)
  const all = state.matters
    .flatMap((m) => m.keyDates.map((k) => ({ ...k, matter: m.id })))
    .sort((a, b) => a.date.localeCompare(b.date))
  const n = Number(days)
  return (
    <div className="space-y-3 p-3">
      <div className={card}>
        <h3 className="font-semibold">Deadline calculator (Westmark rules)</h3>
        <p className="mt-1 text-xs text-slate-600">
          Defence: {WESTMARK.defenceDays} days after service. Appeal:{' '}
          {WESTMARK.appealDays} days after judgment. Weekends and public holidays move a
          deadline to the next working day.
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs">
            From (event date)
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={`${field} block`}
            />
          </label>
          <label className="text-xs">
            Days
            <input
              inputMode="numeric"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={`${field} block w-20`}
            />
          </label>
          {from && Number.isInteger(n) && n > 0 && (
            <p className="text-sm" data-testid="calculated-deadline">
              {addDays(from, n)} → <strong>{deadline(from, n)}</strong>
            </p>
          )}
        </div>
        {matter?.arose && (
          <p className="mt-2 text-xs">
            Limitation for {matter.id} ({matter.kind}, arose {matter.arose}):{' '}
            {matter.kind !== 'corporate'
              ? limitationDate(matter.arose, matter.kind)
              : 'not applicable'}
          </p>
        )}
      </div>
      {canEdit && (
        <form
          className={`${card} flex flex-wrap items-end gap-2`}
          onSubmit={(e) => {
            e.preventDefault()
            if (run((s) => addKeyDate(s, matterId, label, date))) {
              setLabel('')
              setDate('')
            }
          }}
        >
          <MatterPicker state={state} value={matterId} onChange={setMatterId} />
          <label className="text-xs">
            What is due
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={`${field} block`}
              aria-label="What is due"
            />
          </label>
          <label className="text-xs">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${field} block`}
              aria-label="Key date"
            />
          </label>
          <button type="submit" className={primary}>
            Add to the calendar
          </button>
        </form>
      )}
      <table
        className="w-full rounded border border-slate-200 bg-white text-sm"
        data-testid="calendar"
      >
        <thead className="bg-slate-100 text-left text-xs">
          <tr>
            <th className="px-2 py-1">Date</th>
            <th className="px-2 py-1">Matter</th>
            <th className="px-2 py-1">What</th>
            <th className="px-2 py-1" />
          </tr>
        </thead>
        <tbody>
          {all.map((k) => (
            <tr key={`${k.matter}-${k.id}`} className="border-t border-slate-100">
              <td className="px-2 py-1">{k.date}</td>
              <td className="px-2 py-1">{k.matter}</td>
              <td className="px-2 py-1">{k.label}</td>
              <td className="px-2 py-1">
                {canEdit && (
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => run((s) => removeKeyDate(s, k.matter, k.id))}
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Time and billing
// ---------------------------------------------------------------------------

export function BillingView({ state, canEdit, run }: ViewProps) {
  const [matterId, setMatterId] = useState(firstOpen(state))
  const [minutes, setMinutes] = useState('')
  const [description, setDescription] = useState('')
  const [billable, setBillable] = useState(true)
  const matter = matterById(state, matterId)
  const due = unbilled(state, matterId)
  const entries = state.time.filter((t) => t.matterId === matterId)
  return (
    <div className="space-y-3 p-3">
      {canEdit && (
        <form
          className={`${card} flex flex-wrap items-end gap-2`}
          onSubmit={(e) => {
            e.preventDefault()
            if (
              run((s) => logTime(s, matterId, Number(minutes), description, billable))
            ) {
              setMinutes('')
              setDescription('')
              setBillable(true)
            }
          }}
        >
          <MatterPicker
            state={state}
            value={matterId}
            onChange={setMatterId}
            only="open"
          />
          <label className="text-xs">
            Minutes
            <input
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={`${field} block w-24`}
              aria-label="Minutes"
            />
          </label>
          <label className="text-xs">
            Work done
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${field} block min-w-72`}
              aria-label="Work done"
            />
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
            />
            Billable
          </label>
          <button type="submit" className={primary}>
            Record time
          </button>
        </form>
      )}
      <table
        className="w-full rounded border border-slate-200 bg-white text-sm"
        data-testid="time-entries"
      >
        <thead className="bg-slate-100 text-left text-xs">
          <tr>
            {['Date', 'Minutes', 'Billed as', 'Work', 'Billable', 'Invoiced'].map((h) => (
              <th key={h} className="px-2 py-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((t) => (
            <tr key={t.id} className="border-t border-slate-100">
              <td className="px-2 py-1">{t.date}</td>
              <td className="px-2 py-1">{t.minutes}</td>
              <td className="px-2 py-1">{billableHours(t.minutes)} h</td>
              <td className="px-2 py-1">{t.description}</td>
              <td className="px-2 py-1">{t.billable ? 'Yes' : 'No'}</td>
              <td className="px-2 py-1">{t.invoiced ? 'Yes' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`${card} flex flex-wrap items-center justify-between gap-2`}>
        <p data-testid="unbilled">
          Unbilled for {matterId}: {due.hours} h × £{matter?.rate ?? 0} ={' '}
          <strong>£{due.total.toFixed(2)}</strong>
        </p>
        {canEdit && (
          <button
            type="button"
            className={primary}
            onClick={() => run((s) => createInvoice(s, matterId))}
          >
            Raise invoice
          </button>
        )}
      </div>
      {state.invoices.length > 0 && (
        <ul className="space-y-1 text-sm" data-testid="invoices">
          {state.invoices.map((i) => (
            <li key={i.id} className={card}>
              {i.id} · {i.matterId} · {i.date} · {i.hours} h · £{i.total.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Document review
// ---------------------------------------------------------------------------

export function DiscoveryView({ state, canEdit, run }: ViewProps) {
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const counts = (['relevant', 'not-relevant', 'privileged'] as const).map(
    (t) => `${state.documents.filter((d) => d.tag === t).length} ${t.replace('-', ' ')}`,
  )
  return (
    <div className="space-y-2 p-3">
      <p className="text-sm text-slate-700">
        Review each document for the issues in dispute. {counts.join(' · ')} ·{' '}
        {state.documents.filter((d) => !d.tag).length} to review.
      </p>
      {state.documents.map((d) => (
        <div key={d.id} className={card} data-testid={`doc-${d.id}`}>
          <p className="font-semibold">
            {d.id}: {d.title}
          </p>
          <p className="text-xs text-slate-600">
            {d.date} · from {d.from} to {d.to} · {d.matterId}
          </p>
          <p className="mt-1">{d.text}</p>
          {d.tag && (
            <p className="mt-1 text-xs">
              Tagged <strong>{d.tag}</strong>
              {d.reason && `: ${d.reason}`}
            </p>
          )}
          {canEdit && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={secondary}
                onClick={() => run((s) => tagDocument(s, d.id, 'relevant'))}
              >
                Relevant
              </button>
              <button
                type="button"
                className={secondary}
                onClick={() => run((s) => tagDocument(s, d.id, 'not-relevant'))}
              >
                Not relevant
              </button>
              <input
                value={reasons[d.id] ?? ''}
                onChange={(e) => setReasons((r) => ({ ...r, [d.id]: e.target.value }))}
                placeholder="Basis for privilege"
                aria-label={`Basis for privilege for ${d.id}`}
                className={`${field} min-w-64`}
              />
              <button
                type="button"
                className={secondary}
                onClick={() =>
                  run((s) => tagDocument(s, d.id, 'privileged', reasons[d.id] ?? ''))
                }
              >
                Privileged
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function AuditView({ state }: { state: LegalState }) {
  return (
    <div className="p-3">
      <table
        className="w-full rounded border border-slate-200 bg-white text-sm"
        data-testid="audit-log"
      >
        <thead className="bg-slate-100 text-left text-xs">
          <tr>
            {['Date', 'Action', 'Matter', 'Detail'].map((h) => (
              <th key={h} className="px-2 py-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...state.audit].reverse().map((a, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-2 py-1">{a.at}</td>
              <td className="px-2 py-1">{a.action}</td>
              <td className="px-2 py-1">{a.matterId ?? ''}</td>
              <td className="px-2 py-1">{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
