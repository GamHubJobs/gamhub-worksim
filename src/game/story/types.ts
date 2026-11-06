/**
 * What a story is made of (see docs/STORY_MODE_PLAN.md). A campaign has
 * chapters; a chapter has missions; a mission has objectives, each done in the
 * world with the game's own systems; scenes are what people say when the
 * player walks up to them during a mission, with choices that set the story's
 * flags (and so change later scenes and missions).
 */

export type MissionType = 'main' | 'side' | 'workplace' | 'personal' | 'character'

/** Somewhere the player can see, for "where to go". */
export type Where =
  | 'home'
  | 'office'
  | 'reception'
  | 'desk'
  | 'manager'
  | 'breakroom'
  | 'cafe'
  | 'park'
  | 'shop'
  | 'gym'
  | 'garage'

/** Things that can be true of the game, for objectives done by being so. */
export type StoryState =
  | 'dressed'
  | 'at-office'
  | 'at-home'
  | 'at-cafe'
  | 'at-park'
  | 'at-shop'
  | 'at-gym'
  | 'at-garage'

export type Objective = {
  id: string
  label: string
  where: Where
} & (
  | { kind: 'state'; state: StoryState }
  /** Walk up to someone: their scene plays. */
  | { kind: 'talk'; person: string; scene: string }
  /** Be at a meeting (joined in the office). */
  | { kind: 'meeting'; meeting: string }
  /** Answer a case on the computer (it arrives when the mission starts). */
  | { kind: 'case'; case: string }
)

export interface Reward {
  xp?: number
  money?: number
  trust?: Record<string, number>
}

export interface Mission {
  id: string
  type: MissionType
  title: string
  /** Who gives it (a person's id), shown with it. */
  from: string
  /** The introduction, when it is offered and started. */
  intro: string[]
  objectives: Objective[]
  /** Offered only after these missions, with these flags, and without those. */
  after?: string[]
  needs?: string[]
  unless?: string[]
  /** Flags set when it is done. */
  flags?: string[]
  reward: Reward
  /** The summary at the end (it may depend on what the player decided). */
  summary: (flags: string[]) => string
}

export interface SceneChoice {
  id: string
  label: string
  reply: string[]
  flags?: string[]
  trust?: Record<string, number>
}

export interface Scene {
  id: string
  /** Who says it (a person's id). */
  person: string
  /** What they say ("*…*" lines are what happens; {name} is the player's first name). */
  lines: (flags: string[]) => string[]
  choices: SceneChoice[]
}

export interface Chapter {
  id: string
  title: string
  missions: Mission[]
}

export interface Campaign {
  id: string
  careerId: string
  title: string
  premise: string
  chapters: Chapter[]
  scenes: Record<string, Scene>
  /** Names of the people in the story, by id (for the screens). */
  cast: Record<string, string>
}
