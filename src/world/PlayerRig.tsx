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
 *
 * What is solid comes from what is drawn (physics/solids.ts), on top of the
 * place's own walls; walks to an activity find a way round things
 * (physics/nav.ts) and only step into place at the very end.
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
import { Vector3, type Group } from 'three'
import { audio, type Surface } from '../audio/manager'
import { Person, type Motion, type PersonLook } from '../office/scene/people'
import {
  cameraAt,
  clampOrbit,
  clearance,
  ORBIT_LIMITS,
  type Orbit,
} from './character/camera'
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
  blocked as overlapsAny,
} from './character/controller'
import { buildGrid, findPath, nearestFree, type Grid, type Point } from './physics/nav'
import { scanSolids, tall } from './physics/solids'
import { othersThan, removeBody, setBody } from './npc/bodies'
import {
  approachPoint,
  engage,
  nearestNpc,
  npc as npcById,
  release,
  talkPrompt,
  type Npc,
} from './npc/people'
import { CollisionDebug } from './physics/CollisionDebug'
import { useCollisionDebug } from './physics/useCollisionDebug'
import { clipFrame, type RigFrame } from './character/rig'
import { fitToWorld } from './npc/activities'
import {
  heldAt,
  labelAt,
  soundsBetween,
  stageAt,
  type Activity,
  type PropKind,
} from './interaction/activity'
import type { Control } from './keys'
import { phoneIsOpen } from '../phone/store'
import { mapIsOpen, setPose, setRouter } from './map/store'
import { beginMoment, momentClips, momentNow } from './npc/moment'
import { setCapture } from '../phone/photos'
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
  /** The camera looks straight down on the character (a top-down view of the floor). */
  overhead?: boolean
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
  /** The street: shown on the maps (where the player is, and the way to the destination). */
  mapped?: boolean
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
/** Clear floor needed to stand and talk to someone. */
const RADIUS_TALK = 0.3

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
  const { ceiling, activities, controls, now, hands } = props
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  // What is solid: the place's walls and everything drawn (read from the scene),
  // the tall things for the camera, and the walking grid (made when needed).
  const solids = useRef<{ all: Box[]; camera: Box[]; grid: Grid | null; sig: string }>({
    all: props.boxes,
    camera: props.boxes,
    grid: null,
    sig: '',
  })
  const scanAt = useRef(0.3)
  const debug = useCollisionDebug()
  const [shown, setShown] = useState<Box[]>([])
  function rescan() {
    const g = group.current
    if (!g?.parent) return
    const found = scanSolids(scene, g, g.parent)
    const all = [...latest.current.boxes, ...found]
    // The same shapes as before: keep the walking grid.
    let sig = String(all.length)
    for (const b of all) sig += `,${b.x.toFixed(2)}:${b.z.toFixed(2)}:${b.hx.toFixed(2)}`
    if (sig === solids.current.sig) return
    solids.current = {
      all,
      camera: [...latest.current.boxes, ...tall(found)],
      grid: null,
      sig,
    }
    if (debug) setShown(all)
    if (import.meta.env.DEV)
      (window as unknown as { __worksimSolids?: Box[] }).__worksimSolids = all
  }
  function grid(): Grid {
    if (!solids.current.grid) solids.current.grid = buildGrid(solids.current.all, 0.32)
    return solids.current.grid
  }
  // Walking somewhere: the way round things, and the point being walked to.
  const route = useRef<{ x: number; z: number; points: Point[]; tries: number } | null>(
    null,
  )
  const [path, setPath] = useState<Point[]>([])
  /**
   * The next point to walk to on the way to (tx, tz), and whether to step
   * straight there through furniture (the last bit into place, or when the
   * way is blocked after trying again).
   */
  function waypoint(
    tx: number,
    tz: number,
    s: Body,
    dt: number,
  ): { to: Point; ghost: boolean } {
    let r = route.current
    if (!r || r.x !== tx || r.z !== tz) {
      const points = findPath(grid(), s, { x: tx, z: tz }) ?? [{ x: tx, z: tz }]
      r = route.current = { x: tx, z: tz, points, tries: 0 }
      approach.current = { x: NaN, z: NaN, best: Infinity, stuck: 0, time: 0 }
      if (debug) setPath([{ x: s.x, z: s.z }, ...points])
    }
    // Past each point on the way.
    while (
      r.points.length > 1 &&
      Math.hypot(r.points[0].x - s.x, r.points[0].z - s.z) < 0.25
    )
      r.points.shift()
    const to = r.points[0]
    const last = r.points.length === 1
    const stuck = through(to.x, to.z, s, dt)
    if (stuck && !last && r.tries < 2) {
      // Something was in the way (a person): find the way again from here.
      r.tries++
      r.points = findPath(grid(), s, { x: tx, z: tz }) ?? [{ x: tx, z: tz }]
      approach.current = { x: NaN, z: NaN, best: Infinity, stuck: 0, time: 0 }
      return { to: r.points[0], ghost: false }
    }
    return { to, ghost: stuck && (last || r.tries >= 2) }
  }
  // After an activity, inside furniture (a chair pulled in): step out to clear floor.
  const exit = useRef<Point | null>(null)
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
    // Just short of the spot, or no nearer for a while: step through.
    return d < 0.6 || a.stuck > 1 || a.time > 6 + d
  }
  const lastPrompt = useRef<string | null>(null)
  /** What the player could use or talk to now (for tests). */
  const nearNow = useRef<string | null>(null)
  /** The phone is in the character's hand. */
  const phoneOut = useRef(false)
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

  /**
   * Walking up to someone to talk (see npc/people.ts): they stop and turn to
   * the player, who stands facing them and says hello; the page then opens the
   * conversation. Watched over the player's shoulder, so their face is seen.
   */
  function talkActivity(n: Npc): Activity {
    const s = state.current
    let at = approachPoint(n, s)
    if (overlapsAny(at.x, at.z, RADIUS_TALK, solids.current.all)) {
      const f = nearestFree(grid(), at)
      if (f) at = { ...f, heading: Math.atan2(-(n.x - f.x), -(n.z - f.z)) }
    }
    return {
      id: `person:${n.who.id}`,
      action: `person:${n.who.id}`,
      prompt: talkPrompt(n),
      spot: { x: n.x, z: n.z, reach: n.reach },
      anchor: at,
      view: 'behind',
      stages: [
        {
          clip: 'wave',
          seconds: 0.9,
          label: `Saying hello to ${n.who.name.split(' ')[0]}`,
        },
      ],
    }
  }

  function talkTo(n: Npc) {
    engage(n.with ? [n.who.id, n.with] : [n.who.id])
    begin(talkActivity(n))
  }

  function begin(a: Activity) {
    const why = a.id.startsWith('person:') ? null : latest.current.blocked(a)
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
    // The character stands up where they are, then steps out to clear floor if
    // that is inside furniture (not pushed out sideways through something else).
    const s = state.current
    route.current = null
    if (overlapsAny(s.x, s.z, 0.3, solids.current.all))
      exit.current = nearestFree(grid(), s)
    // Walked off before saying hello: they go back to their day.
    if (!completed && m.activity.id.startsWith('person:')) release()
    latest.current.onDone(m.activity, completed)
  }

  // A request from the list: walk there and do it.
  const request = props.request
  useEffect(() => {
    if (!request) return
    // Someone clicked on (or chosen): walk over to talk to them.
    const person = request.id.startsWith('person:')
      ? npcById(request.id.slice('person:'.length))
      : undefined
    if (person) {
      if (mode.current.kind !== 'free') stop(false)
      talkTo(person)
      invalidate()
      return
    }
    const a = activities.find((x) => x.id === request.id || x.action === request.id)
    if (a) {
      if (mode.current.kind !== 'free') stop(false)
      begin(a)
      invalidate()
    } else {
      // Nothing here to do it with in 3D (no TV for a series, say): done at once,
      // as without 3D, rather than the button doing nothing.
      latest.current.onDone(
        {
          id: request.id,
          action: request.id,
          prompt: request.id,
          spot: { x: 0, z: 0, reach: -1 },
          anchor: { x: 0, z: 0, heading: 0 },
          stages: [],
        },
        true,
      )
    }
    // Only a new request (nonce) starts something.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce])

  useEffect(() => {
    latest.current.onReady?.()
  }, [])

  // On the maps: where the player is, and the way anywhere (by this place's walking grid).
  const mapped = props.mapped
  useEffect(() => {
    if (!mapped) return
    setRouter((to) => {
      const from = state.current
      const path = findPath(grid(), { x: from.x, z: from.z }, to)
      return path ? [{ x: from.x, z: from.z }, ...path] : null
    })
    return () => {
      setRouter(null)
      setPose(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapped])
  // The phone's camera takes a picture of this view.
  const gl = useThree((st) => st.gl)
  useEffect(() => {
    setCapture(() => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/jpeg', 0.85)
    })
    return () => setCapture(null)
  }, [gl, scene, camera])
  // In development, browser tests can find where something is drawn on screen (to click it).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __worksimProject: (x: number, y: number, z: number) => {
        const v = new Vector3(x, y, z).project(camera)
        const r = gl.domElement.getBoundingClientRect()
        return {
          x: r.left + ((v.x + 1) / 2) * r.width,
          y: r.top + ((1 - v.y) / 2) * r.height,
        }
      },
    })
  }, [camera, gl])

  // Read what is solid again when the place's walls change, or on getting into or out of the car.
  useEffect(() => {
    scanAt.current = 0.05
    invalidate()
  }, [props.boxes, riding, invalidate])
  // Turning the debug view on shows the shapes read last (read again to show them).
  useEffect(() => {
    solids.current.sig = ''
    scanAt.current = 0.05
    invalidate()
  }, [debug, invalidate])

  // Leaving the place mid-activity gives nothing.
  useEffect(
    () => () => {
      removeBody('player')
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
    // What is solid: read soon after the place appears, then every few seconds
    // (furniture bought, the car parked somewhere else).
    scanAt.current -= raw
    if (scanAt.current <= 0) {
      scanAt.current = 3
      rescan()
    }
    // The people about are solid too (they move, so they are not in the scan).
    const people = othersThan('player')
    const boxes = people.length ? [...solids.current.all, ...people] : solids.current.all
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
    // Top-down: high above, looking down on the floor (the wheel still zooms a little).
    if (c.overhead) {
      o.pitch = 1.42
      o.distance = 9 + (o.distance - ORBIT_LIMITS.minDistance) * 0.4
    }

    const m = mode.current
    // The phone is out: the character holds it up and stands still (keys go to the phone).
    // (Also while the world map is open: the keys are the map's.)
    const onPhone =
      (phoneIsOpen() || mapIsOpen()) && m.kind === 'free' && ride.current !== 'car'
    if (onPhone) pressed.splice(0)
    const moveKeys =
      !onPhone && (h.has('forward') || h.has('back') || h.has('left') || h.has('right'))
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
      if (onPhone) {
        input.forward = 0
        input.right = 0
        input.run = false
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
      } else if (exit.current && !moveKeys) {
        let r = { body: s, arrived: false }
        for (let k = 0; k < steps && !r.arrived; k++)
          r = walkTo(r.body, exit.current.x, exit.current.z, sub, boxes, 1.2, true)
        s = r.body
        if (r.arrived) exit.current = null
        redraw()
      } else {
        exit.current = null
        for (let k = 0; k < steps; k++)
          s = step(s, { ...input, jump: input.jump && k === 0 }, o.yaw, sub, boxes)
        if (!before.grounded && s.grounded) audio.play('step')
        // Footsteps in time with the walk (two a stride).
        footsteps(s, dt)
      }
      clock.current += dt
      // What is near enough to use (not from the car).
      const thing = ride.current === 'car' ? null : nearest(s.x, s.z, spots)
      // Someone to talk to, if nearer than anything to use (and in sight).
      const person =
        ride.current === 'car' ? null : nearestNpc(s.x, s.z, solids.current.camera)
      const talk =
        person &&
        (!thing || person.distance < Math.hypot(thing.x - s.x, thing.z - s.z) - 0.15)
          ? person.npc
          : null
      const near = talk ? null : thing
      nearNow.current = talk ? `person:${talk.who.id}` : (thing?.activity.id ?? null)
      const carNear =
        !near &&
        !talk &&
        !ride.current &&
        v?.car &&
        Math.hypot(v.car.x - s.x, v.car.z - s.z) < 3.2
      if (carNear || (ride.current && !near && !talk)) {
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
      const text = talk ? talkPrompt(talk) : near ? near.activity.prompt : null
      if (!(carNear || (ride.current && !near && !talk)) && text !== lastPrompt.current) {
        lastPrompt.current = text
        latest.current.onPrompt(
          talk
            ? { text: talkPrompt(talk), blocked: null }
            : near
              ? {
                  text: near.activity.prompt,
                  blocked: latest.current.blocked(near.activity),
                }
              : null,
        )
      }
      if (talk && pressed.includes('interact')) {
        if (ride.current === 'bike' && v) {
          ride.current = null
          setRiding(null)
          v.onChange(null)
          rig.current = null
        }
        talkTo(talk)
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
      // Taking the phone out, holding it, putting it away.
      if (onPhone !== phoneOut.current) {
        phoneOut.current = onPhone
        rig.current = null
        const key = onPhone ? '|phone' : ''
        heldKey.current = key
        setHeld(onPhone ? { right: 'phone' } : {})
        redraw()
      }
      // (Held still: redrawn with the rest of the place, not every frame.)
      if (onPhone) rig.current = clipFrame('phone', clock.current)
    } else if (m.kind === 'going') {
      if (pressed.includes('interact') || moveKeys) stop(false)
      else {
        const a = m.activity
        const { to, ghost } = waypoint(a.anchor.x, a.anchor.z, s, dt)
        let r = { body: s, arrived: false }
        for (let k = 0; k < steps && !r.arrived; k++)
          r = walkTo(r.body, to.x, to.z, sub, boxes, 1.9 * speedUp(), ghost)
        s = r.body
        footsteps(s, dt)
        motion.current = { walking: s.speed > 0.2 }
        if (r.arrived && (to.x !== a.anchor.x || to.z !== a.anchor.z)) r.arrived = false
        if (r.arrived) {
          route.current = null
          s = { ...s, heading: turnTowards(s.heading, a.anchor.heading, Math.PI) }
          mode.current = { kind: 'acting', activity: a, t: 0, placed: 0, at: a.anchor }
          // Arrived to say goodnight: the moment with the other person starts now.
          if (
            a.id.startsWith('date-goodnight') ||
            a.id === 'date-wedding' ||
            a.id === 'date-dance'
          )
            beginMoment()
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
          const { to, ghost } = waypoint(next.x, next.z, s, dt)
          let r = { body: s, arrived: false }
          for (let k = 0; k < steps && !r.arrived; k++)
            r = walkTo(
              r.body,
              to.x,
              to.z,
              sub,
              boxes,
              (current.stage.run ? 3.6 : 1.9) * speedUp(),
              ghost,
            )
          s = r.body
          footsteps(s, dt)
          motion.current = { walking: s.speed > 0.2, running: !!current.stage.run }
          if (r.arrived && (to.x !== next.x || to.z !== next.z)) r.arrived = false
          if (r.arrived) {
            route.current = null
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
        // On the real seat, hands on the real keyboard (see world/npc/activities.ts).
        rig.current = fitToWorld(
          clipFrame(now0.stage.clip, now0.local, now0.stage.posture),
          now0.stage.clip,
          now0.local,
          m.at,
        )
        // On a date: holding hands, then a hug or a kiss goodnight, with the other person.
        const together = a.id.startsWith('date-') ? momentNow() : null
        if (together) {
          const clip = momentClips(together.moment).player
          rig.current = fitToWorld(clipFrame(clip, together.t), clip, together.t, m.at)
        }
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
          if (m.view === undefined)
            m.view =
              a.view === 'behind'
                ? m.at.heading
                : a.view === 'side'
                  ? m.at.heading + Math.PI / 2
                  : viewFor(m.at, a.anchor.y ?? 0)
          const want = m.view
          o.yaw = turnTowards(o.yaw, want, dt * 1.2)
          o.distance += (3.2 - o.distance) * Math.min(1, dt * 1.5)
          o.pitch += (0.42 - o.pitch) * Math.min(1, dt * 1.5)
        }
        if (now0.done) stop(true)
      }
    }
    state.current = s
    setBody('player', s.x, s.z, 0.3)
    if (mode.current.kind !== 'acting') now.current = { ...now.current, x: s.x, z: s.z }
    if (import.meta.env.DEV) {
      const w = window as unknown as {
        __worksimPlayer?: { insideFrames?: number }
      }
      // Inside something solid (only free walking counts: sitting is meant to be).
      const inside =
        mode.current.kind === 'free' &&
        !exit.current &&
        overlapsAny(s.x, s.z, 0.27, boxes)
      w.__worksimPlayer = {
        x: s.x,
        z: s.z,
        mode: mode.current.kind,
        near: nearNow.current,
        prompt: lastPrompt.current,
        riding: ride.current,
        inside,
        // Frames found inside something, ever (for tests).
        insideFrames: (w.__worksimPlayer?.insideFrames ?? 0) + (inside ? 1 : 0),
      } as typeof w.__worksimPlayer
    }

    if (props.mapped) setPose({ x: s.x, z: s.z, heading: s.heading })
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
    const goal = cameraAt(eye, o, solids.current.camera, ceiling)
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
      if (
        clearance(eye, { yaw, pitch: 0.42, distance: 3.2 }, solids.current.camera) >= 2.4
      )
        return yaw
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
      {debug && <CollisionDebug boxes={shown} spots={spots} path={path} player={state} />}
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
