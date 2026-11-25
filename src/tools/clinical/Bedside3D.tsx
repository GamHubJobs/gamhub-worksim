/**
 * The bedside in 3D: the patient (posed by how they are: lying, sitting up,
 * or on the floor), the bed or chair, and the equipment, each of which does
 * its job when clicked: the gel dispenser cleans hands, the monitor takes a
 * full set, the cuff takes a blood pressure, the notes open the notes, the
 * buzzer calls for help, and so on. Everything it shows comes from the case
 * engine. Simple shapes, no downloads.
 */
import { Html, OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import type { CaseDef, Phase } from '../../clinical/model'
import { EQUIPMENT, poseFor, type Pose } from './bedside'
import type { Encounter } from '../../clinical/schema'
import { latestReadings } from '../../clinical/engine'

function Item({
  item,
  onPick,
  disabled,
}: {
  item: (typeof EQUIPMENT)[number]
  onPick: (action: string) => void
  disabled: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <mesh
      position={item.at}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setHover(true)
      }}
      onPointerOut={() => setHover(false)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (!disabled) onPick(item.action)
      }}
    >
      <boxGeometry args={item.size} />
      <meshStandardMaterial color={hover ? '#facc15' : item.color} />
      {hover && (
        <Html
          center
          position={[0, item.size[1] / 2 + 0.12, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="whitespace-nowrap rounded bg-slate-900/90 px-1.5 py-0.5 text-[11px] text-white">
            {item.label}
          </span>
        </Html>
      )}
    </mesh>
  )
}

function Patient({ def, pose }: { def: CaseDef; pose: Pose }) {
  const p = def.patient
  const width = p.build === 'heavy' ? 0.42 : p.build === 'slight' ? 0.28 : 0.34
  const skin = p.skin
  const gown = '#93c5fd'
  // Body: a capsule (torso and legs) and a head, positioned by pose.
  const place: Record<
    Pose,
    {
      body: [number, number, number]
      rot: [number, number, number]
      head: [number, number, number]
    }
  > = {
    lying: { body: [0, 0.72, 0.1], rot: [Math.PI / 2, 0, 0], head: [0, 0.8, -0.78] },
    sitting: { body: [0, 0.92, -0.25], rot: [0.35, 0, 0], head: [0, 1.38, -0.42] },
    chair: { body: [0, 0.78, 0], rot: [0.1, 0, 0], head: [0, 1.28, -0.04] },
    floor: {
      body: [0.9, 0.22, 0.5],
      rot: [Math.PI / 2.3, 0, 0.4],
      head: [0.68, 0.32, 0.05],
    },
  }
  const at = place[pose]
  return (
    <group>
      <mesh position={at.body} rotation={at.rot}>
        <capsuleGeometry args={[width / 2, 1.0, 6, 12]} />
        <meshStandardMaterial color={gown} />
      </mesh>
      <mesh position={at.head}>
        <sphereGeometry args={[0.13, 20, 16]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh
        position={[
          at.head[0],
          at.head[1] + 0.06,
          at.head[2] + (pose === 'lying' ? -0.04 : 0.02),
        ]}
      >
        <sphereGeometry args={[0.135, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={p.hair} />
      </mesh>
    </group>
  )
}

function Furniture({ chair }: { chair: boolean }) {
  return chair ? (
    <group>
      <mesh position={[0, 0.45, 0.05]}>
        <boxGeometry args={[0.6, 0.1, 0.6]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 0.8, -0.25]}>
        <boxGeometry args={[0.6, 0.7, 0.08]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
    </group>
  ) : (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.0, 0.2, 2.1]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.95, 0.2, 2.0]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[0, 0.66, -0.85]}>
        <boxGeometry args={[0.6, 0.12, 0.35]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.75, 0.55, 0.9]}>
        <boxGeometry args={[0.4, 0.06, 0.6]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
    </group>
  )
}

export default function Bedside3D({
  def,
  enc,
  phase,
  onPick,
}: {
  def: CaseDef
  enc: Encounter
  phase: Phase
  onPick: (action: string) => void
}) {
  const pose = poseFor(def, phase)
  const read = latestReadings(enc)
  const screen = [
    read.pulse && `HR ${read.pulse.value.split(' ')[0]}`,
    read.spo2 && `SpO₂ ${read.spo2.value}`,
    read.bp && `BP ${read.bp.value.split(' ')[0]}`,
    read.resp && `RR ${read.resp.value.split(' ')[0]}`,
  ].filter(Boolean)
  return (
    <div
      className="relative h-56 w-full overflow-hidden rounded border border-slate-300 bg-slate-200"
      data-testid="bedside-3d"
    >
      <Canvas camera={{ position: [2.6, 2.2, 2.8], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 2]} intensity={1.1} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[4, 3]} />
          <meshStandardMaterial color="#d6d3d1" />
        </mesh>
        <mesh position={[0, 1.2, -1.22]}>
          <boxGeometry args={[4, 2.4, 0.05]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        <Furniture chair={pose === 'chair'} />
        <Patient def={def} pose={pose} />
        {EQUIPMENT.map((item) => (
          <Item key={item.id} item={item} onPick={onPick} disabled={!!enc.ended} />
        ))}
        <Html
          position={[1.3, 1.15, -0.53]}
          center
          transform
          scale={0.12}
          style={{ pointerEvents: 'none' }}
        >
          <div className="w-40 rounded bg-black p-1 font-mono text-[10px] leading-tight text-emerald-400">
            {screen.length ? (
              screen.map((s) => <div key={s as string}>{s}</div>)
            ) : (
              <div>— no readings —</div>
            )}
          </div>
        </Html>
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={6}
          target={[0, 0.7, 0]}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
      <p className="pointer-events-none absolute bottom-1 left-1 rounded bg-white/80 px-1.5 text-[11px] text-slate-700">
        Click the equipment to use it · drag to look around
      </p>
    </div>
  )
}
