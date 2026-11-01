/**
 * What people and things in the office say, based on the player's progress.
 * Pure functions, so the office always reflects the real state of the career.
 */
import { getCase } from '../content/cases'
import { activeDepartment, fill } from '../content/departments'
import { PROGRAMME } from '../content/programme'
import { minutesLeft, openCases } from './cases'
import { formatDuration } from './clock'
import { programmeBoard, programmeStartDay } from './programme'
import type { InteractionId } from '../content/office'
import type { Assignment } from '../content/schemas'
import type { Choice, EffectNote } from './scenes'
import {
  assignmentStatus,
  bestScore,
  careerAssignments,
  careerLevel,
  firstName,
  promotionProgress,
  unreadCount,
  type AssignmentStatus,
  type ProfileData,
} from './career'

export interface DialogueAction {
  label: string
  /** Opens the computer at this app (and task). */
  open: {
    app: 'mail' | 'tasks' | 'sheets' | 'career' | 'cases'
    assignmentId?: string
    /** In Cases: the case to open. */
    item?: string
  }
}

export interface Dialogue {
  /**
   * Set for scenes whose outcome is remembered (conversations with choices,
   * meetings, events).
   */
  id?: string
  /** A person ID from the company content, or null for objects. */
  speaker: string | null
  title: string
  lines: string[]
  actions: DialogueAction[]
  /** Ways the player can respond. */
  choices?: Choice[]
  /** After a choice: what changed, and why it matters. */
  notes?: EffectNote[]
  lesson?: string
}

/** The task the player should be working on now, if any. */
export function currentTask(
  profile: ProfileData,
): { assignment: Assignment; status: AssignmentStatus } | null {
  for (const assignment of careerAssignments(profile.careerId)) {
    const status = assignmentStatus(profile, assignment)
    if (status !== 'completed' && status !== 'locked') return { assignment, status }
  }
  return null
}

function managerDialogue(profile: ProfileData): Dialogue {
  const name = firstName(profile.name)
  const task = currentTask(profile)
  const promotion = promotionProgress(profile)
  const { current, career } = careerLevel(profile)
  const base = { speaker: 'manager', title: '{managerFull}' }

  if (!task) {
    if (current.id !== 'intern') {
      return {
        ...base,
        lines: [
          `${name}! Congratulations again: ${current.title}. You earned it.`,
          'I’m putting together your next set of responsibilities. In the meantime, the practice workbook is a good place to sharpen your skills.',
        ],
        actions: [{ label: 'View my career', open: { app: 'career' } }],
      }
    }
    return {
      ...base,
      lines: [
        `You’ve finished every task I had for you, ${name}. Well done.`,
        promotion.xpNeeded > 0
          ? `To be considered for promotion you need ${promotion.xpNeeded} more XP. Improving your scores on earlier tasks counts.`
          : 'Your promotion is being processed.',
      ],
      actions: [{ label: 'Open Tasks', open: { app: 'tasks' } }],
    }
  }

  const { assignment, status } = task
  const open = {
    label: 'Open the task',
    open: { app: 'tasks' as const, assignmentId: assignment.id },
  }
  if (status === 'available') {
    const firstOfLevel =
      current.id !== career.levels[0].id &&
      careerAssignments(profile.careerId)
        .filter((a) => a.levelId === current.id)
        .every((a) => !profile.assignments[a.id])
    return {
      ...base,
      lines: [
        firstOfLevel
          ? `Congratulations again on the promotion, ${name}! Your first task as ${current.title} is in your inbox: “${assignment.title}”.`
          : `Hi ${name}! I’ve emailed you a new task: “${assignment.title}”.`,
        `It should take about ${assignment.estimatedMinutes} minutes. Everything you need is in the task, and the steps will guide you.`,
      ],
      actions: [open],
    }
  }
  if (status === 'in-progress') {
    return {
      ...base,
      lines: [
        `How is “${assignment.title}” going?`,
        'If you get stuck, open the task pane next to the workbook: every step has a hint. And submit whenever you’re ready; you can always improve it afterwards.',
      ],
      actions: [{ ...open, label: 'Continue the task' }],
    }
  }
  const best = bestScore(profile.assignments[assignment.id])
  return {
    ...base,
    lines: [
      `I’ve looked at your “${assignment.title}” (${best ?? 0}%). You’re on the right track.`,
      `I need ${assignment.passScore}% before I can use it. My notes are in the feedback; fix those points and send it again.`,
    ],
    actions: [{ ...open, label: 'See the feedback' }],
  }
}

function receptionDialogue(profile: ProfileData): Dialogue {
  const name = firstName(profile.name)
  const started = Object.keys(profile.assignments).length > 0
  const unread = unreadCount(profile)
  return {
    speaker: 'reception',
    title: 'Nina Patel',
    lines: started
      ? [
          `Hi ${name}! Busy day?`,
          unread > 0
            ? `You have ${unread} unread email${unread === 1 ? '' : 's'}. Your computer is at your desk in the open-plan area.`
            : 'If you need anything (a new keyboard, a meeting room, a good lunch spot) just ask.',
        ]
      : [
          `Good morning, and welcome to Cobalt Ridge, ${name}! I’m Nina.`,
          'Your desk is in the open-plan area, just through there: the one with your name on it. {manager}’s office is at the back on the right, and the break room is on the left.',
          '{manager} has already sent you your first task. You’ll find it on your computer.',
        ],
    actions: [],
  }
}

function colleagueDialogue(tipIndex: number): Dialogue {
  const tips = activeDepartment().tips
  const tip = tips[((tipIndex % tips.length) + tips.length) % tips.length]
  return {
    speaker: 'facilities',
    title: 'Tom Becker',
    lines: [
      'Oh hey! Grabbing a coffee too?',
      `Here’s a tip I wish someone had told me: ${tip}`,
    ],
    actions: [],
  }
}

function whiteboardDialogue(profile: ProfileData): Dialogue {
  const { current } = careerLevel(profile)
  const lines = careerAssignments(profile.careerId)
    .filter((assignment) => assignment.levelId === current.id)
    .map((assignment) => {
      const status = assignmentStatus(profile, assignment)
      const best = bestScore(profile.assignments[assignment.id])
      const mark =
        status === 'completed'
          ? `✓ done (${best}%)`
          : status === 'locked'
            ? 'coming up'
            : status === 'needs-revision'
              ? `needs another look (${best}%)`
              : status === 'in-progress'
                ? 'in progress'
                : 'new'
      return `${assignment.title}: ${mark}`
    })
  const cases = openCases(profile).flatMap((progress) => {
    const def = getCase(progress.caseId)
    if (!def) return []
    const left = minutesLeft(profile.work, progress)
    return [
      `Case: ${def.title}: ${left > 0 ? `due in ${formatDuration(left)}` : 'overdue'}`,
    ]
  })
  return {
    speaker: null,
    title: `This week: ${firstName(profile.name)}`,
    lines: [...lines, ...cases],
    actions: [
      { label: 'Open Tasks', open: { app: 'tasks' } },
      ...(cases.length > 0
        ? [{ label: 'Open Cases', open: { app: 'cases' as const } }]
        : []),
    ],
  }
}

function noticeboardDialogue(profile: ProfileData): Dialogue {
  const { current } = careerLevel(profile)
  return {
    speaker: null,
    title: 'Team notice board',
    lines: [
      ...activeDepartment().news,
      `Welcome to the team: ${profile.name}, ${current.title}.`,
      ...companyNews(profile),
    ],
    actions: [],
  }
}

/** What the company-wide notices say: its indicators, and the programme if it has started. */
function companyNews(profile: ProfileData): string[] {
  const { indicators } = profile.work.org
  const news = [
    `Company dashboard: client satisfaction ${indicators.satisfaction}, risk ${indicators.risk}, discipline ${indicators.discipline} (out of 100).`,
  ]
  if (programmeStartDay(profile) !== null) {
    const board = programmeBoard(profile)
    const done = board.filter((row) => row.status === 'done').length
    news.push(`${PROGRAMME.title}: ${done} of ${board.length} workstreams done.`)
  }
  return news
}

/** A dialogue with role names filled in ({manager} → "Priya"). */
export function fillDialogue(dialogue: Dialogue): Dialogue {
  return {
    ...dialogue,
    title: fill(dialogue.title),
    lines: dialogue.lines.map((line) => fill(line)),
    actions: dialogue.actions.map((a) => ({ ...a, label: fill(a.label) })),
    ...(dialogue.choices
      ? {
          choices: dialogue.choices.map((choice) => ({
            ...choice,
            label: fill(choice.label),
            reply: choice.reply.map((line) => fill(line)),
            ...(choice.lesson ? { lesson: fill(choice.lesson) } : {}),
            ...(choice.effects.log
              ? {
                  effects: {
                    ...choice.effects,
                    log: { ...choice.effects.log, text: fill(choice.effects.log.text) },
                  },
                }
              : {}),
          })),
        }
      : {}),
    ...(dialogue.lesson ? { lesson: fill(dialogue.lesson) } : {}),
  }
}

export function dialogueFor(
  interaction: Exclude<
    InteractionId,
    'computer' | 'coffee' | 'lunch' | 'home' | 'senior' | 'arrange'
  >,
  profile: ProfileData,
  tipIndex = 0,
): Dialogue {
  return fillDialogue(rawDialogue(interaction, profile, tipIndex))
}

function rawDialogue(
  interaction: Exclude<
    InteractionId,
    'computer' | 'coffee' | 'lunch' | 'home' | 'senior' | 'arrange'
  >,
  profile: ProfileData,
  tipIndex: number,
): Dialogue {
  switch (interaction) {
    case 'manager':
      return managerDialogue(profile)
    case 'receptionist':
      return receptionDialogue(profile)
    case 'colleague':
      return colleagueDialogue(tipIndex)
    case 'whiteboard':
      return whiteboardDialogue(profile)
    case 'noticeboard':
      return noticeboardDialogue(profile)
  }
}

export const COFFEE_DIALOGUE: Dialogue = {
  speaker: null,
  title: 'Coffee machine',
  lines: [
    'The machine hums, and a minute later you have a fresh coffee. ☕',
    'Short breaks help you stay focused. Most people do their best work in blocks of 25 to 50 minutes with a few minutes away from the screen in between.',
  ],
  actions: [],
}
