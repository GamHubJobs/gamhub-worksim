/**
 * Career readiness assessments: a practical piece of work showing whether the
 * player can handle the responsibilities of their current level. Each combines
 * an investigation, a calculation, a decision, a report written in Word Craft and a
 * message, within a time limit, and is graded like a case.
 *
 * Every assessment comes in two versions with different figures and details,
 * built from parameters so that every figure, explanation and check agrees.
 * A retake uses the other version, so the feedback from a first attempt cannot
 * simply be copied.
 *
 * These are simulated workplace assessments, not qualifications.
 */
import type { CaseInput } from '../cases/schema'
import { employerFor } from '../departments'

export const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
/** A figure as a reply or report might write it: "18,170", "18170". */
export const forms = (n: number) => [n.toLocaleString('en-GB'), String(n)]

interface Base {
  id: string
  careerId: string
  /** The level the assessment is taken at; passing it is needed for the next promotion. */
  level: number
  title: string
  summary: string
  brief: string
  whyItMatters: string
  objectives: string[]
  evidence: CaseInput['evidence']
  steps: CaseInput['steps']
  skills: Record<string, number>
  /** The real task of the career done in its own tool (see `game/practical.ts`). */
  practical: string
}

/**
 * The marks of each part. Everything except the practical work is worth 70 and
 * everything except the report 75, so with the 80% pass mark neither can be
 * skipped. The same in every career, so assessments are equally demanding.
 */
const POINTS = {
  practical: 30,
  document: 25,
  review: 15,
  figure: 10,
  decide: 10,
  reply: 10,
}

export function assessment(base: Base): CaseInput {
  return {
    id: base.id,
    // 2: practical work in the profession's own tool was added (Phase 8).
    version: 2,
    careerId: base.careerId,
    kind: 'assessment',
    difficulty: base.level >= 3 ? 'advanced' : 'intermediate',
    minLevel: base.level,
    title: base.title,
    summary: base.summary,
    from: {
      name: 'the readiness panel',
      role: 'Career readiness assessment',
      organisation: employerFor(base.careerId).shortName,
    },
    trigger: {},
    deadlineHours: 3,
    email: { subject: base.title, body: base.brief },
    whyItMatters: base.whyItMatters,
    objectives: base.objectives,
    evidence: base.evidence,
    steps: [
      {
        id: 'practical',
        kind: 'practical',
        title: 'Do the work in the tool',
        prompt:
          'Do this piece of the job in its own tool, from a fresh file and without the step-by-step guide. It is marked by the same checks as the task.',
        points: POINTS.practical,
        assignmentId: base.practical,
      },
      ...base.steps.map((step) => ({
        ...step,
        points: POINTS[step.kind as keyof typeof POINTS] ?? step.points,
      })),
    ] as CaseInput['steps'],
    // Neither the practical work nor the report can be skipped (see POINTS).
    passScore: 80,
    outcomes: {},
    replies: {
      excellent:
        'An excellent piece of work: you are ready for the next level’s responsibilities.',
      good: 'A good piece of work: you have shown you are ready for the next level.',
      pass: 'You have shown you are ready, with some points to strengthen.',
      fail: 'Not yet: look at the feedback, practise the areas shown, and take the assessment again.',
    },
    lapseLog: 'The readiness assessment ran out of time before it was submitted.',
    skills: base.skills,
    xp: 150,
  }
}

/** Shared report checks: sections, figures, key terms and a sensible length. */
export function report(
  title: string,
  sections: string[][],
  figures: Array<{ label: string; value: number; percent?: boolean }>,
  terms: string[][],
): Extract<CaseInput['steps'][number], { kind: 'document' }> {
  return {
    id: 'report',
    kind: 'document',
    title: 'Write the report',
    prompt: `Write a short report in Word Craft: ${sections.map((s) => `“${s[0]}”`).join(', ')}, with the key figures and what you recommend.`,
    points: 25,
    deliverable: {
      kind: 'doc',
      title,
      template: 'memo',
      checks: [
        {
          id: 'sections',
          type: 'sections',
          title: 'Clear sections',
          sections,
          points: 7,
          why: 'Readers find what they need when the report is organised.',
          hint: `Use headings: ${sections.map((s) => s[0]).join(', ')}.`,
        },
        {
          id: 'figures',
          type: 'figures',
          title: 'The key figures, correct',
          figures: figures.map((f) => ({ ...f, percent: f.percent ?? false })),
          points: 10,
          why: 'A report is only as good as its numbers.',
          hint: `State ${figures.map((f) => f.label).join(' and ')}.`,
        },
        {
          id: 'terms',
          type: 'mentions',
          title: 'The cause and the recommendation',
          terms,
          points: 5,
          why: 'Explain what happened and what should happen next.',
          hint: 'Name the cause and say what you recommend.',
        },
        {
          id: 'length',
          type: 'length',
          min: 80,
          max: 500,
          title: 'Concise',
          points: 3,
          why: 'A busy reader wants one page.',
          hint: '80 to 500 words.',
        },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Finance & Admin
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Accounting
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// IT Help Desk
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Digital Marketing
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Data Analysis
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Software Development
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
