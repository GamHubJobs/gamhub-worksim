/**
 * What people wear to work in each kind of workplace (see people.tsx): on the
 * ward, scrubs in the colours of their role and a lanyard (the ward manager
 * in navy, a white clinical coat for the pharmacist); in an engineering
 * workshop, a hi-vis vest over a work polo; at a law firm, dark suits; in a
 * software team, more casual clothes; everywhere else, office clothes with a
 * staff badge. The same people (the office's cast) are dressed for the place.
 */
import type { PersonLook } from './people'

type Kind =
  | 'ward'
  | 'workshop'
  | 'courtroom'
  | 'devteam'
  | 'records'
  | 'insights'
  | 'postroom'
  | 'studio'
  | string

/** Scrub colours on the ward, by role (as UK hospitals tell staff apart). */
const SCRUB = {
  manager: '#1e3a8a', // ward manager: navy
  senior: '#0e7490', // senior staff nurse: teal
  nurse: '#3b82f6', // staff nurse: blue
  hca: '#0d9488', // healthcare assistant: green-teal
  student: '#7dd3fc', // student: light blue
}

/** How one of the office's cast is dressed in this workplace. */
export function dressFor(kind: Kind, id: string, look: PersonLook): PersonLook {
  const badge = (colour: string): PersonLook => ({ ...look, badge: colour })
  switch (kind) {
    case 'ward': {
      if (id === 'reception') return badge('#0f766e')
      if (id === 'facilities')
        return {
          ...look,
          outfit: 'polo',
          top: '#475569',
          trousers: '#1f2937',
          badge: '#0f766e',
        }
      if (id === 'analyst')
        return {
          ...look,
          outfit: 'coat',
          top: '#f8fafc',
          under: '#dbeafe',
          trousers: '#334155',
          badge: '#0f766e',
        }
      const colour =
        id === 'manager'
          ? SCRUB.manager
          : id === 'senior'
            ? SCRUB.senior
            : id === 'starter'
              ? SCRUB.student
              : id === 'backL' || id === 'front2'
                ? SCRUB.nurse
                : SCRUB.hca
      return {
        ...look,
        outfit: 'scrubs',
        top: colour,
        trousers: colour,
        sleeves: 'short',
        tie: undefined,
        shoes: '#e5e7eb',
        badge: '#0f766e',
        stethoscope: id === 'senior' || id === 'backL' || id === 'manager',
      }
    }
    case 'workshop': {
      if (id === 'reception' || id === 'manager') return badge('#ea580c')
      return {
        ...look,
        outfit: 'hivis',
        top: '#1e3a8a',
        trousers: '#334155',
        sleeves: 'short',
        tie: undefined,
        shoes: '#3f2d1f',
        badge: '#ea580c',
      }
    }
    case 'courtroom': {
      if (id === 'facilities') return badge('#7f1d1d')
      const dark = ['#334155', '#2b3a55', '#3f3f46', '#374151'][id.length % 4]
      return {
        ...look,
        outfit: 'blazer',
        top: dark,
        trousers: dark,
        under: '#f8fafc',
        tie:
          look.hair === 'bun' || look.hair === 'long' || look.hair === 'bob'
            ? undefined
            : '#7f1d1d',
        shoes: '#0f172a',
        badge: undefined,
      }
    }
    case 'devteam': {
      if (id === 'backM' || id === 'starter')
        return {
          ...look,
          outfit: 'hoodie',
          top: id === 'backM' ? '#334155' : '#4f46e5',
          badge: '#16a34a',
        }
      return badge('#16a34a')
    }
    default:
      return badge('#1d4ed8')
  }
}

/** The whole cast, dressed for the workplace. */
export function dressAll(
  kind: Kind,
  looks: Record<string, PersonLook>,
): Record<string, PersonLook> {
  return Object.fromEntries(
    Object.entries(looks).map(([id, look]) => [id, dressFor(kind, id, look)]),
  )
}

/** What the player wears at work (the trainee's version of the place's clothes). */
export function playerWorkwear(kind: Kind, base: PersonLook): PersonLook {
  switch (kind) {
    case 'ward':
      return {
        ...base,
        outfit: 'scrubs',
        top: SCRUB.student,
        trousers: SCRUB.student,
        sleeves: 'short',
        tie: undefined,
        shoes: '#e5e7eb',
        badge: '#0f766e',
      }
    case 'workshop':
      return {
        ...base,
        outfit: 'hivis',
        top: '#1e3a8a',
        trousers: '#334155',
        sleeves: 'short',
        tie: undefined,
        shoes: '#3f2d1f',
        badge: '#ea580c',
      }
    case 'courtroom':
      return {
        ...base,
        outfit: 'blazer',
        top: '#2b3a55',
        trousers: '#2b3a55',
        under: '#f8fafc',
        tie: '#7f1d1d',
        shoes: '#0f172a',
      }
    case 'devteam':
      return {
        ...base,
        outfit: 'shirt',
        top: '#e0e7ff',
        tie: undefined,
        badge: '#16a34a',
      }
    default:
      return {
        ...base,
        outfit: 'shirt',
        top: '#dbeafe',
        tie: '#1e3a8a',
        badge: '#1d4ed8',
      }
  }
}
