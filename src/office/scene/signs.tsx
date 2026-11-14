/** A label in the 3D scene: a sign on a wall or above an object. */
import { Html } from '@react-three/drei'
import { useRef, type ReactNode } from 'react'
import { useFrontOnly } from './frontOnly'

export function Sign({
  position,
  rotation = 0,
  className,
  children,
}: {
  position: [number, number, number]
  /** Turned about the vertical (e.g. −π/2 to face along −x from the right-hand wall). */
  rotation?: number
  className: string
  children: ReactNode
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useFrontOnly(ref, position, rotation)
  return (
    <Html
      transform
      position={position}
      rotation={[0, rotation, 0]}
      distanceFactor={4}
      pointerEvents="none"
      zIndexRange={[10, 0]}
    >
      <span
        ref={ref}
        className={`rounded px-1.5 py-0.5 font-semibold whitespace-nowrap shadow ${className}`}
      >
        {children}
      </span>
    </Html>
  )
}

/** A room's name over its doorway or on its wall. */
export function RoomSign({
  position,
  rotation = 0,
  children,
}: {
  position: [number, number, number]
  rotation?: number
  children: ReactNode
}) {
  return (
    <Sign
      position={position}
      rotation={rotation}
      className="bg-slate-800 text-[11px] tracking-wide text-white uppercase"
    >
      {children}
    </Sign>
  )
}

/** Facing out from the right-hand wall into the room. */
export const ON_RIGHT_WALL = -Math.PI / 2
/** Facing out from the left-hand wall into the room. */
export const ON_LEFT_WALL = Math.PI / 2
