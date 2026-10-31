/**
 * Building blocks for Books scenarios: the company's customers, suppliers and
 * staff, and the invoices and bills already open at the start of March.
 * Tasks combine these with their own events.
 */
import { openingBooks } from './data'
import { addPostedJournal } from './ledger'
import type { BooksState, Employee, JournalLine, TradeDocument } from './schema'
import { approveDocument, addDraftDocument, recordPayment } from './trade'

export const CUSTOMERS = [
  { id: 'c1', name: 'Harbour Foods', email: 'accounts@harbourfoods.example' },
  { id: 'c2', name: 'Brightpath Clinics', email: 'finance@brightpath.example' },
  { id: 'c3', name: 'Northgate Motors', email: 'payables@northgatemotors.example' },
]

export const SUPPLIERS = [
  { id: 's1', name: 'Meadow Office Supplies', email: 'invoices@meadowoffice.example' },
  { id: 's2', name: 'Clearline Telecom', email: 'billing@clearline.example' },
  { id: 's3', name: 'Ferris & Co Solicitors', email: 'accounts@ferrisco.example' },
]

export const STAFF: Employee[] = [
  {
    id: 'e1',
    name: 'Maya Patel',
    role: 'Senior Consultant',
    annualSalary: 36000,
    pensionRate: 0.05,
  },
  {
    id: 'e2',
    name: 'Owen Clarke',
    role: 'Consultant',
    annualSalary: 31500,
    pensionRate: 0.05,
  },
  {
    id: 'e3',
    name: 'Hannah Lin',
    role: 'Office Manager',
    annualSalary: 27000,
    pensionRate: 0.04,
  },
  {
    id: 'e4',
    name: 'Sam Doyle',
    role: 'Graduate Analyst',
    annualSalary: 24000,
    pensionRate: 0.03,
  },
  {
    id: 'e5',
    name: 'Ruth Adeyemi',
    role: 'Part-time Bookkeeper',
    annualSalary: 11400,
    pensionRate: 0,
  },
]

/**
 * An invoice or bill that was already approved before March: its amount is
 * part of the opening balances, so it is linked to the opening journal
 * instead of posting a new one.
 */
function openingDocument(
  state: BooksState,
  input: Pick<TradeDocument, 'id' | 'number' | 'contact' | 'date' | 'dueDate'> & {
    description: string
    net: number
    account: string
  },
): TradeDocument {
  return {
    id: input.id,
    number: input.number,
    contact: input.contact,
    date: input.date,
    dueDate: input.dueDate,
    lines: [
      {
        description: input.description,
        quantity: 1,
        unitPrice: input.net,
        account: input.account,
        vat: true,
      },
    ],
    status: 'approved',
    journalId: state.journals[0].id,
    payments: [],
  }
}

/** Opening books with customers, suppliers, open invoices and bills, and staff. */
export function marchBooks(): BooksState {
  const books = openingBooks()
  return {
    ...books,
    customers: CUSTOMERS,
    suppliers: SUPPLIERS,
    // 9,600 + 9,000 = the 18,600 receivable in the opening balances (VAT included).
    invoices: [
      openingDocument(books, {
        id: 'inv1',
        number: 'INV-1038',
        contact: 'c3',
        date: '2026-02-13',
        dueDate: '2026-03-15',
        description: 'February advisory retainer',
        net: 8000,
        account: '4000',
      }),
      openingDocument(books, {
        id: 'inv2',
        number: 'INV-1039',
        contact: 'c1',
        date: '2026-02-27',
        dueDate: '2026-03-29',
        description: 'Process review, phase 1',
        net: 7500,
        account: '4000',
      }),
    ],
    // 4,140 + 3,200 = the 7,340 payable in the opening balances.
    bills: [
      openingDocument(books, {
        id: 'bill1',
        number: 'FC-2207',
        contact: 's3',
        date: '2026-02-18',
        dueDate: '2026-03-20',
        description: 'Contract review',
        net: 3450,
        account: '6700',
      }),
      openingDocument(books, {
        id: 'bill2',
        number: 'CL-88410',
        contact: 's2',
        date: '2026-02-24',
        dueDate: '2026-04-05',
        description: 'Annual phone system support',
        net: 2666.67,
        account: '6100',
      }),
    ],
    employees: STAFF,
  }
}

type Change = (state: BooksState) => BooksState

/** Approves an invoice or bill in a scenario (throws if the scenario is wrong). */
export function approved(
  side: 'sales' | 'purchases',
  contact: string,
  input: Parameters<typeof addDraftDocument>[3],
): Change {
  return (state) => {
    const draft = addDraftDocument(state, side, contact, input)
    const result = approveDocument(draft.state, side, draft.id)
    if (result.problems.length > 0) throw new Error(result.problems.join(' '))
    return result.state
  }
}

export function paid(
  side: 'sales' | 'purchases',
  number: string,
  date: string,
  amount: number,
): Change {
  return (state) => {
    const docs = side === 'sales' ? state.invoices : state.bills
    const doc = docs.find((d) => d.number === number)
    if (!doc) throw new Error(`No ${number}`)
    const result = recordPayment(state, side, doc.id, { date, amount })
    if (result.problems.length > 0) throw new Error(result.problems.join(' '))
    return result.state
  }
}

export function journal(date: string, memo: string, lines: JournalLine[]): Change {
  return (state) => addPostedJournal(state, { date, memo, lines, source: 'manual' }).state
}

export const apply = (state: BooksState, changes: Change[]) =>
  changes.reduce((s, change) => change(s), state)

export const line = (
  account: string,
  debit: number,
  credit: number,
  description = '',
): JournalLine => ({ account, description, debit, credit })
