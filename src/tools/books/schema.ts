/**
 * Books: the saved state of an accounting file. One file holds a company's
 * whole set of books: the chart of accounts, journals, customers and sales
 * invoices, suppliers and bills, the bank statement and its matches, and
 * payroll. Everything that changes money posts a journal to the same ledger.
 */
import { z } from 'zod'

export const ACCOUNT_TYPES = [
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const Money = z.number().finite().min(-1e9).max(1e9)
const Code = z.string().regex(/^\d{4}$/)
const Id = z.string().min(1).max(40)

export const AccountSchema = z.object({
  code: Code,
  name: z.string().min(1).max(80),
  type: z.enum(ACCOUNT_TYPES),
  /** Accounts the software uses itself (bank, receivables, VAT…): not deletable. */
  system: z.boolean().default(false),
})

export const JournalLineSchema = z.object({
  /** Empty while a draft line has no account chosen yet. */
  account: z.union([Code, z.literal('')]),
  description: z.string().max(200).default(''),
  debit: Money.min(0).default(0),
  credit: Money.min(0).default(0),
})

export const JOURNAL_SOURCES = [
  'manual',
  'opening',
  'invoice',
  'invoice-payment',
  'bill',
  'bill-payment',
  'bank',
  'payroll',
] as const

export const JournalSchema = z.object({
  id: Id,
  number: z.number().int().positive(),
  date: DateSchema,
  memo: z.string().max(200),
  lines: z.array(JournalLineSchema).max(60),
  /** Drafts can be unfinished; only posted journals count in the ledger. */
  status: z.enum(['draft', 'posted']),
  source: z.enum(JOURNAL_SOURCES).default('manual'),
  /** The invoice, bill, bank line or pay run that created it. */
  sourceId: z.string().optional(),
})

export const ContactSchema = z.object({
  id: Id,
  name: z.string().min(1).max(100),
  email: z.string().max(120).default(''),
})

export const DocumentLineSchema = z.object({
  description: z.string().max(200),
  quantity: z.number().finite().min(0).max(1e6),
  unitPrice: Money.min(0),
  account: Code,
  /** Whether VAT is charged on this line. */
  vat: z.boolean().default(true),
})

export const PaymentSchema = z.object({
  id: Id,
  date: DateSchema,
  amount: Money.positive(),
  journalId: Id,
})

/** A sales invoice (to a customer) or a bill (from a supplier). */
export const TradeDocumentSchema = z.object({
  id: Id,
  /** Invoice number, or the supplier's reference for a bill. */
  number: z.string().max(40),
  contact: Id,
  date: DateSchema,
  dueDate: DateSchema,
  lines: z.array(DocumentLineSchema).max(40),
  status: z.enum(['draft', 'approved', 'void']),
  journalId: Id.optional(),
  payments: z.array(PaymentSchema).default([]),
})

export const BankLineSchema = z.object({
  id: Id,
  date: DateSchema,
  description: z.string().max(200),
  /** Money in is positive, money out negative. */
  amount: Money,
})

export const BankSchema = z.object({
  statementDate: DateSchema,
  openingBalance: Money,
  closingBalance: Money,
  lines: z.array(BankLineSchema).max(300),
  /** Bank line ID → the journal it matches. */
  matches: z.record(z.string(), Id).default({}),
})

export const EmployeeSchema = z.object({
  id: Id,
  name: z.string().min(1).max(100),
  role: z.string().max(100).default(''),
  annualSalary: Money.min(0),
  /** The employee's pension contribution, e.g. 0.05 for 5%. */
  pensionRate: z.number().min(0).max(0.5),
})

export const PayslipSchema = z.object({
  employee: Id,
  gross: Money,
  tax: Money,
  ni: Money,
  pension: Money,
  net: Money,
})

export const PayRunSchema = z.object({
  id: Id,
  /** The month paid, e.g. "2026-03". */
  period: z.string().regex(/^\d{4}-\d{2}$/),
  payDate: DateSchema,
  payslips: z.array(PayslipSchema).max(200),
  status: z.enum(['draft', 'posted']),
  journalId: Id.optional(),
})

export const BooksSettingsSchema = z.object({
  companyName: z.string().min(1).max(100),
  /** "Today" in the books, for due dates and ageing. */
  today: DateSchema,
  vatRate: z.number().min(0).max(1),
  /** Simplified UK payroll rules. */
  payroll: z.object({
    personalAllowance: Money.min(0),
    basicRate: z.number().min(0).max(1),
    niThresholdMonthly: Money.min(0),
    niRate: z.number().min(0).max(1),
  }),
})

export const BooksStateSchema = z.object({
  settings: BooksSettingsSchema,
  accounts: z.array(AccountSchema).min(1).max(200),
  journals: z.array(JournalSchema).max(2000),
  customers: z.array(ContactSchema).max(300).default([]),
  suppliers: z.array(ContactSchema).max(300).default([]),
  invoices: z.array(TradeDocumentSchema).max(1000).default([]),
  bills: z.array(TradeDocumentSchema).max(1000).default([]),
  bank: BankSchema.optional(),
  employees: z.array(EmployeeSchema).max(200).default([]),
  payRuns: z.array(PayRunSchema).max(120).default([]),
})

export type Account = z.infer<typeof AccountSchema>
export type JournalLine = z.infer<typeof JournalLineSchema>
export type Journal = z.infer<typeof JournalSchema>
export type JournalSource = (typeof JOURNAL_SOURCES)[number]
export type Contact = z.infer<typeof ContactSchema>
export type DocumentLine = z.infer<typeof DocumentLineSchema>
export type TradeDocument = z.infer<typeof TradeDocumentSchema>
export type BankLine = z.infer<typeof BankLineSchema>
export type Employee = z.infer<typeof EmployeeSchema>
export type Payslip = z.infer<typeof PayslipSchema>
export type PayRun = z.infer<typeof PayRunSchema>
export type BooksState = z.infer<typeof BooksStateSchema>
