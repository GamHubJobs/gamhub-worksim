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

const FileCheckBaseSchema = z.object({
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
          cell: SheetRangeSchema,
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
  workbook: z.object({
    title: z.string().min(1),
    sheets: z.array(StartingSheetSchema).min(1),
  }),
  /**
   * The model answer: cell inputs added to the starting workbook. Grading
   * compares the player's results with the results of this answer.
   */
  solution: z.record(z.string(), z.record(z.string(), StartingCellSchema)),
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
  checks: z.array(CheckSchema).min(1),
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
  levels: z.array(CareerLevelSchema).min(1),
})
export type WorkApp = (typeof WORK_APPS)[number]
export type Career = z.infer<typeof CareerSchema>
export type CareerLevel = z.infer<typeof CareerLevelSchema>
