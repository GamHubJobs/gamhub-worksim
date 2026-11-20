/**
 * The CAD workstation's 3D view: the design as it will be built (drawn from
 * the design), and a model imported from FreeCAD (its own mesh, as FreeCAD
 * exported it) beside or over it. Loaded only when opened.
 */
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo } from 'react'
import { BufferGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { Design } from '../../engineering/design'
import { BuildModel } from '../../engineering/scene/BuildModel'
import { bounds } from '../../engineering/design'

export interface ImportedModel {
  format: 'obj' | 'stl'
  /** OBJ text, or STL bytes. */
  data: string | Uint8Array
}

/** FreeCAD's millimetres, z up → the scene's metres, y up, centred like the design. */
function Imported({ model, design }: { model: ImportedModel; design: Design }) {
  const object = useMemo(() => {
    let group: Group
    if (model.format === 'obj') group = new OBJLoader().parse(model.data as string)
    else {
      const geometry: BufferGeometry = new STLLoader().parse(
        (model.data as Uint8Array).slice().buffer,
      )
      group = new Group()
      group.add(new Mesh(geometry))
    }
    // A translucent orange, to compare the model with the design under it.
    const material = new MeshStandardMaterial({
      color: '#f97316',
      transparent: true,
      opacity: 0.55,
    })
    group.traverse((child) => {
      if (child instanceof Mesh) child.material = material
    })
    return group
  }, [model])
  const centre =
    design.kind === 'building'
      ? (() => {
          const b = bounds(design.outline)
          return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]
        })()
      : [0, 0]
  return (
    <group
      scale={0.001}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[-centre[0] / 1000, 0, centre[1] / 1000]}
    >
      <primitive object={object} />
    </group>
  )
}

export default function ModelViewer({
  design,
  model,
  showDesign = true,
}: {
  design: Design
  model: ImportedModel | null
  showDesign?: boolean
}) {
  const size =
    design.kind === 'building'
      ? (() => {
          const b = bounds(design.outline)
          return Math.max(b.x1 - b.x0, b.y1 - b.y0) / 1000
        })()
      : design.span / 1000
  return (
    <Canvas
      camera={{
        position: [size * 0.9, size * 0.7, size * 1.0],
        fov: 45,
        near: 0.1,
        far: 500,
      }}
      shadows="percentage"
      className="rounded-md"
      data-testid="model-viewer"
    >
      <color attach="background" args={['#e2e8f0']} />
      <hemisphereLight args={['#ffffff', '#94a3b8', 0.9]} />
      <directionalLight position={[10, 18, 8]} intensity={1.6} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size * 4, size * 4]} />
        <meshStandardMaterial color="#cbd5c0" />
      </mesh>
      {showDesign && <BuildModel design={design} ghost />}
      {model && <Imported model={model} design={design} />}
      <OrbitControls makeDefault target={[0, 1, 0]} />
    </Canvas>
  )
}
