/**
 * Ward equipment that works: a patient monitor whose screen draws a live
 * ECG trace with the heart rate and oxygen saturation (and beeps with the
 * beat, from where it stands, while someone is in the bed), and a drip stand
 * with its bag and line.
 */
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { SoundSource } from '../../audio/SoundSource'
import { prefersReducedMotion } from '../../ui/motion'
import { Box } from './parts'

const STILL = prefersReducedMotion()

/** One heartbeat of an ECG trace, 0–1 across, as a height (P wave, QRS spike, T wave). */
function ecg(t: number): number {
  const bump = (c: number, w: number, h: number) =>
    h * Math.exp(-((t - c) ** 2) / (2 * w * w))
  return (
    bump(0.18, 0.03, 0.12) -
    bump(0.36, 0.008, 0.18) +
    bump(0.4, 0.012, 1) -
    bump(0.44, 0.01, 0.3) +
    bump(0.66, 0.05, 0.25)
  )
}

interface Screen {
  canvas: HTMLCanvasElement
  texture: CanvasTexture
}

/** A monitor's screen: a small canvas shown as a texture. */
function makeScreen(): Screen {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 96
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return { canvas, texture }
}

/** Draws the trace and the readings at time `t` (seconds). */
function drawTrace(screen: Screen, t: number, rate: number, live: boolean) {
  const g = screen.canvas.getContext('2d')
  if (!g) return
  g.fillStyle = '#04110a'
  g.fillRect(0, 0, 128, 96)
  g.strokeStyle = '#123524'
  g.lineWidth = 1
  for (let gx = 0; gx < 128; gx += 16) {
    g.beginPath()
    g.moveTo(gx, 0)
    g.lineTo(gx, 60)
    g.stroke()
  }
  g.strokeStyle = live ? '#4ade80' : '#3f6b52'
  g.lineWidth = 2
  g.beginPath()
  const beat = 60 / rate
  for (let px = 0; px < 128; px++) {
    const time = t - (128 - px) * 0.02
    const phase = (((time % beat) + beat) % beat) / beat
    const yv = 36 - (live ? ecg(phase) * 26 : 0)
    if (px === 0) g.moveTo(px, yv)
    else g.lineTo(px, yv)
  }
  g.stroke()
  g.fillStyle = live ? '#4ade80' : '#3f6b52'
  g.font = 'bold 18px monospace'
  g.fillText(live ? `HR ${rate}` : 'HR --', 4, 84)
  g.fillStyle = live ? '#38bdf8' : '#335566'
  g.fillText(live ? 'SpO2 97' : 'SpO2 --', 62, 84)
  screen.texture.needsUpdate = true
}

export function PatientMonitor({
  x,
  y,
  z,
  rotation = 0,
  rate = 78,
  live = true,
}: {
  x: number
  y: number
  z: number
  rotation?: number
  /** Beats a minute. */
  rate?: number
  /** A patient is connected (otherwise the screen shows a flat standby). */
  live?: boolean
}) {
  const [screen] = useState(makeScreen)
  useEffect(() => () => screen.texture.dispose(), [screen])
  // Each monitor's trace starts at its own point in the beat.
  const t = useRef((Math.abs(x * 13 + z * 7) % 10) / 3)
  const last = useRef(-1)
  useFrame((_, dt) => {
    if (!STILL) t.current += dt
    // Redrawn ten times a second: enough for a trace, cheap for several monitors.
    const frame = Math.floor(t.current * 10)
    if (frame === last.current) return
    last.current = frame
    drawTrace(screen, t.current, rate, live)
  })
  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]}>
      <Box size={[0.34, 0.26, 0.08]} position={[0, 0, 0]} color="#1e293b" />
      <mesh position={[0, 0.01, -0.0405]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.29, 0.2]} />
        <meshBasicMaterial map={screen.texture} toneMapped={false} />
      </mesh>
      {/* The alarm light on top: green while all is well. */}
      <Box
        size={[0.05, 0.02, 0.03]}
        position={[0.12, 0.14, 0]}
        color="#16a34a"
        emissive="#22c55e"
      />
      {live && <SoundSource x={x} z={z} id="beep" every={60 / rate} range={6} />}
    </group>
  )
}

export function DripStand({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[
        0,
        (Math.PI * 2) / 5,
        (Math.PI * 4) / 5,
        (Math.PI * 6) / 5,
        (Math.PI * 8) / 5,
      ].map((a) => (
        <Box
          key={a}
          size={[0.26, 0.02, 0.02]}
          position={[Math.cos(a) * 0.13, 0.03, Math.sin(a) * 0.13]}
          color="#64748b"
        />
      ))}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.85, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
      <Box size={[0.24, 0.015, 0.015]} position={[0, 1.86, 0]} color="#cbd5e1" />
      {/* The bag of fluid, and its line down to the patient */}
      <Box
        size={[0.11, 0.17, 0.04]}
        position={[0.09, 1.72, 0]}
        color="#e0f2fe"
        opacity={0.7}
        radius={0.02}
      />
      <mesh position={[0.09, 1.3, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.7, 4]} />
        <meshStandardMaterial color="#f1f5f9" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}
