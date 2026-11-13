/**
 * The hospital ward (the healthcare career): the same walkable floor as the
 * office, dressed as Ward 4 of Riverside Community Hospital, with a bay of
 * four beds on the right where the IT corner is in the office. Patients are
 * fictional. Made from simple shapes, like the rest of the office.
 */
import { Html } from '@react-three/drei'
import type { Vector } from '../../content/office'
import { Box } from './parts'
import { BED_X, MED_TROLLEY, WARD_BEDS } from './wardLayout'

function Bed({ id, z, patient, blanket }: (typeof WARD_BEDS)[number]) {
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
      <Html
        transform
        position={[11.88, 1.95, z]}
        rotation={[0, -Math.PI / 2, 0]}
        distanceFactor={4}
        pointerEvents="none"
        zIndexRange={[10, 0]}
      >
        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 shadow">
          {id}
          {patient ? ` · ${patient}` : ''}
        </span>
      </Html>
    </group>
  )
}

/** The bay, the medicines trolley, hand gel and the ward's signs. */
export function WardBay() {
  return (
    <group>
      {/* Hospital floor (pale vinyl) in the bay */}
      <Box size={[6.8, 0.01, 9]} position={[8.6, 0.012, 4.7]} color="#d9e7e4" />
      {WARD_BEDS.map((b) => (
        <Bed key={b.id} {...b} />
      ))}
      {/* Medicines trolley: locked drawers on wheels */}
      <group position={[MED_TROLLEY.x, 0, MED_TROLLEY.z]}>
        <Box
          size={[0.8, 0.85, 0.55]}
          position={[0, 0.5, 0]}
          color="#f1f5f9"
          radius={0.03}
        />
        {[0.3, 0.55, 0.8].map((y) => (
          <Box
            key={y}
            size={[0.72, 0.02, 0.01]}
            position={[0, y, 0.28]}
            color="#94a3b8"
          />
        ))}
        <Box size={[0.8, 0.04, 0.55]} position={[0, 0.95, 0]} color="#0d9488" />
      </group>
      {/* Hand gel at the entrance to the bay */}
      <Box size={[0.14, 0.24, 0.1]} position={[7.4, 1.25, -0.9]} color="#e0f2fe" />
      <Box size={[0.1, 0.04, 0.08]} position={[7.4, 1.12, -0.88]} color="#0ea5e9" />
      <Html
        transform
        position={[7.4, 1.55, -0.89]}
        distanceFactor={4}
        pointerEvents="none"
        zIndexRange={[10, 0]}
      >
        <span className="rounded bg-sky-100 px-1 text-[8px] font-semibold text-sky-900">
          Clean your hands
        </span>
      </Html>
      <Html
        transform
        position={[9.2, 2.45, -0.89]}
        distanceFactor={4}
        pointerEvents="none"
        zIndexRange={[10, 0]}
      >
        <span className="rounded bg-teal-700 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
          BAY A · BEDS 1–4
        </span>
      </Html>
    </group>
  )
}
