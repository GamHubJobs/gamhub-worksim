import type { AssignmentInput } from '../schemas'

/**
 * Assignment 5 (Junior Finance Assistant): decide which supplier invoices to
 * pay this week. Teaches: IF with AND (two conditions at once), COUNTIF with
 * a comparison ("<0"), SUMIF for a per-supplier summary, and payment controls
 * (never pay an unapproved invoice).
 */
const invoices: Array<[string, string, string, string, string]> = [
  ['Brightline Office Supply', 'BL-8841', '1284.60', '3', 'Yes'],
  ['Northwind Catering', 'NW-2207', '642.00', '-2', 'Yes'],
  ['Kestrel IT Services', 'KS-1190', '3150.00', '12', 'Yes'],
  ['Brightline Office Supply', 'BL-8852', '219.90', '6', 'No'],
  ['Harbour Travel', 'HT-5530', '1876.40', '1', 'Yes'],
  ['Northwind Catering', 'NW-2231', '388.50', '9', 'Yes'],
  ['Kestrel IT Services', 'KS-1204', '845.00', '-5', 'No'],
  ['Harbour Travel', 'HT-5547', '412.75', '7', 'Yes'],
  ['Brightline Office Supply', 'BL-8860', '96.30', '-1', 'Yes'],
  ['Kestrel IT Services', 'KS-1211', '1290.00', '4', 'Yes'],
  ['Harbour Travel', 'HT-5561', '2205.00', '14', 'No'],
  ['Northwind Catering', 'NW-2240', '154.80', '0', 'Yes'],
]

const suppliers = [
  'Brightline Office Supply',
  'Harbour Travel',
  'Kestrel IT Services',
  'Northwind Catering',
]

const header = { bold: true, fill: 'gray' } as const

const rows = (count: number, make: (row: number) => Array<[string, string]>) =>
  Object.fromEntries(Array.from({ length: count }, (_, i) => make(i + 2)).flat())

const last = invoices.length + 1 // row 13

export const paymentRun: AssignmentInput = {
  id: 'payment-run',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'junior',
  order: 5,
  title: 'Prepare the weekly payment run',
  summary: 'Decide which supplier invoices to pay this week, and how much goes to each.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'This week’s payment run',
    body: `Hi {name},

Every Thursday we pay our suppliers. I’d like you to prepare this week’s **payment run**: the list of invoices we’ll pay, for me to approve.

Our rule is simple: we pay an invoice this week if it has been **approved** by the budget holder **and** it is due within **7 days** (or is already overdue). Everything else waits.

On the **Invoices** sheet, please:
• mark each invoice “Pay” or “Hold”,
• show the amount to pay (0 for invoices on hold),
• summarise the total, how many invoices we’re paying, how many are waiting for approval and how many are overdue.

On the **Suppliers** sheet, show how much each supplier will receive, because the bank needs one payment per supplier.

Never include an unapproved invoice, however overdue it is. That’s how fraud gets through.

Priya`,
  },
  whyItMatters:
    'Paying suppliers on time keeps good relationships and avoids late fees, but paying the wrong invoice can mean losing money for good. Payment runs follow strict rules, and a spreadsheet that applies those rules with formulas is both faster and safer than deciding by hand.',
  objectives: [
    'Combine two conditions with AND inside IF',
    'Count values that meet a comparison, such as "<0"',
    'Summarise by supplier with SUMIF',
    'Apply a financial control consistently',
  ],
  steps: [
    {
      id: 'explore',
      title: 'Read the invoices',
      instructions: `Each row is an invoice. **Days to due date** (column D) is negative when the invoice is already overdue. **Approved** (column E) says whether the budget holder has approved it.`,
    },
    {
      id: 'decision',
      title: 'Pay or hold?',
      instructions: `In **F2** type:

\`=IF(AND(E2="Yes", D2<=7), "Pay", "Hold")\`

**AND** is true only when **both** conditions are true: approved, and due within 7 days (overdue invoices have negative days, so they count too). Fill it down to **F${last}**.`,
      hint: 'If you used OR instead of AND, unapproved invoices would be paid. Check the KS-1204 row: it is overdue but not approved, so it must be on hold.',
    },
    {
      id: 'amounts',
      title: 'Amount to pay',
      instructions: `In **G2** type \`=IF(F2="Pay", C2, 0)\` and fill it down to **G${last}**.`,
    },
    {
      id: 'summary',
      title: 'Summarise the run',
      instructions: `- **G15** total to pay: \`=SUM(G2:G${last})\`
- **G16** invoices being paid: \`=COUNTIF(F2:F${last}, "Pay")\`
- **G17** waiting for approval: \`=COUNTIF(E2:E${last}, "No")\`
- **G18** overdue invoices: \`=COUNTIF(D2:D${last}, "<0")\``,
    },
    {
      id: 'suppliers',
      title: 'One payment per supplier',
      instructions: `On the **Suppliers** sheet, in **B2** type:

\`=SUMIF(Invoices!$A$2:$A$${last}, A2, Invoices!$G$2:$G$${last})\`

Fill it down to **B5**, and add the total in **B7**: \`=SUM(B2:B5)\`. It should match the total on the Invoices sheet.`,
      hint: 'If the Suppliers total does not match G15, check that the ranges are locked with $ signs.',
    },
    {
      id: 'money',
      title: 'Format the money',
      instructions: `Format **Invoices!G2:G${last}**, **Invoices!G15** and **Suppliers!B2:B7** as currency with the **$** button.`,
    },
  ],
  workbook: {
    title: 'Payment run, week 44',
    sheets: [
      {
        name: 'Invoices',
        columnWidths: { A: 190, B: 90, C: 100, D: 120, E: 90, F: 90, G: 120 },
        cells: {
          A1: { input: 'Supplier', format: header },
          B1: { input: 'Invoice', format: header },
          C1: { input: 'Amount', format: { ...header, align: 'right' } },
          D1: { input: 'Days to due date', format: { ...header, align: 'right' } },
          E1: { input: 'Approved', format: header },
          F1: { input: 'Decision', format: header },
          G1: { input: 'Amount to pay', format: { ...header, align: 'right' } },
          ...rows(invoices.length, (row) => {
            const [supplier, invoice, amount, days, approved] = invoices[row - 2]
            return [
              [`A${row}`, supplier],
              [`B${row}`, invoice],
              [`C${row}`, amount],
              [`D${row}`, days],
              [`E${row}`, approved],
            ]
          }),
          F15: { input: 'Total to pay', format: { bold: true, align: 'right' } },
          F16: { input: 'Invoices paid', format: { bold: true, align: 'right' } },
          F17: { input: 'Awaiting approval', format: { bold: true, align: 'right' } },
          F18: { input: 'Overdue', format: { bold: true, align: 'right' } },
        },
      },
      {
        name: 'Suppliers',
        columnWidths: { A: 190, B: 130 },
        cells: {
          A1: { input: 'Supplier', format: header },
          B1: { input: 'Payment', format: { ...header, align: 'right' } },
          ...Object.fromEntries(suppliers.map((name, i) => [`A${i + 2}`, name])),
          A7: { input: 'Total', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Invoices: {
      ...rows(invoices.length, (row) => [
        [`F${row}`, `=IF(AND(E${row}="Yes", D${row}<=7), "Pay", "Hold")`],
        [`G${row}`, `=IF(F${row}="Pay", C${row}, 0)`],
      ]),
      G15: `=SUM(G2:G${last})`,
      G16: `=COUNTIF(F2:F${last}, "Pay")`,
      G17: `=COUNTIF(E2:E${last}, "No")`,
      G18: `=COUNTIF(D2:D${last}, "<0")`,
    },
    Suppliers: {
      ...Object.fromEntries(
        suppliers.map((_, i) => [
          `B${i + 2}`,
          `=SUMIF(Invoices!$A$2:$A$${last}, A${i + 2}, Invoices!$G$2:$G$${last})`,
        ]),
      ),
      B7: '=SUM(B2:B5)',
    },
  },
  scenarios: [
    {
      description: 'The budget holder approves the Kestrel invoice that was on hold',
      changes: { 'Invoices!E8': 'Yes' },
    },
    {
      description: 'Harbour Travel’s first invoice is not due for another 10 days',
      changes: { 'Invoices!D6': '10' },
    },
  ],
  checks: [
    {
      id: 'decision',
      type: 'values',
      title: 'Pay or hold decisions',
      cells: [`Invoices!F2:F${last}`],
      requireFormula: true,
      functions: ['IF'],
      points: 30,
      why: 'This is the control that protects the company’s money: only approved invoices that are due get paid.',
      hint: 'In F2 type =IF(AND(E2="Yes", D2<=7), "Pay", "Hold") and fill it down. Both conditions must be true.',
    },
    {
      id: 'amounts',
      type: 'values',
      title: 'Amounts to pay',
      cells: [`Invoices!G2:G${last}`],
      requireFormula: true,
      points: 15,
      why: 'Held invoices must show 0, so they cannot slip into the total.',
      hint: 'In G2 type =IF(F2="Pay", C2, 0) and fill it down.',
    },
    {
      id: 'summary',
      type: 'values',
      title: 'Payment run summary',
      cells: ['Invoices!G15:G18'],
      requireFormula: true,
      points: 20,
      why: 'Priya approves the run from the summary, so it has to match the detail exactly.',
      hint: 'G15 =SUM(G2:G13), G16 =COUNTIF(F2:F13, "Pay"), G17 =COUNTIF(E2:E13, "No"), G18 =COUNTIF(D2:D13, "<0").',
    },
    {
      id: 'suppliers',
      type: 'values',
      title: 'Payment per supplier',
      cells: ['Suppliers!B2:B5'],
      requireFormula: true,
      functions: ['SUMIF', 'SUMIFS'],
      points: 12,
      why: 'The bank makes one payment per supplier, so these are the amounts that actually leave the account.',
      hint: 'In B2 type =SUMIF(Invoices!$A$2:$A$13, A2, Invoices!$G$2:$G$13) and fill it down to B5.',
    },
    {
      id: 'suppliers-total',
      type: 'values',
      title: 'Total of the supplier payments',
      cells: ['Suppliers!B7'],
      requireFormula: true,
      points: 3,
      why: 'The total of the bank payments must match the total of the payment run: a quick, powerful check.',
      hint: 'In B7 type =SUM(B2:B5).',
    },
    {
      id: 'money-format',
      type: 'format',
      title: 'Money formatted as currency',
      cells: [`Invoices!G2:G${last}`, 'Invoices!G15', 'Suppliers!B2:B7'],
      format: { numberFormat: 'currency' },
      points: 10,
      why: 'Amounts that will be paid out should be unmistakably money.',
      hint: 'Select the amounts and click the $ button.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Invoices left unchanged',
      cells: [`Invoices!A1:E${last}`, 'Suppliers!A1:A5'],
      points: 10,
      why: 'Changing an invoice amount or an approval in a payment file is exactly what auditors look for.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 190,
  skills: {
    formulas: 35,
    'data-analysis': 25,
    lookups: 10,
    accuracy: 30,
    'finance-basics': 35,
  },
  feedback: {
    excellent: `Hi {name},

Perfect. Every decision follows the rule, the unapproved Kestrel invoice is correctly on hold even though it’s overdue, and the supplier totals match. I’ve approved the run.

Priya`,
    good: `Hi {name},

Good work. A couple of details need fixing before I approve it; see the notes in your task results.

Priya`,
    pass: `Hi {name},

Thanks. I had to correct a few lines myself. Please look at the feedback, especially the decision formula: both conditions have to be true.

Priya`,
    fail: `Hi {name},

I can’t approve this run yet. Some decisions don’t follow the payment rule; the feedback explains how to fix them. Send it back when it’s ready.

Priya`,
  },
}
