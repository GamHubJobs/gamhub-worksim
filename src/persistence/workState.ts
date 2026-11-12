/**
 * The working-life state a career starts with. Kept here (not in the game
 * rules) because upgrading older saves needs it too.
 */
import {
  CareerRecordSchema,
  LifeSchema,
  type Today,
  type Wellbeing,
  type WorkState,
} from './schemas'
import { STARTING_INDICATORS } from '../content/organisation'

/** 8:50 am: new days start a few minutes before work. */
export const ARRIVAL_MINUTE = 8 * 60 + 50

export const STARTING_WELLBEING: Wellbeing = {
  energy: 90,
  stress: 20,
  engagement: 65,
  fatigue: 0,
}

export function freshToday(minute = ARRIVAL_MINUTE): Today {
  return {
    lunch: false,
    lastBreakAt: minute,
    breaks: 0,
    workMinutes: 0,
    meetings: {},
    talks: {},
    submissions: 0,
    log: [],
  }
}

export function startingWorkState(seed = 0): WorkState {
  return {
    day: 1,
    minute: ARRIVAL_MINUTE,
    dayOver: false,
    today: freshToday(),
    wellbeing: { ...STARTING_WELLBEING },
    relationships: {},
    reputation: 50,
    deadlines: {},
    events: { done: {}, pending: [] },
    history: [],
    reviews: [],
    cases: {},
    org: startingOrgState(),
    record: {
      promotions: [],
      achievements: {},
      assessments: [],
      desk: {},
      seed,
      ai: CareerRecordSchema.shape.ai.parse(undefined),
    },
    life: LifeSchema.parse({}),
    disruptions: [],
    kbBookmarks: [],
  }
}

/** The organisation at the start of a career: steady indicators, nothing spent. */
export function startingOrgState(): WorkState['org'] {
  return { indicators: { ...STARTING_INDICATORS }, spend: {} }
}
