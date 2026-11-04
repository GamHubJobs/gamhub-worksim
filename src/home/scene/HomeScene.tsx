/**
 * The player's home in 3D: the rooms of the flat seen from above, their
 * furniture in the colours chosen, and the player in the room they are in.
 * Built and lit like the office (simple shapes, light enough for an
 * ordinary laptop); loaded only when the player is at home.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Vector3, type WebGLRenderer } from 'three'
import { getFurniture, getHome, type HomeId, type SlotId } from '../../content/home'
import type { RoomId } from '../../content/life'
import { Floor } from '../../office/scene/furniture'
import { Box } from '../../office/scene/parts'
import { Person, PeopleDetail, type PersonLook } from '../../office/scene/people'
import { prefersReducedMotion } from '../../ui/motion'
import { FurnitureModel } from './models'

const STILL = prefersReducedMotion()

/** The player at home (casual clothes in the evening, work clothes once dressed). */
const PLAYER: PersonLook = {
  skin: 3,
  hair: 'short',
  hairColor: 0,
  outfit: 'sweater',
  top: '#0f766e',
  trousers: '#334155',
  smile: true,
}

export interface HomeSceneProps {
  homeId: HomeId
  /** Furniture by slot: item ID and colour index. */
  furniture: string
  room: RoomId
  phase: 'evening' | 'morning'
  dressed: boolean
}

function isSoftware(gl: WebGLRenderer): boolean {
  const context = gl.getContext()
  const info = context.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(
    info
      ? context.getParameter(info.UNMASKED_RENDERER_WEBGL)
      : context.getParameter(context.RENDERER),
  )
  return /swiftshader|llvmpipe|software|basic render/i.test(renderer)
}

export default memo(HomeScene)

function HomeScene(props: HomeSceneProps) {
  const home = getHome(props.homeId)
  const [lowPower, setLowPower] = useState(false)
  const focus = home.rooms[props.room]
  const owned = useMemo(
    () =>
      Object.entries(
        JSON.parse(props.furniture) as Record<string, { item: string; colour: number }>,
      ),
    [props.furniture],
  )
  const [w, d] = home.size
  const evening = props.phase === 'evening'

  return (
    <Canvas
      dpr={lowPower ? 0.5 : [1, 1.5]}
      frameloop="demand"
      camera={{
        position: [focus[0] + 2.5, 5, focus[1] + 5],
        fov: 45,
        near: 0.1,
        far: 60,
      }}
      gl={{ antialias: true, powerPreference: 'default' }}
      onCreated={({ gl }) => setLowPower(isSoftware(gl))}
    >
      <Ticker fps={STILL ? 1 / 30 : lowPower ? 1 : 30} />
      <color attach="background" args={[evening ? '#1e293b' : '#e0f2fe']} />
      <hemisphereLight
        args={[evening ? '#ffe7c2' : '#ffffff', '#8a7a68', evening ? 0.9 : 1.4]}
      />
      <directionalLight
        position={evening ? [-6, 8, 4] : [6, 10, 6]}
        intensity={evening ? 0.6 : 1.4}
        color={evening ? '#ffcf99' : '#fff8ee'}
      />
      <CameraRig x={focus[0]} z={focus[1]} />
      <PeopleDetail low={lowPower}>
        <Floor kind="wood" position={[0, 0, 0]} size={[w, d]} />
        {/* Low walls, so the rooms can be seen from above */}
        <Box size={[w, 1.1, 0.12]} position={[0, 0.55, -d / 2]} color="#efe9df" />
        <Box size={[0.12, 1.1, d]} position={[-w / 2, 0.55, 0]} color="#efe9df" />
        <Box size={[0.12, 1.1, d]} position={[w / 2, 0.55, 0]} color="#efe9df" />
        {/* The bathroom wall and the window */}
        <Box
          size={[0.1, 1.1, d * 0.42]}
          position={[home.rooms.bathroom[0] - 1.2, 0.55, -d / 2 + d * 0.21]}
          color="#e7e1d6"
        />
        <Box
          size={[1.6, 0.6, 0.04]}
          position={[-w / 4, 0.8, -d / 2 + 0.07]}
          color={evening ? '#334155' : '#bae6fd'}
          emissive={evening ? undefined : '#7dd3fc'}
        />
        {home.places.map((place) => {
          const entry = owned.find(([slot]) => slot === place.slot)?.[1]
          const item = entry ? getFurniture(entry.item) : undefined
          if (!item) return null
          return (
            <group
              key={place.slot}
              position={[place.at[0], 0, place.at[1]]}
              rotation={[0, place.at[2], 0]}
            >
              <FurnitureModel
                slot={place.slot as SlotId}
                item={item.id}
                colour={item.colours[entry!.colour] ?? item.colours[0]}
              />
            </group>
          )
        })}
        <Person
          position={[focus[0] + 0.6, 0, focus[1] + 0.9]}
          rotation={Math.PI - 0.4}
          look={
            props.dressed
              ? { ...PLAYER, outfit: 'shirt', top: '#dbeafe', tie: '#1e3a8a' }
              : PLAYER
          }
          phase={0.4}
        />
      </PeopleDetail>
    </Canvas>
  )
}

function Ticker({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    invalidate()
    const timer = window.setInterval(() => invalidate(), 1000 / fps)
    return () => window.clearInterval(timer)
  }, [fps, invalidate])
  return null
}

/** Glides the camera over the room the player is in. */
function CameraRig({ x, z }: { x: number; z: number }) {
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)
  const goal = useMemo(() => new Vector3(x + 2.5, 5, z + 5), [x, z])
  const look = useMemo(() => new Vector3(x, 0.6, z), [x, z])
  const target = useRef(new Vector3(x, 0.6, z))
  useFrame((_, delta) => {
    const step = STILL ? 1 : 1 - Math.exp(-delta * 3)
    camera.position.lerp(goal, step)
    target.current.lerp(look, step)
    camera.lookAt(target.current)
    if (camera.position.distanceToSquared(goal) > 1e-5) invalidate()
  })
  return null
}
