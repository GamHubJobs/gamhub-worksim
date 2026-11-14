/**
 * Each Cobalt Ridge department's own corner, where the IT team has its IT
 * corner (layouts and activities in cornersLayout.ts). Simple shapes, like
 * the rest of the office.
 */
import { Box } from './parts'
import { DEVTEAM, INSIGHTS, POST, RECORDS, STUDIO } from './cornersLayout'
import { ON_RIGHT_WALL, RoomSign, Sign } from './signs'

/** A floor finish for the corner, so it reads as its own room. */
function CornerFloor({ color }: { color: string }) {
  return <Box size={[6.8, 0.01, 9.9]} position={[8.6, 0.012, 4.2]} color={color} />
}

function Shelf({
  x,
  z,
  depth,
  length,
  height,
  rows,
  colors,
}: {
  x: number
  z: number
  depth: number
  length: number
  height: number
  rows: number
  colors: string[]
}) {
  const items = Array.from({ length: rows }, (_, r) => r)
  return (
    <group position={[x, 0, z]}>
      <Box size={[depth, height, length]} position={[0, height / 2, 0]} color="#e5e7eb" />
      {items.map((r) => {
        const y = 0.25 + (r * (height - 0.35)) / Math.max(1, rows - 1)
        return (
          <group key={r}>
            <Box
              size={[depth + 0.02, 0.03, length]}
              position={[0, y - 0.13, 0]}
              color="#9ca3af"
            />
            {[-0.35, 0, 0.35].map((f, i) => (
              <Box
                key={f}
                size={[depth * 0.7, 0.2, length * 0.28]}
                position={[-0.02, y, f * length]}
                color={colors[(r + i) % colors.length]}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}

export function PostRoom() {
  const { copier, pigeonholes, supplies, table } = POST
  return (
    <group>
      <CornerFloor color="#d6d3cc" />
      {/* The big copier and printer */}
      <Box
        size={[0.9, 1.0, 1.1]}
        position={[copier.x, 0.5, copier.z]}
        color="#e2e8f0"
        radius={0.04}
      />
      <Box
        size={[0.8, 0.18, 1.0]}
        position={[copier.x, 1.09, copier.z]}
        color="#cbd5e1"
      />
      <Box
        size={[0.05, 0.12, 0.3]}
        position={[copier.x - 0.46, 1.05, copier.z - 0.3]}
        color="#0f172a"
        emissive="#22c55e"
      />
      {/* Pigeonholes for everyone's post */}
      <Box
        size={[0.6, 1.9, 2.0]}
        position={[pigeonholes.x, 0.95, pigeonholes.z]}
        color="#a16207"
      />
      {[0.5, 0.9, 1.3, 1.7].map((y) =>
        [-0.75, -0.25, 0.25, 0.75].map((dz) => (
          <Box
            key={`${y}${dz}`}
            size={[0.02, 0.3, 0.42]}
            position={[pigeonholes.x - 0.31, y, pigeonholes.z + dz]}
            color={(y * 10 + dz * 4) % 3 > 1.5 ? '#f8fafc' : '#713f12'}
          />
        )),
      )}
      {/* The supplies cupboard, open: paper, toner, envelopes */}
      <Shelf
        x={supplies.x}
        z={supplies.z}
        depth={0.9}
        length={1.8}
        height={2.0}
        rows={4}
        colors={['#f8fafc', '#1f2937', '#fde68a', '#bfdbfe']}
      />
      {/* The sorting table with today's post */}
      <Box size={[1.0, 0.05, 2.0]} position={[table.x, 0.88, table.z]} color="#e3d3b8" />
      <Box
        size={[0.9, 0.86, 0.05]}
        position={[table.x, 0.43, table.z - 0.95]}
        color="#94a3b8"
      />
      <Box
        size={[0.9, 0.86, 0.05]}
        position={[table.x, 0.43, table.z + 0.95]}
        color="#94a3b8"
      />
      {[-0.5, 0.1, 0.6].map((dz, i) => (
        <Box
          key={dz}
          size={[0.3, 0.03 + i * 0.02, 0.22]}
          position={[table.x, 0.93, table.z + dz]}
          color={['#f8fafc', '#fef3c7', '#e0f2fe'][i]}
        />
      ))}
      <Box
        size={[0.4, 0.5, 0.35]}
        position={[table.x - 0.1, 0.25, table.z + 1.4]}
        color="#334155"
      />
      <Sign
        position={[table.x - 0.1, 0.65, table.z + 1.4]}
        className="bg-white text-[8px] text-slate-700"
      >
        Shredder · confidential waste
      </Sign>
      <Sign
        position={[12.0, 2.2, supplies.z]}
        rotation={ON_RIGHT_WALL}
        className="bg-white text-[10px] text-slate-800"
      >
        Stationery and supplies · order by Thursday
      </Sign>
      <RoomSign position={[8.2, 2.45, -0.89]}>Post &amp; print room</RoomSign>
    </group>
  )
}

export function RecordsRoom() {
  const { safe, cabinets, archive, ledger } = RECORDS
  return (
    <group>
      <CornerFloor color="#c7cdd6" />
      {/* The fire-proof safe (petty cash, cheque books) */}
      <Box
        size={[0.84, 1.1, 0.84]}
        position={[safe.x, 0.55, safe.z]}
        color="#374151"
        radius={0.03}
      />
      <mesh position={[safe.x - 0.43, 0.65, safe.z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.04, 20]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* A row of four locking filing cabinets */}
      {[-1.08, -0.36, 0.36, 1.08].map((dz) => (
        <group key={dz}>
          <Box
            size={[0.7, 1.3, 0.7]}
            position={[cabinets.x, 0.65, cabinets.z + dz]}
            color="#9ca3af"
          />
          {[0.3, 0.62, 0.94, 1.22].map((y) => (
            <Box
              key={y}
              size={[0.02, 0.04, 0.22]}
              position={[cabinets.x - 0.36, y, cabinets.z + dz]}
              color="#4b5563"
            />
          ))}
        </group>
      ))}
      {/* Archive shelving: boxes by year */}
      <Shelf
        x={archive.x}
        z={archive.z}
        depth={0.76}
        length={2.0}
        height={2.0}
        rows={4}
        colors={['#d6c4a1', '#c8b48c', '#e2d3b5']}
      />
      <Sign
        position={[12.0, 2.25, archive.z]}
        rotation={ON_RIGHT_WALL}
        className="bg-white text-[10px] text-slate-800"
      >
        Archive · keep 6 years
      </Sign>
      {/* The ledger desk, with statements, a calculator and a lamp */}
      <Box
        size={[0.9, 0.05, 1.5]}
        position={[ledger.x, 0.76, ledger.z]}
        color="#8a6a4a"
      />
      <Box
        size={[0.85, 0.74, 0.05]}
        position={[ledger.x + 0.4, 0.37, ledger.z]}
        color="#6b4f34"
      />
      <Box
        size={[0.24, 0.03, 0.3]}
        position={[ledger.x, 0.8, ledger.z - 0.3]}
        color="#f8fafc"
      />
      <Box
        size={[0.16, 0.03, 0.2]}
        position={[ledger.x - 0.05, 0.8, ledger.z + 0.25]}
        color="#1f2937"
      />
      <Box
        size={[0.04, 0.4, 0.04]}
        position={[ledger.x + 0.25, 0.98, ledger.z + 0.55]}
        color="#15803d"
      />
      <Sign
        position={[ledger.x, 1.35, ledger.z]}
        className="bg-white text-[9px] text-slate-800"
      >
        Month end: bank reconciled? ✔
      </Sign>
      <RoomSign position={[8.2, 2.45, -0.89]}>Records room</RoomSign>
    </group>
  )
}

export function Studio() {
  const { backdrop, product, tripod, lights, wall } = STUDIO
  return (
    <group>
      <CornerFloor color="#e7e5e4" />
      {/* Paper backdrop sweeping down to the floor, on its stand */}
      <Box
        size={[0.08, 2.4, 2.9]}
        position={[backdrop.x + 0.15, 1.2, backdrop.z]}
        color="#fef9c3"
      />
      <Box
        size={[0.9, 0.02, 2.9]}
        position={[backdrop.x - 0.25, 0.02, backdrop.z]}
        color="#fef9c3"
      />
      <Box
        size={[0.1, 0.1, 3.1]}
        position={[backdrop.x + 0.15, 2.45, backdrop.z]}
        color="#334155"
      />
      {/* The product table with a mug and a notebook to photograph */}
      <Box
        size={[0.7, 0.8, 0.9]}
        position={[product.x, 0.4, product.z]}
        color="#ffffff"
      />
      <mesh position={[product.x, 0.88, product.z - 0.15]}>
        <cylinderGeometry args={[0.07, 0.07, 0.14, 20]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
      <Box
        size={[0.2, 0.03, 0.28]}
        position={[product.x, 0.82, product.z + 0.2]}
        color="#f97316"
      />
      {/* Two soft lights on stands */}
      {lights.map((l) => (
        <group key={l.z} position={[l.x, 0, l.z]}>
          <Box size={[0.04, 1.6, 0.04]} position={[0, 0.8, 0]} color="#1f2937" />
          <Box
            size={[0.5, 0.5, 0.12]}
            position={[0.1, 1.7, 0]}
            rotation={l.z < backdrop.z ? -0.6 : 0.6}
            color="#f8fafc"
            emissive="#fef3c7"
          />
        </group>
      ))}
      {/* The camera on its tripod */}
      <group position={[tripod.x, 0, tripod.z]}>
        {[0, 2.1, 4.2].map((a) => (
          <Box
            key={a}
            size={[0.03, 1.35, 0.03]}
            position={[Math.sin(a) * 0.15, 0.67, Math.cos(a) * 0.15]}
            color="#111827"
          />
        ))}
        <Box size={[0.22, 0.15, 0.12]} position={[0, 1.42, 0]} color="#111827" />
        <mesh position={[0.14, 1.42, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 16]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      </group>
      {/* The campaign wall: weeks across, channels down, on cards */}
      <Box size={[0.05, 1.3, 2.4]} position={[wall.x, 1.45, wall.z]} color="#c2a477" />
      {[0, 1, 2, 3].map((col) =>
        [0, 1, 2].map((row) => (
          <Box
            key={`${col}${row}`}
            size={[0.02, 0.22, 0.4]}
            position={[wall.x - 0.03, 1.85 - row * 0.38, wall.z - 0.85 + col * 0.57]}
            color={['#fde047', '#f9a8d4', '#86efac', '#93c5fd'][(col + row) % 4]}
          />
        )),
      )}
      <Sign
        position={[wall.x - 0.06, 2.3, wall.z]}
        rotation={ON_RIGHT_WALL}
        className="bg-white text-[10px] text-slate-800"
      >
        Campaign wall · this month
      </Sign>
      <RoomSign position={[8.2, 2.45, -0.89]}>Content studio</RoomSign>
    </group>
  )
}

export function InsightsWall() {
  const { console: desk, table, board } = INSIGHTS
  const screens = [
    { dz: -1.0, glow: '#38bdf8', title: 'Sales by region' },
    { dz: 0, glow: '#a78bfa', title: 'Customer churn' },
    { dz: 1.0, glow: '#34d399', title: 'Survey scores' },
  ]
  return (
    <group>
      <CornerFloor color="#cbd5e1" />
      {/* Three wall-mounted dashboards above a low console */}
      {screens.map((s) => (
        <group key={s.dz}>
          <Box
            size={[0.06, 0.62, 0.92]}
            position={[11.98, 1.75, desk.z + s.dz]}
            color="#0f172a"
            emissive={s.glow}
          />
          <Sign
            position={[11.93, 2.15, desk.z + s.dz]}
            rotation={ON_RIGHT_WALL}
            className="bg-slate-900 text-[8px] text-white"
          >
            {s.title}
          </Sign>
        </group>
      ))}
      <Box size={[0.6, 0.9, 3.0]} position={[desk.x, 0.45, desk.z]} color="#e5e7eb" />
      {/* The standing table, with printed charts and pens */}
      <Box size={[1.0, 0.05, 1.8]} position={[table.x, 1.05, table.z]} color="#f1f5f9" />
      <Box size={[0.1, 1.02, 0.1]} position={[table.x, 0.51, table.z]} color="#475569" />
      <Box size={[0.8, 0.04, 0.5]} position={[table.x, 0.02, table.z]} color="#475569" />
      <Box
        size={[0.3, 0.01, 0.42]}
        position={[table.x - 0.1, 1.08, table.z - 0.4]}
        color="#ffffff"
      />
      <Box
        size={[0.3, 0.01, 0.42]}
        position={[table.x + 0.05, 1.08, table.z + 0.35]}
        color="#ffffff"
      />
      {/* A printed chart board */}
      <Box size={[0.05, 1.0, 1.5]} position={[board.x, 1.4, board.z]} color="#ffffff" />
      {[0.25, 0.5, 0.38, 0.7, 0.55].map((h, i) => (
        <Box
          key={i}
          size={[0.02, h, 0.16]}
          position={[board.x - 0.03, 1.0 + h / 2, board.z - 0.5 + i * 0.25]}
          color="#2563eb"
        />
      ))}
      <RoomSign position={[8.2, 2.45, -0.89]}>Insights wall</RoomSign>
    </group>
  )
}

export function DevTeamArea() {
  const { sprint, devices, rack, pairing } = DEVTEAM
  const columns = ['To do', 'Doing', 'Review', 'Done']
  return (
    <group>
      <CornerFloor color="#d1d5db" />
      {/* The sprint board: four columns of cards */}
      <Box
        size={[0.05, 1.3, 2.6]}
        position={[sprint.x, 1.45, sprint.z]}
        color="#ffffff"
      />
      {columns.map((name, col) => (
        <group key={name}>
          <Sign
            position={[sprint.x - 0.04, 2.0, sprint.z - 0.97 + col * 0.65]}
            rotation={ON_RIGHT_WALL}
            className="bg-slate-700 text-[7px] text-white"
          >
            {name}
          </Sign>
          {Array.from({ length: 4 - Math.abs(col - 1) }, (_, row) => (
            <Box
              key={row}
              size={[0.02, 0.18, 0.3]}
              position={[
                sprint.x - 0.03,
                1.72 - row * 0.24,
                sprint.z - 0.97 + col * 0.65,
              ]}
              color={['#fde047', '#fca5a5', '#93c5fd', '#86efac'][col]}
            />
          ))}
        </group>
      ))}
      {/* The build monitor: is main green? */}
      <Box
        size={[0.06, 0.55, 0.95]}
        position={[11.98, 1.8, 6.9]}
        color="#0f172a"
        emissive="#16a34a"
      />
      <Sign
        position={[11.93, 1.8, 6.9]}
        rotation={ON_RIGHT_WALL}
        className="bg-green-700 text-[9px] text-white"
      >
        main · build passing ✔
      </Sign>
      {/* Test devices on a shelf: phones and tablets */}
      <Box
        size={[0.64, 1.1, 1.3]}
        position={[devices.x, 0.55, devices.z]}
        color="#e5e7eb"
      />
      {[-0.45, -0.15, 0.15, 0.45].map((dz, i) => (
        <Box
          key={dz}
          size={[0.04, i % 2 ? 0.26 : 0.18, i % 2 ? 0.2 : 0.1]}
          position={[devices.x - 0.1, 1.2, devices.z + dz]}
          color="#111827"
          emissive={i % 2 ? '#60a5fa' : '#f472b6'}
        />
      ))}
      {/* A small server rack for the test environment */}
      <Box size={[0.76, 1.9, 0.76]} position={[rack.x, 0.95, rack.z]} color="#111827" />
      {[0.4, 0.7, 1.0, 1.3, 1.6].map((y) => (
        <Box
          key={y}
          size={[0.02, 0.06, 0.5]}
          position={[rack.x - 0.39, y, rack.z]}
          color="#334155"
          emissive={y > 1 ? '#22c55e' : '#3b82f6'}
        />
      ))}
      {/* The pairing desk: two screens, one keyboard each */}
      <Box
        size={[0.9, 0.05, 1.9]}
        position={[pairing.x, 0.76, pairing.z]}
        color="#e3d3b8"
      />
      <Box
        size={[0.85, 0.74, 0.05]}
        position={[pairing.x + 0.4, 0.37, pairing.z]}
        color="#94a3b8"
      />
      {[-0.45, 0.45].map((dz) => (
        <group key={dz}>
          <Box
            size={[0.05, 0.4, 0.66]}
            position={[pairing.x + 0.25, 1.05, pairing.z + dz]}
            color="#0f172a"
            emissive="#1e40af"
          />
          <Box
            size={[0.2, 0.02, 0.45]}
            position={[pairing.x - 0.15, 0.8, pairing.z + dz]}
            color="#1f2937"
          />
        </group>
      ))}
      <RoomSign position={[8.2, 2.45, -0.89]}>Dev team area</RoomSign>
    </group>
  )
}
