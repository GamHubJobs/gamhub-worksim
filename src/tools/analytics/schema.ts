/**
 * Site Analytics: the website's traffic for a fortnight, by traffic source,
 * device and landing page, with the steps of the booking funnel. The player
 * explores it, saves reports, and answers the questions the task asks.
 */
import { z } from 'zod'

export const DIMENSIONS = ['source', 'device', 'landing'] as const

export const TrafficRowSchema = z.object({
  source: z.string().max(40),
  device: z.string().max(20),
  landing: z.string().max(120),
  sessions: z.number().int().min(0),
  /** Sessions where the visitor did something (stayed, scrolled, clicked). */
  engaged: z.number().int().min(0),
  /** Funnel: viewed pricing → started the booking form → booked a review. */
  pricing: z.number().int().min(0),
  formStarts: z.number().int().min(0),
  bookings: z.number().int().min(0),
})

export const ReportSchema = z.object({
  name: z.string().min(1).max(80),
  dimension: z.enum(DIMENSIONS),
  filters: z
    .object({ source: z.string().optional(), device: z.string().optional() })
    .default({}),
})

export const QuestionSchema = z.object({
  id: z.string().max(40),
  question: z.string().max(300),
  /** A number (e.g. a percentage), or one of the options. */
  kind: z.enum(['number', 'choice']),
  options: z.array(z.string()).default([]),
  unit: z.string().max(10).default(''),
  answer: z.string().max(100).default(''),
})

export const AnalyticsStateSchema = z.object({
  site: z.string().max(80),
  period: z.string().max(80),
  rows: z.array(TrafficRowSchema).max(500),
  reports: z.array(ReportSchema).max(50).default([]),
  questions: z.array(QuestionSchema).max(20).default([]),
})

export type Dimension = (typeof DIMENSIONS)[number]
export type TrafficRow = z.infer<typeof TrafficRowSchema>
export type Report = z.infer<typeof ReportSchema>
export type AnalyticsState = z.infer<typeof AnalyticsStateSchema>
