/**
 * A work tool used where it is, in the 3D workplace: at the bedside, at
 * counsel's table, at the test bench. The tool opens in a frame over the
 * room (the player stays standing at the thing, the room visible round the
 * frame), instead of the view switching to the work computer. "Step back"
 * (or Esc) returns to the room at once; "Open on the computer" moves it to
 * the full work computer, for longer work.
 */
import { useEffect, type ReactNode } from 'react'

export function InPlaceTool({
  where,
  title,
  onClose,
  onComputer,
  children,
}: {
  /** Where the player is, e.g. "Bay A". */
  where: string
  /** What is open, e.g. "Ward Systems". */
  title: string
  onClose: () => void
  onComputer: () => void
  children: ReactNode
}) {
  useEffect(() => {
    // The HUD steps aside, as for hands-on work (index.css).
    document.body.dataset.onsite = '1'
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Esc inside a field or a dialogue of the tool is the tool's own.
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select')) return
      onClose()
    }
    window.addEventListener('keydown', key)
    return () => {
      delete document.body.dataset.onsite
      window.removeEventListener('keydown', key)
    }
  }, [onClose])
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-stretch justify-end bg-gradient-to-l from-slate-900/40 to-transparent p-4"
      data-testid="in-place-tool"
    >
      <section
        role="dialog"
        aria-label={`${title}, at ${where}`}
        className="pointer-events-auto flex h-full w-full max-w-[min(64rem,68%)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-4 ring-slate-800/70"
      >
        <header className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-3 py-2 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-wide text-slate-300 uppercase">
              At {where}
            </p>
            <h2 className="truncate text-sm font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onComputer}
            className="rounded px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
          >
            Open on the computer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-900 hover:bg-slate-100"
            autoFocus
          >
            Step back (Esc)
          </button>
        </header>
        <div className="relative min-h-0 flex-1 overflow-auto">{children}</div>
      </section>
    </div>
  )
}
