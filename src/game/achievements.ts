/**
 * Achievements: recognition for real work, worked out from the career save.
 * Each one says exactly how it is earned; there are none for logging in, no
 * streaks and nothing to buy. Every achievement can be earned in every career.
 * Once earned, it is kept in the save's record with the day it was earned.
 */
import { CASES } from '../content/cases'
import { caseFor } from './caseVariants'
import type { Case, CaseKind } from '../content/cases/schema'
import type { CaseProgress, WorkState } from '../persistence/schemas'
import { careerAssignments, isPassed, type ProfileData } from './career'
import { projectsCompleted } from './careerRecord'
import { levelNumber } from './cases'
import { toolsOf, toolName } from './portfolio'

export const ACHIEVEMENT_CATEGORIES = {
  performance: 'Professional performance',
  conduct: 'Workplace conduct',
  leadership: 'Leadership',
  progression: 'Career progression',
} as const

export type AchievementCategory = keyof typeof ACHIEVEMENT_CATEGORIES

export interface Progress {
  done: number
  of: number
}

export interface Achievement {
  id: string
  category: AchievementCategory
  title: string
  /** How it is earned, in plain words (shown before and after it is earned). */
  how: string
  /** How far the player has got: earned when `done >= of`. */
  progress: (profile: ProfileData) => Progress
}

// ---------------------------------------------------------------------------
// Facts from the save
// ---------------------------------------------------------------------------

interface Submitted {
  def: Case
  progress: CaseProgress
}

function submittedCases(profile: ProfileData, ...kinds: CaseKind[]): Submitted[] {
  return Object.values(profile.work.cases).flatMap((progress) => {
    const def = caseFor(profile, progress.caseId)
    if (!def || progress.status !== 'submitted' || !progress.result) return []
    if (kinds.length > 0 && !kinds.includes(def.kind)) return []
    return [{ def, progress }]
  })
}

const passedCases = (profile: ProfileData, ...kinds: CaseKind[]) =>
  submittedCases(profile, ...kinds).filter((c) => c.progress.result!.rating !== 'fail')

/** Submitted cases in which every step of this kind earned full marks. */
function fullMarks(
  profile: ProfileData,
  stepKind: Case['steps'][number]['kind'],
  ...kinds: CaseKind[]
): number {
  return submittedCases(profile, ...kinds).filter(({ def, progress }) => {
    const steps = def.steps.filter((s) => s.kind === stepKind)
    return (
      steps.length > 0 &&
      steps.every((step) => {
        const result = progress.result!.steps.find((s) => s.id === step.id)
        return !!result && result.points > 0 && result.earned === result.points
      })
    )
  }).length
}

function passedTasks(profile: ProfileData) {
  return careerAssignments(profile.careerId).filter((a) =>
    isPassed(a, profile.assignments[a.id]),
  )
}

/** The tool most of this career's tasks are done in (its profession's main tool). */
export function mainTool(careerId: string): string {
  const counts: Record<string, number> = {}
  for (const a of careerAssignments(careerId)) {
    const tool = toolsOf(a)[0]
    counts[tool] = (counts[tool] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'sheets'
}

const count = (done: number, of: number): Progress => ({ done: Math.min(done, of), of })

// ---------------------------------------------------------------------------
// The achievements
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: Achievement[] = [
  // Professional performance
  {
    id: 'first-delivery',
    category: 'performance',
    title: 'First delivery',
    how: 'Pass your first task.',
    progress: (p) => count(passedTasks(p).length, 1),
  },
  {
    id: 'right-first-time',
    category: 'performance',
    title: 'Right first time',
    how: 'Pass 5 tasks on your first attempt.',
    progress: (p) =>
      count(
        passedTasks(p).filter((a) => {
          const first = p.assignments[a.id]?.attempts[0]
          return !!first && first.score >= a.passScore
        }).length,
        5,
      ),
  },
  {
    id: 'excellent-work',
    category: 'performance',
    title: 'Excellent work',
    how: 'Earn an “excellent” rating on 3 tasks.',
    progress: (p) =>
      count(
        passedTasks(p).filter((a) =>
          p.assignments[a.id]?.attempts.some((t) => t.rating === 'excellent'),
        ).length,
        3,
      ),
  },
  {
    id: 'integrated-project',
    category: 'performance',
    title: 'Joined-up work',
    how: 'Complete an integrated project: every stage passed.',
    progress: (p) => count(projectsCompleted(p).length, 1),
  },
  {
    id: 'incident-resolved',
    category: 'performance',
    title: 'Calm under pressure',
    how: 'Pass a workplace incident case.',
    progress: (p) => count(passedCases(p, 'incident').length, 1),
  },
  // Workplace conduct
  {
    id: 'customer-care',
    category: 'conduct',
    title: 'Customer care',
    how: 'Pass 2 client or customer cases.',
    progress: (p) => count(passedCases(p, 'client', 'internal').length, 2),
  },
  {
    id: 'ethical-judgement',
    category: 'conduct',
    title: 'Doing the right thing',
    how: 'In an incident case, make the best decision under pressure.',
    progress: (p) => count(fullMarks(p, 'decide', 'incident'), 1),
  },
  {
    id: 'trusted-colleague',
    category: 'conduct',
    title: 'Trusted colleague',
    how: 'Earn the trust of 3 colleagues (trust 65 or more).',
    progress: (p) =>
      count(Object.values(p.work.relationships).filter((r) => r.trust >= 65).length, 3),
  },
  {
    id: 'reliable',
    category: 'conduct',
    title: 'Reliable',
    how: 'Meet 5 task deadlines.',
    progress: (p) =>
      count(Object.values(p.work.deadlines).filter((d) => d.status === 'met').length, 5),
  },
  {
    id: 'clean-handoff',
    category: 'conduct',
    title: 'Clean hand-off',
    how: 'Hand work to another department with every detail right.',
    progress: (p) => count(fullMarks(p, 'handoff', 'workflow'), 1),
  },
  // Leadership
  {
    id: 'budget-guardian',
    category: 'leadership',
    title: 'Budget guardian',
    how: 'Decide every request in an operations case within policy, authority and budget.',
    progress: (p) => count(fullMarks(p, 'approve', 'operations'), 1),
  },
  {
    id: 'good-delegation',
    category: 'leadership',
    title: 'Good delegation',
    how: 'As a team leader, share out work to match strengths and capacity.',
    progress: (p) => count(fullMarks(p, 'assign', 'leadership'), 1),
  },
  {
    id: 'careful-reviewer',
    category: 'leadership',
    title: 'Careful reviewer',
    how: 'As a team leader, find every problem in your team’s work.',
    progress: (p) => count(fullMarks(p, 'review', 'leadership'), 1),
  },
  {
    id: 'fair-resolution',
    category: 'leadership',
    title: 'Fair resolution',
    how: 'As a team leader, make the best decisions on your team’s disagreements and priorities.',
    progress: (p) => count(fullMarks(p, 'decide', 'leadership'), 1),
  },
  // Career progression
  {
    id: 'first-promotion',
    category: 'progression',
    title: 'Moving up',
    how: 'Earn your first promotion.',
    progress: (p) => count(levelNumber(p) - 1, 1),
  },
  {
    id: 'senior-responsibility',
    category: 'progression',
    title: 'Senior responsibility',
    how: 'Reach the level at which you lead a team.',
    progress: (p) => {
      const from = Math.min(
        ...CASES.filter((c) => c.kind === 'leadership' && c.careerId === p.careerId).map(
          (c) => c.minLevel,
        ),
      )
      return count(levelNumber(p) >= from ? 1 : 0, 1)
    },
  },
  {
    id: 'tool-proficiency',
    category: 'progression',
    title: 'Tool proficiency',
    how: 'Pass 3 tasks in your profession’s main tool.',
    progress: (p) => {
      const tool = mainTool(p.careerId)
      return count(passedTasks(p).filter((a) => toolsOf(a)[0] === tool).length, 3)
    },
  },
  {
    id: 'programme-contribution',
    category: 'progression',
    title: 'Part of something bigger',
    how: 'Deliver both stages of your department’s part in the Manchester office programme.',
    progress: (p) => count(passedCases(p, 'programme').length, 2),
  },
  {
    id: 'well-prepared',
    category: 'progression',
    title: 'Well prepared',
    how: 'Prepare for a case meeting, join it and pass the case.',
    progress: (p) =>
      count(
        passedCases(p, 'meeting').filter((c) => c.progress.joinedAt !== undefined).length,
        1,
      ),
  },
]

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/** The how-to text with the career's own tool name filled in. */
export function describe(achievement: Achievement, careerId: string): string {
  return achievement.id === 'tool-proficiency'
    ? `Pass 3 tasks in ${toolName(mainTool(careerId))}, your profession’s main tool.`
    : achievement.how
}

export function isEarned(profile: ProfileData, id: string): boolean {
  return !!profile.work.record.achievements[id]
}

/**
 * Records any achievement the player has now earned, with the office day, and
 * notes it once in the day's log. Earned achievements are never taken away.
 */
export function checkAchievements(profile: ProfileData, now: number): ProfileData {
  const fresh = ACHIEVEMENTS.filter((a) => {
    if (isEarned(profile, a.id)) return false
    const { done, of } = a.progress(profile)
    return done >= of
  })
  if (fresh.length === 0) return profile
  const { work } = profile
  const achievements = { ...work.record.achievements }
  for (const a of fresh) achievements[a.id] = { day: work.day, at: now }
  const minute = Math.min(24 * 60, Math.max(0, Math.round(work.minute)))
  const log: WorkState['today']['log'] = [
    ...work.today.log,
    ...fresh.map((a) => ({
      minute,
      text: `Achievement earned: ${a.title}.`,
      tone: 'good' as const,
    })),
  ]
  return {
    ...profile,
    work: {
      ...work,
      record: { ...work.record, achievements },
      today: { ...work.today, log },
    },
  }
}
