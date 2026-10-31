/**
 * Autosave: saves the latest value shortly after changes stop, so the player
 * never has to press Save.
 *
 * - Waits `delayMs` after the last change ("debounce"), but never longer than
 *   `maxWaitMs` while the player keeps working without pause.
 * - Only one save runs at a time; the newest value always wins.
 * - Failed saves are retried automatically and the value is never dropped.
 * - `flush()` saves immediately, e.g. when the tab is being hidden or closed.
 *
 * This file knows nothing about documents or databases: it calls the `save`
 * function it is given. That keeps it small, reusable and easy to test.
 */

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface AutosaveStatus {
  state: SaveState
  /** When the last successful save finished, or null if none yet. */
  lastSavedAt: number | null
  /** Message of the last failed save, or null. */
  error: string | null
}

export interface AutosaverOptions<T> {
  save: (value: T) => Promise<void>
  delayMs?: number
  maxWaitMs?: number
  /** Waits between retries after failures; the last one repeats forever. */
  retryDelaysMs?: number[]
}

export interface Autosaver<T> {
  /** Records a new value to be saved soon. */
  schedule(value: T): void
  /** Saves any pending value now. Resolves to true if everything is saved. */
  flush(): Promise<boolean>
  hasUnsavedChanges(): boolean
  getStatus(): AutosaveStatus
  subscribe(listener: () => void): () => void
  dispose(): void
}

export function createAutosaver<T>(options: AutosaverOptions<T>): Autosaver<T> {
  const delayMs = options.delayMs ?? 1000
  const maxWaitMs = options.maxWaitMs ?? 5000
  const retryDelaysMs = options.retryDelaysMs ?? [1000, 3000, 10000]

  let pending: { value: T } | null = null
  let firstPendingAt: number | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight: Promise<void> | null = null
  let failures = 0
  let disposed = false
  let status: AutosaveStatus = { state: 'idle', lastSavedAt: null, error: null }
  const listeners = new Set<() => void>()

  function setStatus(changes: Partial<AutosaveStatus>) {
    status = { ...status, ...changes }
    for (const listener of listeners) listener()
  }

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function startTimer(ms: number) {
    clearTimer()
    if (disposed) return
    timer = setTimeout(() => {
      timer = null
      void runSave()
    }, ms)
  }

  async function runSave(): Promise<void> {
    // Wait for any save already running, so saves never overlap.
    while (inFlight) await inFlight
    if (!pending) return

    const { value } = pending
    pending = null
    firstPendingAt = null
    setStatus({ state: 'saving' })

    const attempt = (async () => {
      try {
        await options.save(value)
        failures = 0
        setStatus({
          state: pending ? 'pending' : 'saved',
          lastSavedAt: Date.now(),
          error: null,
        })
      } catch (error) {
        // Keep the unsaved value, unless a newer one arrived meanwhile.
        if (!pending) {
          pending = { value }
          firstPendingAt = Date.now()
        }
        failures++
        setStatus({
          state: 'error',
          error: error instanceof Error ? error.message : String(error),
        })
        startTimer(retryDelaysMs[Math.min(failures, retryDelaysMs.length) - 1])
      }
    })()

    inFlight = attempt
    try {
      await attempt
    } finally {
      if (inFlight === attempt) inFlight = null
    }
  }

  return {
    schedule(value) {
      if (disposed) return
      pending = { value }
      const now = Date.now()
      firstPendingAt ??= now
      if (status.state !== 'saving' && status.state !== 'error') {
        setStatus({ state: 'pending' })
      }
      const untilMaxWait = firstPendingAt + maxWaitMs - now
      startTimer(Math.max(0, Math.min(delayMs, untilMaxWait)))
    },

    async flush() {
      clearTimer()
      await runSave()
      return pending === null && inFlight === null
    },

    hasUnsavedChanges() {
      return pending !== null || inFlight !== null
    },

    getStatus() {
      return status
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    dispose() {
      disposed = true
      clearTimer()
      listeners.clear()
    },
  }
}
