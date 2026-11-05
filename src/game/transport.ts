/**
 * Getting around: which ways to work the player can use, buying and selling a
 * bike, leasing a car (and its weekly charge), and riding the bike round the
 * neighbourhood.
 */
import { closedReason, getPlace } from '../content/city'
import { COMMUTES, formatMoney, type CommuteId } from '../content/life'
import { BIKE, CAR } from '../content/transport'
import type { Life } from '../persistence/schemas'
import type { ProfileData } from './career'
import { weekNumber } from './clock'
import { earn, note, spend, withLife } from './lifeTime'

/** Why the player cannot travel this way now, or null. */
export function canCommute(life: Life, id: CommuteId): string | null {
  const commute = COMMUTES.find((c) => c.id === id)!
  if (commute.vehicle === 'bike' && !life.vehicles.bike)
    return 'You need a bike (Cog & Kerb).'
  if (commute.vehicle === 'car' && !life.vehicles.car)
    return 'You need a car (Cog & Kerb).'
  if (life.money < commute.cost)
    return `You cannot afford it (${formatMoney(commute.cost)}).`
  return null
}

/** Why the player cannot buy or hire at Cog & Kerb now, or null. */
function atGarage(profile: ProfileData): string | null {
  const life = profile.work.life
  if (!profile.work.dayOver || life.city.at !== 'garage' || !life.city.inside)
    return 'Only at Cog & Kerb.'
  return closedReason(getPlace('garage')!, life.minute)
}

export type TransportDeal = 'buy-bike' | 'sell-bike' | 'lease-car' | 'end-lease'

export function canDeal(profile: ProfileData, deal: TransportDeal): string | null {
  const closed = atGarage(profile)
  if (closed) return closed
  const { vehicles, money } = profile.work.life
  switch (deal) {
    case 'buy-bike':
      if (vehicles.bike) return 'You already have a bike.'
      return money < BIKE.price
        ? `You cannot afford it (${formatMoney(BIKE.price)}).`
        : null
    case 'sell-bike':
      return vehicles.bike ? null : 'You do not have a bike.'
    case 'lease-car':
      if (vehicles.car) return 'You already lease a car.'
      return money < CAR.deposit
        ? `You need ${formatMoney(CAR.deposit)} for the first week.`
        : null
    case 'end-lease':
      return vehicles.car ? null : 'You do not lease a car.'
  }
}

export function deal(profile: ProfileData, which: TransportDeal): ProfileData {
  if (canDeal(profile, which)) return profile
  const day = profile.work.day
  let life = profile.work.life
  const vehicles = life.vehicles
  switch (which) {
    case 'buy-bike':
      life = spend(life, day, BIKE.price, 'Bought a bike')
      life = note({ ...life, vehicles: { ...vehicles, bike: true } }, 'Bought a bike')
      break
    case 'sell-bike': {
      const price = Math.round(BIKE.price * BIKE.resale)
      life = earn(life, day, price, 'Sold the bike')
      life = {
        ...life,
        vehicles: { ...vehicles, bike: false },
        city: { ...life.city, riding: false },
        commute: life.commute === 'bike' ? 'bus' : life.commute,
      }
      life = note(life, `Sold the bike for ${formatMoney(price)}`)
      break
    }
    case 'lease-car':
      life = spend(life, day, CAR.deposit, 'Car lease: first week')
      life = note(
        { ...life, vehicles: { ...vehicles, car: true, carWeek: weekNumber(day) } },
        'Leased a car',
      )
      break
    case 'end-lease':
      life = note(
        {
          ...life,
          vehicles: { ...vehicles, car: false },
          commute: life.commute === 'car' ? 'bus' : life.commute,
        },
        'Handed the car back',
      )
      break
  }
  return withLife(profile, life)
}

/** The weekly lease, taken on Monday mornings (with the rent). */
export function chargeCarLease(life: Life, day: number): Life {
  const week = weekNumber(day)
  if (!life.vehicles.car || life.vehicles.carWeek >= week) return life
  life = spend(life, day, CAR.weekly, `Car lease for week ${week}`)
  life = { ...life, vehicles: { ...life.vehicles, carWeek: week } }
  return note(life, `Paid ${formatMoney(CAR.weekly)} for the car`)
}

/** Gets on or off the bike, out in the street. */
export function setRiding(profile: ProfileData, riding: boolean): ProfileData {
  const life = profile.work.life
  if (riding && (!life.vehicles.bike || life.city.inside || !profile.work.dayOver))
    return profile
  if (life.city.riding === riding) return profile
  return withLife(profile, { ...life, city: { ...life.city, riding } })
}
