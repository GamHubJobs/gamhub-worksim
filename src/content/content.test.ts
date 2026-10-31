/**
 * Checks every piece of content, so a mistake in an assignment file is caught
 * here instead of by a player.
 */
import { describe, expect, it } from 'vitest'
import { SheetContentSchema } from '../persistence/schemas'
import { gradeAssignment, expandCells } from '../game/grading'
import { buildSolutionContent, buildStartingContent, findSheet } from '../game/workbooks'
import { formatRange, parseRange } from '../apps/sheets/model'
import { ASSIGNMENTS } from './assignments'
import { CAREERS, SKILLS } from './careers'
import { addChart } from '../apps/sheets/features'
import { applyTicketSolution, buildQueueContent } from '../game/tickets'
import { buildCodeSolution, gradeCode } from '../game/code/grading'
import { gradeToolTask, toolTaskContent } from '../tools/grading'
import { getDocTemplate } from '../apps/docs/templates'
import { getSlidesTemplate } from '../apps/slides/model'
import { findPerson } from './departments'

describe.each(ASSIGNMENTS.map((a) => [a.id, a] as const))(
  'assignment %s',
  (_, assignment) => {
    it('has a valid starting workbook', () => {
      expect(SheetContentSchema.safeParse(buildStartingContent(assignment)).success).toBe(
        true,
      )
    })

    it('refers to existing people, skills, career and level', () => {
      expect(findPerson(assignment.from)).toBeDefined()
      for (const skill of Object.keys(assignment.skills)) {
        expect(SKILLS.map((s) => s.id)).toContain(skill)
      }
      const career = CAREERS.find((c) => c.id === assignment.careerId)
      expect(career?.levels.map((l) => l.id)).toContain(assignment.levelId)
    })

    it('only checks sheets that exist', () => {
      const start = buildStartingContent(assignment)
      for (const check of assignment.checks) {
        for (const ref of expandCells(check.cells)) {
          expect(findSheet(start, ref.sheet), `${check.id}: ${ref.sheet}`).toBeDefined()
        }
      }
    })

    it('has unique step and check IDs', () => {
      const steps = assignment.steps.map((s) => s.id)
      const checks = [
        ...assignment.checks.map((c) => c.id),
        ...assignment.ticketChecks.map((c) => c.id),
        ...assignment.codeChecks.map((c) => c.id),
        ...assignment.deliverables.flatMap((d) => d.checks.map((c) => c.id)),
      ]
      expect(new Set(steps).size).toBe(steps.length)
      expect(new Set(checks).size).toBe(checks.length)
    })

    it('gives the model answer (with the required formatting) full marks', () => {
      let solution = buildSolutionContent(assignment)
      for (const check of assignment.checks) {
        if (check.type !== 'format') continue
        for (const reference of check.cells) {
          const [sheetName, range] = reference.split('!')
          const sheet = findSheet(solution, sheetName)!
          solution = formatRange(solution, sheet.id, parseRange(range)!, check.format)
        }
      }
      // Charts are part of the model answer too.
      for (const check of assignment.checks) {
        if (check.type !== 'chart') continue
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
      const project = assignment.kind === 'code' ? buildCodeSolution(assignment) : null
      const tool = toolTaskContent(assignment)
      const result = tool
        ? gradeAssignment(assignment, null, {}, gradeToolTask(assignment, tool.solution))
        : project
          ? gradeAssignment(assignment, project, {}, gradeCode(assignment, project))
          : assignment.kind === 'tickets'
            ? gradeAssignment(
                assignment,
                applyTicketSolution(assignment, buildQueueContent(assignment)),
              )
            : gradeAssignment(assignment, solution)
      const failures = result.checks
        .filter((c) => c.status !== 'passed')
        // Reports and presentations are checked in deliverables.test.ts.
        // Written replies are checked in tickets.test.ts.
        .filter(
          (c) =>
            assignment.checks.some((check) => check.id === c.id) ||
            assignment.codeChecks.some((check) => check.id === c.id) ||
            (assignment.tool?.checks ?? []).some(
              (check) => (check as { id: string }).id === c.id,
            ) ||
            assignment.ticketChecks.some((t) => t.id === c.id && t.type === 'field'),
        )
      expect(failures).toEqual([])
      const writtenWork =
        assignment.deliverables.length > 0 ||
        assignment.ticketChecks.some((t) => t.type === 'reply')
      if (!writtenWork) expect(result.score).toBe(100)
    })

    it('starts its report and presentation from real templates', () => {
      for (const deliverable of assignment.deliverables) {
        const template =
          deliverable.kind === 'doc'
            ? getDocTemplate(deliverable.template)
            : getSlidesTemplate(deliverable.template)
        expect(template.id).toBe(deliverable.template)
      }
    })

    it('cannot be passed without doing any work', () => {
      expect(gradeAssignment(assignment, buildStartingContent(assignment)).passed).toBe(
        false,
      )
    })
  },
)

describe('careers', () => {
  it('levels need increasing XP', () => {
    for (const career of CAREERS) {
      const xp = career.levels.map((level) => level.xpRequired)
      expect(xp).toEqual([...xp].sort((a, b) => a - b))
      expect(xp[0]).toBe(0)
    }
  })

  it('each career’s assignments are numbered 1, 2, 3… without gaps', () => {
    for (const career of CAREERS) {
      const orders = ASSIGNMENTS.filter((a) => a.careerId === career.id)
        .map((a) => a.order)
        .sort((a, b) => a - b)
      expect(orders, career.id).toEqual(orders.map((_, i) => i + 1))
    }
  })
})
