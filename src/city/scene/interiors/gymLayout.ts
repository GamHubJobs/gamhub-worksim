/**
 * Forge Fitness: what is solid (walls and equipment) and what the player can
 * do, where. Each piece of equipment is a workout (the day pass); the studio
 * is the class; the shower cubicle is a shower. Coordinates match Gym.tsx.
 */
import type { Box } from '../../../world/character/controller'
import type { Activity } from '../../../world/interaction/activity'

const W = 7
const D = 5
const box = (x: number, z: number, hx: number, hz: number, top = 1.2): Box => ({
  x,
  z,
  hx,
  hz,
  top,
})

export const GYM_SIZE = { width: 2 * W, depth: 2 * D, height: 3.4 }

/** Where the player comes in (the door, front left), facing in. */
export const GYM_START = { x: 0.6, z: 3.6, heading: 0 }

export const GYM_BOXES: Box[] = [
  // Walls (front, back, sides).
  box(0, -D - 0.1, W, 0.15, 3.4),
  box(0, D + 0.1, W, 0.15, 3.4),
  box(-W - 0.1, 0, 0.15, D, 3.4),
  box(W + 0.1, 0, 0.15, D, 3.4),
  // Treadmills and bikes along the mirror.
  box(-5, -2.8, 0.42, 0.95),
  box(-3.8, -2.8, 0.42, 0.95),
  box(-2.6, -2.8, 0.42, 0.95),
  box(-1.2, -3, 0.2, 0.6),
  box(-0.2, -3, 0.2, 0.6),
  // The dumbbell rack and the benches.
  box(1.2, -0.4, 1.5, 0.35),
  box(1.4, 1.2, 0.22, 0.65, 0.55),
  box(-2.5, 0.8, 0.3, 0.7, 0.55),
  // Reception, lockers, the water station and the shower cubicle's sides.
  box(-5, 2.8, 1.05, 0.4),
  box(6.75, 2, 0.25, 1.8, 1.9),
  box(2.6, 4.4, 0.25, 0.2),
  box(5.3, 3.55, 0.65, 0.04, 2.1),
  box(4.62, 4.25, 0.04, 0.7, 2.1),
]

// Sounds: a clank as the bar or dumbbells move, breathing in hard sets.
export const GYM_ACTIVITIES: Activity[] = [
  {
    id: 'bench',
    action: 'gym-workout',
    prompt: 'use the bench press',
    spot: { x: 2.2, z: 1.2, reach: 1.1 },
    anchor: { x: 1.4, z: 1.3, heading: Math.PI },
    stages: [
      { clip: 'sit', seconds: 1.4, label: 'Sitting on the bench' },
      { clip: 'bench-lie', seconds: 1.6, label: 'Lying back and gripping the bar' },
      { clip: 'bench-press', seconds: 14, label: 'Bench press: 5 reps' },
      { clip: 'bench-lie', seconds: 1.4, label: 'Racking the bar' },
      { clip: 'sit', seconds: 1.4, label: 'Sitting up' },
    ],
    sounds: [
      { at: 3.1, id: 'clank' },
      { at: 4.5, id: 'breath', every: 2.8, until: 16.5 },
      { at: 17.2, id: 'clank' },
    ],
    effects: [{ kind: 'sweat', from: 8, to: 19.5, at: [1.4, 0.75, 0.78] }],
    object: 'barbell',
  },
  {
    id: 'curls',
    action: 'gym-workout',
    prompt: 'do dumbbell curls',
    spot: { x: 1.2, z: 0.5, reach: 0.9 },
    anchor: { x: 0.6, z: 0.15, heading: 0 },
    stages: [
      { clip: 'reach', seconds: 1.2, label: 'Picking up the dumbbells' },
      {
        clip: 'curl',
        seconds: 13.2,
        label: 'Dumbbell curls: 6 each arm',
        hold: { left: 'dumbbell', right: 'dumbbell' },
      },
      { clip: 'reach', seconds: 1.2, label: 'Putting them back' },
    ],
    sounds: [
      { at: 1.2, id: 'clank' },
      { at: 2.4, id: 'breath', every: 2.2, until: 14 },
      { at: 15.6, id: 'clank' },
    ],
    effects: [{ kind: 'sweat', from: 7, to: 15, at: [0.6, 1.62, 0.15] }],
    object: 'dumbbells',
  },
  {
    id: 'squats',
    action: 'gym-workout',
    prompt: 'do squats',
    spot: { x: -0.9, z: 2.2, reach: 0.9 },
    anchor: { x: -0.9, z: 2.2, heading: 0 },
    stages: [{ clip: 'squat', seconds: 13, label: 'Squats: 5' }],
    sounds: [{ at: 1.3, id: 'breath', every: 2.6 }],
    effects: [{ kind: 'sweat', from: 6, to: 13, at: [-0.9, 1.3, 2.2] }],
  },
  {
    id: 'treadmill',
    action: 'gym-workout',
    prompt: 'run on the treadmill',
    spot: { x: -3.8, z: -1.5, reach: 0.9 },
    anchor: { x: -3.8, z: -2.6, heading: 0, y: 0.2 },
    stages: [
      { clip: 'stand', seconds: 1.2, label: 'Starting the treadmill' },
      { clip: 'run-in-place', seconds: 14, label: 'Running: 2 km at 10 km/h' },
      { clip: 'stand', seconds: 1.6, label: 'Slowing down' },
    ],
    sounds: [
      { at: 0.3, id: 'beep' },
      { at: 1.3, id: 'step', every: 0.33, until: 15.1 },
      { at: 6, id: 'breath', every: 2, until: 15 },
      { at: 15.3, id: 'beep' },
    ],
    effects: [{ kind: 'sweat', from: 7, to: 16, at: [-3.8, 1.85, -2.6] }],
    object: 'treadmill',
  },
  {
    id: 'bike',
    action: 'gym-workout',
    prompt: 'ride the exercise bike',
    spot: { x: -0.2, z: -1.8, reach: 0.8 },
    anchor: { x: -0.2, z: -2.75, heading: 0 },
    stages: [
      { clip: 'sit', seconds: 1, label: 'Getting on' },
      { clip: 'cycle', seconds: 14, label: 'Cycling: 5 km' },
      { clip: 'sit', seconds: 1, label: 'Getting off' },
    ],
    sounds: [{ at: 4, id: 'breath', every: 2.5, until: 15 }],
    effects: [{ kind: 'sweat', from: 7, to: 15, at: [-0.2, 1.75, -2.6] }],
    object: 'bike',
  },
  {
    id: 'class',
    action: 'gym-class',
    prompt: 'join the class in the studio',
    spot: { x: 4.7, z: -0.3, reach: 1.4 },
    anchor: { x: 4.7, z: -1.6, heading: 0 },
    stages: [
      { clip: 'stretch', seconds: 6, label: 'Warming up' },
      { clip: 'yoga', seconds: 8, label: 'Mobility' },
      { clip: 'squat', seconds: 7.8, label: 'Squats with the class' },
      { clip: 'stretch', seconds: 4, label: 'Cooling down' },
    ],
    sounds: [{ at: 14.5, id: 'breath', every: 2.6, until: 22 }],
    effects: [{ kind: 'sweat', from: 15, to: 24, at: [4.7, 1.3, -1.6] }],
  },
  {
    id: 'shower',
    action: 'gym-shower',
    prompt: 'have a shower',
    spot: { x: 4.1, z: 4.1, reach: 0.9 },
    anchor: { x: 5.3, z: 4.25, heading: Math.PI / 2 },
    stages: [
      { clip: 'push-door', seconds: 1, label: 'Turning on the water' },
      { clip: 'shower', seconds: 12, label: 'Showering' },
      { clip: 'dress', seconds: 2, label: 'Drying off' },
    ],
    sounds: [{ at: 1, id: 'water', every: 1, until: 12.6 }],
    effects: [
      { kind: 'shower', from: 1, to: 13, at: [5.3, 2.25, 4.25] },
      { kind: 'splash', from: 1.3, to: 13.3, at: [5.3, 0.02, 4.25] },
      { kind: 'steam', from: 3, to: 14, at: [5.3, 1.9, 4.25] },
    ],
  },
]
