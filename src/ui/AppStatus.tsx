/**
 * Quiet notices about the app itself: working offline, and a new version that
 * is ready. Neither interrupts work; an update happens only when the player
 * chooses it, after everything is saved.
 */
import { useState } from 'react'
import { applyUpdate, useOnline, useUpdateReady } from '../app/pwa'

export function AppStatus({ saveAll }: { saveAll: () => Promise<boolean> }) {
  const online = useOnline()
  const updateReady = useUpdateReady()
  const [state, setState] = useState<'idle' | 'updating' | 'not-saved'>('idle')
  if (online && !updateReady) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center gap-2 px-2">
      {!online && (
        <p
          role="status"
          data-testid="offline-status"
          className="pointer-events-auto rounded-full bg-slate-800 px-4 py-1.5 text-sm text-white shadow"
        >
          You are offline. WorkSim keeps working and saving on this device.
        </p>
      )}
      {updateReady && (
        <div
          role="status"
          data-testid="update-ready"
          className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-lg bg-white px-4 py-2 text-sm text-slate-800 shadow-lg ring-1 ring-slate-200"
        >
          <span>
            A new version of WorkSim is ready.
            {state === 'not-saved' &&
              ' Your latest changes could not be saved yet, so the update is waiting. Try again in a moment.'}
          </span>
          <button
            type="button"
            disabled={state === 'updating'}
            onClick={async () => {
              setState('updating')
              const started = await applyUpdate(saveAll)
              setState(started ? 'updating' : 'not-saved')
            }}
            className="rounded-md bg-blue-700 px-3 py-1 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {state === 'updating' ? 'Saving and updating…' : 'Update now'}
          </button>
        </div>
      )}
    </div>
  )
}
