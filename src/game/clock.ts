/**
 * Office calendar arithmetic. Day 1 is a Monday; weekends are skipped when
 * the player goes home on a Friday.
 */

export const MINUTES_PER_DAY = 24 * 60

export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(day: number): number {
  return (((day - 1) % 7) + 7) % 7
}

export function weekdayName(day: number): string {
  return WEEKDAY_NAMES[weekdayIndex(day)]
}

export function weekNumber(day: number): number {
  return Math.floor((day - 1) / 7) + 1
}

export function isWorkday(day: number): boolean {
  return weekdayIndex(day) < 5
}

export function nextWorkday(day: number): number {
  let next = day + 1
  while (!isWorkday(next)) next++
  return next
}

/** A moment as one number, for comparing times across days. */
export function absoluteTime(day: number, minute: number): number {
  return (day - 1) * MINUTES_PER_DAY + minute
}

export function splitTime(absolute: number): { day: number; minute: number } {
  const day = Math.floor(absolute / MINUTES_PER_DAY) + 1
  return { day, minute: absolute - (day - 1) * MINUTES_PER_DAY }
}

/** "9:05 am", "12:30 pm". */
export function formatTime(minute: number): string {
  const whole = Math.floor(minute)
  const hours = Math.floor(whole / 60) % 24
  const minutes = whole % 60
  const suffix = hours >= 12 ? 'pm' : 'am'
  const shown = hours % 12 === 0 ? 12 : hours % 12
  return `${shown}:${String(minutes).padStart(2, '0')} ${suffix}`
}

/** "45 min", "1 h 30 min". */
export function formatDuration(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  const hours = Math.floor(whole / 60)
  const rest = whole % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** "today at 5:30 pm", "tomorrow at 12:00 pm", "Wednesday at 5:30 pm". */
export function formatMoment(absolute: number, today: number): string {
  const { day, minute } = splitTime(absolute)
  const time = formatTime(minute)
  if (day === today) return `today at ${time}`
  if (day === today + 1) return `tomorrow at ${time}`
  return `${weekdayName(day)} at ${time}`
}
