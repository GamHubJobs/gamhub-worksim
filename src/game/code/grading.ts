/**
 * Grading for Code tasks. Each code check runs tests against the player's
 * files with the runner, so this is pure and synchronous like the rest of
 * grading. In the browser it runs inside the code worker, which stops it if
 * the player's code never finishes (see `codeWorker.ts`).
 */
import type { Assignment, CodeCheck } from '../../content/schemas'
import { CodeContentSchema } from '../../persistence/schemas'
import { headCommit, history, initRepository, isAncestor, status } from './git'
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
    ...(assignment.project.git
      ? {
          git: initRepository(
            Object.fromEntries(assignment.project.files.map((f) => [f.name, f.text])),
          ),
        }
      : {}),
  }
}

/** The model answer: the starting project with the solution files in place. */
export function buildCodeSolution(assignment: Assignment): CodeContent {
  if (assignment.codeSolutionProject)
    return CodeContentSchema.parse(assignment.codeSolutionProject)
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

/** Commits the player made: in the repository now, but not at the start. */
function newCommits(content: CodeContent, startContent: CodeContent) {
  const before = new Set((startContent.git?.commits ?? []).map((c) => c.id))
  return (content.git?.commits ?? []).filter((c) => !before.has(c.id))
}

function gradeCodeCheck(
  check: CodeCheck,
  content: CodeContent,
  startContent: CodeContent,
): CheckResult {
  const start = startContent.files
  let player: SourceFile[] = content.files
  switch (check.type) {
    case 'commits': {
      const repo = content.git
      const mine = newCommits(content, startContent).filter((c) => c.parents.length < 2)
      const reachable = check.branch
        ? new Set(history(repo!, repo?.branches[check.branch]).map((c) => c.id))
        : null
      const terms = check.messageIncludes.map((t) => t.toLowerCase())
      const good = mine.filter(
        (c) =>
          (!reachable || reachable.has(c.id)) &&
          (terms.length === 0 || terms.some((t) => c.message.toLowerCase().includes(t))),
      )
      const problems =
        mine.length === 0
          ? ['You haven’t made any commits: use git add, then git commit -m "…".']
          : good.length < check.min
            ? [
                `No commit${check.branch ? ` on ${check.branch}` : ''} has a message that says what changed (e.g. mentioning ${check.messageIncludes.map((t) => `“${t}”`).join(' or ')}).`,
              ]
            : []
      return result(check, Math.min(1, good.length / check.min), problems)
    }
    case 'branch-merged': {
      const repo = content.git
      const main = repo?.branches.main
      const merged =
        !!repo &&
        !!main &&
        Object.entries(repo.branches).some(
          ([name, tip]) =>
            name !== 'main' &&
            newCommits(content, startContent).some((c) => c.id === tip) &&
            isAncestor(repo, tip, main),
        )
      return result(
        check,
        merged ? 1 : 0,
        merged
          ? []
          : ['Make your fix on its own branch, then merge that branch into main.'],
      )
    }
    case 'clean': {
      const repo = content.git
      const files = Object.fromEntries(content.files.map((f) => [f.name, f.text]))
      const problems: string[] = []
      if (!repo) problems.push('The project has no Git repository.')
      else {
        if (!status(repo, files).clean)
          problems.push(
            'There are changes that are not committed: git status shows them.',
          )
        if (repo.head !== 'main')
          problems.push(
            `You are on ${repo.head}: switch back to main (git checkout main).`,
          )
      }
      return result(check, problems.length ? 0 : 1, problems)
    }
    case 'debugged': {
      const used = (content.debug ?? []).some((d) => d.fn === check.fn)
      return result(
        check,
        used ? 1 : 0,
        used
          ? []
          : [`Call ${check.fn} in the Debug console to see what it really returns.`],
      )
    }
    case 'tests': {
      if (check.on === 'main') {
        const committed =
          content.git && headCommit({ ...content.git, head: 'main' })?.files
        if (!committed) {
          return result(check, 0, ['Nothing is committed on main yet.'])
        }
        player = Object.entries(committed).map(([name, text]) => ({ name, text }))
      }
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
  if (!content) {
    return assignment.codeChecks.map((check) =>
      result(check, 0, ['The project was not handed in.']),
    )
  }
  const startContent = buildProjectContent(assignment)
  return assignment.codeChecks.map((check) =>
    gradeCodeCheck(check, content, startContent),
  )
}

/** Every check failed with the same reason, e.g. when the code took too long. */
export function failedCodeChecks(assignment: Assignment, reason: string): CheckResult[] {
  return assignment.codeChecks.map((check) => result(check, 0, [reason]))
}
