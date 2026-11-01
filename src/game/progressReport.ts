/**
 * The career progress report: a summary of one career save, built only from
 * its passed work and saved progress, with recommendations that each say why.
 * Every statement can be traced to a portfolio item, a check or a review.
 */
import type { PortfolioItem, Profile } from '../persistence/schemas'
import { careerTools } from '../tools/registry'
import {
  COMPETENCY_LEVEL_NAMES,
  COMPETENCY_RULES,
  competencies,
  experienceRecord,
  improvementAreas,
  type Competency,
  type ExperienceRecord,
  type ImprovementArea,
} from './competencies'
import { assignmentStatus, careerAssignments, careerLevel } from './career'
import { toolName, toolsOf } from './portfolio'
import { RATING_NAMES } from './reviews'

/** Shown on every report and export. */
export const HONESTY_STATEMENT =
  'This portfolio contains work completed in GamHub WorkSim, a workplace simulation. ' +
  'It shows practical skills demonstrated on simulated tasks with simulated data. ' +
  'It is not a record of employment, a qualification or a certification.'

export interface Recommendation {
  title: string
  /** Why, in words, from the records. */
  reason: string
  /** Where to act: a task (opens in Tasks) or a tool (opens its start page). */
  action?: { kind: 'task'; assignmentId: string } | { kind: 'tool'; toolId: string }
}

export interface ProgressReport {
  profileId: string
  name: string
  careerName: string
  levelTitle: string
  levelNumber: number
  levels: number
  summary: string
  /** Practised or Proficient, strongest first (at most 3). */
  strongest: Competency[]
  competencies: Competency[]
  improvements: ImprovementArea[]
  experience: ExperienceRecord
  reviews: Array<{ week: number; rating: string }>
  recommendations: Recommendation[]
}

const RANK = { 'not-yet': 0, demonstrated: 1, practised: 2, proficient: 3 } as const
const MAX_RECOMMENDATIONS = 5

/** The rule-based recommendations, most important first. */
export function recommendations(
  profile: Profile,
  skills: Competency[],
  improvements: ImprovementArea[],
): Recommendation[] {
  const result: Recommendation[] = []
  const tasks = careerAssignments(profile.careerId)
  const status = (id: string) =>
    assignmentStatus(
      profile,
      tasks.find((a) => a.id === id)!,
    )

  // 1. Tasks handed in but not passed yet.
  for (const area of improvements.filter((a) => a.needsRevision)) {
    result.push({
      title: `Resubmit “${area.taskTitle}”`,
      reason:
        area.checks.length > 0
          ? `These checks are not passed yet: ${area.checks.map((c) => c.title).join('; ')}.`
          : 'Your latest attempt did not reach the pass mark.',
      action: { kind: 'task', assignmentId: area.assignmentId },
    })
  }

  // 2. The next task, and the weakest skills it trains.
  const next = tasks.find((a) => {
    const s = status(a.id)
    return s === 'available' || s === 'in-progress'
  })
  if (next) {
    const trains = Object.entries(next.skills)
      .filter(([, weight]) => weight >= COMPETENCY_RULES.minWeight)
      .map(([id]) => skills.find((s) => s.skillId === id))
      .filter((s): s is Competency => !!s)
      .sort((a, b) => RANK[a.level] - RANK[b.level])
    const weakest = trains[0]
    result.push({
      title: `Do your next task: “${next.title}”`,
      reason: weakest
        ? `It trains ${trains.map((s) => s.name).join(', ')}. ${weakest.name} is at “${COMPETENCY_LEVEL_NAMES[weakest.level]}”.`
        : 'It is the next task in your career.',
      action: { kind: 'task', assignmentId: next.id },
    })
  }

  // 3. Skills shown only once (and not trained by the next task): a later task.
  const nextTrains = (id: string) => (next?.skills[id] ?? 0) >= COMPETENCY_RULES.minWeight
  for (const skill of skills.filter(
    (s) => s.level === 'demonstrated' && !nextTrains(s.skillId),
  )) {
    const task = tasks.find(
      (a) =>
        a !== next &&
        status(a.id) !== 'completed' &&
        (a.skills[skill.skillId] ?? 0) >= COMPETENCY_RULES.minWeight,
    )
    if (!task) continue
    result.push({
      title: `Practise ${skill.name}`,
      reason: `It has been shown in 1 passed task. “${task.title}” trains it${
        status(task.id) === 'locked' ? ' (it opens after the tasks before it)' : ''
      }.`,
      action: { kind: 'task', assignmentId: task.id },
    })
  }

  // 4. Tools available now but not used in any passed work yet.
  const { career, current } = careerLevel(profile)
  const passedTools = new Set(
    tasks.filter((a) => status(a.id) === 'completed').flatMap(toolsOf),
  )
  for (const { tool, unlocked } of careerTools(career, current.id)) {
    if (!unlocked || passedTools.has(tool.id)) continue
    const task = tasks.find((a) => a.tool?.id === tool.id && status(a.id) !== 'completed')
    result.push({
      title: `Get to know ${tool.name}`,
      reason: `It is available to you but not used in any passed task yet. Try its practice file${
        task ? `; “${task.title}” uses it` : ''
      }.`,
      action: { kind: 'tool', toolId: tool.id },
    })
  }

  return result.slice(0, MAX_RECOMMENDATIONS)
}

export function progressReport(profile: Profile, items: PortfolioItem[]): ProgressReport {
  const own = items.filter((i) => i.profileId === profile.id)
  const ownTasks = own.filter((i) => i.type === 'task')
  const { career, current } = careerLevel(profile)
  const skills = competencies(own, career.skills)
  const improvements = improvementAreas(profile)
  const experience = experienceRecord(own, [profile])
  const levelNumber = career.levels.findIndex((l) => l.id === current.id) + 1
  const strongest = skills
    .filter((s) => RANK[s.level] >= RANK.practised)
    .sort(
      (a, b) =>
        RANK[b.level] - RANK[a.level] ||
        b.evidence.filter((e) => e.counts).length -
          a.evidence.filter((e) => e.counts).length,
    )
    .slice(0, 3)
  const shown = skills.filter((s) => s.level !== 'not-yet').length
  const tools = Object.keys(experience.tools).map(toolName)
  const summary =
    ownTasks.length === 0
      ? `${profile.name} has started the ${career.name} career as ${current.title} and has not passed a task yet.`
      : `${profile.name} is a ${current.title} (level ${levelNumber} of ${career.levels.length}) in ${career.name}, ` +
        `with ${ownTasks.length} passed ${ownTasks.length === 1 ? 'task' : 'tasks'} showing ${shown} of ${skills.length} skills` +
        (tools.length > 0 ? `, using ${tools.join(', ')}.` : '.')

  return {
    profileId: profile.id,
    name: profile.name,
    careerName: career.name,
    levelTitle: current.title,
    levelNumber,
    levels: career.levels.length,
    summary,
    strongest,
    competencies: skills,
    improvements,
    experience,
    reviews: profile.work.reviews.map((r) => ({
      week: r.week,
      rating: RATING_NAMES[r.rating],
    })),
    recommendations: recommendations(profile, skills, improvements),
  }
}
