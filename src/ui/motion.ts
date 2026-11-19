/**
 * Motion for the whole game (see the motion section of index.css): one set of
 * timings, a way for something to animate out before it is removed, and the
 * player's reduced-motion preference respected everywhere.
 *
 * - Entrances: add a class (`motion-pop`, `motion-rise`, `motion-fade`, …) to
 *   what appears; it animates once when it is first drawn.
 * - Exits: `usePresence(open)` keeps a thing on the page for a moment after it
 *   is closed, with `leaving` true, so its `-out` class can play.
 */
import { useEffect, useRef, useState } from 'react'

/** Whether the player has asked their system for less motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** The timings in index.css, in milliseconds. */
export const MOTION = { fast: 140, base: 200, slow: 320, scene: 450 } as const

/** A duration, or none at all with reduced motion. */
export function motionMs(ms: number): number {
  return prefersReducedMotion() ? 0 : ms
}

/**
 * Keeps something on the page while it animates out. `mounted`: draw it;
 * `leaving`: it has been closed and is on its way out (use the -out class).
 * Opening again while it leaves brings it straight back.
 */
export function usePresence(
  open: boolean,
  exitMs: number = MOTION.fast,
): { mounted: boolean; leaving: boolean } {
  const ms = motionMs(exitMs)
  // Closing is noticed while rendering (no extra frame drawn without it).
  const [was, setWas] = useState(open)
  const [leaving, setLeaving] = useState(false)
  if (was !== open) {
    setWas(open)
    setLeaving(!open && ms > 0)
  }
  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => setLeaving(false), ms)
    return () => window.clearTimeout(t)
  }, [leaving, ms])
  return { mounted: open || leaving, leaving: leaving && !open }
}

/**
 * Runs `action` after an exit animation (at once with reduced motion). For
 * close buttons: the thing plays its -out class, then is really closed.
 * Calling again while waiting does nothing (no double close).
 */
export function useAfterExit(ms: number = MOTION.fast) {
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )
  const run = (action: () => void) => {
    if (timer.current !== null) return
    const wait = motionMs(ms)
    if (!wait) return action()
    setLeaving(true)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setLeaving(false)
      action()
    }, wait)
  }
  return { leaving, run }
}
