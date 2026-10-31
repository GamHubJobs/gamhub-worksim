import type { AssignmentInput } from '../schemas'

/**
 * Assignment 6 (Junior Finance Assistant): reconcile the petty cash tin.
 * Teaches: a reconciliation (expected vs actual), ROUND to avoid tiny
 * floating-point differences, ABS for a tolerance either way, and SUMIF /
 * COUNTIF to find spending without receipts.
 */
const log: Array<[string, string, string, string]> = [
  ['01 Oct', 'Milk and tea for the kitchen', '8.45', 'Yes'],
  ['03 Oct', 'Taxi for a client visit', '24.60', 'Yes'],
  ['06 Oct', 'Birthday card and cake', '17.99', 'Yes'],
  ['08 Oct', 'Postage, special delivery', '9.35', 'No'],
  ['10 Oct', 'Batteries for the meeting room', '6.20', 'Yes'],
  ['14 Oct', 'Parking for a delivery driver', '5.50', 'No'],
  ['15 Oct', 'Biscuits for the board meeting', '7.80', 'Yes'],
  ['20 Oct', 'Light bulbs', '12.40', 'Yes'],
  ['22 Oct', 'Train ticket, interview candidate', '31.25', 'Yes'],
  ['24 Oct', 'Flowers for reception', '15.00', 'No'],
  ['27 Oct', 'Cleaning supplies', '11.65', 'Yes'],
  ['29 Oct', 'Coffee beans', '13.90', 'Yes'],
]

const denominations: Array<[string, string]> = [
  ['20', '3'],
  ['10', '5'],
  ['5', '6'],
  ['2', '7'],
  ['1', '9'],
  ['0.5', '6'],
  ['0.2', '8'],
  ['0.1', '9'],
  ['0.05', '7'],
]

const header = { bold: true, fill: 'gray' } as const

const rows = (count: number, make: (row: number) => Array<[string, string]>) =>
  Object.fromEntries(Array.from({ length: count }, (_, i) => make(i + 2)).flat())

const lastLog = log.length + 1 // row 13
const lastCount = denominations.length + 1 // row 10

export const pettyCash: AssignmentInput = {
  id: 'petty-cash',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'junior',
  order: 6,
  title: 'Reconcile the petty cash',
  summary: 'Check that the cash in the tin matches what the log says should be there.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Month-end petty cash check',
    body: `Hi {name},

At the end of every month someone reconciles the **petty cash**: the tin of cash for small office purchases. It’s your turn.

The tin started the month with a **$300.00 float**. Nina keeps a **Log** of everything paid out, and she has **counted** the cash in the tin this morning (the **Count** sheet).

On the **Reconcile** sheet, please work out:
• how much was spent, and how much cash there should be,
• how much is actually in the tin,
• the difference, and whether it balances (we accept up to 50 cents either way),
• how many payments have no receipt, and how much they add up to.

Small differences happen, but missing receipts need chasing: without a receipt we can’t claim back the tax, and the auditors will ask.

Priya`,
  },
  whyItMatters:
    'A reconciliation compares what should be there with what is actually there, and explains the difference. It is one of the most important controls in finance, used for bank accounts, stock and cash. Even a small tin of petty cash is a common place for mistakes, and occasionally for fraud.',
  objectives: [
    'Reconcile an expected balance with an actual count',
    'Round results with ROUND to avoid tiny calculation differences',
    'Use ABS to allow a tolerance in both directions',
    'Find exceptions (missing receipts) with COUNTIF and SUMIF',
  ],
  steps: [
    {
      id: 'count',
      title: 'Value the cash count',
      instructions: `On the **Count** sheet, each row is a coin or note and how many there are. In **C2** type \`=ROUND(A2*B2, 2)\` and fill it down to **C${lastCount}**.

**ROUND(…, 2)** rounds to 2 decimal places (cents). Computers store numbers like 0.1 slightly imprecisely, and rounding stops tiny differences from adding up.`,
    },
    {
      id: 'expected',
      title: 'What should be in the tin',
      instructions: `On **Reconcile**:
- **B3** total spent: \`=SUM(Log!C2:C${lastLog})\`
- **B4** expected cash: \`=B2-B3\` (the float minus what was spent)
- **B5** cash counted: \`=SUM(Count!C2:C${lastCount})\``,
    },
    {
      id: 'difference',
      title: 'Does it balance?',
      instructions: `- **B6** difference: \`=ROUND(B5-B4, 2)\`. Negative means cash is missing.
- **B7** status: \`=IF(ABS(B6)<=0.5, "Balanced", "Investigate")\`

**ABS** removes the minus sign, so the check works whether there is too much or too little cash.`,
      hint: 'Without ABS, a large shortage (a negative difference) would count as “Balanced”, because every negative number is less than 0.5.',
    },
    {
      id: 'receipts',
      title: 'Missing receipts',
      instructions: `- **B9** payments without a receipt: \`=COUNTIF(Log!D2:D${lastLog}, "No")\`
- **B10** their total: \`=SUMIF(Log!D2:D${lastLog}, "No", Log!C2:C${lastLog})\``,
    },
    {
      id: 'format',
      title: 'Format the money',
      instructions: `Format **Reconcile!B2:B6** and **B10** as currency with the **$** button.`,
    },
  ],
  workbook: {
    title: 'Petty cash reconciliation, October',
    sheets: [
      {
        name: 'Reconcile',
        columnWidths: { A: 230, B: 120 },
        cells: {
          A1: { input: 'Petty cash reconciliation', format: { bold: true } },
          A2: 'Opening float',
          B2: '300',
          A3: 'Total spent',
          A4: 'Expected cash',
          A5: 'Cash counted',
          A6: 'Difference',
          A7: 'Status',
          A9: 'Payments without a receipt',
          A10: 'Amount without a receipt',
        },
      },
      {
        name: 'Log',
        columnWidths: { A: 70, B: 240, C: 90, D: 80 },
        cells: {
          A1: { input: 'Date', format: header },
          B1: { input: 'Description', format: header },
          C1: { input: 'Amount', format: { ...header, align: 'right' } },
          D1: { input: 'Receipt', format: header },
          ...rows(log.length, (row) => {
            const [date, description, amount, receipt] = log[row - 2]
            return [
              [`A${row}`, date],
              [`B${row}`, description],
              [`C${row}`, amount],
              [`D${row}`, receipt],
            ]
          }),
        },
      },
      {
        name: 'Count',
        columnWidths: { A: 110, B: 70, C: 90 },
        cells: {
          A1: { input: 'Coin or note', format: { ...header, align: 'right' } },
          B1: { input: 'Count', format: { ...header, align: 'right' } },
          C1: { input: 'Value', format: { ...header, align: 'right' } },
          ...rows(denominations.length, (row) => {
            const [value, count] = denominations[row - 2]
            return [
              [`A${row}`, value],
              [`B${row}`, count],
            ]
          }),
        },
      },
    ],
  },
  solution: {
    Count: {
      ...rows(denominations.length, (row) => [[`C${row}`, `=ROUND(A${row}*B${row}, 2)`]]),
    },
    Reconcile: {
      B3: `=SUM(Log!C2:C${lastLog})`,
      B4: '=B2-B3',
      B5: `=SUM(Count!C2:C${lastCount})`,
      B6: '=ROUND(B5-B4, 2)',
      B7: '=IF(ABS(B6)<=0.5, "Balanced", "Investigate")',
      B9: `=COUNTIF(Log!D2:D${lastLog}, "No")`,
      B10: `=SUMIF(Log!D2:D${lastLog}, "No", Log!C2:C${lastLog})`,
    },
  },
  scenarios: [
    {
      description: 'A recount finds two more $20 notes',
      changes: { 'Count!B2': '5' },
    },
    {
      description: 'The receipt for the postage turns up',
      changes: { 'Log!D5': 'Yes' },
    },
    {
      description: 'A $50 payment was missing from the log',
      changes: { 'Log!C13': '63.90' },
    },
  ],
  checks: [
    {
      id: 'count-values',
      type: 'values',
      title: 'Cash count valued',
      cells: [`Count!C2:C${lastCount}`],
      requireFormula: true,
      points: 15,
      why: 'The count is the actual side of the reconciliation, so every coin has to be valued correctly.',
      hint: 'In Count!C2 type =ROUND(A2*B2, 2) and fill it down.',
    },
    {
      id: 'expected-cash',
      type: 'values',
      title: 'Spent, expected and counted',
      cells: ['Reconcile!B3:B5'],
      requireFormula: true,
      points: 25,
      why: 'Expected cash is the float minus everything the log says was paid out; counted cash is what is really there.',
      hint: 'B3 =SUM(Log!C2:C13), B4 =B2-B3, B5 =SUM(Count!C2:C10).',
    },
    {
      id: 'difference',
      type: 'values',
      title: 'Difference',
      cells: ['Reconcile!B6'],
      requireFormula: true,
      points: 10,
      why: 'The difference is the point of the reconciliation: how far the tin is from what it should be.',
      hint: 'B6 =ROUND(B5-B4, 2).',
    },
    {
      id: 'status',
      type: 'values',
      title: 'Balanced or not',
      cells: ['Reconcile!B7'],
      requireFormula: true,
      functions: ['IF'],
      points: 15,
      why: 'The status must catch shortages as well as surpluses.',
      hint: 'B7 =IF(ABS(B6)<=0.5, "Balanced", "Investigate").',
    },
    {
      id: 'receipts',
      type: 'values',
      title: 'Missing receipts',
      cells: ['Reconcile!B9:B10'],
      requireFormula: true,
      points: 15,
      why: 'Payments without receipts cannot be claimed back and are the first thing an auditor asks about.',
      hint: 'B9 =COUNTIF(Log!D2:D13, "No"), B10 =SUMIF(Log!D2:D13, "No", Log!C2:C13).',
    },
    {
      id: 'money-format',
      type: 'format',
      title: 'Money formatted as currency',
      cells: ['Reconcile!B2:B6', 'Reconcile!B10'],
      format: { numberFormat: 'currency' },
      points: 10,
      why: 'In a reconciliation, every amount should be clearly money, to the cent.',
      hint: 'Select B2:B6 and B10 on the Reconcile sheet and click the $ button.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Log, count and float left unchanged',
      cells: [`Log!A1:D${lastLog}`, `Count!A1:B${lastCount}`, 'Reconcile!B2'],
      points: 10,
      why: 'A reconciliation that edits the log or the count to make the numbers match is not a reconciliation; it is a cover-up.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 200,
  skills: {
    formulas: 35,
    'data-analysis': 25,
    presentation: 10,
    accuracy: 40,
    'finance-basics': 35,
  },
  feedback: {
    excellent: `Hi {name},

Spot on. The tin is short by more than our tolerance, so I’ll ask Nina to recount before we investigate, and I’ve sent a reminder about the three missing receipts. A tidy, trustworthy reconciliation.

Priya`,
    good: `Hi {name},

Good work. A couple of details to fix; the notes in your task results explain them.

Priya`,
    pass: `Hi {name},

Thanks. A few figures needed correcting. Have a look at the feedback, especially the difference and the ABS check.

Priya`,
    fail: `Hi {name},

This doesn’t reconcile yet. Have a look at the feedback and try again; work through the expected cash first.

Priya`,
  },
}
