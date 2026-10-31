/**
 * Schemas: the exact shape of everything we save.
 *
 * Every piece of data is checked against these schemas when it is loaded, so
 * damaged or unexpected data is detected instead of crashing the app.
 * The TypeScript types (e.g. `SheetDocument`) are generated from the schemas,
 * so the code and the checks can never disagree.
 */
import { z } from 'zod'
import { isId } from '../lib/ids'

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

export const IdSchema = z.string().refine(isId, { message: 'Invalid ID' })

/** A moment in time, stored as milliseconds since 1 Jan 1970 (like `Date.now()`). */
export const TimestampSchema = z.number().int().nonnegative()

/**
 * Fields every saved record has. They make future cloud sync possible:
 * - `rev` goes up by 1 on every change, so we can tell which copy is newer.
 * - `deviceId` records which device made the latest change.
 * - `deleted` marks a record as deleted without erasing it, so the deletion
 *   itself can later be synced to other devices.
 */
export const SyncFieldsSchema = z.object({
  id: IdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  rev: z.number().int().min(1),
  deviceId: IdSchema,
  deleted: z.boolean(),
})

// ---------------------------------------------------------------------------
// Spreadsheet content
// ---------------------------------------------------------------------------

/** A cell address such as "A1", "C12" or "AB300". */
export const CellAddressSchema = z
  .string()
  .regex(/^[A-Z]{1,3}[1-9][0-9]{0,6}$/, { message: 'Invalid cell address' })

/** Background colours a cell can have (named, so themes can adjust them). */
export const FILL_COLORS = ['yellow', 'green', 'blue', 'red', 'gray'] as const

/** How a cell looks. Every field is optional; missing means "default". */
export const CellFormatSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  /** How numbers are shown: 1,234.50 / $1,234.50 / 12%. */
  numberFormat: z.enum(['number', 'currency', 'percent']).optional(),
  /** Decimal places for numberFormat. */
  decimals: z.number().int().min(0).max(6).optional(),
  fill: z.enum(FILL_COLORS).optional(),
})

/**
 * One cell. We store exactly what the player typed (`input`), e.g. "42" or
 * "=SUM(A1:A3)". Calculated results are never saved; they are recalculated.
 */
export const CellSchema = z.object({
  input: z.string(),
  format: CellFormatSchema.optional(),
})

export const SheetSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(100),
  /** Only cells that contain something (a value or formatting) are stored. */
  cells: z.record(CellAddressSchema, CellSchema),
  /** Column widths in pixels, keyed by column letters; missing means default. */
  columnWidths: z
    .record(z.string().regex(/^[A-Z]{1,3}$/), z.number().int().min(20).max(800))
    .optional(),
})

export const SheetContentSchema = z.object({
  sheets: z.array(SheetSchema).min(1),
})

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const DocumentBaseSchema = SyncFieldsSchema.extend({
  title: z.string().min(1).max(200),
  /** Version of this document's content format, for future upgrades. */
  formatVersion: z.number().int().min(1),
})

export const SheetDocumentSchema = DocumentBaseSchema.extend({
  kind: z.literal('sheet'),
  content: SheetContentSchema,
})

/**
 * Any saved document. New apps (Docs, Slides, ...) are added here as new
 * `kind`s, and they automatically share autosave, versions and backups.
 */
export const DocumentSchema = z.discriminatedUnion('kind', [SheetDocumentSchema])

/**
 * The current content-format version of each document kind. When a kind's
 * content format changes, raise its number here and add an upgrade step in
 * `documentMigrations.ts`.
 */
export const DOCUMENT_FORMAT_VERSIONS = {
  sheet: 2,
} as const satisfies Record<z.infer<typeof DocumentSchema>['kind'], number>

/** Why a version snapshot was taken. */
export const VersionReasonSchema = z.enum([
  'auto', // periodic snapshot while editing
  'close', // player left the document
  'before-restore', // safety copy taken just before restoring an older version
  'manual', // player chose to keep this version
  'submitted', // the workbook as it was handed in for grading (always kept)
])

/** A frozen copy of a document at one moment, for version history. */
export const DocumentVersionSchema = SyncFieldsSchema.extend({
  documentId: IdSchema,
  reason: VersionReasonSchema,
  /** Kept versions are never removed by automatic clean-up. */
  keep: z.boolean(),
  /** The full document as it was at that moment. */
  snapshot: DocumentSchema,
})

// ---------------------------------------------------------------------------
// The player's career: progress, rewards and mail
// ---------------------------------------------------------------------------

/** The result of one submission of an assignment. */
export const AttemptSchema = z.object({
  submittedAt: TimestampSchema,
  /** 0–100. */
  score: z.number().int().min(0).max(100),
  rating: z.enum(['excellent', 'good', 'pass', 'fail']),
  checks: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['passed', 'partial', 'failed']),
      earned: z.number().int().nonnegative(),
      points: z.number().int().nonnegative(),
      problems: z.array(z.string()),
    }),
  ),
  /** XP this attempt added (only improvements on earlier attempts count). */
  xpEarned: z.number().int().nonnegative(),
  skillXpEarned: z.record(z.string(), z.number().int().nonnegative()),
  /** The version-history copy of the workbook as submitted. */
  versionId: IdSchema.optional(),
})

export const AssignmentProgressSchema = z.object({
  assignmentId: z.string(),
  /** The assignment's content version when it was started. */
  assignmentVersion: z.number().int().positive(),
  /** The player's workbook for this assignment. */
  documentId: IdSchema,
  startedAt: TimestampSchema,
  /** Steps the player ticked off in the task pane. */
  completedSteps: z.array(z.string()),
  attempts: z.array(AttemptSchema),
})

export const MailMessageSchema = z.object({
  id: IdSchema,
  /** A person ID from the company content, e.g. "manager". */
  from: z.string(),
  subject: z.string(),
  /** Plain text; blank lines separate paragraphs. */
  body: z.string(),
  receivedAt: TimestampSchema,
  readAt: TimestampSchema.nullable(),
  kind: z.enum(['welcome', 'briefing', 'feedback', 'promotion', 'info']),
  assignmentId: z.string().optional(),
  /** For feedback: which attempt (0-based) it is about. */
  attemptIndex: z.number().int().nonnegative().optional(),
})

/** Current format of player profiles; raise it (with an upgrade) when the shape changes. */
export const PROFILE_FORMAT_VERSION = 1

/** One player's career save. */
export const ProfileSchema = SyncFieldsSchema.extend({
  formatVersion: z.number().int().min(1),
  /** The name colleagues use, e.g. "Alex". */
  name: z.string().trim().min(1).max(40),
  careerId: z.string(),
  levelId: z.string(),
  xp: z.number().int().nonnegative(),
  /** Skill XP per skill ID. */
  skills: z.record(z.string(), z.number().int().nonnegative()),
  assignments: z.record(z.string(), AssignmentProgressSchema),
  inbox: z.array(MailMessageSchema),
})

// ---------------------------------------------------------------------------
// Database housekeeping
// ---------------------------------------------------------------------------

/**
 * A small named value stored in the `meta` table, e.g. this device's ID or the
 * time of the last backup. Each value is validated where it is used.
 */
export const MetaEntrySchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
})

/**
 * One entry in the change log ("outbox"). Every saved change is recorded here,
 * so that future cloud sync knows exactly what to upload.
 */
export const OutboxEntrySchema = z.object({
  /** Order number, assigned automatically by the database. */
  seq: z.number().int().positive(),
  /** Which table the changed record lives in, e.g. "documents". */
  table: z.string().min(1),
  recordId: IdSchema,
  rev: z.number().int().min(1),
  changedAt: TimestampSchema,
})

// ---------------------------------------------------------------------------
// Types generated from the schemas
// ---------------------------------------------------------------------------

export type SyncFields = z.infer<typeof SyncFieldsSchema>
export type Cell = z.infer<typeof CellSchema>
export type CellFormat = z.infer<typeof CellFormatSchema>
export type FillColor = (typeof FILL_COLORS)[number]
export type Sheet = z.infer<typeof SheetSchema>
export type SheetContent = z.infer<typeof SheetContentSchema>
export type SheetDocument = z.infer<typeof SheetDocumentSchema>
export type AnyDocument = z.infer<typeof DocumentSchema>
export type DocumentKind = AnyDocument['kind']
export type VersionReason = z.infer<typeof VersionReasonSchema>
export type DocumentVersion = z.infer<typeof DocumentVersionSchema>
export type Attempt = z.infer<typeof AttemptSchema>
export type AssignmentProgress = z.infer<typeof AssignmentProgressSchema>
export type MailMessage = z.infer<typeof MailMessageSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type MetaEntry = z.infer<typeof MetaEntrySchema>
export type OutboxEntry = z.infer<typeof OutboxEntrySchema>
