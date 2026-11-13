/**
 * Helpers for the legal tasks: each starts from the firm's practice data,
 * and its model answer is built with the player's own actions. Fictional
 * jurisdiction (Westmark); not legal advice.
 */
import { sampleLegal } from '../../../tools/legal/data'
import type { Result } from '../../../tools/legal/model'
import type { LegalState } from '../../../tools/legal/schema'

export function must(result: Result): LegalState {
  if (result.problems.length) throw new Error(result.problems.join(' '))
  return result.state
}

export function firm(change: (s: LegalState) => LegalState = (s) => s): LegalState {
  return change(sampleLegal())
}

export const CHECK_NO_CONFLICT = {
  id: 'no-conflict',
  type: 'no-conflict-breach' as const,
  title: 'No matter opened against a client',
  points: 10,
  why: 'Acting against a current client breaks the firm’s duty of loyalty: it is one of the most serious mistakes a firm can make.',
  hint: 'Never open a matter whose conflict check shows a current client on the other side.',
}
