/**
 * Changing place (WalkView): the last picture of the place left stays on
 * screen (the doorway just walked into, or the room just left) until the next
 * place has drawn itself, then fades. With no picture (coming from the work
 * computer, or the first place of the day), a dark curtain fades instead. So
 * there is never a blank "loading" moment or a cut, and it never stays: it
 * lifts after a few seconds at most.
 *
 * The 3D views keep their drawing buffer (`preserveDrawingBuffer`) so the
 * picture can be taken as the player leaves (capture.ts).
 */
import { useEffect, useState } from 'react'
import { MOTION, motionMs } from '../../ui/motion'
import { held } from './capture'

/** The longest the curtain stays, however long the place takes to draw. */
const MOST_MS = 4000

export function Curtain({ ready }: { ready: boolean }) {
  // Only a picture just taken (leaving the last place), not one from long ago.
  const [shown] = useState(() =>
    held.still && performance.now() - held.still.at < 8000 ? held.still.url : null,
  )
  const [late, setLate] = useState(false)
  const [gone, setGone] = useState(false)
  const lifting = ready || late
  useEffect(() => {
    held.still = null
    const t = window.setTimeout(() => setLate(true), MOST_MS)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!lifting) return
    const t = window.setTimeout(() => setGone(true), motionMs(MOTION.scene) + 50)
    return () => window.clearTimeout(t)
  }, [lifting])
  if (gone) return null
  const style = `pointer-events-none absolute inset-0 z-10 h-full w-full transition-opacity ease-out ${
    lifting ? 'opacity-0' : 'opacity-100'
  }`
  return shown ? (
    <img
      src={shown}
      alt=""
      aria-hidden
      data-testid="doorway-still"
      className={`${style} object-cover`}
      style={{ transitionDuration: `${MOTION.scene}ms` }}
    />
  ) : (
    <div
      aria-hidden
      data-testid="scene-curtain"
      className={`${style} bg-slate-950`}
      style={{ transitionDuration: `${MOTION.scene}ms` }}
    />
  )
}
