/**
 * A takeaway, as it really happens: ordered and paid for on the phone (once:
 * no second order while one is on its way), then a courier brings it about
 * 25 minutes later and rings the bell. Answering the door, the bag is handed
 * over; only then is the food the player's, to unpack and eat. If no one comes
 * to the door for a while (the player is out, or busy), the courier leaves it
 * on the doorstep, to be picked up on coming home. A takeaway not eaten by
 * bedtime goes in the fridge. All in the save, so a refresh or a restart
 * carries on where it was, and nothing is paid or given twice.
 */
import type { Life } from '../persistence/schemas'

/** Minutes from ordering to the doorbell. */
export const DELIVERY_MINUTES = 25
/** How long the courier waits at the door before leaving the bag on the doorstep. */
export const COURIER_WAITS = 12

export type DeliveryStage =
  /** Nothing ordered. */
  | 'none'
  /** On its way. */
  | 'coming'
  /** The courier is at the door, ringing. */
  | 'at-door'
  /** Left on the doorstep. */
  | 'doorstep'
  /** In the player's hands, to eat. */
  | 'received'

export function deliveryStage(life: Life): DeliveryStage {
  const d = life.delivery
  if (!d) return 'none'
  if (d.status === 'received') return 'received'
  if (life.minute < d.due) return 'coming'
  return life.minute < d.due + COURIER_WAITS ? 'at-door' : 'doorstep'
}

/** Minutes until it arrives (0 if it is here). */
export function untilArrival(life: Life): number {
  const d = life.delivery
  return d && d.status === 'coming' ? Math.max(0, d.due - life.minute) : 0
}

/**
 * Why a takeaway step cannot be done now, or null if it can; undefined for
 * actions that are not about the takeaway.
 */
export function deliveryBlock(life: Life, id: string): string | null | undefined {
  const stage = deliveryStage(life)
  switch (id) {
    case 'takeaway':
      if (stage === 'coming' || stage === 'at-door' || stage === 'doorstep')
        return 'Your takeaway is already on its way.'
      if (stage === 'received') return 'Your takeaway is here: eat it first.'
      return null
    case 'takeaway-wait':
      if (stage === 'none' || stage === 'received') return 'No takeaway on its way.'
      return stage === 'coming' ? null : 'It is here: answer the door.'
    case 'takeaway-door':
      if (stage === 'coming')
        return `On its way: about ${untilArrival(life)} minutes. Do something else meanwhile.`
      return stage === 'at-door' || stage === 'doorstep' ? null : 'No one is at the door.'
    case 'takeaway-eat':
      return stage === 'received' ? null : 'There is no takeaway to eat.'
    default:
      return undefined
  }
}

/** After ordering (the payment is made by the action itself): on its way. */
export function ordered(life: Life, day: number): Life {
  // The minute it was ordered, before the five on the phone.
  const at = Math.max(0, life.minute - 5)
  return {
    ...life,
    delivery: {
      id: `takeaway-${day}-${at}`,
      ordered: at,
      due: at + DELIVERY_MINUTES,
      status: 'coming',
    },
  }
}

/** Handed over at the door (or picked up from the doorstep): the player's now. */
export function received(life: Life): Life {
  return life.delivery
    ? { ...life, delivery: { ...life.delivery, status: 'received' } }
    : life
}

/** Eaten: done with. */
export function eaten(life: Life): Life {
  return { ...life, delivery: null }
}

/** At bedtime: a takeaway not eaten (in hand, on the doorstep, or arriving) goes in the fridge. */
export function overnight(life: Life): Life {
  if (!life.delivery) return life
  return { ...life, delivery: null, food: life.food + 1 }
}
