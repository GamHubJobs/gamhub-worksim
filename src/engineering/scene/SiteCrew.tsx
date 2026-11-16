/**
 * The site crew, drawn: each person walks their route (carrying blocks or
 * bars from the stores), and works at each stop with their trade's motion.
 * See crew.ts for who does what at each stage.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { Person, type Motion } from '../../office/scene/people'
import { clipFrame, type RigFrame } from '../../world/character/rig'
import { prefersReducedMotion } from '../../ui/motion'
import type { CrewMember } from './crew'

const STILL = prefersReducedMotion()
const SPEED = 1.1
/** Seconds at each stop, working. */
const PAUSE = 4

function Carried({ kind }: { kind: NonNullable<CrewMember['carry']> }) {
  if (kind === 'block')
    return (
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.44, 0.215, 0.1]} />
        <meshStandardMaterial color="#b9b6ae" />
      </mesh>
    )
  if (kind === 'bar')
    return (
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 2.4, 5]} />
        <meshStandardMaterial color="#7c2d12" />
      </mesh>
    )
  return (
    <mesh>
      <boxGeometry args={[0.24, 0.32, 0.02]} />
      <meshStandardMaterial color="#a16207" />
    </mesh>
  )
}

/** A steady 0–1 from a name, so each person starts at their own point in their routine. */
function offset(id: string): number {
  let h = 7
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 1000
  return h / 1000
}

export function SiteWorker({ member }: { member: CrewMember }) {
  const group = useRef<Group>(null)
  const rig = useRef<RigFrame | null>(null)
  const motion = useRef<Motion>({ walking: false })
  const state = useRef({
    leg: 0,
    along: 0,
    pause: offset(member.id) * PAUSE,
    t: offset(member.id) * 10,
  })
  const path = member.path
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const s = state.current
    s.t += dt
    if (path.length < 2 || STILL) {
      const p = path[0]
      g.position.set(p.x, member.y ?? 0, p.z)
      g.rotation.y = member.heading
      motion.current.walking = false
      rig.current = clipFrame(member.clip, s.t, 'standing')
      return
    }
    if (s.pause > 0) {
      s.pause -= dt
      motion.current.walking = false
      rig.current = clipFrame(member.clip, s.t, 'standing')
      const p = path[s.leg]
      g.position.set(p.x, member.y ?? 0, p.z)
      return
    }
    const a = path[s.leg]
    const b = path[(s.leg + 1) % path.length]
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 0.01
    s.along += (SPEED * dt) / len
    if (s.along >= 1) {
      s.along = 0
      s.leg = (s.leg + 1) % path.length
      s.pause = PAUSE
      g.rotation.y = member.heading
      return
    }
    rig.current = null
    motion.current.walking = true
    g.position.set(
      a.x + (b.x - a.x) * s.along,
      member.y ?? 0,
      a.z + (b.z - a.z) * s.along,
    )
    g.rotation.y = Math.atan2(-(b.x - a.x), -(b.z - a.z))
  })
  return (
    <group
      ref={group}
      position={[path[0].x, member.y ?? 0, path[0].z]}
      rotation={[0, member.heading, 0]}
    >
      <Person
        look={member.look}
        seated={false}
        rig={rig}
        motion={motion}
        hold={member.carry ? { right: <Carried kind={member.carry} /> } : undefined}
      />
    </group>
  )
}
