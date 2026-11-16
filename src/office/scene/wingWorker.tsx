/**
 * Someone at work in a workplace's wing (wingShell.ts): the Bay B nurse, the
 * fabricator at the lathe, the records clerk. Posed at their post, doing
 * their job (an arms-only clip, on their feet), not walking a route.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { clipFrame, type ClipId, type RigFrame } from '../../world/character/rig'
import { Person, type Motion, type PersonLook } from './people'

export function WingWorker({
  look,
  x,
  z,
  heading,
  clip = 'write',
}: {
  look: PersonLook
  x: number
  z: number
  /** Facing (the activities' convention: 0 faces −z, −π/2 faces +x). */
  heading: number
  clip?: ClipId
}) {
  const rig = useRef<RigFrame | null>(null)
  const motion = useRef<Motion>({ walking: false })
  const t = useRef(x * 0.37 + z)
  useFrame((_, dt) => {
    t.current += dt
    rig.current = clipFrame(clip, t.current, 'standing')
  })
  return (
    <group position={[x, 0, z]} rotation={[0, heading, 0]}>
      <Person sounds look={look} seated={false} rig={rig} motion={motion} />
    </group>
  )
}
