/**
 * Someone at the player's home (see game/romance.ts, atHome): visiting for
 * the evening, waking up there after staying over, or living there. They sit
 * on the sofa beside the player's place (or stand, without a sofa), can be
 * talked to like anyone, hold hands on the sofa, and say goodnight at the door,
 * standing face to face, after a yes (see world/npc/moment.ts).
 */
import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { DATE_LOOKS } from '../../content/adultLooks'
import { whoOf } from '../../game/dates'
import { Npc } from '../../world/npc/Npc'
import { momentClips, momentNow, standing, type MomentKind } from '../../world/npc/moment'
import type { HomeLayout } from './homeLayout'

export function HomePartner({ id, layout }: { id: string; layout: HomeLayout }) {
  const who = whoOf(id)
  const [moment, setMoment] = useState<MomentKind | null>(null)
  useFrame(() => {
    const m = momentNow()
    const kind = m && m.moment.with === id ? m.moment.kind : null
    if (kind !== moment) setMoment(kind)
  })
  if (!who) return null
  const look = DATE_LOOKS[id] ?? DATE_LOOKS.analyst
  const clip = moment
    ? {
        id: momentClips({ kind: moment, with: id, place: 'home', at: 0, seconds: 0 })
          .partner,
        t: () => momentNow()?.t ?? 0,
      }
    : null
  const seat = layout.partner.seat
  if ((moment && standing(moment)) || !seat) {
    const spot = layout.partner.goodnight.partner
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
  return (
    <Npc
      who={who}
      position={[seat.x, seat.y ?? 0, seat.z]}
      rotation={seat.heading}
      seated
      look={look}
      phase={0.3}
      clip={clip}
    />
  )
}
