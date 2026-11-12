/**
 * Practical work in a readiness assessment: a real task of the career, done
 * again in its own tool (Sheets, Books, Help Desk, Code, Data Studio…) from a
 * fresh starting file, without the step-by-step guide, and graded by the same
 * checks as the task itself. Only the work in the tool is marked here: the
 * assessment's report is marked by its own step.
 */
import type { Assignment } from '../content/schemas'
import type { AnyDocument } from '../persistence/schemas'
import { buildProjectContent } from './code/grading'
import { gradeCodeSafely } from './code/runInWorker'
import { gradeAssignment, type CheckResult } from './grading'
import { buildQueueContent, gradeEnvironment } from './tickets'
import { gradeToolTask } from '../tools/grading'
import { buildStartingContent } from './workbooks'

/** The fresh file a task starts from, in its own tool. */
export function startingFile(assignment: Assignment) {
  if (assignment.kind === 'tool' && assignment.tool)
    return {
      kind: 'tool' as const,
      title: assignment.tool.title,
      content: { tool: assignment.tool.id, state: assignment.tool.start },
    }
  if (assignment.kind === 'code')
    return {
      kind: 'code' as const,
      title: assignment.project?.title ?? assignment.title,
      content: buildProjectContent(assignment),
    }
  if (assignment.kind === 'tickets')
    return {
      kind: 'tickets' as const,
      title: assignment.queue?.title ?? assignment.title,
      content: buildQueueContent(assignment),
    }
  return {
    kind: 'sheet' as const,
    title: assignment.workbook?.title ?? assignment.title,
    content: buildStartingContent(assignment),
  }
}

export interface PracticalResult {
  /** 0–1: the share of the task's tool checks earned. */
  fraction: number
  notes: string[]
}

const MAX_NOTES = 6

/** Grades the work in the tool with the task's own checks (its report checks left out). */
export async function gradePractical(
  assignment: Assignment,
  document: AnyDocument | undefined,
): Promise<PracticalResult> {
  if (!document || document.kind !== assignment.kind)
    return { fraction: 0, notes: ['The practical work was not started.'] }
  // The assessment marks the written report separately.
  const toolOnly: Assignment = { ...assignment, deliverables: [] }
  const extra: CheckResult[] = []
  if (assignment.kind === 'tool' && document.kind === 'tool')
    extra.push(...gradeToolTask(toolOnly, document.content))
  if (assignment.kind === 'code' && document.kind === 'code')
    extra.push(...(await gradeCodeSafely(toolOnly, document.content)))
  if (assignment.kind === 'tickets' && document.kind === 'tickets')
    extra.push(...gradeEnvironment(toolOnly, document.content))
  const main =
    document.kind === 'sheet' || document.kind === 'tickets' || document.kind === 'code'
      ? document.content
      : null
  const grade = gradeAssignment(toolOnly, main, {}, extra)
  const missed = grade.checks.filter((c) => c.earned < c.points)
  const notes = missed.flatMap((c) =>
    c.problems.length > 0 ? [`${c.title}: ${c.problems[0]}`] : [`${c.title}: not done.`],
  )
  return {
    fraction: grade.maxPoints === 0 ? 0 : grade.earned / grade.maxPoints,
    notes:
      notes.length > MAX_NOTES
        ? [...notes.slice(0, MAX_NOTES), `…and ${notes.length - MAX_NOTES} more.`]
        : notes.length > 0
          ? notes
          : ['Every check of the work in the tool passed.'],
  }
}
