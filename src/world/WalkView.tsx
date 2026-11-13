/**
 * The page around a walkable 3D view: it takes the keys (see keys.ts) and the
 * mouse (drag to turn the camera, wheel to zoom, or mouse look with the
 * pointer captured until Esc), and shows the "Press E to …" prompt and the
 * progress of what the character is doing. The 3D view is its child.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { controlFor, keyName, keymap, onKeymapChange, type Control } from './keys'
import type { Controls, Prompt } from './PlayerRig'

export interface WalkApi {
  controls: RefObject<Controls>
  onPrompt: (prompt: Prompt | null) => void
  onProgress: (progress: { label: string; progress: number } | null) => void
}

/** One-shot controls (the rest are held). */
const ONCE = new Set<Control>(['interact', 'jump', 'vehicle'])

const VIEW_STORAGE = 'worksim.view.v1'

function readOverhead(): boolean {
  try {
    return window.localStorage.getItem(VIEW_STORAGE) === 'overhead'
  } catch {
    return false
  }
}

/** A finger-sized pad on touch screens: a stick to walk (far out to run), and a Use button. */
function TouchControls({
  controls,
  interact,
}: {
  controls: RefObject<Controls>
  interact: string
}) {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const steer = (clientX: number, clientY: number) => {
    const r = base.current!.getBoundingClientRect()
    const radius = r.width / 2
    let x = (clientX - (r.left + radius)) / radius
    let y = (clientY - (r.top + radius)) / radius
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    setKnob({ x, y })
    const held = controls.current!.held
    for (const c of ['forward', 'back', 'left', 'right', 'run'] as const) held.delete(c)
    if (y < -0.3) held.add('forward')
    if (y > 0.3) held.add('back')
    if (x < -0.3) held.add('left')
    if (x > 0.3) held.add('right')
    if (Math.min(1, len) > 0.92) held.add('run')
  }
  const release = () => {
    setKnob({ x: 0, y: 0 })
    for (const c of ['forward', 'back', 'left', 'right', 'run'] as const)
      controls.current!.held.delete(c)
  }
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex items-end justify-between px-6"
      data-testid="touch-controls"
    >
      <div
        ref={base}
        className="pointer-events-auto relative h-32 w-32 touch-none rounded-full bg-slate-900/40 ring-2 ring-white/40"
        role="group"
        aria-label="Walk: drag the stick"
        onPointerDown={(e) => {
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
          steer(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'touch') steer(e.clientX, e.clientY)
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span
          className="absolute h-14 w-14 rounded-full bg-white/80 shadow"
          style={{
            left: `calc(50% - 1.75rem + ${knob.x * 2.25}rem)`,
            top: `calc(50% - 1.75rem + ${knob.y * 2.25}rem)`,
          }}
        />
      </div>
      <button
        type="button"
        className="pointer-events-auto h-20 w-20 rounded-full bg-amber-500 text-lg font-bold text-white shadow-lg active:bg-amber-600"
        onPointerDown={(e) => {
          e.stopPropagation()
          controls.current!.pressed.push('interact')
        }}
        aria-label={`Use (${interact})`}
      >
        {interact}
      </button>
    </div>
  )
}

export function WalkView({
  label,
  className,
  testId,
  attributes,
  promptClass = 'bottom-3',
  helpClass = 'top-2 left-3',
  children,
}: {
  label: string
  className: string
  testId: string
  attributes?: Record<string, string>
  /** Where the prompt and progress sit (above other controls, if any). */
  promptClass?: string
  /** Where the controls help sits. */
  helpClass?: string
  children: (api: WalkApi) => ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const controls = useRef<Controls>({
    held: new Set(),
    pressed: [],
    dx: 0,
    dy: 0,
    zoom: 0,
  })
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [progress, setProgress] = useState<{ label: string; progress: number } | null>(
    null,
  )
  const [locked, setLocked] = useState(false)
  // Top-down (looking straight down on the floor) or from behind the character.
  const [overhead, setOverhead] = useState(readOverhead)
  useEffect(() => {
    controls.current.overhead = overhead
  }, [overhead])
  // Touch screens get an on-screen stick and Use button.
  const [touch] = useState(
    () =>
      typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches,
  )
  const [keys, setKeys] = useState(keymap)
  useEffect(() => onKeymapChange(() => setKeys(keymap())), [])
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  useEffect(() => {
    const element = box.current
    const change = () => setLocked(document.pointerLockElement === element)
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== element) return
      controls.current.dx += e.movementX
      controls.current.dy += e.movementY
    }
    document.addEventListener('pointerlockchange', change)
    document.addEventListener('mousemove', move)
    return () => {
      document.removeEventListener('pointerlockchange', change)
      document.removeEventListener('mousemove', move)
      if (document.pointerLockElement === element) document.exitPointerLock?.()
    }
  }, [])

  const keyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const c = controlFor(keys, e.code)
      if (!c) return
      e.preventDefault()
      if (ONCE.has(c)) {
        if (!e.repeat) controls.current.pressed.push(c)
      } else controls.current.held.add(c)
    },
    [keys],
  )
  const keyUp = useCallback(
    (e: React.KeyboardEvent) => {
      const c = controlFor(keys, e.code)
      if (c) controls.current.held.delete(c)
    },
    [keys],
  )

  const interact = keyName(keys.interact[0] ?? 'KeyE')
  return (
    <div
      ref={box}
      className={`relative overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${className}`}
      data-testid={testId}
      {...attributes}
      role="application"
      aria-label={label}
      tabIndex={0}
      onKeyDown={keyDown}
      onKeyUp={keyUp}
      onBlur={() => controls.current.held.clear()}
      onPointerDown={(e) => {
        box.current?.focus()
        drag.current = { x: e.clientX, y: e.clientY, moved: false }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || locked || e.buttons === 0) return
        const dx = e.clientX - d.x
        const dy = e.clientY - d.y
        if (!d.moved && Math.hypot(dx, dy) < 4) return
        d.moved = true
        controls.current.dx += dx
        controls.current.dy += dy
        d.x = e.clientX
        d.y = e.clientY
      }}
      onPointerUp={() => (drag.current = null)}
      onWheel={(e) => (controls.current.zoom += e.deltaY)}
      onClickCapture={(e) => {
        // A drag to turn the camera is not a click on what is under the pointer.
        if (drag.current?.moved) e.stopPropagation()
      }}
    >
      {children({ controls, onPrompt: setPrompt, onProgress: setProgress })}

      {progress ? (
        <div
          className={`pointer-events-none absolute inset-x-0 ${promptClass} z-30 flex justify-center`}
          data-testid="activity"
        >
          <div className="w-72 rounded-lg bg-slate-900/85 px-3 py-2 text-white shadow">
            <p className="text-sm font-medium" aria-live="polite">
              {progress.label}
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${Math.round(progress.progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-300">
              Press {interact} or move to stop (nothing is given part way)
            </p>
          </div>
        </div>
      ) : prompt ? (
        <div
          className={`pointer-events-none absolute inset-x-0 ${promptClass} z-30 flex justify-center`}
          data-testid="prompt"
        >
          <p
            className={`rounded-full px-4 py-1.5 text-sm font-medium shadow ${
              prompt.blocked
                ? 'bg-slate-700/90 text-slate-200'
                : 'bg-slate-900/85 text-white'
            }`}
            aria-live="polite"
          >
            {prompt.blocked ? (
              <>
                {prompt.text[0].toUpperCase() + prompt.text.slice(1)}: {prompt.blocked}
              </>
            ) : (
              <>
                Press{' '}
                <kbd className="rounded bg-white/20 px-1.5">{prompt.key ?? interact}</kbd>{' '}
                to {prompt.text}
              </>
            )}
          </p>
        </div>
      ) : null}

      {touch && <TouchControls controls={controls} interact={interact} />}

      <div className="absolute top-2 right-2 flex gap-1">
        <button
          type="button"
          aria-pressed={overhead}
          onClick={() => {
            const next = !overhead
            setOverhead(next)
            try {
              window.localStorage.setItem(VIEW_STORAGE, next ? 'overhead' : 'behind')
            } catch {
              // Storage blocked: the view applies until the page closes.
            }
          }}
          className="rounded bg-slate-900/70 px-2 py-0.5 text-xs text-white hover:bg-slate-900"
        >
          {overhead ? 'View: top-down' : 'View: from behind'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (locked) document.exitPointerLock?.()
            else box.current?.requestPointerLock?.()
          }}
          className="rounded bg-slate-900/70 px-2 py-0.5 text-xs text-white hover:bg-slate-900"
        >
          {locked ? 'Mouse look on (Esc)' : 'Mouse look'}
        </button>
      </div>
      <p
        className={`pointer-events-none absolute ${helpClass} rounded bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-100`}
      >
        WASD move · Shift run · C crouch · Space jump · {interact} use · drag or Q/R to
        look · wheel to zoom
      </p>
    </div>
  )
}
