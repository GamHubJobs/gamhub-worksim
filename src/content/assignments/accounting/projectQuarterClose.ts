import type { AssignmentInput } from '../../schemas'
import { apply, approved, journal, line, marchBooks } from '../../../tools/books/scenario'

/**
 * Accounting integrated project (Senior Accountant): close the quarter.
 * Three linked stages under one brief from the finance director:
 *
 * 1. Books: post the quarter-end adjustments.
 * 2. Sheets: analyse the quarter against budget and flag what to investigate.
 * 3. Sheets and Docs: the board pack (key figures and a written report).
 *
 * Teaches: running a close from adjustments to the board, materiality
 * (what is worth investigating), and telling one consistent story.
 */
const PROJECT = 'quarter-close'

// ---------------------------------------------------------------------------
// Stage 1: quarter-end adjustments in Books
// ---------------------------------------------------------------------------

const booksStart = apply(marchBooks(), [
  journal('2026-03-02', 'March office rent', [
    line('6000', 2400, 0),
    line('1200', 0, 2400),
  ]),
  journal('2026-03-10', 'Transfer to the deposit account', [
    line('1210', 20000, 0),
    line('1200', 0, 20000),
  ]),
  approved('sales', 'c1', {
    number: 'INV-1050',
    date: '2026-03-27',
    lines: [
      {
        description: 'Advisory days',
        quantity: 6,
        unitPrice: 650,
        account: '4000',
        vat: true,
      },
    ],
  }),
  approved('sales', 'c2', {
    number: 'INV-1051',
    date: '2026-03-30',
    lines: [
      {
        description: 'Workshops',
        quantity: 3,
        unitPrice: 900,
        account: '4100',
        vat: true,
      },
    ],
  }),
  approved('purchases', 's2', {
    number: 'CL-89102',
    date: '2026-03-18',
    lines: [
      {
        description: 'Phones and broadband',
        quantity: 1,
        unitPrice: 260,
        account: '6100',
        vat: true,
      },
    ],
  }),
])

const adjustments = [
  {
    description: 'Q1 share of the annual audit fee (£5,400 a year)',
    lines: [line('6700', 1350, 0), line('2300', 0, 1350)],
  },
  {
    description: 'Interest earned on the deposit account in Q1',
    lines: [line('1210', 145, 0), line('4900', 0, 145)],
  },
  {
    description: 'March electricity, not yet billed',
    lines: [line('6100', 320, 0), line('2300', 0, 320)],
  },
]

const booksSolution = apply(
  booksStart,
  adjustments.map((a) => journal('2026-03-31', a.description, a.lines)),
)

const spec = (lines: ReturnType<typeof line>[]) =>
  lines.map(({ account, debit, credit }) => ({ account, debit, credit }))

const feedback = (excellent: string) => ({
  excellent: `Hi {name},

${excellent}

Daniel`,
  good: `Hi {name},

Good work; a few details need fixing before the board sees it. See the notes.

Daniel`,
  pass: `Hi {name},

The basics are there, but some figures are not right yet. The notes explain which.

Daniel`,
  fail: `Hi {name},

Not yet. Have a look at the notes and send it back when it’s ready.

Daniel`,
})

export const quarterCloseAdjustments: AssignmentInput = {
  id: 'quarter-close-adjustments',
  version: 1,
  careerId: 'accounting',
  levelId: 'senior-accountant',
  order: 10,
  projectId: PROJECT,
  stage: 1,
  kind: 'tool',
  title: 'Quarter close, stage 1: post the quarter-end adjustments',
  summary: 'Post the three quarter-end adjustments in Books so Q1 profit is right.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Project: closing the quarter for the board',
    body: `Hi {name},

{director} has asked us for the **Q1 board pack**, and I’d like you to run the whole close as a project. There are three stages; each one opens when the one before is done:

1. **Adjustments** in Books (this email).
2. **Variance analysis**: Q1 against budget, in Sheets.
3. **The board pack**: key figures and a short report.

Before we analyse anything, Q1 must be complete in **Books**. Post these at 31 March:
1. **Audit fee**: our audit costs **£5,400 a year** and is billed after the year end. Accrue **a quarter of it** (professional fees, accruals).
2. **Deposit interest**: the deposit account earned **£145** of interest in Q1, not yet recorded (deposit account, interest received).
3. **Electricity**: March’s electricity, about **£320**, will only be billed in April (utilities, accruals).

Then click **Submit to {manager}**.

Daniel`,
  },
  whyItMatters:
    'Quarter-end adjustments make the quarter’s profit honest: costs that belong to the quarter are counted even if the bill has not arrived, and income that was earned is recognised. Every figure the board sees later depends on getting this step right.',
  objectives: [
    'Accrue costs that belong to the quarter but are billed later',
    'Recognise income earned but not yet recorded',
    'Leave the books complete before analysing them',
  ],
  steps: [
    {
      id: 'audit',
      title: 'Accrue the audit fee',
      instructions:
        'In **Journals**, add a journal dated 31 March: debit **6700 Professional fees** and credit **2300 Accruals** with a quarter of £5,400.',
    },
    {
      id: 'interest',
      title: 'Record the deposit interest',
      instructions:
        'Debit **1210 Bank deposit account** and credit **4900 Interest received** with £145.',
    },
    {
      id: 'electricity',
      title: 'Accrue the electricity',
      instructions: 'Debit **6100 Utilities** and credit **2300 Accruals** with £320.',
    },
    {
      id: 'submit',
      title: 'Check and hand in',
      instructions:
        'Check the trial balance in **Reports**, make sure nothing is left in draft, then click **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'books',
    title: 'Cobalt Ridge books: Q1 close',
    start: booksStart,
    solution: booksSolution,
    checks: [
      {
        id: 'adjustments',
        type: 'journals',
        journals: adjustments.map((a) => ({
          description: a.description,
          lines: spec(a.lines),
        })),
        title: 'Quarter-end adjustments posted',
        points: 50,
        why: 'Each adjustment puts a cost or income into the quarter it belongs to.',
        hint: 'Audit fee £1,350 (a quarter of £5,400); deposit interest £145; electricity £320.',
      },
      {
        id: 'balances',
        type: 'balances',
        accounts: ['1210', '2300', '4900', '6100', '6700'],
        title: 'Balances after the adjustments',
        points: 30,
        why: 'The balance sheet must show what is owed and what was earned at the quarter end.',
        hint: 'Compare accruals, the deposit account and interest received with what you expect.',
      },
      {
        id: 'nothing-in-draft',
        type: 'all-posted',
        title: 'Nothing left in draft',
        points: 20,
        why: 'A draft journal is not in the accounts, so the quarter would still be wrong.',
        hint: 'Post or delete every draft journal.',
      },
    ],
  },
  passScore: 70,
  xp: 150,
  skills: { bookkeeping: 35, 'financial-reporting': 20, accuracy: 20 },
  feedback: feedback(
    'The books are complete for Q1: the audit fee, the interest and the electricity are all in the right quarter. Stage 2 is in your inbox.',
  ),
}

// ---------------------------------------------------------------------------
// Stage 2: variance analysis in Sheets
// ---------------------------------------------------------------------------

const lines: Array<[string, number, number]> = [
  ['Consulting fees', 72000, 76850],
  ['Training income', 9000, 7200],
  ['Subcontractor costs', 12000, 14950],
  ['Rent', 7200, 7200],
  ['Utilities', 2100, 2380],
  ['Software subscriptions', 1200, 1256],
  ['Travel', 1800, 1430],
  ['Professional fees', 6300, 9150],
  ['Wages and salaries', 36000, 36400],
]
const lastLine = lines.length + 1 // row 10
const header = { bold: true, fill: 'gray' } as const
const rowsOf = (make: (row: number) => Array<[string, string]>) =>
  Object.fromEntries(lines.map((_, i) => make(i + 2)).flat())

export const quarterCloseVariances: AssignmentInput = {
  id: 'quarter-close-variances',
  version: 1,
  careerId: 'accounting',
  levelId: 'senior-accountant',
  order: 11,
  projectId: PROJECT,
  stage: 2,
  title: 'Quarter close, stage 2: Q1 against budget',
  summary:
    'Compare each line of Q1 with the budget and flag the variances worth investigating.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Quarter close, stage 2: variances',
    body: `Hi {name},

Thanks for the adjustments. The Q1 actuals from the closed books are now in the workbook next to the budget.

For each line, please work out the **variance** (actual minus budget), the **variance as a percentage of budget**, and a **flag**: “Investigate” when the variance is more than **10%** either way, otherwise “OK”. Then add **total income**, **total costs** and **net profit** for budget and actual, and a chart of budget against actual.

The board doesn’t want every small difference explained, only the ones that matter.

Daniel`,
  },
  whyItMatters:
    'A variance analysis turns a page of numbers into a short list of questions. Setting a threshold (materiality) keeps attention on the differences that matter, and is how finance teams decide what to explain to the board.',
  objectives: [
    'Calculate variances and percentages against budget',
    'Use a threshold to flag material variances',
    'Summarise income, costs and profit',
  ],
  steps: [
    {
      id: 'variances',
      title: 'Variances',
      instructions: `For rows 2 to ${lastLine}: **D** \`=C2-B2\`, **E** \`=D2/B2\` (format as %), **F** \`=IF(ABS(E2)>0.1, "Investigate", "OK")\`. Fill them down.`,
      hint: 'ABS ignores the sign, so a 20% shortfall in income is flagged as well as a 20% overspend.',
    },
    {
      id: 'totals',
      title: 'Totals and profit',
      instructions:
        'Row 12 total income (`=SUM(B2:B3)`), row 13 total costs (`=SUM(B4:B10)`), row 14 net profit (`=B12-B13`), for columns B, C and D.',
    },
    {
      id: 'chart',
      title: 'Chart',
      instructions: `Select **A1:C${lastLine}** and add a chart of budget against actual.`,
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Click **Submit to {manager}**.',
    },
  ],
  workbook: {
    title: 'Q1 variance analysis',
    sheets: [
      {
        name: 'Q1',
        columnWidths: { A: 170, B: 100, C: 100, D: 100, E: 100, F: 110 },
        cells: {
          A1: { input: 'Line', format: header },
          B1: { input: 'Budget', format: { ...header, align: 'right' } },
          C1: { input: 'Actual', format: { ...header, align: 'right' } },
          D1: { input: 'Variance', format: { ...header, align: 'right' } },
          E1: { input: 'Variance %', format: { ...header, align: 'right' } },
          F1: { input: 'Flag', format: header },
          ...rowsOf((row) => {
            const [name, budget, actual] = lines[row - 2]
            return [
              [`A${row}`, name],
              [`B${row}`, String(budget)],
              [`C${row}`, String(actual)],
            ]
          }),
          A12: { input: 'Total income', format: { bold: true } },
          A13: { input: 'Total costs', format: { bold: true } },
          A14: { input: 'Net profit', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Q1: {
      ...rowsOf((row) => [
        [`D${row}`, `=C${row}-B${row}`],
        [`E${row}`, `=D${row}/B${row}`],
        [`F${row}`, `=IF(ABS(E${row})>0.1, "Investigate", "OK")`],
      ]),
      B12: '=SUM(B2:B3)',
      C12: '=SUM(C2:C3)',
      D12: '=SUM(D2:D3)',
      B13: `=SUM(B4:B${lastLine})`,
      C13: `=SUM(C4:C${lastLine})`,
      D13: `=SUM(D4:D${lastLine})`,
      B14: '=B12-B13',
      C14: '=C12-C13',
      D14: '=C14-B14',
    },
  },
  scenarios: [
    {
      description: 'A late legal invoice for Q1 arrives',
      changes: { 'Q1!C9': '9900' },
    },
  ],
  checks: [
    {
      id: 'variance',
      type: 'values',
      title: 'Variances',
      cells: [`Q1!D2:D${lastLine}`],
      requireFormula: true,
      points: 15,
      why: 'The variance is the first number anyone asks about.',
      hint: 'In D2 type =C2-B2 and fill it down.',
    },
    {
      id: 'percent',
      type: 'values',
      title: 'Variance as a percentage of budget',
      cells: [`Q1!E2:E${lastLine}`],
      requireFormula: true,
      points: 15,
      why: 'Percentages make a £300 difference on rent comparable with £3,000 on wages.',
      hint: 'In E2 type =D2/B2 and fill it down.',
    },
    {
      id: 'flags',
      type: 'values',
      title: 'Material variances flagged',
      cells: [`Q1!F2:F${lastLine}`],
      requireFormula: true,
      functions: ['IF', 'ABS'],
      points: 20,
      why: 'The flags are the short list the board will ask about.',
      hint: 'In F2 type =IF(ABS(E2)>0.1, "Investigate", "OK") and fill it down.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Income, costs and profit',
      cells: ['Q1!B12:D14'],
      requireFormula: true,
      points: 25,
      why: 'Profit against budget is the headline of the quarter.',
      hint: 'Rows 12 to 14: SUM of income, SUM of costs, then income minus costs.',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of budget and actual',
      cells: [`Q1!A1:C${lastLine}`],
      points: 15,
      why: 'The chart shows at a glance where the quarter differed from the plan.',
      hint: `Select A1:C${lastLine} and add a chart.`,
    },
    {
      id: 'unchanged',
      type: 'unchanged',
      title: 'Budget and actuals left unchanged',
      cells: [`Q1!A1:C${lastLine}`],
      points: 10,
      why: 'The figures come from the closed books and the approved budget.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 150,
  skills: { 'financial-reporting': 30, formulas: 25, accuracy: 20 },
  feedback: feedback(
    'A clear analysis: five lines to investigate, and the rest can be left alone. Professional fees stand out, mostly the audit fee you accrued. Stage 3 is in your inbox.',
  ),
}

// ---------------------------------------------------------------------------
// Stage 3: the board pack (Sheets and Docs)
// ---------------------------------------------------------------------------

const months: Array<[string, number, number]> = [
  ['January', 26100, 22900],
  ['February', 27450, 23600],
  ['March', 30500, 26266],
]
const columns = ['B', 'C', 'D']
const professionalFeesOverspend = 9150 - 6300

export const quarterCloseBoardPack: AssignmentInput = {
  id: 'quarter-close-board-pack',
  version: 1,
  careerId: 'accounting',
  levelId: 'senior-accountant',
  order: 12,
  projectId: PROJECT,
  stage: 3,
  title: 'Quarter close, stage 3: the board pack',
  summary: 'Summarise Q1 month by month and write the board report.',
  estimatedMinutes: 50,
  from: 'manager',
  briefing: {
    subject: 'Quarter close, stage 3: the board pack',
    body: `Hi {name},

Last stage. The board pack has two parts:

**1. Key figures (Sheets).** The workbook has Q1 income and costs by month. Add each month’s **net profit** and **net margin** (profit ÷ income, as a %), and the **Q1 totals** in column E. Add a chart of income and costs by month.

**2. The board report (Docs).** An executive summary, findings and recommendations. Give **Q1 income**, **Q1 net profit**, and the **professional fees overspend** from your variance analysis; explain that it is mostly the **audit** fee accrual, and say what else you flagged.

Reply to this email with the workbook and the report attached.

Daniel`,
  },
  whyItMatters:
    'The board pack is where the close pays off: a few figures the directors can trust and a short explanation of what they mean. Being able to go from journals to a board-ready message is what senior finance roles are judged on.',
  objectives: [
    'Summarise a quarter by month with profit and margin',
    'Explain the quarter’s results and variances in writing',
    'Hand in a consistent pack: the same figures everywhere',
  ],
  steps: [
    {
      id: 'figures',
      title: 'Key figures',
      instructions:
        'Row 4 net profit `=B2-B3`, row 5 net margin `=B4/B2` (format as %), for January to March. Column E: `=SUM(B2:D2)` and `=SUM(B3:D3)` for Q1 income and costs, `=E2-E3` and `=E4/E2`.',
    },
    {
      id: 'chart',
      title: 'Chart',
      instructions: 'Select **A1:D3** and add a chart of income and costs by month.',
    },
    {
      id: 'report',
      title: 'The board report',
      instructions:
        'In **Docs**, open **Q1 board report**. Keep the headings, give the three figures, explain the professional fees overspend (the audit accrual) and the other flagged lines, and recommend what to watch in Q2. 200 to 800 words.',
    },
    {
      id: 'send',
      title: 'Hand in',
      instructions:
        'Reply to {manager}’s email with the workbook and the report attached.',
    },
  ],
  workbook: {
    title: 'Q1 board pack figures',
    sheets: [
      {
        name: 'Quarter',
        columnWidths: { A: 120, B: 100, C: 100, D: 100, E: 110 },
        cells: {
          A1: { input: '', format: header },
          B1: { input: 'January', format: { ...header, align: 'right' } },
          C1: { input: 'February', format: { ...header, align: 'right' } },
          D1: { input: 'March', format: { ...header, align: 'right' } },
          E1: { input: 'Q1 total', format: { ...header, align: 'right' } },
          A2: 'Income',
          A3: 'Costs',
          A4: { input: 'Net profit', format: { bold: true } },
          A5: { input: 'Net margin', format: { bold: true } },
          ...Object.fromEntries(
            months.flatMap(([, income, costs], i) => [
              [`${columns[i]}2`, String(income)],
              [`${columns[i]}3`, String(costs)],
            ]),
          ),
        },
      },
    ],
  },
  solution: {
    Quarter: {
      ...Object.fromEntries(
        [...columns, 'E'].flatMap((c) => [
          [`${c}4`, `=${c}2-${c}3`],
          [`${c}5`, `=${c}4/${c}2`],
        ]),
      ),
      E2: '=SUM(B2:D2)',
      E3: '=SUM(B3:D3)',
    },
  },
  scenarios: [
    {
      description: 'March costs are revised',
      changes: { 'Quarter!D3': '26900' },
    },
  ],
  checks: [
    {
      id: 'profit',
      type: 'values',
      title: 'Net profit by month and for Q1',
      cells: ['Quarter!B4:E4'],
      requireFormula: true,
      points: 15,
      why: 'Profit is the first line the board reads.',
      hint: 'In B4 type =B2-B3 and fill it across to E4.',
    },
    {
      id: 'margin',
      type: 'values',
      title: 'Net margin',
      cells: ['Quarter!B5:E5'],
      requireFormula: true,
      points: 10,
      why: 'Margin shows whether profit kept pace with income.',
      hint: 'In B5 type =B4/B2 and fill it across to E5.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Q1 totals',
      cells: ['Quarter!E2:E3'],
      requireFormula: true,
      points: 10,
      why: 'The quarter totals are the figures in the report.',
      hint: 'E2 =SUM(B2:D2), E3 =SUM(B3:D3).',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of income and costs',
      cells: ['Quarter!A1:D3'],
      points: 5,
      why: 'The trend over the three months is easiest to see in a chart.',
      hint: 'Select A1:D3 and add a chart.',
    },
    {
      id: 'unchanged',
      type: 'unchanged',
      title: 'Monthly figures left unchanged',
      cells: ['Quarter!B2:D3'],
      points: 5,
      why: 'The figures come from the closed books.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Q1 board report',
      template: 'report',
      checks: [
        {
          id: 'report-sections',
          type: 'sections',
          title: 'Report structure',
          sections: [
            ['Executive summary', 'Summary'],
            ['Findings'],
            ['Recommendations', 'Recommendation'],
          ],
          points: 10,
          why: 'Directors read the summary first and the recommendations last.',
          hint: 'Keep the headings: Executive summary, Findings, Recommendations.',
        },
        {
          id: 'report-figures',
          type: 'figures',
          title: 'The key figures',
          figures: [
            { label: 'Q1 income', cell: 'Quarter!E2' },
            { label: 'Q1 net profit', cell: 'Quarter!E4' },
            { label: 'professional fees overspend', value: professionalFeesOverspend },
          ],
          points: 25,
          why: 'Every figure must agree with the workbook and the variance analysis.',
          hint: 'Q1 income is E2, net profit E4; the professional fees variance is in stage 2 (actual minus budget).',
        },
        {
          id: 'report-explained',
          type: 'mentions',
          title: 'The overspend explained',
          terms: [['audit'], ['professional fees']],
          points: 10,
          why: 'The board needs to know the overspend is mostly an accrual, not a surprise bill.',
          hint: 'Explain that the audit fee accrual is in professional fees.',
        },
        {
          id: 'report-length',
          type: 'length',
          min: 200,
          max: 800,
          title: 'Length',
          points: 10,
          why: 'Complete, but readable before the meeting.',
          hint: 'Aim for 200 to 800 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 200,
  skills: { 'financial-reporting': 45, formulas: 15, accuracy: 20 },
  feedback: feedback(
    'The board pack is ready: the figures agree from the journals to the report, and the overspend is explained before anyone has to ask. That is a complete quarter close. Well done.',
  ),
}
