/**
 * Installable, offline WorkSim: registers the service worker (production
 * builds only), tells the app when a new version is ready, and applies it only
 * when the player chooses, after their work is saved. Saves are in IndexedDB on
 * this device and are never touched by updates or by repairing the app files.
 */
import { useEffect, useState } from 'react'

export type UpdateState = 'none' | 'ready' | 'updating'

let registration: ServiceWorkerRegistration | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

/** Whether this browser can run WorkSim offline. */
export function offlineSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
}

/** Registers the service worker once the page has loaded (production only). */
export function registerServiceWorker(enabled = import.meta.env.PROD): void {
  if (!enabled || !offlineSupported()) return
  const register = () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        registration = reg
        const watch = (worker: ServiceWorker | null) => {
          worker?.addEventListener('statechange', notify)
        }
        watch(reg.installing)
        reg.addEventListener('updatefound', () => watch(reg.installing))
        notify()
        // Look for a new version now and then while WorkSim stays open.
        window.setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000)
      })
      .catch((error: unknown) => {
        // WorkSim still works online without it.
        console.warn('Offline support is not available:', error)
      })
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

/** A new version is installed and waiting (and an older one is in control). */
function updateWaiting(): boolean {
  return !!registration?.waiting && !!navigator.serviceWorker.controller
}

/**
 * Switches to the waiting version: first saves everything (`saveAll` resolves
 * true when all work is safely stored), then reloads into the new version.
 */
export async function applyUpdate(saveAll: () => Promise<boolean>): Promise<boolean> {
  const waiting = registration?.waiting
  if (!waiting) return false
  if (!(await saveAll())) return false
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => window.location.reload(),
    { once: true },
  )
  waiting.postMessage('SKIP_WAITING')
  return true
}

/**
 * Repairs the app files: removes the service worker and its cached files, then
 * reloads from the network. Saves (IndexedDB) are not affected.
 */
export async function repairAppFiles(): Promise<void> {
  if (offlineSupported()) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
  }
  if (typeof caches !== 'undefined') {
    const keys = await caches.keys()
    await Promise.all(
      keys.filter((k) => k.startsWith('worksim-')).map((k) => caches.delete(k)),
    )
  }
  window.location.reload()
}

/** Whether a new version is waiting to be applied. */
export function useUpdateReady(): boolean {
  const [ready, setReady] = useState(updateWaiting)
  useEffect(() => {
    const check = () => setReady(updateWaiting())
    listeners.add(check)
    check()
    return () => {
      listeners.delete(check)
    }
  }, [])
  return ready
}

/** Whether the browser is online, kept up to date. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
