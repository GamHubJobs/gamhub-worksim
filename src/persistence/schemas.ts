/**
 * Schemas: the exact shape of everything we save.
 *
 * Every piece of data is checked against these schemas when it is loaded, so
 * damaged or unexpected data is detected instead of crashing the app.
 * The TypeScript types (e.g. `SheetDocument`) are generated from the schemas,
 * so the code and the checks can never disagree.
 */
import { z } from 'zod'
import { GitSchema } from '../game/code/git'
import { DirectoryStateSchema } from '../tools/directory/schema'
import { DevicesStateSchema } from '../tools/devices/schema'
import { CommsStateSchema } from '../tools/comms/schema'
import { SocStateSchema } from '../tools/soc/schema'
import { ItopsStateSchema } from '../tools/itops/schema'
import { NetworkStateSchema } from '../tools/network/schema'
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

/**
 * The workbook (or document, or presentation) as a real file, kept when it is
 * edited in an office app (Grid Craft, Word Craft, Deck Craft): everything the app can do (borders, merged cells, pivot tables…)
 * is in it. `sheets` is still what is graded; `basis` is the fingerprint of
 * the sheets it was saved with, so an edit made elsewhere (the basic editor,
 * a restored version) is noticed and the file rebuilt from the sheets.
 */
export const CraftFileSchema = z.object({
  format: z.enum(['xlsx', 'docx', 'pptx']),
  app: z.string().min(1).max(40),
  /** The file, base64-encoded. */
  data: z.string().max(40_000_000),
  basis: z.string().max(40),
})

export const SheetContentSchema = z.object({
  sheets: z.array(SheetSchema).min(1),
  /** Added with the office apps: absent in workbooks made before them. */
  file: CraftFileSchema.optional(),
})

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const DocumentBaseSchema = SyncFieldsSchema.extend({
  title: z.string().min(1).max(200),
  /**
   * The career save the document belongs to. Files without an owner (made
   * before careers existed, and the practice workbook) belong to everyone.
   */
  owner: IdSchema.optional(),
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
  /**
   * The document as a real .docx file, kept when it is edited in Word Craft
   * (see CraftFileSchema). Added with the office apps: absent before them.
   */
  file: CraftFileSchema.optional(),
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
  /**
   * The presentation as a real .pptx, when it is edited in Deck Craft
   * (see CraftFileSchema). Added with the office apps: absent before them.
   */
  file: CraftFileSchema.optional(),
})

export const SlidesDocumentSchema = DocumentBaseSchema.extend({
  kind: z.literal('slides'),
  content: SlidesContentSchema,
})

// ---------------------------------------------------------------------------
// Ticket queues (Help Desk)
// ---------------------------------------------------------------------------

export const TICKET_PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const
export const TICKET_STATUSES = [
  'new',
  'open',
  'pending',
  'escalated',
  'resolved',
  // For tickets tied to the company's systems (see game/incidents.ts):
  'assigned',
  'reopened',
  'closed',
] as const

const SystemName = z.string().min(1).max(100)

/**
 * What must be true in the company's systems for a ticket's problem to be
 * fixed. Each is checked against the simulated state (Network Tools or
 * Directory), never against what the player says. See game/incidents.ts.
 */
export const TicketConditionSchema = z.discriminatedUnion('type', [
  /** Network Tools: the device is responding. */
  z.object({ type: z.literal('device-up'), device: SystemName }),
  /** Network Tools: the service is running on a responding device. */
  z.object({
    type: z.literal('service-running'),
    device: SystemName,
    port: z.number().int().min(1).max(65535),
  }),
  /** Network Tools: from a computer, a host answers (on a port, if given). */
  z.object({
    type: z.literal('can-reach'),
    from: SystemName,
    host: SystemName,
    port: z.number().int().min(1).max(65535).optional(),
  }),
  /** Network Tools: a DNS record points to this address. */
  z.object({ type: z.literal('dns-record'), name: SystemName, ip: SystemName }),
  /** Directory: the account is not locked. */
  z.object({ type: z.literal('account-unlocked'), user: SystemName }),
  /** Directory: the account is enabled. */
  z.object({ type: z.literal('account-enabled'), user: SystemName }),
  /** Directory: a new temporary password has been issued. */
  z.object({ type: z.literal('password-reset'), user: SystemName }),
  /** Directory: the user is in the group (and so has its access). */
  z.object({ type: z.literal('in-group'), user: SystemName, group: SystemName }),
  // Devices (tools/devices): the user's computer itself works.
  /** The processor is not overloaded (at most this %). */
  z.object({
    type: z.literal('device-performance'),
    device: SystemName,
    maxCpu: z.number().min(1).max(100),
  }),
  /** At least this much free storage (GB). */
  z.object({
    type: z.literal('disk-free'),
    device: SystemName,
    minGb: z.number().min(0),
  }),
  /** The app is installed and does not crash. */
  z.object({ type: z.literal('app-working'), device: SystemName, app: SystemName }),
  /** A Windows service is running on the device. */
  z.object({
    type: z.literal('device-service'),
    device: SystemName,
    service: SystemName,
  }),
  /** Its network settings are the company standard. */
  z.object({ type: z.literal('network-standard'), device: SystemName }),
  /** No update failed or pending, and no restart pending. */
  z.object({ type: z.literal('updates-installed'), device: SystemName }),
  /** Nothing stuck in its print queue. */
  z.object({ type: z.literal('print-queue-clear'), device: SystemName }),
  // Security Console (tools/soc): the incident has been worked through to the end.
  z.object({ type: z.literal('incident-closed'), incident: SystemName }),
  // IT Operations (tools/itops): the shared estate.
  /** Server Room: the node is up and everything above it works. */
  z.object({ type: z.literal('node-up'), node: SystemName }),
  /** Server Room: a service on a server is running. */
  z.object({ type: z.literal('node-service'), node: SystemName, service: SystemName }),
  /** Mail Admin: the mailbox is under its quota (it can receive mail). */
  z.object({ type: z.literal('mailbox-receiving'), mailbox: SystemName }),
  /** Mail Admin / Security: a message has reached the mailbox. */
  z.object({ type: z.literal('message-delivered'), message: SystemName }),
  /** Mail Security: the sender is not on the blocked list. */
  z.object({ type: z.literal('sender-allowed'), sender: SystemName }),
  /** Mail Security: the sender is on the blocked list. */
  z.object({ type: z.literal('sender-blocked'), sender: SystemName }),
  /** Mail Admin: an inbox rule is gone or switched off. */
  z.object({ type: z.literal('rule-removed'), mailbox: SystemName, rule: SystemName }),
  /** Assets: the person holds a working computer with this build. */
  z.object({
    type: z.literal('has-computer'),
    user: SystemName,
    build: z.enum(['imaging', 'manual']),
  }),
  /** Assets: the asset is in this status. */
  z.object({ type: z.literal('asset-status'), tag: SystemName, status: SystemName }),
  /** Assets: the person holds a seat of the licence. */
  z.object({
    type: z.literal('licence-assigned'),
    user: SystemName,
    product: SystemName,
  }),
  /** Ship Manager: equipment has been delivered to the person. */
  z.object({ type: z.literal('delivered'), user: SystemName, item: SystemName }),
  /** Repair Bench: the laptop's failed part is replaced and it is back with its holder. */
  z.object({ type: z.literal('hardware-ok'), tag: SystemName }),
])

export const TICKET_ACTIVITY_KINDS = [
  'created',
  'assigned',
  'status',
  'change',
  'condition-ok',
  'condition-failed',
  'resolved',
  'resolve-rejected',
  'update-sent',
  'reopened',
  'closed',
  // Identity verification and the security policy (tools/directory/security.ts):
  'verification',
  'security',
  // A guidance hint opened (game/guidance.ts).
  'hint',
  // A voicemail or call linked to the ticket (tools/comms).
  'contact',
] as const

/** One event in a ticket's history. */
export const TicketActivitySchema = z.object({
  /** When it happened (milliseconds since 1970). */
  at: z.number().nonnegative(),
  /** The office clock at the time, e.g. "Day 4, 09:42". */
  time: z.string().max(40).default(''),
  kind: z.enum(TICKET_ACTIVITY_KINDS),
  text: z.string().max(500),
  /** The office clock (absolute minutes since day 1), for SLAs (game/sla.ts). */
  office: z.number().nonnegative().optional(),
})

/** The business impact of a ticket's problem: the service, how many people, and what is at risk. */
export const TicketImpactSchema = z.object({
  service: z.string().max(100),
  people: z.number().int().min(1).max(10000),
  /** What is at risk and when, e.g. "Payroll run at 12:00". */
  deadline: z.string().max(100).default(''),
})

/** A support request from a colleague, and what the service desk did about it. */
export const TicketSchema = z.object({
  id: z.string().min(1).max(30),
  from: z.string().max(100),
  department: z.string().max(100),
  /** When it arrived, e.g. "08:42". */
  received: z.string().max(20),
  subject: z.string().max(200),
  body: z.string().max(5000),
  priority: z.enum(TICKET_PRIORITIES).nullable(),
  category: z.string().max(50).nullable(),
  status: z.enum(TICKET_STATUSES),
  /** The reply sent to the requester. */
  reply: z.string().max(5000),
  /** Internal notes for colleagues. */
  note: z.string().max(5000),
  /** The colleague who raised it, as an office person ID (for what happens to them). */
  requester: z.string().max(40).optional(),
  /**
   * What must be true in the company's systems for it to be fixed. A ticket
   * with conditions is resolved by fixing the problem, not by choosing
   * Resolved (see game/incidents.ts); one without works as before.
   */
  conditions: z.array(TicketConditionSchema).max(8).default([]),
  /** Who is working on it ("you"), once someone has taken it. */
  assignee: z.string().max(60).nullable().default(null),
  /** Everything that happened to it, oldest first. */
  activity: z.array(TicketActivitySchema).max(200).default([]),
  /** How it was resolved: the fix found by the systems, or confirmed by hand. */
  resolution: z
    .object({
      by: z.enum(['automatic', 'manual']),
      explanation: z.string().max(500),
      at: z.number().nonnegative(),
    })
    .nullable()
    .default(null),
  /** Guidance hints opened on it (0 to 4; see game/guidance.ts). */
  hintsUsed: z.number().int().min(0).max(4).default(0),
  /** What the problem costs the business (from the task): shown with the ticket and in the Overview. */
  impact: TicketImpactSchema.optional(),
  /** Comes in during the office day, at its received time (game/sla.ts). */
  arrivesLater: z.boolean().optional(),
})

/**
 * The company's systems a ticket queue is connected to: the state of Network
 * Tools and Directory that its tickets' conditions are checked against.
 */
export const TicketEnvironmentSchema = z.object({
  network: NetworkStateSchema.optional(),
  directory: DirectoryStateSchema.optional(),
  devices: DevicesStateSchema.optional(),
  comms: CommsStateSchema.optional(),
  soc: SocStateSchema.optional(),
  itops: ItopsStateSchema.optional(),
})

export const TicketsContentSchema = z.object({
  categories: z.array(z.string().min(1).max(50)).min(1).max(20),
  tickets: z.array(TicketSchema).max(100),
  /** Knowledge-base articles the desk works from (read-only). */
  knowledge: z.array(z.object({ title: z.string(), body: z.string() })).max(30),
  /** The systems the tickets are tied to, for queues whose tickets have conditions. */
  environment: TicketEnvironmentSchema.optional(),
  /** The office day the queue started (for SLAs on the office clock). */
  officeDay: z.number().int().positive().optional(),
})

export const TicketsDocumentSchema = DocumentBaseSchema.extend({
  kind: z.literal('tickets'),
  content: TicketsContentSchema,
})

// ---------------------------------------------------------------------------
// Code projects (Code)
// ---------------------------------------------------------------------------

export const CodeFileSchema = z.object({
  /** A plain file name such as "invoice.js" (no folders). */
  name: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[\w.-]+$/),
  text: z.string().max(200_000),
  /** Files the task provides that must not be changed, e.g. the code under test. */
  readOnly: z.boolean().default(false),
})

export const CodeContentSchema = z.object({
  language: z.literal('javascript'),
  files: z.array(CodeFileSchema).min(1).max(20),
  /** The project's Git repository (created by the first git command). */
  git: GitSchema.optional(),
  /** The terminal's history. */
  terminal: z
    .array(
      z.object({
        command: z.string().max(500),
        output: z.array(z.string().max(500)).max(300),
      }),
    )
    .max(200)
    .optional(),
  /** Calls made in the debug console. */
  debug: z
    .array(
      z.object({
        file: z.string().max(60),
        fn: z.string().max(60),
        args: z.string().max(2000),
        value: z.string().max(500).nullable(),
        error: z.string().max(500).nullable(),
      }),
    )
    .max(100)
    .optional(),
})

export const CodeDocumentSchema = DocumentBaseSchema.extend({
  kind: z.literal('code'),
  content: CodeContentSchema,
})

// ---------------------------------------------------------------------------
// Professional tools (Books, Network Tools, Data Studio, …)
// ---------------------------------------------------------------------------

/**
 * A file of a professional tool. The tool validates its own state (see
 * `src/tools`), so new tools need no change here.
 */
export const ToolContentSchema = z.object({
  tool: z.string().regex(/^[a-z][a-z0-9-]*$/),
  state: z.unknown(),
})

export const ToolDocumentSchema = DocumentBaseSchema.extend({
  kind: z.literal('tool'),
  content: ToolContentSchema,
})

/**
 * Any saved document. New apps (Docs, Slides, ...) are added here as new
 * `kind`s, and they automatically share autosave, versions and backups.
 */
export const DocumentSchema = z.discriminatedUnion('kind', [
  SheetDocumentSchema,
  DocDocumentSchema,
  SlidesDocumentSchema,
  TicketsDocumentSchema,
  CodeDocumentSchema,
  ToolDocumentSchema,
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
  tickets: 1,
  code: 1,
  tool: 1,
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
  /** Guidance hints opened for this attempt (Help Desk tasks); XP is reduced a little for each. */
  hintsUsed: z.number().int().nonnegative().optional(),
  /** The version-history copy of the workbook as submitted. */
  versionId: IdSchema.optional(),
  /** The version-history copies of the report and presentation handed in with it. */
  files: z.object({ doc: IdSchema.optional(), slides: IdSchema.optional() }).optional(),
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
    'case',
  ]),
  /** For messages the player sent: who to ("manager"). */
  to: z.string().optional(),
  /** Files attached to the message. */
  attachments: z
    .array(
      z.object({
        documentId: IdSchema,
        kind: z.enum(['sheet', 'doc', 'slides', 'tickets', 'code', 'tool']),
        title: z.string(),
      }),
    )
    .max(20)
    .optional(),
  assignmentId: z.string().optional(),
  /** For feedback: which attempt (0-based) it is about. */
  attemptIndex: z.number().int().nonnegative().optional(),
  /** For case messages: the case they are about. */
  caseId: z.string().optional(),
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
  /** What the player said last time (see game/encounters.ts), so they remember. */
  last: z.string().optional(),
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

/** One case in a career save: when it arrived, the player's answers, and the result. */
export const CaseProgressSchema = z.object({
  caseId: z.string(),
  version: z.number().int().positive(),
  status: z.enum(['open', 'submitted', 'lapsed']),
  /** Absolute office times (see `DeadlineSchema`). */
  arrivedAt: z.number().nonnegative(),
  due: z.number().nonnegative(),
  /** Draft answers by step ID, checked against the step when graded. */
  answers: z.record(z.string(), z.unknown()),
  /** Files made for the case's document steps, by step ID. */
  files: z.record(z.string(), IdSchema).default({}),
  /** The variant the case arrived in (see `game/caseVariants.ts`); missing = the original. */
  variant: z.string().optional(),
  /** For meeting cases: when the player joined the meeting (absolute office time). */
  joinedAt: z.number().nonnegative().optional(),
  result: z
    .object({
      submittedAt: TimestampSchema,
      score: z.number().int().min(0).max(100),
      rating: z.enum(['excellent', 'good', 'pass', 'fail']),
      steps: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          earned: z.number().nonnegative(),
          points: z.number().nonnegative(),
          notes: z.array(z.string()),
        }),
      ),
    })
    .optional(),
})

/** The organisation as this career save sees it. */
export const OrgStateSchema = z.object({
  /** 0–100: client satisfaction, operational risk (lower is better), budget discipline. */
  indicators: z.object({
    satisfaction: PercentSchema,
    risk: PercentSchema,
    discipline: PercentSchema,
  }),
  /** Spending committed this quarter, by department ID. */
  spend: z.record(z.string(), z.number()),
})

/** One attempt at a readiness assessment: like a case, numbered. */
export const AssessmentAttemptSchema = CaseProgressSchema.extend({
  attempt: z.number().int().positive(),
})

/**
 * What a career save remembers about the player's development that cannot be
 * worked out again later (added in profile format 4). Everything else in the
 * career record is derived from saved tasks and cases.
 */
export const CareerRecordSchema = z.object({
  /** Levels reached, oldest first. Day and time are null for promotions made before records began. */
  promotions: z
    .array(
      z.object({
        levelId: z.string(),
        day: z.number().int().min(1).nullable(),
        at: TimestampSchema.nullable(),
        xp: z.number().int().nonnegative().nullable(),
      }),
    )
    .default([]),
  /** Earned achievements by ID: the office day and the time they were earned. */
  achievements: z
    .record(z.string(), z.object({ day: z.number().int().min(1), at: TimestampSchema }))
    .default({}),
  /**
   * Every readiness assessment attempt, oldest first (kept for good, passed or not).
   * `caseId` is the assessment ID and `variant` the version taken.
   */
  assessments: z.array(AssessmentAttemptSchema).default([]),
  /** Chosen desk items by slot (e.g. { plant: 'fern' }). */
  desk: z.record(z.string(), z.string()).default({}),
  /** Chooses this save's variant of each case (0 = the original wording). */
  seed: z.number().int().nonnegative().default(0),
  /**
   * How the player uses WorkSim AI (see game/aiUse.ts): evidence for the AI
   * competencies, never a count to reward. Added without a format change: older
   * saves start empty.
   */
  ai: z
    .object({
      questions: z.number().int().nonnegative().default(0),
      /** Prompt scores (0–4) of the latest questions. */
      promptScores: z.array(z.number().int().min(0).max(4)).default([]),
      /** Answers written by an AI model, and how many the player marked as checked. */
      modelAnswers: z.number().int().nonnegative().default(0),
      verified: z.number().int().nonnegative().default(0),
      proposals: z
        .object({
          applied: z.number().int().nonnegative().default(0),
          dismissed: z.number().int().nonnegative().default(0),
        })
        .prefault({}),
      /** Warnings about personal or secret data in a prompt, and how often heeded. */
      privacyWarnings: z.number().int().nonnegative().default(0),
      privacyHeeded: z.number().int().nonnegative().default(0),
      /** Questions asked in Learning mode. */
      learning: z.number().int().nonnegative().default(0),
      firstUsedDay: z.number().int().min(1).nullable().default(null),
    })
    .prefault({}),
})

/** Needs outside work (0–100, high is good): see content/life.ts. */
export const NeedsSchema = z.object({
  hunger: PercentSchema.default(80),
  hygiene: PercentSchema.default(85),
  social: PercentSchema.default(70),
  fun: PercentSchema.default(70),
})

/**
 * Life outside work (added without a format change: older saves start it on
 * their next evening). While at work it rests; after work the evening and the
 * morning run on the home clock.
 */
export const LifeSchema = z.object({
  /** Where the player's day is: at work, at home in the evening, or the morning. */
  phase: z.enum(['work', 'evening', 'morning']).default('work'),
  /** The home clock, in minutes since midnight (past 24:00 late at night). */
  minute: z.number().int().nonnegative().default(0),
  needs: NeedsSchema.prefault({}),
  /** Money, in pence; can go below zero. */
  money: z.number().int().default(30000),
  /** Meals in the fridge. */
  food: z.number().int().nonnegative().default(4),
  /** This morning's routine. */
  ready: z
    .object({
      ate: z.boolean().default(false),
      showered: z.boolean().default(false),
      dressed: z.boolean().default(false),
    })
    .prefault({}),
  /** When the player went to bed last night (home-clock minutes), if they did. */
  bedtime: z.number().int().nonnegative().nullable().default(null),
  /** The last way they travelled to work. */
  commute: z.enum(['walk', 'bike', 'bus', 'car', 'taxi']).default('bus'),
  /** What the player owns to get around (see content/transport.ts). */
  vehicles: z
    .object({
      bike: z.boolean().default(false),
      /** A car on a weekly lease, paid on Mondays. */
      car: z.boolean().default(false),
      /** The last week the lease was paid. */
      carWeek: z.number().int().nonnegative().default(0),
    })
    .prefault({}),
  /**
   * A takeaway on its way (see game/delivery.ts): paid when ordered, handed over at
   * the door when it arrives (or left on the doorstep if no one is in), then eaten.
   * Added later: older saves have none.
   */
  delivery: z
    .object({
      id: z.string(),
      /** Home-clock minutes: when it was ordered and when it arrives. */
      ordered: z.number().int().nonnegative(),
      due: z.number().int().nonnegative(),
      /** On its way (or at the door), or in the player's hands, not yet eaten. */
      status: z.enum(['coming', 'received']),
    })
    .nullable()
    .default(null),
  /** Job hunting, pay talks and a side business (see content/careerLife.ts). */
  career: z
    .object({
      /** Applications to other employers, newest last. */
      applications: z
        .array(
          z.object({
            jobId: z.string(),
            /** The day the player applied. */
            day: z.number().int().min(1),
            stage: z.enum([
              'applied',
              'rejected',
              'interview',
              'failed',
              'offer',
              'declined',
              'used',
              'expired',
            ]),
            /** The day the stage changed. */
            since: z.number().int().min(1),
            /** The weekly pay offered, in pence. */
            offer: z.number().int().nonnegative().nullable().default(null),
            /** What the employer said: reasons, interview feedback. */
            notes: z.array(z.string()).max(8).default([]),
          }),
        )
        .max(20)
        .default([]),
      /** Pay rises so far, in per cent on top of the level's pay. */
      raisePct: z.number().int().nonnegative().default(0),
      /** The week of the last pay talk. */
      talkWeek: z.number().int().nonnegative().default(0),
      /** A request for a rise waiting for the manager's answer. */
      payTalk: z
        .object({
          ask: z.number().int().positive(),
          day: z.number().int().min(1),
          /** The outside offer cited, by job ID. */
          offerJob: z.string().nullable().default(null),
        })
        .nullable()
        .default(null),
      /** The last answer about pay, for the panel. */
      payAnswer: z.string().nullable().default(null),
      business: z
        .object({
          id: z.enum(['tutoring', 'crafts', 'repairs']).nullable().default(null),
          sessions: z.number().int().nonnegative().default(0),
          earned: z.number().int().nonnegative().default(0),
          /** Evenings this week, to warn about overdoing it. */
          week: z.number().int().nonnegative().default(0),
          weekSessions: z.number().int().nonnegative().default(0),
        })
        .prefault({}),
    })
    .prefault({}),
  /** Money in and out, newest last (the last 60). */
  ledger: z
    .array(
      z.object({
        day: z.number().int().min(1),
        text: z.string(),
        amount: z.number().int(),
      }),
    )
    .max(60)
    .default([]),
  /** Week numbers already paid and charged rent (so nothing happens twice). */
  paidWeek: z.number().int().nonnegative().default(0),
  rentWeek: z.number().int().nonnegative().default(0),
  /** What happened at home this evening and morning, for the panel. */
  log: z.array(z.string()).max(30).default([]),
  /** Bonds with the adults of the world (see game/romance.ts); none for older saves. */
  bonds: z
    .record(
      z.string(),
      z.object({
        stage: z.enum([
          'met',
          'friends',
          'close',
          'dating',
          'partners',
          'engaged',
          'married',
          'separated',
        ]),
        closeness: PercentSchema,
        attraction: PercentSchema,
        known: z.array(z.string()).max(12).default([]),
        declined: z
          .array(z.object({ step: z.string(), day: z.number().int() }))
          .max(12)
          .default([]),
        date: z
          .object({
            day: z.number().int(),
            minute: z.number().int(),
            place: z.enum(['cafe', 'park']),
          })
          .nullable()
          .default(null),
        dates: z.number().int().nonnegative().default(0),
        history: z
          .array(z.object({ day: z.number().int(), text: z.string() }))
          .max(20)
          .default([]),
        /** An evening at the player's home arranged (the day). */
        visit: z.number().int().nullable().default(null),
        /** The night they stay over (the day), if they said yes. */
        stayOver: z.number().int().nullable().default(null),
        /** The wedding, once a date is set (the day, in the park). */
        wedding: z.number().int().nullable().default(null),
      }),
    )
    .default({}),
  /** A family, if the player and their partner chose one (see game/family.ts). */
  family: z
    .object({
      children: z
        .array(
          z.object({ name: z.string(), born: z.number().int(), adopted: z.boolean() }),
        )
        .max(4)
        .default([]),
      /** A child on the way (the day they arrive), and whether adopted. */
      expected: z
        .object({ day: z.number().int(), adopted: z.boolean() })
        .nullable()
        .default(null),
    })
    .prefault({}),
  /** Someone who lives with the player (see game/home life), if anyone. */
  partner: z.object({ id: z.string(), since: z.number().int() }).nullable().default(null),
  /** Finding the way (see world/map): where the player is heading, recent places, places found. */
  nav: z
    .object({
      destination: z
        .enum(['home', 'office', 'cafe', 'shop', 'gym', 'park', 'garage'])
        .nullable()
        .default(null),
      recent: z
        .array(z.enum(['home', 'office', 'cafe', 'shop', 'gym', 'park', 'garage']))
        .max(5)
        .default([]),
      /** Places the player has been to or walked past (the rest show as "not yet found"). */
      found: z
        .array(z.enum(['home', 'office', 'cafe', 'shop', 'gym', 'park', 'garage']))
        .default(['home', 'office']),
    })
    .prefault({}),
  /** The phone's settings (see phone/): kept with the career, defaults for older saves. */
  phone: z
    .object({
      wallpaper: z.number().int().nonnegative().default(0),
      ringtone: z.number().int().nonnegative().default(0),
      /** Banners for new messages, deliveries, meetings and missions. */
      notifications: z.boolean().default(true),
      /** The mini-map on the screen while playing. */
      minimap: z.boolean().default(true),
      /** Posts liked in the social app (by id, the latest 50). */
      liked: z.array(z.string()).max(50).default([]),
    })
    .prefault({}),
  /** Friends outside work, and the phone (see content/friends.ts and game/social.ts). */
  social: z
    .object({
      /** By friend ID; friends not yet listed start at the starting friendship. */
      friends: z
        .record(
          z.string(),
          z.object({
            friendship: PercentSchema,
            /** The last day the player was in touch. */
            lastDay: z.number().int().min(1),
          }),
        )
        .default({}),
      /** Messages on the phone, newest last (the last 40). */
      messages: z
        .array(
          z.object({
            id: z.string(),
            /** A friend ID, or 'me' for the player's own replies. */
            from: z.string(),
            to: z.string().optional(),
            day: z.number().int().min(1),
            minute: z.number().int().nonnegative(),
            text: z.string(),
            read: z.boolean().default(false),
            /** An invitation, and what became of it. */
            invite: z
              .object({
                kind: z.enum(['dinner', 'film', 'run', 'quiz', 'drinks', 'game']),
                status: z.enum(['open', 'accepted', 'declined', 'done', 'missed']),
              })
              .optional(),
          }),
        )
        .max(40)
        .default([]),
    })
    .prefault({}),
  /** Where the player is out of work hours: at home, or out in the neighbourhood (see content/city.ts). */
  city: z
    .object({
      /** The place they are at, or last left. */
      at: z
        .enum(['home', 'office', 'cafe', 'shop', 'gym', 'park', 'garage'])
        .default('home'),
      /** Inside it, or out in the street. */
      inside: z.boolean().default(true),
      /** Riding their bike around the neighbourhood (twice as quick as walking). */
      riding: z.boolean().default(false),
    })
    .prefault({}),
  /** Where the player lives and what is in it (see content/home.ts). */
  home: z
    .object({
      id: z.enum(['studio', 'flat', 'house']).default('studio'),
      /** By slot: the furniture item and which of its colours. */
      furniture: z
        .record(
          z.string(),
          z.object({
            item: z.string(),
            colour: z.number().int().nonnegative().default(0),
          }),
        )
        .default({
          bed: { item: 'bed-basic', colour: 0 },
          kitchen: { item: 'kitchen-basic', colour: 0 },
          shower: { item: 'shower-basic', colour: 0 },
          table: { item: 'table-small', colour: 0 },
        }),
    })
    .prefault({}),
})

/**
 * Story Mode (see game/story/): the campaign being played, which chapter, the
 * mission under way and its objectives done, missions finished, the player's
 * decisions and the flags they set. Missing for free play (older saves too).
 */
export const StorySchema = z.object({
  campaign: z.string(),
  /** The day it was started. */
  started: z.number().int(),
  chapter: z.string(),
  /** The mission being played, if any. */
  active: z.string().nullable(),
  /** Per mission: the objectives done. */
  progress: z.record(z.string(), z.array(z.string())),
  /** Missions finished, in order. */
  done: z.array(z.string()),
  /** Per scene: the choice made. */
  decisions: z.record(z.string(), z.string()),
  flags: z.array(z.string()),
  /** The last mission finished, until its summary has been read. */
  finished: z.string().nullable().default(null),
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
  /** Story Mode, if the player is playing a story (free play otherwise). */
  story: StorySchema.optional(),
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
  /** Cases by case ID (added in profile format 3). */
  cases: z.record(z.string(), CaseProgressSchema).default({}),
  org: OrgStateSchema.default({
    indicators: { satisfaction: 70, risk: 30, discipline: 70 },
    spend: {},
  }),
  /** The career record (added in profile format 4). */
  record: CareerRecordSchema.prefault({}),
  /** Life outside work (see LifeSchema). */
  life: LifeSchema.prefault({}),
  /**
   * Colleagues held up by a fault on one of the player's tickets (a laptop
   * off the Wi-Fi, a locked account), and those whose problem is now fixed.
   * Kept in step with the ticket queues (see game/incidents.ts).
   */
  disruptions: z
    .array(
      z.object({
        /** Office person ID. */
        person: z.string().max(40),
        assignment: z.string().max(100),
        ticket: z.string().max(30),
        state: z.enum(['blocked', 'restored']),
        /** What they cannot use, e.g. "the Wi-Fi". */
        what: z.string().max(100),
        /**
         * Where verifying them stands, for an account change that needs it:
         * being checked, not verified, waiting for approval, fed up with the
         * wait, or verified (and grateful once it is fixed).
         */
        stage: z
          .enum([
            'verifying',
            'unverified',
            'awaiting-approval',
            'frustrated',
            'verified',
          ])
          .optional(),
      }),
    )
    .max(50)
    .default([]),
  /** Knowledge Base articles the player bookmarked (article IDs). */
  kbBookmarks: z.array(z.string().max(60)).max(100).default([]),
})

/** Current format of player profiles; raise it (with an upgrade) when the shape changes. */
export const PROFILE_FORMAT_VERSION = 4

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
// Portfolio: frozen evidence of passed work (Phase 5)
// ---------------------------------------------------------------------------

export const PORTFOLIO_FILE_ROLES = ['main', 'report', 'presentation'] as const

/**
 * One piece of passed work: what was asked, how it was assessed, and links to
 * frozen copies of the files handed in. Evidence fields are written only when a
 * task is passed (or by the backfill); the player can change only the
 * presentation fields (included, featured, note, order).
 */
export const PortfolioItemSchema = SyncFieldsSchema.extend({
  /** Unique per career save and task: "profileId|assignmentId" (or "|project:…"). */
  key: z.string().min(1).max(200),
  profileId: IdSchema,
  careerId: z.string(),
  type: z.enum(['task', 'project', 'case']),
  assignmentId: z.string().optional(),
  caseId: z.string().optional(),
  projectId: z.string().optional(),
  /** The task's content version when it was passed. */
  contentVersion: z.number().int().positive(),
  // What was asked, frozen when passed.
  title: z.string(),
  summary: z.string(),
  levelId: z.string(),
  levelTitle: z.string(),
  /** 1 for the career's first level, 2 for the next… */
  levelIndex: z.number().int().positive(),
  objectives: z.array(z.string()),
  skills: z.record(z.string(), z.number().int().nonnegative()),
  tools: z.array(z.string()),
  // The assessment of the attempt kept as evidence.
  completedAt: TimestampSchema,
  score: z.number().int().min(0).max(100),
  rating: z.enum(['excellent', 'good', 'pass']),
  passScore: z.number().int().min(0).max(100),
  checks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      why: z.string(),
      status: z.enum(['passed', 'partial', 'failed']),
      earned: z.number().int().nonnegative(),
      points: z.number().int().nonnegative(),
    }),
  ),
  /** Every attempt at the task, for its history. */
  attempts: z.array(z.object({ submittedAt: TimestampSchema, score: z.number().int() })),
  files: z.array(
    z.object({
      fileId: IdSchema,
      role: z.enum(PORTFOLIO_FILE_ROLES),
      kind: z.string(),
      toolId: z.string().optional(),
      title: z.string(),
      bytes: z.number().int().nonnegative(),
      /** False when the backfill could not find the file as submitted. */
      available: z.boolean(),
    }),
  ),
  /** For projects: the stages, each a task item with its own files. */
  stages: z
    .array(
      z.object({
        assignmentId: z.string(),
        itemId: IdSchema,
        title: z.string(),
        score: z.number().int().min(0).max(100),
      }),
    )
    .optional(),
  // The player's presentation choices.
  included: z.boolean(),
  featured: z.boolean(),
  note: z.string().max(600),
  order: z.number().int(),
})

/** A frozen copy of one file exactly as it was handed in. */
export const PortfolioFileSchema = SyncFieldsSchema.extend({
  itemId: IdSchema,
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
export type CellFormat = z.infer<typeof CellFormatSchema>
export type FillColor = (typeof FILL_COLORS)[number]
export type TextColor = (typeof TEXT_COLORS)[number]
export type SheetChart = z.infer<typeof SheetChartSchema>
export type ConditionalFormat = z.infer<typeof ConditionalFormatSchema>
export type DataValidation = z.infer<typeof DataValidationSchema>
export type SheetFilter = z.infer<typeof SheetFilterSchema>
export type Sheet = z.infer<typeof SheetSchema>
export type Life = z.infer<typeof LifeSchema>
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
export type Ticket = z.infer<typeof TicketSchema>
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]
export type TicketStatus = (typeof TICKET_STATUSES)[number]
export type TicketsContent = z.infer<typeof TicketsContentSchema>
export type TicketCondition = z.infer<typeof TicketConditionSchema>
export type TicketActivity = z.infer<typeof TicketActivitySchema>
export type TicketActivityKind = (typeof TICKET_ACTIVITY_KINDS)[number]
export type TicketEnvironment = z.infer<typeof TicketEnvironmentSchema>
export type Disruption = WorkState['disruptions'][number]
export type TicketsDocument = z.infer<typeof TicketsDocumentSchema>
export type CodeFile = z.infer<typeof CodeFileSchema>
export type CodeContent = z.infer<typeof CodeContentSchema>
export type CodeDocument = z.infer<typeof CodeDocumentSchema>
export type ToolContent = z.infer<typeof ToolContentSchema>
export type ToolDocument = z.infer<typeof ToolDocumentSchema>
export type PortfolioItem = z.infer<typeof PortfolioItemSchema>
export type PortfolioFile = z.infer<typeof PortfolioFileSchema>
export type PortfolioFileRole = (typeof PORTFOLIO_FILE_ROLES)[number]
export type AnyDocument = z.infer<typeof DocumentSchema>
export type DocumentKind = AnyDocument['kind']
export type VersionReason = z.infer<typeof VersionReasonSchema>
export type DocumentVersion = z.infer<typeof DocumentVersionSchema>
export type Attempt = z.infer<typeof AttemptSchema>
export type AssignmentProgress = z.infer<typeof AssignmentProgressSchema>
export type MailMessage = z.infer<typeof MailMessageSchema>
export type CaseProgress = z.infer<typeof CaseProgressSchema>
export type AssessmentAttempt = z.infer<typeof AssessmentAttemptSchema>
export type OrgState = z.infer<typeof OrgStateSchema>
export type Wellbeing = z.infer<typeof WellbeingSchema>
export type Relationship = z.infer<typeof RelationshipSchema>
export type LogEntry = z.infer<typeof LogEntrySchema>
export type Today = z.infer<typeof TodaySchema>
export type Deadline = z.infer<typeof DeadlineSchema>
export type DaySummary = z.infer<typeof DaySummarySchema>
export type Review = z.infer<typeof ReviewSchema>
export type WorkState = z.infer<typeof WorkStateSchema>
export type Story = z.infer<typeof StorySchema>
export type Profile = z.infer<typeof ProfileSchema>
export type MetaEntry = z.infer<typeof MetaEntrySchema>
export type OutboxEntry = z.infer<typeof OutboxEntrySchema>
