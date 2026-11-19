/**
 * A work tool used where it is, in the 3D workplace: at the bedside, at
 * counsel's table, at the test bench. The camera closes in over the player's
 * shoulder on the thing (office/scene/OfficeScene.tsx), and the tool opens
 * on the device someone would use there (a tablet on the ward, a laptop at
 * the law firm, a rugged tablet in the workshop), held up on the right of
 * the view with the room and the player on the left, instead of the view
 * switching to the work computer. "Step back" (or Esc) returns to the room
 * at once; "Open on the computer" moves it to the full work computer.
 */
import { useEffect, type ReactNode } from 'react'
import { DEVICE_NAME, type Device } from './device'

/** The device's casing round the screen. */
const CASING: Record<Device, string> = {
  tablet: 'rounded-[1.6rem] bg-slate-900 p-3 ring-1 ring-slate-700',
  laptop: 'rounded-t-xl bg-zinc-800 px-2.5 pt-2.5 pb-2 ring-1 ring-zinc-600',
  rugged:
    'rounded-[1.4rem] bg-slate-800 p-3 ring-[6px] ring-amber-400 outline outline-2 outline-slate-900',
}

export function InPlaceTool({
  where,
  title,
  device = 'tablet',
  onClose,
  onComputer,
  children,
}: {
  /** Where the player is, e.g. "Bay A". */
  where: string
  /** What is open, e.g. "Ward Systems". */
  title: string
  /** What it is shown on. */
  device?: Device
  onClose: () => void
  onComputer: () => void
  children: ReactNode
}) {
  useEffect(() => {
    // The HUD steps aside, as for hands-on work (index.css).
    document.body.dataset.onsite = '1'
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Esc inside a field of the tool is the tool's own.
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
      data-device={device}
    >
      <div className="pointer-events-auto flex h-full w-full max-w-[min(64rem,68%)] flex-col">
        <section
          role="dialog"
          aria-label={`${title}, at ${where}`}
          className={`motion-pop flex min-h-0 flex-1 flex-col shadow-2xl ${CASING[device]}`}
        >
          {device !== 'laptop' && (
            // The front camera, at the top of the casing.
            <span
              aria-hidden
              className="mx-auto -mt-1.5 mb-1.5 block h-1.5 w-1.5 rounded-full bg-slate-600"
            />
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white">
            <header className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] tracking-wide text-slate-500 uppercase">
                  At {where} · on the {DEVICE_NAME[device]}
                </p>
                <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onComputer}
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
              >
                Open on the computer
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700"
                autoFocus
              >
                Step back (Esc)
              </button>
            </header>
            <div className="relative min-h-0 flex-1 overflow-auto">{children}</div>
          </div>
        </section>
        {device === 'laptop' && (
          // The laptop's keyboard edge, below the screen.
          <div
            aria-hidden
            className="mx-[-1.5%] h-4 rounded-b-2xl bg-gradient-to-b from-zinc-500 to-zinc-700 shadow-xl"
          />
        )}
      </div>
    </div>
  )
}
