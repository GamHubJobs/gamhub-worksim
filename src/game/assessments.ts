/**
 * Career readiness assessments (content in `content/assessments.ts`). An
 * assessment is a timed piece of practical work for the player's current
 * level, graded like a case. It can be retaken after a fail, in another
 * version; every attempt is kept. Passing the assessment of the current level
 * is needed for the next promotion (levels already held are never affected).
 *
 * These are simulated workplace assessments: they show what the player has
 * demonstrated in WorkSim, and are not qualifications.
 */
import { ASSESSMENTS, getAssessment, VERSION_IDS } from '../content/assessments'
import type { Case } from '../content/cases/schema'
import type { AssessmentAttempt, WorkState } from '../persistence/schemas'
import type { ProfileData } from './career'
import { now } from './deadlines'
import type { CaseResult, StepResult } from './cases'

/** The assessments of a career, by level. */
export function careerAssessments(careerId: string): Case[] {
  return ASSESSMENTS.filter((a) => a.careerId === careerId).sort(
    (a, b) => a.minLevel - b.minLevel,
  )
}

/** The career's assessment taken at this level (needed for the next promotion), if any. */
export function assessmentAtLevel(careerId: string, level: number): Case | undefined {
  return careerAssessments(careerId).find((a) => a.minLevel === level)
}

export function attemptsOf(profile: ProfileData, id: string): AssessmentAttempt[] {
  return profile.work.record.assessments.filter((a) => a.caseId === id)
}

export function openAttempt(
  profile: ProfileData,
  id: string,
): AssessmentAttempt | undefined {
  return attemptsOf(profile, id).find((a) => a.status === 'open')
}

export function isPassedAttempt(attempt: AssessmentAttempt): boolean {
  return attempt.status === 'submitted' && attempt.result?.rating !== 'fail'
}

export function hasPassed(profile: ProfileData, id: string): boolean {
  return attemptsOf(profile, id).some(isPassedAttempt)
}

/** The assessment as it was (or will be) taken in an attempt. */
export function attemptDef(attempt: Pick<AssessmentAttempt, 'caseId' | 'variant'>) {
  return getAssessment(attempt.caseId, attempt.variant)
}

/** A small, stable hash, so the same save and assessment start on the same version. */
function hash(text: string): number {
  let h = 2166136261
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  return h >>> 0
}

/** The version for an attempt: each retake moves to the next version. */
export function versionFor(seed: number, id: string, attempt: number): string {
  const start = seed === 0 ? 0 : hash(`${seed}:${id}`) % VERSION_IDS.length
  return VERSION_IDS[(start + attempt - 1) % VERSION_IDS.length]
}

export type StartCheck = { ok: true } | { ok: false; reason: string }

export function canStart(profile: ProfileData, id: string, level: number): StartCheck {
  const def = getAssessment(id)
  if (!def || def.careerId !== profile.careerId)
    return { ok: false, reason: 'This assessment is for another career.' }
  if (level < def.minLevel)
    return { ok: false, reason: 'This assessment opens when you reach its level.' }
  if (openAttempt(profile, id)) return { ok: false, reason: 'It is already in progress.' }
  if (hasPassed(profile, id)) return { ok: false, reason: 'You have already passed it.' }
  if (profile.work.dayOver) return { ok: false, reason: 'The working day is over.' }
  return { ok: true }
}

function logLine(
  work: WorkState,
  text: string,
  tone: 'good' | 'neutral' | 'bad',
): WorkState {
  const minute = Math.min(24 * 60, Math.max(0, Math.round(work.minute)))
  return {
    ...work,
    today: { ...work.today, log: [...work.today.log, { minute, text, tone }] },
  }
}

/** Starts an attempt: the clock starts now. */
export function startAssessment(
  profile: ProfileData,
  id: string,
  level: number,
): ProfileData {
  if (!canStart(profile, id, level).ok) return profile
  const number = attemptsOf(profile, id).length + 1
  const variant = versionFor(profile.work.record.seed, id, number)
  const def = getAssessment(id, variant)!
  const at = now(profile.work)
  const attempt: AssessmentAttempt = {
    caseId: id,
    version: def.version,
    variant,
    attempt: number,
    status: 'open',
    arrivedAt: at,
    due: at + def.deadlineHours * 60,
    answers: {},
    files: {},
  }
  const work = logLine(
    {
      ...profile.work,
      record: {
        ...profile.work.record,
        assessments: [...profile.work.record.assessments, attempt],
      },
    },
    `Started: ${def.title}${number > 1 ? ` (attempt ${number})` : ''}`,
    'neutral',
  )
  return { ...profile, work }
}

/** Changes the open attempt of an assessment. */
function updateOpen(
  profile: ProfileData,
  id: string,
  change: (attempt: AssessmentAttempt) => AssessmentAttempt,
): ProfileData {
  const open = openAttempt(profile, id)
  if (!open) return profile
  return {
    ...profile,
    work: {
      ...profile.work,
      record: {
        ...profile.work.record,
        assessments: profile.work.record.assessments.map((a) =>
          a === open ? change(a) : a,
        ),
      },
    },
  }
}

export function saveAssessmentAnswer(
  profile: ProfileData,
  id: string,
  stepId: string,
  answer: unknown,
): ProfileData {
  return updateOpen(profile, id, (a) => ({
    ...a,
    answers: { ...a.answers, [stepId]: answer },
  }))
}

export function setAssessmentFile(
  profile: ProfileData,
  id: string,
  stepId: string,
  documentId: string,
): ProfileData {
  return updateOpen(profile, id, (a) => ({
    ...a,
    files: { ...a.files, [stepId]: documentId },
  }))
}

/** Ends attempts whose time has run out (they count as not passed; a retake is allowed). */
export function checkAssessments(profile: ProfileData): ProfileData {
  const time = now(profile.work)
  let next = profile
  for (const attempt of profile.work.record.assessments) {
    if (attempt.status !== 'open' || time <= attempt.due) continue
    const def = attemptDef(attempt)
    next = updateOpen(next, attempt.caseId, (a) => ({ ...a, status: 'lapsed' }))
    next = {
      ...next,
      work: logLine(
        next.work,
        `Time ran out on “${def?.title ?? 'the assessment'}”. You can take it again.`,
        'bad',
      ),
    }
  }
  return next
}

/**
 * Records a graded attempt. A first pass earns XP and skills; any pass may make
 * the player eligible for promotion, which the caller checks.
 */
export function recordAssessmentResult(
  profile: ProfileData,
  id: string,
  result: CaseResult,
  submittedAt: number,
): ProfileData {
  const open = openAttempt(profile, id)
  if (!open) throw new Error('This assessment is not in progress.')
  const def = attemptDef(open)!
  const firstPass = result.passed && !hasPassed(profile, id)
  let updated = updateOpen(profile, id, (a) => ({
    ...a,
    status: 'submitted',
    result: {
      submittedAt,
      score: result.score,
      rating: result.rating,
      steps: result.steps,
    },
  }))
  updated = {
    ...updated,
    work: logLine(
      updated.work,
      result.passed
        ? `Passed: ${def.title} (${result.score}%)`
        : `Not yet passed: ${def.title} (${result.score}%). Practise and try again.`,
      result.passed ? 'good' : 'neutral',
    ),
  }
  if (!firstPass) return updated
  const share = result.score / 100
  const skills = { ...updated.skills }
  for (const [skill, gain] of Object.entries(def.skills))
    skills[skill] = (skills[skill] ?? 0) + Math.round(gain * share)
  return { ...updated, xp: updated.xp + Math.round(def.xp * share), skills }
}

export interface Feedback {
  /** Steps done well (80% or more of their marks). */
  strengths: string[]
  /** Steps to work on (under 60%), with the first reason. */
  improvements: Array<{ step: string; note: string }>
}

/** What the attempt shows: strengths and areas to improve, step by step. */
export function feedbackOf(steps: StepResult[]): Feedback {
  return {
    strengths: steps.filter((s) => s.earned >= 0.8 * s.points).map((s) => s.title),
    improvements: steps
      .filter((s) => s.earned < 0.6 * s.points)
      .map((s) => ({ step: s.title, note: s.notes[0] ?? 'Review this step.' })),
  }
}
