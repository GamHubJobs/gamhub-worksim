/**
 * The IT operations competency framework: what an entry-level IT support and
 * operations professional must be able to do, and the evidence for each from
 * the player's own passed work. A competency is shown by specific checks of
 * specific tasks (not by opening a tool or reading about it); work done
 * without guidance hints counts as stronger evidence. Nothing is stored: it
 * is worked out from the career record each time.
 *
 * This shows what the player has demonstrated in GamHub WorkSim. It is not a
 * professional certification.
 */
import { getAssignment } from '../content/assignments'
import type { ProfileData } from './career'
import { bestScore, isPassed } from './career'

/** Evidence for a competency: a task, and (optionally) the checks in it that show it. */
interface Source {
  task: string
  checks?: string[]
}

export interface ItCompetencyDef {
  id: string
  name: string
  description: string
  sources: Source[]
}

export const IT_COMPETENCIES: ItCompetencyDef[] = [
  {
    id: 'ticket-management',
    name: 'Ticket management',
    description: 'Triage, categorise, prioritise and close tickets with a clear record.',
    sources: [
      { task: 'triage-queue' },
      { task: 'user-replies' },
      { task: 'full-day', checks: ['priorities'] },
    ],
  },
  {
    id: 'incident-management',
    name: 'Incident management',
    description: 'Handle incidents end to end, including those affecting many people.',
    sources: [
      { task: 'wifi-outage' },
      { task: 'recurring-problem' },
      { task: 'major-incident' },
      { task: 'company-outage' },
    ],
  },
  {
    id: 'network-troubleshooting',
    name: 'Network troubleshooting',
    description:
      'Diagnose connectivity, DNS and service faults with evidence, and fix them at the source.',
    sources: [
      { task: 'network-printing' },
      { task: 'wifi-outage', checks: ['finding-ap', 'evidence'] },
      { task: 'network-intranet' },
      { task: 'company-outage', checks: ['finding-file', 'finding-dev', 'finding-dns'] },
    ],
  },
  {
    id: 'directory-administration',
    name: 'Directory administration',
    description: 'Manage accounts, groups and devices for joiners, movers and leavers.',
    sources: [{ task: 'directory-joiner' }, { task: 'directory-leaver' }],
  },
  {
    id: 'identity-verification',
    name: 'Identity verification',
    description: 'Verify who is asking against the records before any account change.',
    sources: [
      {
        task: 'account-unlock',
        checks: ['leila-verified', 'carmen-verified', 'owen-not-verified'],
      },
      { task: 'service-desk-comms', checks: ['call-arjun'] },
    ],
  },
  {
    id: 'access-management',
    name: 'Access management',
    description:
      'Grant only what is authorised: least privilege and approval from the right person.',
    sources: [
      { task: 'directory-leaver' },
      { task: 'account-unlock', checks: ['carmen-verified', 'policy'] },
    ],
  },
  {
    id: 'remote-support',
    name: 'Remote support',
    description:
      'Fix a user’s computer remotely with its own tools, and disconnect when done.',
    sources: [
      { task: 'device-support' },
      { task: 'service-desk-comms', checks: ['ben-fixed'] },
      { task: 'full-day', checks: ['disconnected'] },
    ],
  },
  {
    id: 'device-management',
    name: 'Device management',
    description:
      'Keep the company’s devices healthy: apps, services, updates, storage, settings.',
    sources: [{ task: 'device-support' }, { task: 'full-day' }],
  },
  {
    id: 'professional-communication',
    name: 'Professional communication',
    description:
      'Listen, explain in plain words, keep people informed, and handle frustration.',
    sources: [
      { task: 'user-replies' },
      {
        task: 'service-desk-comms',
        checks: ['call-ben', 'call-arjun', 'finance-update'],
      },
    ],
  },
  {
    id: 'security-investigation',
    name: 'Security investigation',
    description: 'Investigate sign-ins, emails, mailboxes and endpoints for evidence.',
    sources: [{ task: 'security-incident', checks: ['closed', 'accurate'] }],
  },
  {
    id: 'incident-response',
    name: 'Incident response',
    description:
      'Contain, eradicate and recover from a security incident without collateral harm.',
    sources: [
      { task: 'security-incident', checks: ['closed', 'accurate'] },
      { task: 'major-incident' },
    ],
  },
  {
    id: 'knowledge-documentation',
    name: 'Knowledge and documentation',
    description: 'Write clear updates, incident reports and records others can rely on.',
    sources: [
      { task: 'security-incident', checks: ['report'] },
      { task: 'company-outage', checks: ['carmen-reply', 'sofia-reply'] },
      { task: 'device-support', checks: ['grace-reply', 'ben-reply'] },
    ],
  },
  {
    id: 'sla-management',
    name: 'SLA management',
    description: 'Prioritise by business impact and meet the agreed service levels.',
    sources: [
      { task: 'full-day', checks: ['sla', 'priorities'] },
      { task: 'company-outage', checks: ['priorities'] },
    ],
  },
  {
    id: 'service-reporting',
    name: 'IT service reporting',
    description:
      'Understand and explain how the service is performing, from its records.',
    sources: [{ task: 'full-day', checks: ['sla'] }, { task: 'recurring-problem' }],
  },
]

export type ItCompetencyLevel = 'not-yet' | 'demonstrated' | 'practised' | 'proficient'

export const IT_LEVEL_NAMES: Record<ItCompetencyLevel, string> = {
  'not-yet': 'Not yet shown',
  demonstrated: 'Demonstrated',
  practised: 'Practised',
  proficient: 'Proficient',
}

export interface ItEvidence {
  task: string
  title: string
  score: number
  /** No guidance hints were used on the attempt. */
  independent: boolean
}

export interface ItCompetency {
  def: ItCompetencyDef
  level: ItCompetencyLevel
  evidence: ItEvidence[]
  /** Why this level, in words. */
  reason: string
}

/** The latest attempt's check, by ID. */
function checkPassed(profile: ProfileData, task: string, check: string): boolean {
  const attempts = profile.assignments[task]?.attempts ?? []
  return attempts.some((a) =>
    a.checks.some((c) => c.id === check && c.status === 'passed'),
  )
}

/**
 * Each competency's level, from passed tasks whose relevant checks passed:
 * one piece of evidence demonstrates it, two practise it, and two or more
 * with at least one done without hints make it proficient.
 */
export function itCompetencies(profile: ProfileData): ItCompetency[] {
  return IT_COMPETENCIES.map((def) => {
    const evidence: ItEvidence[] = def.sources.flatMap((source) => {
      const assignment = getAssignment(source.task)
      const progress = profile.assignments[source.task]
      if (!assignment || !progress || !isPassed(assignment, progress)) return []
      if (
        source.checks &&
        !source.checks.every((c) => checkPassed(profile, source.task, c))
      )
        return []
      const best = progress.attempts.reduce((a, b) => (b.score > a.score ? b : a))
      return [
        {
          task: source.task,
          title: assignment.title,
          score: bestScore(progress) ?? 0,
          independent: best.hintsUsed === undefined || best.hintsUsed === 0,
        },
      ]
    })
    const independent = evidence.filter((e) => e.independent).length
    const level: ItCompetencyLevel =
      evidence.length === 0
        ? 'not-yet'
        : evidence.length >= 2 && independent >= 1
          ? 'proficient'
          : evidence.length >= 2
            ? 'practised'
            : 'demonstrated'
    const reason =
      level === 'not-yet'
        ? `Shown by: ${def.sources.map((s) => getAssignment(s.task)?.title ?? s.task).join('; ')}.`
        : level === 'proficient'
          ? `Shown in ${evidence.length} passed tasks, ${independent} without hints.`
          : level === 'practised'
            ? `Shown in ${evidence.length} passed tasks; for Proficient, one of them without hints.`
            : 'Shown in one passed task; for Practised, one more.'
    return { def, level, evidence, reason }
  })
}

/**
 * The IT career's completion: every IT task passed and the final readiness
 * assessment passed. A record of what was demonstrated in WorkSim, not a
 * certification or a promise of employment.
 */
export function itCareerComplete(
  profile: ProfileData,
  tasks: string[],
  finalAssessmentPassed: boolean,
): { complete: boolean; passed: number; total: number } {
  const passed = tasks.filter((id) => {
    const a = getAssignment(id)
    return a && isPassed(a, profile.assignments[id])
  }).length
  return {
    complete: passed === tasks.length && finalAssessmentPassed,
    passed,
    total: tasks.length,
  }
}
