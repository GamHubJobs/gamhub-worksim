/**
 * A door that opens for whoever goes through it: the player or anyone else.
 *
 * - **Kinds:** a hinged leaf (swinging on its hinges at one side), double
 *   doors (each leaf on its own side, opening the same way), a sliding door
 *   (along its track) and automatic sliding doors (two leaves parting).
 * - **What opens it:** anyone within `sense` metres of it (from `bodies`, where
 *   the player and every other person put themselves as they move), or the
 *   player going in at it (`openOn`: the activity, from `push-door` on), or a
 *   test of its own (`openWhen`).
 * - **States** (doorMotion.ts): closed, opening, open, closing, locked. A
 *   locked door stays shut, rattles when tried, and is solid; an unlocked one
 *   is passable (so nobody is stopped by it as it opens in front of them).
 * - **Sound** from the door itself: the handle and hinge, the latch, the
 *   sliding track, the rattle of a locked one.
 *
 * Stands on the floor at `position`, facing +z (rotated by `rotation`), its
 * opening `width` wide. It brings its own frame.
 */
import { useFrame } from '@react-three/fiber'
import { useContext, useRef } from 'react'
import { Vector3, type Group } from 'three'
import type { Vector } from '../../content/office'
import { Box } from '../../office/scene/parts'
import { playFrom } from '../../audio/playFrom'
import type { EffectId } from '../../audio/manager'
import { World } from '../context'
import { playerNow } from '../playerNow'
import { anyoneWithin } from '../npc/bodies'
import type { ActivityNow } from '../PlayerRig'
import { closedDoor, easeDoor, stepDoor, type DoorMotion } from './doorMotion'

export type DoorKind = 'hinged' | 'double' | 'sliding' | 'automatic'

export interface DoorProps {
  position: Vector
  rotation?: number
  kind?: DoorKind
  width?: number
  height?: number
  /** The leaf: wood, glass in a metal frame, or painted metal. */
  leaf?: 'wood' | 'glass' | 'metal'
  colour?: string
  frame?: string | null
  /** Which way a hinged leaf swings: into the room (+1, away from +z) or out (-1). */
  swing?: 1 | -1
  /** Hinged on the left (as seen from +z) or the right. */
  hand?: 'left' | 'right'
  locked?: boolean
  /** How near someone must be for it to open (0: only by `openOn`/`openWhen`). */
  sense?: number
  /** The player's activities that go through it (it opens as they do). */
  openOn?: string[]
  /** Or a test of its own on the player's activity. */
  openWhen?: (now: ActivityNow) => boolean
  /** Open for the first moments after it appears (someone just came through it). */
  openAtStart?: number
}

export function Door({
  position,
  rotation = 0,
  kind = 'hinged',
  width = 0.95,
  height = 2.1,
  leaf = 'wood',
  colour = '#7c2d12',
  frame = '#e7e5e4',
  swing = 1,
  hand = 'left',
  locked = false,
  sense = 1.6,
  openOn,
  openWhen,
  openAtStart = 0,
}: DoorProps) {
  const world = useContext(World)
  const root = useRef<Group>(null)
  const leaves = useRef<Array<Group | null>>([])
  const state = useRef<{ m: DoorMotion; age: number; at: Vector3 | null }>({
    m: closedDoor(locked),
    age: 0,
    at: null,
  })
  const sliding = kind === 'sliding' || kind === 'automatic'
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.25)
    const s = state.current
    s.age += dt
    if (!s.at && root.current) {
      root.current.updateWorldMatrix(true, false)
      s.at = root.current.getWorldPosition(new Vector3())
    }
    const at = s.at
    if (!at) return
    const now = world?.now.current ?? playerNow.current
    const going =
      !!now?.id &&
      ((openOn?.includes(now.id) && now.t > 0.15) || (openWhen ? openWhen(now) : false))
    const near = sense > 0 && anyoneWithin(at.x, at.z, sense)
    const want = going || near || s.age < openAtStart
    const step = stepDoor(
      s.m,
      { want, locked, seconds: sliding ? 0.7 : 0.6, wait: sliding ? 1.2 : 0.8 },
      dt,
    )
    s.m = step.motion
    if (import.meta.env.DEV && step.event) logDoor(at, step.event, s.m.state)
    const sound = soundOf(step.event, sliding)
    if (sound) playFrom(sound, at.x, at.z, 14)
    const e = easeDoor(s.m.open)
    leaves.current.forEach((g, i) => {
      if (!g) return
      if (sliding) {
        // Along the track: one leaf slides aside, a pair part.
        const each = kind === 'automatic' ? width / 2 : width
        const dir = kind === 'automatic' ? (i === 0 ? -1 : 1) : hand === 'left' ? -1 : 1
        g.position.x = dir * each * 0.95 * e
      } else {
        // On the hinges: up to a little past a right angle.
        const dir = kind === 'double' ? (i === 0 ? 1 : -1) : hand === 'left' ? 1 : -1
        g.rotation.y = dir * swing * 1.6 * e
      }
    })
  })

  const half = width / 2
  const look = { height, leaf, colour }
  const hold = (i: number) => (g: Group | null) => {
    leaves.current[i] = g
  }
  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]}>
      {frame && (
        <group>
          {[-1, 1].map((side) => (
            <Box
              key={side}
              size={[0.08, height + 0.08, 0.14]}
              position={[side * (half + 0.04), (height + 0.08) / 2, 0]}
              color={frame}
            />
          ))}
          <Box
            size={[width + 0.16, 0.08, 0.14]}
            position={[0, height + 0.04, 0]}
            color={frame}
          />
          {sliding && (
            // The track and its cover over the opening.
            <Box
              size={[width * 2, 0.14, 0.12]}
              position={[0, height + 0.14, 0.05]}
              color="#64748b"
            />
          )}
        </group>
      )}
      {/* The leaves: solid only while locked (an unlocked door opens for whoever comes). */}
      <group userData={{ passable: !locked }}>
        {kind === 'double' && (
          <>
            <group ref={hold(0)} position={[-half, 0, 0]}>
              <Leaf w={half} flip={false} {...look} />
            </group>
            <group ref={hold(1)} position={[half, 0, 0]}>
              <Leaf w={half} flip {...look} />
            </group>
          </>
        )}
        {kind === 'automatic' && (
          <>
            <group ref={hold(0)}>
              <group position={[-half, 0, 0]}>
                <Leaf w={half} flip={false} {...look} />
              </group>
            </group>
            <group ref={hold(1)}>
              <Leaf w={half} flip={false} {...look} />
            </group>
          </>
        )}
        {kind === 'sliding' && (
          <group ref={hold(0)}>
            <group position={[-half, 0, 0]}>
              <Leaf w={width} flip={false} {...look} />
            </group>
          </group>
        )}
        {kind === 'hinged' && (
          <group ref={hold(0)} position={[hand === 'left' ? -half : half, 0, 0]}>
            <Leaf w={width} flip={hand === 'right'} {...look} />
          </group>
        )}
      </group>
    </group>
  )
}

/** One leaf, `w` wide, drawn from its hinge (x = 0) towards +x (or -x, flipped). */
function Leaf({
  w,
  flip,
  height,
  leaf,
  colour,
}: {
  w: number
  flip: boolean
  height: number
  leaf: 'wood' | 'glass' | 'metal'
  colour: string
}) {
  const t = 0.05
  const x = flip ? -w / 2 : w / 2
  const edge = flip ? -w : w
  if (leaf === 'glass')
    return (
      <group>
        <Box
          size={[w, height, t * 0.5]}
          position={[x, height / 2, 0]}
          color="#bfdbfe"
          opacity={0.35}
        />
        {/* Its metal frame and push bar */}
        <Box size={[w, 0.08, t]} position={[x, 0.04, 0]} color="#94a3b8" />
        <Box size={[w, 0.06, t]} position={[x, height - 0.03, 0]} color="#94a3b8" />
        <Box
          size={[0.05, height, t]}
          position={[edge - Math.sign(edge) * 0.025, height / 2, 0]}
          color="#94a3b8"
        />
        <Box size={[w * 0.6, 0.04, 0.04]} position={[x, 1.0, 0.05]} color="#cbd5e1" />
      </group>
    )
  const handle = edge - Math.sign(edge) * 0.12
  return (
    <group>
      <Box size={[w, height, t]} position={[x, height / 2, 0]} color={colour} />
      {/* Panels on its face, a kick plate on a metal door, and the handles */}
      {[0.72, 0.3].map((y) => (
        <Box
          key={y}
          size={[w * 0.7, height * 0.35, 0.01]}
          position={[x, height * y, t / 2]}
          color={colour}
        />
      ))}
      {leaf === 'metal' && (
        <Box size={[w * 0.9, 0.2, 0.012]} position={[x, 0.12, t / 2]} color="#a1a1aa" />
      )}
      {[1, -1].map((side) => (
        <Box
          key={side}
          size={[0.12, 0.025, 0.05]}
          position={[handle, 1.0, side * (t / 2 + 0.03)]}
          color="#d4d4d8"
        />
      ))}
    </group>
  )
}

/**
 * Development builds: what doors did, for browser tests (where each door is, to
 * the decimetre, what happened and the state after it).
 */
function logDoor(at: Vector3, event: string, state: string) {
  const w = window as unknown as {
    __worksimDoors?: Array<{
      x: number
      z: number
      event: string
      state: string
      t: number
    }>
  }
  w.__worksimDoors ??= []
  w.__worksimDoors.push({
    x: Math.round(at.x * 10) / 10,
    z: Math.round(at.z * 10) / 10,
    event,
    state,
    t: Math.round(performance.now()),
  })
  if (w.__worksimDoors.length > 200) w.__worksimDoors.shift()
}

function soundOf(
  event: ReturnType<typeof stepDoor>['event'],
  sliding: boolean,
): EffectId | null {
  if (event === 'rattle') return 'rattle'
  if (sliding) return event === 'opens' || event === 'closes' ? 'slide' : null
  if (event === 'opens') return 'hinge'
  if (event === 'shut') return 'latch'
  return null
}
