import type { AssignmentInput } from '../../schemas'
import { clients, orders } from '../../../tools/datastudio/data'
import type { DataStudioState, Value } from '../../../tools/datastudio/schema'

/**
 * Data Analysis (Data Analyst): build the sales dashboard from saved
 * queries. Teaches: choosing the right chart for each question (a line for
 * time, columns for comparing groups, a single number for a headline), and
 * dashboards that update when the data does.
 */
const orderRows = orders().rows
const months = [...new Set(orderRows.map((r) => String(r[2]).slice(0, 7)))].sort()
const monthly: Value[][] = months.map((m) => [
  m,
  orderRows
    .filter((r) => String(r[2]).startsWith(m))
    .reduce((s, r) => s + Number(r[4]), 0),
])
const services = [...new Set(orderRows.map((r) => String(r[3])))]
const byService: Value[][] = services
  .map((s): [string, number] => [
    s,
    orderRows.filter((r) => r[3] === s).reduce((t, r) => t + Number(r[4]), 0),
  ])
  .sort((a, b) => b[1] - a[1])
const totalOrders: Value[][] = [[orderRows.length]]
const bestService = String(byService[0][0])

const start: DataStudioState = {
  datasets: [clients(), orders()],
  queries: [],
  dashboard: { title: 'Q1 sales dashboard', tiles: [] },
  questions: [
    {
      id: 'service',
      question: 'Which service brought in the most revenue this quarter?',
      kind: 'choice',
      options: [...services].sort(),
      unit: '',
      answer: '',
    },
  ],
}

const solution: DataStudioState = {
  ...start,
  queries: [
    {
      id: 'q1',
      name: 'Monthly revenue',
      sql: "SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue FROM orders GROUP BY month ORDER BY month",
      result: { columns: ['month', 'revenue'], rows: monthly },
      error: '',
    },
    {
      id: 'q2',
      name: 'Revenue by service',
      sql: 'SELECT service, SUM(amount) AS revenue FROM orders GROUP BY service ORDER BY revenue DESC',
      result: { columns: ['service', 'revenue'], rows: byService },
      error: '',
    },
    {
      id: 'q3',
      name: 'Total orders',
      sql: 'SELECT COUNT(*) AS orders FROM orders',
      result: { columns: ['orders'], rows: totalOrders },
      error: '',
    },
  ],
  dashboard: {
    title: 'Q1 sales dashboard',
    tiles: [
      {
        id: 't1',
        title: 'Revenue by month',
        query: 'q1',
        chart: 'line',
        label: 'month',
        value: 'revenue',
      },
      {
        id: 't2',
        title: 'Revenue by service',
        query: 'q2',
        chart: 'column',
        label: 'service',
        value: 'revenue',
      },
      {
        id: 't3',
        title: 'Orders this quarter',
        query: 'q3',
        chart: 'number',
        label: '',
        value: 'orders',
      },
    ],
  },
  questions: start.questions.map((q) => ({ ...q, answer: bestService })),
}

export const studioDashboard: AssignmentInput = {
  id: 'studio-dashboard',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'data-analyst',
  order: 6,
  kind: 'tool',
  title: 'Build the Q1 sales dashboard',
  summary:
    'Turn saved queries into a dashboard: a trend, a comparison and a headline number.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'A dashboard for Monday’s sales meeting',
    body: `Hi {name},

The sales team want a **dashboard** they can look at every Monday instead of asking us for numbers. Please build it in Data Studio, with a saved query behind each chart:

• **Revenue by month**: a **line** chart (month and revenue only, in date order).
• **Revenue by service**: a **column** or **bar** chart (service and revenue).
• **Orders this quarter**: a single **number** (the count of orders).

Then answer the question in **Questions**.

Amara`,
  },
  whyItMatters:
    'Dashboards put the answers people ask for every week in front of them, always up to date. Choosing the right chart for each question (and keeping each query simple and correct) is what makes a dashboard useful rather than decorative.',
  objectives: [
    'Write a query for each chart',
    'Choose the chart that fits the question',
    'Build a dashboard that updates with the data',
  ],
  steps: [
    {
      id: 'queries',
      title: 'Write and save the queries',
      instructions:
        "In **SQL**, write a query for each chart and save it: monthly revenue (`strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue … GROUP BY month ORDER BY month`), revenue by service, and `SELECT COUNT(*) AS orders FROM orders`.",
    },
    {
      id: 'charts',
      title: 'Add the charts',
      instructions:
        'In **Dashboard**, choose a saved query, the chart type, the labels column and the values column, give it a title and click **Add chart**.',
      hint: 'A line shows change over time; columns compare groups; a number tile shows one headline figure.',
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
    title: 'Data Studio: sales dashboard',
    start,
    solution,
    checks: [
      {
        id: 'trend',
        type: 'dashboard',
        tiles: [{ description: 'revenue by month', charts: ['line'], rows: monthly }],
        title: 'Revenue over time, as a line',
        points: 30,
        why: 'Time is best read as a line: the shape of the trend is the message.',
        hint: 'A line chart of a query returning month and revenue only.',
      },
      {
        id: 'comparison',
        type: 'dashboard',
        tiles: [
          {
            description: 'revenue by service',
            charts: ['column', 'bar'],
            rows: byService,
          },
        ],
        title: 'Services compared',
        points: 30,
        why: 'Columns or bars make the comparison between groups obvious.',
        hint: 'A column or bar chart of service and revenue.',
      },
      {
        id: 'headline',
        type: 'dashboard',
        tiles: [
          { description: 'the number of orders', charts: ['number'], rows: totalOrders },
        ],
        title: 'The headline number',
        points: 20,
        why: 'One big number answers “how are we doing?” at a glance.',
        hint: 'A number tile from SELECT COUNT(*) AS orders FROM orders.',
      },
      {
        id: 'answer',
        type: 'answers',
        items: [{ id: 'service', value: bestService, tolerance: 0 }],
        title: 'The question answered',
        points: 20,
        why: 'The dashboard should answer the question at a glance.',
        hint: 'Look at the revenue by service chart.',
      },
    ],
  },
  passScore: 70,
  xp: 140,
  skills: { 'data-visualisation': 55, 'data-analysis': 25, 'insight-communication': 15 },
  feedback: {
    excellent: `Hi {name},

Exactly right: a trend, a comparison and a headline, each the right shape. Sales say it’s the first dashboard they actually understood.

Amara`,
    good: `Hi {name},

A good dashboard; one chart needs fixing. See the notes.

Amara`,
    pass: `Hi {name},

Some charts are missing or show the wrong thing. The notes explain.

Amara`,
    fail: `Hi {name},

Save the three queries first, then build a chart from each.

Amara`,
  },
}
