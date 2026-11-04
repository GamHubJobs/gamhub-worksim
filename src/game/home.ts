/**
 * The player's home: buying, selling and recolouring furniture, moving
 * house, and what the furniture does for life at home (activities it makes
 * possible, better activities, better sleep, a nicer place to be).
 */
import {
  FURNITURE,
  RESALE,
  getFurniture,
  getHome,
  type Furniture,
  type Home,
  type HomeId,
  type SlotId,
} from '../content/home'
import { formatMoney, type NeedId } from '../content/life'
import type { Life } from '../persistence/schemas'
import type { ProfileData } from './career'

export function homeOf(life: Life): Home {
  return getHome(life.home.id)
}

/** The furniture the player owns, by slot. */
export function owned(
  life: Life,
): Array<{ slot: SlotId; item: Furniture; colour: string }> {
  return Object.entries(life.home.furniture).flatMap(([slot, entry]) => {
    const item = getFurniture(entry.item)
    return item
      ? [
          {
            slot: slot as SlotId,
            item,
            colour: item.colours[entry.colour] ?? item.colours[0],
          },
        ]
      : []
  })
}

const items = (life: Life) => owned(life).map((o) => o.item)

/** Whether something the player owns makes this activity possible. */
export function enables(life: Life, action: string): boolean {
  return items(life).some((item) => item.enables?.includes(action))
}

/** The furniture that would make an activity possible (for the shop's hint). */
export function enablerOf(action: string): Furniture | undefined {
  return FURNITURE.find((f) => f.enables?.includes(action))
}

/** Extra need gained by an activity from the furniture owned. */
export function bonusFor(life: Life, action: string): Partial<Record<NeedId, number>> {
  const bonus: Partial<Record<NeedId, number>> = {}
  for (const item of items(life))
    for (const better of item.better ?? [])
      if (better.action === action)
        for (const [need, value] of Object.entries(better.needs) as Array<
          [NeedId, number]
        >)
          bonus[need] = (bonus[need] ?? 0) + value
  return bonus
}

export function sleepBonus(life: Life): number {
  return items(life).reduce((sum, item) => sum + (item.sleep ?? 0), 0)
}

/** How homely the place is: fun falls this much more slowly per hour at home. */
export function comfort(life: Life): number {
  return items(life).reduce((sum, item) => sum + (item.comfort ?? 0), 0)
}

// ---------------------------------------------------------------------------
// The shop
// ---------------------------------------------------------------------------

function withLife(profile: ProfileData, life: Life): ProfileData {
  return { ...profile, work: { ...profile.work, life } }
}

function pay(life: Life, day: number, amount: number, text: string): Life {
  return {
    ...life,
    money: life.money - amount,
    ledger: [...life.ledger, { day, text, amount: -amount }].slice(-60),
  }
}

/** Why an item cannot be bought now, or null. */
export function canBuy(profile: ProfileData, itemId: string): string | null {
  const item = getFurniture(itemId)
  const life = profile.work.life
  if (!item) return 'Not in the shop.'
  if (!profile.work.dayOver) return 'Shop from home, after work.'
  if (life.home.furniture[item.slot]?.item === item.id) return 'You already have it.'
  const resale = tradeIn(life, item.slot)
  if (life.money + resale < item.price)
    return `You cannot afford it (${formatMoney(item.price)}).`
  return null
}

/** What the old item in a slot sells for when replaced. */
export function tradeIn(life: Life, slot: SlotId): number {
  const old = life.home.furniture[slot]
  const item = old ? getFurniture(old.item) : undefined
  return item ? Math.round(item.price * RESALE) : 0
}

export function buyFurniture(
  profile: ProfileData,
  itemId: string,
  colour = 0,
): ProfileData {
  if (canBuy(profile, itemId)) return profile
  const item = getFurniture(itemId)!
  let life = profile.work.life
  const day = profile.work.day
  const old = life.home.furniture[item.slot]
  const resale = tradeIn(life, item.slot)
  if (resale > 0) {
    const oldItem = getFurniture(old!.item)!
    life = { ...life, money: life.money + resale }
    life = {
      ...life,
      ledger: [
        ...life.ledger,
        { day, text: `Sold ${oldItem.name}`, amount: resale },
      ].slice(-60),
    }
  }
  life = pay(life, day, item.price, `Bought ${item.name}`)
  life = {
    ...life,
    home: {
      ...life.home,
      furniture: {
        ...life.home.furniture,
        [item.slot]: { item: item.id, colour: Math.min(colour, item.colours.length - 1) },
      },
    },
  }
  return withLife(profile, life)
}

export function sellFurniture(profile: ProfileData, slot: SlotId): ProfileData {
  const life = profile.work.life
  const entry = life.home.furniture[slot]
  const item = entry ? getFurniture(entry.item) : undefined
  if (!item || !profile.work.dayOver || item.price === 0) return profile
  const amount = Math.round(item.price * RESALE)
  const furniture = { ...life.home.furniture }
  delete furniture[slot]
  return withLife(profile, {
    ...life,
    money: life.money + amount,
    ledger: [
      ...life.ledger,
      { day: profile.work.day, text: `Sold ${item.name}`, amount },
    ].slice(-60),
    home: { ...life.home, furniture },
  })
}

export function recolour(
  profile: ProfileData,
  slot: SlotId,
  colour: number,
): ProfileData {
  const life = profile.work.life
  const entry = life.home.furniture[slot]
  const item = entry ? getFurniture(entry.item) : undefined
  if (!item || colour < 0 || colour >= item.colours.length) return profile
  return withLife(profile, {
    ...life,
    home: {
      ...life.home,
      furniture: { ...life.home.furniture, [slot]: { ...entry!, colour } },
    },
  })
}

// ---------------------------------------------------------------------------
// Moving house
// ---------------------------------------------------------------------------

export function canMove(profile: ProfileData, homeId: HomeId): string | null {
  const life = profile.work.life
  const home = getHome(homeId)
  if (life.home.id === homeId) return 'You live here.'
  if (!profile.work.dayOver) return 'Move from home, after work.'
  if (life.money < home.moveCost) return `You need ${formatMoney(home.moveCost)} to move.`
  return null
}

/** Moves house: furniture comes along; the new rent starts next Monday. */
export function moveHome(profile: ProfileData, homeId: HomeId): ProfileData {
  if (canMove(profile, homeId)) return profile
  const home = getHome(homeId)
  let life = profile.work.life
  if (home.moveCost)
    life = pay(life, profile.work.day, home.moveCost, `Moved to ${home.name}`)
  life = {
    ...life,
    home: { ...life.home, id: homeId },
    log: [...life.log, `Moved to ${home.name}`].slice(-30),
  }
  return withLife(profile, life)
}
