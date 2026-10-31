/**
 * The shape of game content (assignments, skills, careers). Content is data,
 * not code: new assignments are added as data files that follow these
 * blueprints, and a test checks every file against them.
 */
import { z } from 'zod'
import { CellFormatSchema } from '../persistence/schemas'

/** "Order!E2:E11" or "Order!E13": a sheet name and a cell or range. */
export const SheetRangeSchema = z
  .string()
  .regex(/^[^!]+![A-Z]{1,3}[1-9]\d*(:[A-Z]{1,3}[1-9]\d*)?$/, {
    message: 'Expected a range such as "Order!E2:E11"',
  })

const SkillGainsSchema = z.record(z.string(), z.number().int().positive())

const CheckBaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Short name shown in the results, e.g. "Line totals". */
  title: z.string().min(1),
  /** Why this matters at work. Shown with the result, pass or fail. */
  why: z.string().min(1),
  /** Advice shown when the check is not fully passed. */
  hint: z.string().min(1),
  points: z.number().int().positive(),
  /** Cells this check looks at. */
  cells: z.array(SheetRangeSchema).min(1),
})

export const CheckSchema = z.discriminatedUnion('type', [
  /** The cells show the same values as the model answer. */
  CheckBaseSchema.extend({
    type: z.literal('values'),
    /** The cells must contain formulas, not typed numbers. */
    requireFormula: z.boolean().default(false),
    /** The formulas must use (one of) these functions, e.g. ["SUM"]. */
    functions: z.array(z.string().regex(/^[A-Z]+$/)).default([]),
    /** Largest allowed difference for numbers (e.g. 0.005 = half a cent). */
    tolerance: z.number().nonnegative().default(0.005),
  }),
  /** The cells have the given formatting, e.g. { numberFormat: "currency" }. */
  CheckBaseSchema.extend({
    type: z.literal('format'),
    format: CellFormatSchema,
  }),
  /** The cells still contain exactly what they contained at the start. */
  CheckBaseSchema.extend({
    type: z.literal('unchanged'),
  }),
  /** The sheet has a chart drawn from (part of) these cells. */
  CheckBaseSchema.extend({
    type: z.literal('chart'),
  }),
])

export const FileCheckBaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  why: z.string().min(1),
  hint: z.string().min(1),
  points: z.number().int().positive(),
})

/** Alternative wordings, any of which counts, e.g. ["Summary", "Executive summary"]. */
const AlternativesSchema = z.array(z.string().min(1)).min(1)

/**
 * A check on a report (Docs) or presentation (Slides). Reports are checked
 * for structure, correct figures and key facts, the way a manager reads them.
 */
export const FileCheckSchema = z.discriminatedUnion('type', [
  /** Sections with these headings (reports) or slide titles (presentations). */
  FileCheckBaseSchema.extend({
    type: z.literal('sections'),
    sections: z.array(AlternativesSchema).min(1),
  }),
  /**
   * The text states these figures, taken from the model answer of the
   * workbook. Any sensible formatting and rounding is accepted.
   */
  FileCheckBaseSchema.extend({
    type: z.literal('figures'),
    figures: z
      .array(
        z.object({
          label: z.string().min(1),
          /** "Sheet!B9": a cell of the model answer. */
          cell: SheetRangeSchema.optional(),
          /** Or the figure itself (for tasks done in a professional tool). */
          value: z.number().optional(),
          percent: z.boolean().default(false),
        }),
      )
      .min(1),
  }),
  /** The text mentions each of these (e.g. the departments that are over budget). */
  FileCheckBaseSchema.extend({
    type: z.literal('mentions'),
    terms: z.array(AlternativesSchema).min(1),
  }),
  /** At least this many charts. */
  FileCheckBaseSchema.extend({
    type: z.literal('charts'),
    min: z.number().int().positive().default(1),
  }),
  /** At least one table (reports only). */
  FileCheckBaseSchema.extend({
    type: z.literal('table'),
  }),
  /** Words (reports) or slides (presentations), between these limits. */
  FileCheckBaseSchema.extend({
    type: z.literal('length'),
    min: z.number().int().positive(),
    max: z.number().int().positive().optional(),
  }),
])

/** A check on the tickets of a Help Desk task. */
export const TicketCheckSchema = z.discriminatedUnion('type', [
  /** Each listed ticket's priority, category or status matches the model answer. */
  FileCheckBaseSchema.extend({
    type: z.literal('field'),
    field: z.enum(['priority', 'category', 'status']),
    /** Ticket IDs to check; all tickets in the model answer if empty. */
    tickets: z.array(z.string()).default([]),
  }),
  /** The reply to a ticket says the right things, in enough words. */
  FileCheckBaseSchema.extend({
    type: z.literal('reply'),
    ticket: z.string(),
    /** Each group: any of these words counts. */
    mentions: z.array(AlternativesSchema).default([]),
    minWords: z.number().int().nonnegative().default(20),
  }),
])

/**
 * A check on the code of a Code task. Every check runs tests, so a check
 * gives credit for working code, not for code that looks right.
 */
export const CodeCheckSchema = z.discriminatedUnion('type', [
  /**
   * The tests in `file` pass with the player's code: the project's own test
   * file as the task wrote it, or hidden tests given in `source`.
   */
  FileCheckBaseSchema.extend({
    type: z.literal('tests'),
    file: z.string().regex(/^[\w.-]+\.test\.js$/),
    source: z.string().optional(),
  }),
  /** The player's own tests in `file`: at least `minTests`, all passing. */
  FileCheckBaseSchema.extend({
    type: z.literal('own-tests'),
    file: z.string().regex(/^[\w.-]+\.test\.js$/),
    minTests: z.number().int().positive(),
  }),
  /**
   * The player's tests catch bugs: they are run against copies of `target`
   * with a bug planted in each, and should fail on every one.
   */
  FileCheckBaseSchema.extend({
    type: z.literal('mutants'),
    file: z.string().regex(/^[\w.-]+\.test\.js$/),
    target: z.string(),
    mutants: z
      .array(
        z.object({
          description: z.string().min(1),
          find: z.string().min(1),
          replace: z.string(),
        }),
      )
      .min(1),
  }),
])

/** The starting ticket queue of a Help Desk task. */
export const QueueSchema = z.object({
  title: z.string().min(1),
  categories: z.array(z.string().min(1)).min(1),
  knowledge: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
  tickets: z
    .array(
      z.object({
        id: z.string(),
        from: z.string(),
        department: z.string(),
        received: z.string(),
        subject: z.string(),
        body: z.string(),
      }),
    )
    .min(1),
})

/** A report or presentation the player hands in with the workbook. */
export const DeliverableSchema = z.object({
  kind: z.enum(['doc', 'slides']),
  /** The file created for the player when the task starts. */
  title: z.string().min(1),
  /** The Docs or Slides template it starts from. */
  template: z.string().min(1),
  checks: z.array(FileCheckSchema).min(1),
})

const StartingCellSchema = z.union([
  z.string(),
  z.object({ input: z.string(), format: CellFormatSchema.optional() }),
])

export const StartingSheetSchema = z.object({
  name: z.string().min(1).max(100),
  cells: z.record(z.string().regex(/^[A-Z]{1,3}[1-9]\d*$/), StartingCellSchema),
  columnWidths: z.record(z.string().regex(/^[A-Z]{1,3}$/), z.number().int()).optional(),
  /** Dropdown lists the workbook starts with, e.g. a chart of accounts. */
  validations: z
    .array(
      z.object({
        range: z.string().regex(/^[A-Z]{1,3}[1-9]\d*(:[A-Z]{1,3}[1-9]\d*)?$/),
        items: z.array(z.string().min(1)).min(1),
      }),
    )
    .optional(),
})

export const StepSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  /** Paragraphs separated by blank lines. `code` and **bold** are supported. */
  instructions: z.string().min(1),
  hint: z.string().optional(),
})

export const AssignmentSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Raise when the assignment changes in a way that affects saved attempts. */
  version: z.number().int().positive(),
  careerId: z.string(),
  levelId: z.string(),
  /** Position in the career path; each assignment unlocks the next one. */
  order: z.number().int().positive(),
  title: z.string().min(1),
  /** One line for the task list. */
  summary: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  /** Who gives the assignment (a person ID from the company file). */
  from: z.string(),
  /** The email that hands out the assignment. `{name}` is the player's first name. */
  briefing: z.object({ subject: z.string().min(1), body: z.string().min(1) }),
  /** Why this kind of task matters in a real job. */
  whyItMatters: z.string().min(1),
  /** What the player will be able to do afterwards. */
  objectives: z.array(z.string().min(1)).min(1),
  steps: z.array(StepSchema).min(1),
  /**
   * What the main piece of work is: a workbook (Sheets), a ticket queue
   * (Help Desk) or a code project (Code). Reports and presentations can be
   * added to any of them.
   */
  kind: z.enum(['sheet', 'tickets', 'code', 'tool']).default('sheet'),
  /**
   * For tasks done in a professional tool (`kind: 'tool'`): the tool, the
   * file's starting state (the scenario), the model answer, and the tool's
   * own checks. The tool's schemas validate them (see `src/tools`).
   */
  tool: z
    .object({
      id: z.string(),
      /** The name of the file the player works in. */
      title: z.string().min(1),
      start: z.unknown(),
      solution: z.unknown(),
      checks: z.array(z.unknown()).min(1),
    })
    .optional(),
  /** The starting files, for Code tasks. */
  project: z
    .object({
      title: z.string().min(1),
      files: z
        .array(
          z.object({
            name: z.string().regex(/^[\w.-]+$/),
            text: z.string(),
            readOnly: z.boolean().default(false),
          }),
        )
        .min(1),
    })
    .optional(),
  /** The model answer for Code tasks: the full text of each changed file. */
  codeSolution: z.record(z.string(), z.string()).default({}),
  codeChecks: z.array(CodeCheckSchema).default([]),
  /** The ticket queue, for Help Desk tasks. */
  queue: QueueSchema.optional(),
  /** The model answer for the tickets: priority, category and status. */
  ticketSolution: z
    .record(
      z.string(),
      z.object({
        priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
        category: z.string().optional(),
        status: z.enum(['new', 'open', 'pending', 'escalated', 'resolved']).optional(),
      }),
    )
    .default({}),
  ticketChecks: z.array(TicketCheckSchema).default([]),
  workbook: z
    .object({
      title: z.string().min(1),
      sheets: z.array(StartingSheetSchema).min(1),
    })
    .optional(),
  /**
   * The model answer: cell inputs added to the starting workbook. Grading
   * compares the player's results with the results of this answer.
   */
  solution: z.record(z.string(), z.record(z.string(), StartingCellSchema)).default({}),
  /**
   * Changes to the data used to test that formulas really work, e.g. a
   * different quantity. Keys are "Sheet!A1".
   */
  scenarios: z
    .array(
      z.object({
        description: z.string(),
        changes: z.record(SheetRangeSchema, z.string()),
      }),
    )
    .default([]),
  checks: z.array(CheckSchema).default([]),
  /**
   * Other files to hand in: a report and/or a presentation. Tasks with
   * deliverables are submitted by replying to the briefing email with the
   * files attached.
   */
  deliverables: z.array(DeliverableSchema).default([]),
  /** Score (0–100) needed to pass. */
  passScore: z.number().int().min(1).max(100),
  /** XP for a perfect score. */
  xp: z.number().int().positive(),
  /** Skill XP for a perfect score. */
  skills: SkillGainsSchema,
  /** The manager's reply, by result. `{name}` is the player's first name. */
  feedback: z.object({
    excellent: z.string().min(1),
    good: z.string().min(1),
    pass: z.string().min(1),
    fail: z.string().min(1),
  }),
})

export type Check = z.infer<typeof CheckSchema>
export type CodeCheck = z.infer<typeof CodeCheckSchema>
export type FileCheck = z.infer<typeof FileCheckSchema>
export type Deliverable = z.infer<typeof DeliverableSchema>
export type AssignmentInput = z.input<typeof AssignmentSchema>
export type Assignment = z.infer<typeof AssignmentSchema>
export type StartingCell = z.infer<typeof StartingCellSchema>

export const SkillSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  description: z.string(),
})
export type Skill = z.infer<typeof SkillSchema>

/** Overall ratings of a performance review, from lowest to highest. */
export const REVIEW_RATINGS = ['developing', 'solid', 'strong', 'outstanding'] as const

export const CareerLevelSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** XP needed (in total) to be considered for this level. */
  xpRequired: z.number().int().nonnegative(),
  /** Professional reputation (0–100) needed to be promoted to this level. */
  minReputation: z.number().int().min(0).max(100),
  /** The latest weekly review must be at least this good, if set. */
  minReview: z.enum(REVIEW_RATINGS).optional(),
})

/** Work apps a career can use (Mail, Tasks and Career are always there). */
export const WORK_APPS = ['sheets', 'docs', 'slides', 'helpdesk', 'code'] as const

export const CareerSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string(),
  /** One or two sentences for the career choice screen. */
  description: z.string(),
  /** For the welcome email: which tools the work is done in. */
  toolsIntro: z.string(),
  /** The skills this career develops (IDs from the skills list). */
  skills: z.array(z.string()).min(1),
  /** The work apps on the dock, in order. */
  apps: z.array(z.enum(WORK_APPS)).min(1),
  /**
   * The professional tools this career uses (see `src/tools`): each from a
   * level, with sections that unlock with later promotions.
   */
  tools: z
    .array(
      z.object({
        tool: z.string(),
        fromLevel: z.string().optional(),
        sections: z.record(z.string(), z.string()).optional(),
      }),
    )
    .optional(),
  levels: z.array(CareerLevelSchema).min(1),
})
export type WorkApp = (typeof WORK_APPS)[number]
export type Career = z.infer<typeof CareerSchema>
export type CareerLevel = z.infer<typeof CareerLevelSchema>
