/**
 * Sales invoices (money customers owe us) and supplier bills (money we owe).
 * Approving one posts its journal; recording a payment posts another. The
 * same rules work for both sides, mirrored:
 *
 *   Invoice approved:  Dr Accounts receivable (total) / Cr income (net), Cr VAT
 *   Customer pays:     Dr Bank / Cr Accounts receivable
 *   Bill approved:     Dr expense (net), Dr VAT / Cr Accounts payable (total)
 *   We pay a bill:     Dr Accounts payable / Cr Bank
 */
import { addPostedJournal, findAccount, round2 } from './ledger'
import type { BooksState, Contact, DocumentLine, TradeDocument } from './schema'

export const RECEIVABLES = '1100'
export const BANK = '1200'
export const PAYABLES = '2100'
export const VAT = '2200'

export type TradeSide = 'sales' | 'purchases'

const listOf = (side: TradeSide) => (side === 'sales' ? 'invoices' : 'bills')
const contactsOf = (side: TradeSide) => (side === 'sales' ? 'customers' : 'suppliers')

export function documentsOf(state: BooksState, side: TradeSide): TradeDocument[] {
  return state[listOf(side)]
}

export function contactsFor(state: BooksState, side: TradeSide): Contact[] {
  return state[contactsOf(side)]
}

export function lineNet(line: DocumentLine): number {
  return round2(line.quantity * line.unitPrice)
}

/** Net, VAT and total of an invoice or bill. VAT is worked out per line. */
export function documentTotals(
  state: BooksState,
  doc: Pick<TradeDocument, 'lines'>,
): { net: number; vat: number; total: number } {
  const net = round2(doc.lines.reduce((s, l) => s + lineNet(l), 0))
  const vat = round2(
    doc.lines.reduce((s, l) => s + (l.vat ? lineNet(l) * state.settings.vatRate : 0), 0),
  )
  return { net, vat, total: round2(net + vat) }
}

export function amountPaid(doc: TradeDocument): number {
  return round2(doc.payments.reduce((s, p) => s + p.amount, 0))
}

export function amountDue(state: BooksState, doc: TradeDocument): number {
  if (doc.status !== 'approved') return 0
  return round2(documentTotals(state, doc).total - amountPaid(doc))
}

export type PaymentStatus = 'draft' | 'void' | 'unpaid' | 'part-paid' | 'paid' | 'overdue'

export function paymentStatus(state: BooksState, doc: TradeDocument): PaymentStatus {
  if (doc.status === 'draft') return 'draft'
  if (doc.status === 'void') return 'void'
  const due = amountDue(state, doc)
  if (due <= 0) return 'paid'
  if (doc.dueDate < state.settings.today) return 'overdue'
  return amountPaid(doc) > 0 ? 'part-paid' : 'unpaid'
}

function nextId(prefix: string, ids: string[]): string {
  let n = ids.length + 1
  while (ids.includes(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}

/** The next invoice number after the highest one so far, e.g. INV-1043. */
export function nextInvoiceNumber(state: BooksState): string {
  const highest = state.invoices.reduce((max, inv) => {
    const n = Number(/(\d+)$/.exec(inv.number)?.[1] ?? 0)
    return Math.max(max, n)
  }, 1000)
  return `INV-${highest + 1}`
}

export function addContact(
  state: BooksState,
  side: TradeSide,
  name: string,
  email = '',
): { state: BooksState; id: string } {
  const key = contactsOf(side)
  const id = nextId(
    side === 'sales' ? 'c' : 's',
    state[key].map((c) => c.id),
  )
  return { state: { ...state, [key]: [...state[key], { id, name, email }] }, id }
}

/** A new draft invoice or bill for a contact. */
export function addDraftDocument(
  state: BooksState,
  side: TradeSide,
  contact: string,
  input: Partial<Pick<TradeDocument, 'number' | 'date' | 'dueDate' | 'lines'>> = {},
): { state: BooksState; id: string } {
  const key = listOf(side)
  const id = nextId(
    side === 'sales' ? 'inv' : 'bill',
    state[key].map((d) => d.id),
  )
  const date = input.date ?? state.settings.today
  const doc: TradeDocument = {
    id,
    number: input.number ?? (side === 'sales' ? nextInvoiceNumber(state) : ''),
    contact,
    date,
    dueDate: input.dueDate ?? addDays(date, 30),
    lines: input.lines ?? [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        account: side === 'sales' ? '4000' : '6400',
        vat: true,
      },
    ],
    status: 'draft',
    payments: [],
  }
  return { state: { ...state, [key]: [...state[key], doc] }, id }
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function updateDocument(
  state: BooksState,
  side: TradeSide,
  id: string,
  change: (doc: TradeDocument) => TradeDocument,
): BooksState {
  const key = listOf(side)
  return {
    ...state,
    [key]: state[key].map((d) => (d.id === id && d.status === 'draft' ? change(d) : d)),
  }
}

export function deleteDraftDocument(
  state: BooksState,
  side: TradeSide,
  id: string,
): BooksState {
  const key = listOf(side)
  return {
    ...state,
    [key]: state[key].filter((d) => !(d.id === id && d.status === 'draft')),
  }
}

/** Why an invoice or bill cannot be approved. Empty when it can. */
export function documentProblems(
  state: BooksState,
  side: TradeSide,
  doc: TradeDocument,
): string[] {
  const problems: string[] = []
  const word = side === 'sales' ? 'invoice' : 'bill'
  if (!contactsFor(state, side).some((c) => c.id === doc.contact)) {
    problems.push(`Choose the ${side === 'sales' ? 'customer' : 'supplier'}.`)
  }
  if (doc.number.trim() === '') {
    problems.push(
      side === 'sales'
        ? 'Give the invoice a number.'
        : 'Enter the supplier’s bill reference.',
    )
  } else if (
    documentsOf(state, side).some(
      (d) =>
        d.id !== doc.id &&
        d.status !== 'void' &&
        d.number.trim().toLowerCase() === doc.number.trim().toLowerCase() &&
        (side === 'sales' || d.contact === doc.contact),
    )
  ) {
    problems.push(
      side === 'sales'
        ? `Invoice number ${doc.number} is already used.`
        : `This supplier’s bill ${doc.number} is already entered: is it a duplicate?`,
    )
  }
  if (doc.dueDate < doc.date) problems.push('The due date is before the date.')
  const lines = doc.lines.filter((l) => lineNet(l) !== 0)
  if (lines.length === 0) problems.push(`The ${word} has no amounts.`)
  for (const [i, line] of doc.lines.entries()) {
    if (lineNet(line) === 0) continue
    if (line.description.trim() === '')
      problems.push(`Line ${i + 1} needs a description.`)
    const account = findAccount(state, line.account)
    if (!account) problems.push(`Line ${i + 1} uses an account that does not exist.`)
    else if (side === 'sales' && account.type !== 'income') {
      problems.push(`Line ${i + 1}: sales go to an income account.`)
    } else if (
      side === 'purchases' &&
      account.type !== 'expense' &&
      account.type !== 'asset'
    ) {
      problems.push(`Line ${i + 1}: purchases go to an expense or asset account.`)
    }
  }
  return problems
}

/** Approves a draft invoice or bill and posts its journal. */
export function approveDocument(
  state: BooksState,
  side: TradeSide,
  id: string,
): { state: BooksState; problems: string[] } {
  const doc = documentsOf(state, side).find((d) => d.id === id)
  if (!doc || doc.status !== 'draft') return { state, problems: [] }
  const problems = documentProblems(state, side, doc)
  if (problems.length > 0) return { state, problems }
  const lines = doc.lines.filter((l) => lineNet(l) !== 0)
  const { vat, total } = documentTotals(state, { lines })
  const contact = contactsFor(state, side).find((c) => c.id === doc.contact)?.name ?? ''
  const byAccount = new Map<string, number>()
  for (const line of lines) {
    byAccount.set(
      line.account,
      round2((byAccount.get(line.account) ?? 0) + lineNet(line)),
    )
  }
  const sales = side === 'sales'
  const journal = addPostedJournal(state, {
    date: doc.date,
    memo: `${sales ? 'Invoice' : 'Bill'} ${doc.number}: ${contact}`,
    source: sales ? 'invoice' : 'bill',
    sourceId: doc.id,
    lines: [
      sales
        ? { account: RECEIVABLES, description: contact, debit: total, credit: 0 }
        : { account: PAYABLES, description: contact, debit: 0, credit: total },
      ...[...byAccount].map(([account, amount]) =>
        sales
          ? { account, description: contact, debit: 0, credit: amount }
          : { account, description: contact, debit: amount, credit: 0 },
      ),
      ...(vat === 0
        ? []
        : [
            sales
              ? { account: VAT, description: 'VAT on sales', debit: 0, credit: vat }
              : { account: VAT, description: 'VAT on purchases', debit: vat, credit: 0 },
          ]),
    ],
  })
  const key = listOf(side)
  return {
    state: {
      ...journal.state,
      [key]: journal.state[key].map((d) =>
        d.id === id
          ? { ...d, lines, status: 'approved' as const, journalId: journal.id }
          : d,
      ),
    },
    problems: [],
  }
}

/** Records money received for an invoice, or paid for a bill, through the bank. */
export function recordPayment(
  state: BooksState,
  side: TradeSide,
  id: string,
  payment: { date: string; amount: number },
): { state: BooksState; problems: string[] } {
  const doc = documentsOf(state, side).find((d) => d.id === id)
  if (!doc || doc.status !== 'approved') {
    return { state, problems: ['Only approved invoices and bills can be paid.'] }
  }
  const amount = round2(payment.amount)
  const due = amountDue(state, doc)
  if (!(amount > 0)) return { state, problems: ['Enter the amount paid.'] }
  if (amount > due) {
    return { state, problems: [`That is more than the ${due.toFixed(2)} still due.`] }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.date)) {
    return { state, problems: ['Enter the date of the payment.'] }
  }
  const sales = side === 'sales'
  const contact = contactsFor(state, side).find((c) => c.id === doc.contact)?.name ?? ''
  const journal = addPostedJournal(state, {
    date: payment.date,
    memo: `${sales ? 'Payment received' : 'Payment made'}: ${doc.number} ${contact}`,
    source: sales ? 'invoice-payment' : 'bill-payment',
    sourceId: doc.id,
    lines: sales
      ? [
          { account: BANK, description: contact, debit: amount, credit: 0 },
          { account: RECEIVABLES, description: doc.number, debit: 0, credit: amount },
        ]
      : [
          { account: PAYABLES, description: doc.number, debit: amount, credit: 0 },
          { account: BANK, description: contact, debit: 0, credit: amount },
        ],
  })
  const key = listOf(side)
  const paymentId = nextId(
    'p',
    documentsOf(state, side).flatMap((d) => d.payments.map((p) => p.id)),
  )
  return {
    state: {
      ...journal.state,
      [key]: journal.state[key].map((d) =>
        d.id === id
          ? {
              ...d,
              payments: [
                ...d.payments,
                { id: paymentId, date: payment.date, amount, journalId: journal.id },
              ],
            }
          : d,
      ),
    },
    problems: [],
  }
}

/** How much each contact owes (or is owed), by how overdue it is. */
export function agedBalances(state: BooksState, side: TradeSide) {
  const buckets = ['current', '1-30', '31-60', '61+'] as const
  const today = new Date(`${state.settings.today}T00:00:00Z`).getTime()
  const rows = contactsFor(state, side).map((contact) => {
    const amounts = { current: 0, '1-30': 0, '31-60': 0, '61+': 0 }
    for (const doc of documentsOf(state, side)) {
      if (doc.contact !== contact.id) continue
      const due = amountDue(state, doc)
      if (due <= 0) continue
      const late = Math.floor(
        (today - new Date(`${doc.dueDate}T00:00:00Z`).getTime()) / 86_400_000,
      )
      const bucket =
        late <= 0 ? 'current' : late <= 30 ? '1-30' : late <= 60 ? '31-60' : '61+'
      amounts[bucket] = round2(amounts[bucket] + due)
    }
    const total = round2(buckets.reduce((s, b) => s + amounts[b], 0))
    return { contact, ...amounts, total }
  })
  return { buckets, rows: rows.filter((r) => r.total !== 0) }
}

/**
 * Removes a payment recorded by mistake, with its journal. A payment already
 * matched to the bank statement must be unmatched first.
 */
export function removePayment(
  state: BooksState,
  side: TradeSide,
  docId: string,
  paymentId: string,
): { state: BooksState; problems: string[] } {
  const doc = documentsOf(state, side).find((d) => d.id === docId)
  const payment = doc?.payments.find((p) => p.id === paymentId)
  if (!doc || !payment) return { state, problems: ['That payment no longer exists.'] }
  if (Object.values(state.bank?.matches ?? {}).includes(payment.journalId)) {
    return {
      state,
      problems: [
        'This payment is matched to the bank statement: unmatch it in Banking first.',
      ],
    }
  }
  const key = listOf(side)
  return {
    state: {
      ...state,
      journals: state.journals.filter((j) => j.id !== payment.journalId),
      [key]: state[key].map((d) =>
        d.id === docId
          ? { ...d, payments: d.payments.filter((p) => p.id !== paymentId) }
          : d,
      ),
    },
    problems: [],
  }
}
