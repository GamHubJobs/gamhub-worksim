/**
 * Small shared steps of life at home: needs falling with time, money in and
 * out, the evening log and changes to energy and stress. Used by the home,
 * furniture and social rules.
 */
import { NEED_DECAY, type NeedId } from '../content/life'
import type { Life, WorkState } from '../persistence/schemas'
import type { ProfileData } from './career'
import { formatTime } from './clock'

export const clamp = (n: number, low = 0, high = 100) => Math.min(high, Math.max(low, n))

export function withLife(
  profile: ProfileData,
  life: Life,
  work = profile.work,
): ProfileData {
  return { ...profile, work: { ...work, life } }
}

export function decayed(needs: Life['needs'], minutes: number): Life['needs'] {
  const hours = minutes / 60
  const out = { ...needs }
  for (const id of Object.keys(NEED_DECAY) as NeedId[])
    out[id] = clamp(Math.round(needs[id] - NEED_DECAY[id] * hours))
  return out
}

export function withWellbeing(work: WorkState, energy = 0, stress = 0): WorkState {
  if (!energy && !stress) return work
  return {
    ...work,
    wellbeing: {
      ...work.wellbeing,
      energy: clamp(work.wellbeing.energy + energy),
      stress: clamp(work.wellbeing.stress + stress),
    },
  }
}

export function spend(life: Life, day: number, amount: number, text: string): Life {
  if (!amount) return life
  return {
    ...life,
    money: life.money - amount,
    ledger: [...life.ledger, { day, text, amount: -amount }].slice(-60),
  }
}

export function earn(life: Life, day: number, amount: number, text: string): Life {
  return {
    ...life,
    money: life.money + amount,
    ledger: [...life.ledger, { day, text, amount }].slice(-60),
  }
}

export const note = (life: Life, text: string): Life => ({
  ...life,
  log: [...life.log, `${formatTime(life.minute)}  ${text}`].slice(-30),
})
