/**
 * The café's and the shop's walk-in customers: people with a routine of their
 * own (world/npc/schedule.ts), coming in through the door again and again
 * while the place is open, going to the counter first (the café) or the
 * checkout last (the shop), sitting at a table or browsing an aisle in
 * between, and leaving the way they came. Walked round the furniture by the
 * same crowd the office uses, and talked to like anyone else. The regulars
 * (and the people the player can get close to) stay where they are; these
 * are passers-through. On low graphics, one each.
 */
import { useMemo } from 'react'
import { PLACES } from '../../../content/city'
import type { Who } from '../../../game/encounters'
import type { PersonLook } from '../../../office/scene/people'
import { Crowd } from '../../../world/npc/Crowd'
import type { Person, Place } from '../../../world/npc/schedule'
import { useInterior } from './kit'

type Room = 'cafe' | 'shop'

const who = (id: string, name: string, kind: Who['kind'], role: string): Who => ({
  id,
  name,
  role,
  kind,
  personality: 'warm',
})

const hours = (room: Room) => PLACES.find((p) => p.id === room)!.open!

const CAFE_PLACES: Record<string, Place> = {
  counter: {
    x: -2.4,
    z: -2.15,
    heading: 0,
    clip: 'stand',
    also: ['phone'],
    label: 'ordering at the counter',
  },
  window: {
    x: 4.4,
    z: 1.85,
    heading: Math.PI,
    seated: true,
    clip: 'drink',
    also: ['read', 'phone'],
    label: 'having a coffee',
  },
  corner: {
    x: -3,
    z: 2.35,
    heading: Math.PI,
    seated: true,
    clip: 'eat',
    also: ['drink'],
    label: 'having something to eat',
  },
}

const SHOP_PLACES: Record<string, Place> = {
  checkout: {
    x: 3.05,
    z: 1.2,
    heading: -Math.PI / 2,
    clip: 'stand',
    also: ['phone'],
    label: 'paying at the checkout',
  },
  aisle: {
    x: 0.25,
    z: -1.5,
    heading: Math.PI / 2,
    clip: 'reach',
    also: ['stand'],
    label: 'looking along the shelves',
  },
  back: {
    x: 2.4,
    z: -3.45,
    heading: 0,
    clip: 'reach',
    also: ['stand', 'phone'],
    label: 'choosing from the fridges',
  },
}

const customer = (
  room: Room,
  id: string,
  own: string,
  offset: number,
  stay: number,
): Person => {
  const [arrives, leaves] = hours(room)
  return {
    id,
    role: 'customer',
    own,
    arrives,
    leaves,
    lunch: null,
    meetings: {},
    errands: [],
    visits: {
      every: 50,
      stay,
      offset,
      ...(room === 'cafe'
        ? { before: { place: 'counter', minutes: 4 } }
        : { after: { place: 'checkout', minutes: 3 } }),
    },
  }
}

const CAST: Record<Room, { people: Person[]; who: Who[]; looks: PersonLook[] }> = {
  cafe: {
    people: [
      customer('cafe', 'cafe:walkin1', 'window', 0, 32),
      customer('cafe', 'cafe:walkin2', 'corner', 22, 28),
    ],
    who: [
      who('cafe:walkin1', 'Owen Marsh', 'diner', 'Café customer'),
      who('cafe:walkin2', 'Hana Ito', 'diner', 'Café customer'),
    ],
    looks: [
      {
        skin: 2,
        hair: 'short',
        hairColor: 1,
        outfit: 'shirt',
        top: '#64748b',
        trousers: '#1f2937',
      },
      {
        skin: 0,
        hair: 'bob',
        hairColor: 0,
        outfit: 'cardigan',
        top: '#ca8a04',
        under: '#fafaf9',
        trousers: '#3f3f46',
      },
    ],
  },
  shop: {
    people: [
      customer('shop', 'shop:walkin1', 'aisle', 0, 20),
      customer('shop', 'shop:walkin2', 'back', 26, 18),
    ],
    who: [
      who('shop:walkin1', 'Gus Pereira', 'shopper', 'Shopper'),
      who('shop:walkin2', 'Lucy Fenwick', 'shopper', 'Shopper'),
    ],
    looks: [
      {
        skin: 4,
        hair: 'crop',
        hairColor: 0,
        outfit: 'sweater',
        top: '#1d4ed8',
        trousers: '#334155',
      },
      {
        skin: 1,
        hair: 'ponytail',
        hairColor: 2,
        outfit: 'sweater',
        top: '#be185d',
        trousers: '#1e293b',
      },
    ],
  },
}

/** Where the customers come in and leave, just inside the front door. */
const DOORS: Record<Room, { x: number; z: number }> = {
  cafe: { x: 1.2, z: 4.05 },
  shop: { x: 0.6, z: 4.55 },
}

export function Customers({ room }: { room: Room }) {
  const { low, day, minute } = useInterior()
  const cast = CAST[room]
  const people = useMemo(() => (low ? cast.people.slice(0, 1) : cast.people), [cast, low])
  const whoById = useMemo(
    () => Object.fromEntries(cast.who.map((w) => [w.id, w])),
    [cast],
  )
  const looks = useMemo(
    () => Object.fromEntries(cast.people.map((p, i) => [p.id, cast.looks[i]])),
    [cast],
  )
  return (
    <Crowd
      people={people}
      places={room === 'cafe' ? CAFE_PLACES : SHOP_PLACES}
      gatherings={[]}
      door={DOORS[room]}
      day={day ?? 1}
      minute={minute ?? hours(room)[0]}
      looks={looks}
      who={whoById}
      low={low}
    />
  )
}
