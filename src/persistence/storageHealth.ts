/**
 * Storage health: how well protected the player's saved work is.
 *
 * Browser storage is "best-effort" by default: the browser may delete it when
 * the disk is nearly full. Asking for *persistent* storage lowers that risk,
 * but browsers decide for themselves whether to grant it (Chrome decides
 * automatically based on how much the site is used; Firefox asks the user).
 * Even persistent storage is deleted if the player clears their browsing data,
 * so backups remain essential.
 */

/** Below this much free space we warn the player. */
export const LOW_SPACE_BYTES = 50 * 1024 * 1024
/** A total quota this small usually means a private window or restricted browser. */
export const SMALL_QUOTA_BYTES = 200 * 1024 * 1024

export interface StorageHealth {
  /** Whether the browser has agreed to keep our data even under storage pressure. Null if unknown. */
  persisted: boolean | null
  usageBytes: number | null
  quotaBytes: number | null
  /** Less than `LOW_SPACE_BYTES` left. */
  lowSpace: boolean
  /** Total quota is very small, typical of private/incognito windows. */
  restrictedQuota: boolean
}

type StorageApi = Pick<StorageManager, 'estimate' | 'persisted' | 'persist'>

function storageApi(): StorageApi | null {
  return globalThis.navigator?.storage ?? null
}

export async function checkStorageHealth(
  storage: StorageApi | null = storageApi(),
): Promise<StorageHealth> {
  let persisted: boolean | null = null
  let usageBytes: number | null = null
  let quotaBytes: number | null = null

  try {
    if (storage?.persisted) persisted = await storage.persisted()
  } catch {
    persisted = null
  }
  try {
    if (storage?.estimate) {
      const estimate = await storage.estimate()
      usageBytes = estimate.usage ?? null
      quotaBytes = estimate.quota ?? null
    }
  } catch {
    // Unknown usage is not an error in itself.
  }

  const free = usageBytes !== null && quotaBytes !== null ? quotaBytes - usageBytes : null
  return {
    persisted,
    usageBytes,
    quotaBytes,
    lowSpace: free !== null && free < LOW_SPACE_BYTES,
    restrictedQuota: quotaBytes !== null && quotaBytes < SMALL_QUOTA_BYTES,
  }
}

/**
 * Asks the browser to protect our storage. Returns whether it is now
 * protected, or null if the browser does not support asking.
 * Call after the player has done meaningful work, not on first load:
 * browsers are more likely to agree, and Firefox shows a prompt.
 */
export async function requestPersistentStorage(
  storage: StorageApi | null = storageApi(),
): Promise<boolean | null> {
  if (!storage?.persist) return null
  try {
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return null
  }
}

/** Whether IndexedDB can actually be used (it can be blocked by browser settings). */
export async function isIndexedDbUsable(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('gamhub-worksim-probe')
      request.onsuccess = () => {
        request.result.close()
        indexedDB.deleteDatabase('gamhub-worksim-probe')
        resolve(true)
      }
      request.onerror = () => resolve(false)
      request.onblocked = () => resolve(true)
    } catch {
      resolve(false)
    }
  })
}

/** 1536 → "1.5 KB", 5_000_000 → "4.8 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}
