import { useEffect, useState } from 'react'
import { formatTimeAgo } from '../lib/time'
import type { AutosaveStatus } from '../persistence/autosave'

/** Shows the player that their work is being saved, like Google Docs does. */
export function SaveIndicator({ status }: { status: AutosaveStatus }) {
  const now = useNow(15_000)

  let text: string
  let tone: string
  switch (status.state) {
    case 'idle':
      text = 'All changes saved'
      tone = 'text-slate-500'
      break
    case 'pending':
      text = 'Unsaved changes…'
      tone = 'text-slate-500'
      break
    case 'saving':
      text = 'Saving…'
      tone = 'text-slate-500'
      break
    case 'saved':
      text = `Saved · ${status.lastSavedAt ? formatTimeAgo(status.lastSavedAt, now) : 'just now'}`
      tone = 'text-emerald-700'
      break
    case 'error':
      text = "⚠ Couldn't save. Retrying automatically. Please don't close this tab."
      tone = 'text-red-700 font-medium'
      break
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={`text-sm ${tone}`}
      title={status.error ?? undefined}
      data-testid="save-indicator"
      data-state={status.state}
    >
      {text}
    </span>
  )
}

/** The current time, refreshed every `intervalMs`. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
