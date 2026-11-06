/**
 * Daily Basket inside: aisles of shelves with products (drawn in batches, so
 * hundreds of items cost little), signs over the aisles, chilled cabinets
 * with lit doors, a fruit and veg stand, baskets and trolleys, and the
 * checkout with its cashier. The trolleys are a hotspot for the week's
 * groceries, the chilled cabinets for a ready meal.
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Object3D, type InstancedMesh } from 'three'
import type { Vector } from '../../../content/office'
import { Box } from '../../../office/scene/parts'
import { Npc } from '../../../world/npc/Npc'
import { TOWN_PEOPLE } from '../../../content/townPeople'
import { Board, Hotspot, Lamp, Room } from './common'
import { signPainting, useInterior } from './kit'

const PRODUCT_COLOURS = [
  '#dc2626',
  '#f59e0b',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#ea580c',
  '#fde047',
  '#e5e7eb',
  '#65a30d',
  '#9a3412',
]

/** Products on shelves: many boxes in one draw, with a seeded mix of colours. */
function Products({ spots, size }: { spots: Vector[]; size: Vector }) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const dummy = new Object3D()
    const colour = new Color()
    spots.forEach((p, i) => {
      const k = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
      dummy.position.set(p[0], p[1] + size[1] / 2, p[2])
      dummy.scale.set(1, 0.7 + k * 0.6, 1)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, colour.set(PRODUCT_COLOURS[Math.floor(k * PRODUCT_COLOURS.length)]))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [spots, size])
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, spots.length]}>
      <boxGeometry args={size} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  )
}

/** A double-sided shelving unit along z, `length` long, at x. */
function Aisle({ x, length, sign }: { x: number; length: number; sign: string }) {
  const spots = useMemo(() => {
    const out: Vector[] = []
    for (const side of [-1, 1])
      for (const y of [0.15, 0.6, 1.05, 1.5])
        for (let z = -length / 2 + 0.2; z < length / 2 - 0.1; z += 0.26)
          out.push([x + side * 0.32, y, z])
    return out
  }, [x, length])
  return (
    <group>
      <Box size={[0.4, 1.9, length]} position={[x, 0.95, 0]} color="#e5e7eb" />
      {[0.12, 0.57, 1.02, 1.47].map((y) =>
        [-1, 1].map((side) => (
          <Box
            key={`${y}${side}`}
            size={[0.32, 0.03, length]}
            position={[x + side * 0.34, y, 0]}
            color="#9ca3af"
          />
        )),
      )}
      <Products spots={spots} size={[0.2, 0.3, 0.2]} />
      <Board
        size={[1.8, 0.45]}
        position={[x, 2.55, 0]}
        rotation={0}
        painting={signPainting(sign, '#15803d', '#ffffff')}
        paintingKey={`aisle-${sign}`}
      />
      <mesh position={[x, 2.95, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.8, 4]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  )
}

function Fridges() {
  const { low } = useInterior()
  const bottles = useMemo(() => {
    const out: Vector[] = []
    for (let i = 0; i < 4; i++)
      for (const y of [0.3, 0.8, 1.3])
        for (let k = 0; k < 6; k++) out.push([-1.6 + i * 1.05 + (k - 2.5) * 0.15, y, 0])
    return out
  }, [])
  return (
    <group>
      {/* Open-fronted cabinets: back, sides, top and base, so the bottles show */}
      <Box size={[4.4, 2.1, 0.06]} position={[0, 1.05, -0.45]} color="#cbd5e1" />
      {[-2.2, 2.2].map((x) => (
        <Box key={x} size={[0.06, 2.1, 0.8]} position={[x, 1.05, -0.1]} color="#94a3b8" />
      ))}
      <Box size={[4.4, 0.1, 0.8]} position={[0, 2.1, -0.1]} color="#94a3b8" />
      <Box size={[4.4, 0.15, 0.8]} position={[0, 0.07, -0.1]} color="#64748b" />
      {[0.2, 0.7, 1.2].map((y) => (
        <Box key={y} size={[4.2, 0.03, 0.6]} position={[0, y, 0]} color="#94a3b8" />
      ))}
      <Products spots={bottles} size={[0.1, 0.32, 0.1]} />
      {/* Lit glass doors */}
      {[-1.6, -0.55, 0.5, 1.55].map((x) => (
        <group key={x} position={[x, 1.05, 0.32]}>
          <Box size={[1, 1.9, 0.03]} position={[0, 0, 0]} color="#e0f2fe" opacity={0.3} />
          <Box size={[0.03, 0.4, 0.05]} position={[0.42, 0, 0.04]} color="#334155" />
        </group>
      ))}
      <Box
        size={[4.4, 0.12, 0.05]}
        position={[0, 2.05, 0.32]}
        color="#ffffff"
        emissive="#e0f2fe"
      />
      {!low && (
        <pointLight position={[0, 1.6, 0.8]} color="#e0f2fe" intensity={2} distance={4} />
      )}
    </group>
  )
}

function Produce() {
  const fruit: Array<[string, number]> = [
    ['#dc2626', 0.09],
    ['#facc15', 0.08],
    ['#16a34a', 0.1],
    ['#f97316', 0.09],
    ['#7c2d12', 0.08],
  ]
  return (
    <group>
      <Box size={[2.6, 0.7, 1.1]} position={[0, 0.35, 0]} color="#92400e" />
      {fruit.map(([colour, r], crate) => (
        <group key={crate} position={[-1 + crate * 0.5, 0.72, 0]}>
          <Box size={[0.46, 0.12, 1]} position={[0, 0, 0]} color="#b45309" />
          {Array.from({ length: 10 }, (_, i) => (
            <mesh
              key={i}
              position={[
                ((i % 2) - 0.5) * 0.18,
                0.1 + (i % 3) * 0.04,
                -0.4 + Math.floor(i / 2) * 0.2,
              ]}
            >
              <sphereGeometry args={[r, 10, 8]} />
              <meshStandardMaterial color={colour} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Trolley({ position, rotation = 0 }: { position: Vector; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box
        size={[0.55, 0.45, 0.85]}
        position={[0, 0.75, 0]}
        color="#94a3b8"
        opacity={0.6}
      />
      <Box size={[0.55, 0.03, 0.85]} position={[0, 0.53, 0]} color="#64748b" />
      <Box size={[0.6, 0.05, 0.05]} position={[0, 1.08, 0.45]} color="#dc2626" />
      {[
        [-0.22, -0.35],
        [0.22, -0.35],
        [-0.22, 0.35],
        [0.22, 0.35],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.07, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.04, 10]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
    </group>
  )
}

function Basket({ position }: { position: Vector }) {
  return (
    <group position={position}>
      <Box size={[0.45, 0.25, 0.32]} position={[0, 0.12, 0]} color="#dc2626" />
      <Box size={[0.4, 0.02, 0.02]} position={[0, 0.32, 0]} color="#7f1d1d" />
    </group>
  )
}

function Checkout() {
  return (
    <group>
      <Box size={[2.2, 0.9, 0.7]} position={[0, 0.45, 0]} color="#475569" />
      <Box size={[1.6, 0.04, 0.5]} position={[-0.3, 0.92, 0]} color="#111827" />
      <Box size={[0.4, 0.28, 0.3]} position={[0.75, 1.06, 0]} color="#1f2937" />
      <Box
        size={[0.3, 0.2, 0.02]}
        position={[0.75, 1.35, -0.1]}
        color="#0f172a"
        emissive="#22c55e"
      />
      <Basket position={[-0.6, 0.94, 0]} />
    </group>
  )
}

export default function Shop() {
  const { low } = useInterior()
  return (
    <group>
      <Room
        width={13}
        depth={10}
        floor="#e7e5e4"
        wall="#f8fafc"
        side="#ecfdf5"
        ceiling="#f8fafc"
      />
      <Box size={[13, 0.5, 0.05]} position={[0, 3.0, -4.88]} color="#16a34a" />
      <Board
        size={[3.6, 0.6]}
        position={[0, 3.0, -4.84]}
        painting={signPainting('Daily Basket · fresh food', '#16a34a', '#ffffff')}
        paintingKey="shop-banner"
        glow
      />
      {/* Aisles */}
      <group position={[0, 0, -1]}>
        <Aisle x={-3.5} length={4} sign="Bakery & breakfast" />
        <Aisle x={-1} length={4} sign="Tins & pasta" />
        {!low && <Aisle x={1.5} length={4} sign="Snacks & drinks" />}
      </group>

      {/* Chilled cabinets along the back: ready meals */}
      <Hotspot action="shop-meal" position={[2.4, 0, -4.1]} ring={1.2} tag={2.6}>
        <Fridges />
      </Hotspot>
      <Board
        size={[1.6, 0.4]}
        position={[2.4, 2.45, -4.38]}
        painting={signPainting('Chilled', '#0369a1', '#ffffff')}
        paintingKey="chilled"
      />

      {/* Fruit and veg by the door */}
      <group position={[4.6, 0, -1.6]} rotation={[0, -Math.PI / 2, 0]}>
        <Produce />
      </group>

      {/* Trolleys and baskets: a week's shopping */}
      <Hotspot action="shop-groceries" position={[-2.3, 0, 2.2]} ring={1.1} tag={2.2}>
        <Trolley position={[0, 0, 0]} rotation={0.2} />
        <Trolley position={[0.25, 0, 0.35]} rotation={0.2} />
        {[0, 0.27, 0.54].map((y) => (
          <Basket key={y} position={[0.9, y, -0.4]} />
        ))}
      </Hotspot>

      {/* The checkout and the cashier */}
      <group position={[3.7, 0, 1.2]} rotation={[0, -Math.PI / 2, 0]}>
        <Checkout />
        <Npc
          who={TOWN_PEOPLE.cashier}
          reach={2.1}
          position={[0.3, 0, -0.8]}
          rotation={Math.PI}
          look={{
            skin: 3,
            hair: 'ponytail',
            hairColor: 0,
            outfit: 'polo',
            top: '#16a34a',
            trousers: '#1f2937',
            smile: true,
          }}
          phase={0.6}
        />
      </group>
      <Npc
        who={TOWN_PEOPLE.shopper}
        position={[-2.25, 0, -1.2]}
        rotation={-Math.PI / 2}
        look={{
          skin: 1,
          hair: 'short',
          hairColor: 2,
          outfit: 'sweater',
          top: '#b91c1c',
          trousers: '#1e3a8a',
        }}
        phase={1.4}
      />
      {!low && (
        <Npc
          who={TOWN_PEOPLE.shopStaff}
          position={[3.4, 0, -2.8]}
          rotation={Math.PI}
          look={{
            skin: 5,
            hair: 'bob',
            hairColor: 0,
            outfit: 'cardigan',
            top: '#0f766e',
            under: '#f8fafc',
            trousers: '#44403c',
          }}
          phase={2}
        />
      )}
      {[-3, 0, 3].map((x) => (
        <Lamp
          key={x}
          position={[x, 3.0, 0]}
          colour="#ffffff"
          intensity={4}
          shade="#e5e7eb"
        />
      ))}
    </group>
  )
}
