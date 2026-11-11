/**
 * What the places' interiors share that is not a component: what the player
 * can do there (given by the page), the player's look, and paintings for
 * signs and menus (drawn on a canvas, used as textures).
 */
import { createContext, useContext, useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { PersonLook } from '../../../office/scene/people'

/** One thing the player can do here, as the list beside the 3D view shows it. */
export interface Doing {
  id: string
  label: string
  /** Cost and time, e.g. "£4.80 · 30 min". */
  detail: string
  /** Why it cannot be done now, if not. */
  blocked: string | null
}

export interface InteriorState {
  doings: Record<string, Doing>
  act: (id: string) => void
  /** Evening light (dark outside) or morning. */
  dark: boolean
  /** Fewer people and lights on computers that draw 3D in software. */
  low: boolean
  /** The last thing the player did here (they are shown there). */
  last: string | null
  /** Someone waiting here for a date with the player (their id), if anyone. */
  date?: string | null
  /** The player's wedding, here today (their partner's id), if it is. */
  wedding?: string | null
  /** The game day and clock, for the customers' comings and goings. */
  day?: number
  minute?: number
}

export const Interior = createContext<InteriorState>({
  doings: {},
  act: () => {},
  dark: false,
  low: false,
  last: null,
})

export const useInterior = () => useContext(Interior)

/** The player, as on the street. */
export const PLAYER: PersonLook = {
  skin: 3,
  hair: 'short',
  hairColor: 0,
  outfit: 'sweater',
  top: '#0f766e',
  trousers: '#334155',
  smile: true,
}

export interface Painting {
  width: number
  height: number
  background: string
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void
}

export function usePainted({ width, height, background, draw }: Painting, key: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const g = canvas.getContext('2d')
    if (g) {
      g.fillStyle = background
      g.fillRect(0, 0, width, height)
      draw(g, width, height)
    }
    const made = new CanvasTexture(canvas)
    made.colorSpace = SRGBColorSpace
    made.anisotropy = 4
    return made
    // The key says when the painting changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

/** Lines of text on a board, e.g. a menu: a title and rows of name and price. */
export function menuPainting(
  title: string,
  rows: Array<[string, string]>,
  colours: { background: string; ink: string; accent: string; font?: string },
): Painting {
  return {
    width: 512,
    height: 384,
    background: colours.background,
    draw(g, w, h) {
      g.fillStyle = colours.accent
      g.font = `700 46px ${colours.font ?? 'Georgia, serif'}`
      g.textAlign = 'center'
      g.textBaseline = 'top'
      g.fillText(title, w / 2, 24, w - 40)
      g.fillRect(w * 0.2, 84, w * 0.6, 3)
      g.font = `400 30px ${colours.font ?? 'Georgia, serif'}`
      rows.forEach(([name, price], i) => {
        const y = 110 + i * ((h - 130) / Math.max(rows.length, 1))
        g.fillStyle = colours.ink
        g.textAlign = 'left'
        g.fillText(name, 34, y, w - 170)
        g.textAlign = 'right'
        g.fillText(price, w - 34, y)
      })
    },
  }
}

/** A short sign: one or two words, centred. */
export function signPainting(text: string, background: string, ink: string): Painting {
  return {
    width: 512,
    height: 128,
    background,
    draw(g, w, h) {
      g.fillStyle = ink
      g.font = '700 64px system-ui, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, w / 2, h / 2 + 4, w - 32)
    },
  }
}
