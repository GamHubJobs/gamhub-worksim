/**
 * Trust between the player and each colleague, and the player's professional
 * reputation in the office. Pure functions on the work state.
 */
import { PEOPLE } from '../content/company'
import type { WorkState } from '../persistence/schemas'

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

export function trustOf(work: WorkState, personId: string): number {
  return work.relationships[personId]?.trust ?? PEOPLE[personId]?.startingTrust ?? 50
}

export function changeTrust(work: WorkState, personId: string, delta: number): WorkState {
  if (delta === 0) return work
  const current = work.relationships[personId]
  return {
    ...work,
    relationships: {
      ...work.relationships,
      [personId]: {
        trust: clamp(trustOf(work, personId) + delta),
        talks: current?.talks ?? 0,
      },
    },
  }
}

export function changeReputation(work: WorkState, delta: number): WorkState {
  return delta === 0 ? work : { ...work, reputation: clamp(work.reputation + delta) }
}

export interface TrustReading {
  label: string
  tone: 'good' | 'neutral' | 'bad'
}

export function trustReading(trust: number): TrustReading {
  if (trust >= 80) return { label: 'Close ally', tone: 'good' }
  if (trust >= 65) return { label: 'Trusts you', tone: 'good' }
  if (trust >= 45) return { label: 'Friendly', tone: 'neutral' }
  if (trust >= 30) return { label: 'Cautious', tone: 'bad' }
  return { label: 'Strained', tone: 'bad' }
}

export function reputationReading(reputation: number): TrustReading {
  if (reputation >= 75) return { label: 'Highly regarded', tone: 'good' }
  if (reputation >= 60) return { label: 'Respected', tone: 'good' }
  if (reputation >= 40) return { label: 'Finding your feet', tone: 'neutral' }
  return { label: 'Needs rebuilding', tone: 'bad' }
}
