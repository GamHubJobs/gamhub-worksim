/**
 * Cog & Kerb inside: a showroom with small cars on display, a rack of city
 * bikes, the booking counter, price boards, a workshop corner with tools and
 * an open door to the yard. The bikes are a hotspot for buying (or selling
 * back) a bike, the display car for the weekly lease (or handing it back).
 */
import { BIKE, CAR } from '../../../content/transport'
import { formatMoney } from '../../../content/life'
import { Box, Plant } from '../../../office/scene/parts'
import { Npc } from '../../../world/npc/Npc'
import { TOWN_PEOPLE } from '../../../content/townPeople'
import { Bike, Car } from '../vehicles'
import { Board, Hotspot, Lamp, Room } from './common'
import { menuPainting, signPainting, useInterior } from './kit'

const PRICES = menuPainting(
  'Hire & sales',
  [
    ['City bike', formatMoney(BIKE.price)],
    ['Sell a bike back', formatMoney(Math.round(BIKE.price * BIKE.resale))],
    ['Small car: first week', formatMoney(CAR.deposit)],
    ['Then each Monday', formatMoney(CAR.weekly)],
  ],
  {
    background: '#f5f3ff',
    ink: '#1e1b4b',
    accent: '#6d28d9',
    font: 'system-ui, sans-serif',
  },
)

export default function Garage() {
  const { doings, dark } = useInterior()
  const bikeAction = doings['sell-bike'] ? 'sell-bike' : 'buy-bike'
  const carAction = doings['end-lease'] ? 'end-lease' : 'lease-car'
  return (
    <group>
      <Room
        width={14}
        depth={10}
        floor="#d4d4d8"
        wall="#ede9fe"
        side="#ddd6fe"
        ceiling="#f4f4f5"
      />
      {/* Polished floor squares */}
      {Array.from({ length: 6 }, (_, i) => (
        <Box
          key={i}
          size={[14, 0.01, 0.03]}
          position={[0, 0.01, -4 + i * 1.6]}
          color="#a1a1aa"
        />
      ))}
      <Board
        size={[3.4, 0.7]}
        position={[-3, 2.7, -4.86]}
        painting={signPainting('Cog & Kerb', '#6d28d9', '#ffffff')}
        paintingKey="cog-sign"
        glow
      />
      <Board
        size={[2.2, 1.65]}
        position={[2.6, 1.9, -4.86]}
        painting={PRICES}
        paintingKey="cog-prices"
      />

      {/* The yard door, open, with a car parked outside */}
      <group position={[6.9, 0, -1]}>
        <mesh position={[-0.11, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[3.4, 2.8]} />
          <meshBasicMaterial color={dark ? '#334155' : '#bae6fd'} toneMapped={false} />
        </mesh>
        <Box size={[0.1, 0.25, 3.6]} position={[-0.12, 2.9, 0]} color="#52525b" />
      </group>

      {/* Cars on display: the lease */}
      <Hotspot action={carAction} position={[-1.8, 0, -1.8]} ring={2.4} tag={2.4}>
        <Car position={[0, 0, 0]} rotation={Math.PI / 2 + 0.4} colour="#0f766e" />
      </Hotspot>
      <Car position={[4, 0, -1.2]} rotation={-Math.PI / 2 - 0.3} colour="#f59e0b" />
      <Box size={[3, 0.04, 3]} position={[-1.8, 0.02, -1.8]} color="#c4b5fd" />

      {/* The bike rack */}
      <Hotspot action={bikeAction} position={[-4.6, 0, -3.2]} ring={1.6} tag={2.2}>
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <Bike
            key={x}
            position={[x, 0, 0]}
            rotation={0}
            colour={['#dc2626', '#2563eb', '#16a34a', '#f59e0b'][i]}
          />
        ))}
        <Box size={[3, 0.06, 0.06]} position={[0, 0.5, -0.7]} color="#52525b" />
      </Hotspot>

      {/* The booking counter */}
      <group position={[3.4, 0, 3.4]}>
        <Box size={[2.6, 1.05, 0.7]} position={[0, 0.52, 0]} color="#4c1d95" />
        <Box size={[2.7, 0.05, 0.8]} position={[0, 1.07, 0]} color="#e4e4e7" />
        <Box
          size={[0.55, 0.38, 0.03]}
          position={[-0.5, 1.32, 0.05]}
          color="#0f172a"
          emissive="#a78bfa"
        />
        <Box size={[0.25, 0.02, 0.32]} position={[0.5, 1.1, 0]} color="#fafafa" />
        <Npc
          who={TOWN_PEOPLE.sales}
          reach={2.1}
          position={[0, 0, -0.75]}
          rotation={Math.PI}
          look={{
            skin: 4,
            hair: 'short',
            hairColor: 0,
            outfit: 'polo',
            top: '#6d28d9',
            trousers: '#1f2937',
            smile: true,
            beard: true,
          }}
          phase={0.4}
        />
      </group>

      {/* Workshop corner */}
      <group position={[-5.6, 0, 2.6]}>
        <Box size={[1.8, 0.9, 0.7]} position={[0, 0.45, 0]} color="#b91c1c" />
        {[0.2, 0.4, 0.6].map((y) => (
          <Box key={y} size={[1.7, 0.02, 0.02]} position={[0, y, 0.36]} color="#7f1d1d" />
        ))}
        <Box size={[1.8, 1.4, 0.05]} position={[0, 1.6, -0.35]} color="#3f3f46" />
        {[-0.6, -0.3, 0, 0.3, 0.6].map((x, i) => (
          <Box
            key={x}
            size={[0.05, 0.3 + (i % 2) * 0.15, 0.03]}
            position={[x, 1.7, -0.3]}
            color="#d4d4d8"
          />
        ))}
        <mesh position={[0.5, 0.95, 0]}>
          <torusGeometry args={[0.3, 0.035, 8, 24]} />
          <meshStandardMaterial color="#18181b" />
        </mesh>
      </group>
      <Npc
        who={TOWN_PEOPLE.mechanic}
        position={[-5.2, 0, 1.6]}
        rotation={Math.PI * 0.9}
        look={{
          skin: 1,
          hair: 'crop',
          hairColor: 3,
          outfit: 'polo',
          top: '#475569',
          trousers: '#1e3a8a',
          sleeves: 'rolled',
        }}
        phase={1.7}
      />
      <Plant position={[6.3, 0, 4.2]} />
      {[-4, 0, 4].map((x) => (
        <Lamp
          key={x}
          position={[x, 3.0, 0]}
          colour="#ffffff"
          intensity={4}
          shade="#a1a1aa"
        />
      ))}
    </group>
  )
}
