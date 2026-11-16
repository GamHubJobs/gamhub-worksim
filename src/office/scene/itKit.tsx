/**
 * The IT corner's equipment, built like the real thing:
 *
 * - the comms cabinet: a 19-inch rack behind a glazed door, with a patch
 *   panel and its ports, the network switch (its port lights flicker with
 *   traffic), the router, two servers with drive bays and activity lights,
 *   the UPS at the bottom, and cable management; the amber light shows a
 *   device in trouble;
 * - on the workbench: a PC opened up (motherboard, RAM, cooler, drive cage),
 *   a multimeter, screwdrivers and a spare drive.
 *
 * Faces -x (the room), like the rest of the IT corner.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh, MeshStandardMaterial } from 'three'
import { prefersReducedMotion } from '../../ui/motion'
import { Box } from './parts'

const STILL = prefersReducedMotion()
const FRONT = -0.3

/** A row of small lights that flicker like network traffic. */
function Traffic({ y, n, z0, z1 }: { y: number; n: number; z0: number; z1: number }) {
  const lights = useRef<Array<Mesh | null>>([])
  const t = useRef(0)
  useFrame((_, dt) => {
    if (STILL) return
    t.current += dt
    lights.current.forEach((m, i) => {
      if (!m) return
      const on = Math.sin(t.current * (7 + (i % 5) * 3.1) + i * 1.7) > 0.1
      ;(m.material as MeshStandardMaterial).emissiveIntensity = on ? 1.2 : 0.1
    })
  })
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            lights.current[i] = m
          }}
          position={[FRONT - 0.012, y, z0 + ((z1 - z0) * (i + 0.5)) / n]}
        >
          <boxGeometry args={[0.006, 0.008, 0.008]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={1}
          />
        </mesh>
      ))}
    </group>
  )
}

/** A 1U or 2U unit in the rack, at height y (its middle). */
function Unit({
  y,
  u = 1,
  color = '#1f2937',
}: {
  y: number
  u?: number
  color?: string
}) {
  return (
    <Box size={[0.04, 0.044 * u - 0.004, 0.44]} position={[FRONT, y, 0]} color={color} />
  )
}

export function CommsRack({ trouble }: { trouble: boolean }) {
  return (
    <group>
      {/* The cabinet, its frame and the glazed, vented door */}
      {/* A steel shell, open at the front: back, sides, top and plinth */}
      <Box size={[0.03, 2.0, 0.68]} position={[0.335, 1.0, 0]} color="#1f2937" />
      {[-0.325, 0.325].map((z) => (
        <Box key={z} size={[0.7, 2.0, 0.03]} position={[0, 1.0, z]} color="#1f2937" />
      ))}
      <Box size={[0.7, 0.04, 0.68]} position={[0, 1.98, 0]} color="#111827" />
      <Box size={[0.7, 0.1, 0.68]} position={[0, 0.05, 0]} color="#111827" />
      {/* The dark inside, behind the equipment */}
      <Box size={[0.02, 1.86, 0.6]} position={[0.3, 1.0, 0]} color="#0b0f17" />
      {/* The glazed door: tinted glass in its frame */}
      <Box
        size={[0.012, 1.8, 0.56]}
        position={[-0.36, 1.0, 0]}
        color="#94a3b8"
        opacity={0.18}
      />
      <Box size={[0.03, 1.86, 0.03]} position={[-0.37, 1.0, -0.29]} color="#334155" />
      <Box size={[0.03, 1.86, 0.03]} position={[-0.37, 1.0, 0.29]} color="#334155" />
      {Array.from({ length: 6 }, (_, i) => (
        <Box
          key={i}
          size={[0.025, 0.012, 0.4]}
          position={[-0.365, 1.82 - i * 0.025, 0]}
          color="#111827"
        />
      ))}
      {/* The rack's posts */}
      {[-0.24, 0.24].map((z) => (
        <Box
          key={z}
          size={[0.02, 1.7, 0.03]}
          position={[FRONT + 0.01, 1.0, z]}
          color="#64748b"
        />
      ))}
      {/* Patch panel: two rows of ports */}
      <Unit y={1.72} />
      {[0, 1].flatMap((row) =>
        Array.from({ length: 12 }, (_, i) => (
          <Box
            key={`${row}-${i}`}
            size={[0.008, 0.012, 0.022]}
            position={[FRONT - 0.022, 1.715 + (row ? -0.008 : 0.008), -0.19 + i * 0.034]}
            color="#0b0f17"
          />
        )),
      )}
      {/* Patch leads, looping down to the switch */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[FRONT - 0.035, 1.67, -0.17 + i * 0.045]}>
          <cylinderGeometry args={[0.003, 0.003, 0.09, 4]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#2563eb' : i % 3 === 1 ? '#f59e0b' : '#e5e7eb'}
          />
        </mesh>
      ))}
      {/* The switch, its port lights flickering */}
      <Unit y={1.6} color="#334155" />
      <Traffic y={1.6} n={12} z0={-0.2} z1={0.2} />
      {/* The router */}
      <Unit y={1.5} color="#0f172a" />
      <Box
        size={[0.006, 0.01, 0.01]}
        position={[FRONT - 0.023, 1.5, 0.18]}
        color={trouble ? '#f59e0b' : '#22c55e'}
        emissive={trouble ? '#f59e0b' : '#22c55e'}
      />
      {/* Two servers, with their drive bays and activity lights */}
      {[1.28, 1.06].map((y) => (
        <group key={y}>
          <Unit y={y} u={2} color="#1f2937" />
          {Array.from({ length: 6 }, (_, i) => (
            <Box
              key={i}
              size={[0.008, 0.07, 0.05]}
              position={[FRONT - 0.022, y, -0.17 + i * 0.058]}
              color="#334155"
            />
          ))}
          <Traffic y={y + 0.03} n={6} z0={-0.2} z1={0.15} />
        </group>
      ))}
      {/* Cable management, and the UPS at the bottom */}
      <Box size={[0.03, 0.04, 0.44]} position={[FRONT, 0.9, 0]} color="#111827" />
      <Unit y={0.3} u={4} color="#111827" />
      <Box
        size={[0.006, 0.05, 0.12]}
        position={[FRONT - 0.023, 0.32, -0.08]}
        color="#0f172a"
        emissive="#0ea5e9"
      />
    </group>
  )
}

/** A PC opened up on the bench, with a multimeter, screwdrivers and a spare drive. */
export function BenchKit() {
  return (
    <group>
      {/* The PC: its case on its side, the motherboard, RAM, cooler and drive cage showing */}
      <group position={[-0.05, 0.97, -0.05]}>
        <Box size={[0.42, 0.02, 0.46]} position={[0, 0.01, 0]} color="#475569" />
        <Box size={[0.42, 0.18, 0.02]} position={[0, 0.1, -0.23]} color="#334155" />
        <Box size={[0.02, 0.18, 0.46]} position={[0.2, 0.1, 0]} color="#334155" />
        <Box size={[0.3, 0.01, 0.3]} position={[-0.02, 0.025, -0.05]} color="#14532d" />
        {[-0.02, 0.0, 0.02, 0.04].map((dz) => (
          <Box
            key={dz}
            size={[0.12, 0.03, 0.006]}
            position={[0.03, 0.045, 0.08 + dz]}
            color="#1d4ed8"
          />
        ))}
        <mesh position={[-0.06, 0.06, -0.05]}>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
        </mesh>
        <Box size={[0.1, 0.08, 0.14]} position={[0.13, 0.06, 0.13]} color="#64748b" />
      </group>
      {/* A multimeter, two screwdrivers, a spare drive */}
      <group position={[-0.1, 0.97, 0.55]}>
        <Box size={[0.09, 0.03, 0.16]} position={[0, 0.015, 0]} color="#facc15" />
        <Box
          size={[0.07, 0.005, 0.06]}
          position={[0, 0.033, -0.03]}
          color="#111827"
          emissive="#164e63"
        />
      </group>
      {[0.25, 0.3].map((z, i) => (
        <mesh key={z} position={[0.1, 0.985, z]} rotation={[Math.PI / 2, 0, 0.3]}>
          <cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
          <meshStandardMaterial color={i ? '#dc2626' : '#2563eb'} />
        </mesh>
      ))}
      <Box size={[0.1, 0.02, 0.15]} position={[0.15, 0.98, -0.4]} color="#94a3b8" />
    </group>
  )
}
