/**
 * A status lamp on the equipment each of the workplace's tasks is done at
 * (taskSpots.ts), lit from the save: green when the task is done, amber while
 * it is in hand, red when it was sent back to put right, and unlit (white)
 * when it is still to start. Up close, a tag says what the work is and how it
 * stands. Handing a task in, in the Tasks app, changes the lamp.
 */
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Box } from './parts'
import { TASK_SPOTS, type TaskSpot } from './taskSpots'
import type { Theme } from './themeLayout'
import type { BoardState } from './workBoard'
import { useWork } from './workState'

const LOOK: Record<BoardState, { lamp: string; lit: boolean; say: string; tag: string }> =
  {
    done: { lamp: '#22c55e', lit: true, say: 'done', tag: 'bg-green-700' },
    doing: { lamp: '#f59e0b', lit: true, say: 'in hand', tag: 'bg-amber-600' },
    redo: { lamp: '#ef4444', lit: true, say: 'to put right', tag: 'bg-red-700' },
    next: { lamp: '#e2e8f0', lit: false, say: 'to start', tag: 'bg-slate-600' },
  }

/** How near the camera comes before the tag shows (metres). */
const TAG_RANGE = 4.5

function Lamp({ spot, state }: { spot: TaskSpot; state: BoardState }) {
  const look = LOOK[state]
  const tag = useRef<HTMLSpanElement>(null)
  useFrame(({ camera }) => {
    if (!tag.current) return
    const d = Math.hypot(camera.position.x - spot.x, camera.position.z - spot.z)
    tag.current.style.display = d < TAG_RANGE ? '' : 'none'
  })
  return (
    <group position={[spot.x, spot.y, spot.z]}>
      {/* The housing on its stalk, and the lamp */}
      <Box size={[0.02, 0.16, 0.02]} position={[0, -0.08, 0]} color="#334155" />
      <Box
        size={[0.09, 0.03, 0.09]}
        position={[0, 0.0, 0]}
        color="#1e293b"
        radius={0.01}
      />
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshStandardMaterial
          color={look.lamp}
          emissive={look.lit ? look.lamp : '#000000'}
          emissiveIntensity={look.lit ? 1.4 : 0}
          roughness={0.3}
        />
      </mesh>
      <Html
        position={[0, 0.22, 0]}
        center
        distanceFactor={4}
        pointerEvents="none"
        zIndexRange={[10, 0]}
      >
        <span
          ref={tag}
          data-task={spot.task}
          data-state={state}
          style={{ display: 'none' }}
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white shadow ${look.tag}`}
        >
          {spot.label} · {look.say}
        </span>
      </Html>
    </group>
  )
}

export function TaskLamps({ theme }: { theme: Theme }) {
  const work = useWork()
  return (
    <group>
      {TASK_SPOTS[theme].map((spot) => {
        const state = work.tasks[spot.task]
        return state ? <Lamp key={spot.task} spot={spot} state={state} /> : null
      })}
    </group>
  )
}
