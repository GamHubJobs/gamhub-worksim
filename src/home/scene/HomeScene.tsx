/**
 * The player's home in 3D: the flat's rooms with their fittings and the
 * furniture in the colours chosen, and the player walking about in third
 * person (see world/PlayerRig.tsx). Everything done at home is done here by
 * the character: cooking at the hob, washing at the basin, showering, sitting
 * on the sofa with the TV on, lying down to sleep. The home's layout (what is
 * solid, where each activity happens) comes from homeLayout.ts. Loaded only
 * when the player is at home.
 */
import { lowDpr } from '../../world/lowDpr'
import { Canvas, useFrame, type RootState } from '@react-three/fiber'
import { memo, useMemo, useRef, useState, type RefObject } from 'react'
import type { Mesh, MeshBasicMaterial, WebGLRenderer } from 'three'
import { getFurniture, getHome, type HomeId, type SlotId } from '../../content/home'
import { Floor } from '../../office/scene/furniture'
import { Box } from '../../office/scene/parts'
import { PeopleDetail } from '../../office/scene/people'
import { prefersReducedMotion } from '../../ui/motion'
import { isLow, useGraphicsQuality } from '../../ui/graphics'
import { Hotspot, Ticker } from '../../city/scene/interiors/common'
import {
  Interior,
  PLAYER,
  type Doing,
  type InteriorState,
} from '../../city/scene/interiors/kit'
import { World, useWorld } from '../../world/context'
import {
  PlayerRig,
  type ActivityNow,
  type Controls,
  type Hands,
  type Prompt,
} from '../../world/PlayerRig'
import { ActivityEffects } from '../../world/vfx/ActivityEffects'
import { FurnitureModel } from './models'
import { Fittings } from './fittings'
import { homeLayout } from './homeLayout'
import { Courier } from './Courier'
import { HomePartner } from './HomePartner'
import { Npc } from '../../world/npc/Npc'
import { scaleOf } from '../../game/children'
import { childWho } from '../../game/family'
import type { PersonLook } from '../../office/scene/people'

/** How the player's children look. */
const CHILD_LOOKS: PersonLook[] = [
  {
    skin: 2,
    hair: 'curly',
    hairColor: 1,
    outfit: 'sweater',
    top: '#f59e0b',
    trousers: '#1e3a8a',
    smile: true,
  },
  {
    skin: 3,
    hair: 'bob',
    hairColor: 0,
    outfit: 'polo',
    top: '#22c55e',
    trousers: '#334155',
    smile: true,
  },
]
import type { DeliveryStage } from '../../game/delivery'

const STILL = prefersReducedMotion()

/** What each piece of furniture is for, when clicked (the first that applies now). */
const USES: Partial<Record<SlotId, string[]>> = {
  kitchen: ['cook', 'breakfast'],
  coffee: ['coffee'],
  table: ['takeaway-eat'],
  shower: ['shower'],
  bed: ['bed'],
  wardrobe: ['dress'],
  sofa: ['call', 'takeaway', 'takeaway-wait'],
  tv: ['series'],
  console: ['games'],
  desk: ['study'],
  shelf: ['read'],
  mat: ['yoga'],
}

export interface HomeSceneProps {
  homeId: HomeId
  /** Furniture by slot: item ID and colour index. */
  furniture: string
  phase: 'evening' | 'morning'
  dressed: boolean
  /** What can be done at home now (the same as the room lists). */
  doings: Doing[]
  controls: RefObject<Controls>
  /** An activity asked for from the lists or a ringed piece of furniture. */
  request: { id: string; nonce: number } | null
  onRequest: (id: string) => void
  onPrompt: (prompt: Prompt | null) => void
  onProgress: (progress: { label: string; progress: number } | null) => void
  /** An activity finished: `completed` false if it was stopped part way. */
  onDone: (action: string | null, completed: boolean) => void
  /** The 3D view is ready: activities can be handed to it. */
  onReady?: () => void
  /** Where a takeaway is (the courier at the door, the bag on the doorstep). */
  delivery?: DeliveryStage
  /** Someone at home with the player (visiting, or living here), by id. */
  partner?: string | null
  /** The player's children, by name (at home with them). */
  /** The children at home now (not at school, not grown up), by their place in the family. */
  kids?: { i: number; name: string; age: number }[]
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
  // What the computer can do, and the player's choice in Settings.
  const [software, setLowPower] = useState(false)
  const quality = useGraphicsQuality()
  const lowPower = isLow(quality, software)
  const furniture = useMemo(
    () => JSON.parse(props.furniture) as Record<string, { item: string; colour: number }>,
    [props.furniture],
  )
  const [w, d] = home.size
  const evening = props.phase === 'evening'
  const layout = useMemo(
    () => homeLayout(home, furniture, !evening, props.delivery === 'doorstep'),
    [home, furniture, evening, props.delivery],
  )
  const byAction = useMemo(
    () => Object.fromEntries(props.doings.map((x) => [x.id, x])),
    [props.doings],
  )
  const activities = useMemo(
    () => layout.activities.filter((a) => a.action === null || byAction[a.action]),
    [layout, byAction],
  )
  const state: InteriorState = useMemo(
    () => ({
      doings: byAction,
      act: props.onRequest,
      dark: evening,
      low: lowPower,
      last: null,
    }),
    [byAction, props.onRequest, evening, lowPower],
  )
  const now = useRef<ActivityNow>({
    id: null,
    t: 0,
    x: layout.start.x,
    z: layout.start.z,
  })
  const hands = useRef<Hands>({ left: null, right: null })
  const world = useMemo(() => ({ now, hands, low: lowPower }), [lowPower])
  const onDone = props.onDone
  const tv = home.places.find((p) => p.slot === 'tv')

  return (
    <Canvas
      dpr={lowPower ? lowDpr() : [1, 1.5]}
      frameloop="demand"
      camera={{
        position: [layout.start.x + 2, 3.5, layout.start.z + 3.5],
        fov: 55,
        near: 0.05,
        far: 60,
      }}
      gl={{ antialias: true, powerPreference: 'default' }}
      onCreated={({ gl }: RootState) => setLowPower(isSoftware(gl))}
    >
      <Ticker fps={STILL ? 1 / 30 : lowPower ? 4 : 12} />
      <color attach="background" args={[evening ? '#1e293b' : '#e0f2fe']} />
      <hemisphereLight
        args={[evening ? '#ffe7c2' : '#ffffff', '#8a7a68', evening ? 0.9 : 1.4]}
      />
      <directionalLight
        position={evening ? [-6, 8, 4] : [6, 10, 6]}
        intensity={evening ? 0.6 : 1.4}
        color={evening ? '#ffcf99' : '#fff8ee'}
      />
      <World.Provider value={world}>
        <Interior.Provider value={state}>
          <PeopleDetail low={lowPower}>
            <Floor kind="wood" position={[0, 0, 0]} size={[w, d]} />
            <Fittings home={home} evening={evening} />
            {/* Low walls on the front and right, so the rooms can be seen */}
            <Box size={[0.12, 1.1, d]} position={[w / 2, 0.55, 0]} color="#efe9df" />
            <Box size={[w, 0.5, 0.12]} position={[0, 0.25, d / 2]} color="#efe9df" />
            {home.places.map((place) => {
              const entry = furniture[place.slot]
              const item = entry ? getFurniture(entry.item) : undefined
              if (!item) return null
              const model = (
                <group rotation={[0, place.at[2], 0]}>
                  <FurnitureModel
                    slot={place.slot as SlotId}
                    item={item.id}
                    colour={item.colours[entry!.colour] ?? item.colours[0]}
                  />
                </group>
              )
              const use = USES[place.slot as SlotId]?.find((id) => state.doings[id])
              return use ? (
                <Hotspot
                  key={place.slot}
                  action={use}
                  position={[place.at[0], 0, place.at[1]]}
                  ring={0.7}
                  tag={2}
                >
                  {model}
                </Hotspot>
              ) : (
                <group key={place.slot} position={[place.at[0], 0, place.at[1]]}>
                  {model}
                </group>
              )
            })}
            {tv && furniture.tv && <TvGlow at={tv.at} />}
            <PlayerRig
              start={layout.start}
              boxes={layout.boxes}
              activities={activities}
              blocked={(a) => (a.action ? (byAction[a.action]?.blocked ?? null) : null)}
              controls={props.controls}
              request={props.request}
              onPrompt={props.onPrompt}
              onProgress={props.onProgress}
              onDone={(a, completed) =>
                onDone(a.action ?? (a.id.startsWith('date-') ? a.id : null), completed)
              }
              look={
                props.dressed
                  ? { ...PLAYER, outfit: 'shirt', top: '#dbeafe', tie: '#1e3a8a' }
                  : PLAYER
              }
              surface="wood"
              low={lowPower}
              now={now}
              onReady={props.onReady}
              hands={hands}
              startOrbit={{ yaw: 0.6, pitch: 0.55, distance: 4 }}
            />
            <ActivityEffects activities={activities} />
            <Courier stage={props.delivery ?? 'none'} door={[-w / 2, d / 2 - 0.9]} />
            {props.partner && <HomePartner id={props.partner} layout={layout} />}
            {(props.kids ?? []).map(({ i, name, age }) => (
              <Npc
                key={name}
                who={childWho(i, name, age)}
                position={[layout.start.x + 0.7 + i * 0.6, 0, layout.start.z - 0.6]}
                rotation={Math.PI}
                look={CHILD_LOOKS[i % CHILD_LOOKS.length]}
                phase={i}
                scale={scaleOf(age)}
                reach={1.3}
              />
            ))}
          </PeopleDetail>
        </Interior.Provider>
      </World.Provider>
    </Canvas>
  )
}

/** The TV's screen lights up and flickers while a series or a game is on. */
function TvGlow({ at }: { at: [number, number, number] }) {
  const { now } = useWorld()
  const screen = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const m = screen.current
    if (!m) return
    const on = now.current.id === 'series' || now.current.id === 'games'
    m.visible = on
    if (on) {
      const material = m.material as MeshBasicMaterial
      const t = clock.elapsedTime
      material.color.setRGB(
        0.35 + Math.sin(t * 1.3) * 0.15,
        0.45 + Math.sin(t * 2.1 + 1) * 0.15,
        0.75 + Math.sin(t * 0.7 + 2) * 0.15,
      )
    }
  })
  const [x, z, turn] = at
  return (
    <group position={[x, 0, z]} rotation={[0, turn, 0]}>
      <mesh ref={screen} position={[0, 0.82, 0.045]} visible={false}>
        <planeGeometry args={[1.02, 0.56]} />
        <meshBasicMaterial color="#6b8cff" toneMapped={false} />
      </mesh>
    </group>
  )
}
