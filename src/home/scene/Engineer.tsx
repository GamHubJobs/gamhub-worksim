/**
 * The heating engineer (see game/repair.ts) and the boiler they come to fix.
 * When they arrive they walk along the landing to the front door and ring;
 * let in, they come through the flat to the boiler on the kitchen wall, open
 * it up and work on it with a tool, come back to the door to be paid, and
 * walk off as the door closes. They keep to REPAIR_TIMES, as the player's
 * own "answer the door" activity does. The boiler's light is red while it is
 * broken, and green once it is fixed.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import { audio } from '../../audio/manager'
import type { RepairStage } from '../../game/repair'
import { Box } from '../../office/scene/parts'
import { Person, type Motion, type PersonLook } from '../../office/scene/people'
import { clipFrame, type RigFrame } from '../../world/character/rig'
import { useWorld } from '../../world/context'
import { Prop } from '../../world/props'
import { REPAIR_TIMES as T } from './homeLayout'

/** Overalls and a cap-less crop: a tradesperson. */
const ENGINEER_LOOK: PersonLook = {
  skin: 3,
  hair: 'crop',
  hairColor: 2,
  outfit: 'polo',
  top: '#1e40af',
  trousers: '#1e3a8a',
  sleeves: 'rolled',
}

/** Seconds into answering the door: when they come in, are paid, and leave. */
const IN = T.open + T.greet * 0.5
const PAY = T.open + T.greet + T.fix
const LEAVE = PAY + T.pay
const END = LEAVE + T.close
const WALK = 1.6

type Point = { x: number; z: number }

/** Where along a path of points someone is, after walking `metres`. */
function along(
  path: Point[],
  metres: number,
): { at: Point; heading: number; done: boolean } {
  let left = metres
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    const heading = Math.atan2(-(b.x - a.x), -(b.z - a.z))
    if (left <= len)
      return {
        at: { x: a.x + ((b.x - a.x) * left) / len, z: a.z + ((b.z - a.z) * left) / len },
        heading,
        done: false,
      }
    left -= len
  }
  const a = path[path.length - 2]
  const b = path[path.length - 1]
  return { at: b, heading: Math.atan2(-(b.x - a.x), -(b.z - a.z)), done: true }
}

const length = (path: Point[]) =>
  path.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - path[i].x, p.z - path[i].z), 0)

export function Engineer({
  stage,
  door,
  boiler,
}: {
  stage: RepairStage
  /** The doorway (x, z), on the left wall. */
  door: [number, number]
  /** The boiler on the kitchen's back wall. */
  boiler: Point
}) {
  const { now } = useWorld()
  const group = useRef<Group>(null)
  const motion = useRef<Motion>({ walking: false })
  const rig = useRef<RigFrame | null>(null)
  const light = useRef<Mesh>(null)
  const walk = useRef({ x: door[0] - 1.7, arrived: false, rang: 0 })
  const outside = door[0] - 0.55
  const z = door[1]
  // In through the door, round to the front of the boiler; and back.
  const inside: Point = { x: door[0] + 0.8, z }
  const work: Point = { x: boiler.x, z: boiler.z + 0.75 }
  const route: Point[] = [
    { x: outside, z },
    inside,
    { x: work.x + 0.6, z: work.z + 0.9 },
    work,
  ]
  const back: Point[] = [...route].reverse()
  back[back.length - 1] = { x: door[0] + 0.45, z }
  const there = length(route) / WALK
  const home = length(back) / WALK

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.5)
    const answering = now.current.id === 'repair-door'
    const t = answering ? now.current.t : 0
    // The boiler's light: red until it is fixed (part way through the repair).
    const fixing = answering && t > IN + there + 2
    if (light.current) {
      const m = light.current.material as MeshStandardMaterial
      const broken = stage !== 'none' && !fixing
      m.color.set(broken ? '#ef4444' : '#22c55e')
      m.emissive.set(broken ? '#ef4444' : '#22c55e')
    }
    const g = group.current
    if (!g) return
    const here = stage === 'at-door' || (answering && t < END)
    g.visible = here
    if (!here) {
      walk.current = { x: door[0] - 1.7, arrived: false, rang: 0 }
      if (import.meta.env.DEV)
        (window as unknown as { __worksimEngineer?: unknown }).__worksimEngineer = {
          shown: false,
        }
      return
    }
    let x = walk.current.x
    let zNow = z
    let heading = -Math.PI / 2
    let walking = false
    let clip: Parameters<typeof clipFrame>[0] = 'stand'
    let doing = 'at the door'
    if (!answering) {
      // Along the landing to the door, then ringing now and then.
      const w = walk.current
      if (!w.arrived) {
        w.x = Math.min(outside, w.x + dt * 1.2)
        walking = w.x < outside
        if (!walking) w.arrived = true
      } else {
        w.rang -= dt
        if (w.rang <= 0) {
          audio.play('doorbell', { at: { x: door[0], z: door[1] } })
          w.rang = 25
        }
      }
      x = w.x
      clip = 'stand'
    } else if (t < IN) {
      x = outside
      clip = 'talk'
    } else if (t < PAY) {
      const u = t - IN
      const fixFor = T.fix - (there + home) + T.greet * 0.5
      if (u < there) {
        const p = along(route, u * WALK)
        x = p.at.x
        zNow = p.at.z
        heading = p.heading
        walking = true
        doing = 'coming in'
      } else if (u < there + fixFor) {
        x = work.x
        zNow = work.z
        heading = 0
        clip = Math.floor((u - there) / 2.4) % 2 === 0 ? 'reach' : 'write'
        doing = 'fixing the boiler'
      } else {
        const p = along(back, Math.min(length(back), (u - there - fixFor) * WALK))
        x = p.at.x
        zNow = p.at.z
        heading = p.done ? -Math.PI / 2 : p.heading
        walking = !p.done
        clip = 'stand'
        doing = 'coming back to the door'
      }
    } else if (t < LEAVE) {
      x = door[0] + 0.45
      heading = Math.PI / 2
      clip = 'pay'
      doing = 'being paid'
    } else {
      // Out of the door and off along the landing.
      const p = Math.min(1, (t - LEAVE) / T.close)
      x = door[0] + 0.45 - p * 2.6
      heading = Math.PI / 2
      walking = true
      doing = 'leaving'
    }
    g.position.set(x, 0, zNow)
    g.rotation.y = heading
    motion.current = { walking }
    rig.current = walking ? null : clipFrame(clip, t)
    if (import.meta.env.DEV)
      (window as unknown as { __worksimEngineer?: unknown }).__worksimEngineer = {
        shown: true,
        x,
        z: zNow,
        doing,
      }
  })

  return (
    <>
      <group ref={group} visible={false} userData={{ passable: true }}>
        <Person
          sounds
          look={ENGINEER_LOOK}
          motion={motion}
          rig={rig}
          talking={false}
          hold={{ right: <Prop kind="pen" /> }}
          phase={1.3}
        />
      </group>
      {/* The boiler: a white casing on the wall, its pipes, and the status light. */}
      <group position={[boiler.x, 0, boiler.z]}>
        <Box size={[0.46, 0.64, 0.3]} position={[0, 1.78, 0.1]} color="#f8fafc" />
        <Box size={[0.4, 0.1, 0.02]} position={[0, 1.58, 0.26]} color="#cbd5e1" />
        {[-0.12, 0, 0.12].map((dx) => (
          <Box
            key={dx}
            size={[0.03, 0.5, 0.03]}
            position={[dx, 1.22, 0.12]}
            color="#b45309"
          />
        ))}
        <mesh ref={light} position={[0.14, 1.58, 0.275]}>
          <sphereGeometry args={[0.022, 10, 8]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.9}
          />
        </mesh>
      </group>
    </>
  )
}
