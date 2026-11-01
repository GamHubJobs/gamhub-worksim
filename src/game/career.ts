/**
 * Career rules: rewards for submitted work, unlocking assignments, skill
 * levels, promotions and the emails that go with them. Pure functions: they
 * take a profile and return a new one.
 */
import { createId } from '../lib/ids'
import { ASSIGNMENTS } from '../content/assignments'
import { getCareer, SKILL_LEVELS } from '../content/careers'
import { departmentFor } from '../content/departments'
import { COMPANY } from '../content/company'
import { REVIEW_RATINGS, type Assignment } from '../content/schemas'
import type {
  AssignmentProgress,
  Attempt,
  MailMessage,
  Profile,
} from '../persistence/schemas'
import { startingWorkState } from '../persistence/workState'
import { addDeadline } from './deadlines'
import type { GradeResult } from './grading'

/** The parts of a profile the game controls (no save bookkeeping). */
export type ProfileData = Pick<
  Profile,
  'name' | 'careerId' | 'levelId' | 'xp' | 'skills' | 'assignments' | 'inbox' | 'work'
>

export const DEFAULT_CAREER_ID = 'office-admin-finance'

/** Bonus for an excellent result on the first attempt, as a share of the XP. */
export const FIRST_TRY_BONUS = 0.1

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

function personalise(text: string, name: string): string {
  return text.replaceAll('{name}', firstName(name))
}

function message(
  fields: Omit<MailMessage, 'id' | 'readAt'> & { readAt?: number | null },
): MailMessage {
  return { id: createId(), readAt: null, ...fields }
}

// ---------------------------------------------------------------------------
// Starting a career
// ---------------------------------------------------------------------------

export function welcomeMessage(
  name: string,
  now: number,
  careerId = DEFAULT_CAREER_ID,
): MailMessage {
  const career = getCareer(careerId)
  const department = departmentFor(careerId)
  const level = career.levels[0].title
  return message({
    from: 'hr',
    kind: 'welcome',
    receivedAt: now,
    subject: `Welcome to ${COMPANY.name}!`,
    body: `Hi ${firstName(name)},

Welcome to ${COMPANY.name}! We are delighted to have you join the ${department.name} team as ${/^[AEIOU]/.test(level) ? 'an' : 'a'} ${level}. ${department.intro}

Here is how things work:
• Your manager, ${department.manager.name}, will send you tasks by email. You will also find them in the Tasks app.
• ${career.toolsIntro} Everything saves automatically.
• When you submit a task you get feedback straight away. You can improve your work and submit it again: we care more about getting it right than getting it right first time.
• Every task earns experience (XP) and builds your skills. Do well and you will be considered for promotion.

If you get stuck, every task has step-by-step instructions and hints.

Have a great first day!

Grace Okafor
People & Culture`,
  })
}

export function briefingMessage(
  assignment: Assignment,
  name: string,
  now: number,
): MailMessage {
  return message({
    from: assignment.from,
    kind: 'briefing',
    receivedAt: now,
    subject: assignment.briefing.subject,
    body: personalise(assignment.briefing.body, name),
    assignmentId: assignment.id,
  })
}

/** A brand-new career: a welcome email, the first assignment and a Monday morning. */
export function newProfileData(
  name: string,
  now: number,
  careerId = DEFAULT_CAREER_ID,
): ProfileData {
  const first = ASSIGNMENTS.filter((a) => a.careerId === careerId).sort(
    (a, b) => a.order - b.order,
  )[0]
  const work = startingWorkState()
  return {
    work: first ? addDeadline(work, first.id) : work,
    name: name.trim(),
    careerId,
    levelId: getCareer(careerId).levels[0].id,
    xp: 0,
    skills: {},
    assignments: {},
    inbox: [
      welcomeMessage(name, now, careerId),
      ...(first ? [briefingMessage(first, name, now + 1)] : []),
    ],
  }
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export type AssignmentStatus =
  'locked' | 'available' | 'in-progress' | 'needs-revision' | 'completed'

export function bestScore(progress: AssignmentProgress | undefined): number | null {
  if (!progress || progress.attempts.length === 0) return null
  return Math.max(...progress.attempts.map((attempt) => attempt.score))
}

export function isPassed(
  assignment: Assignment,
  progress: AssignmentProgress | undefined,
): boolean {
  const best = bestScore(progress)
  return best !== null && best >= assignment.passScore
}

export function careerAssignments(careerId: string): Assignment[] {
  return ASSIGNMENTS.filter((assignment) => assignment.careerId === careerId)
}

function levelIndex(careerId: string, levelId: string): number {
  return getCareer(careerId).levels.findIndex((level) => level.id === levelId)
}

export function assignmentStatus(
  profile: ProfileData,
  assignment: Assignment,
): AssignmentStatus {
  const progress = profile.assignments[assignment.id]
  if (isPassed(assignment, progress)) return 'completed'
  if (progress && progress.attempts.length > 0) return 'needs-revision'
  if (progress) return 'in-progress'
  // Work for a higher level waits for the promotion.
  if (
    levelIndex(assignment.careerId, assignment.levelId) >
    levelIndex(profile.careerId, profile.levelId)
  ) {
    return 'locked'
  }
  const previous = careerAssignments(assignment.careerId).find(
    (a) => a.order === assignment.order - 1,
  )
  if (previous && !isPassed(previous, profile.assignments[previous.id])) return 'locked'
  return 'available'
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export function skillLevel(xp: number) {
  let current: (typeof SKILL_LEVELS)[number] = SKILL_LEVELS[0]
  for (const level of SKILL_LEVELS) if (xp >= level.xpRequired) current = level
  const next = SKILL_LEVELS.find((level) => level.xpRequired > xp) ?? null
  return { ...current, next }
}

export function careerLevel(profile: ProfileData) {
  const career = getCareer(profile.careerId)
  const index = Math.max(
    0,
    career.levels.findIndex((level) => level.id === profile.levelId),
  )
  return {
    career,
    current: career.levels[index],
    next: career.levels[index + 1] ?? null,
  }
}

export type ReviewRating = (typeof REVIEW_RATINGS)[number]

export function ratingAtLeast(rating: ReviewRating, minimum: ReviewRating): boolean {
  return REVIEW_RATINGS.indexOf(rating) >= REVIEW_RATINGS.indexOf(minimum)
}

/**
 * What is still needed for the next promotion: enough XP, every assignment
 * of the current level passed, a good enough professional reputation and,
 * for senior roles, a good enough latest performance review.
 */
export function promotionProgress(profile: ProfileData) {
  const { current, next } = careerLevel(profile)
  const levelAssignments = careerAssignments(profile.careerId).filter(
    (a) => a.levelId === current.id,
  )
  const passed = levelAssignments.filter((a) =>
    isPassed(a, profile.assignments[a.id]),
  ).length
  const latestReview = profile.work.reviews.at(-1)?.rating ?? null
  const reputationMet = next === null || profile.work.reputation >= next.minReputation
  const reviewMet =
    !next?.minReview ||
    (latestReview !== null && ratingAtLeast(latestReview, next.minReview))
  return {
    next,
    xpNeeded: next ? Math.max(0, next.xpRequired - profile.xp) : 0,
    assignmentsPassed: passed,
    assignmentsTotal: levelAssignments.length,
    reputation: profile.work.reputation,
    reputationMet,
    latestReview,
    reviewMet,
    eligible:
      next !== null &&
      profile.xp >= next.xpRequired &&
      levelAssignments.length > 0 &&
      passed === levelAssignments.length &&
      reputationMet &&
      reviewMet,
  }
}

// ---------------------------------------------------------------------------
// Submitting work
// ---------------------------------------------------------------------------

export interface Reward {
  xp: number
  /** Included in `xp`: the bonus for an excellent first attempt. */
  bonusXp: number
  skills: Record<string, number>
  /** Skills that reached a new level. */
  skillLevelUps: Array<{ skillId: string; level: number; name: string }>
  promotedTo: string | null
  unlocked: Assignment | null
  firstPass: boolean
}

/**
 * XP and skill XP for a score. Only passing work is rewarded, and only
 * improvements on earlier attempts count, so resubmitting never pays twice.
 */
function earnings(assignment: Assignment, score: number, previousBest: number | null) {
  const scale = (amount: number, s: number) => Math.round((amount * s) / 100)
  const rewarded = (s: number | null) => (s !== null && s >= assignment.passScore ? s : 0)
  const before = rewarded(previousBest)
  score = rewarded(score)
  const xp = Math.max(0, scale(assignment.xp, score) - scale(assignment.xp, before))
  const skills: Record<string, number> = {}
  for (const [skillId, amount] of Object.entries(assignment.skills)) {
    const gain = Math.max(0, scale(amount, score) - scale(amount, before))
    if (gain > 0) skills[skillId] = gain
  }
  return { xp, skills }
}

function feedbackMessage(
  assignment: Assignment,
  grade: GradeResult,
  name: string,
  attemptIndex: number,
  now: number,
): MailMessage {
  const greeting = personalise(assignment.feedback[grade.rating], name)
  const notes = grade.checks
    .filter((check) => check.status !== 'passed')
    .map((check) => `• ${check.title}: ${check.hint}`)
  const body =
    notes.length > 0
      ? greeting.replace(
          /\n\n({manager}|[^\n]+)$/,
          `\n\nWhat to look at:\n${notes.join('\n')}\n\n$1`,
        )
      : greeting
  return message({
    from: assignment.from,
    kind: 'feedback',
    receivedAt: now,
    subject: `Re: ${assignment.briefing.subject} (${grade.score}%)`,
    body,
    assignmentId: assignment.id,
    attemptIndex,
  })
}

function promotionMessage(
  name: string,
  title: string,
  now: number,
  careerId: string,
): MailMessage {
  const signature = departmentFor(careerId).manager.name.split(' ')[0]
  return message({
    from: 'manager',
    kind: 'promotion',
    receivedAt: now,
    subject: `Congratulations, you are now ${title}!`,
    body: `Hi ${firstName(name)},

I wanted to tell you personally: you have been promoted to ${title}.

Your work has been accurate and reliable, and you have shown that you understand not just how to do the tasks, but why they matter. That is exactly what we look for.

New responsibilities will follow soon. Well done, and thank you!

${signature}`,
  })
}

/**
 * Promotes the player if they now meet every requirement, and sends the
 * briefing (with a deadline) for any task that has become available. Safe to
 * call after any change: it does nothing when nothing is due.
 */
export function advanceCareer(
  profile: ProfileData,
  now: number,
): { profile: ProfileData; promotedTo: string | null; unlocked: Assignment | null } {
  let updated = profile
  let promotedTo: string | null = null
  const promotion = promotionProgress(updated)
  if (promotion.eligible && promotion.next) {
    promotedTo = promotion.next.title
    updated = {
      ...updated,
      levelId: promotion.next.id,
      inbox: [
        ...updated.inbox,
        promotionMessage(profile.name, promotion.next.title, now + 3, profile.careerId),
      ],
    }
  }

  let unlocked: Assignment | null = null
  for (const assignment of careerAssignments(updated.careerId)) {
    if (assignmentStatus(updated, assignment) !== 'available') continue
    const briefed = updated.inbox.some(
      (mail) => mail.kind === 'briefing' && mail.assignmentId === assignment.id,
    )
    if (briefed) continue
    updated = {
      ...updated,
      inbox: [...updated.inbox, briefingMessage(assignment, profile.name, now + 4)],
      work: addDeadline(updated.work, assignment.id),
    }
    unlocked ??= assignment
  }
  return { profile: updated, promotedTo, unlocked }
}

/**
 * Records a submission: the attempt, XP and skill rewards, the manager's
 * reply, the next assignment (on a first pass) and a promotion if earned.
 */
export function recordSubmission(
  profile: ProfileData,
  assignment: Assignment,
  grade: GradeResult,
  now: number,
  versionId?: string,
  /** The version-history copies of the report and presentation handed in. */
  fileVersions?: { doc?: string; slides?: string },
): { profile: ProfileData; reward: Reward; attempt: Attempt } {
  const progress = profile.assignments[assignment.id]
  if (!progress) throw new Error('This assignment has not been started.')
  const previousBest = bestScore(progress)
  const wasPassed = isPassed(assignment, progress)
  const isFirstAttempt = progress.attempts.length === 0

  const earned = earnings(assignment, grade.score, previousBest)
  const bonusXp =
    isFirstAttempt && grade.rating === 'excellent'
      ? Math.round(assignment.xp * FIRST_TRY_BONUS)
      : 0
  const xp = earned.xp + bonusXp

  const attempt: Attempt = {
    submittedAt: now,
    score: grade.score,
    rating: grade.rating,
    checks: grade.checks.map(({ id, status, earned: points, points: max, problems }) => ({
      id,
      status,
      earned: points,
      points: max,
      problems,
    })),
    xpEarned: xp,
    skillXpEarned: earned.skills,
    ...(versionId ? { versionId } : {}),
    ...(fileVersions && (fileVersions.doc || fileVersions.slides)
      ? { files: fileVersions }
      : {}),
  }

  const skills = { ...profile.skills }
  const skillLevelUps: Reward['skillLevelUps'] = []
  for (const [skillId, gain] of Object.entries(earned.skills)) {
    const before = skillLevel(skills[skillId] ?? 0)
    skills[skillId] = (skills[skillId] ?? 0) + gain
    const after = skillLevel(skills[skillId])
    if (after.level > before.level) {
      skillLevelUps.push({ skillId, level: after.level, name: after.name })
    }
  }

  const attemptIndex = progress.attempts.length
  let updated: ProfileData = {
    ...profile,
    xp: profile.xp + xp,
    skills,
    assignments: {
      ...profile.assignments,
      [assignment.id]: { ...progress, attempts: [...progress.attempts, attempt] },
    },
    inbox: [
      ...profile.inbox,
      feedbackMessage(assignment, grade, profile.name, attemptIndex, now),
    ],
  }

  // A first pass unlocks the next assignment; a promotion may follow, which
  // unlocks the next level's first assignment.
  const firstPass = grade.passed && !wasPassed
  const advanced = advanceCareer(updated, now)
  updated = advanced.profile
  const { promotedTo, unlocked } = advanced

  return {
    profile: updated,
    reward: {
      xp,
      bonusXp,
      skills: earned.skills,
      skillLevelUps,
      promotedTo,
      unlocked,
      firstPass,
    },
    attempt,
  }
}

export function unreadCount(profile: ProfileData): number {
  return profile.inbox.filter((mail) => mail.readAt === null).length
}
