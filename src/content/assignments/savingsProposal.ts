import type { AssignmentInput } from '../schemas'

/**
 * Assignment 8 (Finance Assistant): a supplier cost review and a savings
 * proposal. Less guidance than before: the player decides how to present the
 * case, but must back it with correct figures.
 */
const suppliers: Array<[string, string, string, string]> = [
  ['Brightline Office Supply', 'Office supplies', '18400', '21900'],
  ['Kestrel IT Services', 'IT support', '52000', '53100'],
  ['Northwind Catering', 'Catering', '14800', '19250'],
  ['Harbour Travel', 'Travel', '61500', '60200'],
  ['Clearview Cleaning', 'Cleaning', '22600', '23400'],
  ['Atlas Couriers', 'Postage and courier', '6900', '8650'],
  ['Summit Print', 'Printing', '9800', '9350'],
  ['Pioneer Software', 'Software licences', '33200', '34100'],
]

const header = { bold: true, fill: 'gray' } as const
const last = suppliers.length + 1 // row 9

const rows = (make: (row: number) => Array<[string, string]>) =>
  Object.fromEntries(suppliers.map((_, i) => make(i + 2)).flat())

export const savingsProposal: AssignmentInput = {
  id: 'savings-proposal',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'assistant',
  order: 8,
  title: 'Supplier cost review and savings proposal',
  summary:
    'Find the suppliers whose costs are rising fastest and propose how much we could save.',
  estimatedMinutes: 75,
  from: 'manager',
  briefing: {
    subject: 'Supplier costs: can you build the case?',
    body: `Hi {name},

The directors have asked every team to find savings for next year, and I think our suppliers are the place to start. Some of them have become a lot more expensive.

The workbook has what we spent with each of our eight main suppliers last year and this year. I’d like you to:
• work out how much each supplier’s cost changed, in money and as a percentage, and flag every supplier whose cost rose by **more than 10%** for review;
• estimate the saving if we renegotiate the flagged suppliers and bring their cost down by **8%**;
• write a short proposal in Word Craft (problem, proposal, savings, recommendation) and prepare a few slides I can use to present it.

How you make the case is up to you, but the numbers must be right and consistent everywhere. Reply to this email with the three files when you’re ready.

Priya`,
  },
  whyItMatters:
    'Finding savings is one of the most valued contributions in any finance role. A good proposal identifies where costs are growing, quantifies the opportunity and asks for a clear decision. This is the step from reporting what happened to recommending what should happen.',
  objectives: [
    'Calculate changes in money and as percentages',
    'Apply a threshold to flag exceptions, and size an opportunity with SUMIF',
    'Structure a persuasive business proposal',
    'Present a recommendation with consistent supporting figures',
  ],
  steps: [
    {
      id: 'analyse',
      title: 'Analyse the supplier costs',
      instructions: `For each supplier (rows 2 to ${last}): the change in money (**E**), the change as a percentage (**F**, formatted as %), and a flag (**G**): “Review” if the cost rose by more than 10%, otherwise “OK”.

Add the totals for last year and this year in row 11 (B11 is a label; C11 and D11 are totals). Then, on the **Savings** sheet, work out the current spend with flagged suppliers (B2) and the saving at 8% (B3).`,
      hint: 'SUMIF adds up only the rows that match: =SUMIF(Suppliers!G2:G9, "Review", Suppliers!D2:D9). The saving is that amount × 8%.',
    },
    {
      id: 'chart',
      title: 'Show the change',
      instructions:
        'Make a chart that compares last year and this year by supplier, so the rising costs stand out.',
    },
    {
      id: 'proposal',
      title: 'Write the proposal',
      instructions: `In **Word Craft**, write **Supplier savings proposal**: the problem (with figures), your proposal, the expected savings, and your recommendation. Name the suppliers to renegotiate and include your chart. Keep it under two pages.`,
    },
    {
      id: 'slides',
      title: 'Prepare the slides',
      instructions: `In **Deck Craft**, prepare **Supplier savings proposal** (5 to 10 slides) with the chart and the savings figure.`,
    },
    {
      id: 'send',
      title: 'Send it to Priya',
      instructions:
        'Reply to Priya’s email with the workbook, the proposal and the slides attached.',
    },
  ],
  workbook: {
    title: 'Supplier cost review',
    sheets: [
      {
        name: 'Suppliers',
        columnWidths: { A: 190, B: 150, C: 100, D: 100, E: 100, F: 90, G: 80 },
        cells: {
          A1: { input: 'Supplier', format: header },
          B1: { input: 'Category', format: header },
          C1: { input: 'Last year', format: { ...header, align: 'right' } },
          D1: { input: 'This year', format: { ...header, align: 'right' } },
          E1: { input: 'Change', format: { ...header, align: 'right' } },
          F1: { input: 'Change %', format: { ...header, align: 'right' } },
          G1: { input: 'Flag', format: header },
          ...rows((row) => {
            const [name, category, before, now] = suppliers[row - 2]
            return [
              [`A${row}`, name],
              [`B${row}`, category],
              [`C${row}`, before],
              [`D${row}`, now],
            ]
          }),
          B11: { input: 'Total', format: { bold: true } },
        },
      },
      {
        name: 'Savings',
        columnWidths: { A: 300, B: 130 },
        cells: {
          A1: { input: 'Renegotiation opportunity', format: { bold: true } },
          A2: 'Spend with suppliers flagged for review (this year)',
          A3: 'Saving if their cost falls by 8%',
        },
      },
    ],
  },
  solution: {
    Suppliers: {
      ...rows((row) => [
        [`E${row}`, `=D${row}-C${row}`],
        [`F${row}`, `=E${row}/C${row}`],
        [`G${row}`, `=IF(F${row}>0.1, "Review", "OK")`],
      ]),
      C11: `=SUM(C2:C${last})`,
      D11: `=SUM(D2:D${last})`,
    },
    Savings: {
      B2: `=SUMIF(Suppliers!G2:G${last}, "Review", Suppliers!D2:D${last})`,
      B3: '=B2*0.08',
    },
  },
  scenarios: [
    {
      description: 'Summit Print’s final invoice puts it up 12%',
      changes: { 'Suppliers!D8': '10980' },
    },
  ],
  checks: [
    {
      id: 'change',
      type: 'values',
      title: 'Change in money and as a percentage',
      cells: [`Suppliers!E2:F${last}`],
      requireFormula: true,
      points: 10,
      why: 'Money shows the size of the problem; percentages show where costs are growing fastest.',
      hint: 'E2 =D2-C2 and F2 =E2/C2, filled down.',
    },
    {
      id: 'flags',
      type: 'values',
      title: 'Suppliers flagged for review',
      cells: [`Suppliers!G2:G${last}`],
      requireFormula: true,
      functions: ['IF'],
      points: 10,
      why: 'The threshold must be applied consistently to every supplier.',
      hint: 'G2 =IF(F2>0.1, "Review", "OK"). More than 10% means strictly greater than 0.1.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Totals',
      cells: ['Suppliers!C11:D11'],
      requireFormula: true,
      points: 5,
      why: 'Total supplier spend puts the savings into perspective.',
      hint: 'C11 =SUM(C2:C9), D11 =SUM(D2:D9).',
    },
    {
      id: 'savings',
      type: 'values',
      title: 'Savings estimate',
      cells: ['Savings!B2:B3'],
      requireFormula: true,
      points: 15,
      why: 'This is the number the directors will remember, so it has to be right.',
      hint: 'B2 =SUMIF(Suppliers!G2:G9, "Review", Suppliers!D2:D9), B3 =B2*0.08.',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of the change',
      cells: [`Suppliers!A1:D${last}`],
      points: 5,
      why: 'Seeing last year and this year side by side makes the case instantly.',
      hint: 'A chart of A1:A9 with C1:D9: select A1:D9 and add a chart. (A chart that includes columns B to D also counts.)',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Supplier data left unchanged',
      cells: [`Suppliers!A1:D${last}`],
      points: 5,
      why: 'A proposal built on edited data would not survive the first question.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Supplier savings proposal',
      template: 'report',
      checks: [
        {
          id: 'proposal-sections',
          type: 'sections',
          title: 'Proposal structure',
          sections: [
            ['Problem', 'Background'],
            ['Proposal'],
            ['Saving'],
            ['Recommendation'],
          ],
          points: 15,
          why: 'Problem, proposal, savings and recommendation is the structure decision-makers expect.',
          hint: 'Use headings such as “The problem”, “Our proposal”, “Expected savings” and “Recommendation”.',
        },
        {
          id: 'proposal-figures',
          type: 'figures',
          title: 'Figures in the proposal',
          figures: [
            { label: 'total supplier spend this year', cell: 'Suppliers!D11' },
            { label: 'spend with the flagged suppliers', cell: 'Savings!B2' },
            { label: 'estimated saving', cell: 'Savings!B3' },
          ],
          points: 20,
          why: 'The size of the opportunity is the heart of the case.',
          hint: 'Use D11 from the Suppliers sheet and B2 and B3 from the Savings sheet.',
        },
        {
          id: 'proposal-suppliers',
          type: 'mentions',
          title: 'Suppliers to renegotiate',
          terms: [['Brightline'], ['Northwind'], ['Atlas']],
          points: 15,
          why: 'A proposal has to say exactly who we should talk to.',
          hint: 'Name every supplier flagged “Review” in column G.',
        },
        {
          id: 'proposal-chart',
          type: 'charts',
          min: 1,
          title: 'Chart in the proposal',
          points: 5,
          why: 'Evidence persuades better than adjectives.',
          hint: 'Insert your chart with **Insert chart from Grid Craft**, above the document.',
        },
        {
          id: 'proposal-length',
          type: 'length',
          min: 200,
          max: 900,
          title: 'Length',
          points: 5,
          why: 'Directors read proposals of one or two pages; longer ones wait.',
          hint: 'Aim for 200 to 900 words.',
        },
      ],
    },
    {
      kind: 'slides',
      title: 'Supplier savings proposal',
      template: 'proposal',
      checks: [
        {
          id: 'deck-length',
          type: 'length',
          min: 5,
          max: 10,
          title: 'Number of slides',
          points: 5,
          why: 'Enough to make the case, short enough for a ten-minute slot.',
          hint: 'Keep between 5 and 10 slides.',
        },
        {
          id: 'deck-chart',
          type: 'charts',
          min: 1,
          title: 'Chart on a slide',
          points: 5,
          why: 'One good chart carries a presentation.',
          hint: 'Insert your chart with **Insert chart from Grid Craft**, above the presentation.',
        },
        {
          id: 'deck-saving',
          type: 'figures',
          title: 'The saving on the slides',
          figures: [{ label: 'estimated saving', cell: 'Savings!B3' }],
          points: 10,
          why: 'The number you want the room to remember must be on a slide.',
          hint: 'Put the saving from Savings!B3 on your recommendation slide.',
        },
        {
          id: 'deck-recommendation',
          type: 'sections',
          title: 'A clear recommendation',
          sections: [['Recommendation']],
          points: 5,
          why: 'Every proposal ends by asking for a decision.',
          hint: 'Keep a slide titled “Recommendation”.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 320,
  skills: {
    formulas: 25,
    'data-analysis': 45,
    presentation: 45,
    accuracy: 25,
    'finance-basics': 40,
  },
  feedback: {
    excellent: `Hi {name},

Excellent. The analysis is right, the case is clear and the saving is well supported. I’m forwarding this to the directors with your name on it.

Priya`,
    good: `Hi {name},

A strong proposal, thank you. A few details to fix before it goes to the directors; see your task results.

Priya`,
    pass: `Hi {name},

The idea is right, but the case needs work before I can send it on. Look at the feedback, especially the figures.

Priya`,
    fail: `Hi {name},

Not ready yet, I’m afraid. The feedback in your task results explains what is missing. Have another go.

Priya`,
  },
}
