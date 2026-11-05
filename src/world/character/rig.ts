/**
 * The character's animations, as pure functions of time: each clip gives the
 * angle of every joint (and how the whole body is raised, lowered or laid
 * down) at a moment. The person in 3D blends towards whatever the clip says,
 * so one motion flows into the next without jumps.
 *
 * Angles follow the person's rig (people.tsx): the person faces -z; a
 * shoulder or hip turned +x swings the arm or leg forward; an elbow +x bends
 * the forearm forward; a knee -x bends the shin back.
 */
export type Vec3 = [number, number, number]

export interface RigFrame {
  /** The spine leaning forward (+) or back (-). */
  lean: number
  hipL: number
  hipR: number
  kneeL: number
  kneeR: number
  shoulderL: Vec3
  shoulderR: Vec3
  elbowL: number
  elbowR: number
  headPitch: number
  headYaw: number
  /** Seated hips (0.49 m) or standing (0.875 m). */
  seated: boolean
  /** The whole body raised (+) or lowered (-), in metres. */
  y: number
  /** The whole body tipped about the hips: π/2 lies on the back, head towards +z. */
  pitch: number
  /** The body rolled onto its side (for sleeping), radians. */
  roll: number
}

export const STAND: RigFrame = {
  lean: 0,
  hipL: 0,
  hipR: 0,
  kneeL: 0,
  kneeR: 0,
  shoulderL: [0.04, 0, -0.07],
  shoulderR: [0.04, 0, 0.07],
  elbowL: 0.14,
  elbowR: 0.14,
  headPitch: 0,
  headYaw: 0,
  seated: false,
  y: 0,
  pitch: 0,
  roll: 0,
}

export const SIT: RigFrame = {
  ...STAND,
  lean: -0.04,
  hipL: 1.5,
  hipR: 1.46,
  kneeL: -1.5,
  kneeR: -1.42,
  shoulderL: [0.18, -0.15, -0.06],
  shoulderR: [0.18, 0.15, 0.06],
  elbowL: 0.85,
  elbowR: 0.85,
  seated: true,
}

const wave = (t: number, period: number) => Math.sin((t / period) * Math.PI * 2)
/** 0 → 1 → 0 once a period, smoothly (a repetition). */
const rep = (t: number, period: number) =>
  0.5 - 0.5 * Math.cos((t / period) * Math.PI * 2)
const mix = (a: number, b: number, k: number) => a + (b - a) * k
const mix3 = (a: Vec3, b: Vec3, k: number): Vec3 => [
  mix(a[0], b[0], k),
  mix(a[1], b[1], k),
  mix(a[2], b[2], k),
]
const clamp01 = (k: number) => Math.min(1, Math.max(0, k))

export type ClipId =
  | 'stand'
  | 'crouch'
  | 'sit'
  | 'sit-relax'
  | 'type'
  | 'read'
  | 'write'
  | 'eat'
  | 'drink'
  | 'phone'
  | 'talk'
  | 'present'
  | 'reach'
  | 'pay'
  | 'cook'
  | 'wash-hands'
  | 'brush-teeth'
  | 'shower'
  | 'dress'
  | 'lie-down'
  | 'sleep'
  | 'bench-lie'
  | 'bench-press'
  | 'curl'
  | 'squat'
  | 'cycle'
  | 'stretch'
  | 'yoga'
  | 'drive'
  | 'push-door'
  | 'run-in-place'

/** Every clip, as a frame at time t (seconds since it started). */
export function clipFrame(clip: ClipId, t: number): RigFrame {
  switch (clip) {
    case 'stand':
      return STAND
    case 'crouch':
      return {
        ...STAND,
        lean: 0.35,
        hipL: 1.1,
        hipR: 1.0,
        kneeL: -1.9,
        kneeR: -1.8,
        y: -0.32,
        shoulderL: [0.5, 0, -0.1],
        shoulderR: [0.5, 0, 0.1],
        elbowL: 0.6,
        elbowR: 0.6,
      }
    case 'sit':
      return SIT
    case 'sit-relax':
      // Leaning back on a sofa or bench, hands in the lap.
      return { ...SIT, lean: -0.22, headPitch: 0.06, elbowL: 1.1, elbowR: 1.1 }
    case 'type': {
      // Leaning in, forearms level, fingers moving; a glance at the mouse now and then.
      const mouse = wave(t, 7) > 0.85 ? 1 : 0
      return {
        ...SIT,
        lean: -0.13,
        shoulderL: [0.3, -0.3, -0.04],
        shoulderR: [0.3 + mouse * 0.1, 0.3 - mouse * 0.25, 0.04],
        elbowL: 1.55 + wave(t, 0.23) * 0.06,
        elbowR: 1.55 + (mouse ? 0 : wave(t + 0.1, 0.19) * 0.06),
        headPitch: -0.1,
      }
    }
    case 'read':
      return {
        ...SIT,
        lean: -0.08,
        shoulderL: [0.55, -0.25, -0.05],
        shoulderR: [0.55, 0.25, 0.05],
        elbowL: 1.3,
        elbowR: 1.3,
        headPitch: -0.35 + wave(t, 6) * 0.03,
      }
    case 'write': {
      const r = wave(t, 0.5) * 0.05
      return {
        ...SIT,
        lean: -0.18,
        shoulderL: [0.35, -0.3, -0.04],
        shoulderR: [0.4 + r, 0.28, 0.04],
        elbowL: 1.4,
        elbowR: 1.5 + r,
        headPitch: -0.4,
      }
    }
    case 'eat':
    case 'drink': {
      // Seated: the right hand from the table to the mouth and back, every few seconds.
      const period = clip === 'eat' ? 3.2 : 4.5
      const lift = clamp01(rep(t, period) * 1.6 - 0.3)
      return {
        ...SIT,
        lean: -0.1 + lift * 0.05,
        shoulderL: [0.32, -0.25, -0.05],
        elbowL: 1.45,
        shoulderR: mix3([0.35, 0.25, 0.05], [0.65, 0.4, 0.15], lift),
        elbowR: mix(1.35, 2.35, lift),
        headPitch: mix(-0.12, 0.05, lift),
      }
    }
    case 'phone':
      return {
        ...STAND,
        shoulderR: [0.35, 0.35, 0.45],
        elbowR: 2.4,
        headYaw: 0.1,
        headPitch: wave(t, 4) * 0.05,
      }
    case 'talk': {
      const g = 0.5 + wave(t, 3.7) * 0.25
      return { ...STAND, shoulderR: [0.04 + g * 0.5, 0, 0.07], elbowR: 0.14 + g * 1.4 }
    }
    case 'present': {
      // Standing, one arm out to the screen, then back to the audience.
      const point = clamp01(wave(t, 5) * 1.4)
      return {
        ...STAND,
        shoulderR: mix3([0.3, 0, 0.1], [1.3, 0.9, 0.2], point),
        elbowR: mix(1.2, 0.2, point),
        headYaw: point * 0.8,
      }
    }
    case 'reach': {
      // Takes something from a shelf (right hand) and puts it in the basket (left).
      const k = t % 2.4
      const out = k < 0.8 ? k / 0.8 : k < 1.4 ? 1 : Math.max(0, 1 - (k - 1.4) / 0.8)
      return {
        ...STAND,
        lean: out * 0.15,
        shoulderR: mix3([0.04, 0, 0.07], [1.35, 0.15, 0.1], out),
        elbowR: mix(0.3, 0.15, out),
        shoulderL: [0.3, 0, -0.2],
        elbowL: 1.5,
        headPitch: -0.1 + out * 0.15,
      }
    }
    case 'pay': {
      const out = clamp01(wave(t, 3) * 1.5)
      return {
        ...STAND,
        shoulderR: mix3([0.04, 0, 0.07], [1.0, 0.1, 0.1], out),
        elbowR: mix(0.4, 0.5, out),
        headPitch: -0.15,
      }
    }
    case 'cook': {
      // Stirring a pan with the right hand, the left steadying it.
      const a = (t / 1.1) * Math.PI * 2
      return {
        ...STAND,
        lean: 0.1,
        shoulderL: [0.7, -0.2, -0.15],
        elbowL: 1.1,
        shoulderR: [0.75 + Math.sin(a) * 0.12, 0.2 + Math.cos(a) * 0.1, 0.15],
        elbowR: 1.0,
        headPitch: -0.35,
      }
    }
    case 'wash-hands': {
      const r = wave(t, 0.45) * 0.12
      return {
        ...STAND,
        lean: 0.25,
        shoulderL: [0.75 + r, -0.35, -0.1],
        shoulderR: [0.75 - r, 0.35, 0.1],
        elbowL: 0.9,
        elbowR: 0.9,
        headPitch: -0.4,
      }
    }
    case 'brush-teeth': {
      const r = wave(t, 0.3) * 0.08
      return {
        ...STAND,
        lean: 0.12,
        shoulderR: [0.45, 0.45 + r, 0.3],
        elbowR: 2.35,
        shoulderL: [0.6, -0.3, -0.1],
        elbowL: 0.9,
        headPitch: -0.1,
      }
    }
    case 'shower': {
      // Hands washing the hair, then the arms and body.
      const head = wave(t, 8) > 0
      const r = wave(t, 0.5) * 0.15
      return head
        ? {
            ...STAND,
            shoulderL: [2.6 + r, -0.2, -0.3],
            shoulderR: [2.6 - r, 0.2, 0.3],
            elbowL: 1.8,
            elbowR: 1.8,
            headPitch: -0.25,
          }
        : {
            ...STAND,
            shoulderL: [0.6 + r, -0.5, -0.1],
            shoulderR: [0.6 - r, 0.5, 0.1],
            elbowL: 1.6,
            elbowR: 1.6,
            headPitch: 0.15,
          }
    }
    case 'dress': {
      const r = wave(t, 1.6)
      return {
        ...STAND,
        shoulderL: [0.6 + r * 0.4, -0.4, -0.2],
        shoulderR: [0.6 - r * 0.4, 0.4, 0.2],
        elbowL: 1.8,
        elbowR: 1.8,
        headPitch: -0.2,
      }
    }
    case 'lie-down':
      // Sitting on the edge, then lying back: t over 1.5 s.
      return blend(SIT, sleepFrame(0), clamp01(t / 1.5))
    case 'sleep':
      return sleepFrame(t)
    case 'bench-lie':
      return benchFrame(0)
    case 'bench-press':
      return benchFrame(t)
    case 'curl': {
      // Standing, a dumbbell in each hand, curled alternately.
      const l = rep(t, 2.2)
      const r = rep(t + 1.1, 2.2)
      return {
        ...STAND,
        shoulderL: [0.1, 0, -0.12],
        shoulderR: [0.1, 0, 0.12],
        elbowL: mix(0.15, 2.2, l),
        elbowR: mix(0.15, 2.2, r),
        headPitch: -0.05,
      }
    }
    case 'squat': {
      const d = rep(t, 2.6)
      return {
        ...STAND,
        lean: d * 0.55,
        hipL: d * 1.35,
        hipR: d * 1.35,
        kneeL: -d * 1.75,
        kneeR: -d * 1.75,
        y: -d * 0.46,
        shoulderL: [0.3 + d * 1.1, 0, -0.12],
        shoulderR: [0.3 + d * 1.1, 0, 0.12],
        elbowL: 0.2,
        elbowR: 0.2,
      }
    }
    case 'cycle': {
      // Seated on a bike, leaning to the bars, pedalling.
      const a = (t / 0.9) * Math.PI * 2
      return {
        ...SIT,
        lean: 0.45,
        hipL: 1.2 + Math.sin(a) * 0.35,
        hipR: 1.2 - Math.sin(a) * 0.35,
        kneeL: -1.4 + Math.cos(a) * 0.45,
        kneeR: -1.4 - Math.cos(a) * 0.45,
        shoulderL: [1.15, -0.1, -0.05],
        shoulderR: [1.15, 0.1, 0.05],
        elbowL: 0.35,
        elbowR: 0.35,
        y: 0.32,
      }
    }
    case 'stretch': {
      // Arms overhead, leaning side to side.
      const s = wave(t, 4)
      return {
        ...STAND,
        shoulderL: [3.0, 0, -0.2 + s * 0.2],
        shoulderR: [3.0, 0, 0.2 + s * 0.2],
        elbowL: 0.2,
        elbowR: 0.2,
        roll: s * 0.18,
      }
    }
    case 'yoga': {
      // A slow forward fold and back up.
      const f = rep(t, 6)
      return {
        ...STAND,
        lean: f * 1.3,
        shoulderL: [0.2 + f * 1.6, 0, -0.1],
        shoulderR: [0.2 + f * 1.6, 0, 0.1],
        elbowL: 0.1,
        elbowR: 0.1,
        kneeL: -f * 0.15,
        kneeR: -f * 0.15,
        headPitch: -f * 0.3,
      }
    }
    case 'drive':
      return {
        ...SIT,
        lean: -0.15,
        shoulderL: [1.05, -0.25, -0.1],
        shoulderR: [1.05, 0.25, 0.1],
        elbowL: 0.6,
        elbowR: 0.6 + wave(t, 5) * 0.04,
      }
    case 'run-in-place': {
      // Running on a treadmill: the stride of a run, staying where it is.
      const a = (t / 0.66) * Math.PI * 2
      const st = Math.sin(a)
      return {
        ...STAND,
        lean: 0.16,
        hipL: st * 0.7,
        hipR: -st * 0.7,
        kneeL: -0.2 - Math.max(0, -st) * 1.3,
        kneeR: -0.2 - Math.max(0, st) * 1.3,
        shoulderL: [0.1 - st * 0.6, 0, -0.1],
        shoulderR: [0.1 + st * 0.6, 0, 0.1],
        elbowL: 1.4,
        elbowR: 1.4,
        y: Math.abs(st) * 0.04,
      }
    }
    case 'push-door': {
      const k = clamp01(t / 0.6)
      return {
        ...STAND,
        lean: 0.05,
        shoulderR: mix3([0.04, 0, 0.07], [1.35, 0.2, 0.1], k),
        elbowR: mix(0.3, 0.1, k),
      }
    }
  }
}

function sleepFrame(t: number): RigFrame {
  return {
    ...STAND,
    pitch: Math.PI / 2,
    // On a mattress about 0.55 m up: the hips just above it.
    y: -0.22,
    roll: 0.25,
    shoulderL: [0.2, 0, -0.15],
    shoulderR: [0.2, 0, 0.15],
    elbowL: 0.5,
    elbowR: 0.5,
    kneeL: -0.25,
    kneeR: -0.35,
    hipL: 0.25,
    hipR: 0.3,
    headPitch: 0.15,
    // Slow breathing.
    lean: wave(t, 4.5) * 0.015,
  }
}

/** Lying on a bench, gripping the bar: arms up, elbows bending with each rep. */
function benchFrame(t: number): RigFrame {
  const down = t === 0 ? 0 : rep(t, 2.8)
  return {
    ...STAND,
    pitch: Math.PI / 2,
    y: -0.3,
    // Thighs along the bench, shins down to the floor.
    hipL: 0.15,
    hipR: 0.15,
    kneeL: -1.45,
    kneeR: -1.45,
    shoulderL: [mix(1.57, 0.95, down), -0.55, -0.15],
    shoulderR: [mix(1.57, 0.95, down), 0.55, 0.15],
    elbowL: mix(0.05, 1.45, down),
    elbowR: mix(0.05, 1.45, down),
    headPitch: 0.1,
  }
}

export function blend(a: RigFrame, b: RigFrame, k: number): RigFrame {
  return {
    lean: mix(a.lean, b.lean, k),
    hipL: mix(a.hipL, b.hipL, k),
    hipR: mix(a.hipR, b.hipR, k),
    kneeL: mix(a.kneeL, b.kneeL, k),
    kneeR: mix(a.kneeR, b.kneeR, k),
    shoulderL: mix3(a.shoulderL, b.shoulderL, k),
    shoulderR: mix3(a.shoulderR, b.shoulderR, k),
    elbowL: mix(a.elbowL, b.elbowL, k),
    elbowR: mix(a.elbowR, b.elbowR, k),
    headPitch: mix(a.headPitch, b.headPitch, k),
    headYaw: mix(a.headYaw, b.headYaw, k),
    seated: k < 0.5 ? a.seated : b.seated,
    y: mix(a.y, b.y, k),
    pitch: mix(a.pitch, b.pitch, k),
    roll: mix(a.roll, b.roll, k),
  }
}

/** How far down the bar is in a bench press, 0 (arms straight) to 1 (at the chest). */
export function barDepth(t: number): number {
  return rep(t, 2.8)
}
