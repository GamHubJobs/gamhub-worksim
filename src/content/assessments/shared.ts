/**
 * Career readiness assessments: a practical piece of work showing whether the
 * player can handle the responsibilities of their current level. Each combines
 * an investigation, a calculation, a decision, a report written in Docs and a
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
}

export function assessment(base: Base): CaseInput {
  return {
    id: base.id,
    version: 1,
    careerId: base.careerId,
    kind: 'assessment',
    difficulty: base.level >= 3 ? 'advanced' : 'intermediate',
    minLevel: base.level,
    title: base.title,
    summary: base.summary,
    from: {
      name: 'the readiness panel',
      role: 'Career readiness assessment',
      organisation: 'Cobalt Ridge',
    },
    trigger: {},
    deadlineHours: 3,
    email: { subject: base.title, body: base.brief },
    whyItMatters: base.whyItMatters,
    objectives: base.objectives,
    evidence: base.evidence,
    steps: base.steps,
    // High enough that the report cannot be skipped: everything else is 75 marks.
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
    prompt: `Write a short report in Docs: ${sections.map((s) => `“${s[0]}”`).join(', ')}, with the key figures and what you recommend.`,
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
