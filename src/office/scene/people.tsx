/**
 * The people of the office. Each one is built from simple shapes, like the
 * furniture (no downloaded models), but with a jointed body: hips, knees,
 * shoulders, elbows, a neck and a face with eyes that blink, brows and a
 * mouth that moves when they talk. They sit and type, stand and shift their
 * weight, walk, turn, glance at the player now and then, and face the player
 * when they are talking with them.
 *
 * All people share the same geometry and a small set of materials, so a
 * dozen of them cost little more to draw than one.
 */
import { useFrame, useThree } from '@react-three/fiber'
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  MathUtils,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import type { Vector } from '../../content/office'
import { prefersReducedMotion } from '../../ui/motion'

/** With reduced motion, people hold a natural pose and do not move. */
const STILL = prefersReducedMotion()

const SKIN_TONES = [
  '#f6d9c4',
  '#ecc3a3',
  '#dda781',
  '#c68b63',
  '#a9724e',
  '#8b5a3c',
  '#6d442f',
  '#4e3124',
]
const HAIR_COLORS = [
  '#1b1411', // black
  '#3a2518', // dark brown
  '#6b4329', // brown
  '#93502e', // auburn
  '#c8a064', // blonde
  '#8c8c8c', // grey
  '#d6d3cf', // white
]

export type HairStyle =
  'short' | 'crop' | 'side' | 'long' | 'bob' | 'bun' | 'ponytail' | 'curly' | 'bald'

/** What they wear on top. Blazers and cardigans show the shirt underneath. */
export type Outfit = 'shirt' | 'blouse' | 'polo' | 'sweater' | 'blazer' | 'cardigan'

export interface PersonLook {
  skin: number
  hair: HairStyle
  hairColor: number
  outfit: Outfit
  /** The main colour of the top. */
  top: string
  /** The shirt under a blazer or cardigan. */
  under?: string
  trousers: string
  shoes?: string
  sleeves?: 'long' | 'short' | 'rolled'
  tie?: string
  glasses?: boolean
  beard?: boolean
  build?: 'slim' | 'average' | 'broad'
  /** Overall size, about 0.94 to 1.06. */
  height?: number
  /** A resting smile, or a neutral, focused face. */
  smile?: boolean
}

/**
 * Computers without a graphics card draw 3D in software: there, people are
 * drawn without their smallest details (ears, brows, nose, collars, buttons,
 * thumbs), which takes about a third off what each person costs to draw.
 */
const LowDetail = createContext(false)

export function PeopleDetail({ low, children }: { low: boolean; children: ReactNode }) {
  return <LowDetail.Provider value={low}>{children}</LowDetail.Provider>
}

/** Small details, left out on computers that draw 3D in software. */
function Detail({ children }: { children: ReactNode }) {
  return useContext(LowDetail) ? null : <>{children}</>
}

/** Set every frame by a Walker or the player: how the person is moving right now. */
export interface Motion {
  walking: boolean
  /** Running: a longer, quicker stride. */
  running?: boolean
  crouching?: boolean
  /** In the air (jumping). */
  airborne?: boolean
}

/** A pose for the whole body, set every frame by an activity (see world/character/rig.ts). */
export interface RigPose {
  lean: number
  hipL: number
  hipR: number
  kneeL: number
  kneeR: number
  shoulderL: Vector
  shoulderR: Vector
  elbowL: number
  elbowR: number
  headPitch: number
  headYaw: number
  seated: boolean
  y: number
  pitch: number
  roll: number
}

/** Where the hands are, for things that must follow them (a barbell). */
export interface HandMarkers {
  left: Group | null
  right: Group | null
}

const CROUCH_POSE = {
  lean: 0.35,
  hipL: 1.1,
  hipR: 1.0,
  kneeL: -1.9,
  kneeR: -1.8,
  shoulderL: [0.5, 0, -0.1] as Vector,
  shoulderR: [0.5, 0, 0.1] as Vector,
  elbowL: 0.6,
  elbowR: 0.6,
  headPitch: 0,
}
const CROUCH_DROP = -0.32

// ---------------------------------------------------------------------------
// Shared geometry and materials
// ---------------------------------------------------------------------------

const GEO = {
  head: new SphereGeometry(0.115, 24, 18),
  jaw: new SphereGeometry(0.09, 18, 12),
  ear: new SphereGeometry(0.026, 10, 8),
  eyeWhite: new SphereGeometry(0.017, 12, 10),
  iris: new SphereGeometry(0.0098, 10, 8),
  nose: new SphereGeometry(0.017, 10, 8),
  brow: new BoxGeometry(0.038, 0.0075, 0.009),
  mouth: new BoxGeometry(0.036, 0.006, 0.006),
  smile: new TorusGeometry(0.019, 0.0034, 6, 14, Math.PI),
  neck: new CylinderGeometry(0.047, 0.054, 0.12, 14),
  torso: new CapsuleGeometry(0.13, 0.28, 8, 18),
  pelvis: new SphereGeometry(0.14, 16, 12),
  upperArm: new CapsuleGeometry(0.054, 0.21, 6, 12),
  forearm: new CapsuleGeometry(0.045, 0.19, 6, 12),
  hand: new SphereGeometry(0.043, 12, 10),
  thumb: new CapsuleGeometry(0.012, 0.03, 4, 6),
  thigh: new CapsuleGeometry(0.086, 0.28, 6, 12),
  shin: new CapsuleGeometry(0.066, 0.29, 6, 12),
  unit: new SphereGeometry(1, 16, 12),
  sole: new BoxGeometry(0.1, 0.016, 0.25),
  // The hair cap covers the top of the head; tilted back, it leaves the face clear.
  hairCap: new SphereGeometry(0.124, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.53),
  // The back of the head, down to the nape (the half facing +z).
  hairBack: new SphereGeometry(0.123, 20, 10, 0, Math.PI, Math.PI * 0.4, Math.PI * 0.36),
  curls: new IcosahedronGeometry(0.135, 2),
  bun: new SphereGeometry(0.048, 14, 10),
  tail: new CapsuleGeometry(0.03, 0.14, 4, 10),
  longHair: new BoxGeometry(0.22, 0.26, 0.05),
  sideLock: new BoxGeometry(0.03, 0.2, 0.08),
  fringe: new BoxGeometry(0.15, 0.03, 0.06),
  // A beard: the lower front of a sphere.
  beard: new SphereGeometry(
    0.098,
    18,
    10,
    Math.PI,
    Math.PI,
    Math.PI * 0.5,
    Math.PI * 0.3,
  ),
  collar: new BoxGeometry(0.075, 0.038, 0.012),
  panel: new BoxGeometry(0.1, 0.25, 0.01),
  tie: new BoxGeometry(0.036, 0.24, 0.01),
  knot: new BoxGeometry(0.03, 0.026, 0.016),
  lens: new TorusGeometry(0.021, 0.0028, 6, 18),
  bridge: new BoxGeometry(0.022, 0.003, 0.003),
  temple: new BoxGeometry(0.003, 0.003, 0.1),
  button: new SphereGeometry(0.006, 6, 4),
  blob: new SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2),
}

const materials = new Map<string, MeshStandardMaterial>()

/** One material per colour and finish, shared by everyone. */
function mat(color: string, roughness = 0.85, metalness = 0): MeshStandardMaterial {
  const key = `${color}/${roughness}/${metalness}`
  let material = materials.get(key)
  if (!material) {
    material = new MeshStandardMaterial({ color, roughness, metalness })
    materials.set(key, material)
  }
  return material
}

function shade(color: string, toward: string, amount: number): string {
  return `#${new Color(color).lerp(new Color(toward), amount).getHexString()}`
}

const WIDTH = { slim: 0.9, average: 1, broad: 1.13 }

// Heights of the joints above the floor (before the person's own scale).
const HIP = { standing: 0.875, seated: 0.49 }
const SHOULDER_Y = 0.45 // above the spine's pivot
const NECK_TOP = 0.6
const HEAD_CENTRE = 0.12 // above the neck top

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------

interface Pose {
  lean: number
  hipL: number
  hipR: number
  kneeL: number
  kneeR: number
  shoulderL: Vector
  shoulderR: Vector
  elbowL: number
  elbowR: number
  headPitch: number
}

const STANDING: Pose = {
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
}

const SEATED: Pose = {
  lean: -0.04,
  hipL: 1.5,
  hipR: 1.46,
  kneeL: -1.5,
  kneeR: -1.42,
  shoulderL: [0.18, -0.15, -0.06],
  shoulderR: [0.18, 0.15, 0.06],
  elbowL: 0.85,
  elbowR: 0.85,
  headPitch: 0,
}

/** Seated at a keyboard: leaning in, forearms level, hands on the keys. */
const TYPING: Pose = {
  ...SEATED,
  lean: -0.13,
  shoulderL: [0.3, -0.3, -0.04],
  shoulderR: [0.3, 0.3, 0.04],
  elbowL: 1.55,
  elbowR: 1.55,
  headPitch: -0.1,
}

// ---------------------------------------------------------------------------
// The person
// ---------------------------------------------------------------------------

export function Person({
  position,
  rotation = 0,
  look,
  seated = false,
  typing = false,
  talking = false,
  phase = 0,
  motion,
  rig,
  hold,
  hands,
}: {
  position?: Vector
  rotation?: number
  look: PersonLook
  seated?: boolean
  typing?: boolean
  /** In conversation with the player: faces them and talks. */
  talking?: boolean
  /** Keeps different people out of step. */
  phase?: number
  motion?: RefObject<Motion>
  /** A whole-body pose from an activity, when there is one (the player). */
  rig?: RefObject<RigPose | null>
  /** Things held in each hand. */
  hold?: { left?: ReactNode; right?: ReactNode }
  /** Filled in with the hands, for objects that follow them. */
  hands?: RefObject<HandMarkers>
}) {
  const camera = useThree((state) => state.camera)

  const outer = useRef<Group>(null)
  const turn = useRef<Group>(null)
  const body = useRef<Group>(null)
  const spine = useRef<Group>(null)
  const head = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const brows = useRef<Group>(null)
  const mouth = useRef<Mesh>(null)
  const smile = useRef<Mesh>(null)
  const shoulderL = useRef<Group>(null)
  const shoulderR = useRef<Group>(null)
  const elbowL = useRef<Group>(null)
  const elbowR = useRef<Group>(null)
  const hipL = useRef<Group>(null)
  const hipR = useRef<Group>(null)
  const kneeL = useRef<Group>(null)
  const kneeR = useRef<Group>(null)
  const pose = useRef<Group>(null)
  const scratch = useRef({ v: new Vector3(), walk: 0 }).current

  const width = WIDTH[look.build ?? 'average']
  const skin = SKIN_TONES[look.skin % SKIN_TONES.length]
  const hairColor = HAIR_COLORS[look.hairColor % HAIR_COLORS.length]
  const m = useMemo(
    () => ({
      skin: mat(skin, 0.6),
      skinShade: mat(shade(skin, '#3b1f14', 0.12), 0.6),
      lips: mat(shade(skin, '#7a2e2e', 0.38), 0.5),
      hair: mat(hairColor, 0.7),
      top: mat(look.top, 0.88),
      under: mat(look.under ?? '#f8fafc', 0.8),
      trousers: mat(look.trousers, 0.85),
      shoes: mat(look.shoes ?? '#1f1a17', 0.45, 0.1),
      white: mat('#f8fafc', 0.25),
      iris: mat('#2a1d16', 0.3),
      tie: mat(look.tie ?? '#1e3a8a', 0.6),
      frame: mat('#1f2937', 0.4, 0.3),
    }),
    [skin, hairColor, look.top, look.under, look.trousers, look.shoes, look.tie],
  )

  const base = typing ? TYPING : seated ? SEATED : STANDING
  // With a rig, the body is laid out standing and lowered or laid down as a whole.
  const hipY = seated && !rig ? HIP.seated : HIP.standing
  const sleeves = look.sleeves ?? (look.outfit === 'polo' ? 'short' : 'long')
  const armMaterial = m.top
  const forearmMaterial = sleeves === 'long' ? m.top : m.skin
  const open = look.outfit === 'blazer' || look.outfit === 'cardigan'
  const collared =
    look.outfit === 'shirt' || look.outfit === 'blazer' || look.outfit === 'polo'

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime + phase
    const frame = rig?.current ?? null
    const moving = motion?.current
    const running = !frame && !!moving?.running
    const crouching = !frame && !!moving?.crouching
    const walking = !frame && (moving?.walking ?? false)
    const k = STILL ? 1 : 1 - Math.exp(-delta * 6)
    const lerp = (from: number, to: number) => (STILL ? to : from + (to - from) * k)

    // Walking blends in and out over a moment.
    scratch.walk = lerp(scratch.walk, walking ? 1 : 0)
    const w = STILL ? 0 : scratch.walk
    const stride = Math.sin(t * (running ? 9.5 : crouching ? 5 : 6.2))
    const still = STILL ? 0 : 1
    // What the body is doing: an activity's pose, crouching, or the usual one.
    const b = frame ?? (crouching ? CROUCH_POSE : base)
    if (pose.current) {
      const drop = frame
        ? (frame.seated ? HIP.seated - HIP.standing : 0) + frame.y
        : crouching
          ? CROUCH_DROP
          : 0
      pose.current.position.y = lerp(pose.current.position.y, HIP.standing + drop)
      pose.current.rotation.x = lerp(pose.current.rotation.x, frame?.pitch ?? 0)
      pose.current.rotation.z = lerp(pose.current.rotation.z, frame?.roll ?? 0)
    }

    // Where the player (the camera) is, in this person's own space.
    let faceYaw = 0
    let facePitch = 0
    let attention = 0
    if (outer.current) {
      const local = outer.current.worldToLocal(scratch.v.copy(camera.position))
      const distance = Math.hypot(local.x, local.z)
      faceYaw = Math.atan2(-local.x, -local.z)
      const eyeHeight = hipY + 0.05 + NECK_TOP + HEAD_CENTRE
      facePitch = MathUtils.clamp(
        Math.atan2(local.y - eyeHeight, distance) * 0.6,
        -0.3,
        0.35,
      )
      // A glance at the player every so often, when they are close by.
      const glance = Math.sin(t * 0.21 + phase * 3.1) > 0.9 ? 1 : 0
      attention = talking ? 1 : !walking && distance < 5.5 && !typing ? glance : 0
      if (Math.abs(faceYaw) > 2.3) attention = talking ? attention : 0
    }

    // Standing people turn their body towards whoever they are talking to.
    if (turn.current) {
      const target = talking && !seated ? MathUtils.clamp(faceYaw, -1.6, 1.6) * 0.75 : 0
      turn.current.rotation.y = lerp(turn.current.rotation.y, target)
    }
    const bodyTurn = turn.current?.rotation.y ?? 0

    if (body.current) {
      // Breathing, a slight weight shift, and a bob in the step.
      body.current.position.y =
        still * (Math.sin(t * 1.5) * 0.004 + w * Math.abs(stride) * 0.025)
      body.current.position.x =
        still * (seated ? 0 : Math.sin(t * 0.45) * 0.012 * (1 - w))
      body.current.rotation.z =
        still * (seated ? 0 : Math.sin(t * 0.45) * 0.015 * (1 - w))
    }
    if (spine.current) {
      spine.current.rotation.x = lerp(
        spine.current.rotation.x,
        b.lean + w * (running ? 0.18 : -0.05),
      )
      spine.current.scale.set(1, 1 + still * Math.sin(t * 1.5) * 0.008, 1)
    }

    // Legs: still when seated or standing, swinging when walking.
    const swing = w * stride * (running ? 0.85 : crouching ? 0.3 : 0.5)
    const tuck = !frame && moving?.airborne ? -0.7 : 0
    if (hipL.current)
      hipL.current.rotation.x = lerp(hipL.current.rotation.x, b.hipL + swing)
    if (hipR.current)
      hipR.current.rotation.x = lerp(hipR.current.rotation.x, b.hipR - swing)
    if (kneeL.current)
      kneeL.current.rotation.x = lerp(
        kneeL.current.rotation.x,
        b.kneeL - w * Math.max(0, -stride) * (running ? 1.3 : 0.75) + tuck,
      )
    if (kneeR.current)
      kneeR.current.rotation.x = lerp(
        kneeR.current.rotation.x,
        b.kneeR - w * Math.max(0, stride) * (running ? 1.3 : 0.75) + tuck,
      )

    // Arms: typing, gesturing while talking, or swinging in the walk.
    const keys = typing ? still * 0.06 : 0
    const gesture = talking ? still * (0.5 + Math.sin(t * 1.7) * 0.25) : 0
    if (shoulderL.current) {
      const [x, y, z] = b.shoulderL
      shoulderL.current.rotation.set(
        lerp(shoulderL.current.rotation.x, x - swing * 0.7),
        lerp(shoulderL.current.rotation.y, y),
        lerp(shoulderL.current.rotation.z, z),
      )
    }
    if (shoulderR.current) {
      const [x, y, z] = b.shoulderR
      shoulderR.current.rotation.set(
        lerp(
          shoulderR.current.rotation.x,
          x + swing * 0.7 + (seated ? 0 : gesture * 0.5),
        ),
        lerp(shoulderR.current.rotation.y, y),
        lerp(shoulderR.current.rotation.z, z),
      )
    }
    if (elbowL.current)
      elbowL.current.rotation.x = lerp(
        elbowL.current.rotation.x,
        b.elbowL + w * (running ? 1.2 : 0.25) + keys * Math.sin(t * 13),
      )
    if (elbowR.current)
      elbowR.current.rotation.x = lerp(
        elbowR.current.rotation.x,
        b.elbowR +
          w * (running ? 1.2 : 0.25) +
          keys * Math.sin(t * 11 + 1.3) +
          gesture * 1.4,
      )

    // The head: looks at the screen, around the room, or at the player.
    if (head.current) {
      const wander = still * Math.sin(t * 0.33) * (typing ? 0.12 : 0.3)
      const yaw = attention
        ? MathUtils.clamp(faceYaw - bodyTurn, -1.1, 1.1)
        : wander * (1 - w) + (frame?.headYaw ?? 0)
      const pitch = attention
        ? facePitch
        : b.headPitch + still * Math.sin(t * 0.27) * 0.04
      head.current.rotation.y = lerp(head.current.rotation.y, yaw)
      head.current.rotation.x = lerp(
        head.current.rotation.x,
        pitch + (talking ? still * Math.sin(t * 2.3) * 0.04 : 0),
      )
    }

    // Blinks every few seconds.
    if (eyes.current) {
      const blink = !STILL && (t * 0.31 + phase) % 1 > 0.975 ? 0.12 : 1
      eyes.current.scale.y = blink
    }
    // The mouth moves while talking; brows lift a little with expression.
    const speaking = talking && !STILL
    if (mouth.current) {
      mouth.current.visible = speaking || !look.smile
      mouth.current.scale.y = speaking
        ? 1 + Math.abs(Math.sin(t * 9.5) * Math.sin(t * 3.1)) * 3.2
        : 1
    }
    if (smile.current) smile.current.visible = !!look.smile && !speaking
    if (brows.current)
      brows.current.position.y = speaking ? Math.max(0, Math.sin(t * 1.9)) * 0.004 : 0
  })

  const shoulderX = 0.19 * width + 0.025
  const hipX = 0.095 * width

  return (
    <group ref={outer} position={position} rotation={[0, rotation, 0]}>
      <group ref={turn} scale={look.height ?? 1}>
        {/* Lowered, raised or laid down as a whole about the hips (activities) */}
        <group ref={pose} position={[0, HIP.standing, 0]}>
          <group position={[0, -HIP.standing, 0]}>
            {/* Legs */}
            {(
              [
                [-hipX, hipL, kneeL, base.hipL, base.kneeL],
                [hipX, hipR, kneeR, base.hipR, base.kneeR],
              ] as const
            ).map(([x, hip, knee, hipAngle, kneeAngle]) => (
              <group
                key={x}
                ref={hip}
                position={[x, hipY, 0]}
                rotation={[hipAngle, 0, 0]}
              >
                <mesh
                  geometry={GEO.thigh}
                  material={m.trousers}
                  position={[0, -0.2, 0]}
                />
                <group ref={knee} position={[0, -0.41, 0]} rotation={[kneeAngle, 0, 0]}>
                  <mesh
                    geometry={GEO.shin}
                    material={m.trousers}
                    position={[0, -0.19, 0]}
                  />
                  {/* Shoe */}
                  <group position={[0, -0.4, 0]}>
                    <mesh
                      geometry={GEO.unit}
                      material={m.shoes}
                      position={[0, -0.028, -0.045]}
                      scale={[0.05, 0.036, 0.125]}
                    />
                    <mesh
                      geometry={GEO.sole}
                      material={m.shoes}
                      position={[0, -0.057, -0.04]}
                    />
                  </group>
                </group>
              </group>
            ))}

            <group ref={body}>
              {/* Hips */}
              <mesh
                geometry={GEO.pelvis}
                material={m.trousers}
                position={[0, hipY + 0.035, 0]}
                scale={[1.3 * width, 0.74, 0.9]}
              />
              <group
                ref={spine}
                position={[0, hipY + 0.05, 0]}
                rotation={[base.lean, 0, 0]}
              >
                {/* Torso */}
                <mesh
                  geometry={GEO.torso}
                  material={m.top}
                  position={[0, 0.27, 0]}
                  scale={[1.4 * width, 1, 0.82]}
                />
                <Detail>
                  {open && (
                    <>
                      {/* The shirt showing between the lapels, and its buttons */}
                      <mesh
                        geometry={GEO.panel}
                        material={m.under}
                        position={[0, 0.39, -0.106]}
                      />
                      {look.outfit === 'cardigan' &&
                        [0.3, 0.22, 0.14].map((y) => (
                          <mesh
                            key={y}
                            geometry={GEO.button}
                            material={m.under}
                            position={[0.058, y, -0.109]}
                          />
                        ))}
                    </>
                  )}
                  {look.outfit === 'polo' &&
                    [0.47, 0.42].map((y) => (
                      <mesh
                        key={y}
                        geometry={GEO.button}
                        material={m.white}
                        position={[0, y, -0.11]}
                      />
                    ))}
                  {collared &&
                    [-1, 1].map((side) => (
                      <mesh
                        key={side}
                        geometry={GEO.collar}
                        material={look.outfit === 'polo' ? m.top : m.under}
                        position={[side * 0.038, 0.535, -0.08]}
                        rotation={[-0.45, side * 0.3, side * 0.55]}
                      />
                    ))}
                  {look.tie && (
                    <>
                      <mesh
                        geometry={GEO.knot}
                        material={m.tie}
                        position={[0, 0.505, -0.106]}
                      />
                      <mesh
                        geometry={GEO.tie}
                        material={m.tie}
                        position={[0, 0.37, -0.112]}
                        rotation={[0.08, 0, 0]}
                      />
                    </>
                  )}
                </Detail>

                {/* Arms */}
                {(
                  [
                    [-shoulderX, shoulderL, elbowL, base.shoulderL, base.elbowL],
                    [shoulderX, shoulderR, elbowR, base.shoulderR, base.elbowR],
                  ] as const
                ).map(([x, shoulder, elbow, shoulderAngle, elbowAngle]) => (
                  <group
                    key={x}
                    ref={shoulder}
                    position={[x, SHOULDER_Y, 0]}
                    rotation={shoulderAngle}
                  >
                    <mesh
                      geometry={GEO.upperArm}
                      material={armMaterial}
                      position={[0, -0.14, 0]}
                    />
                    <group
                      ref={elbow}
                      position={[0, -0.29, 0]}
                      rotation={[elbowAngle, 0, 0]}
                    >
                      <mesh
                        geometry={GEO.forearm}
                        material={forearmMaterial}
                        position={[0, -0.13, 0]}
                      />
                      <group
                        position={[0, -0.295, -0.004]}
                        ref={(g) => {
                          if (hands?.current) hands.current[x < 0 ? 'left' : 'right'] = g
                        }}
                      >
                        {x < 0 ? hold?.left : hold?.right}
                      </group>
                      {/* Hand, with a thumb on the inside */}
                      <mesh
                        geometry={GEO.hand}
                        material={m.skin}
                        position={[0, -0.295, -0.004]}
                        scale={[0.72, 1.15, 0.5]}
                      />
                      <Detail>
                        <mesh
                          geometry={GEO.thumb}
                          material={m.skin}
                          position={[x > 0 ? -0.024 : 0.024, -0.27, -0.012]}
                          rotation={[0, 0, x > 0 ? -0.5 : 0.5]}
                        />
                      </Detail>
                    </group>
                  </group>
                ))}

                {/* Neck and head */}
                <mesh
                  geometry={GEO.neck}
                  material={m.skin}
                  position={[0, 0.555, 0.005]}
                />
                <group ref={head} position={[0, NECK_TOP, 0]}>
                  <Head
                    look={look}
                    m={m}
                    eyes={eyes}
                    brows={brows}
                    mouth={mouth}
                    smile={smile}
                  />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

/** The face and hair. The face looks along -z, like the rest of the body. */
function Head({
  look,
  m,
  eyes,
  brows,
  mouth,
  smile,
}: {
  look: PersonLook
  m: Record<
    'skin' | 'skinShade' | 'lips' | 'hair' | 'white' | 'iris' | 'frame',
    MeshStandardMaterial
  >
  eyes: RefObject<Group | null>
  brows: RefObject<Group | null>
  mouth: RefObject<Mesh | null>
  smile: RefObject<Mesh | null>
}) {
  const c = HEAD_CENTRE
  return (
    <group>
      {/* Skull and jaw */}
      <mesh
        geometry={GEO.head}
        material={m.skin}
        position={[0, c, 0]}
        scale={[0.92, 1.06, 1]}
      />
      <mesh
        geometry={GEO.jaw}
        material={m.skin}
        position={[0, c - 0.042, -0.014]}
        scale={[0.93, 0.92, 1]}
      />
      {/* Ears */}
      <Detail>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={GEO.ear}
            material={m.skinShade}
            position={[side * 0.104, c - 0.004, 0.008]}
            scale={[0.5, 1, 0.8]}
          />
        ))}
      </Detail>
      {/* Eyes (whites and irises), which blink together */}
      <group ref={eyes} position={[0, c + 0.006, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.037, 0, 0]}>
            <mesh geometry={GEO.eyeWhite} material={m.white} position={[0, 0, -0.096]} />
            <mesh geometry={GEO.iris} material={m.iris} position={[0, 0, -0.1105]} />
          </group>
        ))}
      </group>
      {/* Brows */}
      <group ref={brows}>
        <Detail>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={GEO.brow}
              material={m.hair}
              position={[side * 0.038, c + 0.038, -0.106]}
              rotation={[0, 0, side * -0.1]}
            />
          ))}
        </Detail>
      </group>
      {/* Nose */}
      <Detail>
        <mesh
          geometry={GEO.nose}
          material={m.skinShade}
          position={[0, c - 0.02, -0.116]}
          scale={[0.7, 1.25, 0.9]}
        />
      </Detail>
      {/* Mouth: a resting smile, or lips that open while talking */}
      <mesh
        ref={mouth}
        geometry={GEO.mouth}
        material={m.lips}
        position={[0, c - 0.058, -0.101]}
      />
      <mesh
        ref={smile}
        geometry={GEO.smile}
        material={m.lips}
        position={[0, c - 0.044, -0.1]}
        rotation={[0.2, 0, Math.PI]}
        scale={[1, 0.65, 1]}
      />
      {look.beard && (
        <mesh
          geometry={GEO.beard}
          material={m.hair}
          position={[0, c - 0.02, -0.006]}
          scale={[0.98, 1.05, 1.02]}
        />
      )}
      {look.glasses && (
        <group position={[0, c + 0.006, -0.121]}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={GEO.lens}
              material={m.frame}
              position={[side * 0.037, 0, 0]}
            />
          ))}
          <mesh geometry={GEO.bridge} material={m.frame} />
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={GEO.temple}
              material={m.frame}
              position={[side * 0.1, 0.004, 0.05]}
            />
          ))}
        </group>
      )}
      <Hair style={look.hair} material={m.hair} />
    </group>
  )
}

function Hair({ style, material }: { style: HairStyle; material: MeshStandardMaterial }) {
  const c = HEAD_CENTRE
  if (style === 'bald') {
    return (
      <mesh
        geometry={GEO.hairBack}
        material={material}
        position={[0, c - 0.012, 0.004]}
        scale={[0.97, 0.7, 1.0]}
      />
    )
  }
  if (style === 'curly') {
    return (
      <mesh
        geometry={GEO.curls}
        material={material}
        position={[0, c + 0.032, 0.018]}
        scale={[0.95, 0.88, 1.0]}
        rotation={[0.5, 0.3, 0]}
      />
    )
  }
  const cap = (
    <mesh
      geometry={GEO.hairCap}
      material={material}
      position={[0, c + (style === 'crop' ? 0.002 : 0.006), 0.004]}
      rotation={[0.55, 0, 0]}
      scale={style === 'crop' ? [0.94, 1.02, 0.98] : [0.97, 1.08, 1.03]}
    />
  )
  const back = (
    <mesh
      geometry={GEO.hairBack}
      material={material}
      position={[0, c, 0.004]}
      scale={[0.97, 1.02, 1.03]}
    />
  )
  switch (style) {
    case 'crop':
      return cap
    case 'short':
      return (
        <>
          {cap}
          {back}
        </>
      )
    case 'side':
      return (
        <>
          {cap}
          {back}
          <mesh
            geometry={GEO.fringe}
            material={material}
            position={[0.03, c + 0.085, -0.075]}
            rotation={[0.5, 0, -0.25]}
          />
        </>
      )
    case 'bob':
      return (
        <>
          {cap}
          {back}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={GEO.sideLock}
              material={material}
              position={[side * 0.103, c - 0.04, 0.0]}
              scale={[1, 0.75, 1.2]}
            />
          ))}
          <mesh
            geometry={GEO.longHair}
            material={material}
            position={[0, c - 0.055, 0.075]}
            scale={[1.02, 0.6, 1]}
          />
        </>
      )
    case 'long':
      return (
        <>
          {cap}
          {back}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={GEO.sideLock}
              material={material}
              position={[side * 0.1, c - 0.09, 0.02]}
            />
          ))}
          <mesh
            geometry={GEO.longHair}
            material={material}
            position={[0, c - 0.13, 0.072]}
          />
        </>
      )
    case 'bun':
      return (
        <>
          {cap}
          {back}
          <mesh geometry={GEO.bun} material={material} position={[0, c + 0.085, 0.085]} />
        </>
      )
    case 'ponytail':
      return (
        <>
          {cap}
          {back}
          <mesh
            geometry={GEO.bun}
            material={material}
            position={[0, c + 0.03, 0.12]}
            scale={0.6}
          />
          <mesh
            geometry={GEO.tail}
            material={material}
            position={[0, c - 0.07, 0.138]}
            rotation={[0.18, 0, 0]}
          />
        </>
      )
  }
}

// ---------------------------------------------------------------------------
// Walking
// ---------------------------------------------------------------------------

/**
 * A person who walks a route through the office: along each leg of the path,
 * a pause to stand and look around, a turn, and on again. The path should
 * run through open floor.
 */
export function Walker({
  path,
  look,
  speed = 0.8,
  pause = 4,
  phase = 0,
}: {
  path: Vector[]
  look: PersonLook
  speed?: number
  /** Seconds standing still at each end of the route. */
  pause?: number
  phase?: number
}) {
  const group = useRef<Group>(null)
  const motion = useRef<Motion>({ walking: false })
  const state = useRef({ leg: 0, along: 0, waited: 0, heading: 0 })

  // Out and back along the path.
  const route = useMemo(() => [...path, ...path.slice(1, -1).reverse()], [path])

  useFrame((_, rawDelta) => {
    const g = group.current
    if (!g || STILL) return
    const delta = Math.min(rawDelta, 0.1)
    const s = state.current
    const from = route[s.leg % route.length]
    const to = route[(s.leg + 1) % route.length]
    const dx = to[0] - from[0]
    const dz = to[2] - from[2]
    const length = Math.hypot(dx, dz)
    const heading = Math.atan2(-dx, -dz)

    // Turn to face the way ahead before setting off.
    const turnLeft = Math.atan2(
      Math.sin(heading - s.heading),
      Math.cos(heading - s.heading),
    )
    const turning = Math.abs(turnLeft) > 0.08
    s.heading += turnLeft * Math.min(1, delta * 3.5)

    const endOfRoute = s.leg % (route.length / 2 || 1) === 0 && s.along === 0
    if (endOfRoute && s.waited < pause) {
      s.waited += delta
      motion.current.walking = false
    } else if (turning && s.along === 0) {
      motion.current.walking = false
    } else {
      s.waited = 0
      motion.current.walking = true
      s.along += speed * delta
      if (s.along >= length) {
        s.along = 0
        s.leg = (s.leg + 1) % route.length
      }
    }
    const f = length ? s.along / length : 0
    g.position.set(from[0] + dx * f, 0, from[2] + dz * f)
    g.rotation.y = s.heading
  })

  return (
    <group ref={group} position={path[0]}>
      {/* A soft shadow that goes with them */}
      <mesh
        geometry={GEO.blob}
        position={[0, 0.004, 0]}
        rotation={[Math.PI, 0, 0]}
        scale={[0.32, 0.001, 0.26]}
      >
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>
      <Person look={look} phase={phase} motion={motion} />
    </group>
  )
}
