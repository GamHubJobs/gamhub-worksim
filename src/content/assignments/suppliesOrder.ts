import type { AssignmentInput } from '../schemas'

/**
 * Assignment 1: price up the monthly office supplies order.
 * Teaches: multiplication formulas, filling formulas down, SUM, currency format,
 * leaving source data untouched.
 */
export const suppliesOrder: AssignmentInput = {
  id: 'supplies-order',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'intern',
  order: 1,
  title: 'Price the office supplies order',
  summary:
    'Work out the cost of each item on this month’s supplies order and the order total.',
  estimatedMinutes: 15,
  from: 'manager',
  briefing: {
    subject: 'Your first task: this month’s supplies order',
    body: `Hi {name},

Welcome to the team! Let’s start you off with something we do every month.

Tom from Facilities has collected everyone’s requests for office supplies in a spreadsheet. Before I can approve the order, I need to know what it will cost: the cost of each line, and the total for the whole order.

Could you please:
• work out the line total for every item (quantity × unit price),
• add the order total at the bottom,
• format the prices and totals as money, so they are easy to read.

Please use formulas rather than typing in the results. Tom often changes quantities at the last minute, and the totals need to keep up. And don’t change Tom’s figures: if anything looks odd, tell me instead.

The workbook is in your Tasks. Thanks!

Priya`,
  },
  whyItMatters:
    'Almost every office checks costs before money is spent. A purchase order that is priced correctly, with totals that update when quantities change, saves the company from approving the wrong amount. Formulas are what make a spreadsheet trustworthy: a typed-in number stays wrong when the data changes, a formula does not.',
  objectives: [
    'Write a formula that multiplies two cells',
    'Copy a formula down a column so it adjusts to each row',
    'Add up a column with the SUM function',
    'Format numbers as currency',
  ],
  steps: [
    {
      id: 'explore',
      title: 'Look at the order',
      instructions: `Each row is one item Tom’s colleagues asked for. **Quantity** (column C) is how many, **Unit price** (column D) is the price of one.

Your job is to fill in **Line total** (column E) and the **Order total** (cell E13).`,
    },
    {
      id: 'first-line',
      title: 'Calculate the first line total',
      instructions: `Click cell **E2** and type \`=C2*D2\`, then press Enter.

The \`=\` tells the spreadsheet that this is a formula. \`*\` means multiply. The cell now shows the result, 149.94, while the formula bar shows the formula behind it.`,
      hint: 'Tip: instead of typing C2 and D2, you can type = and then click the cells.',
    },
    {
      id: 'fill-down',
      title: 'Copy the formula to the other rows',
      instructions: `Select **E2 to E11** (click E2, then Shift+click E11) and press **Ctrl+D** to fill the formula down.

The spreadsheet adjusts the formula for each row: E3 becomes \`=C3*D3\`, E4 becomes \`=C4*D4\`, and so on. You can also copy E2 (Ctrl+C), select E3:E11 and paste (Ctrl+V).`,
      hint: 'Click a few cells in column E and look at the formula bar to check that each row uses its own quantity and price.',
    },
    {
      id: 'total',
      title: 'Add up the order',
      instructions: `In cell **E13**, add up all the line totals with the SUM function: \`=SUM(E2:E11)\`.

\`E2:E11\` is a range: every cell from E2 to E11. SUM adds them all, even if more rows are added in between later.`,
      hint: 'Writing =E2+E3+E4… also adds up, but it is long, easy to get wrong and does not grow with the list. SUM is the professional way.',
    },
    {
      id: 'format',
      title: 'Format the money',
      instructions: `Select the prices and totals (**D2:E13**) and click the **$** button in the toolbar.

Currency format adds the $ sign, thousands separators and always two decimal places, so 149.9 shows as $149.90.`,
    },
    {
      id: 'review',
      title: 'Check your work and submit',
      instructions: `Before you submit, check:
• Does every line total look right? (Spot-check one with mental maths.)
• Is the order total believable?
• Did you leave Tom’s quantities and prices exactly as they were?

When you are happy, click **Submit to Priya**. You will get feedback straight away, and you can improve your work and submit again.`,
    },
  ],
  workbook: {
    title: 'Supplies order – this month',
    sheets: [
      {
        name: 'Order',
        columnWidths: { A: 250, B: 100, C: 80, D: 100, E: 110 },
        cells: {
          A1: { input: 'Item', format: { bold: true, fill: 'gray' } },
          B1: { input: 'Category', format: { bold: true, fill: 'gray' } },
          C1: { input: 'Quantity', format: { bold: true, fill: 'gray', align: 'right' } },
          D1: {
            input: 'Unit price',
            format: { bold: true, fill: 'gray', align: 'right' },
          },
          E1: {
            input: 'Line total',
            format: { bold: true, fill: 'gray', align: 'right' },
          },
          A2: 'Printer paper A4, box of 5 reams',
          B2: 'Paper',
          C2: '6',
          D2: '24.99',
          A3: 'Ballpoint pens, pack of 50',
          B3: 'Writing',
          C3: '4',
          D3: '11.50',
          A4: 'Sticky notes, 12 pads',
          B4: 'Paper',
          C4: '5',
          D4: '8.75',
          A5: 'Toner cartridge, black',
          B5: 'Printing',
          C5: '2',
          D5: '64.00',
          A6: 'Stapler',
          B6: 'Desk',
          C6: '3',
          D6: '9.95',
          A7: 'Staples, box of 5,000',
          B7: 'Desk',
          C7: '4',
          D7: '3.20',
          A8: 'Whiteboard markers, set of 4',
          B8: 'Writing',
          C8: '6',
          D8: '6.40',
          A9: 'Lever arch files',
          B9: 'Filing',
          C9: '20',
          D9: '2.85',
          A10: 'Coffee pods, box of 100',
          B10: 'Kitchen',
          C10: '3',
          D10: '32.00',
          A11: 'Hand sanitiser, 500 ml',
          B11: 'Kitchen',
          C11: '8',
          D11: '4.60',
          D13: { input: 'Order total', format: { bold: true, align: 'right' } },
          E13: { input: '', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Order: {
      E2: '=C2*D2',
      E3: '=C3*D3',
      E4: '=C4*D4',
      E5: '=C5*D5',
      E6: '=C6*D6',
      E7: '=C7*D7',
      E8: '=C8*D8',
      E9: '=C9*D9',
      E10: '=C10*D10',
      E11: '=C11*D11',
      E13: '=SUM(E2:E11)',
    },
  },
  scenarios: [
    {
      description: 'Tom changes two quantities and a price',
      changes: { 'Order!C3': '10', 'Order!C9': '35', 'Order!D5': '71.50' },
    },
  ],
  checks: [
    {
      id: 'line-totals',
      type: 'values',
      title: 'Line totals',
      cells: ['Order!E2:E11'],
      requireFormula: true,
      points: 40,
      why: 'Each line total must be quantity × unit price, calculated by a formula so it stays right when Tom changes the order.',
      hint: 'In E2 type =C2*D2, then fill it down to E11 (select E2:E11 and press Ctrl+D).',
    },
    {
      id: 'order-total',
      type: 'values',
      title: 'Order total',
      cells: ['Order!E13'],
      requireFormula: true,
      functions: ['SUM'],
      points: 25,
      why: 'The order total is the number Priya approves. It must include every line and update automatically.',
      hint: 'In E13 type =SUM(E2:E11).',
    },
    {
      id: 'currency',
      type: 'format',
      title: 'Money formatted as currency',
      cells: ['Order!D2:E11', 'Order!E13'],
      format: { numberFormat: 'currency' },
      points: 15,
      why: 'Money that is formatted consistently ($1,234.50) is quicker to read and harder to misread.',
      hint: 'Select D2:E13 and click the $ button in the toolbar.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Tom’s figures left unchanged',
      cells: ['Order!A1:D11'],
      points: 20,
      why: 'Source data belongs to whoever provided it. If you change it, nobody can trust the result. If something looks wrong, ask.',
      hint: 'Use Version history or Undo to get the original values back, or compare with the task description.',
    },
  ],
  passScore: 70,
  xp: 100,
  skills: {
    formulas: 30,
    'data-analysis': 10,
    presentation: 15,
    accuracy: 15,
    'finance-basics': 10,
  },
  feedback: {
    excellent: `Hi {name},

This is spot on. Every line is right, the total is right, and it all updates when Tom changes the quantities, which he already has twice this morning. I’ve approved the order.

Great first task!

Priya`,
    good: `Hi {name},

Thanks, this is nearly there. Have a look at the notes in your task results; once those are fixed it will be perfect.

Priya`,
    pass: `Hi {name},

Thanks for this. It’s usable, but there are a few things I had to fix before approving the order. Please look at the feedback so we get it fully right next time. You’re welcome to improve it and send it again.

Priya`,
    fail: `Hi {name},

Thanks for having a go. I can’t approve the order with this version yet. Please read the feedback, fix the points mentioned and send it again. Ask if anything is unclear; that’s what your first week is for.

Priya`,
  },
}
