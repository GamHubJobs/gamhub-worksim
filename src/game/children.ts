/**
 * Children growing up (see family.ts): a year passes every two game weeks, so
 * a baby becomes a toddler, a school child and a teenager over a long game.
 * School-age children are at school on weekdays (from a quarter to nine until
 * half past three); at eighteen they are grown up and have left home (for a
 * course, a job, a flat of their own). What there is to do with them depends on
 * their age. Children are only ever children here: never part of anything
 * romantic. Pure.
 */
import { isWorkday } from './clock'

/** Game days to a year of a child's life. */
export const DAYS_PER_YEAR = 14
/** How old an adopted child is when they come home. */
export const ADOPTED_AGE = 4
export const SCHOOL_FROM = 8 * 60 + 45
export const SCHOOL_TO = 15 * 60 + 30

export type ChildStage = 'baby' | 'toddler' | 'child' | 'teen' | 'grown'

export interface Child {
  name: string
  born: number
  adopted: boolean
}

export function ageOf(child: Child, day: number): number {
  return Math.max(0, Math.floor((day - child.born) / DAYS_PER_YEAR))
}

export function stageOf(age: number): ChildStage {
  if (age < 1) return 'baby'
  if (age < 5) return 'toddler'
  if (age < 13) return 'child'
  if (age < 18) return 'teen'
  return 'grown'
}

/** How tall they are, against an adult (1). */
export function scaleOf(age: number): number {
  if (age < 1) return 0.34
  return Math.min(0.97, 0.44 + age * 0.036)
}

export function atSchool(age: number, day: number, minute: number): boolean {
  const s = stageOf(age)
  return (
    (s === 'child' || s === 'teen') &&
    isWorkday(day) &&
    minute >= SCHOOL_FROM &&
    minute < SCHOOL_TO
  )
}

/** At home right now: not at school, and not yet grown up and gone. */
export function homeNow(child: Child, day: number, minute: number): boolean {
  const age = ageOf(child, day)
  return stageOf(age) !== 'grown' && !atSchool(age, day, minute)
}

/** How they are described ("Ada, 7, at school"). */
export function describe(child: Child, day: number, minute: number): string {
  const age = ageOf(child, day)
  const s = stageOf(age)
  const years = age === 1 ? '1 year old' : `${age} years old`
  if (s === 'baby') return 'a baby'
  if (s === 'grown') return `${years}, grown up and living away`
  return atSchool(age, day, minute) ? `${years}, at school` : years
}
