import type { AssignmentInput } from '../../schemas'

/**
 * Accounting 3 (Assistant Accountant): a fixed-asset depreciation schedule
 * and a memo explaining this year's charge. Teaches: straight-line
 * depreciation, capping with MIN, IF for fully depreciated assets, and
 * explaining a number to a non-accountant.
 */
const assets: Array<[string, string, string, string, string]> = [
  // name, cost, residual value, useful life (years), years used
  ['Laptops (12)', '18000', '1800', '3', '1'],
  ['Office furniture', '24000', '2000', '8', '3'],
  ['File server', '15000', '1000', '5', '2'],
  ['Company car', '28000', '8000', '5', '4'],
  ['Printers', '6000', '0', '4', '5'],
  ['Phone system', '9000', '500', '6', '1'],
]

const header = { bold: true, fill: 'gray' } as const
const last = assets.length + 1 // 7

export const depreciation: AssignmentInput = {
  id: 'depreciation-schedule',
  version: 1,
  careerId: 'accounting',
  levelId: 'assistant-accountant',
  order: 5,
  title: 'Depreciation schedule and memo',
  summary:
    'Calculate depreciation for every fixed asset and explain this year’s charge in a memo.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Fixed assets: depreciation for the year',
    body: `Hi {name},

Congratulations on becoming an Assistant Accountant. Your first job in the new role: the **depreciation schedule**.

When we buy equipment, we don’t treat the whole cost as an expense on day one. We spread it over the years we use it: that yearly expense is **depreciation**. We use the straight-line method: (cost − residual value) ÷ useful life.

In the workbook, for each asset, please work out the annual depreciation, the depreciation charged so far (never more than cost minus residual value), the net book value, and this year’s charge (zero for assets past their useful life). Then add the totals.

Finally, write me a short **memo in Word Craft** for {director} explaining this year’s depreciation charge, the total net book value, and which asset is fully depreciated and may need replacing.

Daniel`,
  },
  whyItMatters:
    'Depreciation matches the cost of an asset with the years it helps earn income, which makes profits comparable from year to year. Fixed-asset schedules are audited closely, and explaining them clearly to non-accountants is a core part of the job.',
  objectives: [
    'Calculate straight-line depreciation',
    'Cap accumulated depreciation with MIN',
    'Recognise fully depreciated assets with IF',
    'Explain an accounting figure clearly in a memo',
  ],
  steps: [
    {
      id: 'annual',
      title: 'Annual depreciation',
      instructions: `In **F2**: \`=(B2-C2)/D2\` (cost minus residual value, over the useful life). Fill down to F${last}.`,
    },
    {
      id: 'accumulated',
      title: 'Depreciation so far and net book value',
      instructions: `- **G2** accumulated depreciation: \`=MIN(F2*E2, B2-C2)\`. MIN stops it going beyond cost minus residual value.
- **H2** net book value: \`=B2-G2\`

Fill both down.`,
      hint: 'The printers are five years old but have a useful life of four: without MIN, their accumulated depreciation would be more than they cost.',
    },
    {
      id: 'charge',
      title: 'This year’s charge',
      instructions: `In **I2**: \`=IF(E2<=D2, F2, 0)\`: an asset still within its useful life is depreciated this year; one past it is not. Fill down, then total columns B, F, G, H and I in row 9.`,
    },
    {
      id: 'memo',
      title: 'Write the memo',
      instructions: `In **Word Craft**, open **Depreciation memo** (a memo template). In plain words, for {director}: this year’s total depreciation charge (I9), the total net book value of our assets (H9), and which asset is fully depreciated. 80 to 300 words. Then reply to the email with the workbook and the memo attached.`,
    },
  ],
  workbook: {
    title: 'Fixed asset register',
    sheets: [
      {
        name: 'Assets',
        columnWidths: {
          A: 160,
          B: 90,
          C: 100,
          D: 90,
          E: 90,
          F: 110,
          G: 120,
          H: 120,
          I: 120,
        },
        cells: {
          A1: { input: 'Asset', format: header },
          B1: { input: 'Cost', format: { ...header, align: 'right' } },
          C1: { input: 'Residual value', format: { ...header, align: 'right' } },
          D1: { input: 'Life (years)', format: { ...header, align: 'right' } },
          E1: { input: 'Years used', format: { ...header, align: 'right' } },
          F1: { input: 'Annual', format: { ...header, align: 'right' } },
          G1: { input: 'Accumulated', format: { ...header, align: 'right' } },
          H1: { input: 'Net book value', format: { ...header, align: 'right' } },
          I1: { input: 'Charge this year', format: { ...header, align: 'right' } },
          ...Object.fromEntries(
            assets.flatMap(([name, cost, residual, life, used], i) => [
              [`A${i + 2}`, name],
              [`B${i + 2}`, cost],
              [`C${i + 2}`, residual],
              [`D${i + 2}`, life],
              [`E${i + 2}`, used],
            ]),
          ),
          A9: { input: 'Total', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Assets: {
      ...Object.fromEntries(
        assets.flatMap((_, i) => {
          const r = i + 2
          return [
            [`F${r}`, `=(B${r}-C${r})/D${r}`],
            [`G${r}`, `=MIN(F${r}*E${r}, B${r}-C${r})`],
            [`H${r}`, `=B${r}-G${r}`],
            [`I${r}`, `=IF(E${r}<=D${r}, F${r}, 0)`],
          ]
        }),
      ),
      B9: `=SUM(B2:B${last})`,
      F9: `=SUM(F2:F${last})`,
      G9: `=SUM(G2:G${last})`,
      H9: `=SUM(H2:H${last})`,
      I9: `=SUM(I2:I${last})`,
    },
  },
  scenarios: [
    {
      description: 'The company car is used for a fifth year',
      changes: { 'Assets!E5': '5' },
    },
  ],
  checks: [
    {
      id: 'annual',
      type: 'values',
      title: 'Annual depreciation',
      cells: [`Assets!F2:F${last}`],
      requireFormula: true,
      points: 15,
      why: 'Straight-line depreciation spreads the cost evenly over the asset’s useful life.',
      hint: 'F2 =(B2-C2)/D2, filled down.',
    },
    {
      id: 'accumulated',
      type: 'values',
      title: 'Accumulated depreciation and net book value',
      cells: [`Assets!G2:H${last}`],
      requireFormula: true,
      points: 20,
      why: 'An asset can never be depreciated below its residual value.',
      hint: 'G2 =MIN(F2*E2, B2-C2), H2 =B2-G2, filled down.',
    },
    {
      id: 'charge',
      type: 'values',
      title: 'This year’s charge',
      cells: [`Assets!I2:I${last}`],
      requireFormula: true,
      functions: ['IF'],
      points: 15,
      why: 'Fully depreciated assets stop adding to the expense.',
      hint: 'I2 =IF(E2<=D2, F2, 0), filled down.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Totals',
      cells: ['Assets!B9', 'Assets!F9:I9'],
      requireFormula: true,
      points: 10,
      why: 'The totals go straight into the accounts.',
      hint: 'Use =SUM(...) for columns B, F, G, H and I in row 9.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Asset register left unchanged',
      cells: [`Assets!A1:E${last}`],
      points: 5,
      why: 'Costs and lives come from purchase invoices and company policy.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Depreciation memo',
      template: 'memo',
      checks: [
        {
          id: 'memo-figures',
          type: 'figures',
          title: 'Key figures in the memo',
          figures: [
            { label: 'depreciation charge for this year', cell: 'Assets!I9' },
            { label: 'total net book value', cell: 'Assets!H9' },
          ],
          points: 20,
          why: 'The reader needs the two numbers that go into the accounts.',
          hint: 'Quote I9 (this year’s charge) and H9 (net book value) from the workbook.',
        },
        {
          id: 'memo-asset',
          type: 'mentions',
          title: 'Fully depreciated asset named',
          terms: [['Printers', 'printer']],
          points: 10,
          why: 'Fully depreciated assets often need replacing; that is a budget decision.',
          hint: 'Which asset has a charge of 0 this year?',
        },
        {
          id: 'memo-length',
          type: 'length',
          min: 80,
          max: 300,
          title: 'A memo, not an essay',
          points: 5,
          why: 'Memos are read in a minute. Keep them short.',
          hint: 'Aim for 80 to 300 words; remove the template’s placeholders.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 160,
  skills: { 'financial-reporting': 35, formulas: 25, accuracy: 25, bookkeeping: 15 },
  feedback: {
    excellent: `Hi {name},

Spot on, and the memo is exactly the right length and tone for the CFO. The printers do need replacing; I’ll put it in next year’s budget.

Daniel`,
    good: `Hi {name},

Good schedule. A couple of details to fix; see the notes.

Daniel`,
    pass: `Hi {name},

The schedule needs some fixes before it goes into the accounts. Look at the notes, especially the MIN cap.

Daniel`,
    fail: `Hi {name},

Not ready yet. Start with the annual depreciation and work across the columns.

Daniel`,
  },
}
