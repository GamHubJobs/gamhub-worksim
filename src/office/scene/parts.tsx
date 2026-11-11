/**
 * Building blocks for the office: furniture and plants (people are in people.tsx), made from
 * simple shapes. No downloaded models, so the office loads instantly and runs
 * on ordinary computers.
 */
import { useAnchors, type AnchorSpec } from '../../world/anchors'
import { RoundedBox } from '@react-three/drei'
import type { ReactNode } from 'react'
import type { Vector } from '../../content/office'
import { COLORS } from './colors'

interface Placed {
  position?: Vector
  rotation?: number
}

export function Box({
  size,
  position = [0, 0, 0],
  color,
  rotation = 0,
  radius = 0,
  emissive,
  opacity,
}: {
  size: Vector
  position?: Vector
  color: string
  rotation?: number
  radius?: number
  emissive?: string
  opacity?: number
}) {
  const material = (
    <meshStandardMaterial
      color={color}
      roughness={0.8}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? 0.9 : 0}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
    />
  )
  if (radius > 0) {
    return (
      <RoundedBox
        args={size}
        radius={radius}
        smoothness={2}
        position={position}
        rotation={[0, rotation, 0]}
      >
        {material}
      </RoundedBox>
    )
  }
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <boxGeometry args={size} />
      {material}
    </mesh>
  )
}

/** A group placed on the floor and turned around its vertical axis. */
export function Place({
  position = [0, 0, 0],
  rotation = 0,
  children,
}: Placed & { children: ReactNode }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {children}
    </group>
  )
}

const PLANT: AnchorSpec[] = [{ kind: 'plant', at: [0, 0.8, 0] }]

export function Plant({ position, scale = 1 }: Placed & { scale?: number }) {
  const ref = useAnchors(PLANT)
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.44, 16]} />
        <meshStandardMaterial color={COLORS.pot} roughness={0.9} />
      </mesh>
      {[
        [0, 0.75, 0, 0.32],
        [0.14, 0.95, 0.06, 0.24],
        [-0.12, 1.02, -0.05, 0.22],
        [0.02, 1.2, 0.02, 0.18],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial
            color={i % 2 ? COLORS.leaf : COLORS.leafDark}
            flatShading
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Two places on a sofa, its cushions 0.45 m up, facing −z. */
const SOFA_SEATS: AnchorSpec[] = [-0.45, 0.45].map((x) => ({
  kind: 'seat' as const,
  at: [x, 0.45, 0.1] as [number, number, number],
  top: 0.45,
}))

export function Sofa({
  position,
  rotation,
  color = '#64748b',
}: Placed & { color?: string }) {
  const ref = useAnchors(SOFA_SEATS)
  return (
    <group ref={ref} position={position} rotation={[0, rotation ?? 0, 0]}>
      <Box size={[2, 0.4, 0.85]} position={[0, 0.25, 0]} color={color} radius={0.06} />
      <Box size={[2, 0.5, 0.2]} position={[0, 0.65, 0.33]} color={color} radius={0.06} />
      {[-0.95, 0.95].map((x) => (
        <Box
          key={x}
          size={[0.18, 0.55, 0.85]}
          position={[x, 0.4, 0]}
          color={color}
          radius={0.06}
        />
      ))}
    </group>
  )
}
