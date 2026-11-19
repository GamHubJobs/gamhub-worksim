/**
 * Asking the job feeds, politely: each answer is kept for as long as its feed
 * asks (an hour to six hours), so the feeds are asked rarely; requests to one
 * feed are spaced out; two searches wanting the same answer share one
 * request; a feed slow to answer is given up on. Kept answers live in the
 * browser's own database (IndexedDB), apart from the game's saves, and only on
 * this device.
 */
import type { Provider } from './providers'
import type { JobListing } from './types'

export interface FeedAnswer {
  listings: JobListing[]
  fetchedAt: number
  fromCache: boolean
}

/** Why a feed gave nothing, in plain words. */
export class FeedError extends Error {}

type Fetch = typeof fetch

interface Kept {
  at: number
  listings: JobListing[]
}

const memory = new Map<string, Kept>()
const inFlight = new Map<string, Promise<FeedAnswer>>()
const lastAsked = new Map<string, number>()
/** Addresses that failed lately, and why (not asked again for a few minutes). */
const failures = new Map<string, { at: number; why: string }>()
const FAILURE_MS = 3 * 60_000

// ---- Kept answers (IndexedDB, falling back to memory) ----------------------

const DB = 'gamhub-worksim-jobs'
const STORE = 'feeds'
let db: Promise<IDBDatabase | null> | null = null

function open(): Promise<IDBDatabase | null> {
  db ??= new Promise((resolve) => {
    try {
      if (!globalThis.indexedDB) return resolve(null)
      const req = globalThis.indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return db
}

async function readKept(key: string): Promise<Kept | undefined> {
  const hit = memory.get(key)
  if (hit) return hit
  const d = await open()
  if (!d) return undefined
  return new Promise((resolve) => {
    try {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => {
        const v = req.result as Kept | undefined
        if (v && Array.isArray(v.listings)) memory.set(key, v)
        resolve(v)
      }
      req.onerror = () => resolve(undefined)
    } catch {
      resolve(undefined)
    }
  })
}

async function writeKept(key: string, kept: Kept): Promise<void> {
  memory.set(key, kept)
  const d = await open()
  if (!d) return
  try {
    d.transaction(STORE, 'readwrite').objectStore(STORE).put(kept, key)
  } catch {
    // Storage full or blocked: kept in memory until the page closes.
  }
}

/** Forgets every kept answer (Settings → "Clear saved searches"). */
export async function clearKept(): Promise<void> {
  memory.clear()
  const d = await open()
  try {
    d?.transaction(STORE, 'readwrite').objectStore(STORE).clear()
  } catch {
    // Nothing kept, or storage blocked.
  }
}

// ---- Asking ----------------------------------------------------------------

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Requests to one feed, one after another and spaced out. */
const queues = new Map<string, Promise<unknown>>()
function queued<T>(provider: Provider, run: () => Promise<T>): Promise<T> {
  const before = queues.get(provider.id) ?? Promise.resolve()
  const next = before.then(async () => {
    const gap = (lastAsked.get(provider.id) ?? 0) + provider.gapMs - Date.now()
    if (gap > 0) await wait(gap)
    lastAsked.set(provider.id, Date.now())
    return run()
  })
  queues.set(
    provider.id,
    next.catch(() => {}),
  )
  return next
}

export async function getJson(
  url: string,
  timeoutMs: number,
  doFetch: Fetch = globalThis.fetch.bind(globalThis),
): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await doFetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      // No cookies or sign-ins are ever sent to the feeds.
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
    })
    if (res.status === 429)
      throw new FeedError('is busy and asked to wait: try again later')
    if (res.status === 404 || res.status === 410)
      throw new FeedError('has no such page now')
    if (!res.ok) throw new FeedError(`answered with an error (${res.status})`)
    try {
      return await res.json()
    } catch {
      throw new FeedError('sent something that could not be read')
    }
  } catch (e) {
    if (e instanceof FeedError) throw e
    if ((e as { name?: string })?.name === 'AbortError')
      throw new FeedError('took too long to answer')
    throw new FeedError('could not be reached (offline, or blocked by the network)')
  } finally {
    clearTimeout(timer)
  }
}

/**
 * One feed's adverts for one address: kept ones while fresh, else asked for
 * (and kept ones, however old, if asking fails).
 */
export async function feed(
  provider: Provider,
  url: string,
  options: { fresh?: boolean; fetch?: Fetch; now?: () => number } = {},
): Promise<FeedAnswer> {
  const now = options.now ?? Date.now
  const kept = await readKept(url)
  if (kept && !options.fresh && now() - kept.at < provider.cacheMinutes * 60_000)
    return { listings: kept.listings, fetchedAt: kept.at, fromCache: true }
  const running = inFlight.get(url)
  if (running) return running
  // Just failed: said again at once, not asked again (and waited for) so soon.
  const failed = failures.get(url)
  if (failed && !options.fresh && now() - failed.at < FAILURE_MS) {
    if (kept) return { listings: kept.listings, fetchedAt: kept.at, fromCache: true }
    throw new FeedError(failed.why)
  }
  const ask = queued(provider, async () => {
    const body = await getJson(url, provider.timeoutMs, options.fetch)
    let listings: JobListing[]
    try {
      listings = provider.parse(body)
    } catch {
      throw new FeedError('sent something that could not be read')
    }
    const at = now()
    await writeKept(url, { at, listings })
    failures.delete(url)
    return { listings, fetchedAt: at, fromCache: false }
  })
    .catch((e: unknown) => {
      failures.set(url, {
        at: now(),
        why: e instanceof FeedError ? e.message : 'could not be read',
      })
      // Asking failed: what was kept last time, if anything, is still worth showing.
      if (kept) return { listings: kept.listings, fetchedAt: kept.at, fromCache: true }
      throw e
    })
    .finally(() => inFlight.delete(url))
  inFlight.set(url, ask)
  return ask
}

/** For tests: forget everything kept and every wait. */
export function resetFeeds(): void {
  memory.clear()
  inFlight.clear()
  lastAsked.clear()
  queues.clear()
  failures.clear()
}
