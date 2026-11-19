/**
 * Whether this computer gets the opening's flight over the city: not with
 * reduced motion, not on Low graphics, and not without a graphics card (3D
 * drawn in software, or no WebGL at all): there, the logo and loading only.
 */
import { graphicsQuality } from '../ui/graphics'
import { prefersReducedMotion } from '../ui/motion'

export function canFly(): boolean {
  try {
    // (A test of the flight itself can ask for it on any computer.)
    if (globalThis.localStorage?.getItem('worksim.opening.test') === 'fly') return true
  } catch {
    // Storage blocked: decided as below.
  }
  if (prefersReducedMotion() || graphicsQuality() === 'low') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    )
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer)
  } catch {
    return false
  }
}

/**
 * A test of the flight on a computer without a graphics card (canFly above):
 * the city takes far longer to build there, so the opening waits for it.
 */
export function forcedFlight(): boolean {
  try {
    return globalThis.localStorage?.getItem('worksim.opening.test') === 'fly'
  } catch {
    return false
  }
}
