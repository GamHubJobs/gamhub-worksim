import type { AssignmentInput } from '../../schemas'

/**
 * Accounting 4 (Accountant): the month-end close. Turn account balances into
 * a trial balance, prepare the income statement and report the month's
 * results to management. Teaches: debit/credit presentation with IF, SUMIF
 * by account type, margins, and writing up results.
 */
const balances: Array<[string, string, string]> = [
  // account, type, balance (debit positive, credit negative)
  ['Bank', 'Asset', '14050'],
  ['Accounts receivable', 'Asset', '3200'],
  ['Equipment', 'Asset', '63000'],
  ['Accumulated depreciation', 'Asset', '-21500'],
  ['Accounts payable', 'Liability', '-2900'],
  ['Share capital', 'Equity', '-40000'],
  ['Retained earnings', 'Equity', '-9385'],
  ['Consulting revenue', 'Income', '-21600'],
  ['Salaries', 'Expense', '9800'],
  ['Rent expense', 'Expense', '2500'],
  ['IT expense', 'Expense', '650'],
  ['Travel expense', 'Expense', '380'],
  ['Office supplies', 'Expense', '240'],
  ['Depreciation expense', 'Expense', '1530'],
  ['Bank charges', 'Expense', '35'],
]

const header = { bold: true, fill: 'gray' } as const
const last = balances.length + 1 // 16
const total = last + 2 // 18

export const monthEnd: AssignmentInput = {
  id: 'month-end-close',
  version: 1,
  careerId: 'accounting',
  levelId: 'accountant',
  order: 8,
  title: 'Month-end: trial balance and results',
  summary:
    'Prepare the trial balance and income statement, and report October’s results.',
  estimatedMinutes: 50,
  from: 'manager',
  briefing: {
    subject: 'October close: trial balance, income statement and a short report',
    body: `Hi {name},

As an Accountant you now own a piece of the month-end close. The **Balances** sheet has every account’s balance at the end of October (debits positive, credits negative).

Please:
• set out the **trial balance**: each balance in a Debit or a Credit column, with totals (they must be equal);
• prepare the **income statement**: revenue, total expenses, net profit and the profit margin;
• write a short **management report in Word Craft** with the results: revenue, expenses, net profit, and what drove the costs.

Reply with the workbook and the report attached.

Daniel`,
  },
  whyItMatters:
    'The trial balance proves the ledger is complete and balanced before any report is produced; the income statement tells management whether the business made money. Closing the month accurately and explaining the results is the core of an accountant’s job.',
  objectives: [
    'Present balances as debits and credits with IF',
    'Prove the trial balance balances',
    'Build an income statement with SUMIF by account type',
    'Report results clearly to non-accountants',
  ],
  steps: [
    {
      id: 'trial-balance',
      title: 'The trial balance',
      instructions: `On **Balances**: **D2** \`=IF(C2>0, C2, 0)\` (debit) and **E2** \`=IF(C2<0, -C2, 0)\` (credit), filled down to row ${last}. Totals in row ${total}: \`=SUM(D2:D${last})\` and \`=SUM(E2:E${last})\`, and in **F${total}**: \`=IF(D${total}=E${total}, "Balanced", "Out of balance")\`.`,
    },
    {
      id: 'income',
      title: 'The income statement',
      instructions: `On **Income** (the income statement):
- **B2** revenue: \`=-SUMIF(Balances!B2:B${last}, "Income", Balances!C2:C${last})\` (income balances are credits, so they are negative: the minus sign turns them positive)
- **B3** expenses: \`=SUMIF(Balances!B2:B${last}, "Expense", Balances!C2:C${last})\`
- **B4** net profit: \`=B2-B3\`
- **B5** profit margin: \`=B4/B2\`, formatted as %`,
    },
    {
      id: 'report',
      title: 'Report the results',
      instructions: `In **Word Craft**, open **October results** and write a short report (150 to 600 words) with an executive summary, the findings and recommendations. Give revenue, total expenses and net profit, and say what the biggest cost was. Then reply to the email with both files attached.`,
      hint: 'Lead with the headline: did we make a profit, and how big was it compared with revenue?',
    },
  ],
  workbook: {
    title: 'October close',
    sheets: [
      {
        name: 'Balances',
        columnWidths: { A: 190, B: 90, C: 110, D: 110, E: 110, F: 130 },
        cells: {
          A1: { input: 'Account', format: header },
          B1: { input: 'Type', format: header },
          C1: { input: 'Balance', format: { ...header, align: 'right' } },
          D1: { input: 'Debit', format: { ...header, align: 'right' } },
          E1: { input: 'Credit', format: { ...header, align: 'right' } },
          ...Object.fromEntries(
            balances.flatMap(([account, type, balance], i) => [
              [`A${i + 2}`, account],
              [`B${i + 2}`, type],
              [`C${i + 2}`, balance],
            ]),
          ),
          [`A${total}`]: { input: 'Total', format: { bold: true } },
        },
      },
      {
        name: 'Income',
        columnWidths: { A: 220, B: 120 },
        cells: {
          A1: { input: 'October income statement', format: { bold: true } },
          A2: 'Revenue',
          A3: 'Total expenses',
          A4: { input: 'Net profit', format: { bold: true } },
          A5: 'Profit margin',
        },
      },
    ],
  },
  solution: {
    Balances: {
      ...Object.fromEntries(
        balances.flatMap((_, i) => {
          const r = i + 2
          return [
            [`D${r}`, `=IF(C${r}>0, C${r}, 0)`],
            [`E${r}`, `=IF(C${r}<0, -C${r}, 0)`],
          ]
        }),
      ),
      [`D${total}`]: `=SUM(D2:D${last})`,
      [`E${total}`]: `=SUM(E2:E${last})`,
      [`F${total}`]: `=IF(D${total}=E${total}, "Balanced", "Out of balance")`,
    },
    Income: {
      B2: `=-SUMIF(Balances!B2:B${last}, "Income", Balances!C2:C${last})`,
      B3: `=SUMIF(Balances!B2:B${last}, "Expense", Balances!C2:C${last})`,
      B4: '=B2-B3',
      B5: '=B4/B2',
    },
  },
  scenarios: [
    {
      description: 'A late invoice adds revenue and a receivable',
      changes: { 'Balances!C3': '5200', 'Balances!C9': '-23600' },
    },
  ],
  checks: [
    {
      id: 'trial-balance',
      type: 'values',
      title: 'Debits and credits',
      cells: [`Balances!D2:E${last}`],
      requireFormula: true,
      functions: ['IF'],
      points: 20,
      why: 'The trial balance shows every balance on the side where it belongs.',
      hint: 'D2 =IF(C2>0, C2, 0), E2 =IF(C2<0, -C2, 0), filled down.',
    },
    {
      id: 'tb-totals',
      type: 'values',
      title: 'The trial balance balances',
      cells: [`Balances!D${total}:F${total}`],
      requireFormula: true,
      points: 15,
      why: 'Equal totals prove the ledger is complete before anything is reported.',
      hint: `D${total} =SUM(D2:D${last}), E${total} =SUM(E2:E${last}), F${total} =IF(D${total}=E${total}, "Balanced", "Out of balance").`,
    },
    {
      id: 'income-statement',
      type: 'values',
      title: 'Income statement',
      cells: ['Income!B2:B5'],
      requireFormula: true,
      points: 25,
      why: 'Revenue, expenses and profit are the figures management looks at first.',
      hint: 'Use SUMIF on the Type column: "Income" for revenue (with a minus sign) and "Expense" for expenses.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Balances left unchanged',
      cells: [`Balances!A1:C${last}`],
      points: 5,
      why: 'Balances come from the ledger; the close never edits them by hand.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'October results',
      template: 'report',
      checks: [
        {
          id: 'results-sections',
          type: 'sections',
          title: 'Report structure',
          sections: [
            ['Executive summary', 'Summary'],
            ['Findings', 'Results'],
            ['Recommendation'],
          ],
          points: 10,
          why: 'Management expects the headline first and the detail after.',
          hint: 'Keep the template’s headings: Executive summary, Findings, Recommendations.',
        },
        {
          id: 'results-figures',
          type: 'figures',
          title: 'Results in the report',
          figures: [
            { label: 'revenue', cell: 'Income!B2' },
            { label: 'total expenses', cell: 'Income!B3' },
            { label: 'net profit', cell: 'Income!B4' },
          ],
          points: 20,
          why: 'The report must give exactly the figures in the accounts.',
          hint: 'Quote B2, B3 and B4 from the income statement.',
        },
        {
          id: 'results-driver',
          type: 'mentions',
          title: 'Biggest cost named',
          terms: [['Salaries', 'salary', 'staff costs']],
          points: 5,
          why: 'Managers want to know what drives the costs, not just the total.',
          hint: 'Which expense account has the largest balance?',
        },
        {
          id: 'results-length',
          type: 'length',
          min: 150,
          max: 600,
          title: 'Length',
          points: 5,
          why: 'Short enough to read before the meeting.',
          hint: 'Aim for 150 to 600 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 200,
  skills: { 'financial-reporting': 45, bookkeeping: 20, formulas: 20, accuracy: 20 },
  feedback: {
    excellent: `Hi {name},

A clean close: the trial balance balances, the statement is right, and the report says exactly what management needs. Thank you.

Daniel`,
    good: `Hi {name},

Good close. A few points to tidy up; see the notes.

Daniel`,
    pass: `Hi {name},

The close needs some corrections before it goes to the CFO. Work through the notes.

Daniel`,
    fail: `Hi {name},

Not ready yet. Start with the trial balance: it has to balance before anything else.

Daniel`,
  },
}
