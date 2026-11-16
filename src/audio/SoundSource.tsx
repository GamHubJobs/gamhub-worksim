/**
 * A sound that comes from a place in the 3D world: a machine running, a
 * patient monitor, a server cabinet, a crew at work. While `active`, it plays
 * its effect every so often from where it is (heard from that side, quieter
 * further away: see listener.ts), and only when the player is within earshot.
 * Nothing plays when the activity is not happening.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { EffectId } from './manager'
import { playFrom } from './playFrom'

export interface SoundSourceProps {
  x: number
  z: number
  id: EffectId
  /** Seconds between plays (a little varied, so it never ticks like a clock). */
  every: number
  active?: boolean
  /** Beyond this many metres it is not heard at all. */
  range?: number
}

export function SoundSource({
  x,
  z,
  id,
  every,
  active = true,
  range = 16,
}: SoundSourceProps) {
  // The first play comes part way through the interval; later ones vary.
  const next = useRef(every / 2)
  useFrame((_, dt) => {
    if (!active) return
    next.current -= dt
    if (next.current > 0) return
    next.current = every * (0.75 + Math.random() * 0.5)
    playFrom(id, x, z, range)
  })
  return null
}
