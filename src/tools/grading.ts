/** Grading a task done in a professional tool, with that tool's own grader. */
import type { Assignment } from '../content/schemas'
import type { CheckResult } from '../game/grading'
import type { ToolContent } from '../persistence/schemas'
import { checkResult } from './checks'
import { getTool } from './registry'

export function gradeToolTask(
  assignment: Assignment,
  content: ToolContent | null,
): CheckResult[] {
  const task = assignment.tool
  const tool = task && getTool(task.id)
  if (!task || !tool) return []
  const checks = task.checks as Array<{
    id: string
    title: string
    why: string
    hint: string
    points: number
  }>
  const parsed =
    content && content.tool === task.id ? tool.state.safeParse(content.state) : null
  if (content && !parsed?.success) {
    return checks.map((check) =>
      checkResult(check, 0, [`This is not a ${tool.name} file for this task.`]),
    )
  }
  try {
    return tool.grade(task.checks, parsed?.data ?? null, {
      start: task.start,
      solution: task.solution,
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return checks.map((check) =>
      checkResult(check, 0, [`The file could not be checked: ${reason}`]),
    )
  }
}

/** The task's starting file and its model answer, as tool documents' content. */
export function toolTaskContent(assignment: Assignment): {
  start: ToolContent
  solution: ToolContent
} | null {
  const task = assignment.tool
  if (!task) return null
  return {
    start: { tool: task.id, state: task.start },
    solution: { tool: task.id, state: task.solution },
  }
}
