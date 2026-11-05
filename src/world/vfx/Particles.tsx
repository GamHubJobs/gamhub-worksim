/**
 * One particle emitter for every effect (see presets.ts): a pool of particles
 * drawn in a single batch, spawned while `active`, each living out its life
 * after the emitter stops (so water stops falling naturally when the shower is
 * turned off). Nothing is drawn or updated once the last particle is gone, and
 * everything is released when the emitter is removed.
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  NormalBlending,
  Object3D,
  SphereGeometry,
  type InstancedMesh,
  MeshBasicMaterial,
} from 'three'
import type { Vector } from '../../content/office'
import type { VfxKind } from '../interaction/activity'
import { PRESETS } from './presets'

interface Particle {
  alive: boolean
  age: number
  life: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

const GEOMETRY = new SphereGeometry(1, 8, 6)
/** Scratch for placing particles (one frame at a time, so it can be shared). */
const dummy = new Object3D()
const rand = (a: number, b: number) => a + Math.random() * (b - a)

export function Particles({
  kind,
  at,
  active,
  low = false,
  track,
}: {
  kind: VfxKind
  at: Vector
  active: boolean
  low?: boolean
  /** Where to spawn from instead, each frame (a hand); `at` is then an offset. */
  track?: () => Vector | null
}) {
  const preset = PRESETS[kind]
  const count = low ? preset.low : preset.max
  const mesh = useRef<InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const pool = useRef<Particle[]>([])
  const owed = useRef(0)
  const alive = useRef(0)
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(preset.colour),
        transparent: !preset.additive,
        opacity: preset.additive ? 1 : (preset.opacity ?? 0.85),
        blending: preset.additive ? AdditiveBlending : NormalBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [preset],
  )
  useEffect(() => () => material.dispose(), [material])

  useLayoutEffect(() => {
    pool.current = Array.from({ length: count }, () => ({
      alive: false,
      age: 0,
      life: 1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    }))
    const m = mesh.current
    if (!m) return
    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    for (let i = 0; i < count; i++) m.setMatrixAt(i, dummy.matrix)
    m.instanceMatrix.needsUpdate = true
  }, [count])

  // Wake the (on-demand) renderer when the effect starts.
  useEffect(() => {
    if (active) invalidate()
  }, [active, invalidate])

  useFrame((_, raw) => {
    const m = mesh.current
    if (!m || (!active && alive.current === 0)) return
    const dt = Math.min(raw, 0.05)
    // Spawn.
    const base = track?.()
    const origin: Vector = base ? [base[0] + at[0], base[1] + at[1], base[2] + at[2]] : at
    if (active) {
      owed.current += preset.rate * dt
      const particles = pool.current
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        if (owed.current < 1) break
        if (p.alive) continue
        owed.current -= 1
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * preset.spread[0]
        p.alive = true
        p.age = 0
        p.life = rand(preset.life[0], preset.life[1])
        p.x = origin[0] + Math.cos(a) * r
        p.y = origin[1] + rand(-preset.spread[1], preset.spread[1])
        p.z = origin[2] + Math.sin(a) * r
        p.vx = Math.cos(a) * preset.vxz * Math.random()
        p.vz = Math.sin(a) * preset.vxz * Math.random()
        p.vy = rand(preset.vy[0], preset.vy[1])
      }
      owed.current = Math.min(owed.current, 2)
    }
    // Move, age and draw.
    let n = 0
    pool.current.forEach((p, i) => {
      if (p.alive) {
        p.age += dt
        p.vy -= preset.gravity * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
        if (preset.floor && p.y < 0.01) {
          p.y = 0.01
          p.vy = 0
          p.vx *= 0.3
          p.vz *= 0.3
        }
        if (p.age >= p.life) p.alive = false
      }
      if (p.alive) {
        n++
        const k = p.age / p.life
        const size = preset.size[0] + (preset.size[1] - preset.size[0]) * k
        // Glowing particles fade by shrinking at the end; solid ones keep their size.
        const fade = preset.additive ? Math.sin(Math.PI * Math.min(1, k * 1.2)) : 1
        dummy.position.set(p.x, p.y, p.z)
        dummy.scale.set(size * fade, size * preset.stretch * fade, size * fade)
      } else {
        dummy.scale.setScalar(0)
      }
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    alive.current = n
    if (active || n > 0) invalidate()
  })

  return (
    <instancedMesh
      ref={mesh}
      args={[GEOMETRY, material, count]}
      frustumCulled={false}
      renderOrder={5}
    />
  )
}

/** A wet patch that darkens the floor while water runs and dries slowly after. */
export function WetPatch({
  at,
  radius,
  active,
}: {
  at: Vector
  radius: number
  active: boolean
}) {
  const material = useRef<MeshBasicMaterial>(null)
  const invalidate = useThree((s) => s.invalidate)
  useFrame((_, dt) => {
    const m = material.current
    if (!m) return
    const target = active ? 0.35 : 0
    const next =
      m.opacity + (target - m.opacity) * Math.min(1, dt * (active ? 1.5 : 0.15))
    if (Math.abs(next - m.opacity) > 0.001) {
      m.opacity = next
      invalidate()
    }
  })
  return (
    <mesh position={[at[0], at[1] + 0.012, at[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 28]} />
      <meshBasicMaterial
        ref={material}
        color="#1e3a8a"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}
