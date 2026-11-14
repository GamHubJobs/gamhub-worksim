/** A hospital bed, with or without a patient resting in it (ward.tsx, wardWing.view.tsx). */
import { Sign } from './signs'
import type { Vector } from '../../content/office'
import { Box } from './parts'
import { BED_X as BED_X_A, type WARD_BEDS } from './wardLayout'

/** A bed with its headboard to +x: at x (its middle), its sign on the wall at signX. */
export function Bed({
  id,
  z,
  patient,
  blanket,
  x: BED_X = BED_X_A,
  signX = 11.88,
}: (typeof WARD_BEDS)[number] & { x?: number; signX?: number }) {
  const head: Vector = [BED_X + 0.82, 0.78, z]
  return (
    <group>
      {/* Frame, mattress, headboard and footboard */}
      <Box size={[2.05, 0.08, 0.95]} position={[BED_X, 0.48, z]} color="#94a3b8" />
      <Box
        size={[2.0, 0.16, 0.9]}
        position={[BED_X, 0.6, z]}
        color="#f8fafc"
        radius={0.04}
      />
      <Box size={[0.06, 0.9, 0.95]} position={[BED_X + 1.03, 0.75, z]} color="#cbd5e1" />
      <Box size={[0.06, 0.6, 0.95]} position={[BED_X - 1.03, 0.62, z]} color="#cbd5e1" />
      {[-0.85, 0.85].map((dx) =>
        [-0.42, 0.42].map((dz) => (
          <Box
            key={`${dx}${dz}`}
            size={[0.05, 0.44, 0.05]}
            position={[BED_X + dx, 0.22, z + dz]}
            color="#64748b"
          />
        )),
      )}
      {patient && (
        <>
          {/* The patient, resting: a pillow, a head and a blanket */}
          <Box
            size={[0.42, 0.12, 0.6]}
            position={[BED_X + 0.72, 0.74, z]}
            color="#ffffff"
            radius={0.04}
          />
          <mesh position={head}>
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshStandardMaterial color="#c08a64" roughness={0.9} />
          </mesh>
          <Box
            size={[1.45, 0.16, 0.82]}
            position={[BED_X - 0.1, 0.74, z]}
            color={blanket}
            radius={0.05}
          />
        </>
      )}
      {/* Locker and monitor on a stand */}
      <Box
        size={[0.45, 0.8, 0.42]}
        position={[BED_X + 0.6, 0.4, z - 0.78]}
        color="#e2e8f0"
      />
      <Box
        size={[0.04, 1.5, 0.04]}
        position={[BED_X + 0.95, 0.75, z + 0.62]}
        color="#64748b"
      />
      <Box
        size={[0.32, 0.24, 0.08]}
        position={[BED_X + 0.95, 1.55, z + 0.62]}
        color="#0f172a"
        emissive="#22c55e"
      />
      {/* Curtain (pulled back) and the bed sign */}
      <Box
        size={[0.9, 1.7, 0.03]}
        position={[BED_X + 0.55, 1.35, z - 1.12]}
        color="#5eead4"
        opacity={0.85}
      />
      {/* Seen from the bay only (not through the wall from the other side) */}
      <Sign
        position={[signX, 1.95, z]}
        rotation={-Math.PI / 2}
        className="bg-white text-[10px] text-teal-800"
      >
        {id}
        {patient ? ` · ${patient}` : ''}
      </Sign>
    </group>
  )
}
