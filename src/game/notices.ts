/**
 * Gentle reminders shown at the computer: a meeting starting, lunchtime, a
 * break, going home, a case falling due. They never block work; each has a
 * button that walks the player to the right place in the office, or opens the
 * case.
 */
import { caseFor } from './caseVariants'
import type { SpotId } from '../content/office'
import { BREAK_DUE_AFTER, HOURS } from '../content/workday'
import { fill, findPerson } from '../content/departments'
import type { ProfileData } from './career'
import { pendingEvents } from './events'
import { formatDuration, formatTime } from './clock'
import { meetingStatus, minutesLeft, minutesToMeeting, openCases } from './cases'
import { lunchAvailability, openMeeting } from './workday'

export interface Notice {
  id: string
  text: string
  tone: 'info' | 'warning'
  /** Where the button takes the player (and the event to open there), or the case it opens. */
  action:
    { label: string; spot: SpotId; event?: string } | { label: string; caseId: string }
}

/** A case's meeting is this close (minutes) before it is mentioned. */
export const CASE_MEETING_NOTICE = 30
/** A case is this close (minutes) to its deadline before it is mentioned. */
export const CASE_DUE_NOTICE = 60

/** Reminders about open cases: a meeting about to start, a deadline close. */
export function caseNotices(profile: ProfileData): Notice[] {
  const notices: Notice[] = []
  for (const progress of openCases(profile)) {
    const def = caseFor(profile, progress.caseId)
    if (!def) continue
    const open = { label: 'Open the case', caseId: def.id }
    const status = meetingStatus(profile.work, def, progress)
    if (def.meeting && status === 'open') {
      notices.push({
        id: `case-meeting:${def.id}`,
        text: `${def.meeting.title} has started (${def.meeting.room}). You can still join.`,
        tone: 'warning',
        action: open,
      })
      continue
    }
    if (def.meeting && status === 'upcoming') {
      const wait = minutesToMeeting(profile.work, def, progress)
      if (wait <= CASE_MEETING_NOTICE) {
        notices.push({
          id: `case-meeting:${def.id}`,
          text: `${def.meeting.title} starts in ${formatDuration(wait)}. Is your preparation ready?`,
          tone: 'info',
          action: open,
        })
        continue
      }
    }
    const left = minutesLeft(profile.work, progress)
    if (left > 0 && left <= CASE_DUE_NOTICE) {
      notices.push({
        id: `case-due:${def.id}`,
        text: `“${def.title}” is due in ${formatDuration(left)}.`,
        tone: 'warning',
        action: open,
      })
    }
  }
  return notices
}

export function computerNotices(profile: ProfileData): Notice[] {
  const { work } = profile
  if (work.dayOver) return []
  const notices: Notice[] = []

  // Someone came over to the player's desk.
  for (const event of pendingEvents(profile)) {
    const name = findPerson(event.person)?.name.split(' ')[0] ?? 'A colleague'
    notices.push({
      id: `event:${event.id}`,
      text: `${name} has come over to your desk: “${event.opener}”`,
      tone: 'warning',
      action: { label: `Talk to ${name}`, spot: 'desk', event: event.id },
    })
  }

  notices.push(...caseNotices(profile))

  const meeting = openMeeting(work)
  if (meeting) {
    notices.push({
      id: `meeting:${meeting.id}`,
      text:
        work.minute < meeting.start
          ? fill(
              `The ${meeting.title.toLowerCase()} starts at ${formatTime(meeting.start)}.`,
            )
          : fill(`The ${meeting.title.toLowerCase()} has started. You can still join.`),
      tone: work.minute < meeting.start ? 'info' : 'warning',
      action: { label: 'Go to the meeting', spot: meeting.spot },
    })
  }

  if (work.minute >= HOURS.end) {
    notices.push({
      id: 'home',
      text:
        work.minute >= HOURS.closing - 30
          ? `It is ${formatTime(work.minute)}. The office closes at ${formatTime(HOURS.closing)}.`
          : `It is ${formatTime(work.minute)}: the working day is over. Late evenings add fatigue.`,
      tone: 'warning',
      action: { label: 'Wrap up and go home', spot: 'reception' },
    })
  } else if (lunchAvailability(work) === 'available' && work.minute >= 12 * 60 + 15) {
    notices.push({
      id: 'lunch',
      text: 'It is lunchtime. A proper lunch break restores your energy for the afternoon.',
      tone: 'info',
      action: { label: 'Go to the break room', spot: 'breakroom' },
    })
  } else if (work.minute - work.today.lastBreakAt >= BREAK_DUE_AFTER) {
    notices.push({
      id: `break:${work.today.lastBreakAt}`,
      text: 'You have been working for over two hours without a break.',
      tone: 'info',
      action: { label: 'Take a coffee break', spot: 'breakroom' },
    })
  }

  return notices
}
