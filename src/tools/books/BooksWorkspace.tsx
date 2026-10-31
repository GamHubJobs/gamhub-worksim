/**
 * Books: the accounting software's screens. Sections on the left; everything
 * is calculated live from the posted journals.
 */
import { useState, type ReactNode } from 'react'
import { formatMoney } from '../checks'
import type { ToolWorkspaceProps } from '../ui'
import { Icon } from '../../ui/Icon'
import { books } from './definition'
import {
  accountBalance,
  accountLedger,
  addDraftJournal,
  balanceSheet,
  blankLine,
  deleteDraftJournal,
  findAccount,
  journalProblems,
  journalTotals,
  postJournal,
  profitAndLoss,
  reverseJournal,
  trialBalance,
  updateJournal,
} from './ledger'
import {
  ACCOUNT_TYPES,
  type Account,
  type AccountType,
  type BooksState,
  type Journal,
} from './schema'

type Props = ToolWorkspaceProps<BooksState>

const TYPE_NAMES: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
}

const SOURCE_NAMES: Record<Journal['source'], string> = {
  manual: 'Manual journal',
  opening: 'Opening balances',
  invoice: 'Sales invoice',
  'invoice-payment': 'Customer payment',
  bill: 'Supplier bill',
  'bill-payment': 'Bill payment',
  bank: 'Bank transaction',
  payroll: 'Payroll',
}

const money = (n: number) => formatMoney(n)
const cell = 'px-3 py-1.5'
const numeric = `${cell} text-right tabular-nums`

export default function BooksWorkspace({
  state,
  readOnly,
  onUpdate,
  lockedSections,
}: Props) {
  const [section, setSection] = useState('overview')
  const [selectedJournal, setSelectedJournal] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const editable = !readOnly && !!onUpdate
  const update = (change: (s: BooksState) => BooksState) => onUpdate?.(change)

  const open = (id: string) => {
    if (lockedSections[id]) return
    setSection(id)
  }

  return (
    <div className="flex h-full min-h-0 bg-slate-50" data-testid="books">
      <nav
        aria-label="Books sections"
        className="w-52 shrink-0 space-y-0.5 overflow-y-auto border-r border-slate-200 bg-white p-2"
      >
        <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {state.settings.companyName}
        </p>
        {books.sections.map((s) => {
          const locked = lockedSections[s.id]
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => open(s.id)}
              disabled={!!locked}
              title={locked ? `Unlocks when you become ${locked}.` : s.description}
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
        {section === 'overview' && (
          <Overview
            state={state}
            onOpenJournal={(id) => {
              setSelectedJournal(id)
              setSection('journals')
            }}
          />
        )}
        {section === 'journals' && (
          <Journals
            state={state}
            editable={editable}
            selected={selectedJournal}
            onSelect={setSelectedJournal}
            update={update}
          />
        )}
        {section === 'accounts' && (
          <Accounts
            state={state}
            editable={editable}
            selected={selectedAccount}
            onSelect={setSelectedAccount}
            update={update}
          />
        )}
        {section === 'reports' && <Reports state={state} />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
    </div>
  )
}

function Overview({
  state,
  onOpenJournal,
}: {
  state: BooksState
  onOpenJournal: (id: string) => void
}) {
  const drafts = state.journals.filter((j) => j.status === 'draft')
  const pl = profitAndLoss(state)
  const recent = [...state.journals]
    .filter((j) => j.status === 'posted')
    .sort((a, b) => b.number - a.number)
    .slice(0, 6)
  return (
    <div data-testid="books-overview">
      <Heading title="Overview" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Bank"
          value={money(accountBalance(state, '1200'))}
          note="Current account"
        />
        <Card
          label="Customers owe us"
          value={money(accountBalance(state, '1100'))}
          note="Accounts receivable"
        />
        <Card
          label="We owe suppliers"
          value={money(accountBalance(state, '2100'))}
          note="Accounts payable"
        />
        <Card label="Profit" value={money(pl.netProfit)} note="Income less expenses" />
      </div>
      {drafts.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            {drafts.length} draft journal{drafts.length === 1 ? '' : 's'} not posted yet
          </p>
          <ul className="mt-1 list-disc pl-5">
            {drafts.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  className="underline"
                  onClick={() => onOpenJournal(j.id)}
                >
                  Journal {j.number}: {j.memo || 'no description'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h3 className="mt-6 mb-2 font-semibold text-slate-900">Recent journals</h3>
      <JournalTable journals={recent} onSelect={onOpenJournal} />
    </div>
  )
}

function JournalTable({
  journals,
  selected,
  onSelect,
}: {
  journals: Journal[]
  selected?: string | null
  onSelect: (id: string) => void
}) {
  if (journals.length === 0) {
    return <p className="text-sm text-slate-500">No journals yet.</p>
  }
  return (
    <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
      <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
        <tr>
          <th className={cell}>No.</th>
          <th className={cell}>Date</th>
          <th className={cell}>Description</th>
          <th className={cell}>Type</th>
          <th className={`${cell} text-right`}>Amount</th>
          <th className={cell}>Status</th>
        </tr>
      </thead>
      <tbody>
        {journals.map((j) => (
          <tr
            key={j.id}
            onClick={() => onSelect(j.id)}
            className={`cursor-pointer border-t border-slate-100 hover:bg-indigo-50 ${
              selected === j.id ? 'bg-indigo-50' : ''
            }`}
            data-testid="journal-row"
          >
            <td className={cell}>{j.number}</td>
            <td className={cell}>{j.date}</td>
            <td className={cell}>
              {j.memo || <span className="text-slate-400">(none)</span>}
            </td>
            <td className={`${cell} text-slate-500`}>{SOURCE_NAMES[j.source]}</td>
            <td className={numeric}>{money(journalTotals(j.lines).debit)}</td>
            <td className={cell}>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  j.status === 'posted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {j.status === 'posted' ? 'Posted' : 'Draft'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Journals
// ---------------------------------------------------------------------------

function Journals({
  state,
  editable,
  selected,
  onSelect,
  update,
}: {
  state: BooksState
  editable: boolean
  selected: string | null
  onSelect: (id: string | null) => void
  update: (change: (s: BooksState) => BooksState) => void
}) {
  const journal = state.journals.find((j) => j.id === selected) ?? null
  const ordered = [...state.journals].sort((a, b) => b.number - a.number)
  return (
    <div>
      <Heading title="Journals">
        {editable && (
          <button
            type="button"
            onClick={() => {
              let id = ''
              update((s) => {
                const result = addDraftJournal(s)
                id = result.id
                return result.state
              })
              onSelect(id)
            }}
            className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800"
          >
            New journal
          </button>
        )}
      </Heading>
      {journal && (
        <JournalEditor
          key={journal.id}
          state={state}
          journal={journal}
          editable={editable && journal.status === 'draft'}
          canReverse={
            editable && journal.status === 'posted' && journal.source === 'manual'
          }
          update={update}
          onClose={() => onSelect(null)}
        />
      )}
      <JournalTable journals={ordered} selected={selected} onSelect={onSelect} />
    </div>
  )
}

/** A number box that commits when the player leaves it (one undo step per edit). */
function MoneyInput({
  value,
  onCommit,
  label,
  disabled,
}: {
  value: number
  onCommit: (value: number) => void
  label: string
  disabled: boolean
}) {
  const [text, setText] = useState(value === 0 ? '' : value.toFixed(2))
  const commit = () => {
    const parsed = Number(text.replace(/[£,\s]/g, '') || '0')
    if (Number.isFinite(parsed) && parsed >= 0) {
      if (parsed !== value) onCommit(Math.round(parsed * 100) / 100)
    } else {
      setText(value === 0 ? '' : value.toFixed(2))
    }
  }
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className="w-24 rounded border border-slate-300 px-2 py-1 text-right tabular-nums disabled:border-transparent disabled:bg-transparent"
    />
  )
}

function TextInput({
  value,
  onCommit,
  label,
  disabled,
  className = '',
  type = 'text',
}: {
  value: string
  onCommit: (value: string) => void
  label: string
  disabled: boolean
  className?: string
  type?: 'text' | 'date'
}) {
  const [text, setText] = useState(value)
  return (
    <input
      aria-label={label}
      type={type}
      value={text}
      disabled={disabled}
      onChange={(e) => {
        setText(e.target.value)
        if (type === 'date') onCommit(e.target.value)
      }}
      onBlur={() => text !== value && onCommit(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={`rounded border border-slate-300 px-2 py-1 disabled:border-transparent disabled:bg-transparent ${className}`}
    />
  )
}

export function AccountSelect({
  accounts,
  value,
  onChange,
  label,
  disabled,
}: {
  accounts: Account[]
  value: string
  onChange: (code: string) => void
  label: string
  disabled: boolean
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-56 rounded border border-slate-300 px-2 py-1 disabled:border-transparent disabled:bg-transparent disabled:text-slate-900 disabled:opacity-100"
    >
      <option value="">Choose an account…</option>
      {ACCOUNT_TYPES.map((type) => (
        <optgroup key={type} label={TYPE_NAMES[type]}>
          {accounts
            .filter((a) => a.type === type)
            .map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} {a.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}

function JournalEditor({
  state,
  journal,
  editable,
  canReverse,
  update,
  onClose,
}: {
  state: BooksState
  journal: Journal
  editable: boolean
  canReverse: boolean
  update: (change: (s: BooksState) => BooksState) => void
  onClose: () => void
}) {
  const [problems, setProblems] = useState<string[]>([])
  const totals = journalTotals(journal.lines)
  const difference = Math.round((totals.debit - totals.credit) * 100) / 100
  const change = (fn: (j: Journal) => Journal) => {
    setProblems([])
    update((s) => updateJournal(s, journal.id, fn))
  }
  const setLine = (index: number, patch: Partial<Journal['lines'][number]>) =>
    change((j) => ({
      ...j,
      lines: j.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }))

  return (
    <section
      className="mb-5 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm"
      data-testid="journal-editor"
      aria-label={`Journal ${journal.number}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-slate-900">
          Journal {journal.number}{' '}
          <span className="text-sm font-normal text-slate-500">
            {journal.status === 'posted'
              ? `· Posted · ${SOURCE_NAMES[journal.source]}`
              : '· Draft'}
          </span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Close
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          Date
          <TextInput
            type="date"
            label="Journal date"
            value={journal.date}
            disabled={!editable}
            onCommit={(date) => change((j) => ({ ...j, date }))}
          />
        </label>
        <label className="flex flex-1 items-center gap-2">
          Description
          <TextInput
            label="Journal description"
            value={journal.memo}
            disabled={!editable}
            className="min-w-64 flex-1"
            onCommit={(memo) => change((j) => ({ ...j, memo }))}
          />
        </label>
      </div>
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-xs text-slate-500 uppercase">
          <tr>
            <th className={cell}>Account</th>
            <th className={cell}>Line description</th>
            <th className={`${cell} text-right`}>Debit</th>
            <th className={`${cell} text-right`}>Credit</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {journal.lines.map((line, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className={cell}>
                <AccountSelect
                  accounts={state.accounts}
                  value={line.account}
                  label={`Line ${i + 1} account`}
                  disabled={!editable}
                  onChange={(account) => setLine(i, { account })}
                />
              </td>
              <td className={cell}>
                <TextInput
                  label={`Line ${i + 1} description`}
                  value={line.description}
                  disabled={!editable}
                  className="w-full min-w-36"
                  onCommit={(description) => setLine(i, { description })}
                />
              </td>
              <td className={`${cell} text-right`}>
                <MoneyInput
                  key={`d${line.debit}`}
                  label={`Line ${i + 1} debit`}
                  value={line.debit}
                  disabled={!editable}
                  onCommit={(debit) => setLine(i, { debit })}
                />
              </td>
              <td className={`${cell} text-right`}>
                <MoneyInput
                  key={`c${line.credit}`}
                  label={`Line ${i + 1} credit`}
                  value={line.credit}
                  disabled={!editable}
                  onCommit={(credit) => setLine(i, { credit })}
                />
              </td>
              <td className={cell}>
                {editable && journal.lines.length > 2 && (
                  <button
                    type="button"
                    aria-label={`Remove line ${i + 1}`}
                    onClick={() =>
                      change((j) => ({ ...j, lines: j.lines.filter((_, k) => k !== i) }))
                    }
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 font-semibold">
            <td className={cell}>
              {editable && (
                <button
                  type="button"
                  onClick={() =>
                    change((j) => ({ ...j, lines: [...j.lines, blankLine()] }))
                  }
                  className="rounded border border-slate-300 px-2 py-1 text-sm font-normal hover:bg-slate-50"
                >
                  Add line
                </button>
              )}
            </td>
            <td className={`${cell} text-right`}>Totals</td>
            <td className={numeric} data-testid="journal-debits">
              {money(totals.debit)}
            </td>
            <td className={numeric} data-testid="journal-credits">
              {money(totals.credit)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      {journal.status === 'draft' && (
        <p
          className={`mt-2 text-sm ${difference === 0 ? 'text-emerald-700' : 'text-amber-700'}`}
          data-testid="journal-balance"
        >
          {difference === 0
            ? totals.debit === 0
              ? 'Enter the amounts.'
              : 'Balanced: debits equal credits.'
            : `Out of balance by ${money(Math.abs(difference))}: debits and credits must be equal.`}
        </p>
      )}
      {problems.length > 0 && (
        <ul
          className="mt-2 list-disc rounded-md bg-red-50 p-3 pl-7 text-sm text-red-800"
          role="alert"
        >
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        {editable && (
          <>
            <button
              type="button"
              onClick={() => {
                const found = journalProblems(state, journal)
                if (found.length > 0) {
                  setProblems(found)
                  return
                }
                update((s) => postJournal(s, journal.id).state)
              }}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Post journal
            </button>
            <button
              type="button"
              onClick={() => {
                update((s) => deleteDraftJournal(s, journal.id))
                onClose()
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Delete draft
            </button>
          </>
        )}
        {canReverse && (
          <button
            type="button"
            onClick={() => update((s) => reverseJournal(s, journal.id))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            title="Posts the opposite entry. Posted journals are never deleted."
          >
            Reverse journal
          </button>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Chart of accounts and ledgers
// ---------------------------------------------------------------------------

function Accounts({
  state,
  editable,
  selected,
  onSelect,
  update,
}: {
  state: BooksState
  editable: boolean
  selected: string | null
  onSelect: (code: string | null) => void
  update: (change: (s: BooksState) => BooksState) => void
}) {
  const account = selected ? findAccount(state, selected) : undefined
  if (account) {
    const entries = accountLedger(state, account.code)
    return (
      <div data-testid="account-ledger">
        <Heading title={`${account.code} ${account.name}`}>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            All accounts
          </button>
        </Heading>
        <p className="mb-3 text-sm text-slate-600">
          {TYPE_NAMES[account.type]} · balance{' '}
          <strong className="tabular-nums">
            {money(accountBalance(state, account.code))}
          </strong>
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing has been posted to this account.
          </p>
        ) : (
          <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
              <tr>
                <th className={cell}>Date</th>
                <th className={cell}>Journal</th>
                <th className={cell}>Description</th>
                <th className={`${cell} text-right`}>Debit</th>
                <th className={`${cell} text-right`}>Credit</th>
                <th className={`${cell} text-right`}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className={cell}>{e.date}</td>
                  <td className={cell}>{e.number}</td>
                  <td className={cell}>{e.description || e.memo}</td>
                  <td className={numeric}>{e.debit ? money(e.debit) : ''}</td>
                  <td className={numeric}>{e.credit ? money(e.credit) : ''}</td>
                  <td className={`${numeric} font-medium`}>{money(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }
  return (
    <div>
      <Heading title="Chart of accounts" />
      {editable && <NewAccount state={state} update={update} />}
      {ACCOUNT_TYPES.map((type) => (
        <section key={type} className="mb-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">
            {TYPE_NAMES[type]}
          </h3>
          <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
            <tbody>
              {state.accounts
                .filter((a) => a.type === type)
                .map((a) => (
                  <tr
                    key={a.code}
                    onClick={() => onSelect(a.code)}
                    className="cursor-pointer border-t border-slate-100 first:border-t-0 hover:bg-indigo-50"
                  >
                    <td className={`${cell} w-20 font-mono`}>{a.code}</td>
                    <td className={cell}>{a.name}</td>
                    <td className={numeric}>{money(accountBalance(state, a.code))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}

function NewAccount({
  state,
  update,
}: {
  state: BooksState
  update: (change: (s: BooksState) => BooksState) => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('expense')
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault()
        if (!/^\d{4}$/.test(code)) return setError('An account code has four digits.')
        if (findAccount(state, code)) return setError(`Account ${code} already exists.`)
        if (name.trim() === '') return setError('Give the account a name.')
        update((s) => ({
          ...s,
          accounts: [
            ...s.accounts,
            { code, name: name.trim(), type, system: false },
          ].sort((a, b) => a.code.localeCompare(b.code)),
        }))
        setCode('')
        setName('')
        setError(null)
      }}
    >
      <label className="flex flex-col gap-1">
        Code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-20 rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        Type
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="rounded border border-slate-300 px-2 py-1"
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_NAMES[t]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
      >
        Add account
      </button>
      {error && <p className="w-full text-red-700">{error}</p>}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function Reports({ state }: { state: BooksState }) {
  const [report, setReport] = useState<'trial' | 'pl' | 'bs'>('trial')
  const [asAt, setAsAt] = useState(state.settings.today)
  return (
    <div>
      <Heading title="Reports">
        <label className="flex items-center gap-2 text-sm">
          As at
          <input
            type="date"
            aria-label="Report date"
            value={asAt}
            onChange={(e) => setAsAt(e.target.value || state.settings.today)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
      </Heading>
      <div className="mb-4 flex gap-1" role="tablist">
        {(
          [
            ['trial', 'Trial balance'],
            ['pl', 'Profit and loss'],
            ['bs', 'Balance sheet'],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={report === id}
            onClick={() => setReport(id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              report === id
                ? 'bg-indigo-700 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      {report === 'trial' && <TrialBalanceReport state={state} asAt={asAt} />}
      {report === 'pl' && <ProfitAndLossReport state={state} asAt={asAt} />}
      {report === 'bs' && <BalanceSheetReport state={state} asAt={asAt} />}
    </div>
  )
}

function TrialBalanceReport({ state, asAt }: { state: BooksState; asAt: string }) {
  const tb = trialBalance(state, asAt)
  const balanced = tb.debit === tb.credit
  return (
    <div data-testid="trial-balance">
      <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
          <tr>
            <th className={cell}>Account</th>
            <th className={`${cell} text-right`}>Debit</th>
            <th className={`${cell} text-right`}>Credit</th>
          </tr>
        </thead>
        <tbody>
          {tb.rows.map((r) => (
            <tr key={r.code} className="border-t border-slate-100">
              <td className={cell}>
                <span className="font-mono">{r.code}</span> {r.name}
              </td>
              <td className={numeric}>{r.debit ? money(r.debit) : ''}</td>
              <td className={numeric}>{r.credit ? money(r.credit) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 font-semibold">
            <td className={cell}>Total</td>
            <td className={numeric}>{money(tb.debit)}</td>
            <td className={numeric}>{money(tb.credit)}</td>
          </tr>
        </tfoot>
      </table>
      <p className={`mt-2 text-sm ${balanced ? 'text-emerald-700' : 'text-red-700'}`}>
        {balanced
          ? 'The trial balance balances.'
          : 'The trial balance does not balance: check the journals.'}
      </p>
    </div>
  )
}

function ReportSection({
  title,
  lines,
  total,
}: {
  title: string
  lines: Array<{ code: string; name: string; amount: number }>
  total: number
}) {
  return (
    <>
      <tr className="bg-slate-50">
        <td colSpan={2} className={`${cell} font-semibold text-slate-800`}>
          {title}
        </td>
      </tr>
      {lines.map((l) => (
        <tr key={l.code} className="border-t border-slate-100">
          <td className={`${cell} pl-6`}>{l.name}</td>
          <td className={numeric}>{money(l.amount)}</td>
        </tr>
      ))}
      <tr className="border-t border-slate-200 font-medium">
        <td className={cell}>Total {title.toLowerCase()}</td>
        <td className={numeric}>{money(total)}</td>
      </tr>
    </>
  )
}

function ProfitAndLossReport({ state, asAt }: { state: BooksState; asAt: string }) {
  const pl = profitAndLoss(state, asAt)
  return (
    <table
      className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white text-sm"
      data-testid="profit-and-loss"
    >
      <tbody>
        <ReportSection title="Income" lines={pl.income} total={pl.totalIncome} />
        <ReportSection title="Expenses" lines={pl.expenses} total={pl.totalExpenses} />
        <tr className="border-t-2 border-slate-300 text-base font-semibold">
          <td className={cell}>{pl.netProfit >= 0 ? 'Net profit' : 'Net loss'}</td>
          <td className={numeric}>{money(pl.netProfit)}</td>
        </tr>
      </tbody>
    </table>
  )
}

function BalanceSheetReport({ state, asAt }: { state: BooksState; asAt: string }) {
  const bs = balanceSheet(state, asAt)
  return (
    <div data-testid="balance-sheet">
      <table className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white text-sm">
        <tbody>
          <ReportSection title="Assets" lines={bs.assets} total={bs.totalAssets} />
          <ReportSection
            title="Liabilities"
            lines={bs.liabilities}
            total={bs.totalLiabilities}
          />
          <ReportSection
            title="Equity"
            lines={[
              ...bs.equity,
              { code: 'profit', name: 'Profit for the period', amount: bs.profit },
            ]}
            total={bs.totalEquity}
          />
          <tr className="border-t-2 border-slate-300 font-semibold">
            <td className={cell}>Liabilities and equity</td>
            <td className={numeric}>{money(bs.totalLiabilities + bs.totalEquity)}</td>
          </tr>
        </tbody>
      </table>
      <p className={`mt-2 text-sm ${bs.balances ? 'text-emerald-700' : 'text-red-700'}`}>
        {bs.balances
          ? 'Assets equal liabilities plus equity.'
          : 'The balance sheet does not balance.'}
      </p>
    </div>
  )
}
