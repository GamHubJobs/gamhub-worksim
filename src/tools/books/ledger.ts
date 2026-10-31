/**
 * The general ledger: journals, account balances and the financial reports.
 * Pure functions on a Books state; every change returns a new state.
 *
 * Balances are kept "debit positive": a debit adds, a credit subtracts. Each
 * account type has a normal side (assets and expenses are debits; liabilities,
 * equity and income are credits), and reports show balances on that side.
 */
import type { Account, AccountType, BooksState, Journal, JournalLine } from './schema'

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** The side an account type normally has its balance on. */
export function normalSide(type: AccountType): 'debit' | 'credit' {
  return type === 'asset' || type === 'expense' ? 'debit' : 'credit'
}

export function findAccount(state: BooksState, code: string): Account | undefined {
  return state.accounts.find((a) => a.code === code)
}

export function postedJournals(state: BooksState, to?: string): Journal[] {
  return state.journals.filter(
    (j) => j.status === 'posted' && (to === undefined || j.date <= to),
  )
}

/** Every account's balance, debit positive, from the posted journals up to `to`. */
export function balances(state: BooksState, to?: string): Map<string, number> {
  const result = new Map<string, number>(state.accounts.map((a) => [a.code, 0]))
  for (const journal of postedJournals(state, to)) {
    for (const line of journal.lines) {
      result.set(line.account, (result.get(line.account) ?? 0) + line.debit - line.credit)
    }
  }
  for (const [code, value] of result) result.set(code, round2(value))
  return result
}

/** An account's balance on its normal side (a positive bank balance, positive sales). */
export function accountBalance(state: BooksState, code: string, to?: string): number {
  const raw = balances(state, to).get(code) ?? 0
  const account = findAccount(state, code)
  if (!account) return raw
  return round2(normalSide(account.type) === 'debit' ? raw : -raw)
}

export interface LedgerEntry {
  journalId: string
  number: number
  date: string
  memo: string
  description: string
  debit: number
  credit: number
  /** Running balance on the account's normal side. */
  balance: number
}

/** The transactions on one account, oldest first, with a running balance. */
export function accountLedger(state: BooksState, code: string): LedgerEntry[] {
  const account = findAccount(state, code)
  const sign = account && normalSide(account.type) === 'credit' ? -1 : 1
  const entries: LedgerEntry[] = []
  let running = 0
  const journals = [...postedJournals(state)].sort(
    (a, b) => a.date.localeCompare(b.date) || a.number - b.number,
  )
  for (const journal of journals) {
    for (const line of journal.lines) {
      if (line.account !== code) continue
      running = round2(running + sign * (line.debit - line.credit))
      entries.push({
        journalId: journal.id,
        number: journal.number,
        date: journal.date,
        memo: journal.memo,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        balance: running,
      })
    }
  }
  return entries
}

export function journalTotals(lines: JournalLine[]): { debit: number; credit: number } {
  return {
    debit: round2(lines.reduce((sum, l) => sum + l.debit, 0)),
    credit: round2(lines.reduce((sum, l) => sum + l.credit, 0)),
  }
}

/** Why a journal cannot be posted, in plain words. Empty when it can. */
export function journalProblems(state: BooksState, journal: Journal): string[] {
  const problems: string[] = []
  const lines = journal.lines.filter((l) => l.debit !== 0 || l.credit !== 0)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(journal.date)) problems.push('Give the journal a date.')
  if (journal.memo.trim() === '') problems.push('Give the journal a description.')
  if (lines.length < 2) problems.push('A journal needs at least two lines with amounts.')
  for (const [i, line] of journal.lines.entries()) {
    if (line.debit !== 0 && line.credit !== 0) {
      problems.push(`Line ${i + 1} has both a debit and a credit: use one or the other.`)
    }
    if ((line.debit !== 0 || line.credit !== 0) && line.account === '') {
      problems.push(`Line ${i + 1} has no account.`)
    } else if (
      (line.debit !== 0 || line.credit !== 0) &&
      !findAccount(state, line.account)
    ) {
      problems.push(`Line ${i + 1} uses account ${line.account}, which does not exist.`)
    }
  }
  const { debit, credit } = journalTotals(lines)
  if (lines.length >= 2 && debit !== credit) {
    problems.push(
      `Debits (${debit.toFixed(2)}) and credits (${credit.toFixed(2)}) must be equal.`,
    )
  }
  return problems
}

function nextJournalNumber(state: BooksState): number {
  return state.journals.reduce((max, j) => Math.max(max, j.number), 0) + 1
}

function nextId(prefix: string, ids: string[]): string {
  let n = ids.length + 1
  while (ids.includes(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}

export function blankLine(): JournalLine {
  return { account: '', description: '', debit: 0, credit: 0 }
}

/** A new draft journal, ready to be filled in. */
export function addDraftJournal(
  state: BooksState,
  date: string = state.settings.today,
): { state: BooksState; id: string } {
  const id = nextId(
    'j',
    state.journals.map((j) => j.id),
  )
  const journal: Journal = {
    id,
    number: nextJournalNumber(state),
    date,
    memo: '',
    lines: [blankLine(), blankLine()],
    status: 'draft',
    source: 'manual',
  }
  return { state: { ...state, journals: [...state.journals, journal] }, id }
}

export function updateJournal(
  state: BooksState,
  id: string,
  change: (journal: Journal) => Journal,
): BooksState {
  return {
    ...state,
    journals: state.journals.map((j) =>
      j.id === id && j.status === 'draft' ? change(j) : j,
    ),
  }
}

export function deleteDraftJournal(state: BooksState, id: string): BooksState {
  return {
    ...state,
    journals: state.journals.filter((j) => !(j.id === id && j.status === 'draft')),
  }
}

/** Posts a draft journal. Returns the problems instead if it cannot be posted. */
export function postJournal(
  state: BooksState,
  id: string,
): { state: BooksState; problems: string[] } {
  const journal = state.journals.find((j) => j.id === id)
  if (!journal) return { state, problems: ['This journal no longer exists.'] }
  if (journal.status === 'posted') return { state, problems: [] }
  const problems = journalProblems(state, journal)
  if (problems.length > 0) return { state, problems }
  const tidy: Journal = {
    ...journal,
    memo: journal.memo.trim(),
    status: 'posted',
    lines: journal.lines
      .filter((l) => l.debit !== 0 || l.credit !== 0)
      .map((l) => ({ ...l, debit: round2(l.debit), credit: round2(l.credit) })),
  }
  return {
    state: { ...state, journals: state.journals.map((j) => (j.id === id ? tidy : j)) },
    problems: [],
  }
}

/**
 * Posts a journal created by the software itself (an invoice, a payment, a
 * pay run…). The caller has already made sure it balances.
 */
export function addPostedJournal(
  state: BooksState,
  journal: Omit<Journal, 'id' | 'number' | 'status'>,
): { state: BooksState; id: string } {
  const id = nextId(
    'j',
    state.journals.map((j) => j.id),
  )
  const posted: Journal = {
    ...journal,
    id,
    number: nextJournalNumber(state),
    status: 'posted',
    lines: journal.lines.map((l) => ({
      ...l,
      debit: round2(l.debit),
      credit: round2(l.credit),
    })),
  }
  return { state: { ...state, journals: [...state.journals, posted] }, id }
}

/**
 * Reverses a posted manual journal by posting its opposite (real accounting
 * software never deletes posted entries).
 */
export function reverseJournal(
  state: BooksState,
  id: string,
  date: string = state.settings.today,
): BooksState {
  const journal = state.journals.find((j) => j.id === id)
  if (!journal || journal.status !== 'posted') return state
  return addPostedJournal(state, {
    date,
    memo: `Reversal of journal ${journal.number}: ${journal.memo}`,
    lines: journal.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
    source: 'manual',
  }).state
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface TrialBalanceRow {
  code: string
  name: string
  type: AccountType
  debit: number
  credit: number
}

export function trialBalance(
  state: BooksState,
  to?: string,
): { rows: TrialBalanceRow[]; debit: number; credit: number } {
  const all = balances(state, to)
  const rows = state.accounts
    .map((a) => {
      const value = all.get(a.code) ?? 0
      return {
        code: a.code,
        name: a.name,
        type: a.type,
        debit: value > 0 ? value : 0,
        credit: value < 0 ? -value : 0,
      }
    })
    .filter((r) => r.debit !== 0 || r.credit !== 0)
    .sort((a, b) => a.code.localeCompare(b.code))
  return {
    rows,
    debit: round2(rows.reduce((s, r) => s + r.debit, 0)),
    credit: round2(rows.reduce((s, r) => s + r.credit, 0)),
  }
}

export interface ReportLine {
  code: string
  name: string
  amount: number
}

function linesOfType(state: BooksState, type: AccountType, to?: string): ReportLine[] {
  const all = balances(state, to)
  const sign = normalSide(type) === 'debit' ? 1 : -1
  return state.accounts
    .filter((a) => a.type === type)
    .map((a) => ({
      code: a.code,
      name: a.name,
      amount: round2(sign * (all.get(a.code) ?? 0)),
    }))
    .filter((l) => l.amount !== 0)
}

const total = (lines: ReportLine[]) => round2(lines.reduce((s, l) => s + l.amount, 0))

/** Profit and loss: income less expenses (all posted journals up to `to`). */
export function profitAndLoss(state: BooksState, to?: string) {
  const income = linesOfType(state, 'income', to)
  const expenses = linesOfType(state, 'expense', to)
  const totalIncome = total(income)
  const totalExpenses = total(expenses)
  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit: round2(totalIncome - totalExpenses),
  }
}

/** Balance sheet: assets = liabilities + equity (including this period's profit). */
export function balanceSheet(state: BooksState, to?: string) {
  const assets = linesOfType(state, 'asset', to)
  const liabilities = linesOfType(state, 'liability', to)
  const equity = linesOfType(state, 'equity', to)
  const profit = profitAndLoss(state, to).netProfit
  const totalAssets = total(assets)
  const totalLiabilities = total(liabilities)
  const totalEquity = round2(total(equity) + profit)
  return {
    assets,
    liabilities,
    equity,
    profit,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balances: round2(totalAssets - totalLiabilities - totalEquity) === 0,
  }
}
