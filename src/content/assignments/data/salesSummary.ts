import type { AssignmentInput } from '../../schemas'

/**
 * Data 2 (Junior Data Analyst): a pivot-style summary of orders by region
 * and product. Teaches: SUMIFS with mixed references, COUNTIFS and
 * AVERAGEIFS, totals both ways, and a chart.
 */
const prices: Record<string, number> = { Laptops: 900, Monitors: 250, Accessories: 40 }
const orders: Array<[string, string, string, number]> = [
  // month, region, product, units
  ['Jan', 'North', 'Laptops', 3],
  ['Jan', 'North', 'Monitors', 6],
  ['Jan', 'South', 'Accessories', 25],
  ['Jan', 'West', 'Laptops', 2],
  ['Jan', 'South', 'Laptops', 4],
  ['Jan', 'West', 'Accessories', 10],
  ['Feb', 'North', 'Accessories', 30],
  ['Feb', 'South', 'Monitors', 8],
  ['Feb', 'West', 'Monitors', 4],
  ['Feb', 'North', 'Laptops', 5],
  ['Feb', 'West', 'Laptops', 1],
  ['Feb', 'South', 'Accessories', 12],
  ['Feb', 'North', 'Monitors', 2],
  ['Mar', 'South', 'Laptops', 2],
  ['Mar', 'West', 'Monitors', 10],
  ['Mar', 'North', 'Accessories', 8],
  ['Mar', 'West', 'Laptops', 6],
  ['Mar', 'South', 'Monitors', 3],
  ['Mar', 'North', 'Laptops', 1],
  ['Mar', 'West', 'Accessories', 40],
]

const regions = ['North', 'South', 'West']
const products = Object.keys(prices)
const header = { bold: true, fill: 'gray' } as const
const last = orders.length + 1 // 21
const col = (c: string) => `Orders!$${c}$2:$${c}$${last}`
const firstRegion = 3
const lastRegion = firstRegion + regions.length - 1 // 5
const total = lastRegion + 1 // 6
const productCols = ['B', 'C', 'D']

export const salesSummary: AssignmentInput = {
  id: 'sales-summary',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'junior-data-analyst',
  order: 2,
  title: 'Sales by region and product',
  summary:
    'Build a pivot-style summary of the quarter’s orders, with counts, averages and a chart.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Q1 sales: by region and by product',
    body: `Hi {name},

The sales directors want to see the first quarter’s equipment orders broken down two ways at once: by region and by product.

The Orders sheet has every order. On Summary, please build the table of revenue by region and product with totals both ways, then the number of orders, the average order value and the number of large orders (1,000 or more) for each region. Name the best region, and add a chart.

{senior} swears by SUMIFS for this, and rightly so.

Amara`,
  },
  whyItMatters:
    'A summary table with two dimensions (a pivot) is the most common output of a data team. Building it with SUMIFS, COUNTIFS and AVERAGEIFS means it updates itself when the data changes, and anyone can see exactly how each number was made.',
  objectives: [
    'Summarise by two conditions with SUMIFS',
    'Count and average with COUNTIFS and AVERAGEIFS',
    'Use mixed references so one formula fills a whole table',
  ],
  steps: [
    {
      id: 'pivot',
      title: 'Revenue by region and product',
      instructions: `On **Summary**, in **B3**:
\`=SUMIFS(${col('F')}, ${col('C')}, $A3, ${col('D')}, B$2)\`

Then fill it across to D and down to row ${lastRegion}. The $ signs keep the region column and the product row fixed while the formula moves.`,
      hint: 'In SUMIFS, the values to add come first, then each range with its condition.',
    },
    {
      id: 'totals',
      title: 'Totals both ways',
      instructions: `**E3:E${lastRegion}**: the total for each region, e.g. \`=SUM(B3:D3)\`. **Row ${total}**: the total for each product and the grand total, e.g. \`=SUM(B3:B${lastRegion})\`.`,
    },
    {
      id: 'stats',
      title: 'Orders and averages per region',
      instructions: `For each region (rows ${firstRegion} to ${lastRegion}):
- **G** orders: \`=COUNTIFS(${col('C')}, A3)\`
- **H** average order: \`=AVERAGEIFS(${col('F')}, ${col('C')}, A3)\`
- **I** orders of 1,000 or more: \`=COUNTIFS(${col('C')}, A3, ${col('F')}, ">=1000")\``,
    },
    {
      id: 'best',
      title: 'Best region and chart',
      instructions: `In **B8**: \`=INDEX(A3:A${lastRegion}, MATCH(MAX(E3:E${lastRegion}), E3:E${lastRegion}, 0))\`. Then select **A2:D${lastRegion}** and add a chart.`,
    },
  ],
  workbook: {
    title: 'Q1 equipment orders',
    sheets: [
      {
        name: 'Orders',
        columnWidths: { A: 80, B: 70, C: 80, D: 110, E: 60, F: 90 },
        cells: {
          A1: { input: 'Order', format: header },
          B1: { input: 'Month', format: header },
          C1: { input: 'Region', format: header },
          D1: { input: 'Product', format: header },
          E1: { input: 'Units', format: { ...header, align: 'right' } },
          F1: { input: 'Revenue', format: { ...header, align: 'right' } },
          ...Object.fromEntries(
            orders.flatMap(([month, region, product, units], i) => {
              const r = i + 2
              return [
                [`A${r}`, `SO-${String(301 + i)}`],
                [`B${r}`, month],
                [`C${r}`, region],
                [`D${r}`, product],
                [`E${r}`, String(units)],
                [`F${r}`, String(units * prices[product])],
              ]
            }),
          ),
        },
      },
      {
        name: 'Summary',
        columnWidths: {
          A: 160,
          B: 90,
          C: 90,
          D: 100,
          E: 90,
          F: 20,
          G: 70,
          H: 110,
          I: 130,
        },
        cells: {
          A1: { input: 'Revenue by region and product', format: { bold: true } },
          A2: { input: 'Region', format: header },
          ...Object.fromEntries(
            products.map((product, i) => [
              `${productCols[i]}2`,
              { input: product, format: { ...header, align: 'right' } },
            ]),
          ),
          E2: { input: 'Total', format: { ...header, align: 'right' } },
          G2: { input: 'Orders', format: { ...header, align: 'right' } },
          H2: { input: 'Average order', format: { ...header, align: 'right' } },
          I2: { input: 'Orders of 1,000+', format: { ...header, align: 'right' } },
          ...Object.fromEntries(
            regions.map((region, i) => [`A${i + firstRegion}`, region]),
          ),
          [`A${total}`]: { input: 'Total', format: { bold: true } },
          A8: { input: 'Best region', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Summary: {
      ...Object.fromEntries(
        regions.flatMap((_, i) => {
          const r = i + firstRegion
          return [
            ...productCols.map((c) => [
              `${c}${r}`,
              `=SUMIFS(${col('F')}, ${col('C')}, $A${r}, ${col('D')}, ${c}$2)`,
            ]),
            [`E${r}`, `=SUM(B${r}:D${r})`],
            [`G${r}`, `=COUNTIFS(${col('C')}, A${r})`],
            [`H${r}`, `=AVERAGEIFS(${col('F')}, ${col('C')}, A${r})`],
            [`I${r}`, `=COUNTIFS(${col('C')}, A${r}, ${col('F')}, ">=1000")`],
          ]
        }),
      ),
      ...Object.fromEntries(
        [...productCols, 'E'].map((c) => [
          `${c}${total}`,
          `=SUM(${c}${firstRegion}:${c}${lastRegion})`,
        ]),
      ),
      B8: `=INDEX(A${firstRegion}:A${lastRegion}, MATCH(MAX(E${firstRegion}:E${lastRegion}), E${firstRegion}:E${lastRegion}, 0))`,
    },
  },
  scenarios: [
    {
      description: 'A large late order from the South',
      changes: { 'Orders!F15': '7200' },
    },
    {
      description: 'An order was booked to the wrong region',
      changes: { 'Orders!C10': 'West' },
    },
  ],
  checks: [
    {
      id: 'pivot',
      type: 'values',
      title: 'Revenue by region and product',
      cells: [`Summary!B${firstRegion}:D${lastRegion}`],
      requireFormula: true,
      functions: ['SUMIFS'],
      points: 35,
      why: 'Two conditions at once is exactly what SUMIFS is for, and the table updates itself.',
      hint: `B3 =SUMIFS(${col('F')}, ${col('C')}, $A3, ${col('D')}, B$2), filled across and down.`,
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Totals both ways',
      cells: [`Summary!E${firstRegion}:E${lastRegion}`, `Summary!B${total}:E${total}`],
      requireFormula: true,
      points: 15,
      why: 'Totals that agree both ways prove the table adds up.',
      hint: `E3 =SUM(B3:D3); B${total} =SUM(B3:B${lastRegion}).`,
    },
    {
      id: 'stats',
      type: 'values',
      title: 'Orders, average order and large orders',
      cells: [`Summary!G${firstRegion}:I${lastRegion}`],
      requireFormula: true,
      functions: ['COUNTIFS', 'AVERAGEIFS', 'COUNTIF', 'AVERAGEIF'],
      points: 25,
      why: 'Revenue alone hides whether a region has many small orders or a few big ones.',
      hint: 'G3 =COUNTIFS(region range, A3); H3 =AVERAGEIFS(revenue range, region range, A3); I3 adds a second condition ">=1000".',
    },
    {
      id: 'best',
      type: 'values',
      title: 'Best region',
      cells: ['Summary!B8'],
      requireFormula: true,
      functions: ['INDEX', 'XLOOKUP'],
      points: 10,
      why: 'Naming the winner with a formula keeps it right when the data changes.',
      hint: 'B8 =INDEX(A3:A5, MATCH(MAX(E3:E5), E3:E5, 0)).',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of the table',
      cells: [`Summary!A2:D${lastRegion}`],
      points: 10,
      why: 'Directors read charts before tables.',
      hint: 'Select A2:D5 on Summary and add a chart.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Orders left unchanged',
      cells: [`Orders!A1:F${last}`],
      points: 5,
      why: 'The orders come from the sales system and must stay as recorded.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 120,
  skills: { 'data-analysis': 40, formulas: 30, 'data-visualisation': 20, accuracy: 10 },
  feedback: {
    excellent: `Hi {name},

Exactly what the directors wanted: West leads on revenue and on big orders, and the table updates itself. Lovely use of mixed references.

Amara`,
    good: `Hi {name},

Good table; a few numbers to fix. See the notes.

Amara`,
    pass: `Hi {name},

Parts of the summary don’t add up yet. Check the order of the values in SUMIFS.

Amara`,
    fail: `Hi {name},

Not yet. Start with one SUMIFS in B3 and check it by hand before filling it across.

Amara`,
  },
}
