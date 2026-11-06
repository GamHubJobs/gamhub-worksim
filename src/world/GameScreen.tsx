/**
 * A place, full screen: the 3D world fills the view, and what can be done
 * there (the lists, the panels) sits in a drawer over it, which folds away to
 * a small button to leave just the world and the HUD. Without 3D the drawer is
 * the page, as before. The drawer's state is kept on this device.
 */
import { useState, type ReactNode } from 'react'

const KEY = 'worksim.drawer.v1'

export function GameScreen({
  testId,
  label,
  world,
  children,
}: {
  testId: string
  /** What the drawer is about ("Your flat"). */
  label: string
  /** The 3D view, or null without 3D. */
  world: ReactNode | null
  children: ReactNode
}) {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(KEY) !== 'closed'
    } catch {
      return true
    }
  })
  function toggle() {
    const next = !open
    setOpen(next)
    try {
      window.localStorage.setItem(KEY, next ? 'open' : 'closed')
    } catch {
      // Not kept: fine.
    }
  }
  if (!world)
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f1ec]" data-testid={testId}>
        <div className="mx-auto max-w-3xl space-y-4 p-5">{children}</div>
      </div>
    )
  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden bg-slate-900"
      data-testid={testId}
    >
      <div className="absolute inset-0">{world}</div>
      {/* Folded away, the drawer is hidden but stays (conversations shown from it stay visible). */}
      {!open && (
        <button
          type="button"
          onClick={toggle}
          className="absolute top-3 left-3 z-20 rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white shadow ring-1 ring-white/20 hover:bg-black/70"
        >
          ▸ {label}
        </button>
      )}
      <div
        role="region"
        aria-label={label}
        data-testid="drawer"
        className={`absolute top-3 bottom-3 left-3 z-20 flex w-[24rem] max-w-[calc(100%-1.5rem)] flex-col rounded-2xl bg-[#f4f1ec]/95 shadow-2xl ring-1 ring-black/10 ${open ? '' : 'invisible'}`}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {label}
          </p>
          <button
            type="button"
            onClick={toggle}
            className="rounded-md px-2 py-0.5 text-xs text-slate-600 hover:bg-black/5"
          >
            Hide ◂
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  )
}
