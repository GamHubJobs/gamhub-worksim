/**
 * The 3D office floor of Cobalt Ridge Consulting. Loaded only when the office
 * is shown, so the rest of the app stays small and fast.
 *
 * Navigation is click-to-go: the camera glides between fixed viewpoints
 * (reception, your desk, Priya's office, the break room). Clicking a glowing
 * floor marker or an object moves there.
 */
import { ContactShadows, Html, useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Vector3, type Group, type Mesh, type WebGLRenderer } from 'three'
import { COMPANY } from '../../content/company'
import {
  SPOTS,
  getInteraction,
  getSpot,
  type InteractionId,
  type SpotId,
  type Vector,
} from '../../content/office'
import { COLORS } from './colors'
import { Box, Desk, OfficeChair, Person, Place, Plant, Sofa } from './parts'

export interface OfficeSceneProps {
  spot: SpotId
  /** Highlights the computer when there is something new to read. */
  computerAlert: boolean
  playerName: string
  onGo: (spot: SpotId) => void
  onInteract: (interaction: InteractionId) => void
}

/**
 * Computers without a graphics card draw 3D in software, which is slow. They
 * get fewer frames per second and no soft shadows, so the rest of the app
 * stays responsive.
 */
function isSoftwareRenderer(gl: WebGLRenderer): boolean {
  const context = gl.getContext()
  const info = context.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(
    info
      ? context.getParameter(info.UNMASKED_RENDERER_WEBGL)
      : context.getParameter(context.RENDERER),
  )
  return /swiftshader|llvmpipe|software|basic render/i.test(renderer)
}

/**
 * Only redrawn when what it shows changes (where the player stands, the mail
 * alert), not on every change to the career, such as the clock moving.
 */
export default memo(OfficeScene)

function OfficeScene(props: OfficeSceneProps) {
  const start = getSpot(props.spot).camera
  const [lowPower, setLowPower] = useState(false)
  return (
    <Canvas
      // Software 3D draws at a lower resolution: much faster, slightly softer.
      dpr={lowPower ? 0.6 : [1, 1.5]}
      frameloop="demand"
      camera={{ position: start.position, fov: 45, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'default' }}
      onCreated={({ gl }) => setLowPower(isSoftwareRenderer(gl))}
      data-lowpower={lowPower}
    >
      <Ticker fps={lowPower ? 3 : 30} />
      <color attach="background" args={['#e6edf3']} />
      <hemisphereLight args={['#ffffff', '#b8a990', 1.4]} />
      <directionalLight position={[6, 12, 8]} intensity={1.5} />
      <directionalLight position={[-8, 6, -4]} intensity={0.35} color="#cfe3ff" />
      <CameraRig spot={props.spot} />
      <Building playerName={props.playerName} />
      <Reception onInteract={props.onInteract} />
      <Workspace computerAlert={props.computerAlert} onInteract={props.onInteract} />
      <ManagerOffice onInteract={props.onInteract} />
      <BreakRoom onInteract={props.onInteract} />
      {SPOTS.map((s) => (
        <Marker
          key={s.id}
          hidden={s.id === props.spot}
          position={s.marker}
          label={s.name}
          onClick={() => props.onGo(s.id)}
        />
      ))}
      {!lowPower && (
        <ContactShadows
          position={[0, 0.011, 0]}
          scale={30}
          opacity={0.35}
          blur={2.4}
          far={3}
          resolution={1024}
          frames={1}
        />
      )}
    </Canvas>
  )
}

/**
 * Draws a new frame a fixed number of times per second. The office only needs
 * gentle movement, so this is far lighter than drawing as fast as possible.
 */
function Ticker({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    invalidate()
    const timer = window.setInterval(() => invalidate(), 1000 / fps)
    return () => window.clearInterval(timer)
  }, [fps, invalidate])
  return null
}

/** Glides the camera to the current viewpoint. */
function CameraRig({ spot }: { spot: SpotId }) {
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)
  const goal = useMemo(() => getSpot(spot).camera, [spot])
  const target = useRef(new Vector3(...goal.target))
  const goalPosition = useMemo(() => new Vector3(...goal.position), [goal])
  const goalTarget = useMemo(() => new Vector3(...goal.target), [goal])

  useFrame((_, delta) => {
    const step = 1 - Math.exp(-delta * 3)
    camera.position.lerp(goalPosition, step)
    target.current.lerp(goalTarget, step)
    camera.lookAt(target.current)
    // Keep drawing smoothly until the camera has arrived.
    if (
      camera.position.distanceToSquared(goalPosition) > 1e-5 ||
      target.current.distanceToSquared(goalTarget) > 1e-5
    ) {
      invalidate()
    }
  })
  return null
}

/** A glowing ring on the floor: click it to walk there. */
function Marker({
  position,
  label,
  hidden,
  onClick,
}: {
  position: Vector
  label: string
  hidden: boolean
  onClick: () => void
}) {
  const ring = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && !hidden)
  useFrame(({ clock }) => {
    if (ring.current)
      ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.5) * 0.08)
  })
  return (
    <group
      position={position}
      visible={!hidden}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (hidden) return
        event.stopPropagation()
        onClick()
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        if (hidden) return
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.46, 40]} />
        <meshBasicMaterial
          color={hovered ? '#2563eb' : '#3b82f6'}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={hovered ? 0.6 : 0.3} />
      </mesh>
      {hovered && !hidden && (
        <Html
          position={[0, 0.5, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="rounded-full bg-blue-700 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow">
            Go to {label}
          </span>
        </Html>
      )}
    </group>
  )
}

/** Wraps an object the player can use: highlights it and shows its name on hover. */
function Interactive({
  id,
  labelPosition,
  onInteract,
  children,
}: {
  id: InteractionId
  labelPosition: Vector
  onInteract: (id: InteractionId) => void
  children: ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const interaction = getInteraction(id)
  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onInteract(id)
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <Html
          position={labelPosition}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="rounded-md bg-slate-900/90 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg">
            {interaction.label}
          </span>
        </Html>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// The building
// ---------------------------------------------------------------------------

const WALL_HEIGHT = 2.9

function Building({ playerName }: { playerName: string }) {
  return (
    <group>
      {/* Floors: wood, with carpet in the workspace */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]}>
        <planeGeometry args={[24, 17]} />
        <meshStandardMaterial color={COLORS.floor} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, 0.005, 0.6]}>
        <planeGeometry args={[8.6, 6.4]} />
        <meshStandardMaterial color={COLORS.carpet} roughness={1} />
      </mesh>
      {/* Back wall with large windows and a city skyline */}
      <Box
        size={[24, WALL_HEIGHT, 0.2]}
        position={[0, WALL_HEIGHT / 2, -8]}
        color={COLORS.wall}
      />
      {[-9, -3, 3, 9].map((x) => (
        <group key={x}>
          <Box
            size={[4.6, 1.9, 0.05]}
            position={[x, 1.55, -7.88]}
            color="#dbeafe"
            emissive="#bfdbfe"
          />
          <Box
            size={[0.06, 1.9, 0.08]}
            position={[x, 1.55, -7.86]}
            color={COLORS.metal}
          />
        </group>
      ))}
      <Skyline />
      {/* Side walls */}
      <Box
        size={[0.2, WALL_HEIGHT, 17]}
        position={[-12, WALL_HEIGHT / 2, 0.5]}
        color={COLORS.wall}
      />
      <Box
        size={[0.2, WALL_HEIGHT, 17]}
        position={[12, WALL_HEIGHT / 2, 0.5]}
        color={COLORS.wall}
      />
      {/* Skirting */}
      <Box size={[24, 0.1, 0.22]} position={[0, 0.05, -7.88]} color="#cbd5e1" />
      <Clock position={[0.8, 2.45, -7.88]} />
      <Html
        transform
        position={[0.8, 1.95, -7.87]}
        distanceFactor={4}
        pointerEvents="none"
      >
        <span className="text-[10px] font-semibold tracking-[0.3em] text-slate-500 uppercase">
          Finance &amp; Administration
        </span>
      </Html>
      {/* Small personal touch at the player's desk */}
      <Html
        transform
        position={[0.6, 0.79, 1.42]}
        rotation={[-Math.PI / 2, 0, 0]}
        distanceFactor={2.5}
      >
        <span className="pointer-events-none rounded-sm bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 shadow">
          {playerName}
        </span>
      </Html>
    </group>
  )
}

function Skyline() {
  const buildings = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const x = -12 + i * 1.15 + ((i * 37) % 7) * 0.08
        const height = 3 + ((i * 53) % 11) * 0.7
        return { x, height, shade: i % 3 }
      }),
    [],
  )
  return (
    <group position={[0, 0, -14]}>
      {buildings.map((b, i) => (
        <Box
          key={i}
          size={[1, b.height, 1]}
          position={[b.x, b.height / 2 - 0.6, (i % 2) * -1.5]}
          color={['#9fb3c8', '#b4c5d6', '#8aa0b6'][b.shade]}
        />
      ))}
    </group>
  )
}

/** A wall clock that shows the real time. */
function Clock({ position }: { position: Vector }) {
  const hours = useRef<Mesh>(null)
  const minutes = useRef<Mesh>(null)
  useFrame(() => {
    const now = new Date()
    const m = now.getMinutes() + now.getSeconds() / 60
    const h = (now.getHours() % 12) + m / 60
    if (minutes.current) minutes.current.rotation.z = -(m / 60) * Math.PI * 2
    if (hours.current) hours.current.rotation.z = -(h / 12) * Math.PI * 2
  })
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.005]}>
        <torusGeometry args={[0.3, 0.025, 8, 32]} />
        <meshStandardMaterial color={COLORS.metal} />
      </mesh>
      <mesh ref={hours} position={[0, 0, 0.03]}>
        <boxGeometry args={[0.025, 0.16, 0.01]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh ref={minutes} position={[0, 0, 0.035]}>
        <boxGeometry args={[0.018, 0.24, 0.01]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Areas
// ---------------------------------------------------------------------------

type Interact = { onInteract: (id: InteractionId) => void }

function Reception({ onInteract }: Interact) {
  return (
    <group>
      {/* Feature wall with the company name */}
      <Box size={[5.2, 2.7, 0.18]} position={[-6.6, 1.35, 2.3]} color={COLORS.accent} />
      <Html
        transform
        position={[-6.6, 1.95, 2.4]}
        distanceFactor={4}
        pointerEvents="none"
      >
        <div className="text-center text-white">
          <p className="text-2xl font-bold tracking-wide">{COMPANY.name}</p>
          <p className="text-[9px] tracking-[0.4em] text-blue-200 uppercase">
            Consulting · Finance · Advisory
          </p>
        </div>
      </Html>
      {/* Reception desk */}
      <Box
        size={[3.2, 1.05, 0.7]}
        position={[-6.6, 0.53, 4.2]}
        color="#ffffff"
        radius={0.05}
      />
      <Box
        size={[3.4, 0.05, 0.85]}
        position={[-6.6, 1.08, 4.15]}
        color={COLORS.wood}
        radius={0.02}
      />
      <Box size={[3.2, 0.12, 0.02]} position={[-6.6, 0.35, 4.56]} color={COLORS.accent} />
      <Box size={[0.5, 0.32, 0.03]} position={[-7.3, 1.28, 3.95]} color={COLORS.screen} />
      <Interactive
        id="receptionist"
        labelPosition={[-6.2, 2.05, 3.4]}
        onInteract={onInteract}
      >
        <Person
          position={[-6.2, 0, 3.4]}
          rotation={Math.PI}
          look={{ shirt: '#be123c', skin: 1, hair: 0, longHair: true }}
          phase={1.3}
        />
      </Interactive>
      {/* Waiting area */}
      <Sofa position={[-10.2, 0, 6.6]} rotation={Math.PI / 2} />
      <Box
        size={[0.8, 0.38, 0.8]}
        position={[-8.9, 0.19, 6.6]}
        color={COLORS.wood}
        radius={0.04}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-9.6, 0.008, 6.6]}>
        <circleGeometry args={[1.6, 40]} />
        <meshStandardMaterial color="#cbd5e1" roughness={1} />
      </mesh>
      <Plant position={[-11.2, 0, 4.0]} scale={1.3} />
      <Plant position={[-3.7, 0, 3.0]} scale={1.1} />
      {/* Entrance doors */}
      <Box
        size={[0.08, 2.3, 2.2]}
        position={[-11.88, 1.15, 7.4]}
        color={COLORS.glass}
        opacity={0.55}
      />
    </group>
  )
}

function Workspace({ computerAlert, onInteract }: Interact & { computerAlert: boolean }) {
  // Two rows of desks, back to back. The player's desk is front row, middle.
  const front: Array<[number, string | null]> = [
    [-1.2, '#0f766e'],
    [0.6, null],
    [2.4, null],
  ]
  const back: Array<[number, string]> = [
    [-1.2, '#7c3aed'],
    [0.6, '#ca8a04'],
    [2.4, '#0369a1'],
  ]
  return (
    <group>
      {front.map(([x, shirt], i) =>
        x === 0.6 ? (
          <Interactive
            key={x}
            id="computer"
            labelPosition={[0.6, 1.65, 0.9]}
            onInteract={onInteract}
          >
            <Desk position={[0.6, 0, 1.1]} glow={computerAlert} />
            <OfficeChair position={[0.75, 0, 1.85]} rotation={-0.35} color="#1d4ed8" />
            {computerAlert && <AlertBubble position={[0.6, 1.55, 0.88]} />}
          </Interactive>
        ) : (
          <group key={x}>
            <Desk position={[x, 0, 1.1]} />
            <OfficeChair position={[x, 0, 1.75]} />
            {shirt &&
              (i === 0 ? (
                // Marcus sits next to the player.
                <Interactive
                  id="senior"
                  labelPosition={[x, 1.75, 1.65]}
                  onInteract={onInteract}
                >
                  <Person
                    position={[x, 0, 1.65]}
                    look={{ shirt, skin: i + 2, hair: i + 1 }}
                    seated
                    typing
                    phase={i * 2.1}
                  />
                </Interactive>
              ) : (
                <Person
                  position={[x, 0, 1.65]}
                  look={{ shirt, skin: i + 2, hair: i + 1 }}
                  seated
                  typing
                  phase={i * 2.1}
                />
              ))}
          </group>
        ),
      )}
      {back.map(([x, shirt], i) => (
        <group key={x}>
          <Desk position={[x, 0, -0.45]} rotation={Math.PI} />
          <OfficeChair position={[x, 0, -1.1]} rotation={Math.PI} />
          <Person
            position={[x, 0, -1.0]}
            rotation={Math.PI}
            look={{ shirt, skin: i, hair: i + 2, longHair: i === 1 }}
            seated
            typing={i !== 2}
            phase={i * 1.7 + 0.5}
          />
        </group>
      ))}
      {/* Low divider between the rows */}
      <Box
        size={[5.6, 0.35, 0.05]}
        position={[0.6, 0.95, 0.33]}
        color="#94a3b8"
        opacity={0.6}
      />
      {/* Team whiteboard */}
      <Interactive
        id="whiteboard"
        labelPosition={[-2.9, 2.25, 2.4]}
        onInteract={onInteract}
      >
        <Place position={[-2.9, 0, 2.4]} rotation={0.5}>
          <Box
            size={[1.5, 0.95, 0.04]}
            position={[0, 1.45, 0]}
            color="#ffffff"
            radius={0.01}
          />
          <Box
            size={[1.56, 1.0, 0.03]}
            position={[0, 1.45, -0.02]}
            color={COLORS.metal}
          />
          {[1.7, 1.55, 1.4, 1.25].map((y, i) => (
            <Box
              key={y}
              size={[0.6 + (i % 2) * 0.35, 0.03, 0.01]}
              position={[-0.25, y, 0.025]}
              color={['#2563eb', '#16a34a', '#dc2626', '#2563eb'][i]}
            />
          ))}
          {[-0.5, 0.5].map((x) => (
            <Box
              key={x}
              size={[0.04, 1.0, 0.04]}
              position={[x, 0.5, 0]}
              color={COLORS.metal}
            />
          ))}
        </Place>
      </Interactive>
      {/* A colleague standing at a filing cabinet */}
      <Box
        size={[0.5, 1.1, 0.6]}
        position={[4.3, 0.55, -1.5]}
        color="#cbd5e1"
        radius={0.02}
      />
      <Person
        position={[4.3, 0, -0.85]}
        rotation={Math.PI}
        look={{ shirt: '#15803d', skin: 2, hair: 4 }}
        phase={3.3}
      />
      <Plant position={[-2.6, 0, -1.6]} />
      <Plant position={[4.4, 0, 3.6]} scale={1.2} />
    </group>
  )
}

/** A small floating envelope over the computer when there is unread mail. */
function AlertBubble({ position }: { position: Vector }) {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (group.current)
      group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 3) * 0.04
  })
  return (
    <group ref={group} position={position}>
      <Box size={[0.22, 0.15, 0.02]} color="#f59e0b" emissive="#f59e0b" radius={0.01} />
    </group>
  )
}

function ManagerOffice({ onInteract }: Interact) {
  return (
    <group>
      {/* Glass walls with a door opening */}
      <Box
        size={[0.06, 2.6, 4.4]}
        position={[5, 1.3, -5.8]}
        color={COLORS.glass}
        opacity={0.35}
      />
      <Box
        size={[0.06, 2.6, 1.0]}
        position={[5, 1.3, -1.5]}
        color={COLORS.glass}
        opacity={0.35}
      />
      <Box
        size={[7, 2.6, 0.06]}
        position={[8.5, 1.3, -1]}
        color={COLORS.glass}
        opacity={0.3}
      />
      <Box size={[0.1, 0.08, 7]} position={[5, 2.6, -4.5]} color={COLORS.metal} />
      <Box size={[7, 0.08, 0.1]} position={[8.5, 2.6, -1]} color={COLORS.metal} />
      {/* Desk, chairs and Priya */}
      <Box
        size={[2.0, 0.06, 0.95]}
        position={[8.4, 0.75, -4.3]}
        color={COLORS.darkWood}
        radius={0.02}
      />
      <Box
        size={[1.9, 0.72, 0.06]}
        position={[8.4, 0.38, -4.7]}
        color={COLORS.darkWood}
      />
      <Box
        size={[0.6, 0.38, 0.03]}
        position={[7.65, 1.12, -4.55]}
        rotation={0.8}
        color={COLORS.screen}
      />
      <OfficeChair position={[8.4, 0, -5.2]} rotation={Math.PI} color="#0f172a" />
      <Interactive id="manager" labelPosition={[8.4, 1.9, -5.1]} onInteract={onInteract}>
        <Person
          position={[8.4, 0, -5.1]}
          rotation={Math.PI}
          look={{ shirt: '#0f766e', skin: 2, hair: 2, longHair: true }}
          seated
          phase={0.7}
        />
      </Interactive>
      <OfficeChair position={[7.8, 0, -3.3]} color="#64748b" />
      <OfficeChair position={[9.0, 0, -3.3]} color="#64748b" />
      {/* Bookshelf */}
      <Place position={[10.4, 0, -7.6]}>
        <Box size={[2.2, 2.0, 0.05]} position={[0, 1.0, -0.18]} color={COLORS.darkWood} />
        {[-1.08, 1.08].map((x) => (
          <Box
            key={x}
            size={[0.05, 2.0, 0.4]}
            position={[x, 1.0, 0]}
            color={COLORS.darkWood}
          />
        ))}
        {[0.42, 0.97, 1.52, 1.98].map((y) => (
          <Box
            key={y}
            size={[2.2, 0.04, 0.4]}
            position={[0, y, 0]}
            color={COLORS.darkWood}
          />
        ))}
        {[0.45, 1.0, 1.55].map((y, shelf) => (
          <group key={y}>
            {Array.from({ length: 9 }, (_, i) => (
              <Box
                key={i}
                size={[0.12, 0.38, 0.28]}
                position={[-0.9 + i * 0.22, y + 0.2, 0.05]}
                color={
                  ['#1e40af', '#b91c1c', '#0f766e', '#ca8a04', '#475569'][
                    (i + shelf * 2) % 5
                  ]
                }
              />
            ))}
          </group>
        ))}
      </Place>
      <Plant position={[11.3, 0, -2.0]} scale={1.2} />
    </group>
  )
}

function BreakRoom({ onInteract }: Interact) {
  return (
    <group>
      {/* Half-height divider to the workspace */}
      <Box size={[0.12, 1.2, 5.2]} position={[-4, 0.6, -5.4]} color={COLORS.wall} />
      {/* Kitchen counter */}
      <Box size={[4.2, 0.9, 0.65]} position={[-9.2, 0.45, -7.5]} color="#e2e8f0" />
      <Box size={[4.3, 0.05, 0.7]} position={[-9.2, 0.92, -7.48]} color="#334155" />
      {/* Fridge */}
      <Box
        size={[0.8, 1.9, 0.7]}
        position={[-11.4, 0.95, -7.45]}
        color="#e5e7eb"
        radius={0.04}
      />
      {/* Coffee machine */}
      <Interactive id="coffee" labelPosition={[-9.6, 1.75, -7.3]} onInteract={onInteract}>
        <Box
          size={[0.42, 0.55, 0.4]}
          position={[-9.6, 1.22, -7.5]}
          color="#1f2937"
          radius={0.03}
        />
        <Box size={[0.2, 0.06, 0.12]} position={[-9.6, 1.1, -7.27]} color="#9ca3af" />
        <Box
          size={[0.3, 0.06, 0.02]}
          position={[-9.6, 1.4, -7.29]}
          color="#22c55e"
          emissive="#22c55e"
        />
        <mesh position={[-9.6, 0.99, -7.25]}>
          <cylinderGeometry args={[0.04, 0.035, 0.09, 12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </Interactive>
      {/* Tom by the coffee machine */}
      <Interactive
        id="colleague"
        labelPosition={[-8.4, 2.05, -6.2]}
        onInteract={onInteract}
      >
        <Person
          position={[-8.4, 0, -6.2]}
          rotation={Math.PI + 0.5}
          look={{ shirt: '#b45309', skin: 0, hair: 3 }}
          phase={2.4}
        />
      </Interactive>
      {/* Water cooler */}
      <Place position={[-4.8, 0, -7.4]}>
        <Box
          size={[0.4, 1.0, 0.4]}
          position={[0, 0.5, 0]}
          color="#f1f5f9"
          radius={0.03}
        />
        <mesh position={[0, 1.22, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.42, 16]} />
          <meshStandardMaterial color="#7dd3fc" transparent opacity={0.7} />
        </mesh>
      </Place>
      {/* Table and chairs */}
      <mesh position={[-7.4, 0.74, -3.6]}>
        <cylinderGeometry args={[0.75, 0.75, 0.05, 32]} />
        <meshStandardMaterial color={COLORS.wood} />
      </mesh>
      <mesh position={[-7.4, 0.36, -3.6]}>
        <cylinderGeometry args={[0.06, 0.06, 0.72, 8]} />
        <meshStandardMaterial color={COLORS.metal} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle) => (
        <OfficeChair
          key={angle}
          position={[-7.4 + Math.sin(angle) * 1.05, 0, -3.6 + Math.cos(angle) * 1.05]}
          rotation={angle}
          color="#f59e0b"
        />
      ))}
      <Person
        position={[-7.4, 0, -2.6]}
        look={{ shirt: '#4338ca', skin: 3, hair: 1 }}
        seated
        phase={4.1}
      />
      {/* Notice board */}
      <Interactive
        id="noticeboard"
        labelPosition={[-11.7, 2.25, -4.2]}
        onInteract={onInteract}
      >
        <Place position={[-11.85, 0, -4.2]} rotation={Math.PI / 2}>
          <Box size={[1.6, 1.0, 0.04]} position={[0, 1.55, 0]} color="#c2a27a" />
          {[
            [-0.5, 1.75, '#fef08a'],
            [0, 1.7, '#ffffff'],
            [0.5, 1.78, '#bfdbfe'],
            [-0.3, 1.35, '#ffffff'],
            [0.35, 1.35, '#fbcfe8'],
          ].map(([x, y, color], i) => (
            <Box
              key={i}
              size={[0.36, 0.3, 0.01]}
              position={[x as number, y as number, 0.03]}
              color={color as string}
            />
          ))}
        </Place>
      </Interactive>
      <Plant position={[-4.6, 0, -2.4]} />
    </group>
  )
}
