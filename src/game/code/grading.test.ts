import { describe, expect, it } from 'vitest'
import { ASSIGNMENTS, getAssignment } from '../../content/assignments'
import { CodeContentSchema } from '../../persistence/schemas'
import { buildCodeSolution, buildProjectContent, gradeCode } from './grading'
import type { CodeContent } from '../../persistence/schemas'

const codeTasks = ASSIGNMENTS.filter((a) => a.kind === 'code')

function withFile(content: CodeContent, name: string, text: string): CodeContent {
  return {
    ...content,
    files: content.files.map((f) => (f.name === name ? { ...f, text } : f)),
  }
}

const earned = (results: ReturnType<typeof gradeCode>) =>
  results.reduce((sum, r) => sum + r.earned, 0)
const possible = (results: ReturnType<typeof gradeCode>) =>
  results.reduce((sum, r) => sum + r.points, 0)

describe.each(codeTasks.map((a) => [a.id, a] as const))('code task %s', (_, task) => {
  it('starts from a valid project', () => {
    expect(CodeContentSchema.safeParse(buildProjectContent(task)).success).toBe(true)
  })

  it('gives the model answer full marks on every code check', () => {
    const results = gradeCode(task, buildCodeSolution(task))
    expect(results.filter((r) => r.status !== 'passed')).toEqual([])
  })

  it('gives the untouched project well under half the code marks', () => {
    const results = gradeCode(task, buildProjectContent(task))
    expect(earned(results)).toBeLessThan(possible(results) / 2)
  })

  it('plants every bug in a file that exists', () => {
    for (const check of task.codeChecks) {
      if (check.type !== 'mutants') continue
      const target = task.project?.files.find((f) => f.name === check.target)
      expect(target).toBeDefined()
      for (const mutant of check.mutants) {
        expect(target?.text, mutant.description).toContain(mutant.find)
      }
    }
  })
})

describe('grading code', () => {
  it('gives partial credit when only some bugs are fixed', () => {
    const task = getAssignment('invoice-bug')!
    const start = buildProjectContent(task)
    const invoice = start.files.find((f) => f.name === 'invoice.js')!.text
    const oneFix = withFile(
      start,
      'invoice.js',
      invoice.replace('let i = 1', 'let i = 0'),
    )
    const results = gradeCode(task, oneFix)
    expect(earned(results)).toBeGreaterThan(0)
    expect(earned(results)).toBeLessThan(possible(results))
  })

  it('ignores edits to the project’s test file: the original tests are run', () => {
    const task = getAssignment('invoice-bug')!
    const cheat = withFile(
      buildProjectContent(task),
      'invoice.test.js',
      `test('always passes', () => {})`,
    )
    const visible = gradeCode(task, cheat).find((r) => r.id === 'visible-tests')!
    expect(visible.status).not.toBe('passed')
  })

  it('reports a syntax error instead of crashing', () => {
    const task = getAssignment('timesheet-validation')!
    const broken = withFile(
      buildProjectContent(task),
      'timesheet.js',
      'export function (',
    )
    const results = gradeCode(task, broken)
    expect(earned(results)).toBe(0)
    expect(results[0].problems[0]).toMatch(/mistake in its code/)
  })

  it('needs tests that pass on the real code before counting caught bugs', () => {
    const task = getAssignment('working-days-tests')!
    const failing = withFile(
      buildProjectContent(task),
      'workingDays.test.js',
      `import { workingDays } from './workingDays.js'
test('wrong', () => expect(workingDays('2026-03-02', '2026-03-02')).toBe(99))`,
    )
    const mutants = gradeCode(task, failing).find((r) => r.id === 'catches-bugs')!
    expect(mutants.earned).toBe(0)
    expect(mutants.problems[0]).toMatch(/must pass on the real/)
  })

  it('names the planted bugs a weak test suite misses', () => {
    const task = getAssignment('working-days-tests')!
    const weak = buildProjectContent(task) // only the single starter test
    const mutants = gradeCode(task, weak).find((r) => r.id === 'catches-bugs')!
    expect(mutants.status).not.toBe('passed')
    expect(mutants.problems.join(' ')).toMatch(/Not caught: Holidays are ignored/)
  })

  it('scores a missing project as nothing', () => {
    const task = getAssignment('billing-report')!
    expect(earned(gradeCode(task, null))).toBe(0)
  })
})
