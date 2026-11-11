/**
 * Shared pieces for the places' interiors: the room, signs and menus painted
 * on canvas, lamps, and hotspots, the objects that do something when clicked
 * (each one runs a real action from the place's list, or says why not).
 * Simple shapes like the office and the street, so they load instantly.
 */
import { useAnchors, type AnchorSpec } from '../../../world/anchors'
import { useCursor } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Vector3, type Group } from 'three'
import type { Vector } from '../../../content/office'
import { Box } from '../../../office/scene/parts'
import { useInterior, usePainted, type Painting } from './kit'

// ---------------------------------------------------------------------------
// Painted signs, boards and labels
// ---------------------------------------------------------------------------

/** A flat board with a painting on it (a menu, a price list, an aisle sign). */
export function Board({
  size,
  position,
  rotation = 0,
  painting,
  paintingKey,
  glow = false,
}: {
  size: [number, number]
  position: Vector
  rotation?: number
  painting: Painting
  paintingKey: string
  glow?: boolean
}) {
  const map = usePainted(painting, paintingKey)
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <planeGeometry args={size} />
      {glow ? (
        <meshBasicMaterial map={map} toneMapped={false} />
      ) : (
        <meshStandardMaterial map={map} roughness={0.85} />
      )}
    </mesh>
  )
}

/** A floating label above a hotspot, shown on hover or focus. */
function Tag({ text, detail, height }: { text: string; detail: string; height: number }) {
  const map = usePainted(
    {
      width: 768,
      height: 160,
      background: 'rgba(0,0,0,0)',
      draw(g, w) {
        g.fillStyle = 'rgba(15, 23, 42, 0.88)'
        g.beginPath()
        g.roundRect(6, 6, w - 12, 148, 28)
        g.fill()
        g.fillStyle = '#ffffff'
        g.font = '600 44px system-ui, sans-serif'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(text, w / 2, 56, w - 40)
        g.fillStyle = '#cbd5e1'
        g.font = '400 34px system-ui, sans-serif'
        g.fillText(detail, w / 2, 112, w - 40)
      },
    },
    `${text}|${detail}`,
  )
  return (
    <sprite position={[0, height, 0]} scale={[2.9, 0.6, 1]} renderOrder={10}>
      <spriteMaterial map={map} transparent depthTest={false} depthWrite={false} />
    </sprite>
  )
}

// ---------------------------------------------------------------------------
// Hotspots
// ---------------------------------------------------------------------------

/**
 * Something the player can use: click it to do the action (as in the list).
 * A soft ring on the floor marks it; hovering shows what it is and costs, or
 * why it cannot be done now. Only actions that exist here become hotspots.
 */
export function Hotspot({
  action,
  position,
  ring = 1,
  tag = 2.4,
  children,
}: {
  action: string
  position: Vector
  /** The ring's radius on the floor. */
  ring?: number
  /** Height of the label. */
  tag?: number
  children: ReactNode
}) {
  const { doings, act } = useInterior()
  const doing = doings[action]
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && !!doing && !doing.blocked)
  const group = useRef<Group>(null)
  useHotspotPosition(group, action, ring)
  if (!doing) return <group position={position}>{children}</group>
  const ready = !doing.blocked
  return (
    <group
      ref={group}
      position={position}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        if (ready) act(action)
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[ring * 0.82, ring, 40]} />
        <meshBasicMaterial
          color={ready ? '#f59e0b' : '#94a3b8'}
          transparent
          opacity={hovered ? 0.95 : 0.45}
          depthWrite={false}
        />
      </mesh>
      {hovered && (
        <Tag text={doing.label} detail={doing.blocked ?? doing.detail} height={tag} />
      )}
    </group>
  )
}

/**
 * In development only, where each hotspot's ring is on screen (the front of
 * the ring, nearest the camera), so browser tests can click it.
 */
function useHotspotPosition(
  group: React.RefObject<Group | null>,
  action: string,
  ring: number,
) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const scratch = useRef(new Vector3())
  useFrame(() => {
    if (!import.meta.env.DEV || !group.current) return
    const centre = group.current.getWorldPosition(scratch.current).clone()
    // Four points round the ring (front, sides, back): the first on screen is clicked.
    const out = [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ].map(([dx, dz]) => {
      const point = centre
        .clone()
        .add(new Vector3(dx * ring * 0.91, 0.02, dz * ring * 0.91))
        .project(camera)
      return { x: ((point.x + 1) / 2) * size.width, y: ((1 - point.y) / 2) * size.height }
    })
    const onScreen = out.find(
      (p) => p.x > 8 && p.y > 8 && p.x < size.width - 8 && p.y < size.height - 8,
    )
    const spots = ((
      window as unknown as { __worksimHotspots?: Record<string, unknown> }
    ).__worksimHotspots ??= {})
    spots[action] = onScreen ?? out[0]
  })
}

// ---------------------------------------------------------------------------
// The room
// ---------------------------------------------------------------------------

/**
 * Floor, back wall and side walls of a room `width` wide and `depth` deep,
 * open towards the camera (at +z). The front edge has a low wall with the
 * shop window, so the room reads as inside a building.
 */
export function Room({
  width,
  depth,
  height = 3.4,
  floor,
  wall,
  side = wall,
  ceiling = '#f5f5f4',
  skirting = '#57534e',
}: {
  width: number
  depth: number
  height?: number
  floor: string
  wall: string
  side?: string
  ceiling?: string
  skirting?: string
}) {
  return (
    <group>
      <Box size={[width, 0.1, depth]} position={[0, -0.05, 0]} color={floor} />
      <Box
        size={[width, height, 0.2]}
        position={[0, height / 2, -depth / 2]}
        color={wall}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          size={[0.2, height, depth]}
          position={[(s * width) / 2, height / 2, 0]}
          color={side}
        />
      ))}
      <Box
        size={[width, 0.1, depth]}
        position={[0, height, 0]}
        color={ceiling}
        emissive={ceiling}
      />
      <Box
        size={[width, 0.14, 0.04]}
        position={[0, 0.07, -depth / 2 + 0.12]}
        color={skirting}
      />
      {/* The front wall (behind the camera as you come in): the door and two windows */}
      <FrontWall width={width} depth={depth} height={height} colour={side} />
    </group>
  )
}

/** The street side of a room: a doorway near the middle, a window either side. */
function FrontWall({
  width,
  depth,
  height,
  colour,
}: {
  width: number
  depth: number
  height: number
  colour: string
}) {
  const z = depth / 2
  const door = 1.3
  // Wall either side of the doorway, and above it.
  const left = width / 2 + 0.6
  const right = width / 2 - 1.9
  return (
    <group>
      <Box
        size={[left, height, 0.2]}
        position={[-width / 2 + left / 2, height / 2, z]}
        color={colour}
      />
      <Box
        size={[right, height, 0.2]}
        position={[width / 2 - right / 2, height / 2, z]}
        color={colour}
      />
      <Box
        size={[door, height - 2.3, 0.2]}
        position={[1.25, 2.3 + (height - 2.3) / 2, z]}
        color={colour}
      />
      <Window
        size={[2.2, 1.5]}
        position={[-width / 4, 1.6, z - 0.12]}
        rotation={Math.PI}
      />
      <Window
        size={[1.6, 1.5]}
        position={[width / 2 - 1.4, 1.6, z - 0.12]}
        rotation={Math.PI}
      />
      {/* The door, open onto the street */}
      <mesh position={[1.25, 1.15, z + 0.05]}>
        <planeGeometry args={[door, 2.3]} />
        <meshBasicMaterial color="#94a3b8" toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A window in a wall: frame, glass lit by the sky (blue by day, dark at night). */
export function Window({
  size,
  position,
  rotation = 0,
}: {
  size: [number, number]
  position: Vector
  rotation?: number
}) {
  const { dark } = useInterior()
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={size} />
        <meshBasicMaterial color={dark ? '#1e293b' : '#cfe8f7'} toneMapped={false} />
      </mesh>
      {/* Frame and glazing bars */}
      <Box
        size={[size[0] + 0.12, 0.08, 0.06]}
        position={[0, size[1] / 2, 0.13]}
        color="#3f3f46"
      />
      <Box
        size={[size[0] + 0.12, 0.08, 0.06]}
        position={[0, -size[1] / 2, 0.13]}
        color="#3f3f46"
      />
      {[-0.5, 0, 0.5].map((f) => (
        <Box
          key={f}
          size={[0.06, size[1], 0.06]}
          position={[f * size[0], 0, 0.13]}
          color="#3f3f46"
        />
      ))}
    </group>
  )
}

/** A pendant or ceiling lamp; with light only on full-quality graphics. */
export function Lamp({
  position,
  colour = '#fde68a',
  intensity = 6,
  shade = '#1f2937',
}: {
  position: Vector
  colour?: string
  intensity?: number
  shade?: string
}) {
  const { low } = useInterior()
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.8, 4]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh>
        <coneGeometry args={[0.28, 0.3, 20, 1, true]} />
        <meshStandardMaterial color={shade} side={2} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color={colour} toneMapped={false} />
      </mesh>
      {!low && (
        <pointLight
          position={[0, -0.3, 0]}
          color={colour}
          intensity={intensity}
          distance={6}
          decay={2}
        />
      )}
    </group>
  )
}

/** A simple chair, facing along its rotation. */
/** The seat's top is 0.485 m up; the sitter faces −z, back to the backrest. */
const CHAIR_SEAT: AnchorSpec[] = [{ kind: 'seat', at: [0, 0.485, 0.07], top: 0.485 }]

export function Chair({
  position,
  rotation = 0,
  colour = '#78350f',
}: {
  position: Vector
  rotation?: number
  colour?: string
}) {
  const ref = useAnchors(CHAIR_SEAT)
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      <Box size={[0.45, 0.05, 0.45]} position={[0, 0.46, 0]} color={colour} />
      <Box size={[0.45, 0.5, 0.05]} position={[0, 0.72, 0.2]} color={colour} />
      {[
        [-0.19, -0.19],
        [0.19, -0.19],
        [-0.19, 0.19],
        [0.19, 0.19],
      ].map(([x, z], i) => (
        <Box key={i} size={[0.04, 0.46, 0.04]} position={[x, 0.23, z]} color="#292524" />
      ))}
    </group>
  )
}

/** Re-draws a few times a second, and at full speed only when something moves. */
export function Ticker({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    invalidate()
    const timer = window.setInterval(() => invalidate(), 1000 / fps)
    return () => window.clearInterval(timer)
  }, [fps, invalidate])
  return null
}
