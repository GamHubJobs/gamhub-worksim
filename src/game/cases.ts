/**
 * The case engine. Cases are pieces of real workplace business that arrive
 * from clients, colleagues, suppliers and other departments (see
 * `content/cases`). This module decides when they arrive and lapse, grades
 * the player's answers step by step with the reasons, and applies the
 * consequences to the career save and the organisation.
 *
 * Arrivals are never random: each case has a trigger tied to the player's
 * progress, at most two cases are open at once, and they only arrive during
 * working hours.
 */
import { z } from 'zod'
import { HOURS } from '../content/workday'
import { getAssignment } from '../content/assignments'
import { CASES, getCase } from '../content/cases'
import type { Case, CaseEffects, CaseStep } from '../content/cases/schema'
import { approvalLimit, getOrgDepartment, remainingBudget } from '../content/organisation'
import { createCalculator } from '../apps/sheets/engine/workbook'
import { createId } from '../lib/ids'
import type {
  CaseProgress,
  DocContent,
  MailMessage,
  SlidesContent,
  WorkState,
} from '../persistence/schemas'
import {
  advanceCareer,
  careerLevel,
  firstName,
  isPassed,
  type ProfileData,
} from './career'
import { now } from './deadlines'
import { gradeDeliverables } from './deliverables'
import { changeReputation, changeTrust } from './relationships'
import { log, passTime } from './workday'

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export type MeetingStatus = 'upcoming' | 'open' | 'attended' | 'missed'

/** When a case's meeting starts (absolute office time). */
export function meetingStart(def: Case, progress: CaseProgress): number | null {
  return def.meeting ? progress.arrivedAt + def.meeting.inHours * 60 : null
}

export function meetingStatus(
  work: WorkState,
  def: Case,
  progress: CaseProgress,
): MeetingStatus | null {
  const start = meetingStart(def, progress)
  if (start === null || !def.meeting) return null
  if (progress.joinedAt !== undefined) return 'attended'
  const time = now(work)
  if (time < start) return 'upcoming'
  return time <= start + def.meeting.minutes ? 'open' : 'missed'
}

/** Joins a case's meeting: the meeting takes its time on the office clock. */
export function joinMeeting(profile: ProfileData, caseId: string): ProfileData {
  const def = getCase(caseId)
  const progress = profile.work.cases[caseId]
  if (!def?.meeting || !progress || progress.status !== 'open') return profile
  if (meetingStatus(profile.work, def, progress) !== 'open') return profile
  const joined: ProfileData = {
    ...profile,
    work: log(
      {
        ...profile.work,
        cases: {
          ...profile.work.cases,
          [caseId]: { ...progress, joinedAt: now(profile.work) },
        },
      },
      `Joined: ${def.meeting.title} (${def.meeting.room})`,
      'good',
    ),
  }
  return passTime(joined, def.meeting.minutes, 'meeting')
}

/** Office minutes until a case's meeting starts (0 if it has started). */
export function minutesToMeeting(
  work: WorkState,
  def: Case,
  progress: CaseProgress,
): number {
  const start = meetingStart(def, progress)
  return start === null ? 0 : Math.max(0, start - now(work))
}

/** At most this many cases wait for the player at once. */
export const MAX_OPEN_CASES = 2

export type CaseRating = 'excellent' | 'good' | 'pass' | 'fail'

export interface StepResult {
  id: string
  title: string
  earned: number
  points: number
  notes: string[]
}

export interface CaseResult {
  score: number
  rating: CaseRating
  passed: boolean
  steps: StepResult[]
}

/** The player's career level, 1 for the first. */
export function levelNumber(profile: ProfileData): number {
  const { career, current } = careerLevel(profile)
  return career.levels.findIndex((l) => l.id === current.id) + 1
}

// ---------------------------------------------------------------------------
// Arrival and lapsing
// ---------------------------------------------------------------------------

function triggered(profile: ProfileData, def: Case): boolean {
  const { afterAssignment, afterCase, fromDay } = def.trigger
  if (afterAssignment) {
    const assignment = getAssignment(afterAssignment)
    if (!assignment || !isPassed(assignment, profile.assignments[afterAssignment])) {
      return false
    }
  }
  if (afterCase) {
    const before = profile.work.cases[afterCase]
    if (!before || before.status === 'open') return false
    const onlyIf = def.trigger.onlyIf
    if (onlyIf) {
      // A lapsed case counts as wrong: nothing was handed over.
      const step = before.result?.steps.find((s) => s.id === onlyIf.step)
      const right = !!step && step.earned >= step.points
      if ((onlyIf.outcome === 'right') !== right) return false
    }
  }
  if (fromDay && profile.work.day < fromDay) return false
  return true
}

/** Cases of this career that could arrive now (not yet arrived, conditions met). */
export function dueCases(profile: ProfileData): Case[] {
  const level = levelNumber(profile)
  return CASES.filter(
    (def) =>
      def.careerId === profile.careerId &&
      def.minLevel <= level &&
      !profile.work.cases[def.id] &&
      triggered(profile, def),
  )
}

export function openCases(profile: ProfileData): CaseProgress[] {
  return Object.values(profile.work.cases).filter((c) => c.status === 'open')
}

/** The email that brings a case. */
function caseMail(def: Case, receivedAt: number): MailMessage {
  return {
    id: createId(),
    from: def.from.personId ?? `case:${def.id}`,
    subject: def.email.subject,
    body: def.email.body,
    receivedAt,
    readAt: null,
    kind: 'case',
    caseId: def.id,
  }
}

/** A case arrives: it is opened with its deadline, and its email lands in the inbox. */
export function arriveCase(
  profile: ProfileData,
  def: Case,
  receivedAt: number,
): ProfileData {
  const at = now(profile.work)
  const progress: CaseProgress = {
    caseId: def.id,
    version: def.version,
    status: 'open',
    arrivedAt: at,
    due: at + def.deadlineHours * 60,
    answers: {},
    files: {},
  }
  const work = log(
    { ...profile.work, cases: { ...profile.work.cases, [def.id]: progress } },
    `New ${def.kind === 'client' ? 'client request' : 'case'}: ${def.title}`,
  )
  return { ...profile, work, inbox: [...profile.inbox, caseMail(def, receivedAt)] }
}

/**
 * Lapses cases past their deadline (with their small, explained consequence)
 * and lets the next case arrive when there is room. Called after every change.
 */
export function checkCases(profile: ProfileData, receivedAt = Date.now()): ProfileData {
  let next = profile
  const time = now(profile.work)
  for (const progress of openCases(profile)) {
    if (time <= progress.due) continue
    const def = getCase(progress.caseId)
    next = {
      ...next,
      work: {
        ...next.work,
        cases: {
          ...next.work.cases,
          [progress.caseId]: { ...progress, status: 'lapsed' },
        },
      },
    }
    if (def) {
      next = { ...next, work: applyCaseEffects(next.work, def.outcomes.lapse) }
      next = { ...next, work: log(next.work, def.lapseLog, 'bad') }
    }
  }
  const work = next.work
  if (work.dayOver || work.minute < HOURS.start || work.minute >= HOURS.end) return next
  const due = dueCases(next)
  // The consequences of the player's own work (follow-ups, and the next stage
  // of a programme they are working on) come first, and
  // are not held back by the limit on open cases.
  const followUp = due.find(
    (c) => c.trigger.onlyIf || (c.projectId && c.trigger.afterCase),
  )
  if (followUp) return arriveCase(next, followUp, receivedAt)
  if (openCases(next).length >= MAX_OPEN_CASES) return next
  const [arriving] = due
  return arriving ? arriveCase(next, arriving, receivedAt) : next
}

// ---------------------------------------------------------------------------
// Consequences
// ---------------------------------------------------------------------------

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** Applies a case's effects: trust, reputation, indicators and spending. */
export function applyCaseEffects(work: WorkState, effects: CaseEffects): WorkState {
  let next = work
  for (const [personId, delta] of Object.entries(effects.trust)) {
    next = changeTrust(next, personId, delta)
  }
  next = changeReputation(next, effects.reputation)
  const indicators = { ...next.org.indicators }
  for (const [id, delta] of Object.entries(effects.indicators)) {
    if (delta !== undefined)
      indicators[id as keyof typeof indicators] = clamp(
        indicators[id as keyof typeof indicators] + delta,
      )
  }
  const spend = { ...next.org.spend }
  for (const [department, amount] of Object.entries(effects.spend)) {
    spend[department] = Math.round(((spend[department] ?? 0) + amount) * 100) / 100
  }
  return { ...next, org: { indicators, spend } }
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

const answerSchemas = {
  review: z.array(z.string()),
  figure: z.string(),
  decide: z.string(),
  approve: z.record(z.string(), z.enum(['approve', 'reject', 'escalate'])),
  assign: z.record(z.string(), z.string()),
  actions: z.record(z.string(), z.string()),
  reply: z.string(),
  handoff: z.record(z.string(), z.string()),
} as const

/** A step's saved answer, if it has the right shape for the step. */
export function answerFor<K extends keyof typeof answerSchemas>(
  kind: K,
  raw: unknown,
): z.infer<(typeof answerSchemas)[K]> | undefined {
  const parsed = answerSchemas[kind].safeParse(raw)
  return parsed.success ? (parsed.data as z.infer<(typeof answerSchemas)[K]>) : undefined
}

/** Reads a number typed by a person: "£1,250.50", "12.5%", "-300". */
export function readNumber(text: string): number | null {
  const cleaned = text.replace(/[£$€,%\s]/g, '')
  if (cleaned === '' || !/^-?\d*\.?\d+$/.test(cleaned)) return null
  return Number(cleaned)
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length
const contains = (text: string, term: string) =>
  text.toLowerCase().includes(term.toLowerCase())
const VERDICT_SHARE = { best: 1, acceptable: 0.6, poor: 0 } as const
const DECISION_NAMES = {
  approve: 'approve',
  reject: 'reject',
  escalate: 'escalate',
} as const

/** Documents made for the case's document steps, by step ID. */
export type CaseDocuments = Record<string, DocContent | SlidesContent | undefined>

/** What approvals are judged against: the player's limit and the budgets left. */
export interface CaseContext {
  limit: number
  remaining: (departmentId: string) => number
}

export function caseContext(profile: ProfileData): CaseContext {
  return {
    limit: approvalLimit(levelNumber(profile)),
    remaining: (id) => remainingBudget(profile.work.org.spend, id),
  }
}

type ApproveStep = Extract<CaseStep, { kind: 'approve' }>
type Decision = 'approve' | 'reject' | 'escalate'

/** The right decision for a request, and why, under the rules. */
export function expectedDecision(
  request: ApproveStep['requests'][number],
  context: CaseContext,
): { decision: Decision; why: string } {
  if (request.policyBreach) return { decision: 'reject', why: request.policyBreach }
  const money = (n: number) => `£${n.toLocaleString('en-GB')}`
  if (request.amount > context.limit) {
    return {
      decision: 'escalate',
      why: `${money(request.amount)} is above your approval limit of ${money(context.limit)}, so it goes to the budget holder.`,
    }
  }
  const left = context.remaining(request.department)
  if (request.amount > left) {
    const name = getOrgDepartment(request.department)?.name ?? request.department
    return {
      decision: 'escalate',
      why: `${name} has only ${money(Math.max(0, left))} left this quarter, so it needs the budget holder.`,
    }
  }
  return {
    decision: 'approve',
    why:
      request.why || 'It is within policy, your approval limit and the remaining budget.',
  }
}

function gradeStep(
  step: CaseStep,
  raw: unknown,
  documents: CaseDocuments,
  context: CaseContext,
): { fraction: number; notes: string[] } {
  switch (step.kind) {
    case 'review': {
      const marked = new Set(answerFor('review', raw) ?? [])
      const wrong = step.findings.filter((f) => marked.has(f.id) !== f.issue)
      return {
        fraction: 1 - wrong.length / step.findings.length,
        notes: wrong.map((f) =>
          f.issue
            ? `Should be ticked: “${f.text}”. ${f.why}`
            : `Should not be ticked: “${f.text}”. ${f.why}`,
        ),
      }
    }
    case 'figure': {
      const given = readNumber(answerFor('figure', raw) ?? '')
      const ok = given !== null && Math.abs(given - step.answer) <= step.tolerance
      return {
        fraction: ok ? 1 : 0,
        notes: ok
          ? []
          : [
              `${given === null ? 'No figure was given' : `${given} is not right`}: the answer is ${step.unit === '£' ? '£' : ''}${step.answer.toLocaleString('en-GB')}${step.unit && step.unit !== '£' ? ` ${step.unit}` : ''}. ${step.why}`,
            ],
      }
    }
    case 'decide': {
      const chosen = step.options.find((o) => o.id === answerFor('decide', raw))
      if (!chosen) return { fraction: 0, notes: ['No decision was made.'] }
      const best = step.options.find((o) => o.verdict === 'best')!
      const notes = [`You chose: “${chosen.label}”. ${chosen.why}`]
      if (chosen.verdict !== 'best')
        notes.push(`The best choice: “${best.label}”. ${best.why}`)
      return { fraction: VERDICT_SHARE[chosen.verdict], notes }
    }
    case 'approve': {
      const decisions = answerFor('approve', raw) ?? {}
      const notes: string[] = []
      let right = 0
      for (const r of step.requests) {
        const expected = expectedDecision(r, context)
        if (decisions[r.id] === expected.decision) right++
        else
          notes.push(
            `${r.summary}: ${DECISION_NAMES[expected.decision]}${decisions[r.id] ? `, not ${DECISION_NAMES[decisions[r.id]]}` : ''}. ${expected.why}`,
          )
      }
      return { fraction: right / step.requests.length, notes }
    }
    case 'assign': {
      const chosen = answerFor('assign', raw) ?? {}
      const load = new Map<string, number>()
      const notes: string[] = []
      let right = 0
      for (const item of step.items) {
        const member = step.members.find((m) => m.id === chosen[item.id])
        if (!member) {
          notes.push(`“${item.label}” was not given to anyone.`)
          continue
        }
        load.set(member.id, (load.get(member.id) ?? 0) + 1)
        if (load.get(member.id)! > member.capacity) {
          notes.push(
            `${member.name} has no room for “${item.label}”: they can take ${member.capacity}.`,
          )
        } else if (item.best.includes(member.id)) {
          right++
        } else {
          notes.push(`“${item.label}” suits someone else better. ${item.why}`)
        }
      }
      return { fraction: right / step.items.length, notes }
    }
    case 'actions': {
      const owners = answerFor('actions', raw) ?? {}
      const wrong = step.items.filter((i) => owners[i.id] !== i.owner)
      const name = (id: string) => step.people.find((p) => p.id === id)?.name ?? 'nobody'
      return {
        fraction: 1 - wrong.length / step.items.length,
        notes: wrong.map(
          (i) =>
            `“${i.label}” belongs to ${name(i.owner)}${owners[i.id] ? `, not ${name(owners[i.id])}` : ''}. ${i.why}`,
        ),
      }
    }
    case 'handoff': {
      const given = answerFor('handoff', raw) ?? {}
      const tidy = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim()
      const notes: string[] = []
      let right = 0
      for (const field of step.fields) {
        const value = given[field.id] ?? ''
        const ok =
          field.kind === 'text'
            ? field.accept.some((a) => tidy(a) === tidy(value))
            : field.kind === 'number'
              ? (() => {
                  const n = readNumber(value)
                  return n !== null && Math.abs(n - field.answer) <= field.tolerance
                })()
              : value === field.answer
        if (ok) right++
        else
          notes.push(
            `${field.label}: ${value ? `“${value}” is not right` : 'missing'}. ${field.why}`,
          )
      }
      return { fraction: right / step.fields.length, notes }
    }
    case 'reply': {
      const text = answerFor('reply', raw) ?? ''
      const missing = step.mentions.filter(
        (terms) => !terms.some((t) => contains(text, t)),
      )
      const avoided = step.avoid.filter((a) => a.terms.some((t) => contains(text, t)))
      const length = Math.min(1, words(text) / step.minWords)
      const mentioned =
        step.mentions.length === 0 ? 1 : 1 - missing.length / step.mentions.length
      const fraction = Math.max(0, mentioned * 0.7 + length * 0.3 - avoided.length * 0.25)
      const notes = [
        ...missing.map((terms) => `The reply does not mention ${terms[0]}.`),
        ...avoided.map((a) => `Avoid “${a.terms[0]}”: ${a.why}`),
      ]
      if (length < 1)
        notes.push(`The reply is short: aim for at least ${step.minWords} words.`)
      return { fraction, notes }
    }
    case 'document': {
      const content = documents[step.id]
      const checks = gradeDeliverables(
        [step.deliverable],
        content ? { [step.deliverable.kind]: content } : {},
        { calculator: createCalculator(EMPTY_BOOK), content: EMPTY_BOOK },
      )
      const total = checks.reduce((s, c) => s + c.points, 0)
      const earned = checks.reduce((s, c) => s + c.earned, 0)
      return {
        fraction: total === 0 ? 0 : earned / total,
        notes: checks.flatMap((c) => (c.status === 'passed' ? [] : c.problems)),
      }
    }
  }
}

const EMPTY_BOOK = { sheets: [{ id: 'case-sheet', name: 'Case', cells: {} }] }

export function ratingFor(score: number, passScore: number): CaseRating {
  if (score < passScore) return 'fail'
  return score >= 90 ? 'excellent' : score >= 80 ? 'good' : 'pass'
}

/** Grades every step, with the reasons for anything that is not right. */
/** Context for players with no authority (and for tests): nothing can be approved. */
export const NO_AUTHORITY: CaseContext = { limit: 0, remaining: () => 0 }

export function gradeCase(
  def: Case,
  answers: Record<string, unknown>,
  documents: CaseDocuments = {},
  context: CaseContext = NO_AUTHORITY,
  /** For meeting cases: whether the player joined the meeting. */
  attended = true,
): CaseResult {
  const steps = def.steps.map((step) => {
    if (def.meeting && step.phase !== 'prepare' && !attended) {
      return {
        id: step.id,
        title: step.title,
        earned: 0,
        points: step.points,
        notes: ['You did not attend the meeting, so this was decided without you.'],
      }
    }
    const { fraction, notes } = gradeStep(step, answers[step.id], documents, context)
    const earned = Math.round(step.points * Math.max(0, Math.min(1, fraction)) * 10) / 10
    return { id: step.id, title: step.title, earned, points: step.points, notes }
  })
  const total = steps.reduce((s, r) => s + r.points, 0)
  const score = Math.round((100 * steps.reduce((s, r) => s + r.earned, 0)) / total)
  const rating = ratingFor(score, def.passScore)
  return { score, rating, passed: rating !== 'fail', steps }
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

/** The effects of the options chosen in decision steps. */
function decisionEffects(def: Case, answers: Record<string, unknown>): CaseEffects[] {
  return def.steps.flatMap((step) => {
    if (step.kind !== 'decide') return []
    const chosen = step.options.find(
      (o) => o.id === answerFor('decide', answers[step.id]),
    )
    return chosen ? [chosen.effects] : []
  })
}

/**
 * What the player's approvals do: approved requests commit the department's
 * money; approving something against policy raises risk and hurts budget
 * discipline; approving above one's authority hurts discipline too.
 */
function approvalEffects(
  def: Case,
  answers: Record<string, unknown>,
  context: CaseContext,
): CaseEffects {
  const effects: CaseEffects = { trust: {}, reputation: 0, indicators: {}, spend: {} }
  let risk = 0
  let discipline = 0
  for (const step of def.steps) {
    if (step.kind !== 'approve') continue
    const decisions = answerFor('approve', answers[step.id]) ?? {}
    for (const request of step.requests) {
      if (decisions[request.id] !== 'approve') continue
      effects.spend[request.department] =
        (effects.spend[request.department] ?? 0) + request.amount
      const expected = expectedDecision(request, context).decision
      if (expected === 'reject') {
        risk += 3
        discipline -= 3
      } else if (expected === 'escalate') {
        discipline -= 2
      }
    }
  }
  effects.indicators = { risk, discipline }
  return effects
}

/**
 * Records a submitted case: the result, the consequences of the decisions and
 * of the outcome, the requester's reply, and XP and skills for the work.
 */
export function recordCaseResult(
  profile: ProfileData,
  def: Case,
  result: CaseResult,
  submittedAt: number,
): ProfileData {
  const progress = profile.work.cases[def.id]
  if (!progress || progress.status !== 'open') throw new Error('This case is not open.')
  let work: WorkState = {
    ...profile.work,
    cases: {
      ...profile.work.cases,
      [def.id]: {
        ...progress,
        status: 'submitted',
        result: {
          submittedAt,
          score: result.score,
          rating: result.rating,
          steps: result.steps,
        },
      },
    },
  }
  for (const effects of decisionEffects(def, progress.answers))
    work = applyCaseEffects(work, effects)
  work = applyCaseEffects(
    work,
    approvalEffects(def, progress.answers, caseContext(profile)),
  )
  work = applyCaseEffects(work, result.passed ? def.outcomes.pass : def.outcomes.fail)
  work = log(
    work,
    `${result.passed ? 'Completed' : 'Answered'}: ${def.title} (${result.score}%)`,
    result.passed ? 'good' : 'bad',
  )
  const share = result.score / 100
  const skills = { ...profile.skills }
  for (const [id, gain] of Object.entries(def.skills)) {
    skills[id] = (skills[id] ?? 0) + Math.round(gain * share)
  }
  const reply: MailMessage = {
    id: createId(),
    from: def.from.personId ?? `case:${def.id}`,
    subject: `Re: ${def.email.subject}`,
    body: def.replies[result.rating].replaceAll('{name}', firstName(profile.name)),
    receivedAt: submittedAt + 1,
    readAt: null,
    kind: 'case',
    caseId: def.id,
  }
  const updated: ProfileData = {
    ...profile,
    xp: profile.xp + Math.round(def.xp * share),
    skills,
    work,
    inbox: [...profile.inbox, reply],
  }
  return advanceCareer(updated, submittedAt).profile
}

/** Saves a draft answer to one step of an open case. */
export function saveCaseAnswer(
  profile: ProfileData,
  caseId: string,
  stepId: string,
  answer: unknown,
): ProfileData {
  const progress = profile.work.cases[caseId]
  if (!progress || progress.status !== 'open') return profile
  return {
    ...profile,
    work: {
      ...profile.work,
      cases: {
        ...profile.work.cases,
        [caseId]: { ...progress, answers: { ...progress.answers, [stepId]: answer } },
      },
    },
  }
}

/** Office minutes left before a case's deadline (negative when late). */
export function minutesLeft(work: WorkState, progress: CaseProgress): number {
  return progress.due - now(work)
}
