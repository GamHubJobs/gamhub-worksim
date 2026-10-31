import type { AssignmentInput } from '../../schemas'
import { openingBooks } from '../../../tools/books/data'
import {
  addDraftJournal,
  addPostedJournal,
  postJournal,
  updateJournal,
} from '../../../tools/books/ledger'
import type { BooksState, JournalLine } from '../../../tools/books/schema'

/**
 * Accounting (Accounts Trainee): the first task in Books, the accounting
 * software. Post the month's transactions as journals, and find and fix a
 * colleague's draft that does not balance. Teaches: debits and credits in
 * real software, capital versus expense, transfers, accruals, and checking
 * the trial balance.
 */
const line = (
  account: string,
  debit: number,
  credit: number,
  description = '',
): JournalLine => ({
  account,
  description,
  debit,
  credit,
})

/** The books as the trainee finds them: the opening balances and Helen's draft. */
function start(): BooksState {
  const { state, id } = addDraftJournal(openingBooks(), '2026-03-05')
  return updateJournal(state, id, (j) => ({
    ...j,
    memo: 'Software subscriptions for March',
    lines: [
      line('6200', 418.8, 0, 'Accounting and design software'),
      // A transposition error: the bank statement says 418.80.
      line('1200', 0, 481.8, 'Paid by direct debit'),
    ],
  }))
}

const entries: Array<{ date: string; memo: string; lines: JournalLine[] }> = [
  {
    date: '2026-03-02',
    memo: 'March office rent',
    lines: [line('6000', 2400, 0), line('1200', 0, 2400)],
  },
  {
    date: '2026-03-09',
    memo: 'New laptop for the office',
    lines: [line('1500', 1150, 0), line('1200', 0, 1150)],
  },
  {
    date: '2026-03-16',
    memo: 'Transfer from the deposit account',
    lines: [line('1200', 5000, 0), line('1210', 0, 5000)],
  },
  {
    date: '2026-03-31',
    memo: 'Interest on the deposit account',
    lines: [line('1210', 18.4, 0), line('4900', 0, 18.4)],
  },
  {
    date: '2026-03-31',
    memo: 'Electricity for March (bill not yet received)',
    lines: [line('6100', 310, 0), line('2300', 0, 310)],
  },
]

function solution(): BooksState {
  let state = start()
  const draft = state.journals.find((j) => j.status === 'draft')!
  state = updateJournal(state, draft.id, (j) => ({
    ...j,
    lines: [j.lines[0], { ...j.lines[1], credit: 418.8 }],
  }))
  state = postJournal(state, draft.id).state
  for (const entry of entries) {
    state = addPostedJournal(state, { ...entry, source: 'manual' }).state
  }
  return state
}

const spec = (lines: JournalLine[]) =>
  lines.map(({ account, debit, credit }) => ({ account, debit, credit }))

export const booksJournals: AssignmentInput = {
  id: 'books-journals',
  version: 1,
  careerId: 'accounting',
  levelId: 'accounts-trainee',
  order: 2,
  kind: 'tool',
  title: 'Post March’s journals in Books',
  summary:
    'Record the month’s transactions in the accounting software and fix a draft that does not balance.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Your first job in Books',
    body: `Hi {name},

Time to work in the real books. Our accounting software, **Books**, is where every transaction ends up, and the reports the directors read come straight from it.

Please post these March transactions as journals:
1. 2 March: the March office rent, **£2,400**, paid by bank transfer.
2. 9 March: a new laptop for the office, **£1,150**, paid from the bank. (It will last several years, so it is equipment, not an expense.)
3. 16 March: **£5,000** moved from the deposit account to the current account.
4. 31 March: **£18.40** interest paid into the deposit account.
5. 31 March: electricity for March, about **£310**. The bill won’t arrive until April, but the cost belongs to March, so accrue it.

{senior} also left a draft journal for the software subscriptions (**£418.80**, paid by direct debit) that won’t post. Find out why, fix it and post it.

When nothing is left in draft and the trial balance balances, submit it to me.

Daniel`,
  },
  whyItMatters:
    'Every figure in a company’s accounts comes from journals like these. Choosing the right accounts (equipment or expense? this month or next?) and making sure every entry balances is the foundation of all accounting work, and the software will not let an unbalanced entry through.',
  objectives: [
    'Record transactions as balanced journals in accounting software',
    'Tell capital spending, transfers and accruals apart',
    'Find and fix an entry that does not balance',
  ],
  steps: [
    {
      id: 'open',
      title: 'Find your way around',
      instructions:
        'Open **Overview** to see the bank balance and the draft waiting to be posted. Click **Guide** at the top if you want a reminder of debits and credits.',
    },
    {
      id: 'journals',
      title: 'Post the five transactions',
      instructions:
        'In **Journals**, click **New journal** for each one. Set the date and a description, choose the accounts and enter the debit and credit, then click **Post journal**. Rent: debit 6000 Rent, credit 1200 Bank. The laptop: debit 1500 Office equipment. The transfer: debit the current account, credit 1210 Bank deposit account. Interest: debit 1210, credit 4900 Interest received. Electricity: debit 6100 Utilities, credit 2300 Accruals.',
      hint: 'If the Post button shows a problem, read it: it says exactly what is wrong.',
    },
    {
      id: 'draft',
      title: 'Fix the draft',
      instructions:
        'Open journal 2 (the draft). Compare the debit and the credit with the amount in the email. Correct the wrong figure and post it.',
      hint: 'When two digits are swapped (a transposition error), the difference is always divisible by 9.',
    },
    {
      id: 'check',
      title: 'Check the trial balance',
      instructions:
        'Open **Reports** → **Trial balance**. Total debits must equal total credits. Then open **Chart of accounts** and click 1200 to check the bank ledger.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  tool: {
    id: 'books',
    title: 'Cobalt Ridge books: March',
    start: start(),
    solution: solution(),
    checks: [
      {
        id: 'entries',
        type: 'journals',
        title: 'The five transactions posted correctly',
        journals: entries.map((e) => ({
          description: e.memo.toLowerCase(),
          lines: spec(e.lines),
        })),
        points: 45,
        why: 'Each transaction must hit the right accounts on the right sides, or every report is wrong.',
        hint: 'Rent and electricity are expenses; the laptop is equipment; the transfer moves money between two bank accounts; the unpaid bill is an accrual.',
      },
      {
        id: 'draft-fixed',
        type: 'journals',
        title: 'The software subscriptions draft fixed',
        journals: [
          {
            description: 'the software subscriptions',
            lines: [
              { account: '6200', debit: 418.8, credit: 0 },
              { account: '1200', debit: 0, credit: 418.8 },
            ],
          },
        ],
        points: 15,
        why: 'Transposed digits are one of the most common errors in bookkeeping.',
        hint: 'The credit says 481.80, but the payment was 418.80.',
      },
      {
        id: 'balances',
        type: 'balances',
        title: 'Account balances at the end of March',
        accounts: ['1200', '1210', '1500', '2300', '4900', '6000', '6100', '6200'],
        points: 25,
        why: 'The balances are what the reports show, so they must agree with what happened.',
        hint: 'Open each account in Chart of accounts and check its ledger.',
      },
      {
        id: 'nothing-in-draft',
        type: 'all-posted',
        title: 'Nothing left in draft',
        points: 15,
        why: 'A draft never reaches the ledger: it is as if the transaction never happened.',
        hint: 'Post or delete every draft journal.',
      },
    ],
  },
  passScore: 70,
  xp: 110,
  skills: { bookkeeping: 50, accuracy: 30, 'finance-basics': 15 },
  feedback: {
    excellent: `Hi {name},

Perfect: every entry on the right side of the right account, the accrual in March where it belongs, and you spotted {senior}’s transposition error. The trial balance balances to the penny.

Daniel`,
    good: `Hi {name},

Good first week in Books; a couple of entries need fixing. See the notes.

Daniel`,
    pass: `Hi {name},

Some entries are on the wrong accounts or sides. The notes show which; reverse them and post them again.

Daniel`,
    fail: `Hi {name},

Not yet. Start with the rent: debit Rent, credit Bank, then post it.

Daniel`,
  },
}
