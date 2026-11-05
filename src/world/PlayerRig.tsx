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
  BIKE_SPEED,
  body as makeBody,
  drive,
  type CarState,
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
import { Particles } from './vfx/Particles'

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

export type Ride = 'bike' | 'car' | null

export interface Vehicles {
  bike: boolean
  /** Where a leased car is parked (null without one). */
  car: { x: number; z: number; heading: number } | null
  /** On the bike or in the car now (the page's record). */
  riding: Ride
  /** Got on, in, off or out; with where the car was left. */
  onChange: (riding: Ride, car?: { x: number; z: number; heading: number }) => void
  /** The model under or around the player. */
  render: (kind: 'bike' | 'car') => ReactNode
}

/** What the page around the 3D view tells the player (outside the canvas). */
export interface Prompt {
  /** The key to press, if not the usual one (F for vehicles). */
  key?: string
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
  /** In the street: the bike and a leased car (F to get on or in, and off or out). */
  vehicles?: Vehicles
  /** The floor underfoot by position (the street: road or pavement). */
  surfaceAt?: (x: number, z: number) => Surface
  /** What the floor is, for footsteps. */
  surface?: Surface
  /** Low graphics: fewer frames while moving. */
  low?: boolean
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
  const ride = useRef<Ride>(props.vehicles?.riding ?? null)
  const car = useRef<CarState>({ x: 0, z: 0, heading: 0, speed: 0 })
  const pedal = useRef(0)
  const engine = useRef(0)
  const [riding, setRiding] = useState<Ride>(ride.current)
  // The page can put the player on or off the bike (its list button).
  const pageRide = props.vehicles?.riding ?? null
  useEffect(() => {
    if (pageRide === ride.current) return
    if (pageRide !== 'car') {
      ride.current = pageRide
      setRiding(pageRide)
    }
  }, [pageRide])
  // Walking to a spot: how close it has got, and for how long it has made no progress.
  const approach = useRef({ x: NaN, z: NaN, best: Infinity, stuck: 0, time: 0 })
  /** Steps into place through furniture once close, or when it is blocked. */
  function through(tx: number, tz: number, s: Body, dt: number): boolean {
    if (approach.current.x !== tx || approach.current.z !== tz)
      approach.current = { x: tx, z: tz, best: Infinity, stuck: 0, time: 0 }
    const a = approach.current
    const d = Math.hypot(tx - s.x, tz - s.z)
    a.time += dt * speedUp()
    if (d < a.best - 0.02) {
      a.best = d
      a.stuck = 0
    } else a.stuck += dt
    // Close by, blocked, or sliding along a wall for too long: step through.
    return d < 1.2 || a.stuck > 0.4 || a.time > 2.5 + d / 4
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
    // Real time (up to a second, if the computer draws slowly), moved in
    // small steps so collisions stay exact: the same pace however fast it draws.
    if (import.meta.env.DEV) {
      const w = window as unknown as { __worksimFrames?: number }
      w.__worksimFrames = (w.__worksimFrames ?? 0) + 1
    }
    const dt = Math.min(raw, 1)
    const steps = Math.max(1, Math.ceil(dt / 0.04))
    const sub = dt / steps
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
      const v = latest.current.vehicles
      // F: on or off the bike, into or out of the car.
      if (v && pressed.includes('vehicle')) {
        if (ride.current === 'car') {
          // Out on the driver's side; the car stays where it is.
          const c = car.current
          s = {
            ...s,
            x: c.x - Math.cos(c.heading) * 1.4,
            z: c.z + Math.sin(c.heading) * 1.4,
            heading: c.heading,
            speed: 0,
          }
          ride.current = null
          v.onChange(null, { x: c.x, z: c.z, heading: c.heading })
          audio.play('door')
        } else if (ride.current === 'bike') {
          ride.current = null
          v.onChange(null)
        } else if (v.car && Math.hypot(v.car.x - s.x, v.car.z - s.z) < 3.2) {
          car.current = { ...v.car, speed: 0 }
          ride.current = 'car'
          v.onChange('car')
          audio.play('door')
        } else if (v.bike) {
          ride.current = 'bike'
          v.onChange('bike')
        }
        if (ride.current !== riding) setRiding(ride.current)
        rig.current = null
      }
      const before = s
      if (ride.current === 'car') {
        for (let k = 0; k < steps; k++)
          car.current = drive(car.current, input, sub, boxes)
        const c = car.current
        s = { ...s, x: c.x, z: c.z, heading: c.heading, speed: Math.abs(c.speed), y: 0 }
        rig.current = clipFrame('drive', clock.current)
        engine.current += dt
        if (engine.current > 0.8) {
          engine.current = 0
          audio.play('engine')
        }
      } else if (ride.current === 'bike') {
        for (let k = 0; k < steps; k++)
          s = step(
            s,
            { ...input, jump: false, crouch: false },
            o.yaw,
            sub,
            boxes,
            BIKE_SPEED,
          )
        pedal.current += dt * Math.min(1.4, s.speed / 4)
        rig.current = clipFrame('cycle', pedal.current)
      } else {
        for (let k = 0; k < steps; k++)
          s = step(s, { ...input, jump: input.jump && k === 0 }, o.yaw, sub, boxes)
        if (!before.grounded && s.grounded) audio.play('step')
        // Footsteps in time with the walk (two a stride).
        footsteps(s, dt)
      }
      clock.current += dt
      // What is near enough to use (not from the car).
      const near = ride.current === 'car' ? null : nearest(s.x, s.z, spots)
      const carNear =
        !near && !ride.current && v?.car && Math.hypot(v.car.x - s.x, v.car.z - s.z) < 3.2
      if (carNear || (ride.current && !near)) {
        const text =
          ride.current === 'car'
            ? 'get out of the car'
            : ride.current === 'bike'
              ? 'get off your bike'
              : 'get into your car'
        if (text !== lastPrompt.current) {
          lastPrompt.current = text
          latest.current.onPrompt({ key: 'F', text, blocked: null })
        }
      }
      const text = near ? near.activity.prompt : null
      if (!(carNear || (ride.current && !near)) && text !== lastPrompt.current) {
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
      if (near && pressed.includes('interact')) {
        // Off the bike first (a door, a counter).
        if (ride.current === 'bike' && v) {
          ride.current = null
          setRiding(null)
          v.onChange(null)
          rig.current = null
        }
        begin(near.activity)
      }
      motion.current = ride.current
        ? { walking: false }
        : {
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
        let r = { body: s, arrived: false }
        for (let k = 0; k < steps && !r.arrived; k++)
          r = walkTo(r.body, a.anchor.x, a.anchor.z, sub, boxes, 1.9 * speedUp(), ghost)
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
          const ghost = through(next.x, next.z, s, dt)
          let r = { body: s, arrived: false }
          for (let k = 0; k < steps && !r.arrived; k++)
            r = walkTo(
              r.body,
              next.x,
              next.z,
              sub,
              boxes,
              (current.stage.run ? 3.6 : 1.9) * speedUp(),
              ghost,
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
    if (ride.current === 'car') {
      o.distance += (7 - o.distance) * Math.min(1, dt * 2)
      // Behind the car, unless the player is turning the camera.
      o.yaw = turnTowards(o.yaw, s.heading, dt * 1.5)
    }
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
    let settling =
      Math.abs(goal[0] - camera.position.x) +
        Math.abs(goal[1] - camera.position.y) +
        Math.abs(goal[2] - camera.position.z) >
      0.003
    // A camera still not settled after a moment with nothing pressed snaps into
    // place, so the view never keeps redrawing for nothing.
    if (settling && controls.current.held.size === 0 && s.speed === 0) {
      unsettled.current += dt
      if (unsettled.current > 1.5) {
        camera.position.set(goal[0], goal[1], goal[2])
        camera.lookAt(eye[0], eye[1] - 0.15, eye[2])
        settling = false
      }
    } else unsettled.current = 0
    if (
      settling ||
      s.speed > 0 ||
      !s.grounded ||
      mode.current.kind !== 'free' ||
      controls.current.held.size > 0
    )
      redraw()
  }

  // At most 30 frames a second while something moves (20 on low graphics):
  // smooth enough, and kind to computers that draw 3D without a graphics card.
  const pending = useRef(false)
  const unsettled = useRef(0)
  function redraw() {
    if (pending.current) return
    pending.current = true
    window.setTimeout(
      () => {
        pending.current = false
        invalidate()
      },
      latest.current.low ? 50 : 33,
    )
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
  const clock = useRef(0)
  function footsteps(s: Body, dt: number) {
    if (s.speed < 0.3 || !s.grounded) return
    stride.current += dt
    const every = s.speed > 3 ? 0.32 : 0.5
    if (stride.current >= every) {
      stride.current = 0
      const p = state.current
      audio.play('step', {
        surface: latest.current.surfaceAt?.(p.x, p.z) ?? latest.current.surface ?? 'wood',
      })
    }
  }

  const holding: { left?: ReactNode; right?: ReactNode } = {
    left: held.left ? <Prop kind={held.left} /> : undefined,
    right: held.right ? <Prop kind={held.right} /> : undefined,
  }

  // The exhaust, from the back of the car (left in the air behind it as it moves).
  const tailpipe = () => {
    const c = car.current
    return [
      c.x + Math.sin(c.heading) * 2.05 + Math.cos(c.heading) * 0.55,
      0.3,
      c.z + Math.cos(c.heading) * 2.05 - Math.sin(c.heading) * 0.55,
    ] as [number, number, number]
  }

  return (
    <>
      {riding === 'car' && (
        <Particles kind="exhaust" at={[0, 0, 0]} active track={tailpipe} />
      )}
      <group ref={group}>
        {riding && props.vehicles?.render(riding)}
        <group
          position={
            riding === 'car'
              ? [-0.4, 0.05, 0.25]
              : riding === 'bike'
                ? [0, 0, 0.1]
                : [0, 0, 0]
          }
        >
          <Person
            look={props.look}
            phase={0.3}
            motion={motion}
            rig={rig}
            hold={holding}
            hands={hands}
          />
        </group>
      </group>
    </>
  )
}
