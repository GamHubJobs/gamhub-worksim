import type { AssignmentInput } from '../../schemas'
import { createFromLine, matchCandidates, matchLine } from '../../../tools/books/banking'
import { apply, journal, line, marchBooks, paid } from '../../../tools/books/scenario'
import type { BooksState } from '../../../tools/books/schema'
import { recordPayment, removePayment } from '../../../tools/books/trade'

/**
 * Accounting (Assistant Accountant): reconcile the bank in Books. Match the
 * statement to the ledger, record what the books are missing, and find a
 * receipt that was keyed in wrongly. Teaches: what a reconciliation proves,
 * unpresented items, and correcting a payment rather than forcing a match.
 */
const before = apply(marchBooks(), [
  journal('2026-03-02', 'March office rent', [
    line('6000', 2400, 0),
    line('1200', 0, 2400),
  ]),
  paid('purchases', 'FC-2207', '2026-03-20', 4140),
  paid('sales', 'INV-1038', '2026-03-25', 9600),
  // Keyed in wrongly: the bank received 1,520.00.
  paid('sales', 'INV-1039', '2026-03-30', 1250),
  // Paid on the last day of the month: it reaches the bank in April.
  paid('purchases', 'CL-88410', '2026-03-31', 3200),
])

const statement = [
  {
    id: 'b1',
    date: '2026-03-02',
    description: 'SO LANDMARK PROPERTIES RENT',
    amount: -2400,
  },
  {
    id: 'b2',
    date: '2026-03-05',
    description: 'DD CLOUDSOFT LTD 7741920',
    amount: -59.99,
  },
  { id: 'b3', date: '2026-03-20', description: 'FP FERRIS & CO FC-2207', amount: -4140 },
  {
    id: 'b4',
    date: '2026-03-25',
    description: 'BACS NORTHGATE MOTORS INV1038',
    amount: 9600,
  },
  {
    id: 'b5',
    date: '2026-03-30',
    description: 'BACS HARBOUR FOODS PART PAYMENT',
    amount: 1520,
  },
  { id: 'b6', date: '2026-03-31', description: 'ACCOUNT FEE MARCH', amount: -18.5 },
]
const closing = Math.round(statement.reduce((s, l) => s + l.amount, 48250) * 100) / 100

const start: BooksState = {
  ...before,
  bank: {
    statementDate: '2026-03-31',
    openingBalance: 48250,
    closingBalance: closing,
    lines: statement,
    matches: {},
  },
}

function solution(): BooksState {
  let state = start
  // Correct the Harbour Foods receipt.
  const invoice = state.invoices.find((i) => i.number === 'INV-1039')!
  state = removePayment(state, 'sales', invoice.id, invoice.payments[0].id).state
  state = recordPayment(state, 'sales', invoice.id, {
    date: '2026-03-30',
    amount: 1520,
  }).state
  // Match everything that is in the books.
  for (const id of ['b1', 'b3', 'b4', 'b5']) {
    const bankLine = state.bank!.lines.find((l) => l.id === id)!
    state = matchLine(state, id, matchCandidates(state, bankLine)[0].journalId).state
  }
  // Record what is not.
  state = createFromLine(state, 'b2', '6200', 'Cloud storage subscription').state
  state = createFromLine(state, 'b6', '6500', 'Bank charges for March').state
  return state
}

export const booksBankRec: AssignmentInput = {
  id: 'books-bank-rec',
  version: 1,
  careerId: 'accounting',
  levelId: 'assistant-accountant',
  order: 6,
  kind: 'tool',
  title: 'Reconcile the bank in Books',
  summary:
    'Match March’s bank statement to the books, record what is missing, and fix a wrong receipt.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'March bank reconciliation, in Books this time',
    body: `Hi {name},

You did the bank reconciliation by hand in a spreadsheet; now do it the way we do it every month, in **Books**. The March statement has been imported into **Banking**.

Please:
• match every statement line to the entry already in Books,
• record anything on the statement that isn’t in the books yet (direct debits, bank charges),
• investigate anything that won’t match. If the books are wrong, correct the books; never change the statement.

The reconciliation is finished when every line is matched and the difference is zero. Then submit it to me.

Daniel`,
  },
  whyItMatters:
    'A bank reconciliation proves that the cash in the books really exists. It catches missing transactions, keying errors and fraud, and auditors always ask for it. Software does the matching, but the judgement (what is missing, what is wrong, what is just timing) is the accountant’s.',
  objectives: [
    'Match a bank statement to the ledger',
    'Record missing transactions to the right accounts',
    'Find and correct a keying error, and explain unpresented items',
  ],
  steps: [
    {
      id: 'match',
      title: 'Match what is in the books',
      instructions:
        'Open **Banking**. For each line, the **Match** option lists entries in Books with exactly the same amount. Choose the right one and click **Match**.',
    },
    {
      id: 'record',
      title: 'Record what is missing',
      instructions:
        'Some lines have nothing to match: switch to **Record it**, choose the account (bank charges go to 6500; a software subscription to 6200), add a description and click **Record**.',
    },
    {
      id: 'investigate',
      title: 'Investigate the one that won’t match',
      instructions:
        'The Harbour Foods receipt on 30 March has no match. Open **Sales** → INV-1039 and compare its payment with the statement. Remove the wrong payment, record the right one, then match it in Banking.',
      hint: '1,250 and 1,520: swapped digits again. The difference, 270, is divisible by 9.',
    },
    {
      id: 'timing',
      title: 'Understand what is left',
      instructions:
        'The Clearline payment made on 31 March isn’t on the statement: it reaches the bank in April. That is an **unpresented** item, not an error; it stays in the books.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions:
        'When the status says **Reconciled**, click **Submit to {manager}** in the task pane.',
    },
  ],
  tool: {
    id: 'books',
    title: 'Cobalt Ridge books: March bank',
    start,
    solution: solution(),
    checks: [
      {
        id: 'reconciled',
        type: 'reconciled',
        title: 'Bank reconciled',
        points: 30,
        why: 'Every line matched and no difference: the cash in the books is proven.',
        hint: 'Every statement line must show Matched, and the difference must be £0.00.',
      },
      {
        id: 'missing-recorded',
        type: 'journals',
        journals: [
          {
            description: 'the Cloudsoft direct debit',
            lines: [
              { account: '6200', debit: 59.99, credit: 0 },
              { account: '1200', debit: 0, credit: 59.99 },
            ],
          },
          {
            description: 'the bank charges',
            lines: [
              { account: '6500', debit: 18.5, credit: 0 },
              { account: '1200', debit: 0, credit: 18.5 },
            ],
          },
        ],
        title: 'Missing transactions recorded',
        points: 20,
        why: 'Charges and direct debits are real costs; if they aren’t recorded, profit is overstated.',
        hint: 'Record the Cloudsoft direct debit to 6200 and the account fee to 6500.',
      },
      {
        id: 'receipt-fixed',
        type: 'payments',
        side: 'sales',
        items: [{ number: 'INV-1039', paid: 1520 }],
        title: 'Harbour Foods receipt corrected',
        points: 20,
        why: 'With the wrong receipt, Harbour Foods would be chased for money it has already paid.',
        hint: 'INV-1039 should show £1,520.00 paid, not £1,250.00.',
      },
      {
        id: 'balances',
        type: 'balances',
        accounts: ['1100', '1200', '6200', '6500'],
        title: 'Bank, receivables and costs',
        points: 30,
        why: 'Forcing a reconciliation to balance with the wrong entries leaves these balances wrong.',
        hint: 'Correct the books themselves; the reconciliation then follows.',
      },
    ],
  },
  passScore: 70,
  xp: 140,
  skills: { reconciliation: 50, accuracy: 30, bookkeeping: 15 },
  feedback: {
    excellent: `Hi {name},

Reconciled to the penny, and you found the Harbour Foods keying error instead of forcing it. That’s exactly the judgement this job needs. The Clearline payment will clear in April.

Daniel`,
    good: `Hi {name},

Nearly reconciled; a couple of items to sort out. See the notes.

Daniel`,
    pass: `Hi {name},

The reconciliation isn’t finished yet. The notes show what is still open.

Daniel`,
    fail: `Hi {name},

Not yet. Start by matching the lines that have an obvious partner in Books.

Daniel`,
  },
}
