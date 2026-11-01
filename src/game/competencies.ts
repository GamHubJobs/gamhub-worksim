/**
 * The competency and experience record, calculated from portfolio items (passed
 * work) only. Nothing here is stored: opening a tool, visiting a career or
 * failing a task can never raise a level.
 *
 * Competencies are the game's skills. Levels follow explicit rules, and every
 * level comes with the reasons for it, in words.
 */
import { getAssignment } from '../content/assignments'
import { getCareer, getSkill } from '../content/careers'
import type { PortfolioItem, Profile } from '../persistence/schemas'
import { careerAssignments, careerLevel, isPassed } from './career'
import { checkCatalogue } from './portfolio'

/** The rules (shown to the player in the Skills view). */
export const COMPETENCY_RULES = {
  /** A task counts towards a level when the skill is a main part of it. */
  minWeight: 20,
  practised: 2,
  proficient: 3,
  /** Proficient also needs a task at this level of a career or above (1 = first). */
  proficientLevel: 2,
  /** …and this average score (%) across the counted tasks. */
  proficientAverage: 80,
} as const

export type CompetencyLevel = 'not-yet' | 'demonstrated' | 'practised' | 'proficient'

export const COMPETENCY_LEVEL_NAMES: Record<CompetencyLevel, string> = {
  'not-yet': 'Not yet demonstrated',
  demonstrated: 'Demonstrated',
  practised: 'Practised',
  proficient: 'Proficient',
}

export interface CompetencyEvidenceItem {
  itemId: string
  title: string
  /** How much of the task trains this skill (its skill XP). */
  weight: number
  score: number
  levelIndex: number
  levelTitle: string
  /** True when the task counts towards the level (weight of 20 or more). */
  counts: boolean
}

export interface Competency {
  skillId: string
  name: string
  description: string
  level: CompetencyLevel
  /** Why this level, in words. */
  reasons: string[]
  /** Newest first. */
  evidence: CompetencyEvidenceItem[]
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function levelOf(counted: CompetencyEvidenceItem[]): {
  level: CompetencyLevel
  reasons: string[]
} {
  const rules = COMPETENCY_RULES
  const n = counted.length
  if (n === 0) return { level: 'not-yet', reasons: [] }
  const average = Math.round(counted.reduce((sum, e) => sum + e.score, 0) / n)
  const advanced = counted.filter((e) => e.levelIndex >= rules.proficientLevel).length
  const shown = `Shown in ${plural(n, 'passed task')}, average score ${average}%`
  if (n >= rules.proficient && advanced > 0 && average >= rules.proficientAverage) {
    return {
      level: 'proficient',
      reasons: [
        `${shown}, including ${advanced} at level ${rules.proficientLevel} or above.`,
      ],
    }
  }
  if (n >= rules.practised) {
    const missing: string[] = []
    if (n < rules.proficient) missing.push(plural(rules.proficient - n, 'more task'))
    if (advanced === 0) missing.push(`a task at level ${rules.proficientLevel} or above`)
    if (average < rules.proficientAverage)
      missing.push(`an average of ${rules.proficientAverage}% or more`)
    return {
      level: 'practised',
      reasons: [`${shown}.`, `For Proficient: ${missing.join(', ')}.`],
    }
  }
  return {
    level: 'demonstrated',
    reasons: [`${shown}.`, `For Practised: ${plural(rules.practised - n, 'more task')}.`],
  }
}

/** Every listed skill's level, reasons and evidence, from passed work. */
export function competencies(items: PortfolioItem[], skillIds: string[]): Competency[] {
  // A project's stages are tasks of their own, so projects are not counted again.
  const tasks = items.filter((item) => item.type !== 'project')
  return skillIds.map((skillId) => {
    const skill = getSkill(skillId)
    const evidence = tasks
      .filter((item) => (item.skills[skillId] ?? 0) > 0)
      .sort((a, b) => b.completedAt - a.completedAt)
      .map((item) => ({
        itemId: item.id,
        title: item.title,
        weight: item.skills[skillId],
        score: item.score,
        levelIndex: item.levelIndex,
        levelTitle: item.levelTitle,
        counts: item.skills[skillId] >= COMPETENCY_RULES.minWeight,
      }))
    const { level, reasons } = levelOf(evidence.filter((e) => e.counts))
    const minor = evidence.filter((e) => !e.counts).length
    if (level === 'not-yet') {
      reasons.push(
        minor > 0
          ? `Used in ${plural(minor, 'passed task')}, but not yet as a main skill of a task.`
          : 'No passed task has trained this skill yet.',
      )
    } else if (minor > 0) {
      reasons.push(`Also used in ${plural(minor, 'other task')}.`)
    }
    return {
      skillId,
      name: skill?.name ?? skillId,
      description: skill?.description ?? '',
      level,
      reasons,
      evidence,
    }
  })
}

/** The skills of these career saves' careers, in the careers' own order. */
export function skillsOf(profiles: Profile[]): string[] {
  return [...new Set(profiles.flatMap((p) => getCareer(p.careerId).skills))]
}

export interface ExperienceRecord {
  tasksCompleted: number
  /** Integrated projects with every stage passed. */
  projectsCompleted: number
  /** Cases handled successfully (client requests, incidents, meetings…). */
  casesCompleted: number
  attempts: number
  /** Tool or app ID → number of passed tasks done in it. */
  tools: Record<string, number>
  /** From the tasks' estimated times; an estimate, not a measurement. */
  estimatedMinutes: number
  careers: Array<{
    profileId: string
    careerName: string
    levelTitle: string
    levelNumber: number
    levels: number
    tasksPassed: number
    tasksInCareer: number
  }>
}

export function experienceRecord(
  items: PortfolioItem[],
  profiles: Profile[],
): ExperienceRecord {
  const projects = items.filter((item) => item.type === 'project')
  const cases = items.filter((item) => item.type === 'case')
  items = items.filter((item) => item.type === 'task')
  const tools: Record<string, number> = {}
  for (const item of items)
    for (const tool of item.tools) tools[tool] = (tools[tool] ?? 0) + 1
  return {
    tasksCompleted: items.length,
    projectsCompleted: projects.length,
    casesCompleted: cases.length,
    attempts: items.reduce((sum, item) => sum + item.attempts.length, 0),
    tools,
    estimatedMinutes: items.reduce(
      (sum, item) =>
        sum +
        (item.assignmentId
          ? (getAssignment(item.assignmentId)?.estimatedMinutes ?? 0)
          : 0),
      0,
    ),
    careers: profiles.map((profile) => {
      const { career, current } = careerLevel(profile)
      const all = careerAssignments(profile.careerId)
      return {
        profileId: profile.id,
        careerName: career.name,
        levelTitle: current.title,
        levelNumber: career.levels.findIndex((l) => l.id === current.id) + 1,
        levels: career.levels.length,
        tasksPassed: all.filter((a) => isPassed(a, profile.assignments[a.id])).length,
        tasksInCareer: all.length,
      }
    }),
  }
}

export interface ImprovementArea {
  assignmentId: string
  taskTitle: string
  /** True when the task has not been passed yet. */
  needsRevision: boolean
  checks: Array<{ title: string; status: 'partial' | 'failed' }>
  skills: string[]
}

/**
 * What to work on: checks not fully passed in each task's latest attempt
 * (and tasks not yet passed), newest first.
 */
export function improvementAreas(profile: Profile): ImprovementArea[] {
  const areas: Array<{ at: number; area: ImprovementArea }> = []
  for (const progress of Object.values(profile.assignments)) {
    const assignment = getAssignment(progress.assignmentId)
    const latest = progress.attempts.at(-1)
    if (!assignment || !latest) continue
    const catalogue = checkCatalogue(assignment)
    const checks = latest.checks
      .filter((c) => c.status !== 'passed')
      .map((c) => ({
        title: catalogue.get(c.id)?.title ?? c.id,
        status: c.status as 'partial' | 'failed',
      }))
    const needsRevision = !isPassed(assignment, progress)
    if (checks.length === 0 && !needsRevision) continue
    areas.push({
      at: latest.submittedAt,
      area: {
        assignmentId: assignment.id,
        taskTitle: assignment.title,
        needsRevision,
        checks,
        skills: Object.keys(assignment.skills),
      },
    })
  }
  return areas.sort((a, b) => b.at - a.at).map(({ area }) => area)
}
