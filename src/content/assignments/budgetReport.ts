import type { AssignmentInput } from '../schemas'

/**
 * Assignment 4 (Junior Finance Assistant): compare October's spending with
 * the budget. Teaches: SUMIF across sheets, absolute references ($) so a
 * formula can be filled down, variance, percentages and percent format.
 */
const spending: Array<[string, string, string, string]> = [
  ['03 Oct', 'Sales', 'Travel', '412.50'],
  ['04 Oct', 'Finance', 'Software', '89.00'],
  ['06 Oct', 'HR', 'Training', '650.00'],
  ['07 Oct', 'Sales', 'Catering', '148.20'],
  ['09 Oct', 'Marketing', 'Marketing', '1250.00'],
  ['10 Oct', 'Finance', 'Office supplies', '64.35'],
  ['13 Oct', 'Sales', 'Travel', '688.00'],
  ['14 Oct', 'IT', 'Software', '420.00'],
  ['16 Oct', 'HR', 'Catering', '96.40'],
  ['17 Oct', 'Marketing', 'Marketing', '880.00'],
  ['20 Oct', 'Finance', 'Training', '325.00'],
  ['21 Oct', 'Sales', 'Travel', '245.75'],
  ['23 Oct', 'Admin', 'Office supplies', '118.90'],
  ['24 Oct', 'IT', 'Software', '215.00'],
  ['27 Oct', 'Marketing', 'Catering', '310.00'],
  ['29 Oct', 'Sales', 'Travel', '520.00'],
]

const budget: Array<[string, string]> = [
  ['Travel', '1800'],
  ['Training', '1200'],
  ['Software', '600'],
  ['Office supplies', '250'],
  ['Catering', '500'],
  ['Marketing', '2500'],
]

const header = { bold: true, fill: 'gray' } as const

const rows = (count: number, make: (row: number) => Array<[string, string]>) =>
  Object.fromEntries(Array.from({ length: count }, (_, i) => make(i + 2)).flat())

const last = budget.length + 1 // row 7

export const budgetReport: AssignmentInput = {
  id: 'budget-report',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'junior',
  order: 4,
  title: 'Budget vs actual report',
  summary: 'Compare October’s spending with the budget and flag what is over.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Your first report as Junior Finance Assistant',
    body: `Hi {name},

Now that you’re a Junior Finance Assistant, you’ll start producing reports that go to the department heads. The first one is the monthly **budget vs actual** report.

The workbook has two sheets: **Spending** (every purchase in October, with its category) and **Budget** (what each category was allowed to spend). On the Budget sheet, please work out:
• how much each category actually spent,
• how much budget is left (the variance), and what percentage was used,
• whether each category is “Over budget” or “Within budget”,
• the totals for the whole month.

Department heads read this report quickly, so make the percentages look like percentages.

This one goes to the directors, so check it carefully.

Priya`,
  },
  whyItMatters:
    'Comparing actual spending with the budget is how every organisation keeps control of its money. Managers use this report to spot problems early, before a small overspend becomes a large one. SUMIF, which adds up only the rows that match a condition, is the workhorse behind it.',
  objectives: [
    'Add up values that match a condition with SUMIF',
    'Use absolute references ($A$2) so a formula can be filled down',
    'Calculate a variance and a percentage of budget used',
    'Flag exceptions with IF and present percentages clearly',
  ],
  steps: [
    {
      id: 'explore',
      title: 'Look at both sheets',
      instructions: `**Spending** lists every purchase: date, department, **Category** (column C) and **Amount** (column D).

**Budget** lists each category with its budget. You will fill in columns C to F.`,
    },
    {
      id: 'actuals',
      title: 'Add up the actual spending per category',
      instructions: `In **Budget!C2** type:

\`=SUMIF(Spending!$C$2:$C$17, A2, Spending!$D$2:$D$17)\`

This adds up the amounts in Spending column D, but only on rows where the category in column C matches A2 (“Travel”).

The **$** signs lock the ranges, so they stay the same when you fill the formula down to **C${last}**. A2 has no $ signs, so it moves down to A3, A4…`,
      hint: 'Without the $ signs, filling down shifts the ranges too (C3:C18, C4:C19…) and rows at the top are silently left out.',
    },
    {
      id: 'variance',
      title: 'Variance and percentage used',
      instructions: `In **D2** work out what is left: \`=B2-C2\`. A negative number means the category is over budget.

In **E2** work out the share of the budget used: \`=C2/B2\`.

Fill both down to row ${last}.`,
    },
    {
      id: 'status',
      title: 'Flag overspending',
      instructions: `In **F2** type \`=IF(C2>B2, "Over budget", "Within budget")\` and fill it down.`,
    },
    {
      id: 'totals',
      title: 'Totals for the month',
      instructions: `In row **9**: \`=SUM(B2:B${last})\` in **B9**, \`=SUM(C2:C${last})\` in **C9**, \`=B9-C9\` in **D9** and \`=C9/B9\` in **E9**.`,
    },
    {
      id: 'format',
      title: 'Show percentages as percentages',
      instructions: `Select **E2:E${last}** and **E9**, and click the **%** button in the toolbar. 0.52 becomes 52%.`,
    },
  ],
  workbook: {
    title: 'October budget vs actual',
    sheets: [
      {
        name: 'Budget',
        columnWidths: { A: 130, B: 100, C: 100, D: 100, E: 90, F: 120 },
        cells: {
          A1: { input: 'Category', format: header },
          B1: { input: 'Budget', format: { ...header, align: 'right' } },
          C1: { input: 'Actual', format: { ...header, align: 'right' } },
          D1: { input: 'Variance', format: { ...header, align: 'right' } },
          E1: { input: '% used', format: { ...header, align: 'right' } },
          F1: { input: 'Status', format: header },
          ...rows(budget.length, (row) => {
            const [category, amount] = budget[row - 2]
            return [
              [`A${row}`, category],
              [`B${row}`, amount],
            ]
          }),
          A9: { input: 'Total', format: { bold: true } },
        },
      },
      {
        name: 'Spending',
        columnWidths: { A: 70, B: 100, C: 130, D: 100 },
        cells: {
          A1: { input: 'Date', format: header },
          B1: { input: 'Department', format: header },
          C1: { input: 'Category', format: header },
          D1: { input: 'Amount', format: { ...header, align: 'right' } },
          ...rows(spending.length, (row) => {
            const [date, department, category, amount] = spending[row - 2]
            return [
              [`A${row}`, date],
              [`B${row}`, department],
              [`C${row}`, category],
              [`D${row}`, amount],
            ]
          }),
        },
      },
    ],
  },
  solution: {
    Budget: {
      ...rows(budget.length, (row) => [
        [`C${row}`, `=SUMIF(Spending!$C$2:$C$17, A${row}, Spending!$D$2:$D$17)`],
        [`D${row}`, `=B${row}-C${row}`],
        [`E${row}`, `=C${row}/B${row}`],
        [`F${row}`, `=IF(C${row}>B${row}, "Over budget", "Within budget")`],
      ]),
      B9: `=SUM(B2:B${last})`,
      C9: `=SUM(C2:C${last})`,
      D9: '=B9-C9',
      E9: '=C9/B9',
    },
  },
  scenarios: [
    {
      description: 'A late travel claim changes the last purchase',
      changes: { 'Spending!D17': '220.00' },
    },
    {
      description: 'The first purchase was recorded under the wrong category',
      changes: { 'Spending!C2': 'Training' },
    },
    {
      description: 'The software budget is increased',
      changes: { 'Budget!B4': '800' },
    },
  ],
  checks: [
    {
      id: 'actuals',
      type: 'values',
      title: 'Actual spending per category',
      cells: [`Budget!C2:C${last}`],
      requireFormula: true,
      functions: ['SUMIF', 'SUMIFS'],
      points: 35,
      why: 'Every other number in the report depends on the actuals. If one category is added up wrongly, the whole report misleads.',
      hint: 'In C2 type =SUMIF(Spending!$C$2:$C$17, A2, Spending!$D$2:$D$17) and fill it down. Check the $ signs: without them the ranges move when you fill down.',
    },
    {
      id: 'variance',
      type: 'values',
      title: 'Variance',
      cells: [`Budget!D2:D${last}`],
      requireFormula: true,
      points: 10,
      why: 'The variance tells a department head how much they have left (or how far over they are).',
      hint: 'In D2 type =B2-C2 and fill it down.',
    },
    {
      id: 'percent-used',
      type: 'values',
      title: 'Percentage of budget used',
      cells: [`Budget!E2:E${last}`],
      requireFormula: true,
      points: 10,
      why: 'Percentages make categories of very different sizes comparable at a glance.',
      hint: 'In E2 type =C2/B2 and fill it down.',
    },
    {
      id: 'status',
      type: 'values',
      title: 'Over-budget flags',
      cells: [`Budget!F2:F${last}`],
      requireFormula: true,
      functions: ['IF'],
      points: 15,
      why: 'Directors read the flags first. They decide which department heads get a phone call.',
      hint: 'In F2 type =IF(C2>B2, "Over budget", "Within budget") and fill it down.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Totals for the month',
      cells: ['Budget!B9:E9'],
      requireFormula: true,
      points: 10,
      why: 'The totals show whether the company as a whole stayed within its budget.',
      hint: 'B9 =SUM(B2:B7), C9 =SUM(C2:C7), D9 =B9-C9, E9 =C9/B9.',
    },
    {
      id: 'percent-format',
      type: 'format',
      title: 'Percentages formatted',
      cells: [`Budget!E2:E${last}`, 'Budget!E9'],
      format: { numberFormat: 'percent' },
      points: 10,
      why: '0.9721 means nothing to a busy director; 97% does.',
      hint: 'Select E2:E7 and E9 and click the % button.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Spending and budgets left unchanged',
      cells: ['Spending!A1:D17', `Budget!A1:B${last}`],
      points: 10,
      why: 'The spending comes from the accounts system and the budgets were approved by the directors. A report must never change its source data.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 180,
  skills: {
    formulas: 30,
    'data-analysis': 35,
    presentation: 15,
    accuracy: 20,
    'finance-basics': 30,
  },
  feedback: {
    excellent: `Hi {name},

This is exactly what the directors need: correct actuals, clear flags and readable percentages. Travel, Software and Catering are over, and I’ll speak to those department heads this week.

Great first report.

Priya`,
    good: `Hi {name},

Good report, thank you. There are a couple of details to tidy up before it goes to the directors; see the notes in your task results.

Priya`,
    pass: `Hi {name},

Thanks. I had to correct a few things before sending this on. Have a look at the feedback, especially the SUMIF ranges and the $ signs.

Priya`,
    fail: `Hi {name},

I can’t send this to the directors yet. The actual spending figures need fixing first; the feedback explains how. Send it back when it’s ready.

Priya`,
  },
}
