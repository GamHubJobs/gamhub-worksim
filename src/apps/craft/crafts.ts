/**
 * The office apps: real productivity software (Grid Craft, …), each the
 * official web build of an open-source project, run in a window of the
 * desktop and kept in the player's save like every other file. See
 * docs/CRAFT_APPS.md.
 *
 * An app is used when it is installed (public/crafts/<app>/, put there by
 * scripts/crafts/fetch.mjs) and the device can draw it (WebGPU or WebGL2).
 * Otherwise, or if it fails to start, the game's own basic editor is used, so
 * there is always a way to do the work.
 */

export type CraftId = 'gridcraft' | 'wordcraft' | 'deckcraft'

export interface CraftInfo {
  id: CraftId
  /** The name players see. */
  title: string
  /** What it is, for the window and the credits. */
  kind: string
  /** The project it is built from, credited in the window. */
  basedOn: string
}

export const CRAFTS: Record<CraftId, CraftInfo> = {
  gridcraft: {
    id: 'gridcraft',
    title: 'Grid Craft',
    kind: 'spreadsheet',
    basedOn: 'GridCraft by the ArtCraft team',
  },
  wordcraft: {
    id: 'wordcraft',
    title: 'Word Craft',
    kind: 'word processor',
    basedOn: 'WordCraft by the ArtCraft team',
  },
  deckcraft: {
    id: 'deckcraft',
    title: 'Deck Craft',
    kind: 'presentations',
    basedOn: 'DeckCraft by the ArtCraft team',
  },
}

/** What is installed for an app (public/crafts/<app>/craft.json). */
export interface Installed {
  version: string
  license: string
  source: string
}

/** Where an app's files are served. */
export function craftBase(id: CraftId): string {
  return `${import.meta.env.BASE_URL}crafts/${id}/`
}

const BASIC_KEY = 'gamhub-worksim:basic-editors'

/**
 * The player's choice (Settings → Office apps, on this device): the basic
 * editors, which work fully with a screen reader, instead of the apps.
 */
export function prefersBasicEditors(): boolean {
  try {
    return localStorage.getItem(BASIC_KEY) === '1'
  } catch {
    return false
  }
}

export function setPrefersBasicEditors(basic: boolean) {
  try {
    if (basic) localStorage.setItem(BASIC_KEY, '1')
    else localStorage.removeItem(BASIC_KEY)
  } catch {
    // Storage unavailable: the choice lasts until the page is closed.
  }
}

/**
 * Off for this tab (sessionStorage `worksim.crafts` = `off`): the basic
 * editors only. Browser tests of the development build drive the basic
 * editors cell by cell, so there it is off unless a test turns it on
 * (`worksim.crafts` = `on`). Players get the apps unless they choose the
 * basic editors in Settings.
 */
function switchedOff(): boolean {
  try {
    const setting = sessionStorage.getItem('worksim.crafts')
    if (setting) return setting === 'off'
    return import.meta.env.DEV && navigator.webdriver === true
  } catch {
    return false
  }
}

/** Can this browser draw the apps (WebGPU, or WebGL2)? */
export function canDraw(): boolean {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) return true
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

const checks = new Map<CraftId, Promise<Installed | null>>()

/** The installed app, or null when it cannot be used here. Asked once per app. */
export function craftAvailable(id: CraftId): Promise<Installed | null> {
  if (switchedOff() || prefersBasicEditors() || !canDraw()) return Promise.resolve(null)
  let check = checks.get(id)
  if (!check) {
    check = fetch(`${craftBase(id)}craft.json`, { cache: 'no-cache' })
      .then(async (response) => {
        if (!response.ok) return null
        const info = (await response.json()) as Partial<Installed>
        return typeof info.version === 'string'
          ? {
              version: info.version,
              license: String(info.license ?? ''),
              source: String(info.source ?? ''),
            }
          : null
      })
      .catch(() => null)
    checks.set(id, check)
  }
  return check
}

/** Forgets a failed app for this session, so it is not tried again in every window. */
export function markFailed(id: CraftId) {
  checks.set(id, Promise.resolve(null))
}

/** A file name from a document's title. */
export function craftFileName(title: string, extension: string, fallback = 'Document') {
  const base = title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || fallback
  return `${base}.${extension}`
}
