/**
 * Where everything sits on the bench (SVG units, a 1200 × 760 canvas): the
 * computer's views (a laptop's left and right sides and its lid, or a
 * tower's rear and front), the dock, the monitor and the wall plate, each
 * port's position and size, and the cable tray. Pure data: the drawing and
 * the rules (deployment.ts) use the same port IDs.
 */
import type { Plug } from '../deployment'

export const W = 1200
export const H = 790
export const TRAY_Y = 540

export type View = 'left' | 'right' | 'top' | 'rear' | 'front'

export const VIEW_NAMES: Record<View, string> = {
  left: 'Left side',
  right: 'Right side',
  top: 'Lid open',
  rear: 'Rear panel',
  front: 'Front panel',
}

export interface PortSpot {
  /** The view the port is drawn in (null: a station that is always shown). */
  view: View | null
  x: number
  y: number
  /** Drawn width and height of the socket. */
  w: number
  h: number
}

const P = (plug: Plug): { w: number; h: number } =>
  ({
    iec: { w: 34, h: 26 },
    rj45: { w: 30, h: 26 },
    dp: { w: 32, h: 14 },
    hdmi: { w: 34, h: 13 },
    usba: { w: 28, h: 11 },
    usbc: { w: 22, h: 9 },
    barrel: { w: 16, h: 16 },
    audio: { w: 12, h: 12 },
  })[plug]

/** The plug of each port, for its socket's size. */
const PLUGS: Record<string, Plug> = {
  'lap-usbc1': 'usbc',
  'lap-usbc2': 'usbc',
  'lap-hdmi': 'hdmi',
  'lap-usb1': 'usba',
  'lap-audio': 'audio',
  'dock-power': 'barrel',
  'dock-lan': 'rj45',
  'dock-dp1': 'dp',
  'dock-dp2': 'dp',
  'dock-usb1': 'usba',
  'dock-usb2': 'usba',
  'dock-usb3': 'usba',
  'pc-power': 'iec',
  'pc-lan': 'rj45',
  'pc-dp': 'dp',
  'pc-hdmi': 'hdmi',
  'pc-usb1': 'usba',
  'pc-usb2': 'usba',
  'pc-usb3': 'usba',
  'pc-usb4': 'usba',
  'pc-usbc': 'usbc',
  'pc-audio': 'audio',
  'pc-fusb1': 'usba',
  'pc-fusb2': 'usba',
  'mon-power': 'iec',
  'mon-dp': 'dp',
  'mon-hdmi': 'hdmi',
  'wall-data': 'rj45',
  'wall-voice': 'rj45',
}

const at = (id: string, view: View | null, x: number, y: number): [string, PortSpot] => [
  id,
  { view, x, y, ...P(PLUGS[id]) },
]

/** Stations that are always on the bench. */
export const STATIONS = {
  dock: { x: 760, y: 40, w: 400, h: 120 },
  monitor: { x: 760, y: 190, w: 400, h: 200 },
  wall: { x: 760, y: 410, w: 400, h: 100 },
  /** The computer's own area (left half). */
  computer: { x: 30, y: 40, w: 690, h: 470 },
}

export const LAPTOP_SPOTS: Record<string, PortSpot> = Object.fromEntries([
  at('lap-usbc1', 'left', 190, 280),
  at('lap-usbc2', 'left', 250, 280),
  at('lap-hdmi', 'left', 340, 280),
  at('lap-usb1', 'right', 330, 280),
  at('lap-audio', 'right', 420, 280),
  at('dock-power', null, 800, 110),
  at('dock-lan', null, 860, 110),
  at('dock-dp1', null, 925, 110),
  at('dock-dp2', null, 980, 110),
  at('dock-usb1', null, 1040, 110),
  at('dock-usb2', null, 1080, 110),
  at('dock-usb3', null, 1120, 110),
  at('mon-power', null, 860, 340),
  at('mon-dp', null, 960, 340),
  at('mon-hdmi', null, 1040, 340),
  at('wall-data', null, 900, 465),
  at('wall-voice', null, 1020, 465),
])

export const DESKTOP_SPOTS: Record<string, PortSpot> = Object.fromEntries([
  at('pc-power', 'rear', 375, 110),
  at('pc-usb1', 'rear', 340, 215),
  at('pc-usb2', 'rear', 340, 240),
  at('pc-usb3', 'rear', 410, 215),
  at('pc-usb4', 'rear', 410, 240),
  at('pc-lan', 'rear', 375, 280),
  at('pc-dp', 'rear', 340, 320),
  at('pc-hdmi', 'rear', 410, 320),
  at('pc-usbc', 'rear', 340, 355),
  at('pc-audio', 'rear', 410, 355),
  at('pc-fusb1', 'front', 345, 150),
  at('pc-fusb2', 'front', 405, 150),
  at('mon-power', null, 860, 340),
  at('mon-dp', null, 960, 340),
  at('mon-hdmi', null, 1040, 340),
  at('wall-data', null, 900, 465),
  at('wall-voice', null, 1020, 465),
])

export const VIEWS: Record<'laptop' | 'desktop', View[]> = {
  laptop: ['left', 'right', 'top'],
  desktop: ['rear', 'front'],
}

export const spotsFor = (device: 'laptop' | 'desktop') =>
  device === 'laptop' ? LAPTOP_SPOTS : DESKTOP_SPOTS

/** Where a cable waits in the tray (its connector's centre). */
export function traySpot(index: number, count: number): { x: number; y: number } {
  const perRow = Math.min(count, 6)
  const row = Math.floor(index / perRow)
  const col = index % perRow
  const cell = (W - 60) / perRow
  return { x: 30 + cell * col + cell / 2, y: TRAY_Y + 70 + row * 100 }
}
