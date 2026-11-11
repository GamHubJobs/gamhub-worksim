import type { AssignmentInput } from '../../schemas'
import { PLANS, subscriptionsRaw } from '../../../tools/datastudio/data'
import type { DataStudioState, Step, Value } from '../../../tools/datastudio/schema'
import { cleanTable } from '../../../tools/datastudio/transform'

/**
 * Data Analysis integrated project (Lead Data Analyst): why are customers
 * leaving? Three linked stages under one brief from the head of customer
 * success:
 *
 * 1. Data Studio: clean the subscriptions export and measure churn by plan.
 * 2. Data Studio: a churn dashboard and the monthly revenue lost.
 * 3. Grid Craft and Docs: the figures by plan and a findings memo.
 *
 * Teaches: rates as well as counts, and that the biggest rate is not always
 * the biggest cost (Premium loses fewer customers but more revenue).
 */
const PROJECT = 'churn-investigation'

const STEPS: Step[] = [
  { kind: 'remove-blank', column: 'customer_id' },
  { kind: 'dedupe', columns: ['customer_id'] },
  { kind: 'trim', column: 'plan' },
  { kind: 'case', column: 'plan', to: 'proper' },
  { kind: 'case', column: 'status', to: 'proper' },
  { kind: 'type', column: 'monthly_fee', to: 'number' },
]

const raw = subscriptionsRaw()
const clean = cleanTable({ ...raw, steps: STEPS }).table
const col = (name: string) => clean.columns.findIndex((c) => c.name === name)
const isCancelled = (row: Value[]) => row[col('status')] === 'Cancelled'
const rate = (rows: Value[][]) =>
  Math.round((1000 * rows.filter(isCancelled).length) / rows.length) / 10

function byGroup(column: string): Array<{ name: string; rows: Value[][] }> {
  const names = [...new Set(clean.rows.map((r) => String(r[col(column)])))]
  return names.map((name) => ({
    name,
    rows: clean.rows.filter((r) => String(r[col(column)]) === name),
  }))
}

const plans = byGroup('plan')
const churnByPlan: Value[][] = plans
  .map(({ name, rows }) => [
    name,
    rows.length,
    rows.filter(isCancelled).length,
    rate(rows),
  ])
  .sort((a, b) => Number(b[3]) - Number(a[3]))
const rateByPlan: Value[][] = plans.map(({ name, rows }) => [name, rate(rows)])
const rateByRegion: Value[][] = byGroup('region').map(({ name, rows }) => [
  name,
  rate(rows),
])
const lostRevenue = clean.rows
  .filter(isCancelled)
  .reduce((sum, r) => sum + Number(r[col('monthly_fee')]), 0)
const highestChurn = String(churnByPlan[0][0])

const PLAN_LIST = PLANS.map((p) => p.name)

const SQL = {
  churn:
    "SELECT plan, COUNT(*) AS customers, SUM(status = 'Cancelled') AS cancelled, ROUND(100.0 * SUM(status = 'Cancelled') / COUNT(*), 1) AS churn_pct FROM subscriptions GROUP BY plan ORDER BY churn_pct DESC",
  planRate:
    "SELECT plan, ROUND(100.0 * SUM(status = 'Cancelled') / COUNT(*), 1) AS churn_pct FROM subscriptions GROUP BY plan",
  regionRate:
    "SELECT region, ROUND(100.0 * SUM(status = 'Cancelled') / COUNT(*), 1) AS churn_pct FROM subscriptions GROUP BY region",
  lost: "SELECT SUM(monthly_fee) AS lost_revenue FROM subscriptions WHERE status = 'Cancelled'",
}

const feedback = (excellent: string) => ({
  excellent: `Hi {name},

${excellent}

Amara`,
  good: `Hi {name},

Good work; a couple of things need fixing before customer success see it. See the notes.

Amara`,
  pass: `Hi {name},

The basics are there, but some results are not right yet. The notes explain which.

Amara`,
  fail: `Hi {name},

Not yet. Have a look at the notes and try again.

Amara`,
})

// ---------------------------------------------------------------------------
// Stage 1: clean the export and measure churn by plan
// ---------------------------------------------------------------------------

const stage1Start: DataStudioState = {
  datasets: [raw],
  queries: [],
  dashboard: { title: 'Churn dashboard', tiles: [] },
  questions: [
    {
      id: 'highest',
      question: 'Which plan loses the highest share of its customers?',
      kind: 'choice',
      options: PLAN_LIST,
      unit: '',
      answer: '',
    },
  ],
}

const stage1Query = {
  id: 'q1',
  name: 'Churn by plan',
  sql: SQL.churn,
  result: { columns: ['plan', 'customers', 'cancelled', 'churn_pct'], rows: churnByPlan },
  error: '',
}

const stage1Solution: DataStudioState = {
  ...stage1Start,
  datasets: [{ ...raw, steps: STEPS }],
  queries: [stage1Query],
  questions: stage1Start.questions.map((q) => ({ ...q, answer: highestChurn })),
}

export const churnClean: AssignmentInput = {
  id: 'churn-clean',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'lead-data-analyst',
  order: 9,
  projectId: PROJECT,
  stage: 1,
  kind: 'tool',
  title: 'Churn investigation, stage 1: clean and measure',
  summary:
    'Clean the subscriptions export and measure how many customers each plan loses.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Project: why are customers leaving?',
    body: `Hi {name},

Customer success have noticed more cancellations and want to know **why customers are leaving and what it costs us**. As Lead Analyst, please run this as a project in three stages; each opens when the one before is done:

1. **Clean and measure** (this email).
2. **A churn dashboard** and the revenue we are losing.
3. **Findings**: the figures by plan and a short memo.

The **subscriptions** dataset in Data Studio is the billing system’s export, with the usual problems: plan names in different capitals and spacing, status in different capitals, fees as text, two customers exported twice and a test row with no customer.

Clean it with steps so that every customer appears once, plan and status are consistent, and monthly_fee is a number. Then save a query called **Churn by plan** that gives, for each plan, the number of **customers**, how many **cancelled**, and the **churn %** (cancelled ÷ customers × 100, to one decimal place). Answer the question, then submit.

Amara`,
  },
  whyItMatters:
    'Churn is one of the most important numbers in any subscription business. Measuring it correctly starts with clean data (a duplicate customer or a test row changes the rate) and with comparing rates, not just counts.',
  objectives: [
    'Clean a real export with repeatable steps',
    'Measure churn as a rate for each group',
    'Write a grouped query with a calculated percentage',
  ],
  steps: [
    {
      id: 'clean',
      title: 'Clean the export',
      instructions:
        'In **Data**, add steps: **Remove blank rows** (customer_id), **Remove duplicates** (customer_id), **Trim spaces** and **Change capitals** (Capitalise Each Word) on plan, change capitals on status, and **Change type** of monthly_fee to number.',
    },
    {
      id: 'query',
      title: 'Churn by plan',
      instructions:
        "In **SQL**, write and save: `SELECT plan, COUNT(*) AS customers, SUM(status = 'Cancelled') AS cancelled, ROUND(100.0 * SUM(status = 'Cancelled') / COUNT(*), 1) AS churn_pct FROM subscriptions GROUP BY plan ORDER BY churn_pct DESC`.",
      hint: "SUM(status = 'Cancelled') counts the rows where the condition is true.",
    },
    {
      id: 'answer',
      title: 'Answer and hand in',
      instructions:
        'Answer the question in **Questions**, then click **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'datastudio',
    title: 'Data Studio: churn investigation',
    start: stage1Start,
    solution: stage1Solution,
    checks: [
      {
        id: 'clean',
        type: 'cleaned',
        dataset: 'subscriptions',
        rows: clean.rows.length,
        unique: 'customer_id',
        noBlanks: ['customer_id'],
        types: { monthly_fee: 'number' },
        allowed: [
          { column: 'plan', values: PLAN_LIST },
          { column: 'status', values: ['Active', 'Cancelled'] },
        ],
        title: 'A clean customer list',
        points: 40,
        why: 'A duplicate customer or a test row would change every churn rate.',
        hint: `${clean.rows.length} customers, each once; plans Basic, Standard and Premium; status Active or Cancelled; fees as numbers.`,
      },
      {
        id: 'churn',
        type: 'query',
        description: 'the customers, cancellations and churn % of each plan',
        rows: churnByPlan,
        title: 'Churn by plan',
        points: 40,
        why: 'Rates make plans of different sizes comparable.',
        hint: 'GROUP BY plan; churn_pct is cancelled ÷ customers × 100, rounded to 1 decimal place.',
      },
      {
        id: 'answer',
        type: 'answers',
        items: [{ id: 'highest', value: highestChurn, tolerance: 0 }],
        title: 'The plan with the highest churn',
        points: 20,
        why: 'This is the first thing customer success will ask.',
        hint: 'Read it from the top row of your query.',
      },
    ],
  },
  passScore: 70,
  xp: 160,
  skills: { 'data-cleaning': 35, 'data-analysis': 35 },
  feedback: feedback(
    `Clean data and a clear first result: ${highestChurn} customers leave most often. Stage 2 is in your inbox.`,
  ),
}

// ---------------------------------------------------------------------------
// Stage 2: the churn dashboard and the revenue lost
// ---------------------------------------------------------------------------

const stage2Start: DataStudioState = {
  ...stage1Solution,
  questions: [
    {
      id: 'lost',
      question: 'How much monthly revenue do the cancelled customers represent?',
      kind: 'number',
      options: [],
      unit: '£',
      answer: '',
    },
  ],
}

const stage2Queries = [
  {
    id: 'q2',
    name: 'Churn rate by plan',
    sql: SQL.planRate,
    result: { columns: ['plan', 'churn_pct'], rows: rateByPlan },
    error: '',
  },
  {
    id: 'q3',
    name: 'Churn rate by region',
    sql: SQL.regionRate,
    result: { columns: ['region', 'churn_pct'], rows: rateByRegion },
    error: '',
  },
  {
    id: 'q4',
    name: 'Monthly revenue lost',
    sql: SQL.lost,
    result: { columns: ['lost_revenue'], rows: [[lostRevenue]] },
    error: '',
  },
]

const stage2Solution: DataStudioState = {
  ...stage2Start,
  queries: [...stage2Start.queries, ...stage2Queries],
  dashboard: {
    title: 'Churn dashboard',
    tiles: [
      {
        id: 't1',
        title: 'Churn by plan',
        query: 'q2',
        chart: 'column',
        label: 'plan',
        value: 'churn_pct',
      },
      {
        id: 't2',
        title: 'Churn by region',
        query: 'q3',
        chart: 'column',
        label: 'region',
        value: 'churn_pct',
      },
      {
        id: 't3',
        title: 'Monthly revenue lost',
        query: 'q4',
        chart: 'number',
        label: '',
        value: 'lost_revenue',
      },
    ],
  },
  questions: stage2Start.questions.map((q) => ({ ...q, answer: String(lostRevenue) })),
}

export const churnDashboard: AssignmentInput = {
  id: 'churn-dashboard',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'lead-data-analyst',
  order: 10,
  projectId: PROJECT,
  stage: 2,
  kind: 'tool',
  title: 'Churn investigation, stage 2: the churn dashboard',
  summary: 'Build a churn dashboard and work out the monthly revenue lost.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Churn investigation, stage 2: the dashboard',
    body: `Hi {name},

Thanks: clean data at last. Customer success want a **churn dashboard** they can check every month. In the same Data Studio file, please add:

• **Churn by plan**: a **column** or **bar** chart of plan and churn % (a query returning just those two columns).
• **Churn by region**: the same by region.
• **Monthly revenue lost**: a single **number**, the total monthly fee of the cancelled customers.

Then answer the question and submit.

Amara`,
  },
  whyItMatters:
    'A churn rate tells you who leaves; the revenue lost tells you what it costs. Putting both on a dashboard that updates with the data turns a one-off analysis into something the business can watch.',
  objectives: [
    'Compare churn across groups on a dashboard',
    'Measure the cost of churn, not just the rate',
    'Keep each chart backed by a simple, correct query',
  ],
  steps: [
    {
      id: 'queries',
      title: 'Queries',
      instructions:
        "Save three queries: churn % by plan (`SELECT plan, ROUND(100.0 * SUM(status = 'Cancelled') / COUNT(*), 1) AS churn_pct FROM subscriptions GROUP BY plan`), the same by region, and `SELECT SUM(monthly_fee) AS lost_revenue FROM subscriptions WHERE status = 'Cancelled'`.",
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      instructions:
        'In **Dashboard**, add a column chart for each rate and a number tile for the revenue lost.',
    },
    {
      id: 'answer',
      title: 'Answer and hand in',
      instructions: 'Answer the question, then click **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'datastudio',
    title: 'Data Studio: churn dashboard',
    start: stage2Start,
    solution: stage2Solution,
    checks: [
      {
        id: 'by-plan',
        type: 'dashboard',
        tiles: [
          { description: 'churn % by plan', charts: ['column', 'bar'], rows: rateByPlan },
        ],
        title: 'Churn by plan',
        points: 30,
        why: 'Columns make the difference between plans obvious.',
        hint: 'A column or bar chart of a query returning plan and churn_pct only.',
      },
      {
        id: 'by-region',
        type: 'dashboard',
        tiles: [
          {
            description: 'churn % by region',
            charts: ['column', 'bar'],
            rows: rateByRegion,
          },
        ],
        title: 'Churn by region',
        points: 25,
        why: 'Region rules out (or points to) a local cause.',
        hint: 'The same query grouped by region.',
      },
      {
        id: 'lost',
        type: 'dashboard',
        tiles: [
          {
            description: 'the monthly revenue lost',
            charts: ['number'],
            rows: [[lostRevenue]],
          },
        ],
        title: 'Revenue lost, as a headline',
        points: 25,
        why: 'The cost of churn is the number that gets a budget approved.',
        hint: "A number tile of SUM(monthly_fee) for status = 'Cancelled'.",
      },
      {
        id: 'answer',
        type: 'answers',
        items: [{ id: 'lost', value: lostRevenue, tolerance: 0 }],
        title: 'The monthly revenue lost',
        points: 20,
        why: 'The memo will lead with this figure.',
        hint: 'Read it from your number tile.',
      },
    ],
  },
  passScore: 70,
  xp: 160,
  skills: { 'data-visualisation': 40, 'data-analysis': 25 },
  feedback: feedback(
    `A dashboard customer success can use every month. £${lostRevenue} of monthly revenue is walking out of the door. Stage 3 is in your inbox.`,
  ),
}

// ---------------------------------------------------------------------------
// Stage 3: the figures by plan and the findings memo (Grid Craft and Docs)
// ---------------------------------------------------------------------------

const header = { bold: true, fill: 'gray' } as const
const planRows = PLANS.map((plan) => {
  const group = plans.find((p) => p.name === plan.name)!
  return {
    ...plan,
    customers: group.rows.length,
    cancelled: group.rows.filter(isCancelled).length,
  }
})
const premiumLost = planRows.find((p) => p.name === 'Premium')!

export const churnFindings: AssignmentInput = {
  id: 'churn-findings',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'lead-data-analyst',
  order: 11,
  projectId: PROJECT,
  stage: 3,
  title: 'Churn investigation, stage 3: findings',
  summary: 'Work out churn and revenue lost by plan, and write the findings memo.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Churn investigation, stage 3: the findings',
    body: `Hi {name},

Last stage. The head of customer success wants the findings in writing.

**1. The figures (Grid Craft).** The workbook has each plan’s customers, cancellations and monthly fee. Add the **churn rate** (cancelled ÷ customers, as a %) and the **monthly revenue lost** (cancelled × fee) for each plan, the **totals**, and a chart of revenue lost by plan.

**2. The memo (Docs).** A short findings memo: the **overall churn rate**, the **total monthly revenue lost**, which plan loses the most customers and which **loses the most revenue** (they are not the same!), and what you recommend.

Reply to this email with the workbook and the memo attached.

Amara`,
  },
  whyItMatters:
    'The most useful analyses change a decision. Here the plan with the highest churn is not the one costing the most, and saying that clearly, with the figures, is what stops a business putting effort in the wrong place.',
  objectives: [
    'Calculate rates and the revenue impact of churn',
    'Spot when the biggest rate is not the biggest cost',
    'Write findings that lead to a decision',
  ],
  steps: [
    {
      id: 'figures',
      title: 'Rates and revenue lost',
      instructions:
        'For rows 2 to 4: **E** churn rate `=C2/B2` (format as %), **F** revenue lost `=C2*D2`. Row 5: totals `=SUM(B2:B4)`, `=SUM(C2:C4)`, `=C5/B5` and `=SUM(F2:F4)`.',
    },
    {
      id: 'chart',
      title: 'Chart',
      instructions: 'Select **A1:F4** and add a column chart of the plans.',
      hint: 'A column chart of plan and revenue lost makes Premium stand out.',
    },
    {
      id: 'memo',
      title: 'The memo',
      instructions:
        'In **Docs**, open **Churn findings memo**: the overall churn rate, the revenue lost, the plan with the highest churn (Basic) and the one losing the most revenue (Premium), and your recommendation. 150 to 600 words.',
    },
    {
      id: 'send',
      title: 'Hand in',
      instructions: 'Reply to {manager}’s email with the workbook and the memo attached.',
    },
  ],
  workbook: {
    title: 'Churn by plan',
    sheets: [
      {
        name: 'Plans',
        columnWidths: { A: 110, B: 100, C: 100, D: 110, E: 100, F: 130 },
        cells: {
          A1: { input: 'Plan', format: header },
          B1: { input: 'Customers', format: { ...header, align: 'right' } },
          C1: { input: 'Cancelled', format: { ...header, align: 'right' } },
          D1: { input: 'Monthly fee', format: { ...header, align: 'right' } },
          E1: { input: 'Churn rate', format: { ...header, align: 'right' } },
          F1: { input: 'Revenue lost', format: { ...header, align: 'right' } },
          ...Object.fromEntries(
            planRows.flatMap((p, i) => [
              [`A${i + 2}`, p.name],
              [`B${i + 2}`, String(p.customers)],
              [`C${i + 2}`, String(p.cancelled)],
              [`D${i + 2}`, String(p.fee)],
            ]),
          ),
          A5: { input: 'Total', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Plans: {
      ...Object.fromEntries(
        [2, 3, 4].flatMap((r) => [
          [`E${r}`, `=C${r}/B${r}`],
          [`F${r}`, `=C${r}*D${r}`],
        ]),
      ),
      B5: '=SUM(B2:B4)',
      C5: '=SUM(C2:C4)',
      E5: '=C5/B5',
      F5: '=SUM(F2:F4)',
    },
  },
  scenarios: [
    {
      description: 'Two more Premium customers cancel',
      changes: { 'Plans!C4': String(premiumLost.cancelled + 2) },
    },
  ],
  checks: [
    {
      id: 'rates',
      type: 'values',
      title: 'Churn rate by plan',
      cells: ['Plans!E2:E4'],
      requireFormula: true,
      points: 15,
      why: 'Rates compare plans of different sizes fairly.',
      hint: 'In E2 type =C2/B2 and fill it down.',
    },
    {
      id: 'lost',
      type: 'values',
      title: 'Revenue lost by plan',
      cells: ['Plans!F2:F4'],
      requireFormula: true,
      points: 15,
      why: 'Revenue lost shows where churn hurts most.',
      hint: 'In F2 type =C2*D2 and fill it down.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Totals and the overall rate',
      cells: ['Plans!B5:C5', 'Plans!E5:F5'],
      requireFormula: true,
      points: 10,
      why: 'The overall rate and the total lost are the memo’s headline.',
      hint: 'B5 and C5 =SUM(…), E5 =C5/B5, F5 =SUM(F2:F4).',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of the plans',
      cells: ['Plans!A1:F4'],
      points: 5,
      why: 'A chart makes the Premium surprise visible at once.',
      hint: 'Select the table and add a chart.',
    },
    {
      id: 'unchanged',
      type: 'unchanged',
      title: 'Data left unchanged',
      cells: ['Plans!A1:D4'],
      points: 5,
      why: 'The figures come from your stage 1 and 2 results.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Churn findings memo',
      template: 'report',
      checks: [
        {
          id: 'memo-sections',
          type: 'sections',
          title: 'Memo structure',
          sections: [
            ['Executive summary', 'Summary'],
            ['Findings'],
            ['Recommendations', 'Recommendation'],
          ],
          points: 10,
          why: 'Customer success will read the summary and the recommendation first.',
          hint: 'Keep the headings: Executive summary, Findings, Recommendations.',
        },
        {
          id: 'memo-figures',
          type: 'figures',
          title: 'The key figures',
          figures: [
            { label: 'overall churn rate', cell: 'Plans!E5', percent: true },
            { label: 'total monthly revenue lost', cell: 'Plans!F5' },
            { label: 'monthly revenue lost from Premium', cell: 'Plans!F4' },
          ],
          points: 25,
          why: 'Every figure must match the analysis.',
          hint: 'E5 and F5 for the totals, F4 for Premium.',
        },
        {
          id: 'memo-insight',
          type: 'mentions',
          title: 'The two plans named',
          terms: [['Basic'], ['Premium']],
          points: 10,
          why: 'The insight is that the plan losing most customers is not the one losing most money.',
          hint: 'Name Basic (highest churn) and Premium (most revenue lost).',
        },
        {
          id: 'memo-length',
          type: 'length',
          min: 150,
          max: 600,
          title: 'Length',
          points: 5,
          why: 'Short enough to be read today.',
          hint: 'Aim for 150 to 600 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 200,
  skills: { 'insight-communication': 40, 'data-analysis': 25, formulas: 15 },
  feedback: feedback(
    'Customer success have the answer they needed: Basic customers leave most often, but Premium cancellations cost the most, so that is where to act first. A complete investigation, from raw export to recommendation. Well done.',
  ),
}
