/**
 * Building blocks for the office: furniture and plants (people are in people.tsx), made from
 * simple shapes. No downloaded models, so the office loads instantly and runs
 * on ordinary computers.
 */
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

export function Desk({
  position,
  rotation,
  glow = false,
  mug = '#f8fafc',
}: Placed & { glow?: boolean; mug?: string }) {
  return (
    <Place position={position} rotation={rotation}>
      <Box
        size={[1.5, 0.05, 0.75]}
        position={[0, 0.74, 0]}
        color={COLORS.wood}
        radius={0.02}
      />
      {[-0.7, 0.7].map((x) => (
        <Box
          key={x}
          size={[0.05, 0.72, 0.65]}
          position={[x, 0.36, 0]}
          color={COLORS.metal}
        />
      ))}
      {/* Monitor */}
      <Box
        size={[0.62, 0.38, 0.03]}
        position={[0, 1.12, -0.22]}
        color={COLORS.screen}
        radius={0.01}
      />
      <Box
        size={[0.57, 0.33, 0.005]}
        position={[0, 1.12, -0.203]}
        color={glow ? '#e0f2fe' : '#bfdbfe'}
        emissive={glow ? COLORS.screenGlow : '#60a5fa'}
      />
      <Box size={[0.05, 0.2, 0.05]} position={[0, 0.86, -0.24]} color={COLORS.metal} />
      <Box size={[0.22, 0.015, 0.14]} position={[0, 0.775, -0.24]} color={COLORS.metal} />
      {/* Keyboard, mouse, mug, papers */}
      <Box size={[0.42, 0.015, 0.13]} position={[0, 0.775, 0.08]} color="#e2e8f0" />
      <Box size={[0.06, 0.02, 0.1]} position={[0.32, 0.775, 0.1]} color="#e2e8f0" />
      <mesh position={[-0.5, 0.82, 0.05]}>
        <cylinderGeometry args={[0.04, 0.035, 0.1, 12]} />
        <meshStandardMaterial color={mug} />
      </mesh>
      <Box
        size={[0.21, 0.01, 0.29]}
        position={[-0.42, 0.77, -0.15]}
        rotation={0.2}
        color="#ffffff"
      />
    </Place>
  )
}

export function OfficeChair({
  position,
  rotation,
  color = COLORS.fabric,
}: Placed & { color?: string }) {
  return (
    <Place position={position} rotation={rotation}>
      <Box
        size={[0.48, 0.08, 0.46]}
        position={[0, 0.47, 0]}
        color={color}
        radius={0.03}
      />
      <Box
        size={[0.46, 0.55, 0.07]}
        position={[0, 0.8, 0.22]}
        color={color}
        radius={0.03}
      />
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.42, 8]} />
        <meshStandardMaterial color={COLORS.metal} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 5]} />
        <meshStandardMaterial color={COLORS.metal} />
      </mesh>
    </Place>
  )
}

export function Plant({ position, scale = 1 }: Placed & { scale?: number }) {
  return (
    <group position={position} scale={scale}>
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

export function Sofa({
  position,
  rotation,
  color = '#64748b',
}: Placed & { color?: string }) {
  return (
    <Place position={position} rotation={rotation}>
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
    </Place>
  )
}
