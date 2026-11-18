/**
 * What the player is wearing, for every scene that draws them (the office, home,
 * the street and the places in it, the courthouse, the site): one shared state,
 * kept up to date from the save (PhoneHost, which is always there), so a watch
 * put on in the wardrobe is on the wrist in every place at once.
 */
import { useSyncExternalStore } from 'react'
import { getAccessory, type Use } from '../../content/accessories'
import { SITE_KIT, type WornModel } from '../../game/accessories'
import type { PersonLook } from '../../office/scene/people'
import type { Wear } from './accessoryLook'

let worn: WornModel[] = []
let key = ''
const listeners = new Set<() => void>()

/** Sets what is worn (only telling the scenes when it has changed). */
export function setPlayerWear(next: WornModel[]): void {
  const k = JSON.stringify(next)
  if (k === key) return
  key = k
  worn = next
  for (const l of listeners) l()
}

export function playerWear(): WornModel[] {
  return worn
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePlayerWear(): WornModel[] {
  return useSyncExternalStore(subscribe, playerWear, playerWear)
}

/** The player's look with what they wear. */
export function dressed(base: PersonLook, wear: WornModel[]): PersonLook {
  if (!wear.length) return base
  return {
    ...base,
    wear: wear.map(({ model, slot, colour }): Wear => ({ model, slot, colour })),
  }
}

/** What the worn things do (for the scenes: a stethoscope at the bedside, say). */
export function wornUses(wear: WornModel[]): Set<Use> {
  const out = new Set<Use>()
  for (const w of wear) for (const u of getAccessory(w.id)?.uses ?? []) out.add(u)
  return out
}

/**
 * On a site: the player's own safety kit, and the site's for whatever they do
 * not have (lent at the gate, as sites do).
 */
export function withSiteKit(wear: WornModel[]): WornModel[] {
  const uses = wornUses(wear)
  const lent = SITE_KIT.filter((k) => !uses.has(k.use)).flatMap((k) => {
    const item = getAccessory(k.issue)
    return item
      ? [{ model: item.model, slot: item.slot, colour: item.colours[0], id: item.id }]
      : []
  })
  // Lent kit takes the place of anything worn in the same place.
  const slots = new Set(lent.map((l) => l.slot))
  return [...wear.filter((w) => !slots.has(w.slot)), ...lent]
}

let kept: WornModel[] = []
let keptKey = ''
const keptListeners = new Set<() => void>()

/** What the player keeps at home rather than wears (for the coat stand by the door). */
export function setPlayerKept(next: WornModel[]): void {
  const k = JSON.stringify(next)
  if (k === keptKey) return
  keptKey = k
  kept = next
  for (const l of keptListeners) l()
}

const readKept = () => kept
function subscribeKept(l: () => void) {
  keptListeners.add(l)
  return () => keptListeners.delete(l)
}

export function usePlayerKept(): WornModel[] {
  return useSyncExternalStore(subscribeKept, readKept, readKept)
}
