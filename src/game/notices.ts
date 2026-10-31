/**
 * Gentle reminders shown at the computer: a meeting starting, lunchtime, a
 * break, going home. They never block work; each has a button that walks the
 * player to the right place in the office.
 */
import type { SpotId } from '../content/office'
import { BREAK_DUE_AFTER, HOURS } from '../content/workday'
import type { ProfileData } from './career'
import { formatTime } from './clock'
import { lunchAvailability, openMeeting } from './workday'

export interface Notice {
  id: string
  text: string
  tone: 'info' | 'warning'
  action: { label: string; spot: SpotId }
}

export function computerNotices(profile: ProfileData): Notice[] {
  const { work } = profile
  if (work.dayOver) return []
  const notices: Notice[] = []

  const meeting = openMeeting(work)
  if (meeting) {
    notices.push({
      id: `meeting:${meeting.id}`,
      text:
        work.minute < meeting.start
          ? `The ${meeting.title.toLowerCase()} starts at ${formatTime(meeting.start)}.`
          : `The ${meeting.title.toLowerCase()} has started. You can still join.`,
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
