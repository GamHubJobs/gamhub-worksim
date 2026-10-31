/**
 * Energy, stress, engagement and fatigue. Changes are gradual and capped:
 * the aim is to teach pacing (breaks, lunch, going home on time), not to
 * punish. Wellbeing never reduces XP or grades; being tired only makes work
 * take a little longer, as it does in real life.
 */
import { BREAK_DUE_AFTER } from '../content/workday'
import type { Wellbeing } from '../persistence/schemas'

export type Activity = 'work' | 'meeting' | 'walk' | 'coffee' | 'lunch' | 'chat'

export interface WellbeingContext {
  /** Office minutes since the last proper break. */
  sinceBreak: number
  /** Working after hours. */
  overtime: boolean
  /** At least one task is past its deadline. */
  overdue: boolean
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Math.round(value * 10) / 10))

/** Energy never drops below this: the player can always keep going. */
export const ENERGY_FLOOR = 5

/** Wellbeing after spending `minutes` on an activity. */
export function wellbeingAfter(
  wellbeing: Wellbeing,
  activity: Activity,
  minutes: number,
  context: WellbeingContext,
): Wellbeing {
  let { energy, stress, engagement } = wellbeing
  const hours = minutes / 60

  switch (activity) {
    case 'work': {
      const longStretch = context.sinceBreak > BREAK_DUE_AFTER
      let drain = 10 + (longStretch ? 5 : 0)
      if (stress > 70) drain *= 1.3
      let pressure =
        2 + (context.overdue ? 5 : 0) + (context.overtime ? 5 : 0) + (longStretch ? 3 : 0)
      if (engagement > 70) pressure *= 0.7
      energy -= drain * hours
      stress += pressure * hours
      engagement -= 1.5 * hours
      break
    }
    case 'meeting':
      energy -= 4 * hours
      engagement += 6 * hours
      break
    case 'coffee': {
      // A break helps most when one is needed.
      const need = Math.min(1, Math.max(0.25, context.sinceBreak / 60))
      energy += 8 * need
      stress -= 5 * need
      break
    }
    case 'lunch':
      energy += 25
      stress -= 8
      engagement += 2
      break
    case 'chat':
      stress -= 3
      engagement += 2
      break
    case 'walk':
      break
  }

  return {
    energy: clamp(energy, ENERGY_FLOOR),
    stress: clamp(stress),
    engagement: clamp(engagement),
    fatigue: wellbeing.fatigue,
  }
}

/** Applies a one-off change, e.g. { stress: +5 } after a difficult conversation. */
export function adjustWellbeing(
  wellbeing: Wellbeing,
  change: Partial<Wellbeing>,
): Wellbeing {
  return {
    energy: clamp(wellbeing.energy + (change.energy ?? 0), ENERGY_FLOOR),
    stress: clamp(wellbeing.stress + (change.stress ?? 0)),
    engagement: clamp(wellbeing.engagement + (change.engagement ?? 0)),
    fatigue: clamp(wellbeing.fatigue + (change.fatigue ?? 0)),
  }
}

/**
 * Recovery between days. Evenings clear some fatigue; weekends clear much
 * more. Long days, missed lunches and ending the day exhausted add to it.
 */
export function overnight(
  wellbeing: Wellbeing,
  day: { overtimeMinutes: number; lunch: boolean },
  nightsAway: number,
): Wellbeing {
  const weekend = nightsAway > 1
  const fatigue = clamp(
    wellbeing.fatigue +
      day.overtimeMinutes / 6 +
      (wellbeing.energy < 25 ? 10 : 0) +
      (day.lunch ? 0 : 5) -
      12 -
      (weekend ? 40 : 0),
  )
  return {
    fatigue,
    energy: clamp(100 - fatigue * 0.5),
    stress: clamp(wellbeing.stress - 20 - (weekend ? 25 : 0), 10),
    engagement: clamp(wellbeing.engagement + (65 - wellbeing.engagement) * 0.25),
  }
}

/**
 * How much faster office time passes while working, because tired people
 * work more slowly. 1 = normal.
 */
export function workPace(wellbeing: Wellbeing): number {
  if (wellbeing.energy < 20) return 1.5
  if (wellbeing.energy < 40) return 1.2
  return 1
}

type Tone = 'good' | 'neutral' | 'bad'

export interface Reading {
  label: string
  tone: Tone
  advice: string
}

export function energyReading(energy: number): Reading {
  if (energy >= 70)
    return { label: 'Energised', tone: 'good', advice: 'You are fresh and focused.' }
  if (energy >= 40)
    return {
      label: 'Steady',
      tone: 'neutral',
      advice: 'A coffee break or lunch will top you up.',
    }
  if (energy >= 20)
    return {
      label: 'Tired',
      tone: 'bad',
      advice: 'Work takes a little longer when you are tired. Take a short break.',
    }
  return {
    label: 'Exhausted',
    tone: 'bad',
    advice: 'Everything takes much longer now. A break, lunch or going home will help.',
  }
}

export function stressReading(stress: number): Reading {
  if (stress < 30)
    return { label: 'Calm', tone: 'good', advice: 'You feel in control of your work.' }
  if (stress < 55)
    return {
      label: 'Busy',
      tone: 'neutral',
      advice: 'A normal working day. Keep an eye on your deadlines.',
    }
  if (stress < 75)
    return {
      label: 'Under pressure',
      tone: 'bad',
      advice:
        'Pressure drains your energy faster. Breaks help, and so does talking to someone.',
    }
  return {
    label: 'Overwhelmed',
    tone: 'bad',
    advice:
      'Talk to your manager about your workload, take a proper break and finish on time today.',
  }
}

export function engagementReading(engagement: number): Reading {
  if (engagement >= 70)
    return {
      label: 'Motivated',
      tone: 'good',
      advice: 'You care about the work, which makes pressure easier to handle.',
    }
  if (engagement >= 40)
    return {
      label: 'Engaged',
      tone: 'neutral',
      advice: 'Meetings, good results and colleagues keep you involved.',
    }
  return {
    label: 'Losing interest',
    tone: 'bad',
    advice: 'Join the team: meetings, conversations and finishing tasks all help.',
  }
}

export function fatigueReading(fatigue: number): Reading {
  if (fatigue < 30)
    return { label: 'Rested', tone: 'good', advice: 'Evenings off are doing their job.' }
  if (fatigue < 60)
    return {
      label: 'Worn',
      tone: 'neutral',
      advice: 'Long days add up. Go home on time to start tomorrow fresh.',
    }
  return {
    label: 'Running on empty',
    tone: 'bad',
    advice:
      'Several long days in a row. You start each morning with less energy until you rest.',
  }
}
