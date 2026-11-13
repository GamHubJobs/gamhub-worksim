/**
 * The next meaningful action, from the real state of the game: where the
 * player is (walking the office, or at the computer), the app in front, the
 * meeting that is on, a colleague who wants a word, hands-on IT work waiting
 * in the office, unread mail, and the task in hand with its next step.
 *
 * It never suggests something that cannot be done now: each rule checks the
 * state that makes it possible. Beginners (few tasks passed) get the detail
 * and the keys; experienced players get the short version, with the detail
 * on request. Pure, so it can be tested.
 */
import { fill, getPerson } from '../content/departments'
import { getSpot } from '../content/office'
import type { Assignment } from '../content/schemas'
import {
  assignmentStatus,
  careerAssignments,
  isPassed,
  unreadCount,
  type ProfileData,
} from './career'
import { pendingEvents } from './events'
import { openMeeting, openTasks } from './workday'

export interface NextStep {
  /** The one thing to do next. */
  text: string
  /** How, in more detail (shown to beginners, or on request). */
  detail?: string
  /** Keys that do it. */
  keys?: string[]
  /** Something worth doing, not essential. */
  optional?: string
}

export interface StepContext {
  place: 'office' | 'computer'
  /** The app in front at the computer (its window key), if any. */
  app: string | null
}

/** Beginners: fewer than three tasks passed. */
export function isBeginner(profile: ProfileData): boolean {
  return (
    careerAssignments(profile.careerId).filter((a) =>
      isPassed(a, profile.assignments[a.id]),
    ).length < 3
  )
}

const APP_FOR_KIND: Record<string, string> = {
  tickets: 'Help Desk',
  code: 'Code',
  tool: 'its tool',
}

/** Where a task's work is done. */
function workApp(a: Assignment): string {
  return a.kind && APP_FOR_KIND[a.kind] ? APP_FOR_KIND[a.kind] : 'Grid Craft'
}

/** The task in hand: started and not yet passed (the oldest first), or the next one available. */
function taskInHand(profile: ProfileData): { task: Assignment; started: boolean } | null {
  const open = openTasks(profile)
  const started = open
    .filter((a) => assignmentStatus(profile, a) !== 'available')
    .sort(
      (a, b) =>
        (profile.assignments[a.id]?.startedAt ?? 0) -
        (profile.assignments[b.id]?.startedAt ?? 0),
    )[0]
  if (started) return { task: started, started: true }
  const available = open.find((a) => assignmentStatus(profile, a) === 'available')
  return available ? { task: available, started: false } : null
}

export function nextStep(profile: ProfileData, context: StepContext): NextStep {
  const work = profile.work
  const meeting = openMeeting(work)
  const event = pendingEvents(profile)[0]
  const jobs = work.fieldJobs
  const unread = unreadCount(profile)
  const hand = taskInHand(profile)

  if (context.place === 'office') {
    if (meeting)
      return {
        text: fill(`Join the ${meeting.title.toLowerCase()}: it is on now`),
        detail: `Use the Join button in the panel on the left; you walk to ${fill(getSpot(meeting.spot).name.toLowerCase())} and take your place.`,
      }
    if (event)
      return {
        text: `${getPerson(event.person).name.split(' ')[0]} wants a word`,
        detail: 'Use Talk in the panel on the left, or walk up to them and press E.',
        keys: ['E'],
      }
    if (jobs.length) {
      const job = jobs[0]
      const where =
        job.kind === 'cabinet'
          ? 'the comms cabinet (the IT corner, right-hand side)'
          : job.kind === 'repair' || job.kind === 'build'
            ? 'the IT workbench (the IT corner, right-hand side)'
            : `${getPerson(job.target.slice('person:'.length)).name.split(' ')[0]}’s desk`
      return {
        text: `${job.label}`,
        detail: `Walk to ${where} with W, A, S and D (or Go in the IT jobs list), then press E there. The amber marker shows where.`,
        keys: ['W', 'A', 'S', 'D', 'E'],
      }
    }
    if (unread > 0)
      return {
        text: `Go to your desk and use your computer: ${unread} unread message${unread === 1 ? '' : 's'}`,
        detail:
          'Walk to your desk (or choose Your desk in Places), then press E at the computer.',
        keys: ['E'],
      }
    if (hand)
      return {
        text: hand.started
          ? `Continue “${hand.task.title}” at your computer`
          : `Start “${hand.task.title}” at your computer`,
        detail: 'Walk to your desk and press E at the computer, then open Tasks.',
        keys: ['E'],
      }
    return {
      text: 'All your work is done for now',
      detail: 'Talk to colleagues, or take a break. New work arrives by mail.',
    }
  }

  // At the computer.
  if (jobs.length && context.app !== 'helpdesk')
    return {
      text: 'Hands-on work is waiting in the office',
      detail: `${jobs[0].label}. Use Leave desk on the taskbar, then walk there and press E.`,
    }
  if (unread > 0 && context.app !== 'mail')
    return {
      text: `Open Mail: ${unread} unread message${unread === 1 ? '' : 's'}`,
      detail: 'Mail is on the taskbar. Your tasks and their briefings arrive there.',
    }
  if (!hand)
    return {
      text: 'All your work is done for now',
      detail: 'Check Career for your next promotion, or Readiness for the assessments.',
      optional: 'Take a guided tour from the Start menu or Help if you want a refresher.',
    }
  const { task, started } = hand
  if (!started)
    return {
      text: `Open Tasks and start “${task.title}”`,
      detail: `Tasks is on the taskbar. Read the brief, then Start task opens it in ${workApp(task)}.`,
    }
  const progress = profile.assignments[task.id]
  const step = task.steps.find((s) => !progress?.completedSteps.includes(s.id))
  if (!step)
    return {
      text: `Review your work, then submit “${task.title}”`,
      detail: `Every step is ticked. Check it once more, then use Submit in the task pane (${fill('{manager}')} grades it straight away).`,
    }
  return {
    text: `${task.title}: ${step.title}`,
    detail: fill(step.instructions.replace(/\*\*/g, '')),
  }
}
