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

/**
 * One cell. We store exactly what the player typed (`input`), e.g. "42" or
 * "=SUM(A1:A3)". Calculated results are never saved; they are recalculated.
 * Formatting fields will be added here in later steps.
 */
export const CellSchema = z.object({
  input: z.string(),
})

export const SheetSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(100),
  /** Only cells that contain something are stored, keyed by address. */
  cells: z.record(CellAddressSchema, CellSchema),
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
  sheet: 1,
} as const satisfies Record<z.infer<typeof DocumentSchema>['kind'], number>

/** Why a version snapshot was taken. */
export const VersionReasonSchema = z.enum([
  'auto', // periodic snapshot while editing
  'close', // player left the document
  'before-restore', // safety copy taken just before restoring an older version
  'manual', // player chose to keep this version
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
export type Sheet = z.infer<typeof SheetSchema>
export type SheetContent = z.infer<typeof SheetContentSchema>
export type SheetDocument = z.infer<typeof SheetDocumentSchema>
export type AnyDocument = z.infer<typeof DocumentSchema>
export type DocumentKind = AnyDocument['kind']
export type VersionReason = z.infer<typeof VersionReasonSchema>
export type DocumentVersion = z.infer<typeof DocumentVersionSchema>
export type MetaEntry = z.infer<typeof MetaEntrySchema>
export type OutboxEntry = z.infer<typeof OutboxEntrySchema>
