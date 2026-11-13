/**
 * The career-wide performance record: what the player has done across their
 * work, worked out from what the save already holds (task attempts, case
 * results and answers, relationships, promotions). Nothing here is a made-up
 * score: every figure is a count, a sum or an average of saved results, and
 * says where it comes from.
 */
import { getCareer } from '../content/careers'
import { caseFor } from './caseVariants'
import { CASES } from '../content/cases'
import type { Case, CaseKind } from '../content/cases/schema'
import {
  approvalLimit,
  getOrgDepartment,
  remainingBudget,
  STARTING_INDICATORS,
} from '../content/organisation'
import { PROJECTS } from '../content/projects'
import type { CaseProgress } from '../persistence/schemas'
import {
  bestScore,
  careerAssignments,
  careerLevel,
  isPassed,
  type ProfileData,
} from './career'
import { answerFor, levelNumber } from './cases'
import { trustReading } from './relationships'

/** The department each career works in (see `organisation.ts`). */
export const CAREER_DEPARTMENT: Record<string, string> = {
  'office-admin-finance': 'finance',
  accounting: 'accounting',
  'it-support': 'it',
  'digital-marketing': 'marketing',
  'data-analytics': 'data',
  'software-development': 'engineering',
  healthcare: 'ward',
  legal: 'law',
}

export interface RecordStat {
  label: string
  value: string
  /** How the figure is worked out, in plain words. */
  source: string
}

export interface RecordSection {
  id:
    | 'customers'
    | 'budgets'
    | 'incidents'
    | 'meetings'
    | 'handoffs'
    | 'leadership'
    | 'relationships'
    | 'progression'
  title: string
  stats: RecordStat[]
}

/** The player's work while they held one level. */
export interface LevelPeriod {
  levelId: string
  title: string
  /** The office day the level was reached (1 for the first level; null if unknown). */
  fromDay: number | null
  tasksPassed: number
  /** Average best score of the tasks passed in this period. */
  averageTaskScore: number | null
  casesSubmitted: number
  averageCaseScore: number | null
}

export interface CareerRecord {
  sections: RecordSection[]
  periods: LevelPeriod[]
}

const pounds = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
const average = (values: number[]) =>
  values.length === 0
    ? null
    : Math.round(values.reduce((a, b) => a + b, 0) / values.length)
const percent = (earned: number, points: number) =>
  points === 0 ? '–' : `${Math.round((100 * earned) / points)}%`

interface Handled {
  def: Case
  progress: CaseProgress
}

/** The save's cases with their content, oldest first. */
function handledCases(profile: ProfileData): Handled[] {
  return Object.values(profile.work.cases)
    .flatMap((progress) => {
      const def = caseFor(profile, progress.caseId)
      return def ? [{ def, progress }] : []
    })
    .sort((a, b) => a.progress.arrivedAt - b.progress.arrivedAt)
}

/** Points earned and available in the submitted cases' steps of one kind. */
function stepPoints(cases: Handled[], kind: Case['steps'][number]['kind']) {
  let earned = 0
  let points = 0
  let count = 0
  for (const { def, progress } of cases) {
    for (const step of def.steps) {
      if (step.kind !== kind) continue
      const result = progress.result?.steps.find((s) => s.id === step.id)
      if (!result) continue
      earned += result.earned
      points += result.points
      count++
    }
  }
  return { earned, points, count }
}

function caseSummary(cases: Handled[], noun: string): RecordStat[] {
  const submitted = cases.filter((c) => c.progress.status === 'submitted')
  const passed = submitted.filter((c) => c.progress.result?.rating !== 'fail')
  const lapsed = cases.filter((c) => c.progress.status === 'lapsed')
  const score = average(submitted.map((c) => c.progress.result?.score ?? 0))
  return [
    {
      label: `${noun} handled`,
      value: `${submitted.length}`,
      source: `${noun} you submitted. ${passed.length} passed (70% or more).`,
    },
    {
      label: 'Average score',
      value: score === null ? '–' : `${score}%`,
      source: `The average of your scores on the ${noun.toLowerCase()} you submitted.`,
    },
    {
      label: 'Missed deadlines',
      value: `${lapsed.length}`,
      source: `${noun} whose deadline passed before you submitted.`,
    },
  ]
}

function ofKind(cases: Handled[], ...kinds: CaseKind[]): Handled[] {
  return cases.filter((c) => kinds.includes(c.def.kind))
}

function budgetSection(profile: ProfileData, cases: Handled[]): RecordSection {
  const submitted = cases.filter((c) => c.progress.status === 'submitted')
  const counts = { approve: 0, reject: 0, escalate: 0 }
  let approvedValue = 0
  for (const { def, progress } of submitted) {
    for (const step of def.steps) {
      if (step.kind !== 'approve') continue
      const decisions = answerFor('approve', progress.answers[step.id]) ?? {}
      for (const request of step.requests) {
        const decision = decisions[request.id]
        if (!decision) continue
        counts[decision]++
        if (decision === 'approve') approvedValue += request.amount
      }
    }
  }
  const approvals = stepPoints(submitted, 'approve')
  const department = getOrgDepartment(CAREER_DEPARTMENT[profile.careerId] ?? '')
  const limit = approvalLimit(levelNumber(profile))
  const stats: RecordStat[] = [
    {
      label: 'Requests decided',
      value: `${counts.approve + counts.reject + counts.escalate}`,
      source: `Purchase and spending requests in the cases you submitted: ${counts.approve} approved, ${counts.reject} rejected, ${counts.escalate} escalated.`,
    },
    {
      label: 'Value you approved',
      value: pounds(approvedValue),
      source: 'The total of the requests you approved.',
    },
    {
      label: 'Decisions within policy and authority',
      value: percent(approvals.earned, approvals.points),
      source:
        'The marks you earned on approval steps, out of the marks available: a decision earns them when it follows policy, your limit and the remaining budget.',
    },
    {
      label: 'Your spending limit',
      value: limit > 0 ? pounds(limit) : 'None yet',
      source: 'The approval limit for your current level. It grows with each promotion.',
    },
  ]
  if (department) {
    const spent = profile.work.org.spend[department.id] ?? 0
    stats.push({
      label: `${department.name} budget left this quarter`,
      value: pounds(remainingBudget(profile.work.org.spend, department.id)),
      source: `The uncommitted part of the department’s ${pounds(department.quarterBudget)} quarterly budget, less ${pounds(spent)} committed through your cases.`,
    })
  }
  return { id: 'budgets', title: 'Budgets and approvals', stats }
}

function meetingSection(profile: ProfileData, cases: Handled[]): RecordSection {
  const { history, today } = profile.work
  const attended =
    history.reduce((sum, day) => sum + day.meetingsAttended, 0) +
    Object.values(today.meetings).filter((m) => m !== 'missed').length
  const missed =
    history.reduce((sum, day) => sum + day.meetingsMissed, 0) +
    Object.values(today.meetings).filter((m) => m === 'missed').length
  const caseMeetings = ofKind(cases, 'meeting').filter(
    (c) => c.progress.status !== 'open',
  )
  const joined = caseMeetings.filter((c) => c.progress.joinedAt !== undefined).length
  const files = cases
    .filter((c) => c.progress.status === 'submitted')
    .reduce(
      (sum, c) =>
        sum +
        c.def.steps.filter((s) => s.kind === 'document' && c.progress.files[s.id]).length,
      0,
    )
  return {
    id: 'meetings',
    title: 'Meetings and deliverables',
    stats: [
      {
        label: 'Team meetings attended',
        value: `${attended}`,
        source: `Stand-ups, one-to-ones and team meetings on your working days. ${missed} missed.`,
      },
      {
        label: 'Case meetings attended',
        value: `${joined} of ${caseMeetings.length}`,
        source: 'Meetings you prepared for in a case and joined at the time.',
      },
      {
        label: 'Files handed in for cases',
        value: `${files}`,
        source: 'Documents and presentations you prepared for the cases you submitted.',
      },
    ],
  }
}

function handoffSection(cases: Handled[]): RecordSection {
  const workflows = ofKind(cases, 'workflow')
  const submitted = workflows.filter((c) => c.progress.status === 'submitted')
  let made = 0
  let right = 0
  for (const { def, progress } of submitted) {
    for (const step of def.steps) {
      if (step.kind !== 'handoff') continue
      const result = progress.result?.steps.find((s) => s.id === step.id)
      if (!result) continue
      made++
      if (result.earned === result.points) right++
    }
  }
  const followUps = workflows.filter((c) => c.def.trigger.onlyIf).length
  return {
    id: 'handoffs',
    title: 'Work with other departments',
    stats: [
      {
        label: 'Hand-offs made',
        value: `${made}`,
        source: 'Hand-offs to other departments in the workflow cases you submitted.',
      },
      {
        label: 'Right first time',
        value: `${right} of ${made}`,
        source:
          'Hand-offs with every field correct, so the other department could go ahead.',
      },
      {
        label: 'Follow-ups needed',
        value: `${followUps}`,
        source: 'Times another department came back because a hand-off was not right.',
      },
    ],
  }
}

function leadershipSection(profile: ProfileData, cases: Handled[]): RecordSection {
  const led = ofKind(cases, 'leadership').filter((c) => c.progress.status === 'submitted')
  const assign = stepPoints(led, 'assign')
  const reviews = stepPoints(led, 'review')
  const decisions = stepPoints(led, 'decide')
  let assigned = 0
  for (const { def, progress } of led)
    for (const step of def.steps)
      if (step.kind === 'assign')
        assigned += Object.keys(
          answerFor('assign', progress.answers[step.id]) ?? {},
        ).length
  const leadsFrom = Math.min(
    ...CASES.filter(
      (c) => c.kind === 'leadership' && c.careerId === profile.careerId,
    ).map((c) => c.minLevel),
  )
  const leader = getCareer(profile.careerId).levels[leadsFrom - 1]
  return {
    id: 'leadership',
    title: 'Leadership',
    stats:
      led.length === 0
        ? [
            {
              label: 'Teams led',
              value: '0',
              source: leader
                ? `Leading a team starts at ${leader.title}.`
                : 'Leadership cases come at the senior levels.',
            },
          ]
        : [
            {
              label: 'Teams led',
              value: `${led.length}`,
              source: 'Leadership cases you submitted.',
            },
            {
              label: 'Work delegated',
              value: `${assigned} pieces, ${percent(assign.earned, assign.points)} well matched`,
              source:
                'Work you shared out, and the marks earned for matching it to people’s strengths and capacity.',
            },
            {
              label: 'Team work reviewed',
              value: percent(reviews.earned, reviews.points),
              source: 'The marks earned for spotting the problems in your team’s work.',
            },
            {
              label: 'Leadership decisions',
              value: percent(decisions.earned, decisions.points),
              source:
                'The marks earned on the decisions in your leadership cases (disagreements, priorities).',
            },
          ],
  }
}

function relationshipSection(profile: ProfileData): RecordSection {
  const people = Object.values(profile.work.relationships)
  const strong = people.filter((r) => r.trust >= 65).length
  const trust = average(people.map((r) => r.trust))
  return {
    id: 'relationships',
    title: 'Relationships',
    stats: [
      {
        label: 'Colleagues you know',
        value: `${people.length}`,
        source: `People you have worked with. ${strong} trust you (trust 65 or more).`,
      },
      {
        label: 'Average trust',
        value: trust === null ? '–' : `${trust} (${trustReading(trust).label})`,
        source: 'The average of each colleague’s trust in you, out of 100.',
      },
      {
        label: 'Professional reputation',
        value: `${profile.work.reputation}`,
        source:
          'How the wider office sees your professionalism, out of 100 (you started at 50).',
      },
    ],
  }
}

/** Integrated projects whose every stage has been passed. */
export function projectsCompleted(profile: ProfileData) {
  return PROJECTS.filter(
    (project) =>
      project.careerId === profile.careerId &&
      project.stages.every((id) => {
        if (project.stageType === 'cases') {
          const progress = profile.work.cases[id]
          return progress?.status === 'submitted' && progress.result?.rating !== 'fail'
        }
        const assignment = careerAssignments(profile.careerId).find((a) => a.id === id)
        return !!assignment && isPassed(assignment, profile.assignments[id])
      }),
  )
}

function progressionSection(profile: ProfileData): RecordSection {
  const { career, current } = careerLevel(profile)
  const all = careerAssignments(profile.careerId)
  const passed = all.filter((a) => isPassed(a, profile.assignments[a.id]))
  const score = average(passed.map((a) => bestScore(profile.assignments[a.id]) ?? 0))
  const latest = profile.work.reviews.at(-1)
  const projects = projectsCompleted(profile)
  return {
    id: 'progression',
    title: 'Career progression',
    stats: [
      {
        label: 'Level',
        value: `${current.title} (${levelNumber(profile)} of ${career.levels.length})`,
        source: `Promotions so far: ${profile.work.record.promotions.length}.`,
      },
      {
        label: 'Tasks passed',
        value: `${passed.length} of ${all.length}`,
        source: `The tasks of this career you have passed, with ${profile.xp} XP earned in all.`,
      },
      {
        label: 'Average task score',
        value: score === null ? '–' : `${score}%`,
        source: 'The average of your best score on each task you passed.',
      },
      {
        label: 'Integrated projects completed',
        value: `${projects.length}`,
        source:
          projects.length > 0
            ? projects.map((p) => p.title).join('; ')
            : 'Projects of several stages, counted once every stage has passed.',
      },
      {
        label: 'Latest weekly review',
        value: latest ? latest.rating[0].toUpperCase() + latest.rating.slice(1) : '–',
        source: `${profile.work.reviews.length} weekly reviews so far, at Friday’s one-to-one.`,
      },
    ],
  }
}

/** The player's work level by level, so they can see how it developed. */
function levelPeriods(profile: ProfileData, cases: Handled[]): LevelPeriod[] {
  const { career, current } = careerLevel(profile)
  const held = career.levels.slice(
    0,
    career.levels.findIndex((l) => l.id === current.id) + 1,
  )
  const promotions = profile.work.record.promotions
  const startOf = (levelId: string) => promotions.find((p) => p.levelId === levelId)
  // A period runs from one promotion to the next (real time, as tasks and cases record it).
  const bounds = held.map((level, i) => ({
    level,
    from: i === 0 ? 0 : (startOf(level.id)?.at ?? null),
    fromDay: i === 0 ? 1 : (startOf(level.id)?.day ?? null),
  }))
  const known = bounds.filter((b) => b.from !== null) as Array<
    (typeof bounds)[number] & { from: number }
  >
  const periodOf = (time: number) =>
    [...known].reverse().find((b) => time >= b.from)?.level.id ?? null

  const tasks = careerAssignments(profile.careerId).flatMap((a) => {
    const progress = profile.assignments[a.id]
    if (!isPassed(a, progress)) return []
    const pass = progress!.attempts.find((t) => t.score >= a.passScore)
    return pass ? [{ at: pass.submittedAt, score: bestScore(progress) ?? 0 }] : []
  })
  const results = cases.flatMap((c) =>
    c.progress.result
      ? [{ at: c.progress.result.submittedAt, score: c.progress.result.score }]
      : [],
  )

  return bounds.map(({ level, fromDay }) => {
    const mine = <T extends { at: number }>(list: T[]) =>
      list.filter((x) => periodOf(x.at) === level.id)
    const t = mine(tasks)
    const c = mine(results)
    return {
      levelId: level.id,
      title: level.title,
      fromDay,
      tasksPassed: t.length,
      averageTaskScore: average(t.map((x) => x.score)),
      casesSubmitted: c.length,
      averageCaseScore: average(c.map((x) => x.score)),
    }
  })
}

export function careerRecord(profile: ProfileData): CareerRecord {
  const cases = handledCases(profile)
  const { satisfaction } = profile.work.org.indicators
  const customers = ofKind(cases, 'client', 'internal')
  return {
    sections: [
      {
        id: 'customers',
        title: 'Clients and customers',
        stats: [
          ...caseSummary(customers, 'Customer cases'),
          {
            label: 'Client satisfaction',
            value: `${satisfaction}`,
            source: `The company indicator, out of 100. It started at ${STARTING_INDICATORS.satisfaction} and moves with how customers are treated in your cases.`,
          },
        ],
      },
      budgetSection(profile, cases),
      {
        id: 'incidents',
        title: 'Workplace incidents',
        stats: caseSummary(ofKind(cases, 'incident'), 'Incidents'),
      },
      meetingSection(profile, cases),
      handoffSection(cases),
      leadershipSection(profile, cases),
      relationshipSection(profile),
      progressionSection(profile),
    ],
    periods: levelPeriods(profile, cases),
  }
}
