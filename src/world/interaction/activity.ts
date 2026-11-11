/**
 * The interaction framework: one way to describe anything the character can
 * do with an object, in any place. An activity says where it is (and how near
 * the player must be), what the prompt says, where the character stands or
 * sits, the stages it plays (each a clip for some seconds, holding things),
 * the sounds and effects at their moments, and the game action it completes.
 *
 * The reward (the game action) is given only when every stage has played;
 * stopping part way gives nothing. Pure, so it can be tested.
 */
import type { EffectId } from '../../audio/manager'
import type { ClipId, Vec3 } from '../character/rig'

/** Things the character can hold. */
export type PropKind =
  | 'cup'
  | 'mug'
  | 'fork'
  | 'sandwich'
  | 'phone'
  | 'dumbbell'
  | 'basket'
  | 'card'
  | 'toothbrush'
  | 'book'
  | 'pen'
  | 'spoon'
  | 'bottle'
  | 'product'
  /** A takeaway bag, with handles. */
  | 'bag'
  /** Papers: a printout, a report. */
  | 'document'
  /** A clipboard with a page on it, to write on. */
  | 'clipboard'
  /** A small watering can. */
  | 'watering-can'

/** Visual effects (see vfx/). */
export type VfxKind =
  | 'shower'
  | 'tap'
  | 'steam'
  | 'sizzle'
  | 'sweat'
  | 'splash'
  | 'bubbles'
  | 'breath'
  | 'dust'
  | 'exhaust'

export interface Stage {
  clip: ClipId
  seconds: number
  hold?: { left?: PropKind; right?: PropKind }
  /** Shown while it plays, e.g. "Rep 3 of 8". */
  label?: string
  /**
   * Walk somewhere first (carrying what is held): a table, the next aisle, the
   * checkout. The stage starts on arrival; walking time is not counted.
   */
  at?: { x: number; z: number; heading: number; y?: number }
  /** Run there rather than walk (a lap of the park). */
  run?: boolean
}

export interface Activity {
  id: string
  /** The game action completed at the end (null for doors and the like). */
  action: string | null
  /** After "Press E to": e.g. "use the bench press". */
  prompt: string
  /** Where it can be started from, and how near the player must be. */
  spot: { x: number; z: number; reach: number }
  /** Where the character is during it, and which way they face. */
  anchor: { x: number; z: number; heading: number; y?: number }
  /** Watched from behind the character (through a doorway), or from the side (two people face to face). */
  view?: 'behind' | 'side'
  stages: Stage[]
  /** Sounds at a moment (seconds from the start), optionally repeating. */
  sounds?: Array<{ at: number; id: EffectId; every?: number; until?: number }>
  /** Effects while they run (seconds from the start), at a place in the room. */
  effects?: Array<{
    kind: VfxKind
    from: number
    to: number
    at: Vec3
    /** Follows a hand instead (steam from a cup being drunk), offset by `at`. */
    follow?: 'left' | 'right'
  }>
  /** A scene object that moves with the activity (the room knows how), e.g. 'barbell'. */
  object?: string
}

export function totalSeconds(a: Activity): number {
  return a.stages.reduce((sum, s) => sum + s.seconds, 0)
}

export interface StageNow {
  index: number
  stage: Stage
  /** Seconds into this stage. */
  local: number
  /** 0 … 1 through the whole activity. */
  progress: number
  done: boolean
}

export function stageAt(a: Activity, t: number): StageNow {
  const total = totalSeconds(a)
  let start = 0
  for (let index = 0; index < a.stages.length; index++) {
    const stage = a.stages[index]
    if (t < start + stage.seconds || index === a.stages.length - 1)
      return {
        index,
        stage,
        local: Math.min(stage.seconds, Math.max(0, t - start)),
        progress: Math.min(1, t / total),
        done: t >= total,
      }
    start += stage.seconds
  }
  throw new Error('An activity needs at least one stage.')
}

/** The sounds due between two moments (after `from`, up to and including `to`). */
export function soundsBetween(a: Activity, from: number, to: number): EffectId[] {
  const out: EffectId[] = []
  for (const s of a.sounds ?? []) {
    if (!s.every) {
      if (s.at > from && s.at <= to) out.push(s.id)
      continue
    }
    const until = s.until ?? totalSeconds(a)
    for (let k = Math.max(0, Math.ceil((from - s.at) / s.every)); ; k++) {
      const at = s.at + k * s.every
      if (at > to || at > until) break
      if (at > from) out.push(s.id)
    }
  }
  return out
}

export function effectsAt(a: Activity, t: number) {
  return (a.effects ?? []).filter((e) => t >= e.from && t < e.to)
}

/** What the character holds now. */
export function heldAt(a: Activity, t: number): Stage['hold'] {
  return stageAt(a, t).stage.hold ?? {}
}

/** A label for the progress bar: the stage's own, or the prompt. */
export function labelAt(a: Activity, t: number): string {
  return stageAt(a, t).stage.label ?? a.prompt
}
