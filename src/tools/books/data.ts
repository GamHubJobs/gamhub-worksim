/**
 * Sample data for Books: Cobalt Ridge Consulting's chart of accounts and its
 * opening position. Tasks start from these books and add their scenario.
 */
import { addPostedJournal } from './ledger'
import type { Account, BooksState } from './schema'

const a = (
  code: string,
  name: string,
  type: Account['type'],
  system = false,
): Account => ({ code, name, type, system })

/** A small consultancy's chart of accounts, numbered the usual way. */
export const CHART_OF_ACCOUNTS: Account[] = [
  a('1100', 'Accounts receivable', 'asset', true),
  a('1200', 'Bank current account', 'asset', true),
  a('1210', 'Bank deposit account', 'asset'),
  a('1300', 'Prepayments', 'asset'),
  a('1500', 'Office equipment', 'asset'),
  a('1510', 'Accumulated depreciation', 'asset'),
  a('2100', 'Accounts payable', 'liability', true),
  a('2200', 'VAT', 'liability', true),
  a('2210', 'PAYE and NI payable', 'liability', true),
  a('2220', 'Pension payable', 'liability', true),
  a('2300', 'Accruals', 'liability'),
  a('2400', 'Bank loan', 'liability'),
  a('3000', 'Share capital', 'equity'),
  a('3100', 'Retained earnings', 'equity'),
  a('4000', 'Consulting fees', 'income'),
  a('4100', 'Training income', 'income'),
  a('4900', 'Interest received', 'income'),
  a('5000', 'Subcontractor costs', 'expense'),
  a('6000', 'Rent', 'expense'),
  a('6100', 'Utilities', 'expense'),
  a('6200', 'Software subscriptions', 'expense'),
  a('6300', 'Travel', 'expense'),
  a('6400', 'Office supplies', 'expense'),
  a('6500', 'Bank charges', 'expense'),
  a('6600', 'Depreciation', 'expense'),
  a('6700', 'Professional fees', 'expense'),
  a('6800', 'Loan interest', 'expense'),
  a('7000', 'Wages and salaries', 'expense'),
]

/** The books at the start of a month: opening balances posted, nothing else. */
export function openingBooks(today = '2026-03-31'): BooksState {
  const empty: BooksState = {
    settings: {
      companyName: 'Cobalt Ridge Consulting Ltd',
      today,
      vatRate: 0.2,
      payroll: {
        personalAllowance: 12570,
        basicRate: 0.2,
        niThresholdMonthly: 1048,
        niRate: 0.08,
      },
    },
    accounts: CHART_OF_ACCOUNTS,
    journals: [],
    customers: [],
    suppliers: [],
    invoices: [],
    bills: [],
    employees: [],
    payRuns: [],
  }
  return addPostedJournal(empty, {
    date: '2026-03-01',
    memo: 'Opening balances at 1 March 2026',
    source: 'opening',
    lines: [
      { account: '1200', description: 'Bank', debit: 48250, credit: 0 },
      { account: '1210', description: 'Deposit account', debit: 20000, credit: 0 },
      {
        account: '1100',
        description: 'Unpaid customer invoices',
        debit: 18600,
        credit: 0,
      },
      {
        account: '1500',
        description: 'Office equipment at cost',
        debit: 32400,
        credit: 0,
      },
      { account: '1510', description: 'Depreciation to date', debit: 0, credit: 9720 },
      { account: '2100', description: 'Unpaid supplier bills', debit: 0, credit: 7340 },
      { account: '2200', description: 'VAT owed', debit: 0, credit: 6190 },
      { account: '2400', description: 'Bank loan', debit: 0, credit: 25000 },
      { account: '3000', description: 'Share capital', debit: 0, credit: 10000 },
      { account: '3100', description: 'Retained earnings', debit: 0, credit: 61000 },
    ],
  }).state
}
