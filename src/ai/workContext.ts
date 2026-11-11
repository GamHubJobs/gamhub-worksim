/**
 * What WorkSim AI knows about the player's work: their role, the app they
 * are using, and what they have open in it (the selected email, the task, the
 * case). Built from the view of the window they were last working in, and
 * only from what is relevant to it: never the whole save.
 *
 * Apps can add more (the selected cells, a document's text) through the
 * context hub (see useAiContext in src/apps/ai/hub.ts).
 */
import { getAssignment } from '../content/assignments'
import { getCase } from '../content/cases'
import { activeDepartment, fill, getPerson } from '../content/departments'
import {
  assignmentStatus,
  careerAssignments,
  careerLevel,
  isPassed,
  type ProfileData,
} from '../game/career'
import type { View } from '../persistence/lastView'
import type { ContextItem } from './types'

const APP_NAMES: Partial<Record<View['app'], string>> = {
  mail: 'Mail',
  tasks: 'Tasks',
  cases: 'Cases',
  sheets: 'Grid Craft',
  docs: 'Docs',
  slides: 'Slides',
  helpdesk: 'Help Desk',
  code: 'Code',
  tool: 'a professional tool',
  career: 'Career',
  readiness: 'Readiness',
  portfolio: 'Portfolio',
}

export function roleItem(profile: ProfileData): ContextItem {
  const { career, current } = careerLevel(profile)
  const department = activeDepartment()
  return {
    kind: 'career',
    label: 'Your role',
    text: `${current.title} in ${department.name} (${career.name} career) at a consulting firm.`,
  }
}

export function assignmentItem(
  profile: ProfileData,
  assignmentId: string,
): ContextItem | null {
  const assignment = getAssignment(assignmentId)
  if (!assignment) return null
  const progress = profile.assignments[assignmentId]
  const done = progress
    ? assignment.steps.filter((s) => progress.completedSteps.includes(s.id)).length
    : 0
  const steps = assignment.steps.map((s) => fill(s.title))
  return {
    kind: 'assignment',
    label: `Task: ${fill(assignment.title)}`,
    text: [
      fill(assignment.briefing.body),
      `Objectives:\n${assignment.objectives.map((o) => `- ${fill(o)}`).join('\n')}`,
      `Steps (${done} of ${steps.length} ticked off):\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    ].join('\n\n'),
    data: {
      steps,
      hints: assignment.steps.map((s) => (s.hint ? fill(s.hint) : '')),
      done,
    },
  }
}

/**
 * The task the player is most likely working on: the newest one started and
 * not passed, or else the next one waiting to be started.
 */
export function currentAssignmentId(profile: ProfileData): string | null {
  const open = Object.values(profile.assignments)
    .filter((p) => {
      const assignment = getAssignment(p.assignmentId)
      return assignment && !isPassed(assignment, p)
    })
    .sort((a, b) => b.startedAt - a.startedAt)
  if (open[0]) return open[0].assignmentId
  const next = careerAssignments(profile.careerId).find((a) => {
    const status = assignmentStatus(profile, a)
    return status === 'available' || status === 'needs-revision'
  })
  return next?.id ?? null
}

export function emailItem(profile: ProfileData, mailId: string): ContextItem | null {
  const message = profile.inbox.find((m) => m.id === mailId)
  if (!message) return null
  const sender = message.kind === 'sent' ? null : getPerson(message.from)
  return {
    kind: 'email',
    label: `Email: ${fill(message.subject)}`,
    text: `${sender ? `From: ${sender.name} (${sender.role})\n` : ''}Subject: ${fill(message.subject)}\n\n${fill(message.body)}`,
  }
}

export function caseItem(caseId: string): ContextItem | null {
  const def = getCase(caseId)
  if (!def) return null
  return {
    kind: 'case',
    label: `Case: ${fill(def.title)}`,
    text: fill(def.summary),
  }
}

/**
 * The context offered for a question, most relevant first: what is open in
 * the window the player was working in, then their current task, then their
 * role.
 */
export function workContext(profile: ProfileData, view: View | null): ContextItem[] {
  const items: ContextItem[] = []
  if (view) {
    if (view.app === 'mail' && view.mailId) {
      const email = emailItem(profile, view.mailId)
      if (email) items.push(email)
    }
    if (view.app === 'tasks' && view.assignmentId) {
      const task = assignmentItem(profile, view.assignmentId)
      if (task) items.push(task)
    }
    if (view.app === 'cases' && view.item) {
      const found = caseItem(view.item)
      if (found) items.push(found)
    }
  }
  if (!items.some((i) => i.kind === 'assignment')) {
    const id = currentAssignmentId(profile)
    const task = id ? assignmentItem(profile, id) : null
    if (task) items.push(task)
  }
  const app = view ? APP_NAMES[view.app] : undefined
  if (app)
    items.push({
      kind: 'app',
      label: 'Open app',
      text: `The employee is working in ${app}.`,
    })
  items.push(roleItem(profile))
  return items
}
