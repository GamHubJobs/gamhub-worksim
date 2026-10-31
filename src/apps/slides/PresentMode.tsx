/**
 * Presentation mode: the slides full screen, one at a time. Next: → , Space,
 * Page Down or a click. Back: ← or Page Up. Escape ends the presentation.
 */
import { useEffect, useRef, useState } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH, type SlidesContent } from '../../persistence/schemas'
import { SlideView } from './SlideView'

export function PresentMode({
  content,
  startAt,
  onExit,
}: {
  content: SlidesContent
  startAt: number
  onExit: () => void
}) {
  const [index, setIndex] = useState(startAt)
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const root = useRef<HTMLDivElement>(null)
  const count = content.slides.length

  useEffect(() => {
    const element = root.current
    element?.focus()
    // Full screen where the browser allows it; the overlay works either way.
    element?.requestFullscreen?.().catch(() => {})
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight })
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && element?.dataset.wasFullscreen) onExit()
      if (document.fullscreenElement && element) element.dataset.wasFullscreen = 'yes'
    }
    window.addEventListener('resize', onResize)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [onExit])

  const width = Math.min(size.width, (size.height * SLIDE_WIDTH) / SLIDE_HEIGHT)
  const go = (by: number) => setIndex((i) => Math.min(count - 1, Math.max(0, i + by)))

  return (
    <div
      ref={root}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black outline-none"
      role="dialog"
      aria-label="Presentation"
      data-testid="presentation"
      onKeyDown={(event) => {
        if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(event.key)) {
          event.preventDefault()
          go(1)
        } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(event.key)) {
          event.preventDefault()
          go(-1)
        } else if (event.key === 'Escape') {
          onExit()
        } else if (event.key === 'Home') {
          setIndex(0)
        } else if (event.key === 'End') {
          setIndex(count - 1)
        }
      }}
      onClick={() => go(1)}
    >
      <SlideView slide={content.slides[index]} theme={content.theme} width={width} />
      <div className="absolute right-4 bottom-3 flex items-center gap-3 text-sm text-white/70">
        <span data-testid="slide-counter">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onExit()
          }}
          className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
        >
          End (Esc)
        </button>
      </div>
    </div>
  )
}
