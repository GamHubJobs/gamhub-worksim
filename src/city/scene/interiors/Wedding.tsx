/**
 * A wedding in the park (see game/family.ts): an arch of flowers, two rows of
 * chairs with the guests (the player's friends) sitting, turning to watch, and
 * cheering; the partner waiting under the arch. Walking up to them starts the
 * ceremony; the kiss and the first dance are done together, face to face (see
 * world/npc/moment.ts). Only on the evening set for it.
 */
import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { DATE_LOOKS } from '../../../content/adultLooks'
import { FRIENDS } from '../../../content/friends'
import { whoOf } from '../../../game/dates'
import type { Who } from '../../../game/encounters'
import type { PersonLook } from '../../../office/scene/people'
import { Box } from '../../../office/scene/parts'
import { Npc } from '../../../world/npc/Npc'
import { momentClips, momentNow, type MomentKind } from '../../../world/npc/moment'
import { Chair } from './common'
import { useInterior } from './kit'

/** Where it happens: the arch, and where the two of them stand. */
// On the grass east of the pond (the pond is the oval round 0, −2).
const WEDDING = {
  arch: { x: 7, z: -4.6 },
  partner: { x: 7, z: -4.3, heading: Math.PI },
  player: { x: 7, z: -3.75, heading: 0 },
}

const SEATS: Array<[number, number]> = [
  [6.0, -2.6],
  [6.55, -2.6],
  [7.45, -2.6],
  [8.0, -2.6],
  [6.0, -1.8],
  [6.55, -1.8],
  [7.45, -1.8],
]

const TOPS = ['#1d4ed8', '#be123c', '#047857', '#7c3aed', '#b45309', '#0f766e', '#4338ca']

const guestLook = (i: number): PersonLook => ({
  skin: i % 6,
  hair: (['short', 'long', 'bob', 'curly', 'side', 'bun', 'crop'] as const)[i % 7],
  hairColor: i % 4,
  outfit: i % 2 ? 'blouse' : 'shirt',
  top: TOPS[i % TOPS.length],
  trousers: '#1f2937',
  smile: true,
})

const guests: Who[] = FRIENDS.map((f) => ({
  id: `guest:${f.id}`,
  name: f.name,
  role: 'Wedding guest',
  kind: 'neighbour',
  personality: 'warm',
}))

export function Wedding() {
  const { wedding } = useInterior()
  const [moment, setMoment] = useState<MomentKind | null>(null)
  useFrame(() => {
    const m = momentNow()
    const kind = m && m.moment.with === wedding ? m.moment.kind : null
    if (kind !== moment) setMoment(kind)
  })
  const who = wedding ? whoOf(wedding) : undefined
  if (!wedding || !who) return null
  const clip = moment
    ? {
        id: momentClips({ kind: moment, with: wedding, place: 'park', at: 0, seconds: 0 })
          .partner,
        t: () => momentNow()?.t ?? 0,
      }
    : null
  // The guests cheer (a wave) at the kiss, and watch the dance.
  const cheer =
    moment === 'kiss' ? { id: 'wave' as const, t: () => momentNow()?.t ?? 0 } : null
  const { arch } = WEDDING
  return (
    <group>
      {/* The arch, with flowers */}
      {[-0.8, 0.8].map((dx) => (
        <Box
          key={dx}
          size={[0.12, 2.4, 0.12]}
          position={[arch.x + dx, 1.2, arch.z]}
          color="#f5f5f4"
        />
      ))}
      <Box size={[1.75, 0.14, 0.14]} position={[arch.x, 2.4, arch.z]} color="#f5f5f4" />
      {[-0.7, -0.35, 0, 0.35, 0.7].map((dx, i) => (
        <mesh key={dx} position={[arch.x + dx, 2.5, arch.z]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshStandardMaterial
            color={['#f9a8d4', '#fde68a', '#fbcfe8', '#fecaca', '#f9a8d4'][i]}
          />
        </mesh>
      ))}
      {/* An aisle */}
      <Box size={[0.8, 0.01, 3]} position={[7, 0.006, -2.6]} color="#fafaf9" />
      {SEATS.map(([x, z], i) => (
        <group key={i}>
          <Chair position={[x, 0, z + 0.3]} rotation={0} />
          {guests[i] && (
            <Npc
              who={guests[i]}
              position={[x, 0, z]}
              seated
              look={guestLook(i)}
              phase={i * 0.7}
              clip={cheer}
            />
          )}
        </group>
      ))}
      <Npc
        who={who}
        position={[WEDDING.partner.x, 0, WEDDING.partner.z]}
        rotation={WEDDING.partner.heading}
        look={{
          ...(DATE_LOOKS[wedding] ?? DATE_LOOKS.analyst),
          top: '#fafaf9',
          outfit: 'blouse',
        }}
        phase={0.3}
        clip={clip}
      />
    </group>
  )
}
