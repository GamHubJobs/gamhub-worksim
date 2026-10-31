/**
 * The computer clock: while the player works at their computer, office time
 * runs `COMPUTER_SPEED` times faster than real time. It pauses when the tab
 * is hidden or the player has not touched the keyboard or mouse for a while,
 * so stepping away never costs anything.
 *
 * Time is collected here and saved to the profile every half minute (and when
 * the player leaves the computer), not on every tick.
 */
import { useEffect, useRef, useState } from 'react'
import { COMPUTER_SPEED, IDLE_AFTER_SECONDS } from '../content/workday'

/** Real seconds between saves of the collected office time. */
const SAVE_EVERY_SECONDS = 30

export type ClockStatus = 'running' | 'paused' | 'stopped'

export function useWorkClock(
  running: boolean,
  /** Extra speed when tired (see `workPace`). */
  pace: number,
  onTimePassed: (officeMinutes: number) => void,
): { pendingMinutes: number; status: ClockStatus } {
  const [pendingMinutes, setPendingMinutes] = useState(0)
  const [active, setActive] = useState(true)
  const pending = useRef(0)
  const lastInput = useRef(0)
  const callback = useRef(onTimePassed)
  const paceRef = useRef(pace)

  useEffect(() => {
    callback.current = onTimePassed
    paceRef.current = pace
  })

  useEffect(() => {
    if (!running) return
    lastInput.current = Date.now()
    const noteInput = () => {
      lastInput.current = Date.now()
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel'] as const
    for (const name of events) window.addEventListener(name, noteInput, { passive: true })

    const flush = () => {
      const minutes = pending.current
      if (minutes <= 0) return
      pending.current = 0
      setPendingMinutes(0)
      callback.current(minutes)
    }

    let sinceSave = 0
    const timer = window.setInterval(() => {
      const visible = document.visibilityState === 'visible'
      const recent = Date.now() - lastInput.current < IDLE_AFTER_SECONDS * 1000
      const counting = visible && recent
      setActive(counting)
      if (counting) {
        pending.current += (COMPUTER_SPEED * paceRef.current) / 60
        setPendingMinutes(pending.current)
      }
      sinceSave++
      if (sinceSave >= SAVE_EVERY_SECONDS || !visible) {
        sinceSave = 0
        flush()
      }
    }, 1000)

    window.addEventListener('pagehide', flush)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pagehide', flush)
      for (const name of events) window.removeEventListener(name, noteInput)
      flush()
    }
  }, [running])

  return {
    pendingMinutes: running ? pendingMinutes : 0,
    status: !running ? 'stopped' : active ? 'running' : 'paused',
  }
}
