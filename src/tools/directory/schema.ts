/**
 * Directory: the company's user accounts, security groups and IT assets, as
 * IT support manages them every day (joiners, movers and leavers, lockouts,
 * password and MFA resets, laptops and phones). Every change is written to
 * an audit log, as real identity systems do.
 */
import { z } from 'zod'

const Id = z.string().min(1).max(60)
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const UserSchema = z.object({
  id: Id,
  name: z.string().min(1).max(100),
  /** Sign-in name, e.g. "maya.patel". */
  username: z
    .string()
    .regex(/^[a-z0-9.-]+$/)
    .max(60),
  department: z.string().max(60),
  title: z.string().max(80),
  status: z.enum(['active', 'disabled']),
  /** Locked after too many wrong passwords. */
  locked: z.boolean().default(false),
  /** Multi-factor authentication registered. */
  mfa: z.boolean().default(false),
  /** Must choose a new password at the next sign-in (after a reset). */
  mustChangePassword: z.boolean().default(false),
  groups: z.array(Id).default([]),
  lastSignIn: z.string().max(40).default(''),
  /** Failed sign-ins today (shown when investigating a lockout). */
  failedSignIns: z.number().int().min(0).default(0),
  /** Where the failed sign-ins came from, e.g. "Office (10.20.1.0/24)". */
  signInLocation: z.string().max(100).default(''),
  // Records used to verify the person (fictional; see security.ts). The
  // employee number and badge number are never shown: they are only checked.
  /** HR employee number, e.g. "E-1017". */
  employeeId: z.string().max(20).optional(),
  /** Staff badge number, e.g. "B-40417". */
  badge: z.string().max(20).optional(),
  /** Registered office extension, for callbacks, e.g. "2417". */
  extension: z.string().max(20).optional(),
  /** Their line manager (a user ID), who approves changes that need it. */
  manager: Id.optional(),
})

export const GroupSchema = z.object({
  id: Id,
  name: z.string().min(1).max(80),
  description: z.string().max(200),
  /** What membership gives access to, in plain words. */
  grants: z.string().max(200),
  /** Groups that should only have a few members, e.g. administrators. */
  privileged: z.boolean().default(false),
  /** Who approves membership (a user ID), for privileged groups. */
  owner: Id.optional(),
})

export const ASSET_TYPES = ['laptop', 'desktop', 'phone', 'monitor', 'tablet'] as const
export const ASSET_STATUSES = ['in-use', 'in-stock', 'repair', 'lost', 'retired'] as const

export const AssetSchema = z.object({
  /** Asset tag on the device, e.g. "CR-LT-0142". */
  tag: z.string().min(1).max(30),
  type: z.enum(ASSET_TYPES),
  model: z.string().max(80),
  serial: z.string().max(40),
  status: z.enum(ASSET_STATUSES),
  /** User ID, when in use. */
  assignedTo: z.string().max(60).default(''),
  purchased: DateSchema,
  warrantyEnd: DateSchema,
  notes: z.string().max(300).default(''),
})

export const AuditEntrySchema = z.object({
  /** Order of events. */
  seq: z.number().int().positive(),
  action: z.string().max(40),
  target: z.string().max(100),
  detail: z.string().max(200).default(''),
  /** Made by the player in this file (not part of the starting history). */
  byYou: z.boolean().default(true),
})

// ---------------------------------------------------------------------------
// Security policy: identity verification and authorisation (see security.ts)
// ---------------------------------------------------------------------------

/** The account changes the policy covers. */
export const OPERATIONS = [
  'unlock',
  'reset-password',
  'reset-mfa',
  'register-mfa',
  'disable',
  'enable',
  'group-add',
  'group-remove',
] as const

/** Ways to verify a person against the records. */
export const VERIFICATION_METHODS = ['employee-id', 'badge', 'callback'] as const

export const SECURITY_EVENT_KINDS = [
  'session-started',
  'check-passed',
  'check-failed',
  'no-answer',
  'attempts-exceeded',
  'approved',
  'approval-declined',
  'performed',
  'expired-session',
  'out-of-scope',
  'insufficient-verification',
  'insufficient-authorization',
  'wrong-approver',
  'unregistered-callback',
  'no-verification',
  'after-failed-verification',
  'other-employee-session',
] as const

const Time = z.number().nonnegative()

const RequirementSchema = z.object({
  factors: z.number().int().min(0).max(3),
  approval: z.enum(['none', 'manager', 'owner']),
})

/** One verification: one person, one ticket, the changes asked for. */
export const VerificationSessionSchema = z.object({
  id: z.string().regex(/^VS-\d+$/),
  ticket: z.string().max(30).default(''),
  /** The account being verified (and the only one it covers). */
  user: Id,
  operations: z.array(z.enum(OPERATIONS)).min(1).max(8),
  /** For group changes: the group. */
  group: z.string().max(60).default(''),
  createdAt: Time,
  expiresAt: Time,
  /** What the player has asked the person for. */
  asked: z.array(z.enum(VERIFICATION_METHODS)).default([]),
  steps: z
    .array(
      z.object({
        at: Time,
        method: z.enum([...VERIFICATION_METHODS, 'approval']),
        passed: z.boolean(),
        text: z.string().max(300),
      }),
    )
    .max(40)
    .default([]),
  failedAttempts: z.number().int().min(0).default(0),
  /** Who approved the changes (user IDs). */
  approvals: z.array(Id).default([]),
  /** Changes already made with it (each once). */
  done: z.array(z.enum(OPERATIONS)).default([]),
  /** Too many wrong answers: it can no longer be used. */
  failed: z.boolean().default(false),
})

/** A security event: a check, an approval, a change, or a refused attempt. */
export const SecurityEventSchema = z.object({
  seq: z.number().int().positive(),
  at: Time,
  kind: z.enum(SECURITY_EVENT_KINDS),
  severity: z.enum(['info', 'warning', 'breach']),
  /** The account involved (user ID). */
  user: z.string().max(60).default(''),
  ticket: z.string().max(30).default(''),
  operation: z.string().max(200).default(''),
  session: z.string().max(20).default(''),
  /** What happened, in words (never an answer or a record). */
  text: z.string().max(400),
})

/** What a ticket's requester says and does when asked (scenario data). */
export const VerificationRequestSchema = z.object({
  ticket: z.string().max(30),
  /** Who is really asking (a user ID). */
  speaker: Id,
  /** What they give when asked (may be wrong, or missing). */
  says: z.object({
    'employee-id': z.string().max(20).optional(),
    badge: z.string().max(20).optional(),
  }),
  /** A number they offer for a callback (not on record). */
  offers: z.string().max(30).default(''),
  /** At their desk, to answer a callback on their extension. */
  atDesk: z.boolean().default(true),
})

export const DirectorySecuritySchema = z.object({
  /** The time now (ms), set by the host before each change; it never goes back. */
  clock: Time.default(0),
  sessionMinutes: z.number().int().min(1).max(120).default(10),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  /** The checks this company accepts. */
  methods: z
    .array(z.enum(VERIFICATION_METHODS))
    .min(1)
    .default([...VERIFICATION_METHODS]),
  /** Stricter rules for some changes (per operation). */
  policy: z
    .object({
      unlock: RequirementSchema.optional(),
      'reset-password': RequirementSchema.optional(),
      'reset-mfa': RequirementSchema.optional(),
      'register-mfa': RequirementSchema.optional(),
      disable: RequirementSchema.optional(),
      enable: RequirementSchema.optional(),
      'group-add': RequirementSchema.optional(),
      'group-remove': RequirementSchema.optional(),
    })
    .default({}),
  /** Approvers who will say no (user IDs). */
  declines: z.array(Id).default([]),
  requests: z.array(VerificationRequestSchema).max(20).default([]),
  sessions: z.array(VerificationSessionSchema).max(100).default([]),
  events: z.array(SecurityEventSchema).max(500).default([]),
})

export const DirectoryStateSchema = z.object({
  domain: z.string().min(1).max(60),
  today: DateSchema,
  users: z.array(UserSchema).max(500),
  groups: z.array(GroupSchema).max(100),
  assets: z.array(AssetSchema).max(1000),
  audit: z.array(AuditEntrySchema).max(5000).default([]),
  /**
   * The security policy, for directories that enforce one. Without it (every
   * directory before this one) account changes need no verification.
   */
  security: DirectorySecuritySchema.optional(),
})

export type User = z.infer<typeof UserSchema>
export type Group = z.infer<typeof GroupSchema>
export type Asset = z.infer<typeof AssetSchema>
export type AssetType = (typeof ASSET_TYPES)[number]
export type AssetStatus = (typeof ASSET_STATUSES)[number]
export type AuditEntry = z.infer<typeof AuditEntrySchema>
export type DirectoryState = z.infer<typeof DirectoryStateSchema>
export type Operation = (typeof OPERATIONS)[number]
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number]
export type VerificationSession = z.infer<typeof VerificationSessionSchema>
export type SecurityEvent = z.infer<typeof SecurityEventSchema>
export type SecurityEventKind = (typeof SECURITY_EVENT_KINDS)[number]
export type Severity = SecurityEvent['severity']
export type DirectorySecurity = z.infer<typeof DirectorySecuritySchema>
