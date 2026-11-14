/**
 * The desks made each workplace's own, on the office's desks (same places,
 * same chairs, same seats, so nobody's place or route changes):
 *
 * - **engineering:** drawing boards: a tilted board with a drawing pinned to
 *   it, a parallel rule and an angled lamp, in place of the monitor;
 * - **hospital:** clinical worktops: white laminate, patient-notes folders
 *   in a rack, a box of gloves and hand gel beside the computer;
 * - **law:** walnut desks: a green banker's lamp, a leather desk pad, and a
 *   brief tied with pink tape.
 *
 * The player's own desk keeps its computer (it opens the work computer).
 * Desk-local coordinates as furniture.tsx: the top is 0.765 m up, 1.5 by
 * 0.75, whoever sits is on the +z side facing −z.
 */
import type { Vector } from '../../content/office'
import { Box } from './parts'
import type { DeskStyle } from './deskStyle'

const TOP = 0.765

function Drafting() {
  return (
    <group>
      {/* The board, tilted towards whoever sits, on two brackets */}
      <group position={[0, TOP + 0.16, -0.08]} rotation={[0.42, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.2, 0.025, 0.62]} />
          <meshStandardMaterial color="#e7e5e4" roughness={0.8} />
        </mesh>
        {/* A drawing pinned to it, with its title block */}
        <mesh position={[0, 0.014, 0]}>
          <boxGeometry args={[0.84, 0.004, 0.5]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.9} />
        </mesh>
        <mesh position={[0.3, 0.017, 0.17]}>
          <boxGeometry args={[0.22, 0.003, 0.1]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </mesh>
        {[-0.12, 0.0, 0.1].map((z) => (
          <mesh key={z} position={[-0.1, 0.017, z]}>
            <boxGeometry args={[0.5, 0.002, 0.006]} />
            <meshStandardMaterial color="#1e40af" />
          </mesh>
        ))}
        {/* The parallel rule across it */}
        <mesh position={[0, 0.03, 0.12]}>
          <boxGeometry args={[1.16, 0.012, 0.04]} />
          <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.4} />
        </mesh>
      </group>
      <Box
        size={[0.04, 0.2, 0.04]}
        position={[-0.55, TOP + 0.1, -0.25]}
        color="#475569"
      />
      <Box size={[0.04, 0.2, 0.04]} position={[0.55, TOP + 0.1, -0.25]} color="#475569" />
      {/* An angled lamp */}
      <Box
        size={[0.12, 0.02, 0.12]}
        position={[0.62, TOP + 0.01, 0.15]}
        color="#1f2937"
      />
      <Box size={[0.02, 0.4, 0.02]} position={[0.62, TOP + 0.21, 0.15]} color="#1f2937" />
      <mesh position={[0.55, TOP + 0.42, 0.1]} rotation={[0.6, 0, 0.5]}>
        <coneGeometry args={[0.07, 0.12, 16, 1, true]} />
        <meshStandardMaterial color="#f59e0b" side={2} />
      </mesh>
      {/* Rolled drawings */}
      <mesh position={[-0.58, TOP + 0.04, 0.2]} rotation={[0, 0.2, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.6, 12]} />
        <meshStandardMaterial color="#dbeafe" />
      </mesh>
    </group>
  )
}

function Clinical() {
  const folders = ['#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed']
  return (
    <group>
      {/* The notes rack, with patients' folders in it */}
      <Box
        size={[0.36, 0.26, 0.22]}
        position={[-0.5, TOP + 0.13, -0.18]}
        color="#cbd5e1"
      />
      {folders.map((c, i) => (
        <Box
          key={c}
          size={[0.05, 0.28, 0.2]}
          position={[-0.64 + i * 0.07, TOP + 0.16, -0.18]}
          color={c}
        />
      ))}
      {/* A box of gloves, and hand gel */}
      <Box
        size={[0.24, 0.08, 0.12]}
        position={[0.55, TOP + 0.04, -0.2]}
        color="#e0f2fe"
      />
      <Box
        size={[0.1, 0.012, 0.03]}
        position={[0.55, TOP + 0.082, -0.2]}
        color="#38bdf8"
      />
      <mesh position={[0.62, TOP + 0.08, 0.02]}>
        <cylinderGeometry args={[0.03, 0.03, 0.16, 12]} />
        <meshStandardMaterial color="#bae6fd" />
      </mesh>
      <Box
        size={[0.03, 0.04, 0.03]}
        position={[0.62, TOP + 0.18, 0.02]}
        color="#f8fafc"
      />
    </group>
  )
}

function Legal() {
  return (
    <group>
      {/* A leather pad in front of whoever sits */}
      <Box size={[0.6, 0.006, 0.36]} position={[0, TOP + 0.004, 0.14]} color="#14532d" />
      {/* The banker's lamp: brass stand, green shade */}
      <Box
        size={[0.16, 0.02, 0.1]}
        position={[-0.55, TOP + 0.01, -0.2]}
        color="#b45309"
      />
      <Box
        size={[0.02, 0.26, 0.02]}
        position={[-0.55, TOP + 0.13, -0.2]}
        color="#b45309"
      />
      <mesh position={[-0.55, TOP + 0.28, -0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.07, 0.3, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial
          color="#15803d"
          emissive="#14532d"
          emissiveIntensity={0.3}
          side={2}
        />
      </mesh>
      {/* A brief tied with pink tape */}
      <Box
        size={[0.24, 0.05, 0.32]}
        position={[0.45, TOP + 0.025, -0.15]}
        color="#f8fafc"
      />
      <Box
        size={[0.25, 0.052, 0.025]}
        position={[0.45, TOP + 0.027, -0.15]}
        color="#f472b6"
      />
      <Box
        size={[0.025, 0.052, 0.33]}
        position={[0.45, TOP + 0.027, -0.15]}
        color="#f472b6"
      />
    </group>
  )
}

/** What makes a desk this workplace's own: drawn on the desk, at its place. */
export function DeskDressing({
  style,
  position,
  rotation = 0,
}: {
  style: DeskStyle
  position: Vector
  rotation?: number
}) {
  if (style === 'office') return null
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {style === 'drafting' && <Drafting />}
      {style === 'clinical' && <Clinical />}
      {style === 'legal' && <Legal />}
    </group>
  )
}
