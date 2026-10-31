/**
 * Books, the WorkSim accounting software: its registration with the tools
 * framework. Checks compare the player's books with the task's model answer.
 */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult, formatMoney, sameMoney } from '../checks'
import type { ToolDefinition } from '../types'
import { openingBooks } from './data'
import { accountBalance, findAccount, trialBalance } from './ledger'
import { reconciliation } from './banking'
import { payRunTotals } from './payroll'
import { BooksStateSchema, type BooksState, type Journal } from './schema'
import { amountPaid, contactsFor, documentsOf, documentTotals } from './trade'

const LineSpec = z.object({
  account: z.string().regex(/^\d{4}$/),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
})

export const BooksCheckSchema = z.discriminatedUnion('type', [
  /** These accounts' balances match the model answer. */
  FileCheckBaseSchema.extend({
    type: z.literal('balances'),
    accounts: z.array(z.string().regex(/^\d{4}$/)).min(1),
  }),
  /** Each of these entries has been posted (as one journal with exactly these lines). */
  FileCheckBaseSchema.extend({
    type: z.literal('journals'),
    journals: z
      .array(
        z.object({ description: z.string().min(1), lines: z.array(LineSpec).min(2) }),
      )
      .min(1),
  }),
  /** No draft journals are left unposted, and the trial balance balances. */
  FileCheckBaseSchema.extend({
    type: z.literal('all-posted'),
  }),
  /** Approved invoices (sales) or bills (purchases) for these contacts and totals. */
  FileCheckBaseSchema.extend({
    type: z.literal('documents'),
    side: z.enum(['sales', 'purchases']),
    items: z.array(z.object({ contact: z.string(), total: z.number() })).min(1),
  }),
  /** These invoices or bills have had exactly this much paid. */
  FileCheckBaseSchema.extend({
    type: z.literal('payments'),
    side: z.enum(['sales', 'purchases']),
    items: z.array(z.object({ number: z.string(), paid: z.number() })).min(1),
  }),
  /** The bank statement is fully reconciled. */
  FileCheckBaseSchema.extend({
    type: z.literal('reconciled'),
  }),
  /** The pay run for a month is posted, with the model answer's totals. */
  FileCheckBaseSchema.extend({
    type: z.literal('payrun'),
    period: z.string().regex(/^\d{4}-\d{2}$/),
  }),
  /** Employees with these details. */
  FileCheckBaseSchema.extend({
    type: z.literal('employees'),
    items: z
      .array(
        z.object({
          name: z.string(),
          annualSalary: z.number().optional(),
          pensionRate: z.number().optional(),
        }),
      )
      .min(1),
  }),
])
export type BooksCheck = z.infer<typeof BooksCheckSchema>

function describeLine(state: BooksState, line: z.infer<typeof LineSpec>): string {
  const name = findAccount(state, line.account)?.name ?? line.account
  return line.debit > 0
    ? `Dr ${line.account} ${name} ${formatMoney(line.debit)}`
    : `Cr ${line.account} ${name} ${formatMoney(line.credit)}`
}

/** Whether a posted journal has exactly these lines (in any order). */
function journalMatches(
  journal: Journal,
  spec: Array<z.infer<typeof LineSpec>>,
): boolean {
  const lines = journal.lines.filter((l) => l.debit !== 0 || l.credit !== 0)
  if (lines.length !== spec.length) return false
  const remaining = [...lines]
  for (const want of spec) {
    const i = remaining.findIndex(
      (l) =>
        l.account === want.account &&
        sameMoney(l.debit, want.debit) &&
        sameMoney(l.credit, want.credit),
    )
    if (i === -1) return false
    remaining.splice(i, 1)
  }
  return true
}

function gradeCheck(
  check: BooksCheck,
  player: BooksState,
  start: BooksState,
  solution: BooksState,
) {
  switch (check.type) {
    case 'balances': {
      const wrong = check.accounts.filter(
        (code) =>
          !sameMoney(accountBalance(player, code), accountBalance(solution, code)),
      )
      return checkResult(
        check,
        1 - wrong.length / check.accounts.length,
        wrong.map((code) => {
          const name = findAccount(player, code)?.name ?? code
          return `${code} ${name} is ${formatMoney(accountBalance(player, code))}; it should be ${formatMoney(accountBalance(solution, code))}.`
        }),
      )
    }
    case 'journals': {
      // Journals already posted at the start don't count; a draft the player fixed does.
      const startIds = new Set(
        start.journals.filter((j) => j.status === 'posted').map((j) => j.id),
      )
      const posted = player.journals.filter(
        (j) => j.status === 'posted' && !startIds.has(j.id),
      )
      const used = new Set<string>()
      const missing: string[] = []
      for (const want of check.journals) {
        const found = posted.find((j) => !used.has(j.id) && journalMatches(j, want.lines))
        if (found) used.add(found.id)
        else {
          missing.push(
            `No posted journal for ${want.description} (${want.lines.map((l) => describeLine(player, l)).join(', ')}).`,
          )
        }
      }
      return checkResult(check, 1 - missing.length / check.journals.length, missing)
    }
    case 'all-posted': {
      const drafts = player.journals.filter((j) => j.status === 'draft')
      const tb = trialBalance(player)
      const problems = [
        ...drafts.map(
          (j) => `Journal ${j.number}${j.memo ? ` (${j.memo})` : ''} is still a draft.`,
        ),
        ...(sameMoney(tb.debit, tb.credit)
          ? []
          : ['The trial balance does not balance.']),
      ]
      return checkResult(check, problems.length === 0 ? 1 : 0, problems)
    }
    case 'documents': {
      const word = check.side === 'sales' ? 'invoice' : 'bill'
      const used = new Set<string>()
      const missing: string[] = []
      for (const item of check.items) {
        const contact = contactsFor(player, check.side).find(
          (c) => c.name.trim().toLowerCase() === item.contact.toLowerCase(),
        )
        const found = documentsOf(player, check.side).find(
          (d) =>
            !used.has(d.id) &&
            d.status === 'approved' &&
            d.contact === contact?.id &&
            !start[check.side === 'sales' ? 'invoices' : 'bills'].some(
              (s) => s.id === d.id,
            ) &&
            sameMoney(documentTotals(player, d).total, item.total),
        )
        if (found) used.add(found.id)
        else {
          missing.push(
            `No approved ${word} to ${item.contact} for ${formatMoney(item.total)} (including VAT).`,
          )
        }
      }
      return checkResult(check, 1 - missing.length / check.items.length, missing)
    }
    case 'payments': {
      const wrong = check.items.flatMap((item) => {
        const doc = documentsOf(player, check.side).find((d) => d.number === item.number)
        const paidSoFar = doc ? amountPaid(doc) : 0
        return sameMoney(paidSoFar, item.paid)
          ? []
          : [
              `${item.number} shows ${formatMoney(paidSoFar)} paid; it should be ${formatMoney(item.paid)}.`,
            ]
      })
      return checkResult(check, 1 - wrong.length / check.items.length, wrong)
    }
    case 'reconciled': {
      const rec = reconciliation(player)
      if (!rec) return checkResult(check, 0, ['There is no bank statement in this file.'])
      const problems = [
        ...rec.unmatchedLines.map(
          (l) =>
            `Statement line ${l.date} ${l.description} (${formatMoney(l.amount)}) is not matched.`,
        ),
        ...(sameMoney(rec.difference, 0)
          ? []
          : [`The reconciliation is out by ${formatMoney(rec.difference)}.`]),
      ]
      const total = (player.bank?.lines.length ?? 1) + 1
      return checkResult(
        check,
        problems.length === 0 ? 1 : 1 - problems.length / total,
        problems,
      )
    }
    case 'payrun': {
      const run = player.payRuns.find((r) => r.period === check.period)
      const expected = solution.payRuns.find((r) => r.period === check.period)
      if (!run) return checkResult(check, 0, [`There is no pay run for ${check.period}.`])
      if (run.status !== 'posted') {
        return checkResult(check, 0.3, [
          `The pay run for ${check.period} is still a draft.`,
        ])
      }
      const got = payRunTotals(run)
      const want = expected ? payRunTotals(expected) : got
      const names = {
        gross: 'gross pay',
        tax: 'income tax',
        ni: 'National Insurance',
        pension: 'pension',
        net: 'net pay',
      }
      const wrong = (Object.keys(names) as Array<keyof typeof names>).filter(
        (k) => !sameMoney(got[k], want[k]),
      )
      const count = expected ? expected.payslips.length : run.payslips.length
      const problems = [
        ...(run.payslips.length === count
          ? []
          : [
              `The pay run has ${run.payslips.length} payslips; there should be ${count}.`,
            ]),
        ...wrong.map(
          (k) =>
            `Total ${names[k]} is ${formatMoney(got[k])}; it should be ${formatMoney(want[k])}.`,
        ),
      ]
      return checkResult(check, 1 - wrong.length / 5, problems)
    }
    case 'employees': {
      const wrong = check.items.flatMap((item) => {
        const employee = player.employees.find(
          (e) => e.name.trim().toLowerCase() === item.name.toLowerCase(),
        )
        if (!employee) return [`${item.name} is not set up as an employee.`]
        const problems: string[] = []
        if (
          item.annualSalary !== undefined &&
          !sameMoney(employee.annualSalary, item.annualSalary)
        ) {
          problems.push(
            `${item.name}’s salary is ${formatMoney(employee.annualSalary)}; it should be ${formatMoney(item.annualSalary)}.`,
          )
        }
        if (
          item.pensionRate !== undefined &&
          Math.abs(employee.pensionRate - item.pensionRate) > 0.0001
        ) {
          problems.push(
            `${item.name}’s pension is ${(employee.pensionRate * 100).toFixed(1)}%; it should be ${(item.pensionRate * 100).toFixed(1)}%.`,
          )
        }
        return problems.length > 0 ? [problems.join(' ')] : []
      })
      return checkResult(check, 1 - wrong.length / check.items.length, wrong)
    }
  }
}

export const books: ToolDefinition<BooksState, BooksCheck> = {
  id: 'books',
  name: 'Books',
  category: 'Accounting software',
  icon: 'books',
  sections: [
    {
      id: 'overview',
      name: 'Overview',
      description: 'The money position at a glance: bank, customers owe, we owe, profit.',
    },
    {
      id: 'journals',
      name: 'Journals',
      description: 'Record transactions as balanced debits and credits, and post them.',
    },
    {
      id: 'accounts',
      name: 'Chart of accounts',
      description: 'Every account, its type and its balance; open one to see its ledger.',
    },
    {
      id: 'sales',
      name: 'Sales',
      description:
        'Customers, invoices with VAT, payments received and aged receivables.',
    },
    {
      id: 'purchases',
      name: 'Purchases',
      description: 'Suppliers, bills, payments made and aged payables.',
    },
    {
      id: 'banking',
      name: 'Banking',
      description: 'Match the bank statement to the books and reconcile it.',
    },
    {
      id: 'payroll',
      name: 'Payroll',
      description: 'Employees, monthly pay runs, payslips and the payroll journal.',
    },
    {
      id: 'reports',
      name: 'Reports',
      description:
        'Trial balance, profit and loss, and balance sheet, live from the ledger.',
    },
  ],
  state: BooksStateSchema,
  practice: () => openingBooks(),
  summary: (state) => {
    const posted = state.journals.filter((j) => j.status === 'posted').length
    const drafts = state.journals.length - posted
    return `${posted} journal${posted === 1 ? '' : 's'} posted${drafts ? `, ${drafts} draft${drafts === 1 ? '' : 's'}` : ''}`
  },
  check: BooksCheckSchema,
  grade: (checks, player, { start, solution }) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player, start, solution)
        : checkResult(check, 0, ['The books were not handed in.']),
    ),
  guide: {
    intro:
      'Books is the company’s accounting software. Every financial event (a sale, a bill, a payment, wages) is recorded as a journal: equal debits and credits to two or more accounts. The ledger and every report are calculated from the posted journals, so if the journals are right, the reports are right.',
    topics: [
      {
        title: 'Record a journal',
        body: 'Open Journals and click New journal. Give it a date and a description. On each line, choose an account and enter a debit or a credit (never both). When the totals of the debit and credit columns are equal, click Post. Posted journals cannot be edited; to correct one, reverse it and post the right entry.',
      },
      {
        title: 'Debit or credit?',
        body: 'Debits increase assets (bank, equipment) and expenses (rent, wages). Credits increase liabilities (loans, money owed), equity and income (fees). Paying rent from the bank: debit Rent, credit Bank. Receiving interest: debit Bank, credit Interest received.',
      },
      {
        title: 'Check an account',
        body: 'Open Chart of accounts and click an account to see its ledger: every posted line, with a running balance. This is how accountants trace a figure back to where it came from.',
      },
      {
        title: 'Raise an invoice or enter a bill',
        body: 'In Sales, click New invoice and choose the customer (or add a new one). Enter each line: description, quantity, unit price, the income account and whether VAT applies. Check the totals and click Approve invoice: Books posts the journal (debit receivables, credit income and VAT). Bills work the same way in Purchases, with the supplier’s own reference. When money arrives or leaves, open the invoice or bill and record the payment.',
      },
      {
        title: 'Reconcile the bank',
        body: 'In Banking, every line of the bank statement needs a partner in the books. Match lines to the entries with the same amount. Record lines that are missing from the books (bank charges, interest, direct debits) to the right account. If a line won’t match, find out why: usually something was keyed in wrongly, and the books must be corrected, never the statement. Payments made just before the statement date that haven’t reached the bank yet are unpresented items, not errors.',
      },
      {
        title: 'Run payroll',
        body: 'Keep the employee list up to date first (new starters, leavers, pay rises). Then create the pay run for the month: Books works out gross pay, income tax, National Insurance, pension and net pay for everyone. Check the payslips, and post the run. The journal debits wages and credits the amounts owed to the tax office, the pension provider and the employees (paid from the bank).',
      },
      {
        title: 'Read the reports',
        body: 'The trial balance lists every account’s balance; total debits must equal total credits. Profit and loss shows income less expenses. The balance sheet shows what the company owns (assets) against what it owes (liabilities) and its equity.',
      },
    ],
    glossary: [
      {
        term: 'Debit (Dr)',
        meaning: 'The left side of an entry. Increases assets and expenses.',
      },
      {
        term: 'Credit (Cr)',
        meaning: 'The right side of an entry. Increases liabilities, equity and income.',
      },
      {
        term: 'Journal',
        meaning: 'One transaction: lines of debits and credits that balance.',
      },
      { term: 'Posting', meaning: 'Making a journal final, so it counts in the ledger.' },
      {
        term: 'VAT',
        meaning:
          'Tax added to sales (owed to the tax office) and paid on purchases (reclaimed).',
      },
      {
        term: 'Accounts receivable',
        meaning: 'Money customers owe the company for invoices.',
      },
      {
        term: 'Accounts payable',
        meaning: 'Money the company owes its suppliers for bills.',
      },
      {
        term: 'Bank reconciliation',
        meaning:
          'Proving that the bank balance in the books agrees with the bank’s statement.',
      },
      {
        term: 'Unpresented item',
        meaning: 'A payment in the books that has not reached the bank statement yet.',
      },
      { term: 'Gross and net pay', meaning: 'Pay before and after tax, NI and pension.' },
      { term: 'Prepayment', meaning: 'A cost paid now that belongs to future months.' },
      {
        term: 'Depreciation',
        meaning: 'Spreading the cost of equipment over the years it is used.',
      },
      {
        term: 'Accrual',
        meaning: 'A cost recorded in the month it was used, before the bill arrives.',
      },
      {
        term: 'Trial balance',
        meaning: 'A list of all balances. If debits ≠ credits, something is wrong.',
      },
    ],
  },
}
