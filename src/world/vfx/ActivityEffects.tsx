/**
 * The effects of whatever the player is doing: each activity lists its
 * effects and when they run (water from a showerhead, steam over a pan,
 * sweat during a set); this turns them on and off at those moments. Effects
 * linger a few seconds after an activity so the last drops fall and steam
 * clears, then everything is removed.
 */
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { Vector3 } from 'three'
import { useWorld } from '../context'
import type { Activity } from '../interaction/activity'
import { Particles, WetPatch } from './Particles'

const LINGER = 4

export function ActivityEffects({ activities }: { activities: Activity[] }) {
  const { now, low, hands } = useWorld()
  const scratch = useRef(new Vector3())
  const tracker = (side: 'left' | 'right') => () => {
    const hand = hands.current[side]
    if (!hand) return null
    const v = hand.getWorldPosition(scratch.current)
    return [v.x, v.y, v.z] as [number, number, number]
  }
  const [shown, setShown] = useState<{ id: string; on: boolean[] } | null>(null)
  const linger = useRef<{ id: string; until: number } | null>(null)
  const clock = useRef(0)

  useFrame((_, dt) => {
    clock.current += dt
    const { id, t } = now.current
    const running = id ? activities.find((a) => a.id === id) : undefined
    let next: { id: string; on: boolean[] } | null = null
    if (running?.effects?.length) {
      next = {
        id: running.id,
        on: running.effects.map((e) => t >= e.from && t < e.to),
      }
      linger.current = { id: running.id, until: clock.current + LINGER }
    } else if (linger.current && clock.current < linger.current.until) {
      const a = activities.find((x) => x.id === linger.current!.id)
      next = a ? { id: a.id, on: (a.effects ?? []).map(() => false) } : null
    } else linger.current = null
    const key = next ? `${next.id}:${next.on.join()}` : ''
    const was = shown ? `${shown.id}:${shown.on.join()}` : ''
    if (key !== was) setShown(next)
  })

  if (!shown) return null
  const activity = activities.find((a) => a.id === shown.id)
  if (!activity) return null
  return (
    <group>
      {(activity.effects ?? []).map((e, i) => (
        <group key={i}>
          <Particles
            kind={e.kind}
            at={e.at}
            active={shown.on[i]}
            low={low}
            track={e.follow ? tracker(e.follow) : undefined}
          />
          {e.kind === 'splash' && (
            <WetPatch at={[e.at[0], 0, e.at[2]]} radius={0.55} active={shown.on[i]} />
          )}
        </group>
      ))}
    </group>
  )
}
