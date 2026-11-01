/**
 * Data Studio: datasets with their cleaning steps, SQL queries and their
 * results, a dashboard, and the task's questions. The raw data is never
 * changed: each dataset's steps are applied to it to make the clean table,
 * which is what SQL, statistics and the dashboard use.
 */
import { z } from 'zod'

export const Value = z.union([z.string().max(500), z.number(), z.null()])
export type Value = z.infer<typeof Value>

export const COLUMN_TYPES = ['text', 'number', 'date'] as const

export const ColumnSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(40),
  type: z.enum(COLUMN_TYPES),
})

const col = z.string().max(40)

export const StepSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('trim'), column: col }),
  z.object({
    kind: z.literal('case'),
    column: col,
    to: z.enum(['upper', 'lower', 'proper']),
  }),
  z.object({
    kind: z.literal('replace'),
    column: col,
    find: z.string().max(100),
    with: z.string().max(100),
  }),
  z.object({ kind: z.literal('type'), column: col, to: z.enum(COLUMN_TYPES) }),
  z.object({ kind: z.literal('dedupe'), columns: z.array(col).max(20) }),
  z.object({ kind: z.literal('remove-blank'), column: col }),
  z.object({ kind: z.literal('fill'), column: col, value: z.string().max(100) }),
  z.object({
    kind: z.literal('filter'),
    column: col,
    op: z.enum(['=', '!=', '>', '<', 'contains']),
    value: z.string().max(100),
  }),
  z.object({
    kind: z.literal('rename'),
    column: col,
    to: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/)
      .max(40),
  }),
  z.object({ kind: z.literal('remove-column'), column: col }),
  /** A new number column: left op right, where right is a column or a number. */
  z.object({
    kind: z.literal('calculate'),
    name: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/)
      .max(40),
    left: col,
    op: z.enum(['+', '-', '*', '/']),
    right: z.string().max(40),
  }),
])

export const DatasetSchema = z.object({
  /** Also the table name in SQL. */
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(40),
  description: z.string().max(300).default(''),
  columns: z.array(ColumnSchema).min(1).max(30),
  rows: z.array(z.array(Value)).max(2000),
  steps: z.array(StepSchema).max(50).default([]),
})

export const ResultSchema = z.object({
  columns: z.array(z.string().max(80)).max(50),
  rows: z.array(z.array(Value)).max(500),
})

export const QuerySchema = z.object({
  id: z.string().max(20),
  name: z.string().min(1).max(80),
  sql: z.string().max(5000),
  /** The result when it was last run (kept so it can be charted and checked). */
  result: ResultSchema.nullable().default(null),
  error: z.string().max(500).default(''),
})

export const TileSchema = z.object({
  id: z.string().max(20),
  title: z.string().max(100),
  query: z.string().max(20),
  chart: z.enum(['column', 'bar', 'line', 'pie', 'number']),
  /** Column used for the labels, and the column(s) of values. */
  label: z.string().max(80).default(''),
  value: z.string().max(80).default(''),
})

export const DataStudioStateSchema = z.object({
  datasets: z.array(DatasetSchema).min(1).max(20),
  queries: z.array(QuerySchema).max(50).default([]),
  dashboard: z
    .object({ title: z.string().max(100), tiles: z.array(TileSchema).max(12) })
    .default({ title: 'Dashboard', tiles: [] }),
  questions: z
    .array(
      z.object({
        id: z.string().max(40),
        question: z.string().max(300),
        kind: z.enum(['number', 'choice']),
        options: z.array(z.string()).default([]),
        unit: z.string().max(10).default(''),
        answer: z.string().max(300).default(''),
      }),
    )
    .max(20)
    .default([]),
})

export type Column = z.infer<typeof ColumnSchema>
export type ColumnType = (typeof COLUMN_TYPES)[number]
export type Step = z.infer<typeof StepSchema>
export type Dataset = z.infer<typeof DatasetSchema>
export type Result = z.infer<typeof ResultSchema>
export type Query = z.infer<typeof QuerySchema>
export type Tile = z.infer<typeof TileSchema>
export type DataStudioState = z.infer<typeof DataStudioStateSchema>
