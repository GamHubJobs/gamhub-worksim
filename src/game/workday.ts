/**
 * The working day: the office clock, meetings, lunch, breaks, deadlines and
 * going home. Pure functions: each takes a profile and returns a new one.
 *
 * Time only moves when the player does something: office actions take a
 * fixed time (a coffee is 10 minutes), and work at the computer is timed by
 * the computer clock (see `COMPUTER_SPEED`). Nothing happens while the player
 * is away, so the simulation is never unfair to someone who steps out.
 */
import { getAssignment } from '../content/assignments'
import { fill } from '../content/departments'
import type { Assignment } from '../content/schemas'
import {
  DURATIONS,
  HOURS,
  LUNCH,
  MEETING_GRACE,
  MEETING_OPENS_BEFORE,
  MEETINGS,
  type Meeting,
} from '../content/workday'
import type { LogEntry, WorkState } from '../persistence/schemas'
import { freshToday } from '../persistence/workState'
import {
  assignmentStatus,
  careerAssignments,
  type ProfileData,
  type Reward,
} from './career'
import { absoluteTime, formatTime, isWorkday, nextWorkday, weekdayIndex } from './clock'
import { addDeadline, extendedDue, now } from './deadlines'
import type { GradeResult } from './grading'
import { changeReputation, changeTrust } from './relationships'
import { adjustWellbeing, overnight, wellbeingAfter } from './wellbeing'

/** Activities that take a stretch of time (one-off boosts like lunch are applied separately). */
export type TimedActivity = 'work' | 'meeting' | 'walk'

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function log(
  work: WorkState,
  text: string,
  tone: LogEntry['tone'] = 'neutral',
): WorkState {
  return {
    ...work,
    today: {
      ...work.today,
      log: [
        ...work.today.log,
        { minute: Math.floor(work.minute), text: fill(text), tone },
      ],
    },
  }
}

function withWork(profile: ProfileData, work: WorkState): ProfileData {
  return { ...profile, work }
}

export function hasOverdueWork(work: WorkState): boolean {
  return Object.values(work.deadlines).some(
    (deadline) => deadline.status === 'late' || deadline.due < now(work),
  )
}

/** Tasks the player has received but not yet passed. */
export function openTasks(profile: ProfileData): Assignment[] {
  return careerAssignments(profile.careerId).filter((assignment) => {
    const status = assignmentStatus(profile, assignment)
    return status !== 'completed' && status !== 'locked'
  })
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export type MeetingState = 'upcoming' | 'open' | 'attended' | 'late' | 'missed'

export function meetingsOn(day: number): Meeting[] {
  if (!isWorkday(day)) return []
  const weekday = weekdayIndex(day)
  return MEETINGS.filter((meeting) => (meeting.days as number[]).includes(weekday))
}

export function meetingState(work: WorkState, meeting: Meeting): MeetingState {
  const recorded = work.today.meetings[meeting.id]
  if (recorded) return recorded
  if (work.minute >= meeting.start + MEETING_GRACE) return 'missed'
  if (work.minute >= meeting.start - MEETING_OPENS_BEFORE) return 'open'
  return 'upcoming'
}

/** The meeting that can be joined right now, if any. */
export function openMeeting(work: WorkState): Meeting | null {
  if (work.dayOver) return null
  return (
    meetingsOn(work.day).find((meeting) => meetingState(work, meeting) === 'open') ?? null
  )
}

/** The next meeting today that has not happened yet. */
export function nextMeeting(work: WorkState): Meeting | null {
  return (
    meetingsOn(work.day).find((meeting) => {
      const state = meetingState(work, meeting)
      return state === 'upcoming' || state === 'open'
    }) ?? null
  )
}

/**
 * Joins a meeting that is open: time moves to its end. Joining after the
 * start counts as late.
 */
export function attendMeeting(profile: ProfileData, meetingId: string): ProfileData {
  const meeting = MEETINGS.find((m) => m.id === meetingId)
  if (!meeting || meetingState(profile.work, meeting) !== 'open') return profile
  const late = profile.work.minute > meeting.start + 2
  // Waiting for a meeting to start is not working time.
  let work: WorkState = {
    ...profile.work,
    minute: Math.max(profile.work.minute, meeting.start),
  }
  work = {
    ...work,
    today: {
      ...work.today,
      meetings: { ...work.today.meetings, [meeting.id]: late ? 'late' : 'attended' },
    },
  }
  work = late
    ? log(work, `Arrived late to the ${meeting.title.toLowerCase()}`, 'bad')
    : log(work, `Joined the ${meeting.title.toLowerCase()}`, 'good')
  if (late) work = changeReputation(work, -1)
  return passTime(withWork(profile, work), meeting.minutes, 'meeting')
}

// ---------------------------------------------------------------------------
// Time passing
// ---------------------------------------------------------------------------

/** Things that happen when a moment passes: missed meetings, lunch, deadlines. */
function crossBoundaries(profile: ProfileData, before: number): WorkState {
  let work = profile.work
  const after = work.minute

  for (const meeting of meetingsOn(work.day)) {
    const missedAt = meeting.start + MEETING_GRACE
    if (!work.today.meetings[meeting.id] && before < missedAt && after >= missedAt) {
      work = {
        ...work,
        today: {
          ...work.today,
          meetings: { ...work.today.meetings, [meeting.id]: 'missed' },
        },
      }
      work = log(work, `Missed the ${meeting.title.toLowerCase()}`, 'bad')
      work = changeTrust(work, meeting.host, -3)
      work = changeReputation(work, -2)
    }
  }

  if (!work.today.lunch && before < LUNCH.until && after >= LUNCH.until) {
    work = log(work, 'Skipped lunch', 'bad')
    work = {
      ...work,
      wellbeing: adjustWellbeing(work.wellbeing, { stress: 6, energy: -5 }),
    }
  }

  return checkDeadlines({ ...profile, work })
}

/** Marks deadlines that have just passed and applies their consequences. */
export function checkDeadlines(profile: ProfileData): WorkState {
  let work = profile.work
  const moment = now(work)
  for (const [assignmentId, deadline] of Object.entries(work.deadlines)) {
    if (deadline.status !== 'open' || deadline.due > moment) continue
    const assignment = getAssignment(assignmentId)
    work = {
      ...work,
      deadlines: { ...work.deadlines, [assignmentId]: { ...deadline, status: 'late' } },
    }
    work = log(work, `Missed the deadline for “${assignment?.title ?? 'a task'}”`, 'bad')
    work = changeTrust(work, assignment?.from ?? 'manager', -6)
    work = changeReputation(work, -4)
    work = { ...work, wellbeing: adjustWellbeing(work.wellbeing, { stress: 8 }) }
  }
  return work
}

/** Largest single step, so effects like "long stretch without a break" kick in on time. */
const STEP = 15

/**
 * Moves the office clock forward by `minutes` spent on `activity`, applying
 * wellbeing changes and anything that happens on the way. At closing time
 * the day ends.
 */
export function passTime(
  profile: ProfileData,
  minutes: number,
  activity: TimedActivity,
): ProfileData {
  if (profile.work.dayOver || minutes <= 0) return profile
  let current = profile
  let left = minutes
  while (left > 0 && !current.work.dayOver) {
    const step = Math.min(STEP, left, HOURS.closing - current.work.minute)
    if (step <= 0) break
    left -= step
    const work = current.work
    const before = work.minute
    const wellbeing = wellbeingAfter(work.wellbeing, activity, step, {
      sinceBreak: before - work.today.lastBreakAt,
      overtime: before >= HOURS.end,
      overdue: hasOverdueWork(work),
    })
    current = withWork(current, {
      ...work,
      minute: before + step,
      wellbeing,
      today: {
        ...work.today,
        workMinutes: work.today.workMinutes + (activity === 'work' ? step : 0),
      },
    })
    current = withWork(current, crossBoundaries(current, before))
  }
  if (current.work.minute >= HOURS.closing && !current.work.dayOver) {
    current = withWork(
      current,
      log(current.work, 'The office closed for the night: security sent you home', 'bad'),
    )
    current = endDay(current)
  }
  return current
}

// ---------------------------------------------------------------------------
// Office actions
// ---------------------------------------------------------------------------

export function walk(profile: ProfileData): ProfileData {
  return passTime(profile, DURATIONS.walk, 'walk')
}

function markBreak(work: WorkState): WorkState {
  return {
    ...work,
    today: { ...work.today, lastBreakAt: work.minute, breaks: work.today.breaks + 1 },
  }
}

/** A one-off boost (coffee, lunch, a chat), then the time it takes. */
export function restFor(
  profile: ProfileData,
  activity: 'coffee' | 'lunch' | 'chat',
  minutes: number,
): ProfileData {
  const work = profile.work
  // A break helps most when one is needed.
  const wellbeing = wellbeingAfter(work.wellbeing, activity, minutes, {
    sinceBreak: work.minute - work.today.lastBreakAt,
    overtime: false,
    overdue: false,
  })
  return passTime(withWork(profile, { ...work, wellbeing }), minutes, 'walk')
}

export function takeCoffeeBreak(profile: ProfileData): ProfileData {
  if (profile.work.dayOver) return profile
  const next = restFor(profile, 'coffee', DURATIONS.coffee)
  if (next.work.dayOver) return next
  return withWork(next, log(markBreak(next.work), 'Took a coffee break', 'good'))
}

export type LunchAvailability = 'too-early' | 'available' | 'taken' | 'too-late'

export function lunchAvailability(work: WorkState): LunchAvailability {
  if (work.today.lunch) return 'taken'
  if (work.minute < LUNCH.from) return 'too-early'
  if (work.minute >= LUNCH.until) return 'too-late'
  return 'available'
}

export function haveLunch(profile: ProfileData, company?: string): ProfileData {
  if (lunchAvailability(profile.work) !== 'available') return profile
  // Lunch counts as taken from the moment the player sits down.
  const seated = withWork(profile, {
    ...profile.work,
    today: { ...profile.work.today, lunch: true },
  })
  const next = restFor(seated, 'lunch', LUNCH.minutes)
  if (next.work.dayOver) return next
  return withWork(
    next,
    log(
      markBreak(next.work),
      company ? `Had lunch with ${company}` : 'Had lunch in the break room',
      'good',
    ),
  )
}

/** Asks for one more working day on a task, before its deadline. */
export function requestExtension(
  profile: ProfileData,
  assignmentId: string,
): ProfileData {
  const deadline = profile.work.deadlines[assignmentId]
  if (!deadline || deadline.status !== 'open' || deadline.extended) return profile
  if (deadline.due <= now(profile.work)) return profile
  const work: WorkState = {
    ...profile.work,
    deadlines: {
      ...profile.work.deadlines,
      [assignmentId]: { ...deadline, due: extendedDue(deadline.due), extended: true },
    },
  }
  return withWork(profile, log(work, 'Agreed a new deadline with {manager}', 'neutral'))
}

// ---------------------------------------------------------------------------
// Submitting work
// ---------------------------------------------------------------------------

/**
 * The workday side of a submission: deadlines, mood and the log. Call with
 * the profile returned by `recordSubmission`.
 */
export function afterSubmission(
  profile: ProfileData,
  assignment: Assignment,
  grade: GradeResult,
  reward: Reward,
): ProfileData {
  let work: WorkState = {
    ...profile.work,
    today: { ...profile.work.today, submissions: profile.work.today.submissions + 1 },
  }

  if (reward.firstPass) {
    const deadline = work.deadlines[assignment.id]
    if (deadline?.status === 'open') {
      work = {
        ...work,
        deadlines: {
          ...work.deadlines,
          [assignment.id]: { ...deadline, status: 'met' },
        },
      }
      work = changeReputation(work, 2)
      work = changeTrust(work, assignment.from, 2)
      work = log(
        work,
        `Delivered “${assignment.title}” on time (${grade.score}%)`,
        'good',
      )
    } else {
      work = log(work, `Delivered “${assignment.title}” (${grade.score}%)`, 'good')
    }
    work = {
      ...work,
      wellbeing: adjustWellbeing(work.wellbeing, {
        engagement: grade.rating === 'excellent' ? 8 : 5,
        stress: -4,
      }),
    }
  } else if (!grade.passed) {
    work = log(work, `“${assignment.title}” came back for changes (${grade.score}%)`)
    work = {
      ...work,
      wellbeing: adjustWellbeing(work.wellbeing, { stress: 3, engagement: -1 }),
    }
  } else {
    work = log(work, `Improved “${assignment.title}” (${grade.score}%)`, 'good')
  }

  if (reward.unlocked) work = addDeadline(work, reward.unlocked.id)
  return withWork(profile, work)
}

// ---------------------------------------------------------------------------
// Ending and starting days
// ---------------------------------------------------------------------------

export function overtimeMinutes(work: WorkState): number {
  return Math.max(0, Math.floor(work.minute) - HOURS.end)
}

/** Going home now would be leaving early with work still open. */
export function isLeavingEarly(profile: ProfileData): boolean {
  return profile.work.minute < HOURS.earliestFinish && openTasks(profile).length > 0
}

/** Ends the working day and records how it went. */
export function endDay(profile: ProfileData): ProfileData {
  if (profile.work.dayOver) return profile
  let work = profile.work
  if (isLeavingEarly(profile)) {
    work = changeReputation(work, -2)
    work = log(
      work,
      `Left early at ${formatTime(work.minute)} with work unfinished`,
      'bad',
    )
  } else {
    work = log(work, `Went home at ${formatTime(work.minute)}`)
  }
  const meetings = Object.values(work.today.meetings)
  const summary = {
    day: work.day,
    workMinutes: Math.round(work.today.workMinutes),
    overtimeMinutes: overtimeMinutes(work),
    submissions: work.today.submissions,
    meetingsAttended: meetings.filter((m) => m !== 'missed').length,
    meetingsMissed: meetings.filter((m) => m === 'missed').length,
    lunch: work.today.lunch,
    breaks: work.today.breaks,
    wellbeing: work.wellbeing,
    log: work.today.log,
  }
  return withWork(profile, {
    ...work,
    dayOver: true,
    history: [...work.history, summary],
  })
}

/** The next morning: rested (a little or a lot), back at reception at 8:50. */
export function startNextDay(profile: ProfileData): ProfileData {
  const work = profile.work
  if (!work.dayOver) return profile
  const day = nextWorkday(work.day)
  const last = work.history.at(-1)
  const wellbeing = overnight(
    work.wellbeing,
    { overtimeMinutes: last?.overtimeMinutes ?? 0, lunch: last?.lunch ?? true },
    day - work.day,
  )
  let next: WorkState = {
    ...work,
    day,
    minute: HOURS.arrival,
    dayOver: false,
    wellbeing,
    today: freshToday(HOURS.arrival),
  }
  next = log(next, 'Arrived at the office', 'neutral')
  return withWork(profile, checkDeadlines(withWork(profile, next)))
}

/** The absolute time now, for comparing with deadlines. */
export function currentTime(work: WorkState): number {
  return absoluteTime(work.day, work.minute)
}
