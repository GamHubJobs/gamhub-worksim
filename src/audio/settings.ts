/**
 * Sound settings: a master volume, a volume and an on/off switch for each kind
 * of sound, mute, fewer sounds, and captions. Kept on this device (like the
 * WorkSim AI settings), not in saves or backups.
 */
import { z } from 'zod'

export const CATEGORIES = [
  {
    id: 'music',
    name: 'Music',
    description: 'Background music that changes with where you are. Plays now and then.',
  },
  {
    id: 'ambience',
    name: 'Surroundings',
    description:
      'The office, the street, the café, home: traffic, birds, air conditioning…',
  },
  {
    id: 'effects',
    name: 'Interface and game sounds',
    description: 'Buttons, new emails, finished tasks, pay day, promotions, warnings.',
  },
  {
    id: 'character',
    name: 'Your character',
    description: 'Footsteps, doors, sitting down, typing.',
  },
  {
    id: 'voices',
    name: 'People',
    description: 'Conversation in the background and colleagues greeting you.',
  },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

const Volume = z.number().int().min(0).max(100)
const Category = (volume: number) =>
  z.object({ volume: Volume.default(volume), on: z.boolean().default(true) }).prefault({})

export const AudioSettingsSchema = z.object({
  master: Volume.default(70),
  muted: z.boolean().default(false),
  categories: z
    .object({
      music: Category(35),
      ambience: Category(55),
      effects: Category(60),
      character: Category(50),
      voices: Category(45),
    })
    .prefault({}),
  /** Fewer, quieter background sounds and no button clicks (reduced stimulation). */
  calm: z.boolean().default(false),
  /** Short captions for important sounds. */
  captions: z.boolean().default(false),
})

export type AudioSettings = z.infer<typeof AudioSettingsSchema>

export const AUDIO_SETTINGS_KEY = 'worksim.audio.v1'

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** The defaults, calmer when the player's system asks for less motion. */
export function defaultAudioSettings(reduced = false): AudioSettings {
  return AudioSettingsSchema.parse({ calm: reduced })
}

export function readAudioSettings(
  store: Storage | null = storage(),
  reduced = false,
): AudioSettings {
  try {
    const raw = store?.getItem(AUDIO_SETTINGS_KEY)
    if (!raw) return defaultAudioSettings(reduced)
    const parsed = AudioSettingsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : defaultAudioSettings(reduced)
  } catch {
    return defaultAudioSettings(reduced)
  }
}

export function writeAudioSettings(
  settings: AudioSettings,
  store: Storage | null = storage(),
): void {
  try {
    store?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage full or blocked: the settings still apply until the page closes.
  }
}

/** How loud a category is, 0–1, after the master volume and mute. */
export function levelOf(settings: AudioSettings, id: CategoryId): number {
  const category = settings.categories[id]
  if (settings.muted || !category.on) return 0
  return (settings.master / 100) * (category.volume / 100)
}
