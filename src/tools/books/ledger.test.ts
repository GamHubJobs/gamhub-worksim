import { describe, expect, it } from 'vitest'
import { openingBooks } from './data'
import {
  accountBalance,
  accountLedger,
  addDraftJournal,
  balanceSheet,
  journalProblems,
  postJournal,
  profitAndLoss,
  reverseJournal,
  trialBalance,
  updateJournal,
} from './ledger'
import type { BooksState, JournalLine } from './schema'

const line = (account: string, debit: number, credit: number): JournalLine => ({
  account,
  description: '',
  debit,
  credit,
})

function draft(state: BooksState, memo: string, lines: JournalLine[]) {
  const added = addDraftJournal(state, '2026-03-10')
  return {
    id: added.id,
    state: updateJournal(added.state, added.id, (j) => ({ ...j, memo, lines })),
  }
}

describe('the ledger', () => {
  it('starts from opening balances that balance', () => {
    const books = openingBooks()
    const tb = trialBalance(books)
    expect(tb.debit).toBe(119250)
    expect(tb.credit).toBe(119250)
    expect(accountBalance(books, '1200')).toBe(48250)
    expect(accountBalance(books, '2400')).toBe(25000) // a liability, shown positive
    expect(balanceSheet(books).balances).toBe(true)
  })

  it('posts a balanced journal and updates balances, ledgers and reports', () => {
    const { state, id } = draft(openingBooks(), 'Rent', [
      line('6000', 2400, 0),
      line('1200', 0, 2400),
    ])
    expect(accountBalance(state, '6000')).toBe(0) // drafts don't count
    const posted = postJournal(state, id)
    expect(posted.problems).toEqual([])
    expect(accountBalance(posted.state, '1200')).toBe(45850)
    expect(accountBalance(posted.state, '6000')).toBe(2400)
    expect(profitAndLoss(posted.state).netProfit).toBe(-2400)
    expect(balanceSheet(posted.state).balances).toBe(true)
    const ledger = accountLedger(posted.state, '1200')
    expect(ledger.map((e) => e.balance)).toEqual([48250, 45850])
  })

  it('refuses journals that cannot be posted, and says why', () => {
    const books = openingBooks()
    const unbalanced = draft(books, 'Software', [
      line('6200', 418.8, 0),
      line('1200', 0, 481.8),
    ])
    expect(postJournal(unbalanced.state, unbalanced.id).problems).toEqual([
      'Debits (418.80) and credits (481.80) must be equal.',
    ])
    const messy = draft(books, '', [
      line('6200', 10, 10),
      line('', 5, 0),
      line('9999', 0, 5),
    ])
    const journal = messy.state.journals.find((j) => j.id === messy.id)!
    expect(journalProblems(messy.state, journal)).toEqual([
      'Give the journal a description.',
      'Line 1 has both a debit and a credit: use one or the other.',
      'Line 2 has no account.',
      'Line 3 uses account 9999, which does not exist.',
    ])
    const single = draft(books, 'One line', [line('6200', 10, 0)])
    expect(postJournal(single.state, single.id).problems).toContain(
      'A journal needs at least two lines with amounts.',
    )
  })

  it('reverses a posted journal instead of deleting it', () => {
    const { state, id } = draft(openingBooks(), 'Wrong rent', [
      line('6000', 2400, 0),
      line('1200', 0, 2400),
    ])
    const posted = postJournal(state, id).state
    const reversed = reverseJournal(posted, id)
    expect(reversed.journals).toHaveLength(posted.journals.length + 1)
    expect(accountBalance(reversed, '6000')).toBe(0)
    expect(accountBalance(reversed, '1200')).toBe(48250)
  })

  it('reports as at a date leave out later journals', () => {
    const { state, id } = draft(openingBooks(), 'Rent', [
      line('6000', 2400, 0),
      line('1200', 0, 2400),
    ])
    const posted = postJournal(state, id).state
    expect(accountBalance(posted, '1200', '2026-03-05')).toBe(48250)
    expect(trialBalance(posted, '2026-02-28').rows).toEqual([])
  })

  it('keeps pennies exact', () => {
    let books = openingBooks()
    for (let i = 0; i < 10; i++) {
      const d = draft(books, 'Coffee', [line('6400', 0.1, 0), line('1200', 0, 0.1)])
      books = postJournal(d.state, d.id).state
    }
    expect(accountBalance(books, '6400')).toBe(1)
    expect(accountBalance(books, '1200')).toBe(48249)
  })
})
