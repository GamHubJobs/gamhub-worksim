/**
 * WorkSim AI settings and usage, kept on this device (LocalStorage), not in
 * saves or backups. They hold no secrets: API keys live only in the AI
 * bridge's own environment, never in the browser.
 */
import { z } from 'zod'
import type { AiMode, EngineId } from './types'

const SETTINGS_KEY = 'gamhub-worksim:ai-settings'
const USAGE_KEY = 'gamhub-worksim:ai-usage'

/** Only addresses on this computer may be used for the local model and the bridge. */
export function isLocalAddress(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]')
    )
  } catch {
    return false
  }
}

const LocalUrl = z.string().refine(isLocalAddress, 'Must be an address on this computer')

const SettingsSchema = z.object({
  engine: z.enum(['builtin', 'local', 'bridge']).default('builtin'),
  mode: z.enum(['learning', 'professional', 'expert']).default('learning'),
  /**
   * The player agreed that requests may leave WorkSim (to a local model or the
   * bridge). Without it, only the built-in guide answers.
   */
  consent: z.boolean().default(false),
  local: z
    .object({
      url: LocalUrl.default('http://localhost:11434'),
      model: z.string().default(''),
    })
    .prefault({}),
  bridge: z
    .object({
      url: LocalUrl.default('http://127.0.0.1:8787'),
      provider: z.enum(['anthropic', 'openai', 'google']).default('anthropic'),
      /** Empty: the bridge's own default for that provider. */
      model: z.string().default(''),
    })
    .prefault({}),
  /** Requests to a model per day, on this device. */
  dailyLimit: z.number().int().min(1).max(500).default(40),
})

export type AiSettings = z.infer<typeof SettingsSchema>

export const DEFAULT_AI_SETTINGS: AiSettings = SettingsSchema.parse({})

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readAiSettings(store: Storage | null = storage()): AiSettings {
  try {
    const raw = store?.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_AI_SETTINGS
    const parsed = SettingsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_AI_SETTINGS
  } catch {
    return DEFAULT_AI_SETTINGS
  }
}

export function writeAiSettings(
  settings: AiSettings,
  store: Storage | null = storage(),
): void {
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage blocked: the settings last until the page is closed.
  }
}

/** The engine that will actually be asked, given consent. */
export function effectiveEngine(settings: AiSettings): EngineId {
  return settings.consent ? settings.engine : 'builtin'
}

export function modeOf(settings: AiSettings): AiMode {
  return settings.mode
}

// ---------------------------------------------------------------------------
// Usage: requests to a model today (the built-in guide is not counted)
// ---------------------------------------------------------------------------

const UsageSchema = z.object({ day: z.string(), count: z.number().int().nonnegative() })

const today = (now: Date) => now.toISOString().slice(0, 10)

export function usedToday(now = new Date(), store: Storage | null = storage()): number {
  try {
    const parsed = UsageSchema.safeParse(JSON.parse(store?.getItem(USAGE_KEY) ?? 'null'))
    return parsed.success && parsed.data.day === today(now) ? parsed.data.count : 0
  } catch {
    return 0
  }
}

export function countRequest(
  now = new Date(),
  store: Storage | null = storage(),
): number {
  const count = usedToday(now, store) + 1
  try {
    store?.setItem(USAGE_KEY, JSON.stringify({ day: today(now), count }))
  } catch {
    // Not counted if storage is blocked; the bridge has its own daily cap too.
  }
  return count
}
