/**
 * The look of each kind of place (see SceneLook.tsx): the colours and
 * strengths of its lights, and the bright shapes its reflections show. Kept
 * as data so every view draws its light the same way, and the looks can be
 * compared and tested.
 */

type Vec3 = [number, number, number]

export interface Look {
  /** Sky and ground colours of the soft light from above and below. */
  sky: string
  ground: string
  hemi: number
  /** The main light, casting shadows: the sun, or the room's main lights. */
  key: { position: Vec3; intensity: number; color: string }
  fill: { position: Vec3; intensity: number; color: string }
  /** How bright reflections are, and the shapes they show (ceiling panels, windows). */
  environment: number
  panels: Array<{
    position: Vec3
    rotation?: Vec3
    scale: [number, number, number]
    intensity: number
    color: string
  }>
  /** The camera's exposure (1 is neutral). */
  exposure: number
}

const ceiling = (color: string, intensity: number): Look['panels'][number] => ({
  position: [0, 6, 0],
  rotation: [Math.PI / 2, 0, 0],
  scale: [18, 12, 1],
  intensity,
  color,
})
const windows = (color: string, intensity: number, z = -12): Look['panels'][number] => ({
  position: [0, 2, z],
  rotation: [0, z > 0 ? Math.PI : 0, 0],
  scale: [24, 3, 1],
  intensity,
  color,
})

export const LOOKS = {
  /** Open-plan offices: daylight through the windows, cool-white ceiling panels. */
  office: {
    sky: '#ffffff',
    ground: '#b8a990',
    hemi: 0.85,
    key: { position: [6, 12, 8], intensity: 1.9, color: '#fff8ee' },
    fill: { position: [-8, 6, -4], intensity: 0.35, color: '#cfe3ff' },
    environment: 0.55,
    panels: [
      ceiling('#fff7ed', 2.2),
      windows('#dbeafe', 1.6),
      windows('#ffffff', 0.7, 12),
    ],
    exposure: 1,
  },
  /** A hospital ward: cool, even, clinical light, bright enough to work by. */
  clinical: {
    sky: '#f8fbff',
    ground: '#a8b4bf',
    hemi: 0.95,
    key: { position: [5, 12, 7], intensity: 1.75, color: '#f5f9ff' },
    fill: { position: [-7, 6, -4], intensity: 0.4, color: '#dff3ff' },
    environment: 0.6,
    panels: [
      ceiling('#f2f8ff', 2.5),
      windows('#dbeafe', 1.3),
      windows('#ffffff', 0.7, 12),
    ],
    exposure: 1,
  },
  /** An engineering workshop: high bays, neutral light, a little industrial. */
  workshop: {
    sky: '#f5f5f4',
    ground: '#8b8378',
    hemi: 0.85,
    key: { position: [7, 13, 6], intensity: 1.8, color: '#fffaf0' },
    fill: { position: [-8, 6, -5], intensity: 0.38, color: '#e2e8f0' },
    environment: 0.5,
    panels: [ceiling('#fffbeb', 2.0), windows('#e2e8f0', 1.4)],
    exposure: 1,
  },
  /**
   * A law firm's floor: as bright as an office to work by, but warmer, with
   * the wood of the library, the panelled moot court and the meeting rooms
   * bouncing a little warmth back.
   */
  law: {
    sky: '#fffdf7',
    ground: '#a08868',
    hemi: 0.82,
    key: { position: [6, 12, 8], intensity: 1.8, color: '#fff3e0' },
    fill: { position: [-8, 6, -4], intensity: 0.32, color: '#dbe7ff' },
    environment: 0.52,
    panels: [
      ceiling('#ffefd6', 2.0),
      windows('#dbeafe', 1.5),
      windows('#ffffff', 0.6, 12),
    ],
    exposure: 1,
  },
  /** The courthouse: tall windows, warm wood, a calm and serious light. */
  court: {
    sky: '#fffaf0',
    ground: '#8b7355',
    hemi: 0.75,
    key: { position: [5, 11, -7], intensity: 1.55, color: '#fff1d6' },
    fill: { position: [-6, 5, 6], intensity: 0.3, color: '#dbe7ff' },
    environment: 0.5,
    panels: [ceiling('#ffeccc', 1.6), windows('#e0ecff', 1.8)],
    exposure: 0.98,
  },
  /** The flat in the morning: daylight from the windows. */
  'home-morning': {
    sky: '#ffffff',
    ground: '#8a7a68',
    hemi: 0.95,
    key: { position: [6, 10, 6], intensity: 1.7, color: '#fff8ee' },
    fill: { position: [-6, 5, -3], intensity: 0.3, color: '#dbeafe' },
    environment: 0.5,
    panels: [windows('#e0f2fe', 1.8, 10), ceiling('#ffffff', 0.8)],
    exposure: 1,
  },
  /** The flat in the evening: warm lamps, dusk at the windows. */
  'home-evening': {
    sky: '#ffe7c2',
    ground: '#6b5a48',
    hemi: 0.62,
    key: { position: [-5, 7, 4], intensity: 1.05, color: '#ffcf99' },
    fill: { position: [6, 4, -4], intensity: 0.25, color: '#93a7d8' },
    environment: 0.42,
    panels: [ceiling('#ffd9a8', 1.3), windows('#3b4a7a', 0.6, 10)],
    exposure: 0.96,
  },
  /** The café: warm pendant lights and the street through the glass. */
  cafe: {
    sky: '#fff2df',
    ground: '#7c5a3c',
    hemi: 0.72,
    key: { position: [-4, 8, 5], intensity: 1.25, color: '#ffd8a8' },
    fill: { position: [5, 4, -5], intensity: 0.3, color: '#dbeafe' },
    environment: 0.5,
    panels: [ceiling('#ffdcae', 1.6), windows('#e0f2fe', 1.4, 8)],
    exposure: 1,
  },
  /** Shops, the gym, the bike shop, offices to let: bright, even light. */
  bright: {
    sky: '#ffffff',
    ground: '#9ca3af',
    hemi: 0.9,
    key: { position: [4, 10, 6], intensity: 1.55, color: '#ffffff' },
    fill: { position: [-6, 5, -4], intensity: 0.35, color: '#e0f2fe' },
    environment: 0.55,
    panels: [ceiling('#ffffff', 2.2), windows('#e0f2fe', 1.2, 8)],
    exposure: 1,
  },
  /** The street and the park by day. */
  'street-day': {
    sky: '#ffffff',
    ground: '#6b705c',
    hemi: 1.0,
    key: { position: [30, 40, 20], intensity: 1.6, color: '#fff8ee' },
    fill: { position: [-20, 10, -10], intensity: 0.3, color: '#cfe3ff' },
    environment: 0.45,
    panels: [ceiling('#e0f2fe', 1.2)],
    exposure: 1,
  },
  /** The street in the early evening: a low, golden sun. */
  'street-evening': {
    sky: '#ffe9d2',
    ground: '#6f6a5c',
    hemi: 1.0,
    key: { position: [-30, 22, 14], intensity: 1.75, color: '#ffcf9e' },
    fill: { position: [20, 10, -10], intensity: 0.28, color: '#a5b4fc' },
    environment: 0.4,
    panels: [ceiling('#ffd7ae', 1.0)],
    exposure: 1,
  },
  /** The street after dark: moonlight, and the light of the lamps and windows. */
  'street-night': {
    sky: '#c7d2fe',
    ground: '#334155',
    hemi: 0.42,
    key: { position: [-20, 30, 10], intensity: 0.28, color: '#c7d2fe' },
    fill: { position: [20, 10, -10], intensity: 0.15, color: '#fde68a' },
    environment: 0.25,
    panels: [ceiling('#475569', 0.6)],
    exposure: 1.05,
  },
} satisfies Record<string, Look>

export type LookId = keyof typeof LOOKS
