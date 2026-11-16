/**
 * Going through a doorway from one 3D place to the next (the street into the
 * café, the flat out to the street): the last picture of the place being left
 * stays on screen, the doorway the player has just walked into, until the next
 * place has drawn itself, then fades. So there is no blank "loading" moment
 * between the two, and the player is seen walking on from the same doorway.
 *
 * The 3D views keep their drawing buffer (`preserveDrawingBuffer`) so the
 * picture can be taken at the moment the player goes through (capture.ts).
 */
import { useEffect, useState } from 'react'
import { held } from './capture'

/** Over the next place's view: the picture, until it is `ready`, then fading out. */
export function Still({ ready }: { ready: boolean }) {
  // Only a picture just taken (going through a door), not one from long ago.
  const [shown] = useState(() =>
    held.still && performance.now() - held.still.at < 8000 ? held.still.url : null,
  )
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (!ready || !shown) return
    held.still = null
    const timer = window.setTimeout(() => setGone(true), 450)
    return () => window.clearTimeout(timer)
  }, [ready, shown])
  if (!shown || gone) return null
  return (
    <img
      src={shown}
      alt=""
      aria-hidden
      data-testid="doorway-still"
      className={`pointer-events-none absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-400 ${
        ready ? 'opacity-0' : 'opacity-100'
      }`}
    />
  )
}
