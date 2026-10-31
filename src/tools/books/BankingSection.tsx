/** Books: the bank statement and its reconciliation with the ledger. */
import { useState } from 'react'
import { formatMoney } from '../checks'
import {
  bankLedgerEntries,
  createFromLine,
  matchCandidates,
  matchLine,
  reconciliation,
  unmatchLine,
} from './banking'
import { AccountSelect, Badge, Heading, Problems } from './inputs'
import { cell, numeric, POST, SECONDARY } from './styles'
import type { BankLine, BooksState } from './schema'

type Update = (change: (s: BooksState) => BooksState) => void

export function BankingSection({
  state,
  editable,
  update,
}: {
  state: BooksState
  editable: boolean
  update: Update
}) {
  const bank = state.bank
  const rec = reconciliation(state)
  if (!bank || !rec) {
    return (
      <div>
        <Heading title="Banking" />
        <p className="text-sm text-slate-600">
          No bank statement has been imported into this file.
        </p>
      </div>
    )
  }
  const journals = new Map(bankLedgerEntries(state).map((e) => [e.journalId, e]))
  return (
    <div data-testid="books-banking">
      <Heading title="Banking: bank current account" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary
          label="Statement balance"
          value={formatMoney(rec.statementBalance)}
          note={`at ${bank.statementDate}`}
        />
        <Summary
          label="Balance in Books"
          value={formatMoney(rec.ledgerBalance)}
          note={`at ${bank.statementDate}`}
        />
        <Summary
          label="In Books, not matched"
          value={formatMoney(rec.unpresented.reduce((s, u) => s + u.amount, 0))}
          note={`${rec.unpresented.length} item${rec.unpresented.length === 1 ? '' : 's'}`}
        />
        <div
          className={`rounded-lg border p-4 ${rec.reconciled ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}
          data-testid="reconciliation-status"
        >
          <p className="text-xs font-medium tracking-wide text-slate-600 uppercase">
            Status
          </p>
          <p className="mt-1 text-lg font-semibold">
            {rec.reconciled
              ? 'Reconciled'
              : `${rec.unmatchedLines.length} line${rec.unmatchedLines.length === 1 ? '' : 's'} to reconcile`}
          </p>
          <p className="text-xs text-slate-600">
            Difference {formatMoney(rec.difference)}
          </p>
        </div>
      </div>

      <p className="mb-2 text-sm text-slate-600">
        Statement from the bank. Match each line to the entry already in Books, or record
        it if it is missing (bank charges, interest, unexpected direct debits).
      </p>
      <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
          <tr>
            <th className={cell}>Date</th>
            <th className={cell}>Description</th>
            <th className={`${cell} text-right`}>Money in</th>
            <th className={`${cell} text-right`}>Money out</th>
            <th className={cell}>In Books</th>
          </tr>
        </thead>
        <tbody>
          {bank.lines.map((line) => {
            const matched = bank.matches[line.id]
            const entry = matched ? journals.get(matched) : undefined
            return (
              <tr
                key={line.id}
                className="border-t border-slate-100 align-top"
                data-testid="statement-line"
              >
                <td className={cell}>{line.date}</td>
                <td className={`${cell} font-mono text-xs`}>{line.description}</td>
                <td className={numeric}>
                  {line.amount > 0 ? formatMoney(line.amount) : ''}
                </td>
                <td className={numeric}>
                  {line.amount < 0 ? formatMoney(-line.amount) : ''}
                </td>
                <td className={cell}>
                  {matched ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="green">Matched</Badge>
                      <span className="text-slate-600">
                        Journal {entry?.number}: {entry?.memo}
                      </span>
                      {editable && (
                        <button
                          type="button"
                          className="text-xs text-slate-500 underline"
                          onClick={() => update((s) => unmatchLine(s, line.id))}
                        >
                          Unmatch
                        </button>
                      )}
                    </div>
                  ) : editable ? (
                    <Reconcile state={state} line={line} update={update} />
                  ) : (
                    <Badge tone="amber">Not matched</Badge>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {rec.unpresented.length > 0 && (
        <div className="mt-4 text-sm">
          <p className="font-medium text-slate-900">
            In Books but not on the statement yet
          </p>
          <p className="text-slate-600">
            Usually payments made just before the statement date. They should clear next
            month; if one never does, investigate.
          </p>
          <ul className="mt-1 list-disc pl-5">
            {rec.unpresented.map((u) => (
              <li key={u.journalId}>
                {u.date} · Journal {u.number}: {u.memo} · {formatMoney(u.amount)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Summary({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  )
}

function Reconcile({
  state,
  line,
  update,
}: {
  state: BooksState
  line: BankLine
  update: Update
}) {
  const candidates = matchCandidates(state, line)
  const [mode, setMode] = useState<'match' | 'create'>(
    candidates.length > 0 ? 'match' : 'create',
  )
  const [journal, setJournal] = useState(candidates[0]?.journalId ?? '')
  const [account, setAccount] = useState('')
  const [memo, setMemo] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const label = line.description

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 text-xs">
        <button
          type="button"
          onClick={() => setMode('match')}
          aria-pressed={mode === 'match'}
          className={`rounded px-2 py-0.5 ${mode === 'match' ? 'bg-indigo-100 text-indigo-900' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Match
        </button>
        <button
          type="button"
          onClick={() => setMode('create')}
          aria-pressed={mode === 'create'}
          className={`rounded px-2 py-0.5 ${mode === 'create' ? 'bg-indigo-100 text-indigo-900' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Record it
        </button>
      </div>
      {mode === 'match' ? (
        candidates.length === 0 ? (
          <p className="text-xs text-amber-800">
            Nothing in Books has this amount. Record it, or check for a mistake.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={`Match ${label}`}
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              className="max-w-72 rounded border border-slate-300 px-2 py-1"
            >
              {candidates.map((c) => (
                <option key={c.journalId} value={c.journalId}>
                  {c.date} · Journal {c.number}: {c.memo}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={POST}
              onClick={() => {
                const result = matchLine(state, line.id, journal)
                if (result.problems.length > 0) return setProblems(result.problems)
                update((s) => matchLine(s, line.id, journal).state)
              }}
            >
              Match
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <AccountSelect
            accounts={state.accounts.filter((a) => a.code !== '1200')}
            value={account}
            onChange={setAccount}
            label={`Account for ${label}`}
            className="w-52"
          />
          <input
            aria-label={`Description for ${label}`}
            placeholder="Description"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-40 rounded border border-slate-300 px-2 py-1"
          />
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              const result = createFromLine(state, line.id, account, memo)
              if (result.problems.length > 0) return setProblems(result.problems)
              update((s) => createFromLine(s, line.id, account, memo).state)
            }}
          >
            Record
          </button>
        </div>
      )}
      <Problems problems={problems} />
    </div>
  )
}
