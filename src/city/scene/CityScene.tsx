/**
 * The neighbourhood in 3D: one main street with the player's building, a
 * café, a food shop, a gym, a park and the road to the office, with people
 * walking about. The player walks it in third person (arrow keys or WASD) and
 * goes in at the doors. Built like the office and the flat: simple shapes,
 * a light that suits the hour, and drawing only a few times a second when
 * nothing moves, so it runs on ordinary laptops.
 */
import { useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { CanvasTexture, SRGBColorSpace, type Group, type WebGLRenderer } from 'three'
import { PLACES, type PlaceId } from '../../content/city'
import { BOUNDS, standAt, areaAt, surfaceAt, type Area } from '../streets'
import { Bike, Bus, Car } from './vehicles'
import type { Vector } from '../../content/office'
import { Box, Plant } from '../../office/scene/parts'
import { PeopleDetail, Walker, type PersonLook } from '../../office/scene/people'
import { prefersReducedMotion } from '../../ui/motion'
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'
import {
  PlayerRig,
  type ActivityNow,
  type Controls,
  type Hands,
  type Prompt,
  type Vehicles,
} from '../../world/PlayerRig'
import { isLow, useGraphicsQuality } from '../../ui/graphics'
import { Rain } from '../../world/vfx/Rain'

const STILL = prefersReducedMotion()

/** Where the player is, for the traffic (which stops for them). */
const playerAt = { x: 0, z: 0 }

/** The way the player faces at a door: out towards the street. */
function facingStreet(id: PlaceId): number {
  return standAt(id)[1] > 0 ? 0 : Math.PI
}

const PLAYER: PersonLook = {
  skin: 3,
  hair: 'short',
  hairColor: 0,
  outfit: 'sweater',
  top: '#0f766e',
  trousers: '#334155',
  smile: true,
}

const PASSERS_BY: Array<{ path: Vector[]; look: PersonLook; speed: number }> = [
  {
    path: [
      [-58, 0, -7],
      [20, 0, -7],
    ],
    look: {
      skin: 1,
      hair: 'bob',
      hairColor: 2,
      outfit: 'cardigan',
      top: '#9d174d',
      trousers: '#1f2937',
    },
    speed: 1.2,
  },
  {
    path: [
      [50, 0, 7],
      [-30, 0, 7],
    ],
    look: {
      skin: 4,
      hair: 'short',
      hairColor: 0,
      outfit: 'polo',
      top: '#1d4ed8',
      trousers: '#57534e',
      beard: true,
    },
    speed: 1.4,
  },
  {
    path: [
      [-20, 0, 7.4],
      [60, 0, 7.4],
    ],
    look: {
      skin: 2,
      hair: 'ponytail',
      hairColor: 1,
      outfit: 'sweater',
      top: '#ca8a04',
      trousers: '#334155',
    },
    speed: 1.1,
  },
  {
    path: [
      [30, 0, -7.4],
      [56, 0, -7.4],
    ],
    look: {
      skin: 5,
      hair: 'curly',
      hairColor: 0,
      outfit: 'blazer',
      top: '#334155',
      trousers: '#1e293b',
      glasses: true,
    },
    speed: 0.9,
  },
  {
    path: [
      [36, 0, -20],
      [50, 0, -30],
      [34, 0, -34],
    ],
    look: {
      skin: 0,
      hair: 'long',
      hairColor: 3,
      outfit: 'blouse',
      top: '#0e7490',
      trousers: '#44403c',
    },
    speed: 0.8,
  },
]

/** Buildings along the street: centre x, which side, width, height and colour. */
const BUILDINGS: Array<{ x: number; side: 1 | -1; w: number; h: number; color: string }> =
  [
    { x: -56, side: -1, w: 14, h: 12, color: '#d6cfc4' },
    { x: -40, side: -1, w: 16, h: 8, color: '#efe2d3' },
    { x: -23, side: -1, w: 14, h: 14, color: '#c9b8a6' },
    { x: 0, side: -1, w: 16, h: 7, color: '#e7e5e4' },
    { x: 16, side: -1, w: 14, h: 16, color: '#bfb3a3' },
    { x: 64, side: -1, w: 10, h: 10, color: '#d4cbbd' },
    { x: -56, side: 1, w: 14, h: 11, color: '#cbbfae' },
    { x: -40, side: 1, w: 16, h: 18, color: '#b7795a' },
    { x: -23, side: 1, w: 14, h: 13, color: '#d9cdbd' },
    { x: 0, side: 1, w: 16, h: 9, color: '#cbd5e1' },
    { x: 16, side: 1, w: 14, h: 12, color: '#c2b5a3' },
    { x: 32, side: 1, w: 14, h: 15, color: '#d6c7b1' },
    { x: 48, side: 1, w: 14, h: 10, color: '#bdb0a0' },
  ]

export interface CitySceneProps {
  /** The place the player is at, or last left. */
  at: PlaceId
  /** Out in the street (they can walk), or inside a place. */
  outside: boolean
  /** Evening or morning, and whether it is dark. */
  phase: 'evening' | 'morning'
  dark: boolean
  dressed: boolean
  /** Keys and mouse, from the page around the view. */
  controls: RefObject<Controls>
  /** The part of the street the player is in, for its sounds. */
  onArea?: (area: Area) => void
  /** Called when the player clicks a door. */
  onDoor: (id: PlaceId) => void
  /** Why a door cannot be used now (closed, too late), or null. */
  blocked: (id: PlaceId) => string | null
  onPrompt: (prompt: Prompt | null) => void
  onProgress: (progress: { label: string; progress: number } | null) => void
  /** Went in at a door (the page takes the player inside). */
  onEnter: (id: PlaceId) => void
  onReady?: () => void
  /** On their bike (quicker), and what they own (shown in the street). */
  riding: boolean
  bike: boolean
  car: boolean
  /** Got on or off the bike. */
  onRide: (riding: boolean) => void
  /** It is raining today. */
  raining?: boolean
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

export default memo(CityScene)

function CityScene(props: CitySceneProps) {
  // What the computer can do, and the player's choice in Settings.
  const [software, setLowPower] = useState(false)
  const quality = useGraphicsQuality()
  const lowPower = isLow(quality, software)
  const [parked, setParked] = useState({ x: -46, z: 3.6, heading: Math.PI / 2 })
  const [driving, setDriving] = useState(false)
  const parking = useMemo(
    () => ({ parked, setParked, driving, setDriving }),
    [parked, driving],
  )
  const sky = props.dark
    ? '#1e293b'
    : props.raining
      ? '#94a3b8'
      : props.phase === 'morning'
        ? '#cfe8f7'
        : '#f3c99b'

  return (
    <Canvas
      dpr={lowPower ? 0.5 : [1, 1.5]}
      frameloop="demand"
      camera={{ position: [-40, 6, 14], fov: 50, near: 0.1, far: 140 }}
      gl={{ antialias: !lowPower, powerPreference: 'default' }}
      onCreated={({ gl }) => setLowPower(isSoftware(gl))}
    >
      <Ticker fps={STILL ? 1 / 30 : lowPower ? 4 : 12} />
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 40, 120]} />
      <hemisphereLight
        args={[props.dark ? '#c7d2fe' : '#ffffff', '#6b705c', props.dark ? 0.55 : 1.3]}
      />
      <directionalLight
        position={props.phase === 'morning' ? [30, 40, 20] : [-30, 25, 10]}
        intensity={props.dark ? 0.25 : 1.3}
        color={props.phase === 'morning' ? '#fff8ee' : '#ffd2a1'}
      />
      <Parking.Provider value={parking}>
        <PeopleDetail low={lowPower}>
          <Street dark={props.dark} />
          <Park />
          <BusinessDistrict />
          <Traffic />
          {props.car && !driving && (
            <Car
              position={[parked.x, 0, parked.z]}
              rotation={parked.heading}
              colour="#0f766e"
            />
          )}
          {props.bike && !(props.riding && props.outside) && (
            <Bike position={[-36.5, 0, 9.2]} rotation={Math.PI / 2} />
          )}
          {PASSERS_BY.map((p, i) => (
            <Walker
              key={i}
              path={p.path}
              look={p.look}
              speed={p.speed}
              pause={2}
              phase={i * 0.7}
            />
          ))}
          <StreetPlayer {...props} low={lowPower} />
          {props.raining && props.outside && (
            <Rain low={lowPower} wet={{ size: [150, 10], at: [0, 0] }} />
          )}
        </PeopleDetail>
      </Parking.Provider>
      {PLACES.map((place) => (
        <Door
          key={place.id}
          name={place.name}
          colour={place.colour}
          labelled
          position={[place.door[0], 0.02, place.door[1] - Math.sign(place.door[1]) * 0.6]}
          onClick={() => props.onDoor(place.id)}
        />
      ))}
    </Canvas>
  )
}

/** Solid edges of the street: the buildings on each side and its two ends (tall, for the camera). */
const STREET_BOXES: Solid[] = [
  { x: 0, z: BOUNDS.maxZ + 3, hx: 80, hz: 3, top: 14 },
  { x: 0, z: BOUNDS.minZ - 3, hx: 80, hz: 3, top: 14 },
  { x: BOUNDS.minX - 3, z: 0, hx: 3, hz: 12, top: 14 },
  { x: BOUNDS.maxX + 3, z: 0, hx: 3, hz: 12, top: 14 },
]

/** Going in at each door: walk up to it and push it open. */
function doorActivities(): Activity[] {
  return PLACES.map((place) => {
    const [x, z] = place.door
    const side = Math.sign(z)
    return {
      id: `door-${place.id}`,
      action: `enter:${place.id}`,
      prompt:
        place.id === 'home'
          ? 'go inside: home'
          : place.id === 'office'
            ? 'go to work'
            : `go into ${place.name}`,
      // From the door out to about 4 m into the street.
      spot: { x, z: z - side * 1.8, reach: 2.4 },
      anchor: { x, z: z - side * 1.1, heading: side > 0 ? Math.PI : 0 },
      stages: [{ clip: 'push-door', seconds: 0.8, label: `Going in: ${place.name}` }],
      sounds: [{ at: 0.3, id: 'door' }],
    }
  })
}

const DOORS = doorActivities()

/**
 * The player in the street: the shared third-person character (walking,
 * the bike, a leased car), going in at doors; the traffic stops for them and
 * the sounds follow the part of the street they are in.
 */
function StreetPlayer(props: CitySceneProps & { low: boolean }) {
  const now = useRef<ActivityNow>({ id: null, t: 0, x: 0, z: 0 })
  const hands = useRef<Hands>({ left: null, right: null })
  const area = useRef<Area | null>(null)
  const start = standAt(props.at)
  useFrame(() => {
    playerAt.x = now.current.x
    playerAt.z = now.current.z
    const here = areaAt(now.current.x)
    if (here !== area.current) {
      area.current = here
      props.onArea?.(here)
    }
  })
  const { parked, setParked, driving, setDriving } = useContext(Parking)
  const vehicles: Vehicles = {
    bike: props.bike,
    car: props.car ? parked : null,
    riding: driving ? 'car' : props.riding ? 'bike' : null,
    onChange: (riding, at) => {
      setDriving(riding === 'car')
      if (at) setParked(at)
      if (riding !== 'car') props.onRide(riding === 'bike')
    },
    render: (kind) =>
      kind === 'bike' ? (
        <Bike position={[0, 0, 0]} rotation={0} />
      ) : (
        <Car position={[0, 0, 0]} rotation={0} colour="#0f766e" />
      ),
  }
  if (!props.outside) return null
  return (
    <PlayerRig
      start={{ x: start[0], z: start[1], heading: facingStreet(props.at) }}
      boxes={STREET_BOXES}
      activities={DOORS}
      blocked={(a) => (a.action ? props.blocked(a.action.slice(6) as PlaceId) : null)}
      controls={props.controls}
      request={null}
      onPrompt={props.onPrompt}
      onProgress={props.onProgress}
      onDone={(a, completed) => {
        if (completed && a.action) props.onEnter(a.action.slice(6) as PlaceId)
      }}
      onReady={props.onReady}
      look={
        props.dressed
          ? { ...PLAYER, outfit: 'shirt', top: '#dbeafe', tie: '#1e3a8a' }
          : PLAYER
      }
      surfaceAt={(_, z) => surfaceAt(z)}
      now={now}
      hands={hands}
      vehicles={vehicles}
      low={props.low}
      startOrbit={{ yaw: facingStreet(props.at), pitch: 0.3, distance: 5 }}
    />
  )
}

/** Where the leased car is parked, and whether the player is driving it. */
const Parking = createContext<{
  parked: { x: number; z: number; heading: number }
  setParked: (at: { x: number; z: number; heading: number }) => void
  driving: boolean
  setDriving: (on: boolean) => void
}>({
  parked: { x: -46, z: 3.6, heading: Math.PI / 2 },
  setParked: () => {},
  driving: false,
  setDriving: () => {},
})

/** A door the player can go in at: a ring on the pavement and the place's name. */
function Door({
  labelled,
  name,
  colour,
  position,
  onClick,
}: {
  labelled: boolean
  name: string
  colour: string
  position: Vector
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  return (
    <group
      position={position}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onClick()
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.95, 32]} />
        <meshBasicMaterial color={colour} transparent opacity={hovered ? 0.95 : 0.7} />
      </mesh>
      {labelled && <Label text={name} colour={colour} />}
    </group>
  )
}

/** A place's name over its door, drawn in code (no fonts to download). */
function Label({ text, colour }: { text: string; colour: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 96
    const context = canvas.getContext('2d')
    if (context) {
      context.fillStyle = colour
      context.beginPath()
      context.roundRect(8, 8, 496, 80, 40)
      context.fill()
      context.fillStyle = '#ffffff'
      context.font = '600 44px system-ui, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(text, 256, 50, 470)
    }
    const made = new CanvasTexture(canvas)
    made.colorSpace = SRGBColorSpace
    return made
  }, [text, colour])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <sprite position={[0, 3.6, 0]} scale={[3.2, 0.6, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} fog={false} />
    </sprite>
  )
}

/** The road, pavements, buildings, shop fronts and street lamps. */
function Street({ dark }: { dark: boolean }) {
  return (
    <group>
      {/* Ground, road and pavements */}
      <Box size={[260, 0.02, 200]} position={[0, -0.02, 0]} color="#7c8a6a" />
      <Box size={[150, 0.04, 10]} position={[0, 0, 0]} color="#3f4349" />
      <Box size={[150, 0.12, 5]} position={[0, 0.04, -7.5]} color="#b8b2a7" />
      <Box size={[150, 0.12, 5]} position={[0, 0.04, 7.5]} color="#b8b2a7" />
      {/* Road markings and two crossings */}
      {Array.from({ length: 24 }, (_, i) => (
        <Box
          key={i}
          size={[2.4, 0.05, 0.18]}
          position={[-69 + i * 6, 0.03, 0]}
          color="#e7e5e4"
        />
      ))}
      {[-20, 30].map((x) =>
        Array.from({ length: 5 }, (_, i) => (
          <Box
            key={`${x}-${i}`}
            size={[3, 0.05, 0.9]}
            position={[x, 0.035, -3.6 + i * 1.8]}
            color="#f5f5f4"
          />
        )),
      )}
      {BUILDINGS.map((b, i) => (
        <Building key={i} {...b} dark={dark} />
      ))}
      {/* Shop fronts: an awning in the place's colour over each door */}
      {PLACES.filter((p) => p.id !== 'park' && p.id !== 'office').map((p) => {
        const side = Math.sign(p.door[1])
        return (
          <group key={p.id}>
            <Box
              size={[5, 0.25, 1.6]}
              position={[p.door[0], 3, p.door[1] + side * 1.3]}
              color={p.colour}
            />
            <Box
              size={[1.6, 2.5, 0.1]}
              position={[p.door[0], 1.25, p.door[1] + side * 1.98]}
              color={dark ? '#fde68a' : '#3f3f46'}
              emissive={dark ? '#f59e0b' : undefined}
            />
            {p.id !== 'home' && (
              <Box
                size={[3.4, 1.6, 0.08]}
                position={[p.door[0] + 3.4, 1.6, p.door[1] + side * 1.96]}
                color={dark ? '#fef3c7' : '#9ec5d6'}
                emissive={dark ? '#fbbf24' : undefined}
              />
            )}
          </group>
        )
      })}
      {/* Street lamps */}
      {Array.from({ length: 9 }, (_, i) => -60 + i * 15).map((x) =>
        [-9.4, 9.4].map((z) => (
          <group key={`${x}-${z}`} position={[x + (z > 0 ? 7 : 0), 0, z]}>
            <Box size={[0.14, 4.2, 0.14]} position={[0, 2.1, 0]} color="#27272a" />
            <Box
              size={[0.5, 0.25, 0.5]}
              position={[0, 4.3, 0]}
              color={dark ? '#fde68a' : '#d4d4d8'}
              emissive={dark ? '#fbbf24' : undefined}
            />
          </group>
        )),
      )}
      {/* Trees in pots along the pavement */}
      {[-48, -31, -12, 9, 24].map((x) => (
        <Plant key={x} position={[x, 0.1, 9.3]} scale={1.6} />
      ))}
    </group>
  )
}

function Building({
  x,
  side,
  w,
  h,
  color,
  dark,
}: {
  x: number
  side: 1 | -1
  w: number
  h: number
  color: string
  dark: boolean
}) {
  const depth = 14
  const front = side * 10
  const floors = Math.floor((h - 4) / 3.2)
  return (
    <group>
      <Box
        size={[w, h, depth]}
        position={[x, h / 2, front + side * (depth / 2)]}
        color={color}
      />
      {/* A strip of windows on each floor above the shops */}
      {Array.from({ length: floors }, (_, i) => (
        <Box
          key={i}
          size={[w - 2, 1.3, 0.08]}
          position={[x, 4.8 + i * 3.2, front - side * 0.02]}
          color={dark ? (i % 2 ? '#fde68a' : '#475569') : '#8fb3c7'}
          emissive={dark && i % 2 ? '#d97706' : undefined}
        />
      ))}
      <Box
        size={[w + 0.4, 0.4, depth + 0.4]}
        position={[x, h + 0.2, front + side * (depth / 2)]}
        color="#78716c"
      />
    </group>
  )
}

/** Millpond Park: grass, paths, a pond, trees and a low fence with a gate. */
function Park() {
  const trees: Array<[number, number]> = [
    [28, -14],
    [33, -26],
    [56, -14],
    [55, -36],
    [29, -38],
    [46, -40],
    [52, -24],
  ]
  return (
    <group>
      <Box size={[34, 0.04, 34]} position={[42, 0.01, -27]} color="#65a30d" />
      <Box size={[3, 0.05, 30]} position={[40, 0.03, -25]} color="#d6c7a1" />
      <mesh position={[45, 0.04, -28]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6, 40]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.2} />
      </mesh>
      {/* The fence, with a gap for the gate */}
      <Box size={[13, 0.8, 0.15]} position={[31.5, 0.4, -10]} color="#57534e" />
      <Box size={[17, 0.8, 0.15]} position={[50.5, 0.4, -10]} color="#57534e" />
      {trees.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.25, 0.32, 2.8, 8]} />
            <meshStandardMaterial color="#6b4f3a" />
          </mesh>
          <mesh position={[0, 3.8, 0]}>
            <icosahedronGeometry args={[2.2, 1]} />
            <meshStandardMaterial color={i % 2 ? '#3f6212' : '#4d7c0f'} flatShading />
          </mesh>
        </group>
      ))}
      {/* Benches by the pond */}
      {[
        [38, -32],
        [50, -20],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Box size={[2, 0.12, 0.6]} position={[0, 0.5, 0]} color="#92400e" />
          <Box size={[2, 0.6, 0.1]} position={[0, 0.85, 0.28]} color="#92400e" />
        </group>
      ))}
    </group>
  )
}

/** Tall office towers at the end of the street: the way to work. */
function BusinessDistrict() {
  return (
    <group>
      {[
        [82, 18, 40, '#64748b'],
        [96, 4, 55, '#475569'],
        [84, -16, 34, '#94a3b8'],
      ].map(([x, z, h, color], i) => (
        <Box
          key={i}
          size={[12, h as number, 12]}
          position={[x as number, (h as number) / 2, z as number]}
          color={color as string}
        />
      ))}
      {/* A bus shelter at the end of the street */}
      <Box size={[3, 0.1, 1.4]} position={[58, 2.4, 9.6]} color="#334155" />
      <Box
        size={[3, 2.4, 0.06]}
        position={[58, 1.2, 10.3]}
        color="#bae6fd"
        opacity={0.5}
      />
    </group>
  )
}

/**
 * The traffic: a bus and a few cars going up and down the street, each in its
 * lane, stopping when the player is in the road in front of them.
 */
const VEHICLES: Array<{
  kind: 'bus' | 'car'
  lane: 1 | -1
  speed: number
  start: number
  colour: string
}> = [
  { kind: 'bus', lane: 1, speed: 7, start: -70, colour: '#b91c1c' },
  { kind: 'car', lane: 1, speed: 10, start: 10, colour: '#1d4ed8' },
  { kind: 'car', lane: -1, speed: 9, start: 40, colour: '#f59e0b' },
  { kind: 'car', lane: -1, speed: 11, start: -30, colour: '#e5e7eb' },
]
const ROAD_END = 90

function Traffic() {
  const groups = useRef<Array<Group | null>>([])
  const along = useRef(VEHICLES.map((v) => v.start))
  useFrame((_, raw) => {
    if (STILL) return
    const delta = Math.min(raw, 0.25)
    VEHICLES.forEach((v, i) => {
      const g = groups.current[i]
      if (!g) return
      // Eastbound in the south lane, westbound in the north lane.
      const z = v.lane * 2.4
      const x = along.current[i]
      const ahead = (playerAt.x - x) * v.lane
      const inLane = Math.abs(playerAt.z - z) < 2.2
      const blocked = inLane && ahead > 0 && ahead < (v.kind === 'bus' ? 9 : 6)
      if (!blocked) {
        let next = x + v.lane * v.speed * delta
        if (next > ROAD_END) next = -ROAD_END
        if (next < -ROAD_END) next = ROAD_END
        along.current[i] = next
      }
      g.position.set(along.current[i], 0, z)
    })
  })
  // Moving traffic stops for the player, so it is not read as solid where it was.
  return (
    <group userData={{ passable: true }}>
      {VEHICLES.map((v, i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g
          }}
          position={[v.start, 0, v.lane * 2.4]}
          rotation={[0, v.lane > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
        >
          {v.kind === 'bus' ? (
            <Bus colour={v.colour} />
          ) : (
            <Car position={[0, 0, 0]} rotation={0} colour={v.colour} />
          )}
        </group>
      ))}
    </group>
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
