/**
 * The people of a place, living their day: each one where their schedule says
 * (schedule.ts), walking there round the furniture when that changes
 * (agent.ts), and doing what that place is for (typing at a desk, the phone,
 * eating, talking to a colleague). The schedule follows the game clock; while
 * the clock stands still (the player walking about), errands carry on slowly
 * (a minute every ten seconds, at most a quarter of an hour ahead) so the place
 * does not freeze. When the clock jumps on, people are already where they
 * should be. With reduced motion, people move straight to their places.
 *
 * Everyone can be talked to (see people.ts): walking up to someone, or
 * clicking them, they stop, turn to the player, wave and talk, and go back to
 * their day afterwards. Someone in a meeting only looks round and lifts a hand.
 *
 * Cheap: one frame loop for everyone, the schedule worked out twice a second,
 * ways found only when a destination changes, and fast redraws only while
 * someone is walking.
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useContext, useEffect, useMemo, useRef, type RefObject } from 'react'
import type { Group } from 'three'
import { Person, type Motion, type PersonLook } from '../../office/scene/people'
import { prefersReducedMotion } from '../../ui/motion'
import type { Who } from '../../game/encounters'
import { turnTowards, type Box } from '../character/controller'
import { clipFrame, type ClipId, type RigFrame } from '../character/rig'
import { hipHeight, sitting } from '../character/fit'
import type { PropKind } from '../interaction/activity'
import {
  allAnchors,
  anchorsVersion,
  claimSeat,
  releaseSeats,
  seatsTakenBut,
} from '../anchors'
import { activityFrame, check, holdsFor, resolvePlace, type Resolved } from './activities'
import { Held } from './Held'
import { World } from '../context'
import { buildGrid, type Point } from '../physics/nav'
import { scanSolids } from '../physics/solids'
import { agent, NPC_RADIUS, placeAt, stepAgent, type Agent, type Goal } from './agent'
import { bodyOf, othersThan, removeBody, setBody } from './bodies'
import { engagedFor, removeNpc, setNpc } from './people'
import { Talkable } from './Talkable'
import {
  doingAt,
  doingNow,
  everyone,
  speakerAt,
  type Gathering,
  type Intent,
  type Person as Someone,
  type Place,
} from './schedule'

const STILL = prefersReducedMotion()

export interface CrowdProps {
  people: Someone[]
  places: Record<string, Place>
  gatherings: Gathering[]
  door: Point
  day: number
  /** The game clock: office minutes since midnight. */
  minute: number
  looks: Record<string, PersonLook>
  /** Who each person is (name, role, kind of work, personality), for talking to them. */
  who: Record<string, Who>
  /** Who the player is talking to (by the person's talk id), if anyone. */
  talkingTo?: string | null
  low?: boolean
}

interface Live {
  agent: Agent
  motion: RefObject<Motion>
  rig: RefObject<RigFrame | null>
  group: Group | null
  /** Seconds at the current place, for sitting down first. */
  clip: number
  /** The seated place they are on (its key), and seconds getting up from it. */
  seatedAt: string | null
  rise: number
  /** Getting up from the seat this frame (not yet walking, not yet anywhere else). */
  rising: boolean
  /** What is in each hand. */
  held: { left: RefObject<PropKind | null>; right: RefObject<PropKind | null> }
  /** What they are doing now (for tests and the development view). */
  clipNow: ClipId | null
}

/** Seconds to sit down onto a seat, and to get up from it. */
const SIT_SECONDS = 1.1
const RISE_SECONDS = 0.9
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
let crowds = 0

export function Crowd(props: CrowdProps) {
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  const world = useContext(World)
  const root = useRef<Group>(null)
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })
  // One record per person, kept across renders.
  const lives = useMemo(() => {
    const map = new Map<string, Live>()
    for (const p of props.people)
      map.set(p.id, {
        agent: agent(p.id),
        motion: { current: { walking: false } },
        rig: { current: null },
        group: null,
        clip: 0,
        seatedAt: null,
        rise: 0,
        rising: false,
        held: { left: { current: null }, right: { current: null } },
        clipNow: null,
      })
    return map
  }, [props.people])
  const state = useRef({
    solids: null as Box[] | null,
    grid: null as ReturnType<typeof buildGrid> | null,
    scanIn: 0.3,
    planIn: 0,
    intents: new Map<string, Intent>(),
    /** The game clock last seen, and real seconds since it last changed. */
    minute: NaN,
    still: 0,
    seconds: 0,
    placed: false,
    /** The places, checked against the furniture really there (activities.ts). */
    resolved: new Map<string, Resolved>(),
    version: -1,
  })
  const owner = useMemo(() => `crowd:${crowds++}`, [])
  useEffect(() => () => releaseSeats(owner), [owner])
  const pending = useRef(false)

  useEffect(
    () => () => {
      for (const id of lives.keys()) {
        removeBody(id)
        removeNpc(id)
      }
    },
    [lives],
  )

  function goalFor(intent: Intent | undefined): Goal | null {
    if (!intent || intent.kind === 'away') return null
    const place = latest.current.places[intent.place]
    if (!place) return null
    return { key: intent.place, x: place.x, z: place.z, heading: place.heading }
  }

  useFrame((_, raw) => {
    const s = state.current
    const p = latest.current
    const dt = Math.min(raw, 1)
    s.seconds += dt
    // What is solid (read once the place has appeared).
    if (!s.grid) {
      s.scanIn -= raw
      if (s.scanIn <= 0 && root.current?.parent) {
        s.solids = scanSolids(scene, root.current, root.current.parent)
        s.grid = buildGrid(s.solids, NPC_RADIUS + 0.04)
      }
    }
    // The clock: a jump forward (or the first look) puts everyone in place.
    const jumped = !Number.isFinite(s.minute) || Math.abs(p.minute - s.minute) >= 5
    if (p.minute !== s.minute) s.still = 0
    else s.still += dt
    s.minute = p.minute
    s.planIn -= dt
    if (s.version !== anchorsVersion()) {
      // The furniture has appeared (or changed): each place's seat and what can be done there.
      s.version = anchorsVersion()
      releaseSeats(owner)
      const anchors = allAnchors()
      const taken = seatsTakenBut(owner)
      s.resolved = new Map()
      for (const [key, place] of Object.entries(p.places)) {
        const r = resolvePlace(place, anchors, taken)
        if (r.seat) {
          taken.add(r.seat.id)
          claimSeat(r.seat.id, owner)
        }
        s.resolved.set(key, r)
      }
    }
    if (s.planIn <= 0 || jumped) {
      s.planIn = 0.5
      const errandMinute = p.minute + Math.min(15, Math.floor(s.still / 10))
      // The player coming to talk, or talking: that person is at their own place.
      const doing = world?.now.current?.id ?? null
      const attending = new Set(
        p.people
          .filter(
            (q) =>
              (q.speaker && q.speaker === p.talkingTo) || (q.talk && q.talk === doing),
          )
          .map((q) => q.id),
      )
      s.intents = everyone(p.people, p.day, p.minute, p.gatherings, {
        errandMinute,
        attending,
      })
    }
    let walking = false
    // Someone came in or left this frame (the dev snapshot is taken at once).
    let appeared = false
    // At a meeting, people speak in turn (the host every other turn); while the
    // player gives their update, everyone listens.
    const now = world?.now.current
    const playerSpeaking =
      !!now?.id?.startsWith('meeting:') && now.t > 8.2 && now.t < 11.7
    const there = p.people.filter((q) => {
      const intent = s.intents.get(q.id)
      return (
        intent?.kind === 'at' &&
        intent.reason === 'meeting' &&
        lives.get(q.id)!.agent.status === 'there' &&
        !lives.get(q.id)!.rising
      )
    })
    const host = there.find((q) => {
      const intent = s.intents.get(q.id)
      return (
        intent?.kind === 'at' &&
        (intent.place.endsWith(':host') || intent.place === q.own)
      )
    })
    const speaker = speakerAt(
      there.map((q) => q.id),
      host?.id ?? null,
      s.seconds,
      playerSpeaking,
    )
    for (const person of p.people) {
      const live = lives.get(person.id)!
      const intent = s.intents.get(person.id)
      const goal = goalFor(intent)
      let a = live.agent
      // Talking to the player: stopped where they are, turned to them (unless
      // in a meeting, when they only look round and lift a hand).
      const talkingFor = engagedFor(person.id)
      const meeting = intent?.kind === 'at' && intent.reason === 'meeting'
      const held = talkingFor >= 0 && !meeting && a.shown
      // Getting up from a seat before walking off (not when time jumps on).
      const leaving =
        live.seatedAt !== null &&
        (goal?.key ?? null) !== live.seatedAt &&
        !jumped &&
        !STILL &&
        !held
      if (leaving) live.rise += dt
      const rising = leaving && live.rise < RISE_SECONDS
      live.rising = rising
      if (!rising && live.seatedAt !== null && (goal?.key ?? null) !== live.seatedAt) {
        live.seatedAt = null
        live.rise = 0
      }
      if (held) {
        const player = bodyOf('player')
        const seat = intent?.kind === 'at' ? s.resolved.get(intent.place)?.seat : null
        const seated = a.status === 'there' && !!seat
        if (player && !seated)
          a = {
            ...a,
            heading: turnTowards(
              a.heading,
              Math.atan2(-(player.x - a.x), -(player.z - a.z)),
              dt * 5,
            ),
            speed: 0,
          }
      } else if (rising) {
        // Still on the seat, standing up.
      } else if (jumped || STILL || !s.grid) {
        // Time jumped on (or no moving about): already there.
        if (jumped || STILL || a.goal !== (goal?.key ?? null)) a = placeAt(a, goal)
      } else {
        const others = othersThan(person.id)
        const steps = Math.max(1, Math.ceil(dt / 0.05))
        for (let k = 0; k < steps; k++)
          a = stepAgent(
            a,
            goal,
            { grid: s.grid, solids: s.solids!, door: p.door },
            others,
            dt / steps,
          )
      }
      if (a.goal !== live.agent.goal || a.status !== live.agent.status) live.clip = 0
      live.clip += dt
      if (a.shown !== live.agent.shown) appeared = true
      live.agent = a
      const placeKey = rising
        ? live.seatedAt!
        : intent?.kind === 'at'
          ? intent.place
          : null
      const place = placeKey ? p.places[placeKey] : undefined
      const spot = placeKey ? s.resolved.get(placeKey) : undefined
      // On a seat: arrived at a seated place that has a real seat (or getting up from it).
      const onSeat = !!spot?.seat && (rising || (a.status === 'there' && !!place))
      if (onSeat && !rising && placeKey) live.seatedAt = placeKey
      // How far down onto the seat (sitting down on arriving, getting up on leaving).
      const down = !onSeat
        ? 0
        : rising
          ? 1 - live.rise / RISE_SECONDS
          : jumped || STILL
            ? 1
            : Math.min(1, live.clip / SIT_SECONDS)
      // Drawn where they are: on the seat itself once sitting, facing the way it faces.
      const g = live.group
      if (g) {
        g.visible = a.shown
        if (onSeat && spot) {
          const e = down * down * (3 - 2 * down)
          g.position.set(a.x + (spot.x - a.x) * e, 0, a.z + (spot.z - a.z) * e)
          g.rotation.y = a.heading + wrap(spot.heading - a.heading) * e
        } else {
          g.position.set(a.x, 0, a.z)
          g.rotation.y = a.heading
        }
      }
      if (a.shown) setBody(person.id, a.x, a.z, NPC_RADIUS)
      else removeBody(person.id)
      // In the list of people the player can talk to, with what they are doing.
      const who = p.who[person.id]
      if (a.shown && who) {
        const now = doingNow(person, intent, a.status === 'walking', s.intents, p.minute)
        setNpc({
          who,
          x: a.x,
          z: a.z,
          heading: a.heading,
          reach: onSeat ? 1.8 : 1.5,
          availability: held ? 'free' : now.availability,
          doing: now.doing,
          with: now.with,
          seated: onSeat,
        })
      } else removeNpc(person.id)
      let clip: ClipId | null = null
      if (held) {
        // Waves on seeing the player come over, then talks.
        clip = talkingFor < 1.4 ? 'wave' : 'talk'
        live.rig.current =
          onSeat && spot
            ? activityFrame(clip, talkingFor, spot)
            : clipFrame(clip, talkingFor)
        live.motion.current = { walking: false }
      } else if (talkingFor >= 0 && talkingFor < 1.4 && a.status === 'there') {
        // In a meeting: a hand lifted, nothing more.
        clip = 'wave'
        live.rig.current = spot
          ? activityFrame('wave', talkingFor, {
              ...spot,
              seat: onSeat ? spot.seat : null,
            })
          : clipFrame('wave', talkingFor)
        live.motion.current = { walking: false }
      } else if (onSeat || (a.status === 'there' && place && spot)) {
        const r = spot!
        const can = (c: ClipId) =>
          r.clips.includes(c) || check(c, onSeat, r, allAnchors()).ok
        const talking = !!person.speaker && person.speaker === p.talkingTo
        clip = doingAt(
          { ...place!, clip: r.clips[0], also: r.clips.slice(1) },
          person.id,
          s.seconds,
        )
        if (intent?.kind === 'at' && intent.reason === 'lunch' && r.clips.includes('eat'))
          clip = 'eat'
        if (talking) clip = onSeat ? 'sit-relax' : 'talk'
        else if (intent?.kind === 'at' && intent.reason === 'meeting')
          clip =
            person.id === speaker
              ? person.id === host?.id && !onSeat && can('present')
                ? 'present'
                : 'talk'
              : onSeat
                ? r.clips.includes('type')
                  ? 'type'
                  : 'sit-relax'
                : 'stand'
        if (!can(clip)) clip = onSeat ? 'sit' : 'stand'
        const at = { ...r, seat: onSeat ? r.seat : null }
        const frame = activityFrame(
          clip,
          s.seconds + person.id.length,
          at,
          r.targets[clip],
        )
        live.rig.current = onSeat && down < 1 ? sitting(frame, down) : frame
        live.motion.current = { walking: false }
      } else {
        live.rig.current = null
        live.motion.current = { walking: a.status === 'walking' }
        if (a.status === 'walking') walking = true
      }
      // What is in their hands: what the activity is done with (nothing while walking).
      const hold =
        clip && (!onSeat || down >= 1) ? holdsFor(clip, spot?.targets[clip]) : {}
      live.held.left.current = hold.left ?? null
      live.held.right.current = hold.right ?? null
      live.clipNow = clip
      if (rising || (onSeat && down < 1)) walking = true
    }
    if (import.meta.env.DEV && (s.planIn === 0.5 || appeared))
      (window as unknown as { __worksimNpcs?: unknown }).__worksimNpcs = p.people.map(
        (q) => {
          const a = lives.get(q.id)!.agent
          const intent = s.intents.get(q.id)
          return {
            id: q.id,
            x: a.x,
            z: a.z,
            status: lives.get(q.id)!.rising ? 'rising' : a.status,
            shown: a.shown,
            place: intent?.kind === 'at' ? intent.place : null,
            reason: intent?.kind === 'at' ? intent.reason : 'away',
            clip: lives.get(q.id)!.clipNow,
            seat: lives.get(q.id)!.seatedAt
              ? (s.resolved.get(lives.get(q.id)!.seatedAt!)?.seat?.id ?? null)
              : null,
            held: [
              lives.get(q.id)!.held.left.current,
              lives.get(q.id)!.held.right.current,
            ].filter(Boolean),
            rejected:
              intent?.kind === 'at' ? (s.resolved.get(intent.place)?.rejected ?? []) : [],
            hip: lives.get(q.id)!.rig.current
              ? hipHeight(lives.get(q.id)!.rig.current!)
              : null,
            top: lives.get(q.id)!.seatedAt
              ? (s.resolved.get(lives.get(q.id)!.seatedAt!)?.seat?.top ?? null)
              : null,
            drawn: lives.get(q.id)!.group
              ? {
                  x: lives.get(q.id)!.group!.position.x,
                  z: lives.get(q.id)!.group!.position.z,
                }
              : null,
            target: (() => {
              const l = lives.get(q.id)!
              const key = l.seatedAt ?? (intent?.kind === 'at' ? intent.place : null)
              return key && l.clipNow
                ? (s.resolved.get(key)?.targets[l.clipNow]?.kind ?? null)
                : null
            })(),
          }
        },
      )
    // Someone walking: draw again soon (on low graphics, once a second, as the
    // rest of the place; the player moving draws more often anyway).
    // Someone talking to the player is animated too.
    if (lives.size && [...lives.keys()].some((id) => engagedFor(id) >= 0)) walking = true
    if (walking && !pending.current) {
      pending.current = true
      window.setTimeout(
        () => {
          pending.current = false
          invalidate()
        },
        p.low ? 1000 : 40,
      )
    }
  })

  return (
    <group ref={root} userData={{ passable: true }}>
      {props.people.map((person, i) => {
        const live = lives.get(person.id)!
        const body = (
          <Person
            look={props.looks[person.id]}
            motion={live.motion}
            rig={live.rig}
            talking={!!person.speaker && person.speaker === props.talkingTo}
            phase={i * 1.37}
            hold={{
              left: <Held kind={live.held.left} />,
              right: <Held kind={live.held.right} />,
            }}
          />
        )
        return (
          <group
            key={person.id}
            visible={false}
            ref={(g) => {
              live.group = g
            }}
          >
            {props.who[person.id] ? (
              <Talkable
                id={person.id}
                name={props.who[person.id].name}
                role={props.who[person.id].role}
              >
                {body}
              </Talkable>
            ) : (
              body
            )}
          </group>
        )
      })}
    </group>
  )
}
