/**
 * The neighbourhood in 3D: one main street with the player's building, a
 * café, a food shop, a gym, a park and the road to the office, with people
 * walking about. The player walks it in third person (arrow keys or WASD) and
 * goes in at the doors. Built like the office and the flat: simple shapes,
 * a light that suits the hour, and drawing only a few times a second when
 * nothing moves, so it runs on ordinary laptops.
 */
import { lowDpr } from '../../world/lowDpr'
import { EngineeringWorks, HospitalBlock, OfficeTower } from './architecture'
import { Door as BuildingDoor, type DoorProps } from '../../world/doors/Door'
import { BUILDINGS, COURTHOUSE } from '../worldMap'
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
import { SceneLook } from '../../world/look/SceneLook'
import { Fronts, StreetSurfaces } from './streetDressing'
import { FRIEND_LOOKS } from '../../content/adultLooks'
import { friendWho, NEIGHBOUR } from '../../game/social'
import { BOUNDS, standAt, areaAt, surfaceAt, type Area } from '../streets'
import { Bike, Bus, Car } from './vehicles'
import type { Vector } from '../../content/office'
import { Box, Plant } from '../../office/scene/parts'
import { PeopleDetail, Walker, type PersonLook } from '../../office/scene/people'
import { local, TOWN_PEOPLE } from '../../content/townPeople'
import { COURIER_LOOK } from '../../home/scene/courierLook'
import { Npc } from '../../world/npc/Npc'
import { Prop } from '../../world/props'
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

/** Who the people walking down the street are (talk to them). */
const PASSER_WHO = Array.from({ length: 12 }, (_, i) => local('street', i))

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

/** Where the courier waits, by the home's door on the street. */
const COURIER_AT = { x: -38.6, z: 6.7 }

export interface CitySceneProps {
  /** The place the player is at, or last left. */
  at: PlaceId
  /** Someone to walk over to (`person:<id>`), with a counter. */
  request?: { id: string; nonce: number } | null
  /** Walked up to someone to talk (see world/npc/people.ts). */
  onPerson?: (id: string) => void
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
  /** The court's door was clicked (it is closed when the player is in the street). */
  onCourt?: () => void
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
  /**
   * The takeaway came while the player was out: the courier waits at the
   * building's door in the street (see game/delivery.ts), to hand it over there.
   */
  courier?: boolean
  /**
   * A taxi to work, booked from the street: on its way up the road, waiting at
   * the kerb by the player, or driving off with them (see Taxi).
   */
  taxi?: 'coming' | 'waiting' | 'leaving' | null
  /** The taxi pulled up, the player got in, or it has driven off. */
  onTaxi?: (event: 'arrived' | 'in' | 'gone') => void
  /** The neighbour is outside the building, to stop and chat (see game/social.ts). */
  neighbour?: boolean
  /** The player came near: the neighbour calls over to them. */
  onNeighbourCalls?: () => void
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

/** Where the street's shadows are drawn: round the player. */
const followPlayer = () => playerAt

function CityScene(props: CitySceneProps) {
  // What the computer can do, and the player's choice in Settings.
  const [software, setLowPower] = useState(false)
  const quality = useGraphicsQuality()
  const lowPower = isLow(quality, software)
  const [parked, setParked] = useState({ x: -46, z: 3.6, heading: Math.PI / 2 })
  const [driving, setDriving] = useState(false)
  // Where a booked taxi waits along the kerb.
  const [taxiAt, setTaxiAt] = useState(0)
  // In the taxi: no prompts or progress left over from the street.
  const { taxi, onPrompt, onProgress } = props
  useEffect(() => {
    if (taxi !== 'leaving') return
    onPrompt(null)
    onProgress(null)
  }, [taxi, onPrompt, onProgress])
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
      dpr={lowPower ? lowDpr() : [1, 1.5]}
      frameloop="demand"
      camera={{ position: [-40, 6, 14], fov: 50, near: 0.1, far: 140 }}
      gl={{ antialias: !lowPower, powerPreference: 'default' }}
      shadows={!lowPower}
      onCreated={({ gl }) => setLowPower(isSoftware(gl))}
    >
      <Ticker fps={STILL ? 1 / 30 : lowPower ? 4 : 12} />
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 40, 120]} />
      <SceneLook
        look={
          props.dark
            ? 'street-night'
            : props.phase === 'morning'
              ? 'street-day'
              : 'street-evening'
        }
        low={lowPower}
        extent={26}
        follow={followPlayer}
      />
      <Parking.Provider value={parking}>
        <PeopleDetail low={lowPower}>
          <Street dark={props.dark} cameOutOf={props.outside ? props.at : undefined} />
          <Park />
          <BusinessDistrict dark={props.dark} />
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
              who={PASSER_WHO[i]}
            />
          ))}
          {props.courier && props.outside && (
            <group>
              <Npc
                who={TOWN_PEOPLE.courier}
                position={[COURIER_AT.x, 0, COURIER_AT.z]}
                rotation={0}
                look={COURIER_LOOK}
                reach={1.7}
                doing="waiting with your takeaway"
              />
              <group position={[COURIER_AT.x + 0.4, 0.2, COURIER_AT.z]}>
                <Prop kind="bag" />
              </group>
            </group>
          )}
          {props.neighbour && props.outside && (
            <Neighbour onCalls={props.onNeighbourCalls} />
          )}
          {props.taxi && props.outside && (
            <Taxi stage={props.taxi} onTaxi={props.onTaxi} onStop={setTaxiAt} />
          )}
          {props.taxi !== 'leaving' && (
            <StreetPlayer {...props} low={lowPower} taxiAt={taxiAt} />
          )}
          {props.raining && props.outside && (
            <Rain low={lowPower} wet={{ size: [150, 10], at: [0, 0] }} />
          )}
        </PeopleDetail>
      </Parking.Provider>
      <Door
        name={COURTHOUSE.name}
        colour="#57534e"
        labelled
        position={[COURTHOUSE.door[0], 0.02, COURTHOUSE.door[1] + 0.6]}
        onClick={() => props.onCourt?.()}
      />
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

/** Going in at each door: walk up to it and push it open (the court's is shut). */
function doorActivities(): Activity[] {
  const [cx, cz] = COURTHOUSE.door
  const court: Activity = {
    id: 'door-court',
    action: 'court-door',
    prompt: `go into ${COURTHOUSE.name}`,
    spot: { x: cx, z: cz + 1.8, reach: 2.4 },
    anchor: { x: cx, z: BOUNDS.minZ + 0.35, heading: 0 },
    stages: [{ clip: 'push-door', seconds: 0.8, label: 'Trying the door' }],
  }
  return [
    court,
    ...PLACES.map((place): Activity => {
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
        // Up to the door, at the pavement's edge (the door opens as they get there).
        anchor: { x, z: side * (BOUNDS.maxZ - 0.35), heading: side > 0 ? Math.PI : 0 },
        stages: [{ clip: 'push-door', seconds: 0.8, label: `Going in: ${place.name}` }],
        sounds: [{ at: 0.3, id: 'door' }],
      }
    }),
  ]
}

const DOORS = doorActivities()

/** Where the neighbour stands: on the pavement just along from the building's door, turned to it. */
const NEIGHBOUR_AT = { x: -38.6, z: 4.9 }

/**
 * The neighbour, outside the building on some evenings: standing on the
 * pavement with their shopping, they wave and call over when the player comes
 * near (once); the player can stop and chat.
 */
function Neighbour({ onCalls }: { onCalls?: () => void }) {
  const called = useRef(false)
  useFrame(() => {
    if (called.current) return
    if (Math.hypot(playerAt.x - NEIGHBOUR_AT.x, playerAt.z - NEIGHBOUR_AT.z) < 7) {
      called.current = true
      onCalls?.()
    }
  })
  const who = friendWho(NEIGHBOUR)!
  return (
    <group>
      <Npc
        who={who}
        position={[NEIGHBOUR_AT.x, 0, NEIGHBOUR_AT.z]}
        rotation={1.6}
        look={FRIEND_LOOKS[NEIGHBOUR]}
        reach={1.8}
        doing="on her way home with the shopping"
        phase={0.4}
      />
      <group position={[NEIGHBOUR_AT.x + 0.35, 0.2, NEIGHBOUR_AT.z + 0.1]}>
        <Prop kind="bag" />
      </group>
    </group>
  )
}

/** Where the taxi pulls up: at the kerb on the player's side of the road. */
const TAXI_KERB = 3.6

/** The taxi's rear door on the pavement side, to get in at. */
function taxiDoor(x: number): Activity {
  return {
    id: 'taxi-door',
    action: 'taxi-in',
    prompt: 'get in the taxi',
    spot: { x: x - 0.5, z: TAXI_KERB + 1.6, reach: 2.2 },
    anchor: { x: x - 0.5, z: TAXI_KERB + 1.05, heading: 0 },
    stages: [
      { clip: 'push-door', seconds: 0.9, label: 'Opening the taxi door' },
      { clip: 'stand', seconds: 0.7, label: 'Getting in' },
    ],
    sounds: [{ at: 0.4, id: 'door' }],
  }
}

/**
 * A taxi to work: it drives up the road from the west end and pulls in at the
 * kerb by the player, waits, and once the player is in, drives off east
 * towards the business district (then the page takes them to work).
 */
function Taxi({
  stage,
  onTaxi,
  onStop,
}: {
  stage: 'coming' | 'waiting' | 'leaving'
  onTaxi?: (event: 'arrived' | 'in' | 'gone') => void
  /** Where along the kerb it will wait (for its door). */
  onStop: (x: number) => void
}) {
  const g = useRef<Group>(null)
  const invalidate = useThree((s) => s.invalidate)
  // Where it stops: by the player when it was booked (within the street).
  const [stop] = useState(() => Math.max(-56, Math.min(58, playerAt.x - 1.4)))
  const [from] = useState(() => (STILL ? stop : -ROAD_END))
  const x = useRef(from)
  const told = useRef<string | null>(null)
  useEffect(() => onStop(stop), [stop, onStop])
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.25)
    if (stage === 'coming') {
      const left = stop - x.current
      // Slowing down as it comes in to the kerb.
      x.current = Math.min(stop, x.current + Math.max(2.5, Math.min(14, left * 1.2)) * dt)
      if (x.current >= stop && told.current !== 'arrived') {
        told.current = 'arrived'
        onTaxi?.('arrived')
      }
    } else if (stage === 'leaving') {
      x.current += (STILL ? 400 : 12) * dt
      if (x.current > ROAD_END && told.current !== 'gone') {
        told.current = 'gone'
        onTaxi?.('gone')
      }
    }
    if (g.current) {
      // Pulling in from the lane to the kerb over the last few metres.
      const pull =
        stage === 'coming' ? Math.min(1, Math.max(0, 1 - (stop - x.current) / 10)) : 1
      g.current.position.set(x.current, 0, 2.4 + (TAXI_KERB - 2.4) * pull)
    }
    if (stage !== 'waiting') invalidate()
  })
  return (
    <group
      ref={g}
      position={[from, 0, 2.4]}
      rotation={[0, -Math.PI / 2, 0]}
      userData={{ passable: true }}
    >
      <Car position={[0, 0, 0]} rotation={0} colour="#facc15" />
      {/* The roof sign, lit */}
      <Box
        size={[0.7, 0.22, 0.28]}
        position={[0, 1.62, 0]}
        color="#fef9c3"
        emissive="#facc15"
      />
      {/* A chequered stripe along each side */}
      {[-0.92, 0.92].map((s) => (
        <Box key={s} size={[0.02, 0.12, 3.2]} position={[s, 0.72, 0]} color="#18181b" />
      ))}
    </group>
  )
}

/**
 * The player in the street: the shared third-person character (walking,
 * the bike, a leased car), going in at doors; the traffic stops for them and
 * the sounds follow the part of the street they are in.
 */
function StreetPlayer(props: CitySceneProps & { low: boolean; taxiAt: number }) {
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
      activities={props.taxi === 'waiting' ? [...DOORS, taxiDoor(props.taxiAt)] : DOORS}
      blocked={(a) =>
        // The court's door can be tried (it is shut: see onDone).
        a.action === 'court-door' || a.action === 'taxi-in'
          ? null
          : a.action
            ? props.blocked(a.action.slice(6) as PlaceId)
            : null
      }
      controls={props.controls}
      request={props.request ?? null}
      onPrompt={props.onPrompt}
      onProgress={props.onProgress}
      onDone={(a, completed) => {
        if (completed && a.action === 'taxi-in') props.onTaxi?.('in')
        else if (completed && a.action?.startsWith('person:'))
          props.onPerson?.(a.action.slice('person:'.length))
        else if (completed && a.action === 'court-door') props.onCourt?.()
        else if (completed && a.action) props.onEnter(a.action.slice(6) as PlaceId)
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
      mapped
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
/** Each place's door: glass for the shops and the café, double for the gym, steel for the garage. */
const DOOR_STYLE: Partial<Record<PlaceId, Partial<DoorProps>>> = {
  home: { width: 1.2, height: 2.3, colour: '#1e3a8a', frame: '#e7e5e4' },
  cafe: { width: 1.2, height: 2.3, leaf: 'glass', frame: '#7f1d1d' },
  shop: { kind: 'automatic', width: 1.6, height: 2.4, leaf: 'glass', frame: '#3f3f46' },
  gym: { kind: 'double', width: 1.6, height: 2.4, leaf: 'glass', frame: '#1e3a8a' },
  garage: { width: 1.3, height: 2.4, leaf: 'metal', colour: '#475569', frame: '#334155' },
  offices: {
    kind: 'automatic',
    width: 1.6,
    height: 2.4,
    leaf: 'glass',
    frame: '#0f766e',
  },
}

function Street({ dark, cameOutOf }: { dark: boolean; cameOutOf?: PlaceId }) {
  return (
    <group>
      {/* Grass, asphalt, paving slabs and kerbs (streetDressing.tsx) */}
      <StreetSurfaces />
      {/* Road markings and two crossings */}
      {Array.from({ length: 24 }, (_, i) => (
        <Box
          key={i}
          size={[2.4, 0.01, 0.15]}
          position={[-69 + i * 6, 0.007, 0]}
          color="#e7e5e4"
        />
      ))}
      {[-20, 30].map((x) =>
        Array.from({ length: 5 }, (_, i) => (
          <Box
            key={`${x}-${i}`}
            size={[3, 0.01, 0.9]}
            position={[x, 0.007, -3.6 + i * 1.8]}
            color="#f5f5f4"
          />
        )),
      )}
      <Fronts buildings={BUILDINGS} dark={dark} />
      <Courthouse dark={dark} />
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
            {/* The way in: a real door (world/doors), open as the player goes in at it,
                as they come out, and for anyone who walks up to it */}
            <BuildingDoor
              position={[p.door[0], 0, p.door[1] + side * 1.98]}
              rotation={side > 0 ? Math.PI : 0}
              {...DOOR_STYLE[p.id]}
              openOn={[`door-${p.id}`]}
              openAtStart={cameOutOf === p.id ? 1.6 : 0}
              sense={1.7}
            />
            {/* Inside, seen through the doorway (and the glass): the hall, lit in
                the evening. Between the wall and the door's leaf. */}
            <Box
              size={[
                (DOOR_STYLE[p.id]?.width ?? 0.95) + 0.02,
                (DOOR_STYLE[p.id]?.height ?? 2.1) + 0.02,
                0.008,
              ]}
              position={[
                p.door[0],
                ((DOOR_STYLE[p.id]?.height ?? 2.1) + 0.02) / 2,
                p.door[1] + side * 1.994,
              ]}
              color={dark ? '#fde68a' : '#292524'}
              emissive={dark ? '#b45309' : undefined}
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

/**
 * Westmark County Court from the street: a stone front with columns, steps up
 * to tall doors, the court's crest and name. Closed whenever the player is in
 * the street (it sits on weekdays, 10 to 4: lawyers come from work).
 */
function Courthouse({ dark }: { dark: boolean }) {
  const { x, w, h, color } = COURTHOUSE
  const depth = 14
  const front = -10
  const stone = '#d6d0c2'
  return (
    <group>
      <Box size={[w, h, depth]} position={[x, h / 2, front - depth / 2]} color={color} />
      {/* The cornice and a low pediment over the columns */}
      <Box
        size={[w + 0.6, 0.6, depth + 0.6]}
        position={[x, h + 0.3, front - depth / 2]}
        color={stone}
      />
      <Box size={[9.4, 1.1, 1.6]} position={[x, 7.9, front + 0.6]} color={stone} />
      <Box size={[7, 0.8, 1.5]} position={[x, 8.85, front + 0.6]} color={stone} />
      {/* Four columns on a plinth, and three steps up */}
      {[-3.6, -1.2, 1.2, 3.6].map((dx) => (
        <group key={dx} position={[x + dx, 0, front + 0.9]}>
          <mesh position={[0, 4.0, 0]}>
            <cylinderGeometry args={[0.36, 0.42, 6.2, 20]} />
            <meshStandardMaterial color="#f5f5f4" roughness={0.7} />
          </mesh>
          {/* The base and the capital of each column */}
          <Box size={[1.0, 0.3, 1.0]} position={[0, 0.9, 0]} color={stone} />
          <Box size={[0.95, 0.22, 0.95]} position={[0, 7.2, 0]} color={stone} />
          <Box size={[1.05, 0.12, 1.05]} position={[0, 7.36, 0]} color={stone} />
        </group>
      ))}
      {/* The pediment: a low triangle of stone over the columns (a three-sided
          prism, apex up, flattened to a shallow pitch) */}
      <mesh
        position={[x, 10.06, front + 0.6]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, 1, 0.3]}
      >
        <cylinderGeometry args={[5.4, 5.4, 1.4, 3, 1, false, Math.PI, Math.PI * 2]} />
        <meshStandardMaterial color={stone} roughness={0.8} />
      </mesh>
      {/* A string course along the front, and frames round the windows */}
      <Box size={[w, 0.25, 0.3]} position={[x, 1.0, front + 0.12]} color={stone} />
      {[-4.6, 4.6].map((dx) => (
        <Box
          key={dx}
          size={[1.75, 2.75, 0.06]}
          position={[x + dx, 3.2, front + 0.01]}
          color={stone}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          size={[10 - i * 0.6, 0.25, 2.2 - i * 0.5]}
          position={[x, 0.12 + i * 0.25, front + 1.05 - i * 0.25]}
          color="#a8a29e"
        />
      ))}
      {/* Tall double doors, locked when the court is closed (they rattle when
          tried), with lit windows either side in the evening */}
      <BuildingDoor
        position={[x, 0.75, front + 0.04]}
        kind="double"
        width={2.2}
        height={3.4}
        colour="#3f2a1d"
        frame={stone}
        locked
        sense={0}
        openOn={['door-court']}
      />
      {[-4.6, 4.6].map((dx) => (
        <Box
          key={dx}
          size={[1.4, 2.4, 0.08]}
          position={[x + dx, 3.2, front + 0.03]}
          color={dark ? '#334155' : '#8fb3c7'}
        />
      ))}
      {/* The crest */}
      <mesh position={[x, 8.85, front + 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.08, 24]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.45} metalness={0.3} />
      </mesh>
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

/**
 * The end of the street, the way to work: an office tower, Riverside
 * Community Hospital and Northbank Engineering's works (architecture.tsx).
 */
function BusinessDistrict({ dark }: { dark: boolean }) {
  return (
    <group>
      <OfficeTower x={86} z={22} w={14} d={14} h={46} tint="#8fb4cc" dark={dark} />
      <OfficeTower x={104} z={6} w={12} d={12} h={58} tint="#7fa6bf" dark={dark} />
      <HospitalBlock x={86} z={-15} dark={dark} />
      <EngineeringWorks x={69} z={41} dark={dark} />
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
