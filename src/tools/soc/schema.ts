/**
 * Security operations: the company's security console. Sign-in history,
 * endpoint alerts, reported emails, mailboxes and the accounts the security
 * team can contain, and an incident worked through its stages (detect,
 * triage, investigate, contain, eradicate, recover, document, review).
 *
 * Everything is simulated: no real accounts, devices, emails or attacks. The
 * scenario's truth (who is compromised, which email is phishing) is part of
 * the state so the actions can be validated, and is never shown as such.
 */
import { z } from 'zod'

const Id = z.string().min(1).max(40)

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export const STAGES = [
  'detect',
  'triage',
  'investigate',
  'contain',
  'eradicate',
  'recover',
  'document',
  'review',
  'closed',
] as const

export const SignInSchema = z.object({
  id: Id,
  user: Id,
  time: z.string().max(30),
  location: z.string().max(80),
  ip: z.string().max(40),
  device: z.string().max(80),
  result: z.enum(['success', 'failure']),
  /** Marked by the player as suspicious (evidence). */
  flagged: z.boolean().default(false),
})

export const AlertSchema = z.object({
  id: Id,
  severity: z.enum(SEVERITIES),
  title: z.string().max(160),
  source: z.enum(['Sign-in risk', 'Endpoint', 'Phishing report', 'Mailbox']),
  time: z.string().max(30),
  /** What it is about: a user ID, device name or email ID. */
  entity: z.string().max(60),
  status: z.enum(['new', 'acknowledged', 'dismissed']).default('new'),
})

export const EndpointSchema = z.object({
  device: Id,
  user: Id,
  isolated: z.boolean().default(false),
  processes: z
    .array(
      z.object({
        name: z.string().max(60),
        path: z.string().max(200),
        signed: z.boolean(),
        running: z.boolean().default(true),
        flagged: z.boolean().default(false),
      }),
    )
    .max(30),
  changes: z
    .array(z.object({ time: z.string().max(30), what: z.string().max(200) }))
    .max(30)
    .default([]),
})

export const EmailSchema = z.object({
  id: Id,
  fromName: z.string().max(80),
  fromAddress: z.string().max(120),
  replyTo: z.string().max(120).default(''),
  subject: z.string().max(200),
  received: z.string().max(30),
  /** User IDs it was delivered to. */
  recipients: z.array(Id).max(50),
  /** Who reported it to IT (user ID), if anyone. */
  reportedBy: z.string().max(40).default(''),
  body: z.string().max(3000),
  links: z
    .array(z.object({ text: z.string().max(120), url: z.string().max(300) }))
    .max(10)
    .default([]),
  verdict: z.enum(['', 'phishing', 'legitimate']).default(''),
  quarantined: z.boolean().default(false),
})

export const MailboxSchema = z.object({
  user: Id,
  rules: z
    .array(
      z.object({
        id: Id,
        name: z.string().max(80),
        condition: z.string().max(160),
        action: z.string().max(160),
        flagged: z.boolean().default(false),
        removed: z.boolean().default(false),
      }),
    )
    .max(20),
  audit: z
    .array(
      z.object({
        time: z.string().max(30),
        action: z.string().max(120),
        ip: z.string().max(40),
        location: z.string().max(80),
      }),
    )
    .max(40)
    .default([]),
})

export const AccountSchema = z.object({
  user: Id,
  name: z.string().max(100),
  department: z.string().max(60),
  /** Office person ID, for what happens to them in the office. */
  person: z.string().max(40).default(''),
  disabled: z.boolean().default(false),
  sessionsRevoked: z.boolean().default(false),
  passwordReset: z.boolean().default(false),
})

export const IncidentSchema = z.object({
  id: Id,
  title: z.string().max(160),
  /** The alert that opened it. */
  alert: Id,
  stage: z.enum(STAGES).default('detect'),
  severity: z.enum(['', ...SEVERITIES]).default(''),
  category: z
    .enum(['', 'account-compromise', 'malware', 'phishing', 'data-loss'])
    .default(''),
  report: z.string().max(5000).default(''),
  lessons: z.string().max(3000).default(''),
  timeline: z
    .array(z.object({ stage: z.enum(STAGES), text: z.string().max(400) }))
    .max(60)
    .default([]),
})

/** The scenario's truth: what really happened (used to validate, never shown). */
export const TruthSchema = z.object({
  user: Id,
  device: Id,
  email: Id,
  rule: Id,
  process: z.string().max(60),
  signIn: Id,
  severity: z.enum(SEVERITIES),
  category: z.enum(['account-compromise', 'malware', 'phishing', 'data-loss']),
})

export const SocStateSchema = z.object({
  signIns: z.array(SignInSchema).max(200),
  alerts: z.array(AlertSchema).max(50),
  endpoints: z.array(EndpointSchema).max(50),
  emails: z.array(EmailSchema).max(50),
  mailboxes: z.array(MailboxSchema).max(50),
  accounts: z.array(AccountSchema).max(100),
  incident: IncidentSchema,
  truth: TruthSchema,
  /** Consequences of the player's mistakes, in words (e.g. a phishing email let through). */
  consequences: z
    .array(z.object({ kind: z.string().max(40), text: z.string().max(300) }))
    .max(30)
    .default([]),
  log: z
    .array(
      z.object({
        seq: z.number().int().positive(),
        action: z.string().max(60),
        target: z.string().max(60),
        detail: z.string().max(300).default(''),
        /** A wrong action (e.g. isolating the wrong device). */
        mistake: z.boolean().default(false),
      }),
    )
    .max(2000)
    .default([]),
})

export type Severity = (typeof SEVERITIES)[number]
export type Stage = (typeof STAGES)[number]
export type SocState = z.infer<typeof SocStateSchema>
export type SocInput = z.input<typeof SocStateSchema>
export type Incident = z.infer<typeof IncidentSchema>
