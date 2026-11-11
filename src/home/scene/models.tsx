/**
 * The furniture of the player's home in 3D, from simple shapes (like the
 * office's), in the colour the player chose. Each model stands on the floor
 * at the origin, facing +z (towards the camera side of the room).
 */
import type { ReactNode } from 'react'
import { useAnchors, type AnchorSpec } from '../../world/anchors'
import type { SlotId } from '../../content/home'
import { Desk } from '../../office/scene/furniture'
import { Box, Plant, Sofa } from '../../office/scene/parts'

function Cylinder({
  r,
  h,
  y,
  color,
  emissive,
}: {
  r: number
  h: number
  y: number
  color: string
  emissive?: string
}) {
  return (
    <mesh position={[0, y, 0]}>
      <cylinderGeometry args={[r, r, h, 18]} />
      <meshStandardMaterial
        color={color}
        roughness={0.6}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 0.8 : 0}
      />
    </mesh>
  )
}

/** Sitting on the edge of a bed (its mattress 0.55 m up), facing out either side. */
const bedEdge = (w: number): AnchorSpec[] =>
  [-1, 1].map((side) => ({
    kind: 'seat' as const,
    at: [side * (w / 2 - 0.2), 0.55, 0.3] as [number, number, number],
    heading: side > 0 ? -Math.PI / 2 : Math.PI / 2,
    top: 0.55,
  }))
const BED_EDGE = bedEdge(1)
const BED_EDGE_DOUBLE = bedEdge(1.5)
/** The table's two chairs (seats 0.475 m up), facing the table. */
const TABLE_CHAIRS: AnchorSpec[] = [
  { kind: 'seat', at: [0, 0.475, 0.72], top: 0.475 },
  { kind: 'seat', at: [0, 0.475, -0.72], heading: Math.PI, top: 0.475 },
]

function Seats({ specs, children }: { specs: AnchorSpec[]; children: ReactNode }) {
  const ref = useAnchors(specs)
  return <group ref={ref}>{children}</group>
}

export function FurnitureModel({
  slot,
  item,
  colour,
}: {
  slot: SlotId
  item: string
  colour: string
}) {
  switch (slot) {
    case 'bed': {
      const double = item === 'bed-comfy'
      const w = double ? 1.5 : 1
      return (
        <Seats specs={double ? BED_EDGE_DOUBLE : BED_EDGE}>
          <Box
            size={[w + 0.1, 0.3, 2.1]}
            position={[0, 0.2, 0]}
            color="#8a6a4a"
            radius={0.03}
          />
          <Box size={[w, 0.2, 2]} position={[0, 0.45, 0]} color="#f8fafc" radius={0.05} />
          <Box
            size={[w, 0.08, 1.4]}
            position={[0, 0.58, 0.28]}
            color={colour}
            radius={0.04}
          />
          <Box
            size={[w * 0.8, 0.12, 0.35]}
            position={[0, 0.61, -0.75]}
            color="#ffffff"
            radius={0.05}
          />
          <Box
            size={[w + 0.1, 0.8, 0.08]}
            position={[0, 0.5, -1.04]}
            color="#8a6a4a"
            radius={0.02}
          />
        </Seats>
      )
    }
    case 'sofa':
      return (
        <group scale={0.8}>
          <Sofa color={colour} />
        </group>
      )
    case 'tv':
      return (
        <group>
          <Box
            size={[1.4, 0.45, 0.4]}
            position={[0, 0.22, 0]}
            color="#334155"
            radius={0.02}
          />
          <Box
            size={[1.1, 0.64, 0.05]}
            position={[0, 0.82, 0]}
            color={colour}
            radius={0.01}
          />
          <Box
            size={[1.04, 0.58, 0.01]}
            position={[0, 0.82, 0.03]}
            color="#1e3a8a"
            emissive="#3b82f6"
          />
        </group>
      )
    case 'table':
      return (
        <Seats specs={TABLE_CHAIRS}>
          <Box
            size={[1.1, 0.05, 0.75]}
            position={[0, 0.74, 0]}
            color={colour}
            radius={0.02}
          />
          {[-0.48, 0.48].flatMap((x) =>
            [-0.3, 0.3].map((z) => (
              <Box
                key={`${x}${z}`}
                size={[0.05, 0.72, 0.05]}
                position={[x, 0.36, z]}
                color="#475569"
              />
            )),
          )}
          {[-0.65, 0.65].map((z) => (
            <group key={z} position={[0, 0, z]}>
              <Box size={[0.42, 0.05, 0.42]} position={[0, 0.45, 0]} color={colour} />
              <Box
                size={[0.42, 0.45, 0.05]}
                position={[0, 0.7, z > 0 ? 0.2 : -0.2]}
                color={colour}
              />
            </group>
          ))}
        </Seats>
      )
    case 'desk':
      return (
        <group position={[0, 0, 0]} scale={0.85}>
          <Desk />
        </group>
      )
    case 'kitchen': {
      const fitted = item === 'kitchen-good'
      return (
        <group>
          <Box
            size={[2.2, 0.9, 0.6]}
            position={[0, 0.45, 0]}
            color={colour}
            radius={0.02}
          />
          <Box
            size={[2.25, 0.04, 0.64]}
            position={[0, 0.92, 0]}
            color={fitted ? '#334155' : '#94a3b8'}
          />
          {/* Hob and sink */}
          <Box size={[0.5, 0.01, 0.4]} position={[-0.5, 0.945, 0]} color="#0f172a" />
          <Box size={[0.45, 0.02, 0.35]} position={[0.4, 0.94, 0]} color="#cbd5e1" />
          {/* Fridge */}
          <Box
            size={[0.65, 1.8, 0.62]}
            position={[1.5, 0.9, 0]}
            color="#e5e7eb"
            radius={0.03}
          />
          {fitted && (
            <Box
              size={[2.2, 0.6, 0.35]}
              position={[0, 1.85, -0.12]}
              color={colour}
              radius={0.02}
            />
          )}
        </group>
      )
    }
    case 'coffee':
      return (
        <group position={[0, 0.94, 0]}>
          <Box
            size={[0.25, 0.32, 0.28]}
            position={[0, 0.16, 0]}
            color={colour}
            radius={0.03}
          />
          <Box size={[0.12, 0.03, 0.1]} position={[0, 0.06, 0.12]} color="#9ca3af" />
        </group>
      )
    case 'shower':
      return (
        <group>
          <Box size={[0.9, 0.08, 0.9]} position={[0, 0.04, 0]} color="#f8fafc" />
          <Box
            size={[0.02, 1.9, 0.9]}
            position={[-0.45, 1, 0]}
            color={colour}
            opacity={0.4}
          />
          <Box
            size={[0.9, 1.9, 0.02]}
            position={[0, 1, 0.45]}
            color={colour}
            opacity={0.4}
          />
          <Cylinder r={0.08} h={0.02} y={1.95} color="#94a3b8" />
        </group>
      )
    case 'wardrobe':
      return (
        <group>
          <Box size={[1.2, 2, 0.55]} position={[0, 1, 0]} color={colour} radius={0.02} />
          <Box size={[0.01, 1.9, 0.01]} position={[0, 1, 0.28]} color="#475569" />
          {[-0.08, 0.08].map((x) => (
            <Box
              key={x}
              size={[0.02, 0.18, 0.03]}
              position={[x, 1.05, 0.29]}
              color="#cbd5e1"
            />
          ))}
        </group>
      )
    case 'shelf':
      return (
        <group>
          <Box size={[1, 1.6, 0.32]} position={[0, 0.8, 0]} color={colour} />
          {[0.35, 0.8, 1.25].map((y, shelf) => (
            <group key={y}>
              {Array.from({ length: 6 }, (_, i) => (
                <Box
                  key={i}
                  size={[0.11, 0.3, 0.22]}
                  position={[-0.36 + i * 0.14, y + 0.17, 0.04]}
                  color={
                    ['#1e40af', '#b91c1c', '#0f766e', '#ca8a04', '#475569'][
                      (i + shelf) % 5
                    ]
                  }
                />
              ))}
            </group>
          ))}
        </group>
      )
    case 'plant':
      return <Plant scale={1.1} />
    case 'lamp':
      return (
        <group>
          <Cylinder r={0.15} h={0.03} y={0.015} color="#334155" />
          <Cylinder r={0.02} h={1.5} y={0.76} color="#334155" />
          <mesh position={[0, 1.6, 0]}>
            <coneGeometry args={[0.22, 0.3, 20, 1, true]} />
            <meshStandardMaterial
              color={colour}
              emissive="#fde68a"
              emissiveIntensity={0.6}
              side={2}
            />
          </mesh>
          <pointLight position={[0, 1.5, 0]} intensity={2} distance={4} color="#ffd9a0" />
        </group>
      )
    case 'rug':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <circleGeometry args={[1.1, 32]} />
          <meshStandardMaterial color={colour} roughness={1} />
        </mesh>
      )
    case 'console':
      return (
        <group position={[0, 0.45, 0]}>
          <Box
            size={[0.35, 0.07, 0.25]}
            position={[0, 0.035, 0]}
            color={colour}
            radius={0.02}
          />
        </group>
      )
    case 'mat':
      return <Box size={[0.6, 0.01, 1.7]} position={[0, 0.005, 0]} color={colour} />
  }
}
