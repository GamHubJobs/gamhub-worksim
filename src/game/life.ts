/**
 * Life outside work, as pure functions like the rest of the game rules: going
 * home after the working day, what the player does at home (and what it costs),
 * sleep, money, and the journey to work, with the consequences of all of it
 * showing up the next working day.
 *
 * The working day itself is unchanged: life starts when it ends (`work.dayOver`)
 * and hands back to it when the player arrives at the office (`startNextDay`).
 */
import { missedDates } from './dates'
import {
  ALARM,
  COMMUTES,
  HOME_ACTIONS,
  LATEST_BEDTIME,
  SLEEP_NEEDED,
  formatMoney,
  type CommuteId,
  type HomeAction,
  type LifeAction,
  type NeedId,
} from '../content/life'
import { PLACE_ACTIONS, closedReason, getPlace, type PlaceAction } from '../content/city'
import { HOURS } from '../content/workday'
import type { Life } from '../persistence/schemas'
import { careerLevel, type ProfileData } from './career'
import { bonusFor, comfort, enablerOf, enables, homeOf, sleepBonus } from './home'
import { formatTime, nextWorkday, weekdayIndex, weekNumber, weekdayName } from './clock'
import { changeReputation } from './relationships'
import { log, startNextDay } from './workday'
import { afterNight, eveningMessages } from './social'
import {
  deliveryBlock,
  eaten,
  ordered,
  overnight,
  received,
  untilArrival,
} from './delivery'
import { canCommute, chargeCarLease } from './transport'
import { careerEvening, weeklyPay } from './careerLife'
import { clamp, decayed, earn, note, spend, withLife, withWellbeing } from './lifeTime'

export const commuteOf = (id: CommuteId) => COMMUTES.find((c) => c.id === id)!

/** Minutes a commute takes from the player's home. */
export function commuteMinutes(life: Life, id: CommuteId): number {
  return Math.max(5, commuteOf(id).minutes + homeOf(life).commuteChange)
}

/** Where the player's day is now: at the office, or at home in the evening or morning. */
export function lifePhase(profile: ProfileData): Life['phase'] {
  return profile.work.dayOver ? profile.work.life.phase : 'work'
}

// ---------------------------------------------------------------------------
// After work
// ---------------------------------------------------------------------------

/**
 * Travels home at the end of the working day: the day's effect on needs, the
 * fare home, and pay on Fridays.
 */
export function goHome(profile: ProfileData): ProfileData {
  const { work } = profile
  if (!work.dayOver || work.life.phase !== 'work') return profile
  const commute = commuteOf(work.life.commute)
  const worked = Math.max(0, work.minute - HOURS.arrival)
  const lunch = work.history.at(-1)?.lunch ?? work.today.lunch
  let needs = decayed(work.life.needs, worked)
  // Lunch at work feeds you; the working day is company, if not much fun.
  needs = {
    ...needs,
    hunger: clamp(needs.hunger + (lunch ? 40 : 0)),
    social: clamp(Math.round(work.life.needs.social - (worked / 60) * 0.5)),
  }
  let life: Life = {
    ...work.life,
    phase: 'evening',
    minute: Math.round(work.minute + commuteMinutes(work.life, commute.id)),
    needs,
    log: [],
    city: { at: 'home', inside: true, riding: false },
  }
  life = spend(life, work.day, commute.cost, `${commute.name} home`)
  life = note(life, `Home from work (${commute.name.toLowerCase()})`)
  // Friends get in touch in the evening.
  life = eveningMessages(life, work.day)
  // Employers and the manager answer (see careerLife.ts).
  const next = careerEvening(withLife(profile, life))
  life = next.work.life
  // Pay day: Friday, once a week.
  const week = weekNumber(work.day)
  if (weekdayIndex(work.day) === 4 && life.paidWeek < week) {
    const pay = weeklyPay(next)
    life = earn(life, work.day, pay, `Pay for week ${week}`)
    life = { ...life, paidWeek: week }
    life = note(life, `Paid ${formatMoney(pay)} for the week`)
  }
  return withLife(next, life)
}

// ---------------------------------------------------------------------------
// At home
// ---------------------------------------------------------------------------

/** An action at home or in a place in the neighbourhood. */
export function getHomeAction(id: string): HomeAction | PlaceAction | undefined {
  return HOME_ACTIONS.find((a) => a.id === id) ?? PLACE_ACTIONS.find((a) => a.id === id)
}

/** Whether an action can be done now, and if not, why (shown to the player). */
export function canDo(
  profile: ProfileData,
  action: LifeAction & { place?: string },
): string | null {
  const life = profile.work.life
  const phase = lifePhase(profile)
  if (phase === 'work') return 'You are at work.'
  // The takeaway's steps go in order: ordered, arrived, eaten.
  const takeaway = deliveryBlock(life, action.id)
  if (takeaway) return takeaway
  // Where the player is: at home for home actions, inside the place for the rest.
  if (action.place) {
    const place = getPlace(action.place)!
    if (life.city.at !== place.id || !life.city.inside) return `Only at ${place.name}.`
    const closed = closedReason(place, life.minute)
    if (closed) return closed
  } else if (life.city.at !== 'home' || !life.city.inside) return 'You are not at home.'
  if (!action.phases.includes(phase))
    return phase === 'morning'
      ? 'Not now: it is the morning.'
      : 'Not now: it is the evening.'
  if (action.until !== undefined && life.minute + action.minutes > action.until)
    return `Too late for that (until ${formatTime(action.until)}).`
  if (phase === 'evening' && life.minute + action.minutes > LATEST_BEDTIME)
    return 'It is very late: time for bed.'
  if (action.cost && life.money < action.cost)
    return `You cannot afford it (${formatMoney(action.cost)}).`
  if (action.food && action.food > 0 && life.food < action.food)
    return 'There is no food in the fridge: order groceries or a takeaway.'
  if (action.marks && life.ready[action.marks] && phase === 'morning')
    return 'Already done this morning.'
  if (action.needsItem && !enables(life, action.id)) {
    const item = enablerOf(action.id)
    return item
      ? `You need a ${item.name.toLowerCase()} (in the shop).`
      : 'Not possible here.'
  }
  return null
}

export function doHomeAction(profile: ProfileData, id: string): ProfileData {
  const found = getHomeAction(id)
  if (!found || canDo(profile, found)) return profile
  const work = profile.work
  let life = work.life
  // Waiting for the takeaway lasts until it arrives.
  const action =
    id === 'takeaway-wait'
      ? { ...found, minutes: Math.max(1, untilArrival(life)) }
      : found
  const needs = decayed(life.needs, action.minutes)
  // A homely place: fun falls more slowly in the evening.
  if (life.phase === 'evening' && !('place' in action))
    needs.fun = clamp(Math.round(needs.fun + comfort(life) * 0.4 * (action.minutes / 60)))
  const bonus = bonusFor(life, action.id)
  for (const need of new Set([
    ...Object.keys(action.needs ?? {}),
    ...Object.keys(bonus),
  ]) as Set<NeedId>)
    needs[need] = clamp(needs[need] + (action.needs?.[need] ?? 0) + (bonus[need] ?? 0))
  life = {
    ...life,
    minute: life.minute + action.minutes,
    needs,
    food: Math.max(0, life.food - (action.food ?? 0)),
    ready: action.marks ? { ...life.ready, [action.marks]: true } : life.ready,
  }
  life = spend(life, work.day, action.cost ?? 0, action.label)
  life = note(life, action.done)
  if (id === 'takeaway') life = ordered(life, work.day)
  if (id === 'takeaway-door') life = received(life)
  if (id === 'takeaway-eat') life = eaten(life)
  let next = profile
  if (action.skillXp) {
    // Study goes to the career skill the player has least of.
    const skills = careerLevel(profile).career.skills.filter((id) => id !== 'ai-use')
    const weakest = [...skills].sort(
      (a, b) => (profile.skills[a] ?? 0) - (profile.skills[b] ?? 0),
    )[0]
    if (weakest) {
      next = {
        ...profile,
        skills: {
          ...profile.skills,
          [weakest]: (profile.skills[weakest] ?? 0) + action.skillXp,
        },
      }
      life = note(life, `+${action.skillXp} skill XP from studying`)
    }
  }
  // An hour at home costs a little energy, as a day does.
  const energy = (action.energy ?? 0) - (action.minutes / 60) * 2
  return withLife(next, life, withWellbeing(work, Math.round(energy), action.stress ?? 0))
}

// ---------------------------------------------------------------------------
// Night and morning
// ---------------------------------------------------------------------------

/** Hours of sleep from a bedtime (home-clock minutes) to the alarm. */
export function sleepHours(bedtime: number): number {
  return (24 * 60 + ALARM - bedtime) / 60
}

/** Goes to bed: the night passes, the alarm rings, and rent is due on Mondays. */
export function goToBed(profile: ProfileData): ProfileData {
  if (lifePhase(profile) !== 'evening') return profile
  if (profile.work.life.city.at !== 'home' || !profile.work.life.city.inside)
    return profile
  const work = profile.work
  const next = nextWorkday(work.day)
  const weekend = next - work.day > 1
  // A date tonight not gone to is missed (see dates.ts).
  let life: Life = note(
    missedDates(overnight(afterNight(work.life, work.day)), work.day),
    'Went to bed',
  )
  const bedtime = life.minute
  // The night (and a weekend, if there is one) changes needs.
  let needs = decayed(life.needs, 8 * 60)
  needs = { ...needs, hunger: clamp(needs.hunger - 10) }
  if (weekend)
    needs = {
      hunger: 70,
      hygiene: 80,
      social: clamp(needs.social + 40),
      fun: clamp(needs.fun + 45),
    }
  life = {
    ...life,
    phase: 'morning',
    minute: ALARM,
    bedtime,
    needs,
    ready: { ate: false, showered: false, dressed: false },
    log: [],
  }
  life = note(
    life,
    weekend
      ? `${weekdayName(next)} morning after the weekend`
      : `Woke up after ${sleepHours(bedtime).toFixed(1)} hours’ sleep`,
  )
  if (weekdayIndex(next) === 0 && life.rentWeek < weekNumber(next)) {
    const rent = homeOf(life).rent
    life = spend(life, next, rent, `Rent for week ${weekNumber(next)}`)
    life = { ...life, rentWeek: weekNumber(next) }
    life = note(life, `Paid ${formatMoney(rent)} rent`)
  }
  if (weekdayIndex(next) === 0) life = chargeCarLease(life, next)
  return withLife(profile, life)
}

export interface Arrival {
  minute: number
  late: number
}

/** When the player would arrive at the office, leaving now with this commute. */
export function arrivalFor(profile: ProfileData, commute: CommuteId): Arrival {
  const minute = profile.work.life.minute + commuteMinutes(profile.work.life, commute)
  return { minute, late: Math.max(0, minute - HOURS.start) }
}

/**
 * Leaves for work: the next working day starts when the player arrives, and
 * how they spent the evening and morning shows in how it begins.
 */
export function leaveForWork(profile: ProfileData, commuteId: CommuteId): ProfileData {
  if (lifePhase(profile) !== 'morning') return profile
  const commute = commuteOf(commuteId)
  if (canCommute(profile.work.life, commuteId)) return profile
  const { minute, late } = arrivalFor(profile, commuteId)
  const before = profile.work.life
  const started = startNextDay(profile)
  let work = started.work
  let life: Life = {
    ...before,
    phase: 'work',
    commute: commuteId,
    city: { at: 'home', inside: true, riding: false },
  }
  life = spend(life, work.day, commute.cost, `${commute.name} to work`)

  // The time they walk in.
  work = { ...work, minute: Math.max(HOURS.arrival, minute) }
  if (late > 0) {
    work = changeReputation(work, late > 15 ? -2 : -1)
    work = log(work, `Arrived ${late} minutes late`, 'bad')
  }

  // How rested and ready they are.
  let energy = commute.energy
  let stress = commute.stress ?? 0
  if (commute.needs) {
    const needs = { ...life.needs }
    for (const [need, value] of Object.entries(commute.needs) as Array<[NeedId, number]>)
      needs[need] = clamp(needs[need] + value)
    life = { ...life, needs }
  }
  const sleep = before.bedtime === null ? SLEEP_NEEDED : sleepHours(before.bedtime)
  energy += sleepBonus(before)
  const weekend = work.day - profile.work.day > 1
  if (!weekend && sleep < SLEEP_NEEDED) {
    energy -= Math.round((SLEEP_NEEDED - sleep) * 7)
    work = log(work, `Only ${sleep.toFixed(1)} hours’ sleep last night`, 'bad')
  }
  if (!before.ready.ate || before.needs.hunger < 30) {
    energy -= 12
    stress += 4
    work = log(work, 'Started the day hungry', 'bad')
  }
  if (!before.ready.showered && before.needs.hygiene < 50) {
    work = changeReputation(work, -1)
    work = log(work, 'Came in without a shower', 'bad')
  }
  if (!before.ready.dressed) {
    work = changeReputation(work, -2)
    work = log(work, 'Came to work in yesterday’s clothes', 'bad')
  }
  if (before.needs.social < 25 && before.needs.fun < 25) {
    work = {
      ...work,
      wellbeing: { ...work.wellbeing, engagement: clamp(work.wellbeing.engagement - 10) },
    }
    work = log(work, 'Feeling flat: you need time for yourself and your friends', 'bad')
  }
  if (life.money < 0) {
    stress += 8
    work = log(work, 'Worried about money: your account is overdrawn', 'bad')
  }
  work = withWellbeing(work, energy, stress)
  return { ...started, work: { ...work, life } }
}

/** What the player should know about their needs right now. */
export function needWarnings(life: Life): string[] {
  const warnings: string[] = []
  if (life.needs.hunger < 30) warnings.push('You are hungry.')
  if (life.needs.hygiene < 40) warnings.push('You need a shower.')
  if (life.needs.social < 30) warnings.push('You miss your friends.')
  if (life.needs.fun < 30) warnings.push('You need some fun.')
  if (life.money < 0) warnings.push('Your account is overdrawn.')
  else if (life.food === 0) warnings.push('The fridge is empty.')
  return warnings
}
