/**
 * Accessories and equipment the player owns (content/accessories.ts): buying them
 * with money earned at work (through the bank's ledger, like everything else),
 * selling on what they no longer want, wearing and taking off, packing work
 * things into a bag, and what wearing them does:
 * - a watch on the wrist shows the time (a smartwatch, messages and the day too);
 * - headphones and earbuds make the surroundings quieter (game audio);
 * - a site or workshop checks for safety kit: the player's own is worn, and the
 *   site lends what is missing (nothing is ever refused, nothing skipped);
 * - a stethoscope of their own is listened with at the bedside; a badge at work;
 * - a bag (or briefcase, or tool belt) has room for so many work things.
 *
 * Two things cannot be worn together where they would pass through each other:
 * a headphone band over the top of the head and a hat, or two things in one
 * place. Putting one on takes the other off, and says so. Pure.
 */
import {
  ACCESSORIES,
  POCKETS,
  capacityOf,
  getAccessory,
  type Accessory,
  type Model,
  type Slot,
  type Use,
} from '../content/accessories'
import { formatMoney } from '../content/life'
import type { Life } from '../persistence/schemas'
import type { ProfileData } from './career'
import { earn, spend, withLife } from './lifeTime'

export type Wardrobe = Life['wardrobe']
export type Owned = Wardrobe['owned'][number]

/** The most the wardrobe holds. */
export const MAX_OWNED = 200
/** What a thing sells for, as a share of its price when new. */
export const RESALE = 0.4

export function wardrobeOf(life: Life): Wardrobe {
  return life.wardrobe
}

function withWardrobe(
  profile: ProfileData,
  wardrobe: Wardrobe,
  life?: Life,
): ProfileData {
  return withLife(profile, { ...(life ?? profile.work.life), wardrobe })
}

/** The day, for the ledger. */
const today = (profile: ProfileData) => profile.work.day

/** Why it cannot be bought now, or null. */
export function canBuyAccessory(profile: ProfileData, id: string): string | null {
  const item = getAccessory(id)
  if (!item) return 'Not in the shop.'
  const life = profile.work.life
  if (life.wardrobe.owned.length >= MAX_OWNED) return 'Your wardrobe is full.'
  if (life.money < item.price)
    return `It costs ${formatMoney(item.price)}: you have ${formatMoney(life.money)}.`
  return null
}

/** Buys it (paid from the bank, in the ledger and the wardrobe's history). */
export function buyAccessory(profile: ProfileData, id: string, colour = 0): ProfileData {
  if (canBuyAccessory(profile, id)) return profile
  const item = getAccessory(id)!
  const day = today(profile)
  const w = profile.work.life.wardrobe
  const n = w.owned.filter((o) => o.id === id).length + w.history.length
  const owned: Owned = {
    uid: `${id}-${day}-${n}`,
    id,
    colour: Math.min(colour, item.colours.length - 1),
    bought: day,
    paid: item.price,
    condition: 100,
  }
  const life = spend(profile.work.life, day, item.price, `Bought: ${item.name}`)
  return withWardrobe(
    profile,
    {
      ...w,
      owned: [...w.owned, owned],
      history: [
        ...w.history,
        { day, text: `Bought ${item.name}`, amount: -item.price },
      ].slice(-80),
    },
    life,
  )
}

/** What it would sell for now (its condition counts), or null if it cannot be sold. */
export function resaleOf(owned: Owned): number | null {
  const item = getAccessory(owned.id)
  if (!item?.sellable) return null
  return Math.round((owned.paid * RESALE * owned.condition) / 100 / 100) * 100
}

/** Sells it on (taken off and out of the bag first). */
export function sellAccessory(profile: ProfileData, uid: string): ProfileData {
  const w = profile.work.life.wardrobe
  const owned = w.owned.find((o) => o.uid === uid)
  if (!owned) return profile
  const price = resaleOf(owned)
  if (price === null) return profile
  const item = getAccessory(owned.id)!
  const day = today(profile)
  const life = earn(profile.work.life, day, price, `Sold: ${item.name}`)
  return withWardrobe(
    profile,
    {
      ...w,
      owned: w.owned.filter((o) => o.uid !== uid),
      worn: w.worn.filter((u) => u !== uid),
      packed: w.packed.filter((u) => u !== uid),
      history: [...w.history, { day, text: `Sold ${item.name}`, amount: price }].slice(
        -80,
      ),
    },
    life,
  )
}

export interface WornItem {
  owned: Owned
  item: Accessory
}

/** What is worn or carried. */
export function wornItems(life: Pick<Life, 'wardrobe'>): WornItem[] {
  const w = life.wardrobe
  return w.worn.flatMap((uid) => {
    const owned = w.owned.find((o) => o.uid === uid)
    const item = owned && getAccessory(owned.id)
    return owned && item ? [{ owned, item }] : []
  })
}

/** The work things packed in the bag. */
export function packedItems(life: Life): WornItem[] {
  const w = life.wardrobe
  return w.packed.flatMap((uid) => {
    const owned = w.owned.find((o) => o.uid === uid)
    const item = owned && getAccessory(owned.id)
    return owned && item ? [{ owned, item }] : []
  })
}

/** Why two things cannot be worn together, or null. */
export function clash(a: Accessory, b: Accessory): string | null {
  if (a.slot === b.slot && a.slot !== 'pocket')
    return `Both go on your ${slotWord(a.slot)}.`
  if ((a.band && b.crown) || (a.crown && b.band)) {
    const [band, hat] = a.band ? [a, b] : [b, a]
    return `The ${lower(band.name)} won’t fit over the ${lower(hat.name)}.`
  }
  return null
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

function slotWord(slot: Slot): string {
  return (
    {
      head: 'head',
      eyes: 'eyes',
      ears: 'ears',
      earrings: 'ears',
      neck: 'neck',
      chest: 'chest',
      wrist: 'left wrist',
      wrist2: 'right wrist',
      ring: 'finger',
      hands: 'hands',
      body: 'clothes',
      back: 'back',
      carry: 'hand',
      belt: 'waist',
      pocket: 'pockets',
      feet: 'feet',
    } as const
  )[slot]
}

export interface Change {
  profile: ProfileData
  /** What happened, for the player: what came off to make room, or why not. */
  note: string | null
}

/** Puts it on (or picks it up), taking off whatever it cannot be worn with. */
export function wearAccessory(profile: ProfileData, uid: string): Change {
  const w = profile.work.life.wardrobe
  const owned = w.owned.find((o) => o.uid === uid)
  const item = owned && getAccessory(owned.id)
  if (!owned || !item) return { profile, note: null }
  if (w.worn.includes(uid)) return { profile, note: null }
  const worn = wornItems(profile.work.life)
  if (
    item.slot === 'pocket' &&
    worn.filter((x) => x.item.slot === 'pocket').length >= POCKETS
  )
    return {
      profile,
      note: `Your pockets are full (${POCKETS} things): take something out first.`,
    }
  const off = worn.filter((x) => x.item.slot !== 'pocket' && clash(item, x.item))
  const offIds = new Set(off.map((x) => x.owned.uid))
  // A bag taken off: what was in it stays in the wardrobe.
  const next: Wardrobe = {
    ...w,
    worn: [...w.worn.filter((u) => !offIds.has(u)), uid],
    packed: w.packed.filter((u) => u !== uid),
  }
  const trimmed = { ...next, packed: fitPacked(next) }
  const note = off.length
    ? `Took off the ${off.map((x) => lower(x.item.name)).join(' and the ')}: ${clash(item, off[0].item)}`
    : null
  return { profile: withWardrobe(profile, trimmed), note }
}

/** Takes it off (or puts it down). */
export function takeOffAccessory(profile: ProfileData, uid: string): ProfileData {
  const w = profile.work.life.wardrobe
  if (!w.worn.includes(uid)) return profile
  const next = { ...w, worn: w.worn.filter((u) => u !== uid) }
  return withWardrobe(profile, { ...next, packed: fitPacked(next) })
}

/** Room for work things in what is worn (bag, briefcase, tool belt). */
export function capacity(life: Life): number {
  return wornItems(life).reduce((n, x) => n + capacityOf(x.item), 0)
}

/** Work things can go in a bag: tools and equipment, not clothes or jewellery. */
export function packable(item: Accessory): boolean {
  return !!item.uses?.includes('tool') && capacityOf(item) === 0
}

/** Only as many packed as there is room for (a bag taken off empties out). */
function fitPacked(w: Wardrobe): Wardrobe['packed'] {
  const life = { wardrobe: w } as Life
  return w.packed.filter((u) => !w.worn.includes(u)).slice(0, capacity(life))
}

/** Packs a work thing into the bag, if there is room. */
export function packAccessory(profile: ProfileData, uid: string): Change {
  const life = profile.work.life
  const w = life.wardrobe
  const owned = w.owned.find((o) => o.uid === uid)
  const item = owned && getAccessory(owned.id)
  if (!owned || !item || w.packed.includes(uid)) return { profile, note: null }
  if (!packable(item))
    return { profile, note: `The ${lower(item.name)} doesn’t go in a bag.` }
  const room = capacity(life)
  if (room === 0)
    return { profile, note: 'Wear a bag, briefcase or tool belt to pack work things.' }
  if (w.packed.length >= room)
    return { profile, note: `Your bag is full (${room} things): unpack something first.` }
  return {
    profile: withWardrobe(profile, {
      ...w,
      worn: w.worn.filter((u) => u !== uid),
      packed: [...w.packed, uid],
    }),
    note: null,
  }
}

export function unpackAccessory(profile: ProfileData, uid: string): ProfileData {
  const w = profile.work.life.wardrobe
  return withWardrobe(profile, { ...w, packed: w.packed.filter((u) => u !== uid) })
}

/** What wearing (and carrying) them does: every use of what is worn, and of tools packed. */
export function usesOf(life: Life): Set<Use> {
  const out = new Set<Use>()
  for (const x of [...wornItems(life), ...packedItems(life)])
    for (const u of x.item.uses ?? []) out.add(u)
  return out
}

/** How much a day's wear takes off: better things last longer. */
const WEAR: Record<Accessory['tier'], number> = {
  basic: 1.2,
  standard: 0.8,
  premium: 0.5,
  luxury: 0.3,
  professional: 0.6,
}

/** Once a day, what was worn wears a little (it shows in the wardrobe and what it sells for). */
export function wearAndTear(life: Life, day: number): Life {
  const w = life.wardrobe
  if (w.woreDay >= day || w.worn.length === 0) return life
  const worn = new Set(w.worn)
  return {
    ...life,
    wardrobe: {
      ...w,
      woreDay: day,
      owned: w.owned.map((o) => {
        if (!worn.has(o.uid)) return o
        const tier = getAccessory(o.id)?.tier ?? 'standard'
        return {
          ...o,
          condition: Math.max(0, Math.round((o.condition - WEAR[tier]) * 10) / 10),
        }
      }),
    },
  }
}

/** A word for an item's condition. */
export function conditionWord(condition: number): string {
  if (condition >= 95) return 'As new'
  if (condition >= 75) return 'Good'
  if (condition >= 45) return 'Worn'
  return 'Well worn'
}

/** The safety kit a site or the workshop checks for, and what covers it. */
export const SITE_KIT: Array<{ use: Use; name: string; issue: string }> = [
  { use: 'ppe-head', name: 'Hard hat', issue: 'hardhat' },
  { use: 'ppe-eyes', name: 'Safety glasses', issue: 'glasses-safety' },
  { use: 'ppe-body', name: 'Hi-vis', issue: 'hivis-vest' },
  { use: 'ppe-feet', name: 'Safety boots', issue: 'safety-boots' },
]

export interface KitCheck {
  name: string
  /** The player's own, or lent by the site for the visit. */
  from: 'own' | 'issued'
  /** The item worn (the player's, or the site's). */
  item: Accessory
}

/**
 * The site's check at the gate: each piece of kit, the player's own if they
 * wear it, otherwise lent from the site store (as sites do) for the visit.
 */
export function siteKit(life: Life): KitCheck[] {
  const worn = wornItems(life)
  return SITE_KIT.map((k) => {
    const own = worn.find((x) => x.item.uses?.includes(k.use))
    return own
      ? { name: k.name, from: 'own', item: own.item }
      : { name: k.name, from: 'issued', item: getAccessory(k.issue)! }
  })
}

/** How the player's own kit is drawn: each model in its colour (for the 3D character). */
export interface WornModel {
  model: Model
  slot: Slot
  colour: string
  id: string
}

export function wornModels(life: Pick<Life, 'wardrobe'>): WornModel[] {
  return wornItems(life).map(({ owned, item }) => ({
    model: item.model,
    slot: item.slot,
    colour: item.colours[owned.colour] ?? item.colours[0],
    id: item.id,
  }))
}

/** For the shop: everything, by category, cheapest first. */
export function catalogue(): Accessory[] {
  return [...ACCESSORIES].sort((a, b) => a.price - b.price)
}

/** How many of an item the player has. */
export function ownedCount(life: Life, id: string): number {
  return life.wardrobe.owned.filter((o) => o.id === id).length
}

/** Kept at home, not worn or packed, that has a place by the door (bags, hats, watches). */
export function keptModels(life: Pick<Life, 'wardrobe'>): WornModel[] {
  const w = life.wardrobe
  const away = new Set([...w.worn, ...w.packed])
  const places: Slot[] = ['back', 'carry', 'head', 'wrist', 'wrist2']
  return w.owned.flatMap((o) => {
    const item = getAccessory(o.id)
    if (!item || away.has(o.uid) || !places.includes(item.slot)) return []
    return [
      {
        model: item.model,
        slot: item.slot,
        colour: item.colours[o.colour] ?? item.colours[0],
        id: item.id,
      },
    ]
  })
}
