/**
 * What colleagues and people in town wear besides their clothes (accessories,
 * content/accessories.ts; drawn by world/character/accessories3d.tsx), fitting
 * their profession and where they are: a fob watch and a scrub cap on the ward,
 * safety glasses, ear defenders and a tool belt in the workshop, a dress watch
 * and a signet ring at a law firm, headphones in the dev team, a camera round a
 * marketer's neck, a headset on the service desk; and, in town, bags, caps,
 * earbuds and sunglasses. Picked from the person's id, so each person keeps the
 * same things and no two casts look alike. Pure.
 */
import { getAccessory, type Slot } from '../../content/accessories'
import type { Wear } from '../../world/character/accessoryLook'
import type { PersonLook } from './people'

/** A fixed number from 0 to 1 for a person and a question. */
function pick(id: string, what: string): number {
  let h = 2166136261
  for (const ch of `${id}:${what}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

function item(id: string, person: string): Wear | null {
  const a = getAccessory(id)
  if (!a) return null
  const colour = a.colours[Math.floor(pick(person, `colour:${id}`) * a.colours.length)]
  return { model: a.model, slot: a.slot, colour }
}

/** One of these, or none (with the chance of one). */
function oneOf(person: string, what: string, chance: number, ids: string[]): Wear | null {
  if (pick(person, what) >= chance) return null
  return item(ids[Math.floor(pick(person, `${what}:which`) * ids.length)], person)
}

/** At work, by the kind of workplace (people.tsx's cast). */
export function workWear(kind: string, id: string, look: PersonLook): Wear[] {
  const out: Array<Wear | null> = []
  // Most people wear a watch.
  const watch = (ids: string[]) => out.push(oneOf(id, 'watch', 0.7, ids))
  switch (kind) {
    case 'ward':
      // Bare below the elbows: a fob watch on the chest instead of a wristwatch.
      if (id !== 'reception' && id !== 'facilities' && id !== 'analyst')
        out.push(item('fob-watch', id))
      out.push(oneOf(id, 'cap', 0.3, ['scrub-cap']))
      break
    case 'workshop':
      if (id !== 'reception' && id !== 'manager') {
        out.push(item('glasses-safety', id))
        out.push(oneOf(id, 'ears', 0.35, ['earmuffs']))
        out.push(oneOf(id, 'belt', 0.5, ['tool-belt']))
        out.push(item('safety-boots', id))
        out.push(oneOf(id, 'gloves', 0.4, ['work-gloves']))
      }
      watch(['watch-digital', 'fitness-tracker'])
      break
    case 'courtroom':
      watch(['watch-classic', 'watch-dress', 'watch-classic'])
      out.push(oneOf(id, 'ring', 0.3, ['ring-signet', 'ring-band']))
      out.push(item('formal-shoes', id))
      if (!look.glasses) out.push(oneOf(id, 'eyes', 0.3, ['glasses-reading']))
      break
    case 'devteam':
      watch(['watch-smart', 'fitness-tracker'])
      out.push(oneOf(id, 'ears', 0.4, ['headphones', 'earbuds']))
      out.push(oneOf(id, 'feet', 0.5, ['sneakers']))
      if (!look.glasses) out.push(oneOf(id, 'eyes', 0.25, ['glasses-computer']))
      break
    case 'studio':
      watch(['watch-smart', 'fitness-tracker', 'watch-classic'])
      out.push(oneOf(id, 'neck', 0.3, ['camera']))
      out.push(oneOf(id, 'ears', 0.25, ['headphones']))
      break
    case 'records':
    case 'postroom':
      watch(['watch-classic', 'watch-digital'])
      if (!look.glasses) out.push(oneOf(id, 'eyes', 0.3, ['glasses-reading']))
      out.push(oneOf(id, 'bracelet', 0.25, ['bracelet-chain', 'bangle-silver']))
      break
    case 'insights':
      watch(['watch-smart', 'watch-classic'])
      if (!look.glasses) out.push(oneOf(id, 'eyes', 0.3, ['glasses-computer']))
      break
    default:
      // The IT service desk's own floor (and any office): headsets on the front desk.
      watch(['watch-classic', 'watch-smart', 'fitness-tracker'])
      if (id === 'front2' || id === 'backR') out.push(item('headset-comms', id))
      if (id === 'senior') out.push(item('esd-strap', id))
      break
  }
  out.push(
    oneOf(id, 'earrings', look.hair === 'long' || look.hair === 'bun' ? 0.4 : 0.1, [
      'earrings-studs',
      'earrings-hoops',
    ]),
  )
  return tidy(out)
}

/** In town: bags, caps and hats, earbuds and headphones, sunglasses, trainers. */
export function townWear(id: string, look: PersonLook): Wear[] {
  const out: Array<Wear | null> = [
    oneOf(id, 'bag', 0.55, ['backpack', 'shoulder-bag', 'laptop-bag', 'backpack-tech']),
    oneOf(id, 'head', 0.3, ['cap', 'beanie', 'cap']),
    oneOf(id, 'watch', 0.6, [
      'watch-classic',
      'watch-smart',
      'fitness-tracker',
      'watch-digital',
    ]),
    oneOf(id, 'feet', 0.5, ['sneakers', 'sneakers-premium', 'formal-shoes']),
  ]
  const head = out[1]
  out.push(
    oneOf(id, 'ears', 0.3, head ? ['earbuds'] : ['earbuds', 'headphones', 'earbuds-pro']),
  )
  if (!look.glasses)
    out.push(oneOf(id, 'eyes', 0.2, ['sunglasses', 'sunglasses-premium']))
  return tidy(out)
}

/** One thing per place, nothing that would pass through anything else. */
function tidy(list: Array<Wear | null>): Wear[] {
  const seen = new Set<Slot>()
  const out: Wear[] = []
  for (const w of list) {
    if (!w || seen.has(w.slot)) continue
    seen.add(w.slot)
    out.push(w)
  }
  const crown = out.some((w) => w.slot === 'head')
  // A headphone band over a hat: the band goes (earbuds instead would be a guess).
  return crown
    ? out.filter(
        (w) =>
          !(
            w.slot === 'ears' &&
            ['headphones', 'gaming-headset', 'earmuffs', 'comms-headset'].includes(
              w.model,
            )
          ),
      )
    : out
}
