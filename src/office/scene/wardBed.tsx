/** A hospital bed, with or without a patient resting in it (ward.tsx, wardWing.view.tsx). */
import { Sign } from './signs'
import type { Vector } from '../../content/office'
import { Box } from './parts'
import { DripStand, PatientMonitor } from './medicalKit'
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
          <group key={`${dx}${dz}`} position={[BED_X + dx, 0, z + dz]}>
            <Box size={[0.05, 0.36, 0.05]} position={[0, 0.26, 0]} color="#64748b" />
            {/* A castor */}
            <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.055, 0.055, 0.04, 12]} />
              <meshStandardMaterial color="#1f2937" roughness={0.8} />
            </mesh>
          </group>
        )),
      )}
      {/* Side rails, either side of the top half */}
      {[-0.47, 0.47].map((dz) => (
        <group key={dz}>
          <Box
            size={[0.9, 0.03, 0.025]}
            position={[BED_X + 0.45, 0.86, z + dz]}
            color="#cbd5e1"
          />
          <Box
            size={[0.9, 0.03, 0.025]}
            position={[BED_X + 0.45, 0.74, z + dz]}
            color="#cbd5e1"
          />
          {[0.05, 0.85].map((dx) => (
            <Box
              key={dx}
              size={[0.025, 0.2, 0.025]}
              position={[BED_X + dx, 0.78, z + dz]}
              color="#94a3b8"
            />
          ))}
        </group>
      ))}
      {/* The head section, raised a little */}
      <Box
        size={[0.7, 0.1, 0.88]}
        position={[BED_X + 0.62, 0.72, z]}
        color="#f1f5f9"
        radius={0.03}
      />
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
      <PatientMonitor
        x={BED_X + 0.95}
        y={1.55}
        z={z + 0.62}
        rotation={-Math.PI / 2}
        rate={patient ? 72 + (Math.round(z * 7) % 18) : 0}
        live={!!patient}
      />
      {patient && <DripStand x={BED_X + 0.95} z={z - 0.55} />}
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
