/**
 * Kettle & Crumb inside: a warm café with a counter and espresso machine, a
 * glass case of cakes and pastries, a menu board with today's prices, tables
 * by the windows, and a few customers. The counter, the cake case and a free
 * table are hotspots for the café's own actions.
 */
import { PLACE_ACTIONS } from '../../../content/city'
import { formatMoney } from '../../../content/life'
import { Box, Plant } from '../../../office/scene/parts'
import { Person } from '../../../office/scene/people'
import { Board, Chair, Hotspot, Lamp, Room, Window } from './common'
import { PLAYER, menuPainting, signPainting, useInterior } from './kit'

const price = (id: string) =>
  formatMoney(PLACE_ACTIONS.find((a) => a.id === id)?.cost ?? 0)

const MENU = menuPainting(
  'Kettle & Crumb',
  [
    ['Breakfast plate', price('cafe-breakfast')],
    ['Coffee & cake', price('cafe-coffee')],
    ['Dinner of the day', price('cafe-dinner')],
    ['Pot of tea', '£2.60'],
    ['Toasted sandwich', '£5.20'],
  ],
  { background: '#1c1917', ink: '#f5f5f4', accent: '#fbbf24' },
)

function Table({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.05, 28]} />
        <meshStandardMaterial color="#a16207" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.74, 10]} />
        <meshStandardMaterial color="#292524" />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 20]} />
        <meshStandardMaterial color="#292524" />
      </mesh>
      <Chair position={[0, 0, 0.75]} />
      <Chair position={[0, 0, -0.75]} rotation={Math.PI} />
    </group>
  )
}

function Cup({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.1, 12]} />
        <meshStandardMaterial color="#fafaf9" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.09, 0.09, 0.01, 16]} />
        <meshStandardMaterial color="#e7e5e4" />
      </mesh>
    </group>
  )
}

/** Cakes and pastries under glass. */
function CakeCase() {
  const cakes: Array<[number, number, string, 'round' | 'slice' | 'bun']> = [
    [-0.7, 0, '#f9a8d4', 'round'],
    [-0.25, 0, '#78350f', 'round'],
    [0.2, 0, '#fde68a', 'slice'],
    [0.65, 0, '#fef3c7', 'bun'],
    [-0.6, 0.32, '#fbbf24', 'bun'],
    [-0.15, 0.32, '#c2410c', 'bun'],
    [0.3, 0.32, '#e11d48', 'slice'],
    [0.7, 0.32, '#a3e635', 'round'],
  ]
  return (
    <group>
      <Box size={[1.9, 1, 0.8]} position={[0, 0.5, 0]} color="#e7e5e4" />
      <Box size={[1.9, 0.6, 0.8]} position={[0, 1.3, 0]} color="#e0f2fe" opacity={0.25} />
      {[1.02, 1.32].map((y) => (
        <Box key={y} size={[1.8, 0.02, 0.7]} position={[0, y, 0]} color="#d6d3d1" />
      ))}
      {cakes.map(([x, dy, colour, shape], i) => (
        <mesh key={i} position={[x, 1.1 + dy, 0]}>
          {shape === 'round' ? (
            <cylinderGeometry args={[0.15, 0.15, 0.12, 18]} />
          ) : shape === 'slice' ? (
            <boxGeometry args={[0.22, 0.1, 0.14]} />
          ) : (
            <sphereGeometry args={[0.09, 12, 10]} />
          )}
          <meshStandardMaterial color={colour} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function EspressoMachine() {
  return (
    <group>
      <Box
        size={[0.9, 0.55, 0.5]}
        position={[0, 0.28, 0]}
        color="#b91c1c"
        radius={0.05}
      />
      <Box size={[0.95, 0.06, 0.55]} position={[0, 0.58, 0]} color="#d4d4d8" />
      {[-0.22, 0.22].map((x) => (
        <group key={x} position={[x, 0.2, 0.28]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.12, 10]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.3} />
          </mesh>
          <Cup position={[0, -0.2, 0.05]} />
        </group>
      ))}
      <mesh position={[0.38, 0.75, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.3, 14]} />
        <meshStandardMaterial color="#27272a" />
      </mesh>
    </group>
  )
}

export default function Cafe() {
  const { last, low } = useInterior()
  return (
    <group>
      <Room
        width={12}
        depth={9}
        floor="#92653a"
        wall="#f1e4cf"
        side="#e9d5b5"
        ceiling="#fafaf9"
      />
      {/* Brick feature wall behind the counter */}
      <Box size={[6.2, 3.3, 0.05]} position={[-2.6, 1.65, -4.38]} color="#9a3412" />
      {Array.from({ length: 11 }, (_, i) => (
        <Box
          key={i}
          size={[6.2, 0.02, 0.02]}
          position={[-2.6, 0.15 + i * 0.3, -4.35]}
          color="#c2410c"
        />
      ))}
      <Board
        size={[2.4, 1.8]}
        position={[-2.6, 2.35, -4.3]}
        painting={MENU}
        paintingKey="cafe-menu"
      />
      <Board
        size={[2.4, 0.6]}
        position={[2.6, 2.6, -4.38]}
        painting={signPainting('Fresh every morning', '#fef3c7', '#78350f')}
        paintingKey="cafe-sign"
      />
      <Window size={[3.4, 1.9]} position={[2.6, 1.55, -4.5]} />
      <Window size={[5, 1.9]} position={[6, 1.6, 0.5]} rotation={-Math.PI / 2} />

      {/* The counter, with the espresso machine and the till */}
      <Box size={[4.6, 1, 0.8]} position={[-3.3, 0.5, -2.8]} color="#57534e" />
      <Box size={[4.7, 0.06, 0.9]} position={[-3.3, 1.02, -2.8]} color="#d6d3d1" />
      <Hotspot action="cafe-coffee" position={[-3.6, 0, -2.8]} ring={1} tag={2.3}>
        <group position={[0, 1.05, 0]}>
          <EspressoMachine />
        </group>
      </Hotspot>
      <Box size={[0.4, 0.25, 0.3]} position={[-1.6, 1.18, -2.8]} color="#1f2937" />
      <Person
        position={[-3.2, 0, -3.7]}
        rotation={Math.PI}
        look={{
          skin: 2,
          hair: 'bun',
          hairColor: 1,
          outfit: 'polo',
          top: '#14532d',
          trousers: '#1c1917',
          smile: true,
        }}
        phase={0.4}
      />
      {/* Shelves of cups and jars behind */}
      {[1.6, 2.1].map((y) => (
        <Box key={y} size={[2.2, 0.05, 0.3]} position={[-4.4, y, -4.2]} color="#78350f" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Cup key={i} position={[-5.3 + (i % 4) * 0.55, i < 4 ? 1.63 : 2.13, -4.2]} />
      ))}

      {/* The cake case: breakfast pastries */}
      <Hotspot action="cafe-breakfast" position={[0.3, 0, -2.8]} ring={1} tag={2.3}>
        <CakeCase />
      </Hotspot>

      {/* Tables */}
      <Hotspot action="cafe-dinner" position={[-3, 0, 1.6]} ring={1.25} tag={2}>
        <Table position={[0, 0, 0]} />
        <Cup position={[0.15, 0.77, 0.1]} />
      </Hotspot>
      <Table position={[3, 0, -0.6]} />
      <Table position={[4.4, 0, 2.6]} />
      {!low && <Table position={[0.4, 0, 2.2]} />}
      <Person
        position={[3, 0, 0.15]}
        seated
        look={{
          skin: 4,
          hair: 'curly',
          hairColor: 0,
          outfit: 'sweater',
          top: '#7c3aed',
          trousers: '#1e3a8a',
        }}
        phase={1.1}
      />
      <Person
        position={[3, 0, -1.35]}
        rotation={Math.PI}
        seated
        look={{
          skin: 1,
          hair: 'long',
          hairColor: 2,
          outfit: 'blouse',
          top: '#f472b6',
          trousers: '#334155',
          smile: true,
        }}
        phase={2.3}
      />
      {!low && (
        <Person
          position={[4.4, 0, 3.35]}
          seated
          look={{
            skin: 0,
            hair: 'side',
            hairColor: 3,
            outfit: 'shirt',
            top: '#e2e8f0',
            trousers: '#27272a',
            glasses: true,
          }}
          phase={0.7}
        />
      )}
      <Cup position={[3.15, 0.77, -0.5]} />
      <Cup position={[2.85, 0.77, -0.75]} />

      <Lamp position={[3, 2.6, -0.6]} />
      <Lamp position={[4.4, 2.6, 2.6]} />
      <Lamp position={[-3, 2.6, 1.6]} />
      <Lamp position={[-3.3, 2.7, -2.6]} colour="#fff7ed" />
      <Plant position={[5.4, 0, -3.9]} scale={1.3} />
      <Plant position={[-5.4, 0, 3.6]} scale={1.1} />
      <Plant position={[1.6, 0, -3.9]} scale={0.9} />

      {/* Where the player is: at the counter, or sitting down to eat */}
      {last === 'cafe-dinner' ? (
        <Person position={[-3, 0, 2.35]} seated look={PLAYER} phase={0.3} />
      ) : last === 'cafe-breakfast' ? (
        <Person position={[0.3, 0, -1.9]} rotation={0.2} look={PLAYER} phase={0.3} />
      ) : last === 'cafe-coffee' ? (
        <Person position={[-3.6, 0, -1.9]} rotation={-0.2} look={PLAYER} phase={0.3} />
      ) : (
        <Person position={[1.2, 0, 1.6]} rotation={Math.PI} look={PLAYER} phase={0.3} />
      )}
    </group>
  )
}
