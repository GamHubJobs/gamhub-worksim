/**
 * Bank reconciliation: the bank statement against the bank account in the
 * ledger. Each statement line is matched to the journal that recorded it, or
 * an entry is created for it (bank charges, interest, a direct debit nobody
 * recorded). The books are reconciled when every statement line is matched
 * and the ledger balance at the statement date equals the statement's.
 */
import { accountBalance, addPostedJournal, findAccount, round2 } from './ledger'
import type { BankLine, BooksState } from './schema'
import { BANK } from './trade'

export interface BankLedgerEntry {
  journalId: string
  number: number
  date: string
  memo: string
  /** Money in positive, money out negative (as on the statement). */
  amount: number
}

/** The bank account's posted entries, one per journal. */
export function bankLedgerEntries(state: BooksState): BankLedgerEntry[] {
  return state.journals
    .filter((j) => j.status === 'posted' && j.source !== 'opening')
    .flatMap((j) => {
      const amount = round2(
        j.lines
          .filter((l) => l.account === BANK)
          .reduce((s, l) => s + l.debit - l.credit, 0),
      )
      return amount === 0
        ? []
        : [{ journalId: j.id, number: j.number, date: j.date, memo: j.memo, amount }]
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number)
}

/** Ledger entries a statement line could be matched to: same amount, not yet matched. */
export function matchCandidates(state: BooksState, line: BankLine): BankLedgerEntry[] {
  const used = new Set(Object.values(state.bank?.matches ?? {}))
  return bankLedgerEntries(state).filter(
    (e) => !used.has(e.journalId) && round2(e.amount - line.amount) === 0,
  )
}

export function matchLine(
  state: BooksState,
  lineId: string,
  journalId: string,
): { state: BooksState; problems: string[] } {
  const bank = state.bank
  const line = bank?.lines.find((l) => l.id === lineId)
  if (!bank || !line)
    return { state, problems: ['That statement line no longer exists.'] }
  const entry = bankLedgerEntries(state).find((e) => e.journalId === journalId)
  if (!entry)
    return { state, problems: ['That journal does not touch the bank account.'] }
  if (round2(entry.amount - line.amount) !== 0) {
    return {
      state,
      problems: [
        `The amounts differ: the statement says ${line.amount.toFixed(2)}, the ledger ${entry.amount.toFixed(2)}.`,
      ],
    }
  }
  if (Object.entries(bank.matches).some(([l, j]) => j === journalId && l !== lineId)) {
    return { state, problems: ['That journal is already matched to another line.'] }
  }
  return {
    state: {
      ...state,
      bank: { ...bank, matches: { ...bank.matches, [lineId]: journalId } },
    },
    problems: [],
  }
}

export function unmatchLine(state: BooksState, lineId: string): BooksState {
  if (!state.bank) return state
  const matches = { ...state.bank.matches }
  delete matches[lineId]
  return { ...state, bank: { ...state.bank, matches } }
}

/**
 * Records a statement line that is not in the books yet (e.g. bank charges)
 * against an account, and matches it.
 */
export function createFromLine(
  state: BooksState,
  lineId: string,
  account: string,
  description?: string,
): { state: BooksState; problems: string[] } {
  const bank = state.bank
  const line = bank?.lines.find((l) => l.id === lineId)
  if (!bank || !line)
    return { state, problems: ['That statement line no longer exists.'] }
  if (bank.matches[lineId]) return { state, problems: ['This line is already matched.'] }
  if (!findAccount(state, account) || account === BANK) {
    return { state, problems: ['Choose the account this money came from or went to.'] }
  }
  const amount = Math.abs(line.amount)
  const memo = description?.trim() || line.description
  const journal = addPostedJournal(state, {
    date: line.date,
    memo,
    source: 'bank',
    sourceId: line.id,
    lines:
      line.amount > 0
        ? [
            { account: BANK, description: line.description, debit: amount, credit: 0 },
            { account, description: memo, debit: 0, credit: amount },
          ]
        : [
            { account, description: memo, debit: amount, credit: 0 },
            { account: BANK, description: line.description, debit: 0, credit: amount },
          ],
  })
  return {
    state: {
      ...journal.state,
      bank: { ...bank, matches: { ...bank.matches, [lineId]: journal.id } },
    },
    problems: [],
  }
}

export interface Reconciliation {
  statementBalance: number
  ledgerBalance: number
  /** Statement lines not yet matched or recorded. */
  unmatchedLines: BankLine[]
  /** Bank entries in the books up to the statement date that are not on the statement. */
  unpresented: BankLedgerEntry[]
  /** Statement balance less the ledger balance adjusted for unpresented items. */
  difference: number
  reconciled: boolean
}

export function reconciliation(state: BooksState): Reconciliation | null {
  const bank = state.bank
  if (!bank) return null
  const matchedJournals = new Set(Object.values(bank.matches))
  const unmatchedLines = bank.lines.filter((l) => !bank.matches[l.id])
  const unpresented = bankLedgerEntries(state).filter(
    (e) => e.date <= bank.statementDate && !matchedJournals.has(e.journalId),
  )
  const ledgerBalance = accountBalance(state, BANK, bank.statementDate)
  const unpresentedTotal = round2(unpresented.reduce((s, e) => s + e.amount, 0))
  const difference = round2(bank.closingBalance - (ledgerBalance - unpresentedTotal))
  return {
    statementBalance: bank.closingBalance,
    ledgerBalance,
    unmatchedLines,
    unpresented,
    difference,
    reconciled: unmatchedLines.length === 0 && difference === 0,
  }
}
