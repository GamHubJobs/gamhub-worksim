import { useEffect, useRef } from 'react'

/**
 * Esc opens the pause menu when nothing else is using Esc (a dialog or the
 * phone, mouse look), and only from the world, not from a panel or a pop-up. Whether something was open is
 * read as the key goes down, before anything handles it: an Esc that closes a
 * conversation must not then open the menu too.
 */
export function usePauseKey(onPause: () => void, enabled: boolean) {
  const latest = useRef(onPause)
  useEffect(() => {
    latest.current = onPause
  })
  useEffect(() => {
    if (!enabled) return
    let busy = false
    const before = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const t = e.target as HTMLElement | null
      // Only from the world itself (the 3D view, or nothing in particular): Esc in a
      // panel or a pop-up belongs to it.
      const inWorld =
        !t || t === document.body || t.getAttribute('role') === 'application'
      busy =
        !inWorld ||
        !!document.pointerLockElement ||
        !!document.querySelector('[role="dialog"]')
    }
    const after = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || busy) return
      latest.current()
    }
    window.addEventListener('keydown', before, true)
    window.addEventListener('keydown', after)
    return () => {
      window.removeEventListener('keydown', before, true)
      window.removeEventListener('keydown', after)
    }
  }, [enabled])
}
