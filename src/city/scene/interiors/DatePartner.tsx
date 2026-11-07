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
import { DATE_LOOKS as LOOKS } from '../../../content/adultLooks'
import { Npc } from '../../../world/npc/Npc'
import { useInterior } from './kit'

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
