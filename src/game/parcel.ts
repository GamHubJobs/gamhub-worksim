/**
 * A parcel for the neighbour: on Thursday evenings at seven, a courier rings
 * with a parcel for the flat next door (they are out). Answering, the player
 * takes it in; later they take it round next door, and the neighbour is
 * grateful. If no one answers within a few minutes, the courier takes it to
 * another neighbour instead. In the save (`life.parcel`), so a refresh carries
 * on where it was.
 */
import type { Life } from '../persistence/schemas'

/** When the courier rings (home clock), and how long they wait at the door. */
export const PARCEL_AT = 19 * 60
export const PARCEL_WAITS = 10

export type ParcelStage =
  /** Nothing today. */
  | 'none'
  /** Coming later this evening. */
  | 'coming'
  /** The courier is at the door with it. */
  | 'at-door'
  /** Taken in: to take round next door. */
  | 'held'
  /** Taken round, or gone elsewhere: done for today. */
  | 'done'

const weekday = (day: number) => (((day - 1) % 7) + 7) % 7

/** Whether a parcel for the neighbour comes on this day (Thursdays). */
export const parcelDay = (day: number) => weekday(day) === 3

export function parcelStage(life: Life, day: number, evening: boolean): ParcelStage {
  const p = life.parcel
  if (p && p.day === day) return p.status === 'held' ? 'held' : 'done'
  if (!evening || !parcelDay(day)) return 'none'
  if (life.minute < PARCEL_AT) return 'coming'
  return life.minute < PARCEL_AT + PARCEL_WAITS ? 'at-door' : 'done'
}

/** Whether to list a parcel step at home (only while there is one to do). */
export function parcelShown(stage: ParcelStage, id: string): boolean {
  if (id === 'parcel-door') return stage === 'at-door'
  if (id === 'parcel-return') return stage === 'held'
  return true
}

/** Why a parcel step cannot be done now, or null; undefined for other actions. */
export function parcelBlock(stage: ParcelStage, id: string): string | null | undefined {
  if (id === 'parcel-door') return stage === 'at-door' ? null : 'No one is at the door.'
  if (id === 'parcel-return')
    return stage === 'held' ? null : 'You have no parcel to take round.'
  return undefined
}

/** Signed for the neighbour's parcel at the door. */
export function parcelTaken(life: Life, day: number): Life {
  return { ...life, parcel: { day, status: 'held' } }
}

/** Taken round next door. */
export function parcelReturned(life: Life, day: number): Life {
  return { ...life, parcel: { day, status: 'returned' } }
}
