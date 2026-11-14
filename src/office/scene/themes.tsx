/**
 * The whole-floor dressing of the hospital ward, the law firm and the
 * engineering firm (layout and activities in themeLayout.ts): their support
 * room behind the desks, the room behind reception, and touches in reception,
 * the desks, the manager's office and the break room. Simple shapes, like the
 * rest of the office.
 */
import { Box } from './parts'
import {
  ENGINEERING,
  HOSPITAL,
  LAW,
  MEETING,
  MEETING_TABLE,
  SUPPORT,
  type Theme,
} from './themeLayout'
import { ON_LEFT_WALL, ON_RIGHT_WALL, RoomSign, Sign } from './signs'

const GLASS = '#cfe8f3'

/** Glass walls with a doorway, as in themeLayout.ts. */
function GlassRooms() {
  const s = SUPPORT
  const m = MEETING
  const wall = (x: number, z: number, w: number, d: number) => (
    <group key={`${x}${z}`}>
      <Box size={[w, 2.3, d]} position={[x, 1.15, z]} color={GLASS} opacity={0.35} />
      <Box size={[w, 0.08, d + 0.02]} position={[x, 2.3, z]} color="#475569" />
    </group>
  )
  return (
    <group>
      {wall((s.x0 + s.door[0]) / 2, s.z1, s.door[0] - s.x0, 0.06)}
      {wall((s.door[1] + s.x1) / 2, s.z1, s.x1 - s.door[1], 0.06)}
      {wall(s.x1, (s.z0 + s.z1) / 2, 0.06, s.z1 - s.z0)}
      {/* Glass above the break room's half wall closes the room on its left. */}
      <Box
        size={[0.06, 1.1, s.z1 - s.z0]}
        position={[-3.97, 1.75, (s.z0 + s.z1) / 2]}
        color={GLASS}
        opacity={0.35}
      />
      {wall((m.x0 + m.x1) / 2, m.z0, m.x1 - m.x0, 0.06)}
      {wall(m.x1, (m.z0 + m.door[0]) / 2, 0.06, m.door[0] - m.z0)}
      {wall(m.x1, (m.door[1] + m.z1) / 2, 0.06, m.z1 - m.door[1])}
    </group>
  )
}

/** Shelving filled with boxes or books, against a wall (its long side along x or z). */
function Shelves({
  x,
  z,
  w,
  d,
  height,
  rows,
  colors,
}: {
  x: number
  z: number
  w: number
  d: number
  height: number
  rows: number
  colors: string[]
}) {
  const along = w >= d
  const length = along ? w : d
  const n = Math.max(3, Math.round(length / 0.35))
  return (
    <group position={[x, 0, z]}>
      <Box size={[w, height, d]} position={[0, height / 2, 0]} color="#e5e7eb" />
      {Array.from({ length: rows }, (_, r) => {
        const y = 0.3 + (r * (height - 0.45)) / Math.max(1, rows - 1)
        return Array.from({ length: n }, (_, i) => {
          const f = -length / 2 + (i + 0.5) * (length / n)
          return (
            <Box
              key={`${r}-${i}`}
              size={
                along
                  ? [length / n - 0.04, 0.26, d * 0.8]
                  : [w * 0.8, 0.26, length / n - 0.04]
              }
              position={along ? [f, y, d * 0.12] : [w * 0.12, y, f]}
              color={colors[(r * 3 + i) % colors.length]}
            />
          )
        })
      })}
    </group>
  )
}

function Lockers({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      {[-0.52, -0.17, 0.17, 0.52].map((dx) => (
        <group key={dx}>
          <Box size={[0.33, 1.9, 0.6]} position={[dx, 0.95, 0]} color={color} />
          <Box
            size={[0.04, 0.12, 0.02]}
            position={[dx + 0.1, 1.05, 0.31]}
            color="#334155"
          />
          <Box size={[0.2, 0.03, 0.02]} position={[dx, 1.65, 0.31]} color="#1f2937" />
        </group>
      ))}
    </group>
  )
}

function Chair({
  x,
  z,
  color,
  turn = 0,
}: {
  x: number
  z: number
  color: string
  turn?: number
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, turn, 0]}>
      <Box size={[0.45, 0.06, 0.45]} position={[0, 0.45, 0]} color={color} />
      <Box size={[0.45, 0.45, 0.06]} position={[0, 0.7, -0.2]} color={color} />
      <Box size={[0.05, 0.45, 0.05]} position={[0, 0.22, 0]} color="#475569" />
    </group>
  )
}

// Hospital ---------------------------------------------------------------------

function HospitalDressing() {
  const { medicines, fridge, shelves, couch, lockers, statusBoard, wheelchair } = HOSPITAL
  return (
    <group>
      {/* Treatment room and medicines: locked cupboard, drug fridge, supplies, couch, basin */}
      <Box
        size={[0.6, 2.0, 1.4]}
        position={[medicines.x, 1.0, medicines.z]}
        color="#f8fafc"
      />
      <Box
        size={[0.02, 1.8, 0.02]}
        position={[medicines.x + 0.31, 1.0, medicines.z]}
        color="#94a3b8"
      />
      <Box
        size={[0.03, 0.1, 0.06]}
        position={[medicines.x + 0.32, 1.1, medicines.z + 0.15]}
        color="#b91c1c"
      />
      <Sign
        position={[medicines.x + 0.33, 1.75, medicines.z]}
        rotation={ON_LEFT_WALL}
        className="bg-red-700 text-[8px] text-white"
      >
        Medicines · keep locked
      </Sign>
      <Box size={[0.6, 1.5, 0.6]} position={[fridge.x, 0.75, fridge.z]} color="#e2e8f0" />
      <Box
        size={[0.02, 0.12, 0.2]}
        position={[fridge.x + 0.31, 1.3, fridge.z]}
        color="#0f172a"
        emissive="#22d3ee"
      />
      <Shelves
        x={shelves.x}
        z={shelves.z}
        w={3.2}
        d={0.5}
        height={2.0}
        rows={4}
        colors={['#bfdbfe', '#ffffff', '#bbf7d0', '#fde68a']}
      />
      <Box
        size={[0.76, 0.5, 1.9]}
        position={[couch.x, 0.45, couch.z]}
        color="#5eead4"
        radius={0.05}
      />
      <Box size={[0.7, 0.4, 0.06]} position={[couch.x, 0.2, couch.z]} color="#64748b" />
      <Box size={[0.5, 0.1, 0.35]} position={[0.35, 0.9, -7.6]} color="#f1f5f9" />
      <Sign position={[0.35, 1.45, -7.62]} className="bg-sky-100 text-[8px] text-sky-900">
        Hand basin · clean hands first
      </Sign>
      <RoomSign position={[-2.4, 2.5, SUPPORT.z1 + 0.05]}>
        Treatment room · medicines
      </RoomSign>
      {/* The sluice (dirty utility): its door, off the treatment room */}
      <Box size={[0.8, 2.1, 0.05]} position={[-3.45, 1.05, -7.8]} color="#94a3b8" />
      <Sign
        position={[-3.45, 2.3, -7.76]}
        className="bg-amber-200 text-[8px] text-amber-950"
      >
        Dirty utility (sluice) · staff only
      </Sign>

      {/* Relatives' room behind the ward desk: soft chairs, tissues, leaflets */}
      <Box
        size={[0.9, 0.42, 0.9]}
        position={[MEETING_TABLE.x, 0.21, MEETING_TABLE.z]}
        color="#e7e5e4"
        radius={0.04}
      />
      <Box
        size={[0.18, 0.1, 0.1]}
        position={[MEETING_TABLE.x, 0.47, MEETING_TABLE.z]}
        color="#f9a8d4"
      />
      {[
        [-11.3, -0.8, 0.8],
        [-11.3, 1.1, 2.3],
        [-9.2, -0.9, -0.8],
      ].map(([x, z, turn]) => (
        <Chair key={`${x}${z}`} x={x} z={z} color="#7c9a92" turn={turn} />
      ))}
      <RoomSign position={[MEETING.x1 + 0.05, 2.5, 0.2]} rotation={ON_LEFT_WALL}>
        Relatives’ room
      </RoomSign>

      {/* Ward entrance: a wheelchair, the visiting sign, the patient status board */}
      <group position={[wheelchair.x, 0, wheelchair.z]}>
        <Box size={[0.5, 0.06, 0.5]} position={[0, 0.48, 0]} color="#1f2937" />
        <Box size={[0.5, 0.5, 0.06]} position={[0, 0.76, -0.25]} color="#1f2937" />
        {[-0.28, 0.28].map((dx) => (
          <mesh key={dx} position={[dx, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.3, 0.03, 8, 24]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
        ))}
      </group>
      <Sign
        position={[-11.88, 2.0, 3.1]}
        rotation={ON_LEFT_WALL}
        className="bg-teal-700 text-[9px] text-white"
      >
        Ward 4 · visiting 2–8 pm · please clean your hands
      </Sign>
      <Box
        size={[0.6, 1.9, 1.1]}
        position={[statusBoard.x, 0.95, statusBoard.z]}
        color="#334155"
      />
      <Box
        size={[0.04, 0.8, 1.0]}
        position={[statusBoard.x + 0.31, 1.45, statusBoard.z]}
        color="#0f172a"
        emissive="#0ea5e9"
      />
      <Sign
        position={[statusBoard.x + 0.34, 1.95, statusBoard.z]}
        rotation={ON_RIGHT_WALL + Math.PI}
        className="bg-slate-900 text-[8px] text-white"
      >
        Patient status at a glance · Bay A
      </Sign>
      <RoomSign position={[0.6, 2.5, 3.9]}>Nurses’ station</RoomSign>

      {/* Ward manager's office: the staff rota on the wall */}
      <Box size={[0.04, 1.0, 1.6]} position={[11.95, 1.5, -4.4]} color="#ffffff" />
      <Sign
        position={[11.9, 1.55, -4.4]}
        rotation={ON_RIGHT_WALL}
        className="bg-white text-[8px] text-slate-800"
      >
        Staff rota · early · late · night
      </Sign>

      {/* Staff room lockers */}
      <Lockers x={lockers.x} z={lockers.z} color="#99c7c0" />
    </group>
  )
}

// Law --------------------------------------------------------------------------

const LAW_BOOKS = ['#7f1d1d', '#14532d', '#1e3a8a', '#78350f', '#7f1d1d', '#365314']

function LawDressing() {
  const { bookcases, files, reading, partnerShelves } = LAW
  return (
    <group>
      {/* Library and file room: law reports, statutes, rolling file stacks, a reading table */}
      <Shelves
        x={bookcases.x}
        z={bookcases.z}
        w={4.4}
        d={0.5}
        height={2.2}
        rows={5}
        colors={LAW_BOOKS}
      />
      <Shelves
        x={files.x}
        z={files.z}
        w={0.64}
        d={2.8}
        height={2.0}
        rows={4}
        colors={['#d6c4a1', '#c8b48c', '#94a3b8']}
      />
      <Box
        size={[1.6, 0.05, 1.0]}
        position={[reading.x, 0.76, reading.z]}
        color="#5b3417"
      />
      {[-0.65, 0.65].map((dx) =>
        [-0.4, 0.4].map((dz) => (
          <Box
            key={`${dx}${dz}`}
            size={[0.06, 0.74, 0.06]}
            position={[reading.x + dx, 0.37, reading.z + dz]}
            color="#3f2410"
          />
        )),
      )}
      <Box
        size={[0.3, 0.06, 0.22]}
        position={[reading.x - 0.3, 0.82, reading.z]}
        color="#7f1d1d"
      />
      <Box
        size={[0.25, 0.01, 0.32]}
        position={[reading.x + 0.35, 0.79, reading.z + 0.1]}
        color="#f8fafc"
      />
      <Chair x={reading.x - 0.4} z={reading.z - 0.75} color="#5b3417" />
      <RoomSign position={[-2.4, 2.5, SUPPORT.z1 + 0.05]}>
        Library &amp; file room
      </RoomSign>

      {/* Client meeting room off reception: a round table, four chairs, water */}
      <mesh position={[MEETING_TABLE.x, 0.76, MEETING_TABLE.z]}>
        <cylinderGeometry args={[0.65, 0.65, 0.05, 32]} />
        <meshStandardMaterial color="#5b3417" />
      </mesh>
      <Box
        size={[0.08, 0.74, 0.08]}
        position={[MEETING_TABLE.x, 0.37, MEETING_TABLE.z]}
        color="#3f2410"
      />
      <mesh position={[MEETING_TABLE.x, 0.88, MEETING_TABLE.z]}>
        <cylinderGeometry args={[0.06, 0.06, 0.2, 16]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.7} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
        <Chair
          key={a}
          x={MEETING_TABLE.x + Math.sin(a) * 0.95}
          z={MEETING_TABLE.z + Math.cos(a) * 0.95}
          color="#3f1d24"
          turn={a + Math.PI}
        />
      ))}
      <RoomSign position={[MEETING.x1 + 0.05, 2.5, 0.2]} rotation={ON_LEFT_WALL}>
        Client meeting room
      </RoomSign>

      {/* Reception: framed certificates; the partner's law reports */}
      {[-11.88].map((x) => (
        <group key={x}>
          <Box size={[0.03, 0.5, 0.4]} position={[x, 1.7, 3.2]} color="#78350f" />
          <Box size={[0.03, 0.5, 0.4]} position={[x, 1.7, 3.8]} color="#78350f" />
        </group>
      ))}
      <Shelves
        x={partnerShelves.x}
        z={partnerShelves.z}
        w={0.6}
        d={2.2}
        height={2.2}
        rows={5}
        colors={LAW_BOOKS}
      />
      <RoomSign position={[0.6, 2.5, 3.9]}>Litigation &amp; commercial team</RoomSign>
    </group>
  )
}

// Engineering --------------------------------------------------------------------

function EngineeringDressing() {
  const { plotter, planChest, stores, hardHats, signIn, lockers } = ENGINEERING
  return (
    <group>
      {/* Plot room and stores: the wide plotter, a plan chest, parts bins */}
      <Box
        size={[1.9, 0.5, 0.7]}
        position={[plotter.x, 0.95, plotter.z]}
        color="#e5e7eb"
        radius={0.05}
      />
      <Box
        size={[0.08, 0.7, 0.08]}
        position={[plotter.x - 0.8, 0.35, plotter.z]}
        color="#374151"
      />
      <Box
        size={[0.08, 0.7, 0.08]}
        position={[plotter.x + 0.8, 0.35, plotter.z]}
        color="#374151"
      />
      <Box
        size={[1.6, 0.01, 0.6]}
        position={[plotter.x, 0.75, plotter.z + 0.45]}
        color="#f8fafc"
      />
      <Box
        size={[1.0, 0.9, 1.2]}
        position={[planChest.x, 0.45, planChest.z]}
        color="#64748b"
      />
      {[0.2, 0.4, 0.6, 0.8].map((y) => (
        <Box
          key={y}
          size={[1.02, 0.02, 0.04]}
          position={[planChest.x, y, planChest.z + 0.6]}
          color="#cbd5e1"
        />
      ))}
      <Shelves
        x={stores.x}
        z={stores.z}
        w={0.64}
        d={3.0}
        height={2.0}
        rows={4}
        colors={['#2563eb', '#dc2626', '#facc15', '#16a34a']}
      />
      <RoomSign position={[-2.4, 2.5, SUPPORT.z1 + 0.05]}>
        Plot room &amp; stores
      </RoomSign>

      {/* Project room: a big table with drawings spread out, plans on the wall */}
      <Box
        size={[1.4, 0.05, 2.0]}
        position={[MEETING_TABLE.x, 0.78, MEETING_TABLE.z]}
        color="#e3d3b8"
      />
      <Box
        size={[1.3, 0.76, 0.06]}
        position={[MEETING_TABLE.x, 0.38, MEETING_TABLE.z]}
        color="#94a3b8"
      />
      <Box
        size={[0.9, 0.01, 0.62]}
        position={[MEETING_TABLE.x, 0.81, MEETING_TABLE.z - 0.4]}
        color="#dbeafe"
      />
      <Box
        size={[0.62, 0.01, 0.9]}
        position={[MEETING_TABLE.x + 0.1, 0.815, MEETING_TABLE.z + 0.45]}
        color="#f8fafc"
      />
      <Box size={[0.03, 0.9, 1.3]} position={[-11.88, 1.55, 0.1]} color="#dbeafe" />
      <Sign
        position={[-11.85, 2.15, 0.1]}
        rotation={ON_LEFT_WALL}
        className="bg-blue-900 text-[8px] text-white"
      >
        GA drawing · rev C
      </Sign>
      <RoomSign position={[MEETING.x1 + 0.05, 2.5, 0.2]} rotation={ON_LEFT_WALL}>
        Project room
      </RoomSign>

      {/* Site reception: hard hats and hi-vis for visitors, the sign-in screen */}
      <Box
        size={[0.08, 1.2, 1.0]}
        position={[hardHats.x, 1.2, hardHats.z]}
        color="#334155"
      />
      {[-0.3, 0, 0.3].map((dz, i) => (
        <group key={dz}>
          <Box
            size={[0.26, 0.14, 0.26]}
            position={[hardHats.x + 0.13, 1.6, hardHats.z + dz]}
            color={['#facc15', '#f8fafc', '#facc15'][i]}
            radius={0.06}
          />
          <Box
            size={[0.05, 0.55, 0.26]}
            position={[hardHats.x + 0.07, 1.05, hardHats.z + dz]}
            color="#f97316"
          />
        </group>
      ))}
      <Sign
        position={[-11.85, 2.15, hardHats.z]}
        rotation={ON_LEFT_WALL}
        className="bg-orange-500 text-[8px] text-slate-950"
      >
        Visitors: sign in · PPE beyond this point
      </Sign>
      <Box size={[0.3, 1.1, 0.3]} position={[signIn.x, 0.55, signIn.z]} color="#334155" />
      <Box
        size={[0.3, 0.24, 0.04]}
        position={[signIn.x, 1.2, signIn.z + 0.1]}
        color="#0f172a"
        emissive="#38bdf8"
      />
      <Sign
        position={[signIn.x, 1.5, signIn.z]}
        className="bg-white text-[8px] text-slate-800"
      >
        Sign in here
      </Sign>
      <RoomSign position={[0.6, 2.5, 3.9]}>Design office</RoomSign>

      {/* Mess room lockers and boots; a site plan in the manager's office */}
      <Lockers x={lockers.x} z={lockers.z} color="#64748b" />
      <Box size={[0.04, 1.0, 1.5]} position={[11.95, 1.5, -4.4]} color="#dbeafe" />
      <Sign
        position={[11.9, 2.1, -4.4]}
        rotation={ON_RIGHT_WALL}
        className="bg-white text-[8px] text-slate-800"
      >
        Live projects · Mill Lane footbridge · Solar retrofit
      </Sign>
    </group>
  )
}

/** The theme's own rooms and touches (nothing for the office itself). */
export function ThemeDressing({ theme }: { theme: Theme }) {
  if (theme === 'office') return null
  return (
    <group>
      <GlassRooms />
      {theme === 'hospital' && <HospitalDressing />}
      {theme === 'law' && <LawDressing />}
      {theme === 'engineering' && <EngineeringDressing />}
    </group>
  )
}
