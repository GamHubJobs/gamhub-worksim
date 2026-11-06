/**
 * Someone who stays in one place (the barista behind the counter, a member on
 * a treadmill, a reader on a park bench), and can be talked to like anyone
 * else (see people.ts): clicked or walked up to, they turn to the player (a
 * little, if seated; not at all, if busy exercising or serving), wave and
 * talk, then go back to what they were doing.
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type ReactNode } from 'react'
import { Euler, Quaternion, Vector3, type Group } from 'three'
import type { Availability, Who } from '../../game/encounters'
import { Person, type PersonLook } from '../../office/scene/people'
import type { Vector } from '../../content/office'
import { clipFrame, type RigFrame } from '../character/rig'
import { bodyOf } from './bodies'
import { engagedFor, removeNpc, setNpc } from './people'
import { Talkable } from './Talkable'

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
  /** Drawn instead of a standing or seated person (a runner, say). */
  children?: ReactNode
}) {
  const invalidate = useThree((s) => s.invalidate)
  const outer = useRef<Group>(null)
  const turn = useRef<Group>(null)
  const rig = useRef<RigFrame | null>(null)
  const id = who.id

  useEffect(() => () => removeNpc(id), [id])

  useFrame((_, dt) => {
    const g = outer.current
    if (!g) return
    g.getWorldPosition(v)
    g.getWorldQuaternion(q)
    const base = e.setFromQuaternion(q, 'YXZ').y
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
    if (!children && !seated) {
      rig.current =
        talking >= 0 ? clipFrame(talking < 1.4 ? 'wave' : 'talk', talking) : null
      if (talking >= 0) invalidate()
    }
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
    <group ref={outer} position={position} rotation={[0, rotation, 0]}>
      <group ref={turn}>
        <Talkable id={id} name={who.name} role={who.role} height={seated ? 1.55 : 1.95}>
          {children ??
            (look && (
              <Person
                look={look}
                seated={seated}
                phase={phase}
                rig={seated ? undefined : rig}
              />
            ))}
        </Talkable>
      </group>
    </group>
  )
}
