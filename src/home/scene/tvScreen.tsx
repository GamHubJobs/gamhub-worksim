/**
 * The television's screen: dark until someone watches it (a series or games),
 * then on, showing a programme that moves (scenes that cut every few
 * seconds, people in them, the channel's mark in the corner), lighting the
 * room a little, and with the sound coming from the set.
 */
import { useFrame } from '@react-three/fiber'
import { useContext, useRef, useState } from 'react'
import { CanvasTexture, Vector3, type Mesh, type PointLight } from 'three'
import { playFrom } from '../../audio/playFrom'
import { World } from '../../world/context'

/** What switches the set on, and how far into it (past sitting down). */
const WATCHING: Record<string, number> = { series: 1.0, games: 1.0 }

/** The scenes of the programme: sky, ground and the colour of the light. */
const SCENES = [
  { sky: ['#0ea5e9', '#bae6fd'], ground: '#4d7c0f', light: '#93c5fd' },
  { sky: ['#7c2d12', '#fdba74'], ground: '#57534e', light: '#fdba74' },
  { sky: ['#1e1b4b', '#4338ca'], ground: '#1f2937', light: '#818cf8' },
  { sky: ['#f5f5f4', '#e7e5e4'], ground: '#a8a29e', light: '#f5f5f4' },
]

function makeScreen() {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 90
  const texture = new CanvasTexture(canvas)
  return { canvas, texture }
}

/** One picture of the programme at time t (seconds). */
function drawProgramme(
  screen: { canvas: HTMLCanvasElement; texture: CanvasTexture },
  t: number,
  games: boolean,
) {
  const { canvas } = screen
  screen.texture.needsUpdate = true
  const g = canvas.getContext('2d')
  if (!g) return
  const { width: w, height: h } = canvas
  if (games) {
    // A racing game: the road rushing towards the viewer, a car, the lap counter.
    g.fillStyle = '#0f172a'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#16a34a'
    g.fillRect(0, h * 0.45, w, h)
    g.fillStyle = '#334155'
    g.beginPath()
    g.moveTo(w * 0.45, h * 0.45)
    g.lineTo(w * 0.55, h * 0.45)
    g.lineTo(w * 0.95, h)
    g.lineTo(w * 0.05, h)
    g.fill()
    g.fillStyle = '#f8fafc'
    for (let i = 0; i < 6; i++) {
      const p = (i / 6 + t * 0.8) % 1
      const y = h * 0.45 + p * p * h * 0.55
      g.fillRect(w / 2 - 1 - p * 2, y, 2 + p * 4, 2 + p * 6)
    }
    const sway = Math.sin(t * 1.7) * w * 0.12
    g.fillStyle = '#dc2626'
    g.fillRect(w / 2 - 14 + sway, h * 0.74, 28, 12)
    g.fillStyle = '#facc15'
    g.font = 'bold 10px sans-serif'
    g.fillText(`LAP ${1 + (Math.floor(t / 20) % 3)}/3`, 6, 12)
    return
  }
  const scene = SCENES[Math.floor(t / 6) % SCENES.length]
  const sky = g.createLinearGradient(0, 0, 0, h * 0.6)
  sky.addColorStop(0, scene.sky[0])
  sky.addColorStop(1, scene.sky[1])
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  g.fillStyle = scene.ground
  g.fillRect(0, h * 0.62, w, h)
  // Two people talking, drifting a little as the camera moves.
  const pan = Math.sin(t * 0.4) * 10
  for (const [x, c] of [
    [0.36, '#b45309'],
    [0.62, '#1d4ed8'],
  ] as const) {
    const px = w * x + pan
    const bob = Math.sin(t * 3 + x * 10) * 1.2
    g.fillStyle = c
    g.fillRect(px - 7, h * 0.42 + bob, 14, 24)
    g.fillStyle = '#f2c9a0'
    g.beginPath()
    g.arc(px, h * 0.36 + bob, 6, 0, Math.PI * 2)
    g.fill()
  }
  // Subtitles, and the channel's mark.
  g.fillStyle = 'rgba(0,0,0,0.55)'
  g.fillRect(w * 0.15, h * 0.82, w * 0.7, 11)
  g.fillStyle = '#f8fafc'
  g.font = '8px sans-serif'
  g.fillText(
    Math.floor(t / 3) % 2
      ? '“Where were you last night?”'
      : '“It’s not what it looks like.”',
    w * 0.18,
    h * 0.82 + 8,
  )
  g.fillStyle = 'rgba(255,255,255,0.8)'
  g.font = 'bold 8px sans-serif'
  g.fillText('WS1', w - 22, 10)
}

const AT = new Vector3()

/** The screen of the set, at its place on the model (size w × h). */
export function TvScreen({ w, h, y, z }: { w: number; h: number; y: number; z: number }) {
  const world = useContext(World)
  const [picture] = useState(makeScreen)
  const screen = useRef<Mesh>(null)
  const glow = useRef<PointLight>(null)
  const state = useRef({ on: false, t: 0, drawn: -1, sound: 1 })
  useFrame((_, dt) => {
    const now = world?.now.current
    const start = now?.id ? WATCHING[now.id] : undefined
    const on = start !== undefined && now!.t >= start
    const s = state.current
    const mat = screen.current?.material as
      { emissiveIntensity: number; color: { set: (c: string) => void } } | undefined
    if (on !== s.on) {
      s.on = on
      if (mat) {
        mat.emissiveIntensity = on ? 0.9 : 0
        mat.color.set(on ? '#000000' : '#0b0f17')
      }
      if (glow.current) glow.current.intensity = on ? 0.6 : 0
      if (on && screen.current) {
        screen.current.getWorldPosition(AT)
        playFrom('click', AT.x, AT.z, 8)
      }
    }
    if (!on) return
    s.t += Math.min(dt, 0.5)
    // Redrawn a few times a second (it is a small picture).
    const frame = Math.floor(s.t * 6)
    if (frame !== s.drawn) {
      s.drawn = frame
      drawProgramme(picture, s.t, now!.id === 'games')
      if (glow.current) glow.current.intensity = 0.45 + Math.sin(s.t * 5) * 0.15
    }
    // The programme's sound, from the set.
    s.sound -= dt
    if (s.sound <= 0 && screen.current) {
      s.sound = 2.2 + Math.random()
      screen.current.getWorldPosition(AT)
      playFrom('tv', AT.x, AT.z, 10)
    }
  })
  return (
    <group position={[0, y, z]}>
      <mesh ref={screen}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color="#0b0f17"
          map={picture.texture}
          emissive="#ffffff"
          emissiveMap={picture.texture}
          emissiveIntensity={0}
          roughness={0.25}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={glow}
        position={[0, 0, 0.6]}
        intensity={0}
        distance={4}
        color="#bfdbfe"
      />
    </group>
  )
}
