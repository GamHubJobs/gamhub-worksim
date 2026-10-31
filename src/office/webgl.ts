/** True if this browser can show 3D graphics (WebGL). */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    return context !== null
  } catch {
    return false
  }
}
