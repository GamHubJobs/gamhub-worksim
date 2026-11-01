import type { AssignmentInput } from '../../schemas'
import { clients, orders } from '../../../tools/datastudio/data'
import type { DataStudioState, Query, Value } from '../../../tools/datastudio/schema'

/**
 * Data Analysis (Data Analyst): answer the sales director's questions with
 * SQL. Teaches: SELECT, JOIN, GROUP BY with SUM and COUNT, ORDER BY and
 * LIMIT, dates, and LEFT JOIN to find what is missing.
 */
const clientRows = clients().rows
const orderRows = orders().rows
const nameOf = (id: Value) => String(clientRows.find((c) => c[0] === id)?.[1] ?? '')
const sectorOf = (id: Value) => String(clientRows.find((c) => c[0] === id)?.[2] ?? '')

function sumBy(key: (row: Value[]) => string): Array<[string, number]> {
  const totals = new Map<string, number>()
  for (const row of orderRows)
    totals.set(key(row), (totals.get(key(row)) ?? 0) + Number(row[4]))
  return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

const bySector = sumBy((r) => sectorOf(r[1]))
const topClients = sumBy((r) => nameOf(r[1])).slice(0, 3)
const months = [...new Set(orderRows.map((r) => String(r[2]).slice(0, 7)))].sort()
const monthly: Value[][] = months.map((m) => {
  const rows = orderRows.filter((r) => String(r[2]).startsWith(m))
  return [m, rows.length, rows.reduce((s, r) => s + Number(r[4]), 0)]
})
const ordered = new Set(orderRows.map((r) => r[1]))
const noOrders: Value[][] = clientRows
  .filter((c) => !ordered.has(c[0]))
  .map((c) => [c[1]])

const start: DataStudioState = {
  datasets: [clients(), orders()],
  queries: [],
  dashboard: { title: 'Dashboard', tiles: [] },
  questions: [],
}

const query = (
  id: string,
  name: string,
  sql: string,
  columns: string[],
  rows: Value[][],
): Query => ({
  id,
  name,
  sql,
  result: { columns, rows },
  error: '',
})

const solution: DataStudioState = {
  ...start,
  queries: [
    query(
      'q1',
      'Revenue by sector',
      'SELECT c.sector, SUM(o.amount) AS revenue FROM orders o JOIN clients c ON c.client_id = o.client_id GROUP BY c.sector ORDER BY revenue DESC',
      ['sector', 'revenue'],
      bySector,
    ),
    query(
      'q2',
      'Top 3 clients',
      'SELECT c.name, SUM(o.amount) AS revenue FROM orders o JOIN clients c ON c.client_id = o.client_id GROUP BY c.name ORDER BY revenue DESC LIMIT 3',
      ['name', 'revenue'],
      topClients,
    ),
    query(
      'q3',
      'Monthly orders and revenue',
      "SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders, SUM(amount) AS revenue FROM orders GROUP BY month ORDER BY month",
      ['month', 'orders', 'revenue'],
      monthly,
    ),
    query(
      'q4',
      'Clients with no orders',
      'SELECT c.name FROM clients c LEFT JOIN orders o ON o.client_id = c.client_id WHERE o.order_id IS NULL',
      ['name'],
      noOrders,
    ),
  ],
}

export const studioSql: AssignmentInput = {
  id: 'studio-sql',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'data-analyst',
  order: 5,
  kind: 'tool',
  title: 'Answer the sales questions with SQL',
  summary: 'Write and save four SQL queries over the orders and clients tables.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Four questions from the sales director',
    body: `Hi {name},

Now that you’re a Data Analyst, you have the **SQL** section of Data Studio. The **orders** table has every order from January to March; **clients** has every client, with their sector. They join on **client_id**.

The sales director wants four answers. Please write a query for each, run it, and **save** it with a clear name:
1. **Revenue by sector**: sector and total revenue, highest first.
2. **The top 3 clients** by revenue: name and total revenue, highest first.
3. **Each month**: the month (as 2026-01), the number of orders and the revenue, in date order.
4. **Clients with no orders at all** this quarter: just their names. (These are the ones sales should call.)

Amara`,
  },
  whyItMatters:
    'SQL is the everyday language of data work: almost every analyst job asks for it. Joining tables, grouping and summarising, and finding what is missing answer most business questions in a few lines, straight from the source data.',
  objectives: [
    'Join two tables on a key',
    'Summarise with GROUP BY, SUM and COUNT, and sort with ORDER BY and LIMIT',
    'Find missing matches with LEFT JOIN',
  ],
  steps: [
    {
      id: 'explore',
      title: 'Look at the tables',
      instructions:
        'In **SQL**, open each table on the left to see its columns. Try `SELECT * FROM orders LIMIT 10` and click **Run**.',
    },
    {
      id: 'sector',
      title: 'Revenue by sector',
      instructions:
        '`SELECT c.sector, SUM(o.amount) AS revenue FROM orders o JOIN clients c ON c.client_id = o.client_id GROUP BY c.sector ORDER BY revenue DESC`. Run it, name it and **Save query**.',
    },
    {
      id: 'top',
      title: 'Top 3 clients',
      instructions: 'The same idea, grouped by client name, with `LIMIT 3` at the end.',
    },
    {
      id: 'monthly',
      title: 'Month by month',
      instructions:
        "`strftime('%Y-%m', order_date)` turns a date into its month. Group by it, with `COUNT(*)` and `SUM(amount)`, and `ORDER BY` the month.",
    },
    {
      id: 'missing',
      title: 'Clients with no orders',
      instructions:
        'Start from clients and `LEFT JOIN` orders: clients with no orders get NULL in the order columns. Keep only those with `WHERE o.order_id IS NULL`.',
      hint: 'A normal JOIN drops clients without orders, which is exactly the opposite of what you want here.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Check all four are saved, then click **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'datastudio',
    title: 'Data Studio: Q1 sales',
    start,
    solution,
    checks: [
      {
        id: 'by-sector',
        type: 'query',
        description: 'revenue by sector, highest first',
        rows: bySector,
        ordered: true,
        title: 'Revenue by sector',
        points: 25,
        why: 'Joining orders to clients is what turns transactions into a view of the business.',
        hint: 'JOIN clients, GROUP BY sector, SUM(amount), ORDER BY the total DESC.',
      },
      {
        id: 'top-clients',
        type: 'query',
        description: 'the top 3 clients by revenue',
        rows: topClients,
        ordered: true,
        title: 'Top 3 clients',
        points: 25,
        why: 'Knowing who matters most is the start of every account plan.',
        hint: 'GROUP BY the client name, ORDER BY revenue DESC, LIMIT 3.',
      },
      {
        id: 'monthly',
        type: 'query',
        description: 'orders and revenue per month, in date order',
        rows: monthly,
        ordered: true,
        title: 'Month by month',
        points: 25,
        why: 'Trends over time are the first thing every director asks for.',
        hint: "strftime('%Y-%m', order_date) AS month, COUNT(*), SUM(amount), GROUP BY month ORDER BY month.",
      },
      {
        id: 'no-orders',
        type: 'query',
        description: 'the clients with no orders',
        rows: noOrders,
        ordered: false,
        title: 'Clients with no orders',
        points: 25,
        why: 'What is missing from the data is often the most useful answer.',
        hint: 'clients LEFT JOIN orders … WHERE o.order_id IS NULL.',
      },
    ],
  },
  passScore: 70,
  xp: 150,
  skills: {
    'data-analysis': 50,
    'data-cleaning': 10,
    accuracy: 25,
    'insight-communication': 10,
  },
  feedback: {
    excellent: `Hi {name},

Four clean queries, four right answers. Manufacturing leads, and sales are calling the two clients who ordered nothing. Saved queries mean we can rerun all of this next quarter in seconds.

Amara`,
    good: `Hi {name},

Good SQL; one or two results don’t match yet. See the notes.

Amara`,
    pass: `Hi {name},

Some answers are missing or wrong. Check the joins and the grouping: the notes say which.

Amara`,
    fail: `Hi {name},

Start with SELECT * FROM orders LIMIT 10, then build up from there.

Amara`,
  },
}
