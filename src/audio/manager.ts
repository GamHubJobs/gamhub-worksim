/**
 * The one place sound goes through. Everything in WorkSim's sound is made in
 * the browser with Web Audio (see engine.ts): no recordings to licence or
 * download, so it works offline and adds nothing to the start-up.
 *
 * This file is small and loads with the app; the engine loads only after the
 * player's first click or key press (browsers allow sound only then), and
 * only if some sound is turned on. Until then, and wherever Web Audio is
 * missing or fails, every call does nothing: the game is fully playable
 * without sound.
 */
import { prefersReducedMotion } from '../ui/motion'
import { sceneKey, type Scene } from './scenes'
import {
  levelOf,
  readAudioSettings,
  writeAudioSettings,
  type AudioSettings,
  type CategoryId,
} from './settings'

/** Sounds the game asks for, and their kind. */
export const EFFECTS = {
  click: 'effects',
  open: 'effects',
  close: 'effects',
  mail: 'effects',
  task: 'effects',
  success: 'effects',
  fail: 'effects',
  achievement: 'effects',
  promotion: 'effects',
  pay: 'effects',
  unlock: 'effects',
  offer: 'effects',
  decline: 'effects',
  notify: 'effects',
  warn: 'effects',
  error: 'effects',
  phone: 'effects',
  door: 'character',
  sit: 'character',
  stand: 'character',
  type: 'character',
  step: 'character',
  greet: 'voices',
} as const satisfies Record<string, CategoryId>

export type EffectId = keyof typeof EFFECTS
export type Surface = 'pavement' | 'road' | 'grass' | 'carpet' | 'wood' | 'tile'

/** Shortest gap between two of the same sound, so nothing stutters or spams. */
export const MIN_GAP: Record<EffectId, number> = {
  click: 60,
  open: 150,
  close: 150,
  mail: 1500,
  task: 1500,
  success: 1200,
  fail: 1200,
  achievement: 2500,
  promotion: 4000,
  pay: 2500,
  unlock: 1500,
  offer: 2000,
  decline: 1000,
  notify: 1500,
  warn: 1500,
  error: 600,
  phone: 2500,
  door: 500,
  sit: 600,
  stand: 600,
  type: 45,
  step: 150,
  greet: 2500,
}

/** What a caption says for the sounds that carry news (for players without sound). */
export const CAPTIONS: Partial<Record<EffectId, string>> = {
  mail: 'New email',
  task: 'Task complete',
  achievement: 'Achievement',
  promotion: 'Promotion',
  pay: 'Pay received',
  unlock: 'Something new unlocked',
  offer: 'Job offer',
  warn: 'Warning',
  error: 'Something went wrong',
  phone: 'Phone message',
}

/** The engine's side (engine.ts), loaded on demand. */
export interface AudioEngine {
  play(id: EffectId, options: { surface?: Surface; level: number }): void
  setScene(scene: Scene | null, levels: Levels, calm: boolean): void
  setLevels(levels: Levels, calm: boolean): void
  sting(kind: 'promotion' | 'achievement', level: number): void
  stop(): void
  /** How loud the output is right now, 0–1 (for tests and checks). */
  meter?(): number
}

export type Levels = Record<CategoryId, number>

export interface AudioStats {
  unlocked: boolean
  engine: 'none' | 'loading' | 'ready' | 'failed'
  scene: string
  played: Partial<Record<EffectId, number>>
  skipped: number
}

type Listener = (settings: AudioSettings) => void
type CaptionListener = (text: string) => void

export class AudioManager {
  settings: AudioSettings
  readonly stats: AudioStats = {
    unlocked: false,
    engine: 'none',
    scene: 'none',
    played: {},
    skipped: 0,
  }
  private engine: AudioEngine | null = null
  private scene: Scene | null = null
  private last = new Map<EffectId, number>()
  private listeners = new Set<Listener>()
  private captionListeners = new Set<CaptionListener>()
  private load: () => Promise<AudioEngine | null>
  private now: () => number

  constructor(
    settings: AudioSettings,
    load: () => Promise<AudioEngine | null>,
    now: () => number = () => performance.now(),
  ) {
    this.settings = settings
    this.load = load
    this.now = now
  }

  levels(): Levels {
    const out = {} as Levels
    for (const id of ['music', 'ambience', 'effects', 'character', 'voices'] as const)
      out[id] = levelOf(this.settings, id)
    return out
  }

  private anyOn(): boolean {
    return Object.values(this.levels()).some((v) => v > 0)
  }

  /** After the player's first click or key press: load the engine if sound is on. */
  unlock(): void {
    this.stats.unlocked = true
    void this.ensureEngine()
  }

  private async ensureEngine(): Promise<void> {
    if (!this.stats.unlocked || this.stats.engine !== 'none' || !this.anyOn()) return
    this.stats.engine = 'loading'
    try {
      this.engine = await this.load()
      this.stats.engine = this.engine ? 'ready' : 'failed'
      this.engine?.setScene(this.scene, this.levels(), this.settings.calm)
    } catch {
      this.stats.engine = 'failed'
    }
  }

  /** Plays a sound, unless the same one played too recently or its kind is off. */
  play(id: EffectId, options: { surface?: Surface } = {}): boolean {
    const t = this.now()
    const before = this.last.get(id)
    if (before !== undefined && t - before < MIN_GAP[id]) {
      this.stats.skipped++
      return false
    }
    if (this.settings.calm && id === 'click') return false
    this.last.set(id, t)
    const caption = CAPTIONS[id]
    if (caption && this.settings.captions)
      for (const listener of this.captionListeners) listener(caption)
    const level = levelOf(this.settings, EFFECTS[id])
    if (level <= 0) return false
    this.stats.played[id] = (this.stats.played[id] ?? 0) + 1
    this.engine?.play(id, { ...options, level })
    if (id === 'promotion' || id === 'achievement')
      this.engine?.sting(id, levelOf(this.settings, 'music'))
    return true
  }

  private claims: Array<{ id: number; scene: Scene | null }> = []
  private nextClaim = 1

  /**
   * A view (or something inside it, like an interview) asks for its scene; the
   * latest claim still held wins, and releasing it brings back the one before.
   */
  claim(scene: Scene | null): number {
    const id = this.nextClaim++
    this.claims.push({ id, scene })
    this.setScene(scene)
    return id
  }

  change(id: number, scene: Scene | null): void {
    const claim = this.claims.find((c) => c.id === id)
    if (!claim) return
    claim.scene = scene
    this.setScene(this.claims.at(-1)?.scene ?? null)
  }

  release(id: number): void {
    this.claims = this.claims.filter((c) => c.id !== id)
    this.setScene(this.claims.at(-1)?.scene ?? null)
  }

  /** Where the player is now: the surroundings and music follow. */
  setScene(scene: Scene | null): void {
    if (sceneKey(scene) === sceneKey(this.scene)) return
    this.scene = scene
    this.stats.scene = sceneKey(scene)
    this.engine?.setScene(scene, this.levels(), this.settings.calm)
  }

  update(settings: AudioSettings): void {
    this.settings = settings
    writeAudioSettings(settings)
    this.engine?.setLevels(this.levels(), settings.calm)
    void this.ensureEngine()
    for (const listener of this.listeners) listener(settings)
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onCaption(listener: CaptionListener): () => void {
    this.captionListeners.add(listener)
    return () => this.captionListeners.delete(listener)
  }

  /** Stops everything (the page is hidden or closing). */
  stop(): void {
    this.engine?.stop()
  }

  /** How loud the output is right now, 0–1 (0 without an engine). */
  meter(): number {
    return this.engine?.meter?.() ?? 0
  }

  /** Starts the current scene again (the page is back). */
  resume(): void {
    this.engine?.setScene(this.scene, this.levels(), this.settings.calm)
  }
}

async function loadEngine(): Promise<AudioEngine | null> {
  const { createEngine } = await import('./engine')
  return createEngine()
}

export const audio = new AudioManager(
  readAudioSettings(undefined, prefersReducedMotion()),
  loadEngine,
)

/** Waits for the first click or key press, then lets sound start. */
export function installAudio(target: Window = window): void {
  const start = () => {
    audio.unlock()
    target.removeEventListener('pointerdown', start, true)
    target.removeEventListener('keydown', start, true)
  }
  target.addEventListener('pointerdown', start, true)
  target.addEventListener('keydown', start, true)
  // A soft click for buttons (not in "fewer sounds"); a key tick when typing.
  target.addEventListener(
    'click',
    (event) => {
      const el = event.target instanceof Element ? event.target.closest('button') : null
      if (el && !(el as HTMLButtonElement).disabled) audio.play('click')
    },
    true,
  )
  target.addEventListener(
    'keydown',
    (event) => {
      const el = event.target instanceof HTMLElement ? event.target : null
      if (!el || event.repeat || event.ctrlKey || event.metaKey) return
      const typing =
        el.isContentEditable ||
        el.tagName === 'TEXTAREA' ||
        (el.tagName === 'INPUT' &&
          ['text', 'search', 'email', 'number', ''].includes(
            (el as HTMLInputElement).type,
          )) ||
        !!el.closest('[data-sound="typing"]')
      if (
        typing &&
        (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter')
      )
        audio.play('type')
    },
    true,
  )
  // Silence when the tab is hidden; the scene comes back when it returns.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.stop()
    else audio.resume()
  })
  if (import.meta.env.DEV)
    (window as unknown as { __worksimAudio: AudioManager }).__worksimAudio = audio
}
