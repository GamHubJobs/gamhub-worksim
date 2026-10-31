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
import { BooksStateSchema, type BooksState, type Journal } from './schema'

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
