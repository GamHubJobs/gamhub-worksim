import { describe, expect, it, vi } from 'vitest'
import { addChart } from '../apps/sheets/features'
import { formatRange, parseRange } from '../apps/sheets/model'
import { docContent, h, p } from '../apps/docs/templates'
import { getAssignment } from '../content/assignments'
import { ASSESSMENT_VERSIONS, VERSION_IDS } from '../content/assessments'
import { CAREERS } from '../content/careers'
import type { Case } from '../content/cases/schema'
import type { Assignment } from '../content/schemas'
import type { AnyDocument, DocContent } from '../persistence/schemas'
import { toolTaskContent } from '../tools/grading'
import { careerAssignments } from './career'
import { modelAnswers } from './caseModel'
import { gradeCase, NO_AUTHORITY } from './cases'
import { buildCodeSolution, gradeCode } from './code/grading'
import { gradePractical, startingFile } from './practical'
import { applyTicketSolution, buildQueueContent } from './tickets'
import { buildSolutionContent, findSheet } from './workbooks'

// Tests run without a browser: grade code directly instead of in a Web Worker.
vi.mock('./code/runInWorker', () => ({
  gradeCodeSafely: async (
    assignment: Assignment,
    content: Parameters<typeof gradeCode>[1],
  ) => gradeCode(assignment, content),
}))

/** The task's model answer, as a document in its own tool. */
function solutionDocument(assignment: Assignment): AnyDocument {
  const base = { kind: assignment.kind }
  if (assignment.kind === 'tool')
    return {
      ...base,
      content: toolTaskContent(assignment)!.solution,
    } as AnyDocument
  if (assignment.kind === 'code')
    return { ...base, content: buildCodeSolution(assignment) } as AnyDocument
  if (assignment.kind === 'tickets') {
    // Written replies cover every point the reply checks look for.
    const solved = applyTicketSolution(assignment, buildQueueContent(assignment))
    const replies = new Map(
      assignment.ticketChecks.flatMap((c) =>
        c.type === 'reply'
          ? [
              [
                c.ticket,
                c.mentions.map((m) => m[0]).join('. ') +
                  '. ' +
                  'We will keep you informed until it is fully resolved. '.repeat(8),
              ] as const,
            ]
          : [],
      ),
    )
    return {
      ...base,
      content: {
        ...solved,
        tickets: solved.tickets.map((t) =>
          replies.has(t.id) ? { ...t, reply: replies.get(t.id)! } : t,
        ),
      },
    } as AnyDocument
  }
  let solution = buildSolutionContent(assignment)
  for (const check of assignment.checks) {
    if (check.type === 'format')
      for (const reference of check.cells) {
        const [sheetName, range] = reference.split('!')
        const sheet = findSheet(solution, sheetName)!
        solution = formatRange(solution, sheet.id, parseRange(range)!, check.format)
      }
    if (check.type === 'chart') {
      const [sheetName, range] = check.cells[0].split('!')
      const sheet = findSheet(solution, sheetName)!
      solution = addChart(
        solution,
        sheet.id,
        parseRange(range)!,
        'column',
        'Chart',
      ).content
    }
  }
  return { ...base, content: solution } as AnyDocument
}

/** A report that meets every check of a document step. */
function reportFor(def: Case): Record<string, DocContent> {
  const out: Record<string, DocContent> = {}
  for (const step of def.steps) {
    if (step.kind !== 'document') continue
    const blocks = [h(1, step.deliverable.title)]
    for (const check of step.deliverable.checks) {
      if (check.type === 'sections')
        for (const s of check.sections) blocks.push(h(2, s[0]))
      if (check.type === 'figures')
        for (const f of check.figures)
          blocks.push(
            p(`The figure for ${f.label} is ${f.value?.toLocaleString('en-GB')}.`),
          )
      if (check.type === 'mentions')
        blocks.push(p(check.terms.map((t) => t[0]).join('; ')))
    }
    blocks.push(
      p('This short report explains the findings clearly for its readers. '.repeat(10)),
    )
    out[step.id] = docContent(blocks)
  }
  return out
}

const ALL = Object.entries(ASSESSMENT_VERSIONS).flatMap(([id, versions]) =>
  versions.map((def, i) => ({ id, version: VERSION_IDS[i], def })),
)

describe('practical work in readiness assessments', () => {
  it.each(ALL.map((a) => [`${a.id} version ${a.version}`, a] as const))(
    '%s is real work in the career’s own tool, marked by the task’s checks',
    async (_, { def }) => {
      const step = def.steps.find((s) => s.kind === 'practical')
      expect(step?.points).toBe(30)
      if (step?.kind !== 'practical') throw new Error('no practical step')
      const task = getAssignment(step.assignmentId)!
      // A real, current task of this career, at or below the assessment's level.
      expect(task.careerId).toBe(def.careerId)
      expect(careerAssignments(def.careerId)).toContain(task)
      const career = CAREERS.find((c) => c.id === def.careerId)!
      expect(
        career.levels.findIndex((l) => l.id === task.levelId) + 1,
      ).toBeLessThanOrEqual(def.minLevel)

      // Doing nothing earns little; the model answer earns (nearly) everything.
      const start = startingFile(task)
      const untouched = await gradePractical(task, { ...start } as unknown as AnyDocument)
      const done = await gradePractical(task, solutionDocument(task))
      expect(untouched.fraction).toBeLessThan(0.6)
      expect(done.fraction).toBeGreaterThanOrEqual(0.9)
      expect(untouched.notes.length).toBeGreaterThan(0)

      // With good work everywhere, the assessment passes; without the practical, it cannot.
      const answers = modelAnswers(def, NO_AUTHORITY)
      const full = gradeCase(def, answers, reportFor(def), NO_AUTHORITY, true, {
        practical: done,
      })
      expect(full.passed).toBe(true)
      expect(gradeCase(def, answers, reportFor(def)).passed).toBe(false)
    },
  )

  it('uses a different task in each version, so a retake is new work', () => {
    for (const [id, [a, b]] of Object.entries(ASSESSMENT_VERSIONS)) {
      const task = (def: Case) =>
        def.steps.find((s) => s.kind === 'practical')?.kind === 'practical'
          ? (def.steps.find((s) => s.kind === 'practical') as { assignmentId: string })
              .assignmentId
          : null
      expect(task(a), id).not.toBe(task(b))
    }
  })

  it('a file of the wrong kind, or none, earns nothing', async () => {
    const task = getAssignment('studio-sql')!
    expect((await gradePractical(task, undefined)).fraction).toBe(0)
    const sheet = {
      kind: 'sheet',
      content: buildSolutionContent(getAssignment('budget-report')!),
    }
    expect((await gradePractical(task, sheet as AnyDocument)).fraction).toBe(0)
  })
})
