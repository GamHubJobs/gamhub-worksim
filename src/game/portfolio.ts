/**
 * Portfolio capture rules (pure). When a task is submitted, these decide what
 * happens to its portfolio item:
 *
 * - a passing attempt with no item yet → a new item with copies of the files,
 * - a passing attempt that beats the item's score → the evidence is replaced,
 * - any other attempt → only the item's attempt history is updated,
 * - a failing attempt with no item → nothing (failed work is not evidence).
 *
 * The player's presentation choices (included, featured, note, order) are
 * always kept.
 */
import { getCareer } from '../content/careers'
import type { Project } from '../content/projects'
import type { Assignment } from '../content/schemas'
import { getTool } from '../tools/registry'
import type {
  AnyDocument,
  Attempt,
  PortfolioFileRole,
  PortfolioItem,
} from '../persistence/schemas'
import type { GradeResult } from './grading'

/** The unique key of a task's item in a career save. */
export function portfolioKey(profileId: string, assignmentId: string): string {
  return `${profileId}|${assignmentId}`
}

const MAIN_TOOL: Record<string, string> = {
  sheet: 'sheets',
  tickets: 'helpdesk',
  code: 'code',
}

/** The apps and tools a task is done in, e.g. ['books', 'docs']. */
export function toolsOf(assignment: Assignment): string[] {
  const main =
    assignment.kind === 'tool' && assignment.tool
      ? assignment.tool.id
      : MAIN_TOOL[assignment.kind]
  const extra = assignment.deliverables.map((d) => (d.kind === 'doc' ? 'docs' : 'slides'))
  return [...new Set([main, ...extra])]
}

/** A readable name for a tool or app ID (for lists and reports). */
export function toolName(id: string): string {
  const apps: Record<string, string> = {
    sheets: 'Sheets',
    docs: 'Docs',
    slides: 'Slides',
    helpdesk: 'Help Desk',
    code: 'Code',
  }
  return apps[id] ?? getTool(id)?.name ?? id
}

export interface SubmittedFile {
  role: PortfolioFileRole
  document: AnyDocument
}

/** The evidence fields of an item (everything except sync and presentation fields). */
export type ItemEvidence = Omit<
  PortfolioItem,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'rev'
  | 'deviceId'
  | 'deleted'
  | 'included'
  | 'featured'
  | 'note'
  | 'order'
  | 'files'
>

export type CaptureDecision =
  | { action: 'none' }
  | { action: 'history'; attempts: PortfolioItem['attempts'] }
  | { action: 'evidence'; evidence: ItemEvidence; files: SubmittedFile[] }

/** The size of a file's content, for storage figures. */
export function documentBytes(document: AnyDocument): number {
  return JSON.stringify(document.content).length
}

/** Every check a task can be graded on, by ID (attempts store only the IDs). */
export function checkCatalogue(
  assignment: Assignment,
): Map<string, { title: string; why: string; hint: string }> {
  const all = [
    ...assignment.checks,
    ...assignment.ticketChecks,
    ...assignment.codeChecks,
    ...assignment.deliverables.flatMap((d) => d.checks),
    ...((assignment.tool?.checks ?? []) as Array<{
      id: string
      title: string
      why: string
      hint: string
    }>),
  ]
  return new Map(all.map((c) => [c.id, { title: c.title, why: c.why, hint: c.hint }]))
}

/** Rebuilds a grade from a saved attempt (for records made after the fact). */
export function gradeFromAttempt(assignment: Assignment, attempt: Attempt): GradeResult {
  const catalogue = checkCatalogue(assignment)
  const checks = attempt.checks.map((c) => {
    const info = catalogue.get(c.id)
    return {
      ...c,
      title: info?.title ?? c.id,
      why: info?.why ?? '',
      hint: info?.hint ?? '',
    }
  })
  return {
    score: attempt.score,
    rating: attempt.rating,
    passed: attempt.rating !== 'fail',
    earned: checks.reduce((sum, c) => sum + c.earned, 0),
    maxPoints: checks.reduce((sum, c) => sum + c.points, 0),
    checks,
  }
}

/**
 * The attempt that best shows the player's work: the highest passing score
 * (the earliest, if tied). Attempts without check results (the development
 * shortcut's) are never evidence.
 */
export function bestAttempt(attempts: Attempt[]): Attempt | undefined {
  let best: Attempt | undefined
  for (const attempt of attempts) {
    if (attempt.rating === 'fail' || attempt.checks.length === 0) continue
    if (!best || attempt.score > best.score) best = attempt
  }
  return best
}

/** Decides what a submission does to the task's portfolio item. */
export function decideCapture(input: {
  profileId: string
  assignment: Assignment
  grade: GradeResult
  /** Every attempt at the task, including the one just made. */
  attempts: Attempt[]
  submittedAt: number
  files: SubmittedFile[]
  existing: PortfolioItem | undefined
}): CaptureDecision {
  const { assignment, grade, existing } = input
  const attempts = input.attempts.map((a) => ({
    submittedAt: a.submittedAt,
    score: a.score,
  }))
  const passed = grade.passed && grade.rating !== 'fail'
  if (!passed || (existing && grade.score <= existing.score)) {
    return existing ? { action: 'history', attempts } : { action: 'none' }
  }
  const career = getCareer(assignment.careerId)
  const levelIndex = Math.max(
    0,
    career.levels.findIndex((l) => l.id === assignment.levelId),
  )
  return {
    action: 'evidence',
    files: input.files,
    evidence: {
      key: portfolioKey(input.profileId, assignment.id),
      profileId: input.profileId,
      careerId: assignment.careerId,
      type: 'task',
      assignmentId: assignment.id,
      contentVersion: assignment.version,
      title: assignment.title,
      summary: assignment.summary,
      levelId: assignment.levelId,
      levelTitle: career.levels[levelIndex]?.title ?? assignment.levelId,
      levelIndex: levelIndex + 1,
      objectives: assignment.objectives,
      skills: assignment.skills,
      tools: toolsOf(assignment),
      completedAt: input.submittedAt,
      score: grade.score,
      rating: grade.rating as 'excellent' | 'good' | 'pass',
      passScore: assignment.passScore,
      checks: grade.checks.map((c) => ({
        id: c.id,
        title: c.title,
        why: c.why,
        status: c.status,
        earned: c.earned,
        points: c.points,
      })),
      attempts,
    },
  }
}

/** The unique key of a project's item in a career save. */
export function projectKey(profileId: string, projectId: string): string {
  return `${profileId}|project:${projectId}`
}

/**
 * A completed project's evidence, built from its stages' items: one row per
 * stage, the average score, and every skill and tool used. Returns null until
 * every stage has passed. The stages keep their own files.
 */
export function projectEvidence(
  profileId: string,
  project: Project,
  stages: Array<PortfolioItem | undefined>,
): ItemEvidence | null {
  if (stages.length !== project.stages.length || stages.some((s) => !s)) return null
  const items = stages as PortfolioItem[]
  const career = getCareer(project.careerId)
  const levelIndex = Math.max(
    0,
    career.levels.findIndex((l) => l.id === project.levelId),
  )
  const score = Math.round(items.reduce((sum, i) => sum + i.score, 0) / items.length)
  const skills: Record<string, number> = {}
  for (const item of items) {
    for (const [id, weight] of Object.entries(item.skills)) {
      skills[id] = (skills[id] ?? 0) + weight
    }
  }
  return {
    key: projectKey(profileId, project.id),
    profileId,
    careerId: project.careerId,
    type: 'project',
    projectId: project.id,
    contentVersion: 1,
    title: project.title,
    summary: project.brief,
    levelId: project.levelId,
    levelTitle: career.levels[levelIndex]?.title ?? project.levelId,
    levelIndex: levelIndex + 1,
    objectives: project.objectives,
    skills,
    tools: [...new Set(items.flatMap((i) => i.tools))],
    completedAt: Math.max(...items.map((i) => i.completedAt)),
    score,
    rating: score >= 90 ? 'excellent' : score >= 80 ? 'good' : 'pass',
    passScore: Math.max(...items.map((i) => i.passScore)),
    checks: items.map((item, i) => ({
      id: `stage-${i + 1}`,
      title: `Stage ${i + 1}: ${item.title}`,
      why: item.summary,
      status: 'passed' as const,
      earned: item.score,
      points: 100,
    })),
    attempts: items
      .flatMap((i) => i.attempts)
      .sort((a, b) => a.submittedAt - b.submittedAt),
    stages: items.map((item, i) => ({
      assignmentId: project.stages[i],
      itemId: item.id,
      title: item.title,
      score: item.score,
    })),
  }
}
