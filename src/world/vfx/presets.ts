/**
 * How each visual effect behaves: how many particles, how fast they appear,
 * how long they live, how they move, and how they look. One emitter
 * (Particles.tsx) plays any of them, so every place shares the same system.
 */
import type { VfxKind } from '../interaction/activity'

export interface Preset {
  /** Most particles alive at once (full and low graphics). */
  max: number
  low: number
  /** New particles a second. */
  rate: number
  /** Seconds each lives (a range). */
  life: [number, number]
  /** Starting spread around the origin (x/z radius, y). */
  spread: [number, number]
  /** Starting velocity: up/down, and sideways spread. */
  vy: [number, number]
  vxz: number
  gravity: number
  /** Size at birth and at death (metres), and stretch along the motion. */
  size: [number, number]
  stretch: number
  colour: string
  /** Glowing (added light: steam, sparks) or solid (water drops). */
  additive: boolean
  /** Particles stop at the floor (y = 0) instead of falling through. */
  floor: boolean
}

export const PRESETS: Record<VfxKind, Preset> = {
  shower: {
    max: 280,
    low: 90,
    rate: 420,
    life: [0.32, 0.45],
    spread: [0.09, 0.02],
    vy: [-4.6, -3.8],
    vxz: 0.45,
    gravity: 9.8,
    size: [0.014, 0.012],
    stretch: 3.5,
    colour: '#dbeafe',
    additive: false,
    floor: true,
  },
  tap: {
    max: 70,
    low: 30,
    rate: 160,
    life: [0.22, 0.3],
    spread: [0.012, 0],
    vy: [-1.4, -1.2],
    vxz: 0.04,
    gravity: 9.8,
    size: [0.012, 0.01],
    stretch: 3,
    colour: '#e0f2fe',
    additive: false,
    floor: false,
  },
  splash: {
    max: 120,
    low: 40,
    rate: 160,
    life: [0.25, 0.5],
    spread: [0.25, 0.02],
    vy: [0.6, 1.6],
    vxz: 0.9,
    gravity: 9.8,
    size: [0.012, 0.006],
    stretch: 1,
    colour: '#bfdbfe',
    additive: false,
    floor: true,
  },
  steam: {
    max: 26,
    low: 10,
    rate: 6,
    life: [1.6, 2.4],
    spread: [0.03, 0.01],
    vy: [0.18, 0.3],
    vxz: 0.05,
    gravity: -0.03,
    size: [0.012, 0.07],
    stretch: 1,
    colour: '#3f3f46',
    additive: true,
    floor: false,
  },
  sizzle: {
    max: 40,
    low: 14,
    rate: 26,
    life: [0.15, 0.35],
    spread: [0.12, 0.01],
    vy: [0.6, 1.4],
    vxz: 0.4,
    gravity: 6,
    size: [0.008, 0.003],
    stretch: 1,
    colour: '#fbbf24',
    additive: true,
    floor: false,
  },
  sweat: {
    max: 16,
    low: 6,
    rate: 2.5,
    life: [0.5, 0.8],
    spread: [0.08, 0.04],
    vy: [-0.2, 0],
    vxz: 0.05,
    gravity: 6,
    size: [0.008, 0.006],
    stretch: 1.6,
    colour: '#e0f2fe',
    additive: false,
    floor: false,
  },
  bubbles: {
    max: 40,
    low: 14,
    rate: 12,
    life: [0.8, 1.6],
    spread: [0.12, 0.02],
    vy: [0.04, 0.12],
    vxz: 0.03,
    gravity: -0.02,
    size: [0.012, 0.03],
    stretch: 1,
    colour: '#f8fafc',
    additive: false,
    floor: false,
  },
  breath: {
    max: 14,
    low: 4,
    rate: 1.4,
    life: [0.9, 1.3],
    spread: [0.02, 0.01],
    vy: [0.02, 0.08],
    vxz: 0.12,
    gravity: -0.03,
    size: [0.02, 0.09],
    stretch: 1,
    colour: '#334155',
    additive: true,
    floor: false,
  },
  dust: {
    max: 30,
    low: 10,
    rate: 20,
    life: [0.6, 1],
    spread: [0.15, 0.02],
    vy: [0.1, 0.35],
    vxz: 0.25,
    gravity: 0.2,
    size: [0.03, 0.09],
    stretch: 1,
    colour: '#a8a29e',
    additive: false,
    floor: true,
  },
  exhaust: {
    max: 30,
    low: 10,
    rate: 7,
    life: [1.2, 1.8],
    spread: [0.04, 0.01],
    vy: [0.1, 0.25],
    vxz: 0.12,
    gravity: -0.05,
    size: [0.05, 0.22],
    stretch: 1,
    colour: '#9ca3af',
    additive: false,
    floor: false,
  },
}
