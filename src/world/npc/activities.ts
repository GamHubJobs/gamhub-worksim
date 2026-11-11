/**
 * What people do, and what each thing they do needs (see docs/NPC_ACTIVITIES.md).
 * Every activity says whether it is done seated or standing, what must
 * really be there for it (a keyboard to type on, a printer, a shelf, a
 * whiteboard to present at), and what is held (a phone, a document, a mug, a
 * clipboard and a pen). Before someone does it at a place, it is checked
 * against the anchors the furniture there has registered (world/anchors.ts):
 * a seat for a seated place (and nobody else on it), what it needs within
 * reach. Anything that does not check out is not done; if nothing at a place
 * does, they just stand (or sit) there. So there is no typing at thin air,
 * no sitting on nothing, and no hand moving at nothing. Pure.
 */
import { allAnchors, nearestAnchor, type Anchor, type AnchorKind } from '../anchors'
import { clipFrame, reachOut, type ClipId, type RigFrame } from '../character/rig'
import { BODY, handsOn, leanToReach, seatOn, type HandTarget } from '../character/fit'
import type { PropKind } from '../interaction/activity'
import type { Place } from './schedule'

export interface ActivitySpec {
  /** Done seated, standing, or either (as the place is). */
  posture: 'seated' | 'standing' | 'either'
  /** What must be there (any one of these), within reach of the place. */
  needs?: readonly AnchorKind[]
  /** What is held, in which hand. */
  hold?: { left?: PropKind; right?: PropKind }
  /** The hands go to what it needs: both (on the keys), or the right (reaching to it). */
  hands?: 'both' | 'right'
}

const REACHABLE: readonly AnchorKind[] = [
  'shelf',
  'printer',
  'counter',
  'checkout',
  'coffee-machine',
  'water',
  'plant',
]

export const ACTIVITIES: Partial<Record<ClipId, ActivitySpec>> = {
  stand: { posture: 'standing' },
  sit: { posture: 'seated' },
  'sit-relax': { posture: 'seated' },
  type: { posture: 'either', needs: ['keyboard'], hands: 'both' },
  read: { posture: 'either', hold: { left: 'document' } },
  write: { posture: 'either', hold: { left: 'clipboard', right: 'pen' } },
  phone: { posture: 'either', hold: { right: 'phone' } },
  drink: { posture: 'either', hold: { right: 'cup' } },
  eat: { posture: 'either', hold: { right: 'sandwich' } },
  talk: { posture: 'either' },
  present: { posture: 'standing', needs: ['whiteboard'] },
  reach: { posture: 'standing', needs: REACHABLE, hands: 'right' },
  stretch: { posture: 'standing' },
  /** On an exercise bike (its saddle is a seat). */
  cycle: { posture: 'seated' },
  pay: { posture: 'standing', needs: ['checkout', 'counter'], hold: { right: 'card' } },
}

/** What someone holds while reaching to a thing, by what it is. */
const REACH_HOLDS: Partial<Record<AnchorKind, { left?: PropKind; right?: PropKind }>> = {
  plant: { right: 'watering-can' },
  printer: { left: 'document' },
  shelf: { left: 'document' },
  water: { left: 'cup' },
  'coffee-machine': { left: 'cup' },
}

/** How far from a place a seat may be for it to be that place's seat. */
export const SEAT_REACH = 0.6
/** How far from a place what an activity needs may be. */
export const USE_REACH = 1.4

export interface Resolved {
  /** Where they are when doing it: on the seat, for a seated place. */
  x: number
  z: number
  heading: number
  seat: Anchor | null
  /** What they can do there, the place's own activity first; never empty. */
  clips: ClipId[]
  /** For each activity, what it is done with (the keyboard, the printer). */
  targets: Partial<Record<ClipId, Anchor>>
  /** What was asked for but cannot be done there, and why (for tests and the development view). */
  rejected: Array<{ clip: ClipId; why: string }>
}

/** Whether an activity can be done at a place, and with what; null if it can. */
export function check(
  clip: ClipId,
  seated: boolean,
  at: { x: number; z: number },
  anchors: readonly Anchor[],
): { ok: true; target: Anchor | null } | { ok: false; why: string } {
  const spec = ACTIVITIES[clip]
  if (!spec) return { ok: false, why: 'not an activity people do' }
  if (spec.posture === 'seated' && !seated) return { ok: false, why: 'no seat here' }
  if (spec.posture === 'standing' && seated) return { ok: false, why: 'done standing' }
  if (!spec.needs) return { ok: true, target: null }
  const target = nearestAnchor(spec.needs, at.x, at.z, USE_REACH, undefined, anchors)
  return target
    ? { ok: true, target }
    : { ok: false, why: `nothing to use (${spec.needs.join(', ')})` }
}

/**
 * A place, checked against what is really there: its seat (the nearest free
 * one, if it is a seated place), and the activities that can be done.
 */
export function resolvePlace(
  place: Place,
  anchors: readonly Anchor[],
  /** Seats already someone else's. */
  taken: ReadonlySet<string> = new Set(),
): Resolved {
  const seat = place.seated
    ? nearestAnchor('seat', place.x, place.z, SEAT_REACH, taken, anchors)
    : null
  const at = seat ?? place
  const clips: ClipId[] = []
  const targets: Resolved['targets'] = {}
  const rejected: Resolved['rejected'] = []
  for (const clip of [place.clip, ...(place.also ?? [])]) {
    if (clips.includes(clip)) continue
    const c = check(clip, !!seat, at, anchors)
    if (!c.ok) {
      rejected.push({ clip, why: c.why })
      continue
    }
    clips.push(clip)
    if (c.target) targets[clip] = c.target
  }
  if (!clips.length) clips.push(seat ? 'sit' : 'stand')
  return {
    x: at.x,
    z: at.z,
    heading: seat ? seat.heading : place.heading,
    seat,
    clips,
    targets,
    rejected,
  }
}

/** What is held for an activity (with what it is done with). */
export function holdsFor(
  clip: ClipId,
  target?: Anchor | null,
): { left?: PropKind; right?: PropKind } {
  const spec = ACTIVITIES[clip]
  if (clip === 'reach' && target) return target.carry ?? REACH_HOLDS[target.kind] ?? {}
  return spec?.hold ?? {}
}

/** Where the hands go for an activity, from where the person is (null: the clip's own arms). */
export function handTarget(
  clip: ClipId,
  target: Anchor | null | undefined,
  at: { x: number; z: number; heading: number },
): HandTarget | null {
  const spec = ACTIVITIES[clip]
  if (!spec?.hands || !target) return null
  // Along the way they face (0 faces −z).
  const forward =
    (target.x - at.x) * -Math.sin(at.heading) + (target.z - at.z) * -Math.cos(at.heading)
  // Hands rest just on top of the keys; a reach goes to the thing itself.
  return { forward, y: target.y + (spec.hands === 'both' ? 0.03 : 0) }
}

/** Clips with legs of their own (pedalling, driving): never refitted to a seat. */
const OWN_LEGS: ReadonlySet<ClipId> = new Set<ClipId>(['cycle', 'drive'])

/**
 * The pose for an activity at a resolved place, at time t: seated on its real
 * seat (or standing), hands on what it is done with.
 */
export function activityFrame(
  clip: ClipId,
  t: number,
  at: { x: number; z: number; heading: number; seat: Anchor | null },
  target?: Anchor | null,
): RigFrame {
  const seated = !!at.seat
  let f = clipFrame(clip, t, seated ? 'seated' : 'standing')
  if (seated && f.seated && at.seat?.top !== undefined)
    f = OWN_LEGS.has(clip)
      ? // Pedalling or driving: only the height, on the saddle; the legs are the clip's.
        { ...f, y: at.seat.top + BODY.seatContact - BODY.hipSeated }
      : seatOn(f, at.seat.top)
  const hand = handTarget(clip, target, at)
  if (hand) {
    if (ACTIVITIES[clip]?.hands === 'both') {
      f = handsOn(leanToReach(f, hand), hand, 'both')
      // Fingers on the keys: small, quick movements at the elbows.
      f = {
        ...f,
        elbowL: f.elbowL + Math.sin(t * 13) * 0.035,
        elbowR: f.elbowR + Math.sin(t * 11 + 1.3) * 0.035,
        headPitch: -0.12,
      }
    } else f = handsOn(f, hand, 'right', reachOut(t))
  }
  return f
}

/** Seated poses that are fitted to the seat underneath (not lying down, cycling or driving). */
const SEATED_FIT: ReadonlySet<ClipId> = new Set<ClipId>([
  'sit',
  'sit-relax',
  'type',
  'read',
  'write',
  'eat',
  'drink',
  'phone',
  'talk',
  'wave',
  'hold-hands-across',
  'hold-hands-right',
  'hold-hands-left',
])

/**
 * Someone's pose where they are (the player, or someone in a scene of their
 * own): seated on the seat that is really under them (within half a metre),
 * and hands on what the activity is done with, if it is there.
 */
export function fitToWorld(
  frame: RigFrame,
  clip: ClipId,
  t: number,
  at: { x: number; z: number; heading: number },
  anchors: readonly Anchor[] = allAnchors(),
): RigFrame {
  if (!frame.seated || !SEATED_FIT.has(clip)) return frame
  const seat = nearestAnchor('seat', at.x, at.z, 0.5, undefined, anchors)
  if (!seat || seat.top === undefined) return frame
  let f = seatOn(frame, seat.top)
  const spec = ACTIVITIES[clip]
  if (spec?.hands && spec.needs) {
    const target = nearestAnchor(spec.needs, at.x, at.z, USE_REACH, undefined, anchors)
    const hand = handTarget(clip, target, at)
    if (hand)
      f = handsOn(
        spec.hands === 'both' ? leanToReach(f, hand) : f,
        hand,
        spec.hands === 'both' ? 'both' : 'right',
        spec.hands === 'both' ? 1 : reachOut(t),
      )
  }
  return f
}
