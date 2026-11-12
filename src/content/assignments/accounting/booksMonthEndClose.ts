import type { AssignmentInput } from '../../schemas'
import { accountBalance, profitAndLoss } from '../../../tools/books/ledger'
import { createPayRun, postPayRun } from '../../../tools/books/payroll'
import { apply, approved, journal, line, marchBooks } from '../../../tools/books/scenario'
import type { BooksState } from '../../../tools/books/schema'

/**
 * Accounting (Senior Accountant): close March in Books and report to the
 * board. Post the month-end adjustments (depreciation, a prepayment and two
 * accruals), then write the management accounts with the right figures.
 * Teaches: the accruals principle, why adjustments change profit, and
 * explaining results to non-accountants.
 */
function payroll(state: BooksState): BooksState {
  const run = createPayRun(state, '2026-03', '2026-03-27')
  return postPayRun(run.state, run.id).state
}

const start = apply(marchBooks(), [
  journal(
    '2026-03-01',
    'Professional indemnity insurance, 1 March 2026 to 28 February 2027',
    [line('6700', 3600, 0), line('1200', 0, 3600)],
  ),
  journal('2026-03-02', 'March office rent', [
    line('6000', 2400, 0),
    line('1200', 0, 2400),
  ]),
  journal('2026-03-05', 'Software subscriptions for March', [
    line('6200', 418.8, 0),
    line('1200', 0, 418.8),
  ]),
  approved('purchases', 's1', {
    number: 'MOS-2291',
    date: '2026-03-12',
    lines: [
      {
        description: 'Paper and toner',
        quantity: 1,
        unitPrice: 185,
        account: '6400',
        vat: true,
      },
    ],
  }),
  approved('purchases', 's2', {
    number: 'CL-89017',
    date: '2026-03-20',
    lines: [
      {
        description: 'Broadband and phones',
        quantity: 1,
        unitPrice: 240,
        account: '6100',
        vat: true,
      },
    ],
  }),
  payroll,
  approved('sales', 'c3', {
    number: 'INV-1040',
    date: '2026-03-31',
    lines: [
      {
        description: 'Fleet cost review',
        quantity: 1,
        unitPrice: 14500,
        account: '4000',
        vat: true,
      },
    ],
  }),
  approved('sales', 'c1', {
    number: 'INV-1041',
    date: '2026-03-31',
    lines: [
      {
        description: 'Advisory days',
        quantity: 4,
        unitPrice: 650,
        account: '4000',
        vat: true,
      },
    ],
  }),
  approved('sales', 'c2', {
    number: 'INV-1042',
    date: '2026-03-31',
    lines: [
      {
        description: 'Workshops',
        quantity: 2,
        unitPrice: 900,
        account: '4100',
        vat: true,
      },
      { description: 'Travel', quantity: 1, unitPrice: 180, account: '4000', vat: true },
    ],
  }),
])

const adjustments = [
  {
    description: 'March depreciation (£32,400 of equipment over 5 years)',
    lines: [line('6600', 540, 0), line('1510', 0, 540)],
  },
  {
    description: 'the insurance prepaid for April to February (11 months)',
    lines: [line('1300', 3300, 0), line('6700', 0, 3300)],
  },
  {
    description: 'the designer’s March work, not yet invoiced',
    lines: [line('5000', 950, 0), line('2300', 0, 950)],
  },
  {
    description: 'March loan interest',
    lines: [line('6800', 125, 0), line('2400', 0, 125)],
  },
]

const solution = apply(
  start,
  adjustments.map((a) => journal('2026-03-31', a.description, a.lines)),
)
const pl = profitAndLoss(solution)

const spec = (lines: ReturnType<typeof line>[]) =>
  lines.map(({ account, debit, credit }) => ({ account, debit, credit }))

export const booksMonthEndClose: AssignmentInput = {
  id: 'books-month-end-close',
  version: 1,
  careerId: 'accounting',
  levelId: 'senior-accountant',
  order: 9,
  kind: 'tool',
  title: 'Close March and report to the board',
  summary:
    'Post the month-end adjustments in Books, then write the management accounts for the board.',
  estimatedMinutes: 60,
  from: 'manager',
  briefing: {
    subject: 'March close and the board report',
    body: `Hi {name},

As Senior Accountant, you now close the month and write the management accounts for {director}.

March’s transactions are all in **Books**. Before we report, these adjustments are needed:
1. **Depreciation**: our office equipment cost £32,400 and is written off evenly over 5 years. Post March’s charge.
2. **Prepayment**: on 1 March we paid **£3,600** for a year’s insurance (March to February), and it all went to professional fees. Only March’s share is a March cost.
3. **Accrual**: our freelance designer did **£950** of work in March but won’t invoice until April (subcontractor costs).
4. **Accrual**: the bank charges **£125** of loan interest for March, added to the loan.

Then check the profit and loss and balance sheet, and write the **March management accounts** in Word Craft: a summary, the key figures (income, net profit and cash in the bank), what the adjustments did, and your recommendations. Reply to this email with the books and the report attached.

Daniel`,
  },
  whyItMatters:
    'Without month-end adjustments, profit is wrong: costs land in the month they are paid instead of the month they belong to. Senior accountants make those judgements and then explain the results in plain language, because the people who decide on the numbers are rarely accountants.',
  objectives: [
    'Post depreciation, prepayments and accruals',
    'Explain how adjustments change profit',
    'Report results clearly to non-accountants',
  ],
  steps: [
    {
      id: 'depreciation',
      title: 'Depreciation',
      instructions:
        'In **Journals**, post March’s depreciation: £32,400 ÷ 5 years ÷ 12 months. Debit 6600 Depreciation, credit 1510 Accumulated depreciation. Date 31 March.',
    },
    {
      id: 'prepayment',
      title: 'Prepayment',
      instructions:
        'Eleven of the twelve months of insurance belong to later months. Move them out of this month’s costs: debit 1300 Prepayments, credit 6700 Professional fees.',
    },
    {
      id: 'accruals',
      title: 'Accruals',
      instructions:
        'The designer: debit 5000 Subcontractor costs, credit 2300 Accruals. Loan interest: debit 6800 Loan interest, credit 2400 Bank loan.',
    },
    {
      id: 'review',
      title: 'Review the results',
      instructions:
        'Open **Reports**. Check the trial balance, then note income, net profit and the bank balance from the profit and loss and the balance sheet.',
    },
    {
      id: 'report',
      title: 'Write the management accounts',
      instructions:
        'In **Word Craft**, open **March management accounts**. Keep the headings, give the key figures, explain in plain words what depreciation, the prepayment and the accruals did to profit, and recommend what to watch. 150 to 700 words.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions: 'Reply to {manager}’s email with the books and the report attached.',
    },
  ],
  tool: {
    id: 'books',
    title: 'Cobalt Ridge books: March close',
    start,
    solution,
    checks: [
      {
        id: 'adjustments',
        type: 'journals',
        journals: adjustments.map((a) => ({
          description: a.description,
          lines: spec(a.lines),
        })),
        title: 'Month-end adjustments posted',
        points: 40,
        why: 'Each adjustment puts a cost or a benefit into the month it belongs to.',
        hint: 'Depreciation £540; prepayment £3,300; designer accrual £950; loan interest £125.',
      },
      {
        id: 'balances',
        type: 'balances',
        accounts: ['1300', '1510', '2300', '2400', '6700'],
        title: 'Balance sheet after the close',
        points: 15,
        why: 'The adjustments must leave the balance sheet showing what really exists and is owed.',
        hint: 'Check prepayments, accumulated depreciation, accruals and the loan in Chart of accounts.',
      },
      {
        id: 'nothing-in-draft',
        type: 'all-posted',
        title: 'Nothing left in draft',
        points: 5,
        why: 'A draft adjustment is not in the accounts.',
        hint: 'Post or delete every draft journal.',
      },
    ],
  },
  deliverables: [
    {
      kind: 'doc',
      title: 'March management accounts',
      template: 'report',
      checks: [
        {
          id: 'report-sections',
          type: 'sections',
          title: 'Report structure',
          sections: [['Executive summary', 'Summary'], ['Findings'], ['Recommendation']],
          points: 5,
          why: 'The board reads the summary first and the recommendations last.',
          hint: 'Keep the headings: Executive summary, Findings, Recommendations.',
        },
        {
          id: 'report-figures',
          type: 'figures',
          title: 'The key figures',
          figures: [
            { label: 'total income for March', value: pl.totalIncome },
            { label: 'net profit after the adjustments', value: pl.netProfit },
            {
              label: 'cash in the bank at 31 March',
              value: accountBalance(solution, '1200'),
            },
          ],
          points: 20,
          why: 'Every figure in the report must agree with the books.',
          hint: 'Take them from Reports after posting the adjustments: Profit and loss for income and profit, Balance sheet for the bank.',
        },
        {
          id: 'report-adjustments',
          type: 'mentions',
          title: 'The adjustments explained',
          terms: [['depreciation'], ['prepay', 'prepaid'], ['accru']],
          points: 10,
          why: 'The board needs to know why profit differs from the cash that came in and went out.',
          hint: 'Explain depreciation, the prepayment and the accruals in a sentence each.',
        },
        {
          id: 'report-length',
          type: 'length',
          min: 150,
          max: 700,
          title: 'Length',
          points: 5,
          why: 'Complete, but readable before the meeting.',
          hint: 'Aim for 150 to 700 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 220,
  skills: {
    'financial-reporting': 45,
    bookkeeping: 25,
    accuracy: 20,
    'finance-basics': 15,
  },
  feedback: {
    excellent: `Hi {name},

A model close. The adjustments are right, and the report explains clearly why profit is higher than it first looked: most of that insurance belongs to the next eleven months. {director} has asked for this format every month.

Daniel`,
    good: `Hi {name},

A good close; some details in the books or the report need fixing. See the notes.

Daniel`,
    pass: `Hi {name},

Some adjustments or figures are not right yet. The notes explain which.

Daniel`,
    fail: `Hi {name},

Not yet. Post the four adjustments first, then take the figures from Reports.

Daniel`,
  },
}
