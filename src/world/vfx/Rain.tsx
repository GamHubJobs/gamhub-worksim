/**
 * Rain outdoors: streaks falling around the camera (a fixed number, recycled,
 * so it costs the same however long it rains), small splashes where they hit
 * the ground, and a wet sheen on the road. Drawn only while it rains; fewer
 * drops on low graphics.
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { MeshBasicMaterial, Object3D, BoxGeometry, type InstancedMesh } from 'three'

const AREA = 16
const HEIGHT = 10
const dummy = new Object3D()
const STREAK = new BoxGeometry(0.022, 0.55, 0.022)
const DROP = new BoxGeometry(0.05, 0.012, 0.05)

export function Rain({
  low = false,
  wet,
}: {
  low?: boolean
  wet?: { size: [number, number]; at: [number, number] }
}) {
  const count = low ? 450 : 1400
  const splashes = low ? 40 : 120
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const drops = useRef<InstancedMesh>(null)
  const hits = useRef<InstancedMesh>(null)
  const state = useMemo(
    () =>
      // Spread out evenly to begin with (a fixed pattern, not random).
      Array.from({ length: count }, (_, i) => ({
        x: (((i * 0.618) % 1) - 0.5) * AREA,
        y: ((i * 0.381) % 1) * HEIGHT,
        z: (((i * 0.7548) % 1) - 0.5) * AREA,
        v: 11 + ((i * 0.5698) % 1) * 4,
      })),
    [count],
  )
  const splash = useMemo(
    () => Array.from({ length: splashes }, () => ({ x: 0, z: 0, age: 1 })),
    [splashes],
  )
  const next = useRef(0)
  const pending = useRef(false)
  const rainMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#e2e8f0',
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    [],
  )
  const splashMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#e2e8f0',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    [],
  )
  useLayoutEffect(
    () => () => {
      rainMaterial.dispose()
      splashMaterial.dispose()
    },
    [rainMaterial, splashMaterial],
  )

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1)
    const d = drops.current
    const h = hits.current
    if (!d || !h) return
    const cx = camera.position.x
    const cz = camera.position.z
    state.forEach((p, i) => {
      p.y -= p.v * dt
      if (p.y < 0) {
        // A splash where it landed, then it starts again from the top, near the camera.
        const s = splash[next.current++ % splash.length]
        s.x = cx + p.x
        s.z = cz + p.z
        s.age = 0
        p.y = HEIGHT
        p.x = (Math.random() - 0.5) * AREA
        p.z = (Math.random() - 0.5) * AREA
      }
      dummy.position.set(cx + p.x, p.y, cz + p.z)
      dummy.rotation.set(0.12, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      d.setMatrixAt(i, dummy.matrix)
    })
    d.instanceMatrix.needsUpdate = true
    splash.forEach((s, i) => {
      s.age += dt * 4
      const k = s.age < 1 ? 1 + s.age * 2 : 0
      dummy.position.set(s.x, 0.03, s.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(k, 1, k)
      dummy.updateMatrix()
      h.setMatrixAt(i, dummy.matrix)
    })
    h.instanceMatrix.needsUpdate = true
    // At most 30 frames a second (20 on low graphics) while it rains.
    if (!pending.current) {
      pending.current = true
      window.setTimeout(
        () => {
          pending.current = false
          invalidate()
        },
        low ? 50 : 33,
      )
    }
  })

  return (
    <group>
      <instancedMesh
        ref={drops}
        args={[STREAK, rainMaterial, count]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={hits}
        args={[DROP, splashMaterial, splashes]}
        frustumCulled={false}
      />
      {wet && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[wet.at[0], 0.025, wet.at[1]]}>
          <planeGeometry args={wet.size} />
          <meshStandardMaterial
            color="#0f172a"
            transparent
            opacity={0.28}
            roughness={0.15}
            metalness={0.4}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
