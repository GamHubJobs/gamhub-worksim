/**
 * Books: Sales (invoices to customers) and Purchases (bills from suppliers).
 * One screen serves both sides, mirrored.
 */
import { useState } from 'react'
import { formatMoney } from '../checks'
import { Icon } from '../../ui/Icon'
import { AccountSelect, Badge, Heading, NumberInput, Problems, TextInput } from './inputs'
import { cell, numeric, POST, PRIMARY, SECONDARY } from './styles'
import type { BooksState, TradeDocument } from './schema'
import {
  addContact,
  addDraftDocument,
  agedBalances,
  amountDue,
  amountPaid,
  approveDocument,
  contactsFor,
  deleteDraftDocument,
  documentProblems,
  documentsOf,
  documentTotals,
  lineNet,
  paymentStatus,
  recordPayment,
  removePayment,
  updateDocument,
  type PaymentStatus,
  type TradeSide,
} from './trade'

type Update = (change: (s: BooksState) => BooksState) => void

const WORDS = {
  sales: {
    title: 'Sales',
    doc: 'invoice',
    Doc: 'Invoice',
    contact: 'customer',
    Contact: 'Customer',
    aged: 'Aged receivables',
    paid: 'Record payment received',
    number: 'Invoice number',
  },
  purchases: {
    title: 'Purchases',
    doc: 'bill',
    Doc: 'Bill',
    contact: 'supplier',
    Contact: 'Supplier',
    aged: 'Aged payables',
    paid: 'Record payment made',
    number: 'Supplier’s reference',
  },
} as const

const STATUS: Record<
  PaymentStatus,
  { label: string; tone: Parameters<typeof Badge>[0]['tone'] }
> = {
  draft: { label: 'Draft', tone: 'amber' },
  void: { label: 'Void', tone: 'slate' },
  unpaid: { label: 'Awaiting payment', tone: 'blue' },
  'part-paid': { label: 'Part paid', tone: 'blue' },
  paid: { label: 'Paid', tone: 'green' },
  overdue: { label: 'Overdue', tone: 'red' },
}

export function TradeSection({
  state,
  side,
  editable,
  update,
}: {
  state: BooksState
  side: TradeSide
  editable: boolean
  update: Update
}) {
  const w = WORDS[side]
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'aged'>('list')
  const docs = [...documentsOf(state, side)].sort((a, b) => b.date.localeCompare(a.date))
  const doc = docs.find((d) => d.id === selected) ?? null
  const contactName = (id: string) =>
    contactsFor(state, side).find((c) => c.id === id)?.name ?? '—'

  return (
    <div data-testid={`books-${side}`}>
      <Heading title={w.title}>
        <button
          type="button"
          onClick={() => setView(view === 'list' ? 'aged' : 'list')}
          className={SECONDARY}
        >
          {view === 'list' ? w.aged : `All ${w.doc}s`}
        </button>
        {editable && (
          <NewDocument
            state={state}
            side={side}
            update={update}
            onCreated={setSelected}
          />
        )}
      </Heading>

      {view === 'aged' ? (
        <AgedReport state={state} side={side} />
      ) : (
        <>
          {doc && (
            <DocumentEditor
              key={doc.id}
              state={state}
              side={side}
              doc={doc}
              editable={editable}
              update={update}
              onClose={() => setSelected(null)}
            />
          )}
          {docs.length === 0 ? (
            <p className="text-sm text-slate-500">No {w.doc}s yet.</p>
          ) : (
            <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
              <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
                <tr>
                  <th className={cell}>Number</th>
                  <th className={cell}>{w.Contact}</th>
                  <th className={cell}>Date</th>
                  <th className={cell}>Due</th>
                  <th className={`${cell} text-right`}>Total</th>
                  <th className={`${cell} text-right`}>Still due</th>
                  <th className={cell}>Status</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const status = STATUS[paymentStatus(state, d)]
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelected(d.id)}
                      data-testid={`${w.doc}-row`}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-indigo-50 ${
                        selected === d.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <td className={cell}>
                        {d.number || <span className="text-slate-400">—</span>}
                      </td>
                      <td className={cell}>{contactName(d.contact)}</td>
                      <td className={cell}>{d.date}</td>
                      <td className={cell}>{d.dueDate}</td>
                      <td className={numeric}>
                        {formatMoney(documentTotals(state, d).total)}
                      </td>
                      <td className={numeric}>{formatMoney(amountDue(state, d))}</td>
                      <td className={cell}>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

function NewDocument({
  state,
  side,
  update,
  onCreated,
}: {
  state: BooksState
  side: TradeSide
  update: Update
  onCreated: (id: string) => void
}) {
  const w = WORDS[side]
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState('')
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={PRIMARY}>
        New {w.doc}
      </button>
    )
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2 rounded-md border border-indigo-200 bg-white p-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault()
        if (contact === '' || (contact === 'new' && newName.trim() === '')) {
          setError(`Choose the ${w.contact}, or add a new one.`)
          return
        }
        let id = ''
        update((s) => {
          let next = s
          let contactId = contact
          if (contact === 'new') {
            const added = addContact(next, side, newName.trim())
            next = added.state
            contactId = added.id
          }
          const draft = addDraftDocument(next, side, contactId)
          id = draft.id
          return draft.state
        })
        onCreated(id)
        setOpen(false)
        setContact('')
        setNewName('')
        setError(null)
      }}
    >
      <select
        aria-label={w.Contact}
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1"
      >
        <option value="">Choose the {w.contact}…</option>
        {contactsFor(state, side).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value="new">+ New {w.contact}</option>
      </select>
      {contact === 'new' && (
        <input
          aria-label={`New ${w.contact} name`}
          placeholder={`${w.Contact} name`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      )}
      <button type="submit" className={PRIMARY}>
        Create
      </button>
      <button type="button" onClick={() => setOpen(false)} className={SECONDARY}>
        Cancel
      </button>
      {error && <p className="w-full text-red-700">{error}</p>}
    </form>
  )
}

function DocumentEditor({
  state,
  side,
  doc,
  editable,
  update,
  onClose,
}: {
  state: BooksState
  side: TradeSide
  doc: TradeDocument
  editable: boolean
  update: Update
  onClose: () => void
}) {
  const w = WORDS[side]
  const draft = doc.status === 'draft'
  const canEdit = editable && draft
  const [problems, setProblems] = useState<string[]>([])
  const totals = documentTotals(state, doc)
  const change = (fn: (d: TradeDocument) => TradeDocument) => {
    setProblems([])
    update((s) => updateDocument(s, side, doc.id, fn))
  }
  const setLine = (i: number, patch: Partial<TradeDocument['lines'][number]>) =>
    change((d) => ({
      ...d,
      lines: d.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)),
    }))
  const types = side === 'sales' ? (['income'] as const) : (['expense', 'asset'] as const)
  const status = STATUS[paymentStatus(state, doc)]

  return (
    <section
      className="mb-5 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm"
      data-testid={`${w.doc}-editor`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-slate-900">
          {w.Doc} {doc.number}
        </h3>
        <Badge tone={status.tone}>{status.label}</Badge>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          {w.Contact}
          <select
            aria-label={w.Contact}
            value={doc.contact}
            disabled={!canEdit}
            onChange={(e) => change((d) => ({ ...d, contact: e.target.value }))}
            className="rounded border border-slate-300 px-2 py-1 disabled:border-transparent disabled:bg-transparent disabled:text-slate-900 disabled:opacity-100"
          >
            {contactsFor(state, side).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {w.number}
          <TextInput
            label={w.number}
            value={doc.number}
            disabled={!canEdit}
            onCommit={(number) => change((d) => ({ ...d, number }))}
          />
        </label>
        <label className="flex flex-col gap-1">
          Date
          <TextInput
            type="date"
            label={`${w.Doc} date`}
            value={doc.date}
            disabled={!canEdit}
            onCommit={(date) => change((d) => ({ ...d, date }))}
          />
        </label>
        <label className="flex flex-col gap-1">
          Due date
          <TextInput
            type="date"
            label="Due date"
            value={doc.dueDate}
            disabled={!canEdit}
            onCommit={(dueDate) => change((d) => ({ ...d, dueDate }))}
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className={cell}>Description</th>
              <th className={`${cell} text-right`}>Qty</th>
              <th className={`${cell} text-right`}>Unit price</th>
              <th className={cell}>Account</th>
              <th className={cell}>VAT</th>
              <th className={`${cell} text-right`}>Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((line, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className={cell}>
                  <TextInput
                    label={`Line ${i + 1} description`}
                    value={line.description}
                    disabled={!canEdit}
                    className="w-full min-w-40"
                    onCommit={(description) => setLine(i, { description })}
                  />
                </td>
                <td className={`${cell} text-right`}>
                  <NumberInput
                    key={`q${line.quantity}`}
                    label={`Line ${i + 1} quantity`}
                    value={line.quantity}
                    decimals={2}
                    allowZero={false}
                    className="w-16"
                    disabled={!canEdit}
                    onCommit={(quantity) => setLine(i, { quantity })}
                  />
                </td>
                <td className={`${cell} text-right`}>
                  <NumberInput
                    key={`p${line.unitPrice}`}
                    label={`Line ${i + 1} unit price`}
                    value={line.unitPrice}
                    disabled={!canEdit}
                    onCommit={(unitPrice) => setLine(i, { unitPrice })}
                  />
                </td>
                <td className={cell}>
                  <AccountSelect
                    accounts={state.accounts}
                    types={types}
                    value={line.account}
                    label={`Line ${i + 1} account`}
                    disabled={!canEdit}
                    className="w-48"
                    onChange={(account) => setLine(i, { account })}
                  />
                </td>
                <td className={cell}>
                  <input
                    type="checkbox"
                    aria-label={`Line ${i + 1} VAT`}
                    checked={line.vat}
                    disabled={!canEdit}
                    onChange={(e) => setLine(i, { vat: e.target.checked })}
                  />
                </td>
                <td className={numeric}>{formatMoney(lineNet(line))}</td>
                <td className={cell}>
                  {canEdit && doc.lines.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove line ${i + 1}`}
                      onClick={() =>
                        change((d) => ({
                          ...d,
                          lines: d.lines.filter((_, k) => k !== i),
                        }))
                      }
                      className="rounded p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={() =>
            change((d) => ({
              ...d,
              lines: [
                ...d.lines,
                {
                  description: '',
                  quantity: 1,
                  unitPrice: 0,
                  account: side === 'sales' ? '4000' : '6400',
                  vat: true,
                },
              ],
            }))
          }
          className={`mt-2 ${SECONDARY}`}
        >
          Add line
        </button>
      )}
      <dl className="mt-3 ml-auto w-64 space-y-1 text-sm" data-testid={`${w.doc}-totals`}>
        <div className="flex justify-between">
          <dt>Net</dt>
          <dd className="tabular-nums">{formatMoney(totals.net)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>VAT at {Math.round(state.settings.vatRate * 100)}%</dt>
          <dd className="tabular-nums">{formatMoney(totals.vat)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(totals.total)}</dd>
        </div>
        {!draft && (
          <div className="flex justify-between text-slate-600">
            <dt>Paid</dt>
            <dd className="tabular-nums">{formatMoney(amountPaid(doc))}</dd>
          </div>
        )}
      </dl>
      <Problems problems={problems} />
      {canEdit && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={POST}
            onClick={() => {
              const found = documentProblems(state, side, doc)
              if (found.length > 0) return setProblems(found)
              update((s) => approveDocument(s, side, doc.id).state)
            }}
          >
            Approve {w.doc}
          </button>
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              update((s) => deleteDraftDocument(s, side, doc.id))
              onClose()
            }}
          >
            Delete draft
          </button>
        </div>
      )}
      {doc.status === 'approved' && (
        <Payments
          state={state}
          side={side}
          doc={doc}
          editable={editable}
          update={update}
        />
      )}
    </section>
  )
}

function Payments({
  state,
  side,
  doc,
  editable,
  update,
}: {
  state: BooksState
  side: TradeSide
  doc: TradeDocument
  editable: boolean
  update: Update
}) {
  const w = WORDS[side]
  const due = amountDue(state, doc)
  const [date, setDate] = useState(state.settings.today)
  const [amount, setAmount] = useState(due)
  const [problems, setProblems] = useState<string[]>([])
  return (
    <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
      {doc.payments.length > 0 && (
        <ul className="mb-2 space-y-0.5 text-slate-700">
          {doc.payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2" data-testid="payment">
              {p.date}: {formatMoney(p.amount)} {side === 'sales' ? 'received' : 'paid'}
              {editable && (
                <button
                  type="button"
                  className="text-xs text-slate-500 underline"
                  title="Removes a payment recorded by mistake, with its journal"
                  onClick={() => {
                    const result = removePayment(state, side, doc.id, p.id)
                    if (result.problems.length > 0) return setProblems(result.problems)
                    setProblems([])
                    update((s) => removePayment(s, side, doc.id, p.id).state)
                    setAmount(Math.round((due + p.amount) * 100) / 100)
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && due > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{w.paid}:</span>
          <input
            type="date"
            aria-label="Payment date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
          <NumberInput
            key={`a${amount}`}
            label="Payment amount"
            value={amount}
            onCommit={setAmount}
          />
          <button
            type="button"
            className={POST}
            onClick={() => {
              const result = recordPayment(state, side, doc.id, { date, amount })
              if (result.problems.length > 0) return setProblems(result.problems)
              setProblems([])
              update((s) => recordPayment(s, side, doc.id, { date, amount }).state)
              setAmount(Math.round((due - amount) * 100) / 100)
            }}
          >
            Record payment
          </button>
        </div>
      )}
      <Problems problems={problems} />
    </div>
  )
}

function AgedReport({ state, side }: { state: BooksState; side: TradeSide }) {
  const w = WORDS[side]
  const aged = agedBalances(state, side)
  const labels = {
    current: 'Not yet due',
    '1-30': '1–30 days',
    '31-60': '31–60 days',
    '61+': 'Over 60 days',
  }
  return (
    <div data-testid={`aged-${side}`}>
      <p className="mb-2 text-sm text-slate-600">
        What each {w.contact} {side === 'sales' ? 'owes us' : 'is owed'}, by how late it
        is (as at {state.settings.today}).
      </p>
      {aged.rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing outstanding.</p>
      ) : (
        <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
            <tr>
              <th className={cell}>{w.Contact}</th>
              {aged.buckets.map((b) => (
                <th key={b} className={`${cell} text-right`}>
                  {labels[b]}
                </th>
              ))}
              <th className={`${cell} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {aged.rows.map((r) => (
              <tr key={r.contact.id} className="border-t border-slate-100">
                <td className={cell}>{r.contact.name}</td>
                {aged.buckets.map((b) => (
                  <td
                    key={b}
                    className={`${numeric} ${b === '61+' && r[b] ? 'text-red-700' : ''}`}
                  >
                    {r[b] ? formatMoney(r[b]) : ''}
                  </td>
                ))}
                <td className={`${numeric} font-semibold`}>{formatMoney(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
