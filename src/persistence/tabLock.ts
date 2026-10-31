/**
 * Tab lock: only one browser tab may edit WorkSim's data at a time.
 *
 * Two tabs saving the same workbook would overwrite each other's work. The
 * browser's Web Locks API gives the lock to one tab. Another tab shows a
 * "WorkSim is open in another tab" screen, and can take over: it asks the
 * current tab (through a BroadcastChannel) to save everything and let go.
 * If that tab does not answer (for example it is frozen), the lock is taken
 * by force after a few seconds.
 */

export type TabLockState =
  /** Checking whether another tab is already using WorkSim. */
  | 'acquiring'
  /** This tab may edit. */
  | 'owner'
  /** Another tab is using WorkSim. This tab gets the lock automatically when that tab closes. */
  | 'blocked'
  /** This tab asked the other tab to hand over. */
  | 'taking-over'
  /** Another tab took over from this tab. */
  | 'lost'

const LOCK_NAME = 'gamhub-worksim:editor'
const CHANNEL_NAME = 'gamhub-worksim:tabs'
export const TAKEOVER_TIMEOUT_MS = 3000

interface TabLockOptions {
  locks?: LockManager | null
  createChannel?: (name: string) => BroadcastChannel | null
}

export class TabLock {
  private state: TabLockState = 'acquiring'
  private readonly listeners = new Set<() => void>()
  private readonly locks: LockManager | null
  private readonly channel: BroadcastChannel | null
  private release: (() => void) | null = null
  private waiting: AbortController | null = null
  private beforeRelease: () => Promise<void> = async () => {}

  constructor(options: TabLockOptions = {}) {
    this.locks =
      options.locks !== undefined ? options.locks : (globalThis.navigator?.locks ?? null)
    const createChannel =
      options.createChannel ??
      ((name: string) =>
        typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(name))
    this.channel = createChannel(CHANNEL_NAME)
    if (this.channel) {
      this.channel.onmessage = (event: MessageEvent) => {
        if (
          (event.data as { type?: string })?.type === 'takeover' &&
          this.state === 'owner'
        ) {
          void this.handOver()
        }
      }
    }
  }

  getState = (): TabLockState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Work to finish (e.g. saving) before handing the lock to another tab. */
  setBeforeRelease(callback: () => Promise<void>) {
    this.beforeRelease = callback
  }

  private setState(state: TabLockState) {
    this.state = state
    for (const listener of this.listeners) listener()
  }

  /** Tries to get the lock. Resolves to true once this tab owns it. */
  private acquire(options: LockOptions): Promise<boolean> {
    const locks = this.locks
    if (!locks) {
      // Very old browser without Web Locks: allow editing rather than block the player.
      this.setState('owner')
      return Promise.resolve(true)
    }
    return new Promise<boolean>((resolve) => {
      let granted = false
      locks
        .request(LOCK_NAME, options, (lock) => {
          if (!lock) {
            resolve(false)
            return undefined
          }
          granted = true
          this.waiting = null
          this.setState('owner')
          resolve(true)
          // Hold the lock until `release` is called.
          return new Promise<void>((release) => {
            this.release = release
          })
        })
        .catch(() => {
          if (granted) {
            // Another tab took the lock by force.
            this.release = null
            this.setState('lost')
          } else {
            resolve(false) // waiting was cancelled
          }
        })
    })
  }

  /** Call once at start-up. */
  async start() {
    if (await this.acquire({ ifAvailable: true })) return
    this.setState('blocked')
    this.waitForLock()
  }

  /** Queues for the lock, so this tab takes over automatically when the other tab closes. */
  private waitForLock() {
    this.waiting = new AbortController()
    void this.acquire({ signal: this.waiting.signal })
  }

  /** Asks the tab that owns the lock to hand it over to this tab. */
  async takeOver() {
    if (this.state === 'owner' || this.state === 'taking-over') return
    this.setState('taking-over')
    if (!this.waiting) this.waitForLock()
    this.channel?.postMessage({ type: 'takeover' })

    await new Promise((resolve) => setTimeout(resolve, TAKEOVER_TIMEOUT_MS))
    if (this.getState() === 'owner') return

    // The other tab did not respond: take the lock by force.
    this.waiting?.abort()
    this.waiting = null
    if (!(await this.acquire({ steal: true }))) this.setState('blocked')
  }

  private async handOver() {
    try {
      await this.beforeRelease()
    } finally {
      this.release?.()
      this.release = null
      this.setState('lost')
    }
  }
}
