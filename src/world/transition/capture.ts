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
