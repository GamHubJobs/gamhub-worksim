/**
 * Changing place (WalkView): the last picture of the place left stays on
 * screen (the doorway just walked into, or the room just left) until the next
 * place has drawn itself, then fades. With no picture (coming from the work
 * computer, or the first place of the day), a dark curtain fades instead. So
 * there is never a blank "loading" moment or a cut.
 *
 * It lifts when the place has really drawn itself (the player rig's first
 * frames, once the place is built and its shaders compiled), however long a
 * slow computer takes. After a moment it says the place is on its way, and it
 * lifts anyway after 15 seconds, so it is never left over a place that cannot
 * draw.
 *
 * The 3D views keep their drawing buffer (`preserveDrawingBuffer`) so the
 * picture can be taken as the player leaves (capture.ts).
 */
import { useEffect, useState } from 'react'
import { MOTION, motionMs } from '../../ui/motion'
import { held } from './capture'

/** The longest the curtain stays (a safety net: it lifts when the place is drawn). */
const MOST_MS = 15_000
/** After this long, it says the place is on its way. */
const SAY_MS = 1500

export function Curtain({ ready }: { ready: boolean }) {
  // Only a picture just taken (leaving the last place), not one from long ago.
  const [shown] = useState(() =>
    held.still && performance.now() - held.still.at < 8000 ? held.still.url : null,
  )
  const [late, setLate] = useState(false)
  const [slow, setSlow] = useState(false)
  const [gone, setGone] = useState(false)
  const lifting = ready || late
  useEffect(() => {
    held.still = null
    const most = window.setTimeout(() => setLate(true), MOST_MS)
    const say = window.setTimeout(() => setSlow(true), SAY_MS)
    return () => {
      window.clearTimeout(most)
      window.clearTimeout(say)
    }
  }, [])
  useEffect(() => {
    if (!lifting) return
    const t = window.setTimeout(() => setGone(true), motionMs(MOTION.scene) + 50)
    return () => window.clearTimeout(t)
  }, [lifting])
  if (gone) return null
  const fade = `pointer-events-none absolute inset-0 z-10 h-full w-full transition-opacity ease-out ${
    lifting ? 'opacity-0' : 'opacity-100'
  }`
  const timing = { transitionDuration: `${MOTION.scene}ms` }
  return (
    <>
      {shown ? (
        <img
          src={shown}
          alt=""
          aria-hidden
          data-testid="doorway-still"
          className={`${fade} object-cover`}
          style={timing}
        />
      ) : (
        <div
          aria-hidden
          data-testid="scene-curtain"
          className={`${fade} bg-slate-950`}
          style={timing}
        />
      )}
      {slow && !lifting && (
        <p
          role="status"
          data-testid="scene-arriving"
          className="motion-fade pointer-events-none absolute inset-x-0 bottom-24 z-10 text-center text-sm font-medium text-white/90 drop-shadow"
        >
          Arriving…
        </p>
      )}
    </>
  )
}
