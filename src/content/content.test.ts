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
import { PEOPLE } from './company'

describe.each(ASSIGNMENTS.map((a) => [a.id, a] as const))(
  'assignment %s',
  (_, assignment) => {
    it('has a valid starting workbook', () => {
      expect(SheetContentSchema.safeParse(buildStartingContent(assignment)).success).toBe(
        true,
      )
    })

    it('refers to existing people, skills, career and level', () => {
      expect(PEOPLE[assignment.from]).toBeDefined()
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
      const checks = assignment.checks.map((c) => c.id)
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
      const result = gradeAssignment(assignment, solution)
      const failures = result.checks.filter((c) => c.status !== 'passed')
      expect(failures).toEqual([])
      expect(result.score).toBe(100)
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

  it('assignments are numbered 1, 2, 3… without gaps', () => {
    expect(ASSIGNMENTS.map((a) => a.order)).toEqual(ASSIGNMENTS.map((_, i) => i + 1))
  })
})
