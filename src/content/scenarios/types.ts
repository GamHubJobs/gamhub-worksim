/**
 * Live workplace scenarios: professional events played in person, in the 3D
 * workplace, with a cast of characters who speak, react and respond to the
 * player: a court hearing, a ward round, a site safety walk, a desk-side IT
 * call, a client review. See game/scenarios.ts for how one is played and what
 * it leads to.
 *
 * A scenario is a sequence of beats. Lines are spoken by the cast; at a
 * choice the player decides (an argument, a question, an objection, a safety
 * call); at an exhibit they present one item of evidence; at a speech they
 * say it in their own words, marked against a short rubric. Each answer has
 * the cast's reaction, may lead somewhere else (a weak answer can draw an
 * objection), and counts towards the outcome.
 */
import type { Department } from '../departments/types'
import type { Effects } from '../../game/scenes'
import type { PersonLook } from '../../office/scene/people'

export type Place = { x: number; z: number }

/** How a member of the cast moves while they speak. */
export type Gesture = 'talk' | 'present' | 'wave' | 'reach' | 'phone'

export interface CastMember {
  id: string
  name: string
  /** Their role in the scene, e.g. "District Judge", "Opposing counsel". */
  role: string
  look: PersonLook
  at: Place
  /** Who or what they face (a point in the room). */
  faces: Place
  seated?: boolean
  /** Standing or sitting this high (e.g. on the judge's raised bench). */
  raised?: number
  /** Moves from a beat onwards, e.g. a witness into the witness box and back. */
  moves?: Array<{ from: string; at: Place; faces: Place; seated?: boolean }>
  /** The department person they are, if any (for trust effects), e.g. "senior". */
  personId?: string
  /**
   * False when the person is already part of the scenery (a patient lying in
   * a ward bed): they speak and are named, but no extra figure is drawn.
   */
  figure?: boolean
}

/** Something said: by a member of the cast, or a narrator's description. */
export interface Line {
  who: string | 'narrator'
  text: string
  gesture?: Gesture
}

export interface Option {
  id: string
  label: string
  /** The share of the beat's points this answer earns: 1 best, 0 worst. */
  score: number
  /** How the cast responds. */
  reply: Line[]
  /** Why: shown in the review at the end. */
  lesson: string
  effects?: Effects
  /** Go to this beat next (otherwise the next one in order). */
  goto?: string
}

export type Beat =
  | ({ id: string; kind: 'say' } & Line)
  | {
      id: string
      kind: 'choose'
      /** Who asks, if anyone. */
      who?: string
      prompt: string
      points: number
      options: Option[]
    }
  | {
      id: string
      kind: 'exhibit'
      who?: string
      prompt: string
      points: number
      /** The scenario's exhibits on offer, and the right one. */
      items: string[]
      correct: string
      right: Line[]
      wrong: Line[]
      lesson: string
    }
  | {
      id: string
      kind: 'speak'
      who?: string
      prompt: string
      points: number
      /** At least this many words. */
      minWords: number
      /** Each group: at least one of its words must be used. */
      mentions: string[][]
      /** A model answer, shown in the review. */
      model: string
      /** The cast's response when it is good, and when it is not. */
      good: Line[]
      weak: Line[]
      lesson: string
    }
  | {
      id: string
      kind: 'end'
    }

export interface Exhibit {
  id: string
  title: string
  text: string
}

export type Band = 'excellent' | 'good' | 'pass' | 'poor'

export interface Outcome {
  /** The verdict, decision or result, e.g. "Judgment for the claimant". */
  verdict: string
  /** What the person in charge says. */
  feedback: string
  effects: Effects
}

export interface Scenario {
  id: string
  careerId: string
  title: string
  /** One line: what is happening and the player's part in it. */
  summary: string
  /** The workplace corner it is played in (see office/scene/bays.ts). */
  workplace: NonNullable<Department['workplace']>
  /** The room it happens in, e.g. "The moot courtroom". */
  room: string
  /** From this career level (1 = the first). */
  minLevel: number
  /** Where the player stands, and what they face. */
  player: { at: Place; faces: Place }
  /** The camera for the scene: where it is and what it looks at. */
  camera: { from: [number, number, number]; looks: [number, number, number] }
  cast: CastMember[]
  exhibits?: Exhibit[]
  beats: Beat[]
  /** Percent needed for each band (excellent ≥ 85, good ≥ 70, pass ≥ 50 by default). */
  outcomes: Record<Band, Outcome>
  /** Earned once, the first time, scaled by the score. */
  xp: number
  skills: Record<string, number>
  /**
   * The case whose meeting this is: playing it while that meeting is on joins
   * the meeting, and the answers below become the case's answers.
   */
  caseLink?: {
    caseId: string
    /** A choice beat in the scenario → the case's decide step and option per answer. */
    answers: Array<{ beat: string; step: string; options: Record<string, string> }>
  }
}
