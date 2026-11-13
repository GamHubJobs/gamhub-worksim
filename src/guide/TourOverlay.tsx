/**
 * A guided tour on the real screen: a spotlight around the part being
 * explained (the rest dims), and a card beside it, placed where it does not
 * cover the part, with the step, Back, Next, Skip and Pause. The arrow keys
 * move between steps; Esc pauses (the tour can be resumed from Help).
 *
 * The overlay does not block the screen: the player can still use what is
 * highlighted. A part that is not on screen (an app showing its file list)
 * is explained over its window, or in the middle.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Tour, TourStep } from './tours'

type Rect = { x: number; y: number; w: number; h: number }

const PAD = 8
const CARD_W = 340

function find(step: TourStep): Element | null {
  if (!step.target) return null
  for (const selector of step.target.split(/,(?![^[]*\])/)) {
    const el = document.querySelector(selector.trim())
    if (el && (el as HTMLElement).getClientRects().length) return el
  }
  // A part inside a window that is not on screen: the window itself.
  const window = step.target.match(/^\[data-testid="window-[^"]+"\]/)?.[0]
  const fallback = window ? document.querySelector(window) : null
  return fallback && (fallback as HTMLElement).getClientRects().length ? fallback : null
}

function rectOf(el: Element | null): Rect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

/** Where the card goes: beside the spotlight on the side with the most room, never over it. */
function cardPlace(rect: Rect | null, cardH: number): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(CARD_W, vw - 24)
  if (!rect) return { left: (vw - w) / 2, top: Math.max(12, (vh - cardH) / 2) }
  const clampX = (x: number) => Math.min(Math.max(12, x), vw - w - 12)
  const clampY = (y: number) => Math.min(Math.max(12, y), vh - cardH - 12)
  const below = vh - (rect.y + rect.h)
  const above = rect.y
  const right = vw - (rect.x + rect.w)
  const left = rect.x
  if (below >= cardH + 24) return { left: clampX(rect.x), top: rect.y + rect.h + PAD + 8 }
  if (above >= cardH + 24) return { left: clampX(rect.x), top: rect.y - cardH - PAD - 8 }
  if (right >= w + 24) return { left: rect.x + rect.w + PAD + 8, top: clampY(rect.y) }
  if (left >= w + 24) return { left: rect.x - w - PAD - 8, top: clampY(rect.y) }
  // The part fills the screen: the card sits inside it, at the bottom right.
  return { left: vw - w - 24, top: vh - cardH - 24 }
}

export function TourOverlay({
  tour,
  index,
  onStep,
  prepare,
  onExit,
}: {
  tour: Tour
  /** The step shown (kept by the caller, so moving between the office and the computer keeps it). */
  index: number
  onStep: (index: number) => void
  /** Gets the screen ready for a step (the office or the computer, an app opened). */
  prepare: (step: TourStep) => void
  /** Finished, skipped, or paused at a step. */
  onExit: (status: 'done' | 'skipped' | 'paused', step: number) => void
}) {
  const step = tour.steps[Math.min(index, tour.steps.length - 1)]
  const [rect, setRect] = useState<Rect | null>(null)
  const [missing, setMissing] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(220)
  const prep = useRef(prepare)
  useEffect(() => {
    prep.current = prepare
  })

  // Each step: get the screen ready, find the part (it may take a moment to appear),
  // bring it into view, and follow it if it moves.
  useEffect(() => {
    prep.current(step)
    let tries = 0
    let el: Element | null = null
    let cancelled = false
    const look = () => {
      if (cancelled) return
      el = find(step)
      if (el || tries > 25 || !step.target) {
        if (el)
          (el as HTMLElement).scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
        setMissing(!!step.target && !el)
        setRect(rectOf(el))
        return
      }
      tries++
      window.setTimeout(look, 80)
    }
    look()
    const follow = window.setInterval(() => {
      if (!el?.isConnected) el = find(step)
      const next = rectOf(el)
      setRect((r) =>
        r &&
        next &&
        Math.abs(r.x - next.x) +
          Math.abs(r.y - next.y) +
          Math.abs(r.w - next.w) +
          Math.abs(r.h - next.h) <
          1
          ? r
          : next,
      )
    }, 250)
    return () => {
      cancelled = true
      window.clearInterval(follow)
    }
  }, [step])

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight)
  }, [index, rect])

  const last = index === tour.steps.length - 1
  const next = () => (last ? onExit('done', index) : onStep(index + 1))
  const back = () => onStep(Math.max(0, index - 1))
  const keys = useRef({ next, back, pause: () => onExit('paused', index) })
  useEffect(() => {
    keys.current = { next, back, pause: () => onExit('paused', index) }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest?.(
        'input, textarea, select, [contenteditable="true"]',
      )
      if (typing) return
      if (e.key === 'ArrowRight') keys.current.next()
      else if (e.key === 'ArrowLeft') keys.current.back()
      else if (e.key === 'Escape') {
        e.stopPropagation()
        keys.current.pause()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const place = cardPlace(rect, cardH)
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[95]"
      data-testid="tour"
      data-tour-id={tour.id}
      data-step={index}
    >
      {rect ? (
        <>
          {/* The dimmed screen: four panels around the spotlight. */}
          {(() => {
            const l = Math.max(0, rect.x - PAD)
            const t = Math.max(0, rect.y - PAD)
            const r = rect.x + rect.w + PAD
            const btm = rect.y + rect.h + PAD
            const dim = 'absolute bg-slate-900/55 transition-all duration-300'
            return (
              <>
                <div
                  aria-hidden
                  className={dim}
                  style={{ left: 0, top: 0, right: 0, height: t }}
                />
                <div
                  aria-hidden
                  className={dim}
                  style={{ left: 0, top: btm, right: 0, bottom: 0 }}
                />
                <div
                  aria-hidden
                  className={dim}
                  style={{ left: 0, top: t, width: l, height: btm - t }}
                />
                <div
                  aria-hidden
                  className={dim}
                  style={{ left: r, top: t, right: 0, height: btm - t }}
                />
              </>
            )
          })()}
          <div
            aria-hidden
            className="absolute rounded-lg border-4 border-amber-400 transition-all duration-300"
            style={{
              left: rect.x - PAD,
              top: rect.y - PAD,
              width: rect.w + PAD * 2,
              height: rect.h + PAD * 2,
            }}
            data-testid="tour-spotlight"
          />
        </>
      ) : (
        <div aria-hidden className="absolute inset-0 bg-slate-900/55" />
      )}
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        className="pointer-events-auto absolute rounded-xl bg-white p-4 shadow-2xl ring-1 ring-slate-200 transition-[left,top] duration-300"
        style={{
          left: place.left,
          top: place.top,
          width: Math.min(CARD_W, window.innerWidth - 24),
        }}
        data-testid="tour-card"
      >
        <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase">
          {tour.title} · step {index + 1} of {tour.steps.length}
        </p>
        <h2 id="tour-title" className="mt-1 text-base font-semibold text-slate-900">
          {step.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-700" aria-live="polite">
          {step.body}
        </p>
        {missing && (
          <p className="mt-1 text-xs text-slate-500">
            This part shows once it is open; it is explained here meanwhile.
          </p>
        )}
        <div className="mt-2 flex gap-1" aria-hidden>
          {tour.steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-amber-500' : 'bg-slate-200'}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onExit('skipped', index)}
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={() => onExit('paused', index)}
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            title="Pause: resume it later from Help"
          >
            Pause
          </button>
          <span className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={back}
              disabled={index === 0}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              autoFocus
              className="rounded-md bg-blue-700 px-3 py-1 text-sm font-medium text-white hover:bg-blue-800"
            >
              {last ? 'Finish' : 'Next'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
