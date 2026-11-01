/** The player's desk: which items are earned, and what is on it. */
import {
  DEFAULT_DESK,
  DESK_ITEMS,
  DESK_SLOTS,
  getDeskItem,
  type DeskItem,
  type DeskSlot,
} from '../content/desk'
import { getAchievement, isEarned } from './achievements'
import { careerLevel, type ProfileData } from './career'
import { levelNumber } from './cases'

export function isUnlocked(profile: ProfileData, item: DeskItem): boolean {
  if (!item.unlock) return true
  if ('achievement' in item.unlock) return isEarned(profile, item.unlock.achievement)
  return levelNumber(profile) >= item.unlock.level
}

/** How an item is earned, in plain words. */
export function unlockText(profile: ProfileData, item: DeskItem): string {
  if (!item.unlock) return 'Available from the start.'
  if ('achievement' in item.unlock) {
    const achievement = getAchievement(item.unlock.achievement)
    return `Earned with the “${achievement?.title ?? item.unlock.achievement}” achievement.`
  }
  const level = careerLevel(profile).career.levels[item.unlock.level - 1]
  return `Earned by reaching ${level?.title ?? `level ${item.unlock.level}`}.`
}

/**
 * What is on the desk, slot by slot. A saved choice that is unknown or no
 * longer earned falls back to the default, so a save can never show more than
 * the player has earned.
 */
export function deskLayout(profile: ProfileData): Partial<Record<DeskSlot, DeskItem>> {
  const layout: Partial<Record<DeskSlot, DeskItem>> = {}
  for (const { id: slot } of DESK_SLOTS) {
    const chosen = profile.work.record.desk[slot]
    const fallback = DEFAULT_DESK[slot]
    const id = chosen === undefined ? fallback : chosen
    const item = id ? getDeskItem(id) : undefined
    if (item && item.slot === slot && isUnlocked(profile, item)) layout[slot] = item
    else if (fallback) layout[slot] = getDeskItem(fallback)
  }
  return layout
}

/** Puts an earned item on the desk, or clears the slot (`null`). */
export function chooseDeskItem(
  profile: ProfileData,
  slot: DeskSlot,
  itemId: string | null,
): ProfileData {
  if (itemId !== null) {
    const item = getDeskItem(itemId)
    if (!item || item.slot !== slot || !isUnlocked(profile, item)) return profile
  } else if (DEFAULT_DESK[slot]) {
    // Slots with a default (the chair, the mug) are never empty.
    return profile
  }
  return {
    ...profile,
    work: {
      ...profile.work,
      record: {
        ...profile.work.record,
        desk: { ...profile.work.record.desk, [slot]: itemId ?? '' },
      },
    },
  }
}

export function itemsFor(slot: DeskSlot): DeskItem[] {
  return DESK_ITEMS.filter((item) => item.slot === slot)
}
