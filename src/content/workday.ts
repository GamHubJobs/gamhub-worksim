/**
 * The shape of a working day at Cobalt Ridge: hours, meetings, lunch and how
 * long things take. Times are minutes since midnight (9:00 am = 540).
 */
import { ARRIVAL_MINUTE } from '../persistence/workState'
import type { SpotId } from './office'

export const HOURS = {
  /** The player arrives a few minutes early. */
  arrival: ARRIVAL_MINUTE,
  start: 9 * 60,
  end: 17 * 60 + 30,
  /** Security locks up: the day ends no matter what. */
  closing: 19 * 60,
  /** Leaving before this counts as leaving early. */
  earliestFinish: 17 * 60,
} as const

export const LUNCH = {
  /** Lunch can be taken in this window. */
  from: 11 * 60 + 45,
  until: 14 * 60,
  minutes: 45,
} as const

/**
 * While the player works at the computer, office time runs this many times
 * faster than real time: 10 real minutes are one office hour. The clock
 * stops when the player is away or idle.
 */
export const COMPUTER_SPEED = 6

/** Real seconds without keyboard or mouse use before the clock pauses. */
export const IDLE_AFTER_SECONDS = 90

/** Office minutes of continuous work after which a break is recommended. */
export const BREAK_DUE_AFTER = 120

/** How long office activities take, in office minutes. */
export const DURATIONS = {
  walk: 2,
  coffee: 10,
  chat: 10,
  lunch: LUNCH.minutes,
} as const

/** Weekday numbers: 0 = Monday … 4 = Friday. */
export type Weekday = 0 | 1 | 2 | 3 | 4

export interface Meeting {
  id: string
  title: string
  /** Which weekdays it happens on. */
  days: Weekday[]
  start: number
  minutes: number
  /** Where it takes place. */
  spot: SpotId
  host: string
  /** One line for the calendar. */
  about: string
}

/** Joining up to this many minutes after the start still counts (as late). */
export const MEETING_GRACE = 10

/** Meetings open a few minutes before they start. */
export const MEETING_OPENS_BEFORE = 10

export const MEETINGS: Meeting[] = [
  {
    id: 'standup',
    title: 'Team stand-up',
    days: [0, 1, 2, 3, 4],
    start: 9 * 60 + 15,
    minutes: 15,
    spot: 'desk',
    host: 'manager',
    about: 'Fifteen minutes at the team whiteboard: what everyone is working on today.',
  },
  {
    id: 'planning',
    title: 'Weekly planning',
    days: [2],
    start: 11 * 60,
    minutes: 30,
    spot: 'manager',
    host: 'manager',
    about: 'The team agrees priorities for the rest of the week in {manager}’s office.',
  },
  {
    id: 'one-to-one',
    title: 'One-to-one with {manager}',
    days: [4],
    start: 15 * 60 + 30,
    minutes: 30,
    spot: 'manager',
    host: 'manager',
    about: 'Your weekly check-in and performance review.',
  },
]

export function getMeeting(id: string): Meeting | undefined {
  return MEETINGS.find((meeting) => meeting.id === id)
}
