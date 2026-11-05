/**
 * The player in 3D: walks, runs, crouches and jumps where the keys say,
 * relative to a third-person camera turned by the mouse; cannot go through
 * walls or furniture; and does things. Near something usable it offers
 * "Press E to …"; then it walks to the right spot, faces the right way and
 * plays the activity's stages (with sounds and effects at their moments).
 * The game action is completed only when the activity finishes; moving or
 * pressing E again stops it part way, and nothing is given.
 *
 * Used by every place with a walkable 3D view, so they all behave the same.
 */
import { useFrame, useThree } from '@react-three/fiber'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import type { Group } from 'three'
import { audio, type Surface } from '../audio/manager'
import { Person, type Motion, type PersonLook } from '../office/scene/people'
import { cameraAt, clampOrbit, clearance, type Orbit } from './character/camera'
import {
  body as makeBody,
  nearest,
  NO_INPUT,
  step,
  turnTowards,
  walkTo,
  type Body,
  type Box,
} from './character/controller'
import { clipFrame, type RigFrame } from './character/rig'
import {
  heldAt,
  labelAt,
  soundsBetween,
  stageAt,
  type Activity,
  type PropKind,
} from './interaction/activity'
import type { Control } from './keys'
import { Prop } from './props'

/** What is happening now, for the room's objects (a barbell, a shower) to follow. */
export interface ActivityNow {
  id: string | null
  /** Seconds into the activity. */
  t: number
  /** Where the player is (for objects that react to them). */
  x: number
  z: number
}

export interface Hands {
  left: Group | null
  right: Group | null
}

/** What the page around the 3D view tells the player (outside the canvas). */
export interface Prompt {
  text: string
  /** Why it cannot be done now, if not. */
  blocked: string | null
}

export interface Controls {
  /** Controls held down now. */
  held: Set<Control>
  /** Controls pressed once since the last frame (interact, jump, vehicle). */
  pressed: Control[]
  /** Mouse movement since the last frame (pixels), and wheel. */
  dx: number
  dy: number
  zoom: number
}

export interface PlayerRigProps {
  start: { x: number; z: number; heading: number }
  boxes: Box[]
  ceiling?: number
  /** Where the camera looks from, when the player first comes in. */
  startOrbit?: Partial<Orbit>
  activities: Activity[]
  /** Why an activity cannot be done now (its game action), or null. */
  blocked: (a: Activity) => string | null
  controls: RefObject<Controls>
  /** An activity asked for from the list beside the view (by id), with a counter. */
  request: { id: string; nonce: number } | null
  onPrompt: (prompt: Prompt | null) => void
  onProgress: (progress: { label: string; progress: number } | null) => void
  /** The activity finished (completed) or was stopped part way. */
  onDone: (a: Activity, completed: boolean) => void
  look: PersonLook
  /** Called once the player is in the room and can do things. */
  onReady?: () => void
  /** What the floor is, for footsteps. */
  surface?: Surface
  now: RefObject<ActivityNow>
  hands: RefObject<Hands>
}

type Mode =
  | { kind: 'free' }
  | { kind: 'going'; activity: Activity }
  | {
      kind: 'acting'
      activity: Activity
      t: number
      /** The stage whose spot the character has reached, and where that is. */
      placed: number
      /** The camera's way round for this spot (chosen once it is reached). */
      view?: number
      at: { x: number; z: number; heading: number; y?: number }
    }

const EYE = 1.5

/** In development only, browser tests can play activities faster. */
function speedUp(): number {
  if (!import.meta.env.DEV) return 1
  // Set by tests on the page, and kept across a reload in this tab.
  const set = (window as unknown as { __worksimSpeed?: number }).__worksimSpeed
  const kept = Number(window.sessionStorage?.getItem('worksim.testSpeed'))
  const v = typeof set === 'number' ? set : kept
  return v > 0 ? v : 1
}

/** When a stage starts, in seconds from the start of the activity. */
function startOf(a: Activity, index: number): number {
  return a.stages.slice(0, index).reduce((sum, st) => sum + st.seconds, 0)
}

export function PlayerRig(props: PlayerRigProps) {
  const { boxes, ceiling, activities, controls, now, hands } = props
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const group = useRef<Group>(null)
  const motion = useRef<Motion>({ walking: false })
  const rig = useRef<RigFrame | null>(null)
  const state = useRef<Body>(makeBody(props.start.x, props.start.z, props.start.heading))
  const orbit = useRef<Orbit>(
    clampOrbit({
      yaw: props.start.heading,
      pitch: 0.32,
      distance: 3.6,
      ...props.startOrbit,
    }),
  )
  const mode = useRef<Mode>({ kind: 'free' })
  // Walking to a spot: how close it has got, and for how long it has made no progress.
  const approach = useRef({ x: NaN, z: NaN, best: Infinity, stuck: 0 })
  /** Steps into place through furniture once close, or when it is blocked. */
  function through(tx: number, tz: number, s: Body, dt: number): boolean {
    if (approach.current.x !== tx || approach.current.z !== tz)
      approach.current = { x: tx, z: tz, best: Infinity, stuck: 0 }
    const a = approach.current
    const d = Math.hypot(tx - s.x, tz - s.z)
    if (d < a.best - 0.02) {
      a.best = d
      a.stuck = 0
    } else a.stuck += dt
    return d < 1.2 || a.stuck > 0.4
  }
  const lastPrompt = useRef<string | null>(null)
  const lastProgress = useRef(-1)
  const [held, setHeld] = useState<{ left?: PropKind; right?: PropKind }>({})
  const heldKey = useRef('')
  // Callbacks change on every render of the page; the loop reads the latest.
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })
  const spots = useMemo(
    () => activities.map((a) => ({ ...a.spot, activity: a })),
    [activities],
  )

  function begin(a: Activity) {
    const why = latest.current.blocked(a)
    if (why) {
      latest.current.onPrompt({ text: a.prompt, blocked: why })
      audio.play('error')
      return
    }
    mode.current = { kind: 'going', activity: a }
    latest.current.onPrompt(null)
    // Shown from the start, while the character walks over.
    latest.current.onProgress({ label: `Going to ${a.prompt}`, progress: 0 })
    lastPrompt.current = null
  }

  function stop(completed: boolean) {
    const m = mode.current
    if (m.kind === 'free') return
    mode.current = { kind: 'free' }
    rig.current = null
    now.current = { ...now.current, id: null, t: 0 }
    latest.current.onProgress(null)
    lastProgress.current = -1
    if (heldKey.current) {
      heldKey.current = ''
      setHeld({})
    }
    // The character stands up where they are; the next step moves them clear of furniture.
    latest.current.onDone(m.activity, completed)
  }

  // A request from the list: walk there and do it.
  const request = props.request
  useEffect(() => {
    if (!request) return
    const a = activities.find((x) => x.id === request.id || x.action === request.id)
    if (a) {
      if (mode.current.kind !== 'free') stop(false)
      begin(a)
      invalidate()
    }
    // Only a new request (nonce) starts something.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce])

  useEffect(() => {
    latest.current.onReady?.()
  }, [])

  // Leaving the place mid-activity gives nothing.
  useEffect(
    () => () => {
      if (mode.current.kind !== 'free') {
        const m = mode.current
        mode.current = { kind: 'free' }
        latest.current.onDone(m.activity, false)
      }
    },
    [],
  )

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05)
    const c = controls.current
    const pressed = c.pressed.splice(0)
    const h = c.held
    const o = orbit.current
    // The camera: mouse, wheel and keys.
    let turned = c.dx !== 0 || c.dy !== 0 || c.zoom !== 0
    o.yaw -= c.dx * 0.0045
    o.pitch += c.dy * 0.0035
    o.distance *= 1 + c.zoom * 0.0012
    c.dx = c.dy = c.zoom = 0
    const turn = (h.has('turnLeft') ? 1 : 0) - (h.has('turnRight') ? 1 : 0)
    const zoom = (h.has('zoomOut') ? 1 : 0) - (h.has('zoomIn') ? 1 : 0)
    if (turn || zoom) {
      o.yaw += turn * 1.9 * dt
      o.distance *= 1 + zoom * dt
      turned = true
    }
    Object.assign(o, clampOrbit(o))

    const m = mode.current
    const moveKeys = h.has('forward') || h.has('back') || h.has('left') || h.has('right')
    let s = state.current

    if (m.kind === 'free') {
      const input = {
        ...NO_INPUT,
        forward: (h.has('forward') ? 1 : 0) - (h.has('back') ? 1 : 0),
        right: (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0),
        run: h.has('run'),
        crouch: h.has('crouch'),
        jump: pressed.includes('jump'),
      }
      const before = s
      s = step(s, input, o.yaw, dt, boxes)
      if (!before.grounded && s.grounded) audio.play('step')
      // Footsteps in time with the walk (two a stride).
      footsteps(s, dt)
      // What is near enough to use.
      const near = nearest(s.x, s.z, spots)
      const text = near ? near.activity.prompt : null
      if (text !== lastPrompt.current) {
        lastPrompt.current = text
        latest.current.onPrompt(
          near
            ? {
                text: near.activity.prompt,
                blocked: latest.current.blocked(near.activity),
              }
            : null,
        )
      }
      if (near && pressed.includes('interact')) begin(near.activity)
      motion.current = {
        walking: s.speed > 0.2,
        running: s.speed > 3,
        crouching: input.crouch,
        airborne: !s.grounded,
      }
    } else if (m.kind === 'going') {
      if (pressed.includes('interact') || moveKeys) stop(false)
      else {
        const a = m.activity
        const ghost = through(a.anchor.x, a.anchor.z, s, dt)
        const r = walkTo(s, a.anchor.x, a.anchor.z, dt, boxes, 1.9 * speedUp(), ghost)
        s = r.body
        footsteps(s, dt)
        motion.current = { walking: s.speed > 0.2 }
        if (r.arrived) {
          s = { ...s, heading: turnTowards(s.heading, a.anchor.heading, Math.PI) }
          mode.current = { kind: 'acting', activity: a, t: 0, placed: 0, at: a.anchor }
          motion.current = { walking: false }
        }
      }
    } else {
      if (pressed.includes('interact') || moveKeys) stop(false)
      else {
        const a = m.activity
        const current = stageAt(a, m.t)
        const next = current.stage.at
        if (next && m.placed < current.index) {
          // Walk (carrying what is held) to where this stage happens; the clock waits.
          rig.current = null
          const r = walkTo(
            s,
            next.x,
            next.z,
            dt,
            boxes,
            (current.stage.run ? 3.6 : 1.9) * speedUp(),
            through(next.x, next.z, s, dt),
          )
          s = r.body
          footsteps(s, dt)
          motion.current = { walking: s.speed > 0.2, running: !!current.stage.run }
          if (r.arrived) {
            m.placed = current.index
            m.at = next
            m.view = undefined
            motion.current = { walking: false }
          }
          state.current = s
          if (group.current) {
            group.current.position.set(s.x, 0, s.z)
            group.current.rotation.y = s.heading
          }
          followCamera(s, dt)
          return
        }
        m.placed = Math.max(m.placed, current.index)
        const before = m.t
        // A stage with its own spot starts there: run on to the next stage's walk.
        m.t += dt * speedUp()
        const now0 = stageAt(a, m.t)
        if (now0.stage.at && now0.index > m.placed)
          m.t = Math.min(m.t, startOf(a, now0.index))
        rig.current = clipFrame(now0.stage.clip, now0.local)
        s = { ...s, x: m.at.x, z: m.at.z, heading: m.at.heading, speed: 0, y: 0 }
        for (const id of soundsBetween(a, before, m.t)) audio.play(id)
        const hold = heldAt(a, m.t) ?? {}
        const key = `${hold.left ?? ''}|${hold.right ?? ''}`
        if (key !== heldKey.current) {
          heldKey.current = key
          setHeld(hold)
        }
        now.current = { id: a.id, t: m.t, x: s.x, z: s.z }
        const pct = Math.floor(now0.progress * 100)
        if (pct !== lastProgress.current) {
          lastProgress.current = pct
          latest.current.onProgress({ label: labelAt(a, m.t), progress: now0.progress })
        }
        // During an activity the camera eases round to watch, from the front and
        // side if that view is clear, else from a side or over the shoulder.
        if (!turned) {
          if (m.view === undefined) m.view = viewFor(m.at, a.anchor.y ?? 0)
          const want = m.view
          o.yaw = turnTowards(o.yaw, want, dt * 1.2)
          o.distance += (3.2 - o.distance) * Math.min(1, dt * 1.5)
          o.pitch += (0.42 - o.pitch) * Math.min(1, dt * 1.5)
        }
        if (now0.done) stop(true)
      }
    }
    state.current = s
    if (mode.current.kind !== 'acting') now.current = { ...now.current, x: s.x, z: s.z }

    const g = group.current
    if (g) {
      const lift = mode.current.kind === 'acting' ? (mode.current.at.y ?? 0) : 0
      g.position.set(s.x, s.y + lift, s.z)
      g.rotation.y = s.heading
    }
    followCamera(s, dt)
  })

  /** The camera follows smoothly and stays clear of walls. */
  function followCamera(s: Body, dt: number) {
    const o = orbit.current
    const lying = rig.current && rig.current.pitch > 1
    const eye: [number, number, number] = [
      s.x,
      (lying ? 0.9 : motion.current.crouching ? 1.05 : EYE) + s.y,
      s.z,
    ]
    const goal = cameraAt(eye, o, boxes, ceiling)
    const k = 1 - Math.exp(-dt * 9)
    camera.position.set(
      camera.position.x + (goal[0] - camera.position.x) * k,
      camera.position.y + (goal[1] - camera.position.y) * k,
      camera.position.z + (goal[2] - camera.position.z) * k,
    )
    camera.lookAt(eye[0], eye[1] - 0.15, eye[2])
    // Draw again at full speed only while something is changing: moving,
    // acting, keys held, or the camera still settling. Otherwise the slow
    // ticker keeps idle breathing going without using the computer for nothing.
    const settling =
      Math.abs(goal[0] - camera.position.x) +
        Math.abs(goal[1] - camera.position.y) +
        Math.abs(goal[2] - camera.position.z) >
      0.003
    if (
      settling ||
      s.speed > 0 ||
      !s.grounded ||
      mode.current.kind !== 'free' ||
      controls.current.held.size > 0
    )
      invalidate()
  }

  /** The first camera angle round a spot with a clear view of the character. */
  function viewFor(at: { x: number; z: number; heading: number }, lift: number): number {
    const h = at.heading
    const eye: [number, number, number] = [at.x, 1.2 + lift, at.z]
    for (const yaw of [
      h + Math.PI + 0.7,
      h + Math.PI - 0.7,
      h + 1.3,
      h - 1.3,
      h + 0.5,
      h,
    ])
      if (clearance(eye, { yaw, pitch: 0.42, distance: 3.2 }, boxes) >= 2.4) return yaw
    return h + 0.4
  }

  const stride = useRef(0)
  function footsteps(s: Body, dt: number) {
    if (s.speed < 0.3 || !s.grounded) return
    stride.current += dt
    const every = s.speed > 3 ? 0.32 : 0.5
    if (stride.current >= every) {
      stride.current = 0
      audio.play('step', { surface: latest.current.surface ?? 'wood' })
    }
  }

  const holding: { left?: ReactNode; right?: ReactNode } = {
    left: held.left ? <Prop kind={held.left} /> : undefined,
    right: held.right ? <Prop kind={held.right} /> : undefined,
  }

  return (
    <group ref={group}>
      <Person
        look={props.look}
        phase={0.3}
        motion={motion}
        rig={rig}
        hold={holding}
        hands={hands}
      />
    </group>
  )
}
