/**
 * The resolution for 3D drawn in software (no graphics card): a fixed budget of
 * pixels, so a full-screen view costs no more than the small view used to
 * (about 120,000 pixels, the old 640 × 448 view at half resolution). Softer,
 * but the rest of the app stays responsive. With a graphics card, not used.
 */
export function lowDpr(max = 0.5): number {
  if (typeof window === 'undefined') return max
  const area = window.innerWidth * window.innerHeight
  return Math.max(0.3, Math.min(max, Math.sqrt(120_000 / Math.max(1, area))))
}
