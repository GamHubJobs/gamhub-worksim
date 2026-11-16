/**
 * The Engineer career's projects as saved in the career save
 * (`work.engineering`, optional: careers and saves without it are
 * unchanged). Designs and their revisions, the site's progress, issues,
 * inspections, the project's measures and the files and documents made for
 * it. Large files (drawings, models) are documents; only their IDs are here.
 */
import { z } from 'zod'
import { DesignSchema } from './design'
import { STAGE_IDS } from './quantities'

export const REVISION_SOURCES = [
  'concept',
  'plan-editor',
  'specification',
  'cadcraft',
  'freecad',
] as const

export const RevisionSchema = z.object({
  n: z.number().int().min(1),
  design: DesignSchema,
  source: z.enum(REVISION_SOURCES),
  note: z.string().max(200).default(''),
  /** Office time it was last changed (absolute minutes). */
  at: z.number().nonnegative(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'superseded']),
  submittedAt: z.number().nonnegative().nullable().default(null),
  review: z
    .object({
      by: z.string().max(60),
      at: z.number().nonnegative(),
      comments: z.array(z.string().max(400)).max(30),
    })
    .nullable()
    .default(null),
})
export type Revision = z.infer<typeof RevisionSchema>

const StageIdSchema = z.enum(STAGE_IDS)

export const SiteStateSchema = z.object({
  /** The stages, in order, for the design being built. */
  stages: z.array(StageIdSchema).max(20),
  /** The stage being worked on (its index in `stages`). */
  cursor: z.number().int().min(0),
  /** Site minutes of work done on that stage. */
  progress: z.number().min(0),
  /** The site clock when it was last brought up to date (site minutes). */
  last: z.number().min(0),
  /** Site minutes to stand before work resumes (a delay from a decision). */
  wait: z.number().min(0).default(0),
  /** The revision the site is building to. */
  built: z.number().int().min(1),
  startedAt: z.number().min(0),
  /** When each stage finished (site minutes). */
  done: z.array(z.object({ stage: StageIdSchema, at: z.number().min(0) })).max(20),
  /** Work being redone, before the stage resumes. */
  rework: z
    .object({
      minutes: z.number().min(0),
      reason: z.string().max(200),
      /** Inspection items it puts right. */
      fixes: z.array(z.string().max(30)).max(20).default([]),
      /** The inspection to do again afterwards. */
      inspection: z.string().max(30).nullable().default(null),
    })
    .nullable()
    .default(null),
})
export type SiteState = z.infer<typeof SiteStateSchema>

export const InspectionStateSchema = z.object({
  status: z.enum(['due', 'passed', 'rework']),
  /** Items measured on site (a reading can only be judged once taken). */
  measured: z.array(z.string().max(30)).max(40).default([]),
  judgements: z.record(z.string().max(30), z.enum(['ok', 'defect'])).default({}),
  attempts: z.number().int().min(0).default(0),
  at: z.number().nonnegative(),
})
export type InspectionState = z.infer<typeof InspectionStateSchema>

export const IssueStateSchema = z.object({
  status: z.enum(['open', 'awaiting-revision', 'resolved', 'not-needed']),
  choice: z.string().max(40).nullable().default(null),
  tried: z.array(z.string().max(40)).max(20).default([]),
  at: z.number().nonnegative(),
})
export type IssueState = z.infer<typeof IssueStateSchema>

export const DOCUMENT_KINDS = [
  'drawings',
  'calculations',
  'quantities',
  'specification',
  'programme',
  'progress',
  'inspection',
  'handover',
] as const
export type ProjectDocumentKind = (typeof DOCUMENT_KINDS)[number]

export const ProjectStateSchema = z.object({
  id: z.string().max(40),
  seed: z.number().int(),
  /** Office time it was started (absolute minutes). */
  started: z.number().nonnegative(),
  status: z.enum(['design', 'construction', 'complete']),
  revisions: z.array(RevisionSchema).min(1).max(40),
  site: SiteStateSchema.nullable().default(null),
  inspections: z.record(z.string().max(30), InspectionStateSchema).default({}),
  issues: z.record(z.string().max(40), IssueStateSchema).default({}),
  /** 0–100: how well built, how safely, and how happy the client is. */
  metrics: z.object({
    quality: z.number().min(0).max(100),
    safety: z.number().min(0).max(100),
    client: z.number().min(0).max(100),
    /** £ spent beyond the bill of quantities (decisions, rework). */
    extra: z.number(),
    /** Working days lost (decisions, rework, waiting). */
    delay: z.number().min(0),
  }),
  /** How the work as built differs from the design, by inspection item. */
  asBuilt: z.record(z.string().max(30), z.number()).default({}),
  /** Defects judged acceptable that were not (inspection item IDs). */
  latent: z.array(z.string().max(30)).max(40).default([]),
  /** The project's drawing (a CAD document) and models imported from FreeCAD. */
  files: z
    .object({
      drawing: z.string().max(60).nullable().default(null),
      models: z
        .array(
          z.object({
            document: z.string().max(60),
            name: z.string().max(120),
            format: z.enum(['obj', 'stl', 'json', 'step', 'fcstd']),
            revision: z.number().int().min(1),
            at: z.number().nonnegative(),
          }),
        )
        .max(30)
        .default([]),
    })
    .prefault({}),
  /** Documents made for the project, and the revision each was made from. */
  documents: z
    .partialRecord(
      z.enum(DOCUMENT_KINDS),
      z.object({ document: z.string().max(60), revision: z.number().int().min(1) }),
    )
    .default({}),
  log: z
    .array(
      z.object({
        at: z.number().nonnegative(),
        text: z.string().max(300),
        tone: z.enum(['good', 'bad', 'neutral']),
      }),
    )
    .max(80)
    .default([]),
  result: z
    .object({
      score: z.number().min(0).max(100),
      rating: z.enum(['excellent', 'good', 'pass', 'poor']),
      day: z.number().int(),
      cost: z.number(),
      days: z.number(),
    })
    .nullable()
    .default(null),
})
export type ProjectState = z.infer<typeof ProjectStateSchema>

export const EngineeringWorkSchema = z.object({
  projects: z.record(z.string().max(40), ProjectStateSchema).default({}),
  /** The project being worked on. */
  active: z.string().max(40).nullable().default(null),
  /** On site in person (the project's ID), or in the office. */
  onSite: z.string().max(40).nullable().default(null),
})
export type EngineeringWork = z.infer<typeof EngineeringWorkSchema>
