/**
 * Makes a person clickable: the pointer over them shows their name, their role
 * and, if they are busy, what they are doing; a click walks the player over to
 * talk to them (see people.ts). Every person in every place is wrapped in one.
 */
import { Html, useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState, type ReactNode } from 'react'
import { npc, requestTalk } from './people'

const BUSY: Record<string, string> = {
  meeting: 'in a meeting',
  serving: 'serving',
  exercising: 'exercising',
  eating: 'having lunch',
  chatting: 'chatting',
  walking: 'on the move',
  leaving: 'heading home',
}

export function Talkable({
  id,
  name,
  role,
  height = 1.95,
  children,
}: {
  id: string
  name: string
  role: string
  /** Where the label sits above their feet (lower for someone seated). */
  height?: number
  children: ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const state = hovered ? BUSY[npc(id)?.availability ?? ''] : undefined
  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        requestTalk(id)
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <Html
          position={[0, height, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="rounded-md bg-slate-900/90 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg">
            {name.split(' ')[0]} · {role}
            {state && <span className="text-slate-300"> · {state}</span>}
          </span>
        </Html>
      )}
    </group>
  )
}
