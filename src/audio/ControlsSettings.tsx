/**
 * Changing the keys for walking about in 3D: each control with its keys, a
 * Change button that takes the next key pressed, and a reset. Kept on this
 * device; every 3D view uses the change straight away.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  CONTROLS,
  DEFAULT_KEYS,
  keyName,
  keymap,
  onKeymapChange,
  withKey,
  writeKeymap,
  type Control,
} from '../world/keys'

export function Controls() {
  const keys = useSyncExternalStore(onKeymapChange, keymap)
  const [waiting, setWaiting] = useState<Control | null>(null)

  useEffect(() => {
    if (!waiting) return
    const take = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      // Escape cancels (it also closes this panel, so it cannot be a control).
      if (event.code !== 'Escape') writeKeymap(withKey(keymap(), waiting, event.code))
      setWaiting(null)
    }
    window.addEventListener('keydown', take, true)
    return () => window.removeEventListener('keydown', take, true)
  }, [waiting])

  return (
    <fieldset className="mt-3 border-t border-slate-100 pt-3" data-testid="controls">
      <legend className="text-sm font-semibold text-slate-900">Controls</legend>
      <p className="text-xs text-slate-500">
        For walking about in 3D. Crouch is C rather than Ctrl, because Ctrl with W closes
        the browser tab.
      </p>
      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {CONTROLS.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-700">{c.name}</span>
            <button
              type="button"
              onClick={() => setWaiting(c.id)}
              aria-label={`${c.name}: ${keys[c.id].map(keyName).join(' or ') || 'no key'}. Change`}
              className="min-w-16 rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
            >
              {waiting === c.id
                ? 'Press a key…'
                : keys[c.id].map(keyName).join(' / ') || '—'}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => writeKeymap(DEFAULT_KEYS)}
        className="mt-2 rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
      >
        Reset the keys
      </button>
    </fieldset>
  )
}
