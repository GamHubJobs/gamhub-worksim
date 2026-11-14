/**
 * The hospital ward (the healthcare career): the same walkable floor as the
 * office, dressed as Ward 4 of Riverside Community Hospital, with a bay of
 * four beds on the right where the IT corner is in the office. Patients are
 * fictional. Made from simple shapes, like the rest of the office.
 */
import { Html } from '@react-three/drei'
import { Box } from './parts'
import { Bed } from './wardBed'
import { MED_TROLLEY, WARD_BEDS } from './wardLayout'

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
