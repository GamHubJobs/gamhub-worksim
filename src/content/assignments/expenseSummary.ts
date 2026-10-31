import type { AssignmentInput } from '../schemas'

/**
 * Assignment 2: summarise this month's expense claims.
 * Teaches: IF (with the difference between > and >=), SUM, COUNT, AVERAGE,
 * MAX, MIN, COUNTIF, and that counts are not money.
 */
const claims: Array<[string, string, string, string, string]> = [
  ['CL-1041', '02 Oct', 'Maria Lopez', 'Travel', '184.20'],
  ['CL-1042', '03 Oct', 'James Carter', 'Meals', '46.75'],
  ['CL-1043', '05 Oct', 'Aisha Bello', 'Training', '395.00'],
  ['CL-1044', '06 Oct', 'Daniel Kim', 'Travel', '62.40'],
  ['CL-1045', '09 Oct', 'Maria Lopez', 'Accommodation', '289.00'],
  ['CL-1046', '10 Oct', 'Sophie Turner', 'Office supplies', '23.99'],
  ['CL-1047', '12 Oct', 'James Carter', 'Travel', '128.50'],
  ['CL-1048', '13 Oct', 'Liam O’Brien', 'Meals', '18.60'],
  ['CL-1049', '16 Oct', 'Aisha Bello', 'Travel', '251.30'],
  ['CL-1050', '18 Oct', 'Daniel Kim', 'Client entertainment', '212.00'],
  ['CL-1051', '20 Oct', 'Sophie Turner', 'Training', '150.00'],
  ['CL-1052', '23 Oct', 'Liam O’Brien', 'Travel', '97.15'],
  ['CL-1053', '25 Oct', 'Maria Lopez', 'Meals', '34.80'],
  ['CL-1054', '27 Oct', 'James Carter', 'Accommodation', '250.00'],
]

const header = { bold: true, fill: 'gray' } as const

const claimCells = Object.fromEntries(
  claims.flatMap(([id, date, name, category, amount], i) => {
    const row = i + 2
    return [
      [`A${row}`, id],
      [`B${row}`, date],
      [`C${row}`, name],
      [`D${row}`, category],
      [`E${row}`, amount],
    ]
  }),
)

const flagFormulas = Object.fromEntries(
  claims.map((_, i) => [`F${i + 2}`, `=IF(E${i + 2}>250, "Yes", "No")`]),
)

export const expenseSummary: AssignmentInput = {
  id: 'expense-summary',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'intern',
  order: 2,
  title: 'Summarise the expense claims',
  summary: 'Flag claims that need approval and summarise this month’s expenses.',
  estimatedMinutes: 20,
  from: 'manager',
  briefing: {
    subject: 'Month-end: expense claims summary',
    body: `Hi {name},

Nice work on the supplies order. Next one: it’s month-end, and before Finance pays back this month’s expense claims I need a quick summary.

In the workbook you’ll find every claim submitted in October. Please:
• mark each claim that needs my approval: our policy is that any claim **over $250** needs a manager’s sign-off,
• fill in the summary: total claimed, number of claims, average claim, largest and smallest claim,
• count how many claims need my approval.

As before, please use formulas so I can reuse the sheet next month, and keep the claims exactly as submitted.

Thanks!

Priya`,
  },
  whyItMatters:
    'Expense claims are company money paid back to staff, so every organisation has rules for approving them. Summaries like this let a manager see at a glance how much is being spent and which claims need attention. IF formulas turn a written policy into a rule the spreadsheet applies to every row, the same way, every time.',
  objectives: [
    'Apply a company rule to every row with IF',
    'Understand the difference between > (over) and >= (at least)',
    'Summarise data with SUM, COUNT, AVERAGE, MAX and MIN',
    'Count matching rows with COUNTIF',
  ],
  steps: [
    {
      id: 'explore',
      title: 'Look at the claims',
      instructions: `Each row is one expense claim: who claimed it, what it was for and the **Amount** (column E).

Column F, **Needs approval?**, is empty. The summary on the right (column I) is empty too. Those are yours.`,
    },
    {
      id: 'flag',
      title: 'Flag claims that need approval',
      instructions: `The policy: claims **over $250** need approval. In **F2** type:

\`=IF(E2>250, "Yes", "No")\`

IF has three parts: a condition (\`E2>250\`), what to show if it is true (\`"Yes"\`) and what to show if it is false (\`"No"\`). Text in a formula always goes in "double quotes".

Then fill the formula down to **F15** (select F2:F15, press Ctrl+D).`,
      hint: 'Look at claim CL-1054: it is exactly $250.00. Is that “over $250”? Use > (greater than), not >= (greater than or equal to).',
    },
    {
      id: 'total-count',
      title: 'Total and number of claims',
      instructions: `In **I3** add up all amounts: \`=SUM(E2:E15)\`.

In **I4** count the claims: \`=COUNT(E2:E15)\`. COUNT counts the cells that contain numbers.`,
    },
    {
      id: 'average-max-min',
      title: 'Average, largest and smallest claim',
      instructions: `In **I5**: \`=AVERAGE(E2:E15)\`
In **I6**: \`=MAX(E2:E15)\`
In **I7**: \`=MIN(E2:E15)\`

These functions work on the whole range at once, so the summary stays right when claims are added or corrected.`,
    },
    {
      id: 'approvals',
      title: 'Count the claims that need approval',
      instructions: `In **I8** count the “Yes” flags with COUNTIF:

\`=COUNTIF(F2:F15, "Yes")\`

COUNTIF counts the cells in a range that match a condition.`,
    },
    {
      id: 'format',
      title: 'Format the money and submit',
      instructions: `Format the money amounts in the summary as currency: **I3** and **I5:I7**.

Leave **I4** and **I8** as plain numbers: they are counts of claims, not dollars. Then check your work and submit.`,
      hint: 'Select I5, then Shift+click I7, then click $. Do I3 separately.',
    },
  ],
  workbook: {
    title: 'Expense claims – October',
    sheets: [
      {
        name: 'Claims',
        columnWidths: {
          A: 80,
          B: 70,
          C: 120,
          D: 150,
          E: 90,
          F: 120,
          G: 30,
          H: 190,
          I: 100,
        },
        cells: {
          A1: { input: 'Claim ID', format: header },
          B1: { input: 'Date', format: header },
          C1: { input: 'Employee', format: header },
          D1: { input: 'Category', format: header },
          E1: { input: 'Amount', format: { ...header, align: 'right' } },
          F1: { input: 'Needs approval?', format: header },
          ...claimCells,
          H2: { input: 'Summary', format: { bold: true } },
          H3: 'Total claimed',
          H4: 'Number of claims',
          H5: 'Average claim',
          H6: 'Largest claim',
          H7: 'Smallest claim',
          H8: 'Claims needing approval',
        },
      },
    ],
  },
  solution: {
    Claims: {
      ...flagFormulas,
      I3: '=SUM(E2:E15)',
      I4: '=COUNT(E2:E15)',
      I5: '=AVERAGE(E2:E15)',
      I6: '=MAX(E2:E15)',
      I7: '=MIN(E2:E15)',
      I8: '=COUNTIF(F2:F15, "Yes")',
    },
  },
  scenarios: [
    {
      description: 'A claim of exactly $250 is corrected to $250.01',
      changes: { 'Claims!E15': '250.01' },
    },
    {
      description: 'Two claims are corrected',
      changes: { 'Claims!E3': '1200', 'Claims!E7': '9.50' },
    },
  ],
  checks: [
    {
      id: 'approval-flags',
      type: 'values',
      title: 'Approval flags',
      cells: ['Claims!F2:F15'],
      requireFormula: true,
      functions: ['IF'],
      points: 30,
      why: 'A policy is only useful if it is applied the same way to every claim. One wrong flag means money paid out without approval, or a colleague waiting for no reason.',
      hint: 'In F2 type =IF(E2>250, "Yes", "No") and fill it down to F15. “Over $250” means > 250, so exactly $250.00 is “No”.',
    },
    {
      id: 'total',
      type: 'values',
      title: 'Total claimed',
      cells: ['Claims!I3'],
      requireFormula: true,
      functions: ['SUM'],
      points: 10,
      why: 'The total is what Finance will pay out this month.',
      hint: 'In I3 type =SUM(E2:E15).',
    },
    {
      id: 'count',
      type: 'values',
      title: 'Number of claims',
      cells: ['Claims!I4'],
      requireFormula: true,
      functions: ['COUNT', 'COUNTA'],
      points: 10,
      why: 'Counting with a formula avoids miscounts and updates when claims are added.',
      hint: 'In I4 type =COUNT(E2:E15).',
    },
    {
      id: 'average',
      type: 'values',
      title: 'Average claim',
      cells: ['Claims!I5'],
      requireFormula: true,
      functions: ['AVERAGE'],
      points: 10,
      why: 'The average shows what a typical claim costs, useful for budgets.',
      hint: 'In I5 type =AVERAGE(E2:E15).',
    },
    {
      id: 'largest',
      type: 'values',
      title: 'Largest claim',
      cells: ['Claims!I6'],
      requireFormula: true,
      functions: ['MAX'],
      points: 10,
      why: 'Managers look at the largest claims first.',
      hint: 'In I6 type =MAX(E2:E15).',
    },
    {
      id: 'smallest',
      type: 'values',
      title: 'Smallest claim',
      cells: ['Claims!I7'],
      requireFormula: true,
      functions: ['MIN'],
      points: 10,
      why: 'The smallest claim helps spot mistakes such as a missing digit.',
      hint: 'In I7 type =MIN(E2:E15).',
    },
    {
      id: 'approval-count',
      type: 'values',
      title: 'Claims needing approval',
      cells: ['Claims!I8'],
      requireFormula: true,
      functions: ['COUNTIF'],
      points: 10,
      why: 'Priya needs to know how many claims are waiting for her.',
      hint: 'In I8 type =COUNTIF(F2:F15, "Yes").',
    },
    {
      id: 'currency',
      type: 'format',
      title: 'Money amounts formatted as currency',
      cells: ['Claims!I3', 'Claims!I5:I7'],
      format: { numberFormat: 'currency' },
      points: 10,
      why: 'Money should look like money. Counts (I4 and I8) should not: “$14.00 claims” would be confusing.',
      hint: 'Select I3 and click $, then select I5:I7 and click $.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Claims left as submitted',
      cells: ['Claims!A1:E15'],
      points: 10,
      why: 'Expense claims are financial records. Changing them, even by accident, can cause real problems in an audit.',
      hint: 'Use Undo or Version history to get the original claims back.',
    },
  ],
  passScore: 70,
  xp: 120,
  skills: {
    formulas: 25,
    'data-analysis': 35,
    presentation: 10,
    accuracy: 15,
    'finance-basics': 15,
  },
  feedback: {
    excellent: `Hi {name},

Perfect, thank you. The flags are exactly right (well spotted that $250.00 doesn’t need my approval) and the summary is spot on. I’ll sign off the flagged claims this afternoon.

Priya`,
    good: `Hi {name},

Thanks, this is good. A few details need fixing; have a look at the notes in your task results when you get a moment.

Priya`,
    pass: `Hi {name},

Thanks. I can work with this, but some numbers needed correcting before I could use them. Please look at the feedback and send me an improved version.

Priya`,
    fail: `Hi {name},

Thanks for this. I can’t use the summary yet: some of the key figures aren’t right. Have a look at the feedback, fix those points and send it again.

Priya`,
  },
}
