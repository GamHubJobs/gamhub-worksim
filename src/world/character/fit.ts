/**
 * Fitting a pose to the real world (see docs/NPC_ACTIVITIES.md): a seated
 * pose put on the seat that is really there (the hips at its cushion, never
 * above or sunk into it, the shins down to the floor), and hands put on what
 * they use (the keys of a keyboard, a printer's controls, a shelf), by solving
 * the arm as two bones. Uses the person's own proportions (people.tsx). Pure.
 */
import { STAND, type RigFrame } from './rig'

/** The person's proportions, as people.tsx draws them. */
export const BODY = {
  /** Hips when standing, and the rig's seated hips. */
  hipStanding: 0.875,
  hipSeated: 0.49,
  /** How far the hip joints are above the seat they rest on (thigh and pelvis underneath). */
  seatContact: 0.075,
  thigh: 0.41,
  /** Knee to the sole of the shoe. */
  shin: 0.465,
  /** Spine pivot above the hips, and the shoulders above the spine pivot. */
  spine: 0.05,
  shoulder: 0.45,
  upperArm: 0.29,
  /** Elbow to the middle of the hand. */
  forearm: 0.295,
} as const

/** Where the hips are for a pose (world height above the floor the person stands on). */
export function hipHeight(frame: RigFrame): number {
  return (frame.seated ? BODY.hipSeated : BODY.hipStanding) + frame.y
}

/**
 * A seated pose on a seat whose surface is `top` metres up: the whole body
 * raised or lowered so the hips rest on it, and the legs worked out so the
 * feet are on the floor (thighs sloping down from a high seat, level on a low
 * one). Only for poses with the usual seated legs (not cycling or driving).
 */
export function seatOn(frame: RigFrame, top: number): RigFrame {
  const hip = top + BODY.seatContact
  // The thigh's slope down from level, so the shin hangs straight to the floor.
  const sin = Math.min(0.9, Math.max(-0.25, (hip - BODY.shin) / BODY.thigh))
  const angle = Math.PI / 2 - Math.asin(sin)
  return {
    ...frame,
    seated: true,
    y: hip - BODY.hipSeated,
    hipL: angle,
    hipR: angle - 0.04,
    kneeL: -angle,
    kneeR: -angle + 0.06,
  }
}

/**
 * The shoulder and elbow angles (about x, in the spine's frame) that put the
 * middle of the hand `forward` metres in front of the shoulder and `down`
 * metres below it, with the spine leaning `lean`. The elbow bends forward and
 * up, as arms do; out of reach, the arm points straight at the target.
 */
export function armTo(forward: number, down: number, lean: number) {
  const L1 = BODY.upperArm
  const L2 = BODY.forearm
  const d = Math.min(
    L1 + L2 - 1e-4,
    Math.max(Math.abs(L1 - L2) + 1e-4, Math.hypot(forward, down)),
  )
  // The angle of the target from straight down, forward positive.
  const phi = Math.atan2(forward, down)
  // The angle between the upper arm and the line to the target, and the elbow.
  const alpha = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))
  const inner = Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))
  return { shoulder: phi - alpha - lean, elbow: Math.PI - inner }
}

/** Where the middle of the hand is for an arm's angles (forward and down from the shoulder). */
export function handAt(shoulder: number, elbow: number, lean: number) {
  const a = shoulder + lean
  const b = a + elbow
  return {
    forward: BODY.upperArm * Math.sin(a) + BODY.forearm * Math.sin(b),
    down: BODY.upperArm * Math.cos(a) + BODY.forearm * Math.cos(b),
  }
}

/** The shoulders' height for a pose, and how far forward of the hips they are. */
export function shoulderOf(frame: RigFrame) {
  const lift = BODY.spine + BODY.shoulder * Math.cos(frame.lean)
  return {
    y: hipHeight(frame) + lift,
    forward: BODY.shoulder * Math.sin(frame.lean),
  }
}

export interface HandTarget {
  /** How far in front of the person's hips (along the way they face). */
  forward: number
  /** World height. */
  y: number
}

/**
 * A pose with one or both hands on a target: the arm's swing and the elbow
 * from the two-bone solution (the arm's sideways angles stay the clip's own),
 * `k` of the way from the clip's arm (for reaching out and back).
 */
export function handsOn(
  frame: RigFrame,
  target: HandTarget,
  side: 'left' | 'right' | 'both',
  k = 1,
): RigFrame {
  const s = shoulderOf(frame)
  const { shoulder, elbow } = armTo(
    target.forward - s.forward,
    s.y - target.y,
    frame.lean,
  )
  const out = { ...frame }
  const mix = (a: number, b: number) => a + (b - a) * k
  if (side !== 'left') {
    out.shoulderR = [
      mix(frame.shoulderR[0], shoulder),
      frame.shoulderR[1],
      frame.shoulderR[2],
    ]
    out.elbowR = mix(frame.elbowR, elbow)
  }
  if (side !== 'right') {
    out.shoulderL = [
      mix(frame.shoulderL[0], shoulder),
      frame.shoulderL[1],
      frame.shoulderL[2],
    ]
    out.elbowL = mix(frame.elbowL, elbow)
  }
  return out
}

/** Standing up from a seat, or sitting down on it: `k` from standing (0) to seated (1). */
export function sitting(seated: RigFrame, k: number): RigFrame {
  const c = Math.min(1, Math.max(0, k))
  const e = c * c * (3 - 2 * c)
  const mix = (a: number, b: number) => a + (b - a) * e
  const standY = 0
  const seatedY = hipHeight(seated) - BODY.hipStanding
  return {
    ...seated,
    // Drawn standing, lowered as a whole: the hips come down onto the seat.
    seated: false,
    y: mix(standY, seatedY),
    // Leaning forward as the weight goes over the feet, half way.
    lean: mix(STAND.lean, seated.lean) + Math.sin(e * Math.PI) * 0.35,
    hipL: mix(STAND.hipL, seated.hipL),
    hipR: mix(STAND.hipR, seated.hipR),
    kneeL: mix(STAND.kneeL, seated.kneeL),
    kneeR: mix(STAND.kneeR, seated.kneeR),
    shoulderL: [
      mix(STAND.shoulderL[0], seated.shoulderL[0]) + Math.sin(e * Math.PI) * 0.3,
      seated.shoulderL[1] * e,
      seated.shoulderL[2],
    ],
    shoulderR: [
      mix(STAND.shoulderR[0], seated.shoulderR[0]) + Math.sin(e * Math.PI) * 0.3,
      seated.shoulderR[1] * e,
      seated.shoulderR[2],
    ],
    elbowL: mix(STAND.elbowL, seated.elbowL),
    elbowR: mix(STAND.elbowR, seated.elbowR),
  }
}

/**
 * Leans forward from the pose's own lean, as little as needed, until a target
 * in front is comfortably within the arm's reach (as far as `max`).
 */
export function leanToReach(frame: RigFrame, target: HandTarget, max = 0.45): RigFrame {
  const reach = (BODY.upperArm + BODY.forearm) * 0.93
  for (let lean = frame.lean; lean <= max + 1e-9; lean += 0.02) {
    const f = { ...frame, lean }
    const s = shoulderOf(f)
    if (Math.hypot(target.forward - s.forward, s.y - target.y) <= reach) return f
  }
  return { ...frame, lean: max }
}
