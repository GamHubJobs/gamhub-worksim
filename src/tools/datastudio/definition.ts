/** Data Studio: its registration with the tools framework. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { sampleStudio } from './data'
import {
  COLUMN_TYPES,
  DataStudioStateSchema,
  Value,
  type DataStudioState,
} from './schema'
import { sameResult } from './sql'
import { cleanTable } from './transform'

export const DataStudioCheckSchema = z.discriminatedUnion('type', [
  /** A dataset's clean table meets these conditions. */
  FileCheckBaseSchema.extend({
    type: z.literal('cleaned'),
    dataset: z.string(),
    rows: z.number().int().optional(),
    /** No two rows share a value in this column. */
    unique: z.string().optional(),
    noBlanks: z.array(z.string()).default([]),
    types: z.record(z.string(), z.enum(COLUMN_TYPES)).default({}),
    /** Every value of the column is one of these (exactly, case included). */
    allowed: z
      .array(z.object({ column: z.string(), values: z.array(z.string()) }))
      .default([]),
  }),
  /** A saved query's last result has exactly these rows. */
  FileCheckBaseSchema.extend({
    type: z.literal('query'),
    description: z.string(),
    rows: z.array(z.array(Value)),
    ordered: z.boolean().default(false),
    tolerance: z.number().min(0).default(0.01),
  }),
  /** The dashboard has charts of these kinds, each showing a result with these rows. */
  FileCheckBaseSchema.extend({
    type: z.literal('dashboard'),
    tiles: z
      .array(
        z.object({
          description: z.string(),
          charts: z.array(z.enum(['column', 'bar', 'line', 'pie', 'number'])).min(1),
          rows: z.array(z.array(Value)),
        }),
      )
      .min(1),
  }),
  /** The task's questions are answered correctly. */
  FileCheckBaseSchema.extend({
    type: z.literal('answers'),
    items: z
      .array(
        z.object({
          id: z.string(),
          value: z.union([z.number(), z.string()]),
          tolerance: z.number().min(0).default(0),
        }),
      )
      .min(1),
  }),
])
export type DataStudioCheck = z.infer<typeof DataStudioCheckSchema>

const blank = (v: Value) => v === null || (typeof v === 'string' && v.trim() === '')

function gradeCheck(check: DataStudioCheck, player: DataStudioState) {
  switch (check.type) {
    case 'cleaned': {
      const dataset = player.datasets.find((d) => d.name === check.dataset)
      if (!dataset)
        return checkResult(check, 0, [`There is no dataset called ${check.dataset}.`])
      const { table } = cleanTable(dataset)
      const index = (name: string) => table.columns.findIndex((c) => c.name === name)
      const problems: string[] = []
      let tests = 0
      const test = (ok: boolean, problem: string) => {
        tests++
        if (!ok) problems.push(problem)
      }
      if (check.rows !== undefined) {
        test(
          table.rows.length === check.rows,
          `The clean table has ${table.rows.length} rows; it should have ${check.rows}.`,
        )
      }
      if (check.unique) {
        const i = index(check.unique)
        const values = table.rows.map((r) => String(r[i] ?? '').toLowerCase())
        test(
          i !== -1 && new Set(values).size === values.length,
          `Some rows share the same ${check.unique}: duplicates are left.`,
        )
      }
      for (const name of check.noBlanks) {
        const i = index(name)
        test(
          i !== -1 && !table.rows.some((r) => blank(r[i])),
          `${name} still has blank values.`,
        )
      }
      for (const [name, type] of Object.entries(check.types)) {
        const i = index(name)
        const column = table.columns[i]
        const bad =
          i === -1
            ? 1
            : table.rows.filter(
                (r) =>
                  !blank(r[i]) &&
                  (type === 'number'
                    ? typeof r[i] !== 'number'
                    : type === 'date'
                      ? !/^\d{4}-\d{2}-\d{2}$/.test(String(r[i]))
                      : false),
              ).length
        test(
          column?.type === type && bad === 0,
          `${name} should be ${type === 'date' ? 'dates' : `${type}s`}${bad ? ` (${bad} values are not)` : ''}.`,
        )
      }
      for (const rule of check.allowed) {
        const i = index(rule.column)
        const odd = [
          ...new Set(
            table.rows
              .map((r) => String(r[i] ?? ''))
              .filter((v) => !rule.values.includes(v)),
          ),
        ]
        test(
          i !== -1 && odd.length === 0,
          `${rule.column} has inconsistent values: ${odd
            .slice(0, 4)
            .map((v) => `“${v}”`)
            .join(', ')}.`,
        )
      }
      return checkResult(check, tests === 0 ? 1 : 1 - problems.length / tests, problems)
    }
    case 'query': {
      const ok = player.queries.some(
        (q) =>
          q.result &&
          sameResult(q.result, check.rows, {
            ordered: check.ordered,
            tolerance: check.tolerance,
          }),
      )
      return checkResult(
        check,
        ok ? 1 : 0,
        ok ? [] : [`No saved query gives ${check.description}.`],
      )
    }
    case 'dashboard': {
      const missing = check.tiles.filter(
        (want) =>
          !player.dashboard.tiles.some((tile) => {
            const query = player.queries.find((q) => q.id === tile.query)
            return (
              want.charts.includes(tile.chart) &&
              !!query?.result &&
              sameResult(query.result, want.rows, { ordered: false, tolerance: 0.01 })
            )
          }),
      )
      return checkResult(
        check,
        1 - missing.length / check.tiles.length,
        missing.map(
          (m) =>
            `The dashboard has no ${m.charts.join(' or ')} chart of ${m.description}.`,
        ),
      )
    }
    case 'answers': {
      const wrong = check.items.flatMap((item) => {
        const question = player.questions.find((q) => q.id === item.id)
        const given = question?.answer.trim() ?? ''
        const ok =
          typeof item.value === 'number'
            ? given !== '' &&
              Math.abs(Number(given.replace(/[%,£\s]/g, '')) - item.value) <=
                item.tolerance
            : given.toLowerCase() === item.value.toLowerCase()
        return ok
          ? []
          : [
              `“${question?.question ?? item.id}”: ${given ? `${given} is not right` : 'not answered'}.`,
            ]
      })
      return checkResult(check, 1 - wrong.length / check.items.length, wrong)
    }
  }
}

export const dataStudio: ToolDefinition<DataStudioState, DataStudioCheck> = {
  id: 'datastudio',
  name: 'Data Studio',
  category: 'Data preparation, SQL and dashboards',
  icon: 'datastudio',
  sections: [
    {
      id: 'data',
      name: 'Data',
      description:
        'Datasets: preview, profile columns, and clean them with applied steps.',
    },
    {
      id: 'sql',
      name: 'SQL',
      description: 'Query the clean tables with SQL (SQLite) and save the queries.',
    },
    {
      id: 'stats',
      name: 'Statistics',
      description: 'Summaries, comparisons between groups, and correlation.',
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Charts and figures built from saved queries.',
    },
    {
      id: 'questions',
      name: 'Questions',
      description: 'What your manager wants to know, and your answers.',
    },
  ],
  state: DataStudioStateSchema,
  practice: () => sampleStudio(),
  summary: (state) =>
    `${state.datasets.length} dataset${state.datasets.length === 1 ? '' : 's'}, ${state.queries.length} quer${state.queries.length === 1 ? 'y' : 'ies'}, ${state.dashboard.tiles.length} chart${state.dashboard.tiles.length === 1 ? '' : 's'}`,
  check: DataStudioCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The Data Studio file was not handed in.']),
    ),
  guide: {
    intro:
      'Data Studio is where analysts turn raw data into answers: clean it with repeatable steps, query it with SQL, test ideas with statistics, and share the results on a dashboard. The raw data is never changed; every cleaning step is recorded, so anyone can see and repeat what was done.',
    topics: [
      {
        title: 'Clean a dataset',
        body: 'Open a dataset in Data. The profile under each column shows blanks, distinct values and values that aren’t numbers: that is where to start. Add steps (trim spaces, fix capitals, change types, remove duplicates and blank rows) and watch the clean table update. Steps can be removed if they go wrong.',
      },
      {
        title: 'Write SQL',
        body: 'Each clean dataset is a table with the same name. SELECT the columns you need, JOIN tables on their keys, filter with WHERE, summarise with GROUP BY and SUM, COUNT or AVG, and sort with ORDER BY. Click Run, then Save to keep a query: saved queries feed the dashboard. Example: SELECT service, SUM(amount) AS revenue FROM orders GROUP BY service ORDER BY revenue DESC',
      },
      {
        title: 'Use statistics carefully',
        body: 'Compare groups by their mean and median, and look at the spread (standard deviation) and the number of cases. Correlation (r, from −1 to 1) shows how strongly two measures move together, but not why: a third factor, or who chose to take part, may explain it.',
      },
      {
        title: 'Build a dashboard',
        body: 'Add a chart for a saved query: choose the type, the column for the labels and the column of values. A line chart suits time; a column or bar chart compares groups; a single number tile shows a headline figure.',
      },
    ],
    glossary: [
      {
        term: 'Applied steps',
        meaning: 'The recorded list of cleaning operations, repeatable on new data.',
      },
      {
        term: 'JOIN',
        meaning: 'Combining rows from two tables that share a key, e.g. client_id.',
      },
      {
        term: 'LEFT JOIN',
        meaning:
          'Keeps every row of the first table, even with no match (useful to find what is missing).',
      },
      {
        term: 'GROUP BY',
        meaning: 'One result row per value, with totals or averages for each.',
      },
      {
        term: 'Mean / median',
        meaning: 'The average / the middle value. The median resists extreme values.',
      },
      {
        term: 'Standard deviation',
        meaning: 'How spread out the values are around the mean.',
      },
      {
        term: 'Correlation (r)',
        meaning: 'How closely two measures move together: 1, −1 or 0 for none.',
      },
    ],
  },
}
