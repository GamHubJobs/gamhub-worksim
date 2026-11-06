/**
 * The phone's camera: a picture of what the 3D view shows (the view on screen
 * registers how to take one), kept on this device, newest first, small enough
 * that a dozen fit easily.
 */
const KEY = 'worksim.photos.v1'
const KEEP = 12

export interface Photo {
  id: string
  at: number
  /** A JPEG, as a data URL. */
  src: string
}

let capture: (() => string | null) | null = null

/** The 3D view on screen says how to take a picture of it (null when it goes). */
export function setCapture(fn: (() => string | null) | null): void {
  capture = fn
}

export function canTakePhoto(): boolean {
  return capture !== null
}

export function photos(): Photo[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Photo[]) : []
  } catch {
    return []
  }
}

/** Takes a picture, keeps it (the oldest go past a dozen), and returns it. */
export async function takePhoto(): Promise<Photo | null> {
  const full = capture?.()
  if (!full) return null
  const src = await shrink(full, 480)
  const photo = { id: `p${Date.now()}`, at: Date.now(), src }
  const all = [photo, ...photos()].slice(0, KEEP)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Storage full: keep fewer.
    window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 4)))
  }
  return photo
}

export function deletePhoto(id: string): void {
  window.localStorage.setItem(KEY, JSON.stringify(photos().filter((p) => p.id !== id)))
}

function shrink(src: string, width: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, width / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}
