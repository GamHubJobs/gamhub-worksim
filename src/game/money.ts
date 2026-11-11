/**
 * Money talks with a partner who lives with the player (see personal.ts): when
 * money runs low, they raise it (a message, and something to talk about at
 * home). Sitting down and agreeing a budget together brings them closer;
 * brushing it off does not. At most once a week. Staying single never brings
 * this up, and nothing here touches the career. Pure.
 */
import type { Life } from '../persistence/schemas'
/** All a money talk needs of a bond: its history. */
type Bond = { history: { day: number; text: string }[] }

/** Below this, money is tight. */
export const TIGHT = 150
/** Days before it comes up again. */
export const MONEY_TALK_GAP = 7

export const BUDGET_TEXT = 'Agreed a budget together'
export const BRUSHED_TEXT = 'Brushed off a worry about money'

/** The day money was last talked about, if ever. */
export function lastMoneyTalk(bond: Bond): number | null {
  for (let i = bond.history.length - 1; i >= 0; i--) {
    const h = bond.history[i]
    if (h.text === BUDGET_TEXT || h.text === BRUSHED_TEXT) return h.day
  }
  return null
}

/** Living together, money is tight, and it has not been talked about this week. */
export function moneyTalkDue(life: Life, bond: Bond | undefined, day: number): boolean {
  if (!life.partner || !bond || life.money >= TIGHT) return false
  const last = lastMoneyTalk(bond)
  return last === null || day - last >= MONEY_TALK_GAP
}
