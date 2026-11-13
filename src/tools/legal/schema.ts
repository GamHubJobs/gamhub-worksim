/**
 * Matter Desk: a law firm's systems in one console, as fee earners and
 * legal support staff use them: clients and intake, matters and conflict
 * checks, legal research, contract review, the calendar of deadlines, time
 * and billing, and document review (e-discovery).
 *
 * SIMULATION ONLY. The jurisdiction (Westmark), its laws, courts, cases,
 * clients and parties are fictional; nothing here is legal advice.
 */
import { z } from 'zod'

const Id = z.string().min(1).max(40)
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const ClientSchema = z.object({
  id: Id,
  name: z.string().max(100),
  kind: z.enum(['individual', 'company']),
  /** Identity (and, for a company, ownership) checked before acting. */
  idVerified: z.boolean().default(false),
  idDocument: z.string().max(80).default(''),
  /** The engagement letter (scope and fees) sent. */
  engagementSent: z.boolean().default(false),
  contact: z.string().max(100).default(''),
})

export const KeyDateSchema = z.object({
  id: Id,
  label: z.string().max(100),
  date: DateSchema,
})

export const MatterSchema = z.object({
  id: Id,
  title: z.string().max(120),
  clientId: Id,
  kind: z.enum(['contract', 'negligence', 'employment', 'corporate']),
  status: z.enum(['intake', 'open', 'declined', 'closed']),
  /** The other side(s), checked for conflicts. */
  opposing: z.array(z.string().max(100)).max(10).default([]),
  conflictChecked: z.boolean().default(false),
  declineReason: z.string().max(300).default(''),
  /** When the claim arose (for limitation). */
  arose: DateSchema.nullable().default(null),
  /** Hourly rate for this matter (in pounds). */
  rate: z.number().min(0).max(2000).default(180),
  keyDates: z.array(KeyDateSchema).max(30).default([]),
  /** Authorities saved to the matter (library IDs). */
  authorities: z.array(Id).max(30).default([]),
})

/** Earlier work: people the firm acts or acted for, and against. */
export const PartyRecordSchema = z.object({
  name: z.string().max(100),
  relation: z.enum(['client', 'former-client', 'adverse']),
  matter: z.string().max(120),
})

export const AuthoritySchema = z.object({
  id: Id,
  kind: z.enum(['statute', 'case']),
  citation: z.string().max(80),
  title: z.string().max(120),
  summary: z.string().max(800),
  topics: z.array(z.string().max(40)).max(10),
  /** Overruled or repealed: no longer good law. */
  goodLaw: z.boolean().default(true),
  /** Why it is no longer good law. */
  note: z.string().max(200).default(''),
})

export const ClauseSchema = z.object({
  id: Id,
  heading: z.string().max(80),
  text: z.string().max(1200),
  /** What the firm's playbook says for this kind of clause. */
  playbook: z.string().max(400),
  decision: z.enum(['accept', 'amend', 'reject']).nullable().default(null),
  comment: z.string().max(600).default(''),
})

export const ContractSchema = z.object({
  id: Id,
  matterId: Id,
  title: z.string().max(120),
  clauses: z.array(ClauseSchema).max(30),
})

export const TimeEntrySchema = z.object({
  id: Id,
  matterId: Id,
  date: DateSchema,
  minutes: z.number().int().min(1).max(600),
  description: z.string().max(300),
  billable: z.boolean(),
  invoiced: z.boolean().default(false),
})

export const InvoiceSchema = z.object({
  id: Id,
  matterId: Id,
  date: DateSchema,
  entries: z.array(Id),
  hours: z.number(),
  total: z.number(),
})

export const DiscoveryDocSchema = z.object({
  id: Id,
  matterId: Id,
  title: z.string().max(120),
  from: z.string().max(80),
  to: z.string().max(80),
  date: DateSchema,
  text: z.string().max(2000),
  tag: z.enum(['relevant', 'not-relevant', 'privileged']).nullable().default(null),
  reason: z.string().max(300).default(''),
})

export const LegalStateSchema = z.object({
  firm: z.string().max(80),
  jurisdiction: z.string().max(40),
  today: DateSchema,
  user: z.object({ name: z.string().max(60), role: z.string().max(60) }),
  clients: z.array(ClientSchema).max(60),
  matters: z.array(MatterSchema).max(60),
  parties: z.array(PartyRecordSchema).max(200).default([]),
  library: z.array(AuthoritySchema).max(100).default([]),
  contracts: z.array(ContractSchema).max(20).default([]),
  time: z.array(TimeEntrySchema).max(500).default([]),
  invoices: z.array(InvoiceSchema).max(100).default([]),
  documents: z.array(DiscoveryDocSchema).max(200).default([]),
  audit: z
    .array(
      z.object({
        at: DateSchema,
        action: z.string().max(80),
        matterId: Id.nullable(),
        detail: z.string().max(300).default(''),
      }),
    )
    .max(1000)
    .default([]),
})

export type Client = z.infer<typeof ClientSchema>
export type Matter = z.infer<typeof MatterSchema>
export type Authority = z.infer<typeof AuthoritySchema>
export type Clause = z.infer<typeof ClauseSchema>
export type Contract = z.infer<typeof ContractSchema>
export type TimeEntry = z.infer<typeof TimeEntrySchema>
export type DiscoveryDoc = z.infer<typeof DiscoveryDocSchema>
export type LegalState = z.infer<typeof LegalStateSchema>
