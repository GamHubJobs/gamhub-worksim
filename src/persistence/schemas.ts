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

/** Text colours a cell can have. */
export const TEXT_COLORS = ['red', 'green', 'blue', 'amber', 'gray'] as const

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
  underline: z.boolean().optional(),
  textColor: z.enum(TEXT_COLORS).optional(),
})

/**
 * One cell. We store exactly what the player typed (`input`), e.g. "42" or
 * "=SUM(A1:A3)". Calculated results are never saved; they are recalculated.
 */
export const CellSchema = z.object({
  input: z.string(),
  format: CellFormatSchema.optional(),
})

/** A range such as "A1:C7" (or a single cell). */
const RangeTextSchema = z
  .string()
  .regex(/^[A-Z]{1,3}[1-9][0-9]{0,6}(:[A-Z]{1,3}[1-9][0-9]{0,6})?$/, {
    message: 'Invalid range',
  })

/** A chart drawn live from a range of the sheet. */
export const SheetChartSchema = z.object({
  id: IdSchema,
  type: z.enum(['column', 'bar', 'line', 'pie']),
  title: z.string().max(200),
  range: RangeTextSchema,
})

/** Formatting applied automatically to cells that meet a condition. */
export const ConditionalFormatSchema = z.object({
  id: IdSchema,
  range: RangeTextSchema,
  rule: z.object({
    op: z.enum([
      'gt',
      'gte',
      'lt',
      'lte',
      'eq',
      'neq',
      'between',
      'contains',
      'blank',
      'notBlank',
    ]),
    value: z.string().max(200),
    value2: z.string().max(200).optional(),
  }),
  style: z.object({
    fill: z.enum(FILL_COLORS).optional(),
    bold: z.boolean().optional(),
    textColor: z.enum(TEXT_COLORS).optional(),
  }),
})

/** What may be typed into a range: an item from a list, or a number within limits. */
export const DataValidationSchema = z.object({
  id: IdSchema,
  range: RangeTextSchema,
  rule: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('list'),
      items: z.array(z.string().min(1).max(100)).min(1).max(100),
    }),
    z.object({
      type: z.literal('number'),
      min: z.number().optional(),
      max: z.number().optional(),
      wholeNumber: z.boolean().optional(),
    }),
  ]),
})

/** A filter on a table: its range (header row first) and the values shown per column. */
export const SheetFilterSchema = z.object({
  range: RangeTextSchema,
  /** Column letters → the values to show. Columns not listed show everything. */
  shown: z.record(z.string().regex(/^[A-Z]{1,3}$/), z.array(z.string().max(500))),
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
  charts: z.array(SheetChartSchema).max(50).optional(),
  conditionalFormats: z.array(ConditionalFormatSchema).max(100).optional(),
  validations: z.array(DataValidationSchema).max(100).optional(),
  filter: SheetFilterSchema.optional(),
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

// ---------------------------------------------------------------------------
// Charts (shared by Sheets, Docs and Slides)
// ---------------------------------------------------------------------------

export const CHART_TYPES = ['column', 'bar', 'line', 'pie'] as const

/**
 * A chart's data, frozen when it is placed in a document or slide (like
 * pasting a chart from a spreadsheet into a report).
 */
export const ChartSpecSchema = z.object({
  type: z.enum(CHART_TYPES),
  title: z.string().max(200),
  labels: z.array(z.string().max(200)).max(200),
  series: z
    .array(
      z.object({
        name: z.string().max(200),
        values: z.array(z.number()).max(200),
      }),
    )
    .max(12),
})

// ---------------------------------------------------------------------------
// Rich text documents (Docs)
// ---------------------------------------------------------------------------

/**
 * One node of a rich-text document, in the editor's own JSON form: a
 * paragraph, heading, list, table, text run… Only the outline is checked
 * here; the editor checks the details when it loads the document.
 */
export interface RichNode {
  type: string
  attrs?: Record<string, unknown>
  content?: RichNode[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
}

export const RichNodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1).max(50),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(RichNodeSchema).optional(),
    marks: z
      .array(
        z.object({
          type: z.string().min(1).max(50),
          attrs: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .optional(),
    text: z.string().optional(),
  }),
)

export const DocContentSchema = z.object({
  /** The document body (type "doc"). */
  body: RichNodeSchema,
  page: z.object({
    size: z.enum(['a4', 'letter']),
    margins: z.enum(['normal', 'narrow', 'wide']),
  }),
})

export const DocDocumentSchema = DocumentBaseSchema.extend({
  kind: z.literal('doc'),
  content: DocContentSchema,
})

// ---------------------------------------------------------------------------
// Presentations (Slides)
// ---------------------------------------------------------------------------

/** Slides are 960 × 540 units (16:9); elements are placed in these units. */
export const SLIDE_WIDTH = 960
export const SLIDE_HEIGHT = 540

const ColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, { message: 'Invalid colour' })

const SlideElementBaseSchema = z.object({
  id: IdSchema,
  x: z
    .number()
    .min(-SLIDE_WIDTH)
    .max(2 * SLIDE_WIDTH),
  y: z
    .number()
    .min(-SLIDE_HEIGHT)
    .max(2 * SLIDE_HEIGHT),
  w: z
    .number()
    .min(4)
    .max(2 * SLIDE_WIDTH),
  h: z
    .number()
    .min(4)
    .max(2 * SLIDE_HEIGHT),
})

export const TextStyleSchema = z.object({
  size: z.number().int().min(8).max(120),
  bold: z.boolean(),
  italic: z.boolean(),
  align: z.enum(['left', 'center', 'right']),
  /** A colour, or null for the theme's text colour. */
  color: ColorSchema.nullable(),
  /** Bulleted lines. */
  bullets: z.boolean(),
})

export const SlideElementSchema = z.discriminatedUnion('type', [
  SlideElementBaseSchema.extend({
    type: z.literal('text'),
    /** Lines separated by newlines. */
    text: z.string().max(5000),
    style: TextStyleSchema,
    /** Text boxes placed by a layout keep their role (title, body…). */
    role: z.enum(['title', 'subtitle', 'body']).optional(),
  }),
  SlideElementBaseSchema.extend({
    type: z.literal('shape'),
    shape: z.enum(['rect', 'rounded', 'ellipse', 'arrow', 'line']),
    /** Colours, or null for the theme's accent colour / no outline. */
    fill: ColorSchema.nullable(),
    stroke: ColorSchema.nullable(),
    text: z.string().max(1000),
  }),
  SlideElementBaseSchema.extend({
    type: z.literal('image'),
    /** The picture itself, as a data URL (resized when inserted). */
    src: z
      .string()
      .max(3_000_000)
      .regex(/^data:image\/(png|jpeg|gif|webp);base64,/),
    alt: z.string().max(300),
  }),
  SlideElementBaseSchema.extend({
    type: z.literal('chart'),
    chart: ChartSpecSchema,
  }),
])

export const SLIDE_LAYOUTS = [
  'title',
  'title-content',
  'two-column',
  'section',
  'title-only',
  'blank',
] as const

export const SLIDE_THEMES = ['corporate', 'midnight', 'fresh', 'warm'] as const

export const SlideSchema = z.object({
  id: IdSchema,
  layout: z.enum(SLIDE_LAYOUTS),
  elements: z.array(SlideElementSchema).max(100),
  /** Speaker notes. */
  notes: z.string().max(5000),
})

export const SlidesContentSchema = z.object({
  theme: z.enum(SLIDE_THEMES),
  slides: z.array(SlideSchema).min(1).max(200),
})

export const SlidesDocumentSchema = DocumentBaseSchema.extend({
  kind: z.literal('slides'),
  content: SlidesContentSchema,
})

/**
 * Any saved document. New apps (Docs, Slides, ...) are added here as new
 * `kind`s, and they automatically share autosave, versions and backups.
 */
export const DocumentSchema = z.discriminatedUnion('kind', [
  SheetDocumentSchema,
  DocDocumentSchema,
  SlidesDocumentSchema,
])

/**
 * The current content-format version of each document kind. When a kind's
 * content format changes, raise its number here and add an upgrade step in
 * `documentMigrations.ts`.
 */
export const DOCUMENT_FORMAT_VERSIONS = {
  sheet: 3,
  doc: 1,
  slides: 1,
} as const satisfies Record<z.infer<typeof DocumentSchema>['kind'], number>

/** Why a version snapshot was taken. */
export const VersionReasonSchema = z.enum([
  'auto', // periodic snapshot while editing
  'close', // player left the document
  'before-restore', // safety copy taken just before restoring an older version
  'manual', // player chose to keep this version
  'submitted', // the workbook as it was handed in for grading (always kept)
  'original', // an assignment workbook as it was received (always kept)
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
  /** The report and presentation created for the task, if it has them. */
  files: z.object({ doc: IdSchema.optional(), slides: IdSchema.optional() }).optional(),
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
  kind: z.enum([
    'welcome',
    'briefing',
    'feedback',
    'promotion',
    'review',
    'info',
    'sent',
  ]),
  /** For messages the player sent: who to ("manager"). */
  to: z.string().optional(),
  /** Files attached to the message. */
  attachments: z
    .array(
      z.object({
        documentId: IdSchema,
        kind: z.enum(['sheet', 'doc', 'slides']),
        title: z.string(),
      }),
    )
    .max(20)
    .optional(),
  assignmentId: z.string().optional(),
  /** For feedback: which attempt (0-based) it is about. */
  attemptIndex: z.number().int().nonnegative().optional(),
})

// ---------------------------------------------------------------------------
// The working life: the office clock, wellbeing, colleagues and events
// ---------------------------------------------------------------------------

/**
 * Office time. `day` 1 is the player's first Monday; `minute` counts minutes
 * since midnight on that day (fractions build up while working).
 * "Absolute" times used for deadlines are `(day - 1) * 1440 + minute`.
 */
const OfficeMinuteSchema = z
  .number()
  .min(0)
  .max(24 * 60)
const PercentSchema = z.number().min(0).max(100)

export const WellbeingSchema = z.object({
  /** How much the player has left in the tank today. */
  energy: PercentSchema,
  /** Pressure from workload, deadlines and conflict. */
  stress: PercentSchema,
  /** How motivated and involved the player feels. */
  engagement: PercentSchema,
  /** Tiredness that builds up over several days and needs evenings and weekends to clear. */
  fatigue: PercentSchema,
})

export const RelationshipSchema = z.object({
  /** How much this colleague trusts and respects the player. */
  trust: PercentSchema,
  /** Conversations so far. */
  talks: z.number().int().nonnegative(),
})

/** One line in today's activity log, e.g. "Joined the team stand-up". */
export const LogEntrySchema = z.object({
  minute: OfficeMinuteSchema,
  text: z.string(),
  tone: z.enum(['good', 'neutral', 'bad']),
})

export const TodaySchema = z.object({
  lunch: z.boolean(),
  /** When the player last had a proper break (minute of today). */
  lastBreakAt: OfficeMinuteSchema,
  breaks: z.number().int().nonnegative(),
  /** Office minutes spent working at the computer today. */
  workMinutes: z.number().nonnegative(),
  meetings: z.record(z.string(), z.enum(['attended', 'late', 'missed'])),
  /** Conversations today per person, so chatting all day is not rewarded. */
  talks: z.record(z.string(), z.number().int().nonnegative()),
  submissions: z.number().int().nonnegative(),
  log: z.array(LogEntrySchema),
})

export const DeadlineSchema = z.object({
  /** Absolute office time the work is due. */
  due: z.number().nonnegative(),
  status: z.enum(['open', 'met', 'late']),
  extended: z.boolean(),
})

export const DaySummarySchema = z.object({
  day: z.number().int().min(1),
  workMinutes: z.number().nonnegative(),
  overtimeMinutes: z.number().nonnegative(),
  submissions: z.number().int().nonnegative(),
  meetingsAttended: z.number().int().nonnegative(),
  meetingsMissed: z.number().int().nonnegative(),
  lunch: z.boolean(),
  breaks: z.number().int().nonnegative(),
  wellbeing: WellbeingSchema,
  log: z.array(LogEntrySchema),
})

export const ReviewSchema = z.object({
  /** The day the review took place. */
  day: z.number().int().min(1),
  week: z.number().int().min(1),
  rating: z.enum(['outstanding', 'strong', 'solid', 'developing']),
  /** 1–5 per area, e.g. { quality: 4, reliability: 3, ... }. */
  scores: z.record(z.string(), z.number().int().min(1).max(5)),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
})

export const WorkStateSchema = z.object({
  day: z.number().int().min(1),
  minute: OfficeMinuteSchema,
  /** The player has gone home; the next day starts when they are ready. */
  dayOver: z.boolean(),
  today: TodaySchema,
  wellbeing: WellbeingSchema,
  /** Per person ID; colleagues the player has not met yet are missing. */
  relationships: z.record(z.string(), RelationshipSchema),
  /** How the wider office sees the player's professionalism. */
  reputation: PercentSchema,
  /** Per assignment ID. */
  deadlines: z.record(z.string(), DeadlineSchema),
  events: z.object({
    /** Finished events and conversations, with the choice the player made. */
    done: z.record(
      z.string(),
      z.object({ at: z.number().nonnegative(), choice: z.string().nullable() }),
    ),
    /** Events waiting for the player (someone wants a word). */
    pending: z.array(z.object({ id: z.string(), at: z.number().nonnegative() })),
  }),
  /** Finished days, newest last. */
  history: z.array(DaySummarySchema),
  reviews: z.array(ReviewSchema),
})

/** Current format of player profiles; raise it (with an upgrade) when the shape changes. */
export const PROFILE_FORMAT_VERSION = 2

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
  /** The working life around the tasks (added in profile format 2). */
  work: WorkStateSchema,
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
export type TextColor = (typeof TEXT_COLORS)[number]
export type SheetChart = z.infer<typeof SheetChartSchema>
export type ConditionalFormat = z.infer<typeof ConditionalFormatSchema>
export type DataValidation = z.infer<typeof DataValidationSchema>
export type SheetFilter = z.infer<typeof SheetFilterSchema>
export type Sheet = z.infer<typeof SheetSchema>
export type SheetContent = z.infer<typeof SheetContentSchema>
export type SheetDocument = z.infer<typeof SheetDocumentSchema>
export type ChartSpec = z.infer<typeof ChartSpecSchema>
export type ChartType = (typeof CHART_TYPES)[number]
export type DocContent = z.infer<typeof DocContentSchema>
export type DocDocument = z.infer<typeof DocDocumentSchema>
export type TextStyle = z.infer<typeof TextStyleSchema>
export type SlideElement = z.infer<typeof SlideElementSchema>
export type SlideLayout = (typeof SLIDE_LAYOUTS)[number]
export type SlideTheme = (typeof SLIDE_THEMES)[number]
export type Slide = z.infer<typeof SlideSchema>
export type SlidesContent = z.infer<typeof SlidesContentSchema>
export type SlidesDocument = z.infer<typeof SlidesDocumentSchema>
export type AnyDocument = z.infer<typeof DocumentSchema>
export type DocumentKind = AnyDocument['kind']
export type VersionReason = z.infer<typeof VersionReasonSchema>
export type DocumentVersion = z.infer<typeof DocumentVersionSchema>
export type Attempt = z.infer<typeof AttemptSchema>
export type AssignmentProgress = z.infer<typeof AssignmentProgressSchema>
export type MailMessage = z.infer<typeof MailMessageSchema>
export type Wellbeing = z.infer<typeof WellbeingSchema>
export type Relationship = z.infer<typeof RelationshipSchema>
export type LogEntry = z.infer<typeof LogEntrySchema>
export type Today = z.infer<typeof TodaySchema>
export type Deadline = z.infer<typeof DeadlineSchema>
export type DaySummary = z.infer<typeof DaySummarySchema>
export type Review = z.infer<typeof ReviewSchema>
export type WorkState = z.infer<typeof WorkStateSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type MetaEntry = z.infer<typeof MetaEntrySchema>
export type OutboxEntry = z.infer<typeof OutboxEntrySchema>
