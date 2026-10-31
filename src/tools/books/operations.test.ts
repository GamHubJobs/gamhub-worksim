import { describe, expect, it } from 'vitest'
import { createFromLine, matchCandidates, matchLine, reconciliation } from './banking'
import { openingBooks } from './data'
import { accountBalance, balanceSheet, trialBalance } from './ledger'
import { calculatePayslip, createPayRun, postPayRun, saveEmployee } from './payroll'
import { BooksStateSchema, type BooksState } from './schema'
import { addDraftJournal } from './ledger'
import { marchBooks } from './scenario'
import {
  addContact,
  addDraftDocument,
  agedBalances,
  approveDocument,
  documentProblems,
  documentTotals,
  paymentStatus,
  recordPayment,
} from './trade'

function withInvoice(state: BooksState) {
  const customer = addContact(state, 'sales', 'Harbour Foods')
  const draft = addDraftDocument(customer.state, 'sales', customer.id, {
    date: '2026-03-05',
    dueDate: '2026-04-04',
    lines: [
      {
        description: 'Advisory days',
        quantity: 3,
        unitPrice: 650,
        account: '4000',
        vat: true,
      },
      {
        description: 'Workshop',
        quantity: 1,
        unitPrice: 400,
        account: '4100',
        vat: true,
      },
    ],
  })
  return { ...draft, customer: customer.id }
}

describe('sales and purchases', () => {
  it('approving an invoice posts receivables, income and VAT', () => {
    const { state, id } = withInvoice(openingBooks())
    const invoice = state.invoices[0]
    expect(invoice.number).toBe('INV-1001')
    expect(documentTotals(state, invoice)).toEqual({ net: 2350, vat: 470, total: 2820 })
    const approved = approveDocument(state, 'sales', id)
    expect(approved.problems).toEqual([])
    expect(accountBalance(approved.state, '1100')).toBe(18600 + 2820)
    expect(accountBalance(approved.state, '4000')).toBe(1950)
    expect(accountBalance(approved.state, '4100')).toBe(400)
    expect(accountBalance(approved.state, '2200')).toBe(6190 + 470)
    expect(paymentStatus(approved.state, approved.state.invoices[0])).toBe('unpaid')
  })

  it('records part and full payments through the bank', () => {
    const { state, id } = withInvoice(openingBooks())
    let books = approveDocument(state, 'sales', id).state
    books = recordPayment(books, 'sales', id, { date: '2026-03-20', amount: 1000 }).state
    expect(paymentStatus(books, books.invoices[0])).toBe('part-paid')
    expect(
      recordPayment(books, 'sales', id, { date: '2026-03-21', amount: 5000 }).problems,
    ).toEqual(['That is more than the 1820.00 still due.'])
    books = recordPayment(books, 'sales', id, { date: '2026-03-25', amount: 1820 }).state
    expect(paymentStatus(books, books.invoices[0])).toBe('paid')
    expect(accountBalance(books, '1200')).toBe(48250 + 2820)
    expect(accountBalance(books, '1100')).toBe(18600)
    expect(balanceSheet(books).balances).toBe(true)
  })

  it('bills post expenses, reclaimable VAT and payables', () => {
    const supplier = addContact(openingBooks(), 'purchases', 'Northgate Office Supplies')
    const draft = addDraftDocument(supplier.state, 'purchases', supplier.id, {
      number: 'NOS-5521',
      date: '2026-03-08',
      lines: [
        {
          description: 'Paper and toner',
          quantity: 1,
          unitPrice: 240,
          account: '6400',
          vat: true,
        },
      ],
    })
    let books = approveDocument(draft.state, 'purchases', draft.id).state
    expect(accountBalance(books, '6400')).toBe(240)
    expect(accountBalance(books, '2200')).toBe(6190 - 48)
    expect(accountBalance(books, '2100')).toBe(7340 + 288)
    books = recordPayment(books, 'purchases', draft.id, {
      date: '2026-03-30',
      amount: 288,
    }).state
    expect(accountBalance(books, '2100')).toBe(7340)
    expect(accountBalance(books, '1200')).toBe(48250 - 288)
  })

  it('refuses incomplete and duplicate documents', () => {
    const supplier = addContact(openingBooks(), 'purchases', 'Northgate Office Supplies')
    const first = addDraftDocument(supplier.state, 'purchases', supplier.id, {
      number: 'NOS-5521',
      lines: [
        { description: 'Paper', quantity: 1, unitPrice: 10, account: '6400', vat: true },
      ],
    })
    const approved = approveDocument(first.state, 'purchases', first.id).state
    const again = addDraftDocument(approved, 'purchases', supplier.id, {
      number: 'nos-5521',
      lines: [
        { description: '', quantity: 1, unitPrice: 10, account: '4000', vat: true },
      ],
    })
    const doc = again.state.bills.find((b) => b.id === again.id)!
    expect(documentProblems(again.state, 'purchases', doc)).toEqual([
      'This supplier’s bill nos-5521 is already entered: is it a duplicate?',
      'Line 1 needs a description.',
      'Line 1: purchases go to an expense or asset account.',
    ])
  })

  it('ages unpaid invoices by how late they are', () => {
    const { state, id } = withInvoice({
      ...openingBooks(),
      settings: { ...openingBooks().settings, today: '2026-05-20' },
    })
    const books = approveDocument(state, 'sales', id).state
    const aged = agedBalances(books, 'sales')
    expect(aged.rows).toHaveLength(1)
    expect(aged.rows[0]['31-60']).toBe(2820) // due 4 April, 46 days late
    expect(paymentStatus(books, books.invoices[0])).toBe('overdue')
  })
})

describe('bank reconciliation', () => {
  function withStatement(): BooksState {
    const { state, id } = withInvoice(openingBooks())
    let books = approveDocument(state, 'sales', id).state
    books = recordPayment(books, 'sales', id, { date: '2026-03-20', amount: 2820 }).state
    return {
      ...books,
      bank: {
        statementDate: '2026-03-31',
        openingBalance: 48250,
        closingBalance: 48250 + 2820 - 12.5,
        lines: [
          {
            id: 'b1',
            date: '2026-03-20',
            description: 'HARBOUR FOODS INV-1001',
            amount: 2820,
          },
          {
            id: 'b2',
            date: '2026-03-31',
            description: 'MONTHLY ACCOUNT FEE',
            amount: -12.5,
          },
        ],
        matches: {},
      },
    }
  }

  it('matches lines to the ledger and records what is missing', () => {
    let books = withStatement()
    expect(reconciliation(books)?.reconciled).toBe(false)
    const [candidate] = matchCandidates(books, books.bank!.lines[0])
    expect(candidate.amount).toBe(2820)
    books = matchLine(books, 'b1', candidate.journalId).state
    expect(matchLine(books, 'b2', candidate.journalId).problems).toHaveLength(1)
    books = createFromLine(books, 'b2', '6500', 'Bank charges for March').state
    const rec = reconciliation(books)!
    expect(rec.unmatchedLines).toEqual([])
    expect(rec.difference).toBe(0)
    expect(rec.reconciled).toBe(true)
    expect(accountBalance(books, '6500')).toBe(12.5)
  })

  it('a payment in the books but not yet on the statement is unpresented, not an error', () => {
    let books = withStatement()
    books = matchLine(
      books,
      'b1',
      matchCandidates(books, books.bank!.lines[0])[0].journalId,
    ).state
    books = createFromLine(books, 'b2', '6500').state
    const supplier = addContact(books, 'purchases', 'Late Cheque Ltd')
    const bill = addDraftDocument(supplier.state, 'purchases', supplier.id, {
      number: 'X1',
      date: '2026-03-29',
      lines: [
        {
          description: 'Repairs',
          quantity: 1,
          unitPrice: 100,
          account: '6400',
          vat: false,
        },
      ],
    })
    books = approveDocument(bill.state, 'purchases', bill.id).state
    books = recordPayment(books, 'purchases', bill.id, {
      date: '2026-03-30',
      amount: 100,
    }).state
    const rec = reconciliation(books)!
    expect(rec.unpresented.map((u) => u.amount)).toEqual([-100])
    expect(rec.reconciled).toBe(true)
  })
})

describe('payroll', () => {
  it('works out a payslip with simplified UK rules', () => {
    const books = saveEmployee(openingBooks(), {
      name: 'Maya Patel',
      role: 'Consultant',
      annualSalary: 36000,
      pensionRate: 0.05,
    }).state
    expect(calculatePayslip(books, books.employees[0])).toEqual({
      employee: 'e1',
      gross: 3000,
      tax: 390.5, // 20% of (3,000 − 1,047.50)
      ni: 156.16, // 8% of (3,000 − 1,048)
      pension: 150,
      net: 2303.34,
    })
  })

  it('posts a pay run to wages, liabilities and the bank', () => {
    let books = saveEmployee(openingBooks(), {
      name: 'Maya Patel',
      role: 'Consultant',
      annualSalary: 36000,
      pensionRate: 0.05,
    }).state
    books = saveEmployee(books, {
      name: 'Ben Hart',
      role: 'Analyst',
      annualSalary: 12000,
      pensionRate: 0.05,
    }).state
    const run = createPayRun(books, '2026-03', '2026-03-27')
    expect(createPayRun(run.state, '2026-03', '2026-03-27').problems).toEqual([
      'There is already a pay run for 2026-03.',
    ])
    books = postPayRun(run.state, run.id).state
    expect(accountBalance(books, '7000')).toBe(4000)
    expect(accountBalance(books, '2210')).toBe(390.5 + 156.16) // Tom pays no tax or NI
    expect(accountBalance(books, '2220')).toBe(200)
    expect(accountBalance(books, '1200')).toBe(48250 - (2303.34 + 950))
    const tb = trialBalance(books)
    expect(tb.debit).toBe(tb.credit)
  })
})

describe('every action leaves a valid file', () => {
  // The save layer refuses invalid files, so an action that produced one
  // would silently do nothing in the app.
  it('drafts, approvals, payments, matches and pay runs', () => {
    const valid = (state: BooksState) =>
      expect(BooksStateSchema.safeParse(state).success).toBe(true)
    const books = marchBooks()
    valid(addDraftJournal(books).state)
    valid(addDraftDocument(books, 'sales', 'c1').state)
    valid(addDraftDocument(books, 'purchases', 's1').state)
    valid(addContact(books, 'purchases', 'New Supplier Ltd').state)
    const run = createPayRun(books, '2026-03', '2026-03-27')
    valid(run.state)
    valid(postPayRun(run.state, run.id).state)
    valid(
      recordPayment(books, 'sales', 'inv1', { date: '2026-03-25', amount: 9600 }).state,
    )
  })
})
