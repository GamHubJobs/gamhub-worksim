/** The picture of the place being left (see Still.tsx). */
export const held: { still: { url: string; at: number } | null } = { still: null }

/** Takes the picture now, from the 3D view on screen. */
export function captureStill(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('[role="application"] canvas')
  if (!canvas) return
  try {
    held.still = { url: canvas.toDataURL('image/jpeg', 0.8), at: performance.now() }
  } catch {
    held.still = null
  }
}

/**
 * Takes the picture from this 3D view as it closes (WalkView), unless one was
 * just taken going through a door (a better moment). So every change of place
 * starts from the last picture of the one left.
 */
export function captureOnLeaving(view: HTMLElement | null): void {
  if (held.still && performance.now() - held.still.at < 1500) return
  const canvas = view?.querySelector('canvas')
  if (!canvas) return
  try {
    held.still = { url: canvas.toDataURL('image/jpeg', 0.75), at: performance.now() }
  } catch {
    held.still = null
  }
}

/**
 * A screen between two places (the day's end, the work computer): the last
 * place's picture is not carried past it (the next place fades in from dark).
 */
export function forgetStill(): void {
  held.still = null
}
