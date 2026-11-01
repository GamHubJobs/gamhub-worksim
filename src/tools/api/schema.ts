/**
 * API Client: requests to the company's (simulated) timesheet API, their
 * responses, saved requests, environment variables and a bug report. The
 * API's data lives here too, so creating an entry really creates it.
 */
import { z } from 'zod'

export const METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const

export const HeaderSchema = z.object({
  key: z.string().max(100),
  value: z.string().max(1000),
})

export const RequestSchema = z.object({
  method: z.enum(METHODS),
  url: z.string().max(500),
  headers: z.array(HeaderSchema).max(20),
  body: z.string().max(5000),
})

export const EntrySchema = z.object({
  id: z.number().int().positive(),
  person: z.string().max(60),
  project: z.string().max(20),
  date: z.string().max(20),
  hours: z.number(),
  description: z.string().max(300),
})

export const ApiStateSchema = z.object({
  /** Environment variables, used as {{name}} in requests. */
  environment: z
    .array(
      z.object({ name: z.string().regex(/^\w+$/).max(40), value: z.string().max(500) }),
    )
    .max(20),
  server: z.object({
    tokens: z.array(
      z.object({
        token: z.string(),
        scope: z.enum(['read', 'write']),
        owner: z.string(),
      }),
    ),
    projects: z.array(
      z.object({ code: z.string(), name: z.string(), client: z.string() }),
    ),
    entries: z.array(EntrySchema).max(500),
    nextId: z.number().int().positive(),
  }),
  /** Every request sent, with its response. */
  history: z
    .array(
      RequestSchema.extend({
        /** The request as sent, after the variables were filled in. */
        sentUrl: z.string().max(500),
        status: z.number().int(),
        response: z.string().max(10000),
      }),
    )
    .max(300)
    .default([]),
  collection: z
    .array(RequestSchema.extend({ name: z.string().min(1).max(80) }))
    .max(50)
    .default([]),
  /** A bug report for the developers. */
  report: z.string().max(3000).default(''),
})

export type Method = (typeof METHODS)[number]
export type ApiRequest = z.infer<typeof RequestSchema>
export type Entry = z.infer<typeof EntrySchema>
export type ApiState = z.infer<typeof ApiStateSchema>
