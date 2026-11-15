/**
 * A key moment of a story, framed like a film (see game/story/engine.ts
 * keyMoment): black bars close in at the top and bottom of the view, the
 * chapter's title appears over the scene, and a short piece of music plays;
 * then the conversation begins. Skippable at once (the button, Esc, Enter or
 * Space), and quicker and still for anyone who asks the system for less motion.
 */
import { useEffect, useRef, useState } from 'react'
import { audio } from '../../audio/manager'
import type { KeyMoment } from '../../game/story/engine'
import { prefersReducedMotion } from '../../ui/motion'

/** How long the title stays before the scene begins (milliseconds). */
export const CINEMATIC_MS = 3200
const STILL_MS = 1600

export function Cinematic({ moment, onDone }: { moment: KeyMoment; onDone: () => void }) {
  const still = prefersReducedMotion()
  const [shown, setShown] = useState(still)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  const skip = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    audio.cue(moment.kind === 'opening' ? 'chapter' : 'finale')
    // The HUD and the panels step aside while it shows (index.css).
    document.body.dataset.cinematic = 'on'
    skip.current?.focus()
    // The bars close in on the next frame (a transition from open).
    const frame = requestAnimationFrame(() => setShown(true))
    const timer = window.setTimeout(
      () => {
        // Development builds: held on screen for checking (browser tests set this).
        if (
          import.meta.env.DEV &&
          (window as unknown as { __worksimHoldCinematic?: boolean })
            .__worksimHoldCinematic
        )
          return
        done.current()
      },
      still ? STILL_MS : CINEMATIC_MS,
    )
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopImmediatePropagation()
        done.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey, true)
      delete document.body.dataset.cinematic
    }
  }, [moment.kind, still])
  const bar = `pointer-events-none absolute inset-x-0 h-[13%] bg-black ${
    still ? '' : 'transition-transform duration-700 ease-out'
  }`
  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-label={`Chapter ${moment.number}: ${moment.chapter}`}
      data-testid="cinematic"
      data-kind={moment.kind}
    >
      <div className={`${bar} top-0 ${shown ? 'translate-y-0' : '-translate-y-full'}`} />
      <div
        className={`${bar} bottom-0 ${shown ? 'translate-y-0' : 'translate-y-full'}`}
      />
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white ${
          still ? '' : 'transition-opacity delay-300 duration-1000'
        } ${shown ? 'opacity-100' : 'opacity-0'}`}
        style={{ textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}
        aria-live="polite"
      >
        <p className="text-xs font-semibold tracking-[0.3em] uppercase opacity-90">
          {moment.kind === 'opening'
            ? `Chapter ${moment.number}`
            : `The end of chapter ${moment.number}`}
        </p>
        <p className="mt-2 text-3xl font-semibold sm:text-4xl">
          {/* The chapter is numbered above: not twice. */}
          {moment.chapter.replace(/^Chapter \d+\s*[·:-]\s*/, '')}
        </p>
        <p className="mt-2 text-sm italic opacity-90">{moment.campaign}</p>
      </div>
      <button
        ref={skip}
        type="button"
        onClick={() => done.current()}
        className="absolute right-4 bottom-[calc(13%+0.75rem)] rounded-md bg-black/60 px-3 py-1.5 text-sm text-white ring-1 ring-white/40 hover:bg-black/80"
      >
        Skip (Esc)
      </button>
    </div>
  )
}
