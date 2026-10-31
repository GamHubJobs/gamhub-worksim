import type { AssignmentInput } from '../schemas'

/**
 * Assignment 3: check a supplier invoice against the agreed price list.
 * Teaches: VLOOKUP with an exact match (the price list is not sorted, so
 * forgetting FALSE gives wrong prices), references to another sheet, IF to
 * compare values, and COUNTIF.
 */
const lines: Array<[string, string, string, string]> = [
  ['BL-210', 'Copy paper A4, box', '10', '23.50'],
  ['BL-114', 'Gel pens black (12)', '6', '9.80'],
  ['BL-305', 'Desk organiser', '4', '15.25'],
  ['BL-118', 'Highlighters (6)', '8', '5.40'],
  ['BL-402', 'Toner 26A', '3', '79.00'],
  ['BL-221', 'Notebooks A5 (10)', '5', '18.90'],
  ['BL-330', 'Monitor stand', '2', '42.00'],
  ['BL-127', 'Correction tape (5)', '6', '6.75'],
]

const prices: Array<[string, string, string]> = [
  ['BL-305', 'Desk organiser', '15.25'],
  ['BL-118', 'Highlighters, pack of 6', '5.40'],
  ['BL-402', 'Toner cartridge 26A', '74.00'],
  ['BL-210', 'Copy paper A4, box of 5 reams', '23.50'],
  ['BL-127', 'Correction tape, pack of 5', '6.25'],
  ['BL-221', 'Notebooks A5, pack of 10', '18.90'],
  ['BL-514', 'Whiteboard eraser', '3.80'],
  ['BL-114', 'Gel pens black, pack of 12', '8.90'],
  ['BL-330', 'Monitor stand', '42.00'],
  ['BL-610', 'Paper shredder', '129.00'],
  ['BL-245', 'Envelopes C4, box of 250', '21.40'],
  ['BL-150', 'Scissors', '4.95'],
]

const header = { bold: true, fill: 'gray' } as const

const rows = (count: number, make: (row: number) => Array<[string, string]>) =>
  Object.fromEntries(Array.from({ length: count }, (_, i) => make(i + 2)).flat())

export const invoiceCheck: AssignmentInput = {
  id: 'invoice-check',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'intern',
  order: 3,
  title: 'Check a supplier invoice',
  summary:
    'Compare an invoice with the agreed price list and work out what we should pay.',
  estimatedMinutes: 25,
  from: 'manager',
  briefing: {
    subject: 'Can you check the Brightline invoice?',
    body: `Hi {name},

We’ve received an invoice from Brightline Office Supply for last month’s delivery. Before we pay any invoice, we check it against the prices we agreed with the supplier, because mistakes happen more often than you’d think.

The workbook has two sheets: **Invoice** (what Brightline billed us) and **Prices** (our agreed price list). Please:
• look up the agreed price for every line on the invoice,
• flag any line where the invoiced price is different (“Check”), or the same (“OK”),
• work out what each line should cost at the agreed price, and the total we should pay,
• count how many lines we need to query with Brightline.

The price list has a dozen products, so please use VLOOKUP rather than searching by hand. That way the sheet works for next month’s invoice too.

Thanks,

Priya`,
  },
  whyItMatters:
    'Checking invoices before paying them is one of the most common jobs in any finance team. Suppliers make mistakes, and paying an incorrect invoice wastes money that is hard to get back. VLOOKUP lets you match each line to a reference list in seconds, however long the list is: one of the most useful spreadsheet skills in any office job.',
  objectives: [
    'Look up a value in another table with VLOOKUP',
    'Use an exact match (FALSE) and understand why it matters',
    'Refer to cells on another sheet',
    'Compare two values with IF',
  ],
  steps: [
    {
      id: 'explore',
      title: 'Look at both sheets',
      instructions: `The **Invoice** sheet lists what Brightline billed: product **Code**, description, quantity and the **Invoiced price**.

Click the **Prices** tab at the bottom to see our agreed price list. Notice it is not in any particular order. Then go back to **Invoice**.`,
    },
    {
      id: 'lookup',
      title: 'Look up the agreed prices',
      instructions: `In **E2** (Agreed price) type:

\`=VLOOKUP(A2, Prices!A:C, 3, FALSE)\`

This means: find the code in A2 in the first column of the Prices sheet (columns A to C), and return the value from the **3rd** column of that row (the agreed price). **FALSE** means “exact match only”.

Fill it down to **E9**.`,
      hint: 'Without FALSE, VLOOKUP assumes the list is sorted and may return the price of a different product, without any error. Always use FALSE when looking up codes or names.',
    },
    {
      id: 'compare',
      title: 'Flag price differences',
      instructions: `In **F2** compare the invoiced price with the agreed price:

\`=IF(D2=E2, "OK", "Check")\`

Fill it down to **F9**. Lines marked “Check” are the ones to query with Brightline.`,
    },
    {
      id: 'line-totals',
      title: 'What each line should cost',
      instructions: `In **G2** multiply the quantity by the agreed price: \`=C2*E2\`. Fill it down to **G9**.`,
    },
    {
      id: 'totals',
      title: 'Total to pay and lines to query',
      instructions: `In **G11** add up what we should pay: \`=SUM(G2:G9)\`.

In **G12** count the lines to query: \`=COUNTIF(F2:F9, "Check")\`.`,
    },
    {
      id: 'review',
      title: 'Check and submit',
      instructions: `Spot-check one line by hand: find its code on the Prices sheet and compare. Make sure you didn’t change the invoice or the price list, then submit.`,
    },
  ],
  workbook: {
    title: 'Brightline invoice check',
    sheets: [
      {
        name: 'Invoice',
        columnWidths: { A: 80, B: 170, C: 60, D: 120, E: 120, F: 90, G: 130 },
        cells: {
          A1: { input: 'Code', format: header },
          B1: { input: 'Description (as invoiced)', format: header },
          C1: { input: 'Qty', format: { ...header, align: 'right' } },
          D1: { input: 'Invoiced price', format: { ...header, align: 'right' } },
          E1: { input: 'Agreed price', format: { ...header, align: 'right' } },
          F1: { input: 'Price check', format: header },
          G1: { input: 'Line total (agreed)', format: { ...header, align: 'right' } },
          ...rows(lines.length, (row) => {
            const [code, description, qty, price] = lines[row - 2]
            return [
              [`A${row}`, code],
              [`B${row}`, description],
              [`C${row}`, qty],
              [`D${row}`, price],
            ]
          }),
          F11: { input: 'Amount we should pay', format: { bold: true, align: 'right' } },
          F12: { input: 'Lines to query', format: { bold: true, align: 'right' } },
        },
      },
      {
        name: 'Prices',
        columnWidths: { A: 80, B: 220, C: 110 },
        cells: {
          A1: { input: 'Code', format: header },
          B1: { input: 'Product', format: header },
          C1: { input: 'Agreed price', format: { ...header, align: 'right' } },
          ...rows(prices.length, (row) => {
            const [code, product, price] = prices[row - 2]
            return [
              [`A${row}`, code],
              [`B${row}`, product],
              [`C${row}`, price],
            ]
          }),
        },
      },
    ],
  },
  solution: {
    Invoice: {
      ...rows(lines.length, (row) => [
        [`E${row}`, `=VLOOKUP(A${row}, Prices!A:C, 3, FALSE)`],
        [`F${row}`, `=IF(D${row}=E${row}, "OK", "Check")`],
        [`G${row}`, `=C${row}*E${row}`],
      ]),
      G11: '=SUM(G2:G9)',
      G12: '=COUNTIF(F2:F9, "Check")',
    },
  },
  scenarios: [
    {
      description: 'Brightline corrects a product code on the invoice',
      changes: { 'Invoice!A9': 'BL-150', 'Invoice!D9': '4.95' },
    },
    {
      description: 'We agree a new price for highlighters',
      changes: { 'Prices!C3': '5.90' },
    },
  ],
  checks: [
    {
      id: 'agreed-prices',
      type: 'values',
      title: 'Agreed prices looked up',
      cells: ['Invoice!E2:E9'],
      requireFormula: true,
      functions: ['VLOOKUP', 'INDEX', 'XLOOKUP'],
      points: 35,
      why: 'Every check depends on having the right agreed price. A lookup that silently returns another product’s price leads to paying the wrong amount.',
      hint: 'In E2 type =VLOOKUP(A2, Prices!A:C, 3, FALSE) and fill it down to E9. Don’t forget FALSE: the price list is not sorted.',
    },
    {
      id: 'price-check',
      type: 'values',
      title: 'Price differences flagged',
      cells: ['Invoice!F2:F9'],
      requireFormula: true,
      functions: ['IF'],
      points: 20,
      why: 'The flags tell Priya exactly which lines to query with the supplier.',
      hint: 'In F2 type =IF(D2=E2, "OK", "Check") and fill it down to F9.',
    },
    {
      id: 'line-totals',
      type: 'values',
      title: 'Line totals at the agreed price',
      cells: ['Invoice!G2:G9'],
      requireFormula: true,
      points: 15,
      why: 'We pay what we agreed, not what was invoiced.',
      hint: 'In G2 type =C2*E2 (quantity × agreed price) and fill it down to G9.',
    },
    {
      id: 'amount-to-pay',
      type: 'values',
      title: 'Amount we should pay',
      cells: ['Invoice!G11'],
      requireFormula: true,
      functions: ['SUM'],
      points: 10,
      why: 'This is the figure Finance will pay, so it has to be right.',
      hint: 'In G11 type =SUM(G2:G9).',
    },
    {
      id: 'lines-to-query',
      type: 'values',
      title: 'Lines to query',
      cells: ['Invoice!G12'],
      requireFormula: true,
      functions: ['COUNTIF'],
      points: 10,
      why: 'A quick count tells Priya how big the problem is before she calls the supplier.',
      hint: 'In G12 type =COUNTIF(F2:F9, "Check").',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Invoice and price list left unchanged',
      cells: ['Invoice!A1:D9', 'Prices!A1:C13'],
      points: 10,
      why: 'The invoice is the supplier’s document and the price list is a contract. Never edit them; work next to them.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 140,
  skills: {
    formulas: 25,
    lookups: 45,
    'data-analysis': 10,
    accuracy: 20,
    'finance-basics': 20,
  },
  feedback: {
    excellent: `Hi {name},

Excellent work. You found all three price differences, and the total is exactly what we should pay. I’ve sent the queries to Brightline. This saves us real money.

Priya`,
    good: `Hi {name},

Good work, thank you. A couple of details still need fixing; the notes in your task results explain them.

Priya`,
    pass: `Hi {name},

Thanks. Some of the lookups or totals weren’t quite right, so I double-checked a few lines myself. Have a look at the feedback; VLOOKUP takes a little practice.

Priya`,
    fail: `Hi {name},

Thanks for trying. I can’t send this to Brightline yet. Please look at the feedback (especially the agreed prices) and send it again.

Priya`,
  },
}
