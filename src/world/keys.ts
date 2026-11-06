/**
 * The controls for walking around in 3D, which the player can change (kept
 * on this device). Crouch is C rather than Ctrl: in a browser, Ctrl with W
 * closes the tab, and that cannot be prevented.
 */
export type Control =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'run'
  | 'crouch'
  | 'jump'
  | 'interact'
  | 'vehicle'
  | 'turnLeft'
  | 'turnRight'
  | 'zoomIn'
  | 'zoomOut'

export const CONTROLS: Array<{ id: Control; name: string }> = [
  { id: 'forward', name: 'Walk forward' },
  { id: 'back', name: 'Walk backward' },
  { id: 'left', name: 'Move left' },
  { id: 'right', name: 'Move right' },
  { id: 'run', name: 'Run (hold)' },
  { id: 'crouch', name: 'Crouch (hold)' },
  { id: 'jump', name: 'Jump' },
  { id: 'interact', name: 'Use, open, talk' },
  { id: 'vehicle', name: 'Get on or off a bike, in or out of a car' },
  { id: 'turnLeft', name: 'Turn the camera left' },
  { id: 'turnRight', name: 'Turn the camera right' },
  { id: 'zoomIn', name: 'Camera closer' },
  { id: 'zoomOut', name: 'Camera further' },
]

/** Keys by `KeyboardEvent.code` (the key's place, whatever the keyboard layout). */
export type Keymap = Record<Control, string[]>

export const DEFAULT_KEYS: Keymap = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA'],
  right: ['KeyD'],
  run: ['ShiftLeft', 'ShiftRight'],
  crouch: ['KeyC', 'ControlLeft'],
  jump: ['Space'],
  interact: ['KeyE', 'Enter'],
  vehicle: ['KeyF'],
  turnLeft: ['ArrowLeft', 'KeyQ'],
  turnRight: ['ArrowRight', 'KeyR'],
  zoomIn: ['Equal', 'NumpadAdd'],
  zoomOut: ['Minus', 'NumpadSubtract'],
}

export const KEYS_STORAGE = 'worksim.keys.v1'

export function readKeymap(): Keymap {
  try {
    const raw =
      typeof window === 'undefined' ? null : window.localStorage.getItem(KEYS_STORAGE)
    if (!raw) return DEFAULT_KEYS
    const saved = JSON.parse(raw) as Partial<Record<Control, unknown>>
    const out = { ...DEFAULT_KEYS }
    for (const c of CONTROLS)
      if (
        Array.isArray(saved[c.id]) &&
        (saved[c.id] as unknown[]).every((k) => typeof k === 'string')
      )
        out[c.id] = saved[c.id] as string[]
    return out
  } catch {
    return DEFAULT_KEYS
  }
}

let cached: Keymap | null = null
const listeners = new Set<() => void>()

/** The keys in use now (read once, then kept up to date). */
export function keymap(): Keymap {
  return (cached ??= readKeymap())
}

export function writeKeymap(map: Keymap): void {
  cached = map
  try {
    window.localStorage.setItem(KEYS_STORAGE, JSON.stringify(map))
  } catch {
    // Storage blocked: the change applies until the page closes.
  }
  for (const listener of listeners) listener()
}

export function onKeymapChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** One control set to a single key (any other control using that key loses it). */
export function withKey(map: Keymap, control: Control, code: string): Keymap {
  const out = { ...map }
  for (const c of CONTROLS) out[c.id] = out[c.id].filter((k) => k !== code)
  out[control] = [code]
  return out
}

/** A key's name for the screen: KeyW → W, ShiftLeft → Shift, ArrowUp → ↑. */
export function keyName(code: string): string {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  const names: Record<string, string> = {
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
    Space: 'Space',
    Enter: 'Enter',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Equal: '+',
    Minus: '−',
    NumpadAdd: '+',
    NumpadSubtract: '−',
  }
  return names[code] ?? code
}

/** Which control a key is, if any. */
export function controlFor(map: Keymap, code: string): Control | null {
  for (const c of CONTROLS) if (map[c.id].includes(code)) return c.id
  return null
}
