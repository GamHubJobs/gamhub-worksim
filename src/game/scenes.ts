/**
 * Choices in conversations, meetings and workplace events, and what they
 * lead to. Every effect is shown to the player after they choose, so they
 * can learn how their behaviour lands with colleagues.
 */
import { getPerson } from '../content/departments'
import type { Wellbeing } from '../persistence/schemas'
import type { ProfileData } from './career'
import { now } from './deadlines'
import { changeReputation, changeTrust } from './relationships'
import { adjustWellbeing } from './wellbeing'
import { log, passTime, requestExtension } from './workday'

export interface Effects {
  /** Trust change per person ID. */
  trust?: Partial<Record<string, number>>
  reputation?: number
  wellbeing?: Partial<Wellbeing>
  /** Office minutes the choice takes (helping someone, a longer talk). */
  minutes?: number
  /** Extends the deadline of this assignment. */
  extend?: string
  /** A line for today's activity log. */
  log?: { text: string; tone: 'good' | 'neutral' | 'bad' }
}

export interface Choice {
  id: string
  label: string
  /** What happens next (the other person's reply, or a description). */
  reply: string[]
  effects: Effects
  /** The workplace lesson behind the outcome. */
  lesson?: string
}

export function applyEffects(profile: ProfileData, effects: Effects): ProfileData {
  let work = profile.work
  for (const [personId, delta] of Object.entries(effects.trust ?? {})) {
    work = changeTrust(work, personId, delta ?? 0)
  }
  work = changeReputation(work, effects.reputation ?? 0)
  if (effects.wellbeing)
    work = { ...work, wellbeing: adjustWellbeing(work.wellbeing, effects.wellbeing) }
  if (effects.log) work = log(work, effects.log.text, effects.log.tone)
  let next: ProfileData = { ...profile, work }
  if (effects.extend) next = requestExtension(next, effects.extend)
  if (effects.minutes) next = passTime(next, effects.minutes, 'walk')
  return next
}

/** Remembers that a scene happened (and what the player chose). */
export function recordScene(
  profile: ProfileData,
  sceneId: string,
  choice: string | null,
): ProfileData {
  const work = profile.work
  return {
    ...profile,
    work: {
      ...work,
      events: {
        ...work.events,
        done: { ...work.events.done, [sceneId]: { at: now(work), choice } },
        pending: work.events.pending.filter((p) => p.id !== sceneId),
      },
    },
  }
}

export function sceneDone(profile: ProfileData, sceneId: string): boolean {
  return sceneId in profile.work.events.done
}

export function choiceMade(profile: ProfileData, sceneId: string): string | null {
  return profile.work.events.done[sceneId]?.choice ?? null
}

export interface EffectNote {
  text: string
  tone: 'good' | 'bad'
}

const WELLBEING_NAMES: Record<keyof Wellbeing, string> = {
  energy: 'Energy',
  stress: 'Stress',
  engagement: 'Engagement',
  fatigue: 'Fatigue',
}

/** "Priya: trust +3", "Stress −5" … for showing after a choice. */
export function describeEffects(effects: Effects): EffectNote[] {
  const notes: EffectNote[] = []
  const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`)
  for (const [personId, delta] of Object.entries(effects.trust ?? {})) {
    if (!delta) continue
    notes.push({
      text: `${getPerson(personId).name.split(' ')[0]}: trust ${signed(delta)}`,
      tone: delta > 0 ? 'good' : 'bad',
    })
  }
  if (effects.reputation) {
    notes.push({
      text: `Reputation ${signed(effects.reputation)}`,
      tone: effects.reputation > 0 ? 'good' : 'bad',
    })
  }
  for (const [key, delta] of Object.entries(effects.wellbeing ?? {}) as Array<
    [keyof Wellbeing, number]
  >) {
    if (!delta) continue
    const good = key === 'stress' || key === 'fatigue' ? delta < 0 : delta > 0
    notes.push({
      text: `${WELLBEING_NAMES[key]} ${signed(delta)}`,
      tone: good ? 'good' : 'bad',
    })
  }
  if (effects.extend) notes.push({ text: 'Deadline moved by one day', tone: 'good' })
  return notes
}
