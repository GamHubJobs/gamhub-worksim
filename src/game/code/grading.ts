/**
 * Grading for Code tasks. Each code check runs tests against the player's
 * files with the runner, so this is pure and synchronous like the rest of
 * grading. In the browser it runs inside the code worker, which stops it if
 * the player's code never finishes (see `codeWorker.ts`).
 */
import type { Assignment, CodeCheck } from '../../content/schemas'
import type { CodeContent } from '../../persistence/schemas'
import type { CheckResult, CheckStatus } from '../grading'
import { runTests, type RunResult, type SourceFile } from './runner'

/** The project the player starts with. */
export function buildProjectContent(assignment: Assignment): CodeContent {
  if (!assignment.project) throw new Error(`${assignment.id} has no project.`)
  return {
    language: 'javascript',
    files: assignment.project.files.map((file) => ({
      name: file.name,
      text: file.text,
      readOnly: file.readOnly,
    })),
  }
}

/** The model answer: the starting project with the solution files in place. */
export function buildCodeSolution(assignment: Assignment): CodeContent {
  const start = buildProjectContent(assignment)
  return {
    ...start,
    files: start.files.map((file) => ({
      ...file,
      text: assignment.codeSolution[file.name] ?? file.text,
    })),
  }
}

function result(check: CodeCheck, fraction: number, problems: string[]): CheckResult {
  const earned = Math.round(check.points * Math.max(0, Math.min(1, fraction)))
  const status: CheckStatus =
    earned === check.points ? 'passed' : earned === 0 ? 'failed' : 'partial'
  return {
    id: check.id,
    title: check.title,
    why: check.why,
    hint: check.hint,
    status,
    earned,
    points: check.points,
    problems: status === 'passed' ? [] : problems.slice(0, 5),
  }
}

function failures(run: RunResult): string[] {
  if (run.error) return [run.error]
  return run.tests
    .filter((test) => !test.passed)
    .map((test) => `“${test.name}” fails: ${test.message}`)
}

function gradeCodeCheck(
  check: CodeCheck,
  player: SourceFile[],
  start: SourceFile[],
): CheckResult {
  switch (check.type) {
    case 'tests': {
      // The test file as the task wrote it: the player's copy may be edited.
      const source = check.source ?? start.find((f) => f.name === check.file)?.text ?? ''
      const files = [
        ...player.filter((file) => file.name !== check.file),
        { name: check.file, text: source },
      ]
      const run = runTests(files, [check.file])
      const passed = run.tests.filter((test) => test.passed).length
      const fraction = run.error || run.tests.length === 0 ? 0 : passed / run.tests.length
      return result(check, fraction, failures(run))
    }
    case 'own-tests': {
      const run = runTests(player, [check.file])
      const passed = run.tests.filter((test) => test.passed).length
      const problems = failures(run).map((p) => `Your test ${p}`)
      if (!run.error && run.tests.length < check.minTests) {
        problems.unshift(
          `There are ${run.tests.length} tests in ${check.file}; write at least ${check.minTests}.`,
        )
      }
      const allPass = !run.error && passed === run.tests.length
      const fraction = allPass ? Math.min(passed, check.minTests) / check.minTests : 0
      return result(check, fraction, problems)
    }
    case 'mutants': {
      const original = start.find((f) => f.name === check.target)?.text ?? ''
      const correct = runTests(
        [
          ...player.filter((f) => f.name !== check.target),
          { name: check.target, text: original },
        ],
        [check.file],
      )
      if (
        correct.error ||
        correct.tests.length === 0 ||
        correct.tests.some((t) => !t.passed)
      ) {
        return result(check, 0, [
          `Your tests must pass on the real ${check.target} before they can catch bugs.`,
        ])
      }
      const missed: string[] = []
      for (const mutant of check.mutants) {
        const broken = original.split(mutant.find).join(mutant.replace)
        const run = runTests(
          [
            ...player.filter((f) => f.name !== check.target),
            { name: check.target, text: broken },
          ],
          [check.file],
        )
        const caught = run.error !== null || run.tests.some((test) => !test.passed)
        if (!caught) missed.push(`Not caught: ${mutant.description}.`)
      }
      return result(check, 1 - missed.length / check.mutants.length, missed)
    }
  }
}

/** Grades the code checks of a task. A project that was not handed in scores 0. */
export function gradeCode(
  assignment: Assignment,
  content: CodeContent | null,
): CheckResult[] {
  const start = buildProjectContent(assignment).files
  if (!content) {
    return assignment.codeChecks.map((check) =>
      result(check, 0, ['The project was not handed in.']),
    )
  }
  return assignment.codeChecks.map((check) => gradeCodeCheck(check, content.files, start))
}

/** Every check failed with the same reason, e.g. when the code took too long. */
export function failedCodeChecks(assignment: Assignment, reason: string): CheckResult[] {
  return assignment.codeChecks.map((check) => result(check, 0, [reason]))
}
