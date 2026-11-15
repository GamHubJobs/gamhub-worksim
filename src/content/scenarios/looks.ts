/** Looks for the people in scenarios (see office/scene/people.tsx). */
import type { HairStyle, Outfit, PersonLook } from '../../office/scene/people'

export function look(
  skin: number,
  hair: HairStyle,
  hairColor: number,
  outfit: Outfit,
  top: string,
  trousers: string,
  more: Partial<PersonLook> = {},
): PersonLook {
  return { skin, hair, hairColor, outfit, top, trousers, sleeves: 'long', ...more }
}

/** Dark robes (a long gown, open over a white shirt). */
export const ROBE = (skin: number, hair: HairStyle, hairColor: number, more = {}) =>
  look(skin, hair, hairColor, 'coat', '#111827', '#111827', {
    under: '#f8fafc',
    shoes: '#0f172a',
    ...more,
  })

export const SUIT = (
  skin: number,
  hair: HairStyle,
  hairColor: number,
  color = '#1e293b',
  more = {},
) =>
  look(skin, hair, hairColor, 'blazer', color, color, {
    under: '#f1f5f9',
    tie: '#7f1d1d',
    ...more,
  })

export const SCRUBS = (
  skin: number,
  hair: HairStyle,
  hairColor: number,
  color: string,
  more = {},
) =>
  look(skin, hair, hairColor, 'scrubs', color, color, {
    sleeves: 'short',
    badge: '#0f766e',
    ...more,
  })

/** A hi-vis vest over a navy work polo, with an ID badge. */
export const HI_VIS = (skin: number, hair: HairStyle, hairColor: number, more = {}) =>
  look(skin, hair, hairColor, 'hivis', '#1e3a8a', '#334155', {
    sleeves: 'short',
    badge: '#ea580c',
    shoes: '#3f2d1f',
    ...more,
  })

export const SMART = (
  skin: number,
  hair: HairStyle,
  hairColor: number,
  color: string,
  more = {},
) => look(skin, hair, hairColor, 'shirt', color, '#334155', more)
