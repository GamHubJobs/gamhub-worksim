/**
 * The next-step bar: always on screen (bottom left, clear of the controls),
 * saying the one thing to do next. What the screen in front says (a live,
 * state-aware hint, see appHints.ts) comes first; otherwise the game's own
 * next step (game/nextStep.ts). Beginners see how to do it and the keys;
 * experienced players see the short version, with More for the detail.
 *
 * It can be collapsed to a small "Next step" button (remembered), and it
 * offers the guided tour to a player who has not taken it.
 */
import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { HudSlot } from '../ui/hud/Hud'
import { useHud } from '../ui/hud/hudContext'
import type { NextStep } from '../game/nextStep'
import { Icon } from '../ui/Icon'
import { useCurrentAppHint } from './appHints'

/** A narrow screen (a phone, or a tablet held upright), following resizes and turns. */
function useNarrow(): boolean {
  const query = '(max-width: 760px)'
  return useSyncExternalStore(
    (change) => {
      const m = window.matchMedia?.(query)
      m?.addEventListener('change', change)
      return () => m?.removeEventListener('change', change)
    },
    () => !!window.matchMedia?.(query).matches,
    () => false,
  )
}

export function GuideBar({
  step,
  beginner,
  collapsed,
  place,
  onCollapse,
  offerTour,
  onTour,
}: {
  step: NextStep
  beginner: boolean
  collapsed: boolean
  place: 'office' | 'computer'
  onCollapse: (collapsed: boolean) => void
  /** Suggest the introductory tour (not taken yet). */
  offerTour: boolean
  onTour: () => void
}) {
  const live = useCurrentAppHint()
  const hud = useHud()
  const shown: NextStep = live ?? step
  const [more, setMore] = useState<boolean | null>(null)
  // On a narrow screen the detail starts closed (More opens it), so the card stays small.
  const narrow = useNarrow()
  const open = more ?? (beginner && !narrow)
  const position = place === 'office' ? 'left-4 bottom-4' : 'left-2 bottom-12'

  // At the computer the next step is a strip docked above the taskbar: the
  // windows' area ends above it, so it never covers an app. Its detail opens
  // upwards only when asked for.
  if (place === 'computer')
    return (
      <div
        className="flex h-7 shrink-0 items-center gap-2 border-t border-slate-700 bg-slate-900 px-3 text-xs text-white"
        aria-label="Next step"
        role="region"
        data-tour="guide-bar"
        data-testid="guide-bar"
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        <button
          type="button"
          onClick={() => onCollapse(!collapsed)}
          className="flex shrink-0 items-center gap-1 rounded px-1 text-amber-200 hover:bg-white/10"
          aria-label={collapsed ? 'Show the next step' : 'Collapse the next step'}
          title={collapsed ? 'Show the next step' : 'Collapse'}
        >
          <Icon name="hint" className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-semibold tracking-wide uppercase">Next step</span>
        </button>
        {!collapsed && (
          <>
            <span
              className="min-w-0 flex-1 truncate font-medium"
              aria-live="polite"
              data-testid="next-step"
              title={shown.detail ?? shown.text}
            >
              {shown.text}
            </span>
            {shown.detail && (
              <button
                type="button"
                onClick={() => setMore(!(more ?? false))}
                className="shrink-0 rounded px-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-expanded={more ?? false}
              >
                {more ? 'Less' : 'More'}
              </button>
            )}
            {offerTour && (
              <button
                type="button"
                onClick={onTour}
                className="shrink-0 font-medium text-amber-200 underline"
              >
                Take the guided tour
              </button>
            )}
            {more && shown.detail && (
              <div className="fixed bottom-[4.5rem] left-2 z-[60] w-[min(28rem,calc(100vw-1rem))] rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 shadow-xl ring-1 ring-white/10">
                {shown.detail}
                {shown.keys && shown.keys.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-1">
                    {shown.keys.map((k) => (
                      <kbd key={k} className="rounded bg-white/15 px-1.5">
                        {k}
                      </kbd>
                    ))}
                  </p>
                )}
                {shown.optional && (
                  <p className="mt-1 text-slate-300">Optional: {shown.optional}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )

  const inGrid = !!hud?.zones['bottom-left']
  const at = inGrid ? '' : `fixed ${position} z-[60]`
  const small = collapsed || hud?.mode === 'dialogue'
  const slot = (node: ReactNode) => <HudSlot zone="bottom-left">{node}</HudSlot>

  if (small)
    return slot(
      <button
        type="button"
        onClick={() => onCollapse(false)}
        className={`onsite-hide ${at} flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-slate-800`}
        data-tour="guide-bar"
        data-testid="guide-bar"
        data-collapsed="true"
        title="Show the next step"
      >
        <Icon name="hint" className="h-3.5 w-3.5 text-amber-300" />
        Next step
      </button>,
    )

  return slot(
    <aside
      className={`onsite-hide ${inGrid ? '' : 'pointer-events-none'} ${at} w-[min(26rem,calc(100vw-1rem))] max-w-full rounded-xl bg-slate-900/92 p-3 text-sm text-white shadow-xl ring-1 ring-white/10 backdrop-blur`}
      aria-label="Next step"
      data-tour="guide-bar"
      data-testid="guide-bar"
      data-collapsed="false"
    >
      <div className="flex items-start gap-2">
        <Icon name="hint" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-amber-200 uppercase">
            Next step
          </p>
          <p className="font-medium" aria-live="polite" data-testid="next-step">
            {shown.text}
          </p>
          {open && shown.detail && (
            <p className="mt-1 text-xs leading-relaxed text-slate-200">{shown.detail}</p>
          )}
          {open && shown.keys && shown.keys.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1" aria-label="Keys">
              {shown.keys.map((k) => (
                <kbd key={k} className="rounded bg-white/15 px-1.5 text-[11px]">
                  {k}
                </kbd>
              ))}
            </p>
          )}
          {shown.optional && (
            <p className="mt-1 text-xs text-slate-300">Optional: {shown.optional}</p>
          )}
          {offerTour && (
            <button
              type="button"
              onClick={onTour}
              className="pointer-events-auto mt-1.5 text-xs font-medium text-amber-200 underline"
            >
              New here? Take the guided tour
            </button>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => onCollapse(true)}
            className="pointer-events-auto rounded px-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Collapse the next step"
            title="Collapse"
          >
            ▾
          </button>
          {shown.detail && (
            <button
              type="button"
              onClick={() => setMore(!open)}
              className="pointer-events-auto rounded px-1.5 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {open ? 'Less' : 'More'}
            </button>
          )}
        </div>
      </div>
    </aside>,
  )
}
