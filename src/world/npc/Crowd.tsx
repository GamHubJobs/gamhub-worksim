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
import { clipFrame, type RigFrame } from '../character/rig'
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
}

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
  })
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
        lives.get(q.id)!.agent.status === 'there'
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
      if (held) {
        const player = bodyOf('player')
        const seat = intent?.kind === 'at' ? p.places[intent.place] : undefined
        const seated = a.status === 'there' && !!seat?.seated
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
      live.agent = a
      // Drawn where they are, doing what the place is for.
      const g = live.group
      if (g) {
        g.visible = a.shown
        g.position.set(a.x, 0, a.z)
        g.rotation.y = a.heading
      }
      if (a.shown) setBody(person.id, a.x, a.z, NPC_RADIUS)
      else removeBody(person.id)
      const place = intent?.kind === 'at' ? p.places[intent.place] : undefined
      // In the list of people the player can talk to, with what they are doing.
      const who = p.who[person.id]
      if (a.shown && who) {
        const now = doingNow(person, intent, a.status === 'walking', s.intents, p.minute)
        setNpc({
          who,
          x: a.x,
          z: a.z,
          heading: a.heading,
          reach: a.status === 'there' && place?.seated ? 1.8 : 1.5,
          availability: held ? 'free' : now.availability,
          doing: now.doing,
          with: now.with,
          seated: a.status === 'there' && !!place?.seated,
        })
      } else removeNpc(person.id)
      if (held) {
        // Waves on seeing the player come over, then talks.
        const seated = a.status === 'there' && !!place?.seated
        live.rig.current = seated
          ? clipFrame('sit-relax', talkingFor)
          : clipFrame(talkingFor < 1.4 ? 'wave' : 'talk', talkingFor)
        live.motion.current = { walking: false }
      } else if (talkingFor >= 0 && talkingFor < 1.4 && a.status === 'there') {
        // In a meeting: a hand lifted, nothing more.
        live.rig.current = clipFrame('wave', talkingFor)
        live.motion.current = { walking: false }
      } else if (a.status === 'there' && place) {
        const talking = !!person.speaker && person.speaker === p.talkingTo
        let clip = doingAt(place, person.id, s.seconds)
        if (intent?.kind === 'at' && intent.reason === 'lunch' && place.clip !== 'eat')
          clip = 'eat'
        if (talking) clip = place.seated ? 'sit-relax' : 'talk'
        else if (intent?.kind === 'at' && intent.reason === 'meeting')
          clip =
            person.id === speaker
              ? person.id === host?.id && !place.seated
                ? 'present'
                : place.seated
                  ? 'sit-relax'
                  : 'talk'
              : place.seated
                ? place.clip === 'type'
                  ? 'type'
                  : 'sit-relax'
                : 'stand'
        // Sitting down first, on arriving at a seat.
        const frame =
          place.seated && live.clip < 1.2 && !jumped && !STILL
            ? clipFrame('sit', live.clip)
            : clipFrame(clip, s.seconds + person.id.length)
        live.rig.current = frame
        live.motion.current = { walking: false }
      } else {
        live.rig.current = null
        live.motion.current = { walking: a.status === 'walking' }
        if (a.status === 'walking') walking = true
      }
    }
    if (import.meta.env.DEV && s.planIn === 0.5)
      (window as unknown as { __worksimNpcs?: unknown }).__worksimNpcs = p.people.map(
        (q) => {
          const a = lives.get(q.id)!.agent
          const intent = s.intents.get(q.id)
          return {
            id: q.id,
            x: a.x,
            z: a.z,
            status: a.status,
            shown: a.shown,
            place: intent?.kind === 'at' ? intent.place : null,
            reason: intent?.kind === 'at' ? intent.reason : 'away',
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
