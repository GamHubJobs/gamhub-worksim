/**
 * A home repair, as it really happens: now and then the boiler breaks down
 * (on set days, never at random), and there is no hot water for a shower
 * until it is fixed. The player calls a heating engineer, who comes about 40
 * minutes later and rings the bell; let in, they go to the boiler in the
 * kitchen, find the fault and fix it, and are paid at the door. If no one
 * answers for a while, they leave, and the player books again. All in the
 * save, so a refresh carries on where it was and nothing is paid twice.
 */
import type { Life } from '../persistence/schemas'
import { note } from './lifeTime'

/** Minutes from the call to the doorbell. */
export const ENGINEER_MINUTES = 40
/** How long the engineer waits at the door before going. */
export const ENGINEER_WAITS = 12
/** The call-out and the repair, paid when it is done (pence). */
export const REPAIR_COST = 6500

/** The boiler breaks down on the evening of day 4, and every 15 days after. */
export function boilerBreaksOn(day: number): boolean {
  return day >= 4 && (day - 4) % 15 === 0
}

export type RepairStage =
  /** Nothing wrong. */
  | 'none'
  /** Broken, no one called (or the engineer came and went). */
  | 'broken'
  /** The engineer is on the way. */
  | 'coming'
  /** The engineer is at the door, ringing. */
  | 'at-door'

export function repairStage(life: Life): RepairStage {
  const r = life.repair
  if (!r) return 'none'
  if (r.due === null) return 'broken'
  if (life.minute < r.due) return 'coming'
  return life.minute < r.due + ENGINEER_WAITS ? 'at-door' : 'broken'
}

/** Minutes until the engineer arrives (0 when not on the way). */
export function untilEngineer(life: Life): number {
  const r = life.repair
  return r?.due != null && life.minute < r.due ? r.due - life.minute : 0
}

/** The steps of a repair, offered only while there is something to repair. */
const STEPS = new Set(['repair-call', 'repair-wait', 'repair-door'])

/** Whether to list an action at home (the repair's steps only with a repair to do). */
export function repairShown(life: Life, id: string): boolean {
  return !STEPS.has(id) || repairStage(life) !== 'none'
}

/**
 * Why a repair step (or the shower) cannot be done now, or null if it can;
 * undefined for actions that have nothing to do with it.
 */
export function repairBlock(life: Life, id: string): string | null | undefined {
  const stage = repairStage(life)
  switch (id) {
    case 'shower':
      return stage === 'none'
        ? undefined
        : 'No hot water: the boiler has broken down. Call a heating engineer.'
    case 'repair-call':
      if (stage === 'none') return 'Nothing needs repairing.'
      return stage === 'broken' ? null : 'The engineer is already on the way.'
    case 'repair-wait':
      if (stage === 'coming') return null
      return stage === 'at-door'
        ? 'The engineer is here: answer the door.'
        : 'No one is coming.'
    case 'repair-door':
      if (stage === 'coming') return `On the way: about ${untilEngineer(life)} minutes.`
      return stage === 'at-door' ? null : 'No one is at the door.'
    default:
      return undefined
  }
}

/** The evening starts: the boiler breaks down if today is the day (once). */
export function checkBoiler(life: Life, day: number): Life {
  if (life.repair || !boilerBreaksOn(day)) return life
  return note(
    { ...life, repair: { day, due: null } },
    'The boiler has broken down: no hot water',
  )
}

/** Called the engineer (the call itself takes the action's minutes): on the way. */
export function engineerBooked(life: Life): Life {
  if (!life.repair) return life
  // From the minute of the call, before its five minutes.
  const at = Math.max(0, life.minute - 5)
  return { ...life, repair: { ...life.repair, due: at + ENGINEER_MINUTES } }
}

/** Fixed (and paid by the action): hot water again. */
export function repaired(life: Life): Life {
  return { ...life, repair: null }
}
