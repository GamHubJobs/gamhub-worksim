/**
 * The clinical equipment of a ward bay, where it is used on a real ward:
 *
 * - at each bed's head, on the wall: the services panel (piped oxygen with its
 *   flowmeter, suction with its canister, the nurse-call handset and the
 *   bed-head light);
 * - between the beds: the privacy-curtain track on the ceiling, its curtain
 *   drawn back against the wall;
 * - at the end of the bay: the resuscitation trolley (red, with the
 *   defibrillator on top and the drawers of drugs and airways), and a vital
 *   signs monitor on its wheeled stand (cuff, probe and thermometer);
 * - on the wall by the entrance: the sharps bin and the glove dispenser.
 */
import { Box } from './parts'

/** The services panel on the wall at a bed's head (the wall faces -x). */
export function BedHeadServices({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box size={[0.04, 0.32, 1.5]} position={[0, 1.45, 0]} color="#e2e8f0" />
      {/* Oxygen: the outlet, the flowmeter and its green tubing */}
      <Box size={[0.05, 0.1, 0.1]} position={[-0.04, 1.47, -0.45]} color="#f8fafc" />
      <mesh position={[-0.1, 1.42, -0.45]}>
        <cylinderGeometry args={[0.03, 0.03, 0.16, 10]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.7} />
      </mesh>
      <Box size={[0.02, 0.02, 0.02]} position={[-0.1, 1.5, -0.45]} color="#16a34a" />
      {/* Suction: the regulator and its canister */}
      <Box size={[0.05, 0.1, 0.1]} position={[-0.04, 1.47, 0.0]} color="#f8fafc" />
      <mesh position={[-0.12, 1.25, 0.0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.2, 12]} />
        <meshStandardMaterial color="#fef3c7" transparent opacity={0.75} />
      </mesh>
      {/* Nurse call and the bed-head light */}
      <Box size={[0.05, 0.12, 0.06]} position={[-0.04, 1.45, 0.45]} color="#dc2626" />
      <Box
        size={[0.06, 0.05, 0.9]}
        position={[-0.05, 1.95, 0]}
        color="#f8fafc"
        emissive="#fef9c3"
      />
    </group>
  )
}

/** A curtain track across the bay at z, from the wall (x1) out to x0, the curtain drawn back. */
export function CurtainTrack({ x0, x1, z }: { x0: number; x1: number; z: number }) {
  return (
    <group>
      <Box
        size={[x1 - x0, 0.03, 0.04]}
        position={[(x0 + x1) / 2, 2.62, z]}
        color="#cbd5e1"
      />
      {/* The curtain, gathered against the wall: folds of it */}
      {[0, 0.12, 0.24].map((dx, i) => (
        <Box
          key={dx}
          size={[0.1, 1.9, 0.06]}
          position={[x1 - 0.12 - dx, 1.62, z + (i % 2 ? 0.03 : -0.03)]}
          color="#7dd3fc"
        />
      ))}
    </group>
  )
}

/** The resuscitation trolley, with its defibrillator. */
export function ResusTrolley({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box size={[0.7, 0.9, 0.5]} position={[0, 0.55, 0]} color="#dc2626" radius={0.03} />
      {[0.3, 0.5, 0.7, 0.88].map((y) => (
        <Box
          key={y}
          size={[0.62, 0.015, 0.01]}
          position={[0, y, 0.255]}
          color="#7f1d1d"
        />
      ))}
      {/* The seal on the drawers, the defibrillator, its pads and screen */}
      <Box size={[0.04, 0.04, 0.01]} position={[0.25, 0.78, 0.26]} color="#facc15" />
      <Box size={[0.42, 0.24, 0.3]} position={[0, 1.13, -0.02]} color="#f59e0b" />
      <Box
        size={[0.2, 0.12, 0.01]}
        position={[-0.06, 1.16, 0.135]}
        color="#0f172a"
        emissive="#22c55e"
      />
      <Box size={[0.08, 0.08, 0.01]} position={[0.14, 1.16, 0.135]} color="#dc2626" />
      {/* The oxygen cylinder strapped to its side, and the castors */}
      <mesh position={[0.4, 0.75, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.7, 12]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      {[-0.3, 0.3].flatMap((cx) =>
        [-0.2, 0.2].map((cz) => (
          <mesh key={`${cx}${cz}`} position={[cx, 0.05, cz]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        )),
      )}
    </group>
  )
}

/** A vital-signs monitor on its wheeled stand: screen, cuff in its basket, probe. */
export function VitalsStand({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <Box
          key={i}
          size={[0.32, 0.02, 0.04]}
          position={[0, 0.05, 0]}
          rotation={(i * Math.PI * 2) / 5}
          color="#334155"
        />
      ))}
      <Box
        size={[0.3, 0.24, 0.12]}
        position={[0, 1.32, 0]}
        color="#f1f5f9"
        radius={0.02}
      />
      <Box
        size={[0.22, 0.14, 0.01]}
        position={[0, 1.34, 0.065]}
        color="#0f172a"
        emissive="#0ea5e9"
      />
      {/* The cuff and the thermometer in the basket below */}
      <Box size={[0.24, 0.1, 0.16]} position={[0, 1.0, 0.04]} color="#cbd5e1" />
      <Box size={[0.16, 0.05, 0.06]} position={[-0.03, 1.07, 0.05]} color="#1d4ed8" />
    </group>
  )
}

/** The sharps bin (yellow, its orange lid) and the glove dispenser, on a wall facing +z. */
export function SharpsAndGloves({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box size={[0.24, 0.26, 0.16]} position={[0, 1.05, 0.08]} color="#facc15" />
      <Box size={[0.25, 0.04, 0.17]} position={[0, 1.19, 0.08]} color="#ea580c" />
      {[-0.17, 0, 0.17].map((dx, i) => (
        <Box
          key={dx}
          size={[0.15, 0.12, 0.09]}
          position={[0.45 + dx, 1.4, 0.05]}
          color={['#bfdbfe', '#c7d2fe', '#ddd6fe'][i]}
        />
      ))}
    </group>
  )
}
