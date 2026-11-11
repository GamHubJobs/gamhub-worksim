/**
 * Someone who stays in one place (the barista behind the counter, a member on
 * a treadmill, a reader on a park bench), and can be talked to like anyone
 * else (see people.ts): clicked or walked up to, they turn to the player (a
 * little, if seated; not at all, if busy exercising or serving), wave and
 * talk, then go back to what they were doing.
 *
 * What they do is an activity (activities.ts), checked against what is
 * really there: seated people sit on the seat nearest where they were put
 * (the hips on its cushion, facing the way it faces, nobody else on it), and
 * an activity is only done with what it needs (a keyboard, a shelf, a
 * counter), holding what it is done with (a book, a mug, a phone).
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type ReactNode } from 'react'
import { Euler, Quaternion, Vector3, type Group } from 'three'
import type { Availability, Who } from '../../game/encounters'
import { Person, type PersonLook } from '../../office/scene/people'
import type { Vector } from '../../content/office'
import { clipFrame, type ClipId, type RigFrame } from '../character/rig'
import { hipHeight, seatOn } from '../character/fit'
import type { PropKind } from '../interaction/activity'
import {
  allAnchors,
  anchorsVersion,
  claimSeat,
  releaseSeats,
  seatsTakenBut,
} from '../anchors'
import { activityFrame, holdsFor, resolvePlace, type Resolved } from './activities'
import { Held } from './Held'
import { doingAt } from './schedule'
import { bodyOf } from './bodies'
import { engagedFor, removeNpc, setNpc } from './people'
import { Talkable } from './Talkable'

/** In development: how each of them is posed, for browser tests. */
const POSES = new Map<string, unknown>()
if (import.meta.env.DEV && typeof window !== 'undefined')
  Object.assign(window, { __worksimPoses: () => [...POSES.values()] })

const BUSY: Availability[] = ['serving', 'exercising', 'meeting']

const v = new Vector3()
const q = new Quaternion()
const e = new Euler()

/** The shortest turn from one heading to another. */
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export function Npc({
  who,
  position = [0, 0, 0],
  rotation = 0,
  seated = false,
  look,
  phase = 0,
  reach = 1.5,
  availability = 'free',
  doing,
  clip,
  activity,
  also,
  scale = 1,
  children,
}: {
  who: Who
  position?: Vector
  rotation?: number
  seated?: boolean
  look?: PersonLook
  phase?: number
  /** How near the player must be (further across a counter). */
  reach?: number
  availability?: Availability
  doing?: string
  /** Something they are doing with the player (a hug, holding hands), seated or standing. */
  clip?: { id: ClipId; t: () => number } | null
  /**
   * What they are doing (checked against what is there; see activities.ts),
   * and other things they do now and then. Default: sitting, or standing.
   */
  activity?: ClipId
  also?: ClipId[]
  /** Smaller, for a child. */
  scale?: number
  /** Drawn instead of a standing or seated person (a runner, say). */
  children?: ReactNode
}) {
  const invalidate = useThree((s) => s.invalidate)
  const outer = useRef<Group>(null)
  const turn = useRef<Group>(null)
  const rig = useRef<RigFrame | null>(null)
  const seatGroup = useRef<Group>(null)
  const left = useRef<PropKind | null>(null)
  const right = useRef<PropKind | null>(null)
  const spot = useRef<{ version: number; r: Resolved | null; base: number }>({
    version: -1,
    r: null,
    base: 0,
  })
  const id = who.id
  const owner = `npc:${id}`
  const what = activity ?? (seated ? 'sit' : 'stand')
  const alsoKey = (also ?? []).join()
  const positionKey = position.join()

  useEffect(
    () => () => {
      removeNpc(id)
      POSES.delete(id)
    },
    [id],
  )
  useEffect(() => () => releaseSeats(owner), [owner])
  // Where they were put, or what they do, changed: worked out again.
  useEffect(() => {
    spot.current.version = -1
  }, [positionKey, rotation, seated, what, alsoKey])

  const clock = useRef(0)
  useFrame((_, dt) => {
    clock.current += dt
    const g = outer.current
    if (!g) return
    g.getWorldPosition(v)
    g.getWorldQuaternion(q)
    const base = e.setFromQuaternion(q, 'YXZ').y
    // Their seat and what they can do here, once the furniture is there.
    if (spot.current.version !== anchorsVersion()) {
      spot.current.version = anchorsVersion()
      releaseSeats(owner)
      const r = resolvePlace(
        { x: v.x, z: v.z, heading: base, seated, clip: what, also, label: '' },
        allAnchors(),
        seatsTakenBut(owner),
      )
      if (r.seat) claimSeat(r.seat.id, owner)
      spot.current = { version: anchorsVersion(), r, base }
      // On the seat itself, in their own space.
      const sg = seatGroup.current
      if (sg) {
        const dx = r.x - v.x
        const dz = r.z - v.z
        const c = Math.cos(-base)
        const sn = Math.sin(-base)
        sg.position.set((dx * c + dz * sn) / scale, 0, (-dx * sn + dz * c) / scale)
        sg.rotation.y = r.seat ? wrap(r.seat.heading - base) : 0
      }
    }
    const r = spot.current.r
    const talking = engagedFor(id)
    const busy = BUSY.includes(availability)
    // Turned to the player while talking (seated, only partly), else back.
    let want = 0
    const player = bodyOf('player')
    if (talking >= 0 && !busy && player) {
      want = wrap(Math.atan2(-(player.x - v.x), -(player.z - v.z)) - base)
      if (seated) want = Math.max(-0.7, Math.min(0.7, want))
    }
    const t = turn.current
    if (t) {
      const before = t.rotation.y
      t.rotation.y += wrap(want - t.rotation.y) * Math.min(1, dt * 5)
      if (Math.abs(t.rotation.y - before) > 0.002) invalidate()
    }
    let held: { left?: PropKind; right?: PropKind } = {}
    if (clip) {
      // Something with the player (a hug, holding hands): on the real seat, if seated.
      const f = clipFrame(clip.id, clip.t())
      rig.current = f.seated && r?.seat?.top !== undefined ? seatOn(f, r.seat.top) : f
      invalidate()
    } else if (!children && r) {
      const now = clock.current + phase
      if (talking >= 0) {
        rig.current = activityFrame(talking < 1.4 ? 'wave' : 'talk', talking, r)
        invalidate()
      } else {
        const c = doingAt(
          {
            x: r.x,
            z: r.z,
            heading: r.heading,
            clip: r.clips[0],
            also: r.clips.slice(1),
            label: '',
          },
          id,
          now,
        )
        rig.current = activityFrame(c, now, r, r.targets[c])
        held = holdsFor(c, r.targets[c])
      }
    }
    left.current = held.left ?? null
    right.current = held.right ?? null
    if (import.meta.env.DEV && r && rig.current)
      POSES.set(id, {
        id,
        hip: hipHeight(rig.current),
        top: r.seat?.top ?? null,
        seat: r.seat?.id ?? null,
        seatAt: r.seat ? { x: r.seat.x, z: r.seat.z } : null,
        at: { x: r.x, z: r.z },
        clips: r.clips,
        rejected: r.rejected,
        held: [held.left, held.right].filter(Boolean),
      })
    setNpc({
      who,
      x: v.x,
      z: v.z,
      heading: base + (t?.rotation.y ?? 0),
      reach,
      availability: talking >= 0 && !busy ? 'free' : availability,
      doing,
      seated,
    })
  })

  return (
    <group ref={outer} position={position} rotation={[0, rotation, 0]} scale={scale}>
      <group ref={seatGroup}>
        <group ref={turn}>
          <Talkable id={id} name={who.name} role={who.role} height={seated ? 1.55 : 1.95}>
            {children ??
              (look && (
                <Person
                  look={look}
                  seated={seated}
                  phase={phase}
                  rig={rig}
                  hold={{ left: <Held kind={left} />, right: <Held kind={right} /> }}
                />
              ))}
          </Talkable>
        </group>
      </group>
    </group>
  )
}
