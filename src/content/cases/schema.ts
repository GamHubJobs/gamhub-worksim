/**
 * The blueprint for cases: pieces of real workplace business that arrive
 * from clients, colleagues, suppliers and other departments. Each case has
 * evidence to examine, steps to complete and consequences. Every option and
 * expected answer carries its reasoning, so results are always explained.
 */
import { z } from 'zod'
import { DeliverableSchema, SkillGainsSchema } from '../schemas'

const Id = z.string().regex(/^[a-z0-9-]+$/)
const Text = z.string().min(1)

/** What a case can change in the organisation (all optional, all small). */
export const IndicatorsSchema = z.object({
  /** How satisfied clients and internal customers are. */
  satisfaction: z.number().optional(),
  /** Operational risk: errors, exposure, things that could go wrong. */
  risk: z.number().optional(),
  /** Budget discipline: spending within limits and approvals. */
  discipline: z.number().optional(),
})

export const CaseEffectsSchema = z.object({
  /** Trust changes by person ID (colleagues of the department). */
  trust: z.record(z.string(), z.number()).default({}),
  reputation: z.number().default(0),
  indicators: IndicatorsSchema.default({}),
  /** Spending committed by a department (positive) or saved (negative). */
  spend: z.record(z.string(), z.number()).default({}),
})

const StepBase = z.object({
  id: Id,
  title: Text,
  /** What the player is asked to do. */
  prompt: Text,
  points: z.number().int().positive(),
})

export const CaseStepSchema = z.discriminatedUnion('kind', [
  /** Tick the statements that apply (`issue`: should be ticked), e.g. which are problems. */
  StepBase.extend({
    kind: z.literal('review'),
    findings: z
      .array(z.object({ id: Id, text: Text, issue: z.boolean(), why: Text }))
      .min(2),
  }),
  /** Work out a number from the evidence. */
  StepBase.extend({
    kind: z.literal('figure'),
    answer: z.number(),
    /** Accepted difference (absolute). */
    tolerance: z.number().min(0).default(0.01),
    unit: z.string().default(''),
    why: Text,
  }),
  /** Choose a course of action; every option is judged, with reasons. */
  StepBase.extend({
    kind: z.literal('decide'),
    options: z
      .array(
        z.object({
          id: Id,
          label: Text,
          verdict: z.enum(['best', 'acceptable', 'poor']),
          why: Text,
          effects: CaseEffectsSchema.prefault({}),
        }),
      )
      .min(2),
  }),
  /**
   * Approve, reject or escalate requests. The right decision is worked out
   * from the rules: a policy breach is rejected; a request above the player's
   * approval limit or the department's remaining budget is escalated;
   * anything else is approved.
   */
  StepBase.extend({
    kind: z.literal('approve'),
    requests: z
      .array(
        z.object({
          id: Id,
          summary: Text,
          department: z.string(),
          amount: z.number().nonnegative(),
          /** Why the request breaks policy (and must be rejected), if it does. */
          policyBreach: z.string().optional(),
          /** Why it is fine, when it is within policy. */
          why: z.string().default(''),
        }),
      )
      .min(1),
  }),
  /** Delegate work items to team members (leadership). */
  StepBase.extend({
    kind: z.literal('assign'),
    members: z
      .array(
        z.object({ id: Id, name: Text, strengths: Text, capacity: z.number().int() }),
      )
      .min(2),
    items: z
      .array(z.object({ id: Id, label: Text, best: z.array(Id).min(1), why: Text }))
      .min(1),
  }),
  /** Record actions from a meeting, each with the right owner. */
  StepBase.extend({
    kind: z.literal('actions'),
    people: z.array(z.object({ id: Id, name: Text })).min(2),
    items: z.array(z.object({ id: Id, label: Text, owner: Id, why: Text })).min(1),
  }),
  /** Write a response: what it must say, and what it must not promise. */
  StepBase.extend({
    kind: z.literal('reply'),
    to: Text,
    mentions: z.array(z.array(z.string().min(1)).min(1)).default([]),
    avoid: z
      .array(z.object({ terms: z.array(z.string().min(1)).min(1), why: Text }))
      .default([]),
    minWords: z.number().int().positive(),
    /** An example of a good reply, shown after submitting (and used by the tests). */
    model: Text,
  }),
  /** Pass information on to another department, in the form it needs. */
  StepBase.extend({
    kind: z.literal('handoff'),
    /** Who receives it, e.g. "Facilities (hardware)". */
    to: Text,
    fields: z
      .array(
        z.discriminatedUnion('kind', [
          z.object({
            id: Id,
            label: Text,
            kind: z.literal('text'),
            /** Accepted answers (compared ignoring case and spacing). */
            accept: z.array(z.string().min(1)).min(1),
            why: Text,
          }),
          z.object({
            id: Id,
            label: Text,
            kind: z.literal('number'),
            answer: z.number(),
            tolerance: z.number().min(0).default(0),
            unit: z.string().default(''),
            why: Text,
          }),
          z.object({
            id: Id,
            label: Text,
            kind: z.literal('choice'),
            options: z.array(z.string().min(1)).min(2),
            answer: z.string().min(1),
            why: Text,
          }),
        ]),
      )
      .min(1),
  }),
  /** Produce a document or presentation with the existing apps. */
  StepBase.extend({
    kind: z.literal('document'),
    deliverable: DeliverableSchema,
  }),
])

export const EvidenceSchema = z.object({
  id: Id,
  title: Text,
  /** Paragraphs separated by blank lines. */
  text: z.string().default(''),
  table: z
    .object({ head: z.array(z.string()), rows: z.array(z.array(z.string())) })
    .optional(),
})

export const CASE_KINDS = [
  'client',
  'internal',
  'operations',
  'workflow',
  'meeting',
  'incident',
  'leadership',
  'programme',
] as const

export const CASE_KIND_NAMES: Record<(typeof CASE_KINDS)[number], string> = {
  client: 'Client',
  internal: 'Internal request',
  operations: 'Operations',
  workflow: 'Workflow',
  meeting: 'Meeting',
  incident: 'Incident',
  leadership: 'Leadership',
  programme: 'Programme',
}

export const CaseSchema = z.object({
  id: Id,
  /** Raise when the case changes in a way that affects saved answers. */
  version: z.number().int().positive(),
  careerId: z.string(),
  kind: z.enum(CASE_KINDS),
  /** The career level (1 = first) from which the case can arrive. */
  minLevel: z.number().int().min(1).default(1),
  title: Text,
  summary: Text,
  /** Who it comes from. `personId` is a colleague; otherwise an outside contact. */
  from: z.object({
    name: Text,
    role: Text,
    organisation: Text,
    personId: z.string().optional(),
  }),
  /** When it arrives (all conditions must hold). */
  trigger: z.object({
    afterAssignment: z.string().optional(),
    afterCase: z.string().optional(),
    /** Only if a step of `afterCase` was answered right (or wrong): e.g. a hand-off. */
    onlyIf: z.object({ step: Id, outcome: z.enum(['right', 'wrong']) }).optional(),
    fromDay: z.number().int().min(1).optional(),
  }),
  /** Office hours from arrival to the deadline. */
  deadlineHours: z.number().positive(),
  email: z.object({ subject: Text, body: Text }),
  whyItMatters: Text,
  objectives: z.array(Text).min(1),
  evidence: z.array(EvidenceSchema).default([]),
  steps: z.array(CaseStepSchema).min(1),
  passScore: z.number().int().min(1).max(100).default(70),
  /** Consequences: when passed, when not passed, and when left past the deadline. */
  outcomes: z.object({
    pass: CaseEffectsSchema.prefault({}),
    fail: CaseEffectsSchema.prefault({}),
    lapse: CaseEffectsSchema.prefault({}),
  }),
  /** The requester's answer, by rating. */
  replies: z.object({ excellent: Text, good: Text, pass: Text, fail: Text }),
  /** Lapse message shown in the day log. */
  lapseLog: Text,
  /** Skill XP for a perfect result (also the case's competencies in the portfolio). */
  skills: SkillGainsSchema,
  xp: z.number().int().positive(),
})

export type Case = z.infer<typeof CaseSchema>
export type CaseInput = z.input<typeof CaseSchema>
export type CaseStep = z.infer<typeof CaseStepSchema>
export type CaseEffects = z.infer<typeof CaseEffectsSchema>
export type CaseKind = (typeof CASE_KINDS)[number]
