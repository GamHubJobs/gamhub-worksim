/**
 * Someone the player has a date with, waiting for them (see game/dates.ts):
 * at the café, sitting at the table by the window, across from the player's
 * seat; in the park, on the bench, leaving room beside them. They can be
 * talked to like anyone else; talking to them starts the date.
 */
import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { whoOf } from '../../../game/dates'
import {
  goodnightSpots,
  momentClips,
  momentNow,
  standing,
  type MomentKind,
} from '../../../world/npc/moment'
import type { PersonLook } from '../../../office/scene/people'
import { Npc } from '../../../world/npc/Npc'
import { useInterior } from './kit'

/** How each of them looks on an evening out. */
const LOOKS: Record<string, PersonLook> = {
  'cafe:barista': {
    skin: 2,
    hair: 'bun',
    hairColor: 1,
    outfit: 'blouse',
    top: '#be185d',
    trousers: '#1c1917',
    smile: true,
  },
  'cafe:friend': {
    skin: 1,
    hair: 'long',
    hairColor: 2,
    outfit: 'blouse',
    top: '#0f766e',
    trousers: '#334155',
    smile: true,
  },
  'gym:runner1': {
    skin: 3,
    hair: 'short',
    hairColor: 0,
    outfit: 'shirt',
    top: '#1e3a8a',
    trousers: '#27272a',
    smile: true,
  },
  'gym:runner2': {
    skin: 0,
    hair: 'bob',
    hairColor: 0,
    outfit: 'sweater',
    top: '#7c3aed',
    trousers: '#1f2937',
    glasses: true,
  },
  'garage:sales': {
    skin: 4,
    hair: 'short',
    hairColor: 0,
    outfit: 'shirt',
    top: '#f8fafc',
    trousers: '#1e293b',
    beard: true,
    smile: true,
  },
  analyst: {
    skin: 3,
    hair: 'side',
    hairColor: 0,
    outfit: 'sweater',
    top: '#b45309',
    trousers: '#1f2937',
    smile: true,
  },
}

export function DatePartner({ place }: { place: 'cafe' | 'park' }) {
  const { date } = useInterior()
  const who = date ? whoOf(date) : undefined
  // A moment with the player (holding hands, goodnight), followed frame by frame.
  const [moment, setMoment] = useState<MomentKind | null>(null)
  useFrame(() => {
    const m = momentNow()
    const kind = m && m.moment.with === date ? m.moment.kind : null
    if (kind !== moment) setMoment(kind)
  })
  if (!date || !who) return null
  const look = LOOKS[date] ?? LOOKS.analyst
  const clip = moment
    ? {
        id: momentClips({ kind: moment, with: date, place, at: 0, seconds: 0 }).partner,
        t: () => momentNow()?.t ?? 0,
      }
    : null
  // Saying goodnight: standing, face to face with the player.
  if (moment && standing(moment)) {
    const spot = goodnightSpots(place).partner
    return (
      <Npc
        who={who}
        position={[spot.x, 0, spot.z]}
        rotation={spot.heading}
        look={look}
        phase={0.3}
        clip={clip}
      />
    )
  }
  return place === 'cafe' ? (
    <Npc
      who={who}
      position={[-3, 0, 0.85]}
      rotation={Math.PI}
      seated
      look={look}
      phase={0.3}
      reach={1.9}
      clip={clip}
    />
  ) : (
    <Npc
      who={who}
      position={[-2.75, 0, 2.05]}
      seated
      look={look}
      phase={0.3}
      clip={clip}
    />
  )
}
