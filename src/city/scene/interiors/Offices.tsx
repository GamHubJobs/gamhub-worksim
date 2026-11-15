/**
 * Harbourside House inside: a carpeted reception with a front desk and the
 * receptionist, waiting chairs along the right wall, and Meeting Room 2 behind
 * a glass partition, where the interviewer waits at the table and comes out
 * to call the player in (see officesLayout.ts and game/careerLife.ts).
 */
import { useMemo } from 'react'
import { TOWN_PEOPLE } from '../../../content/townPeople'
import { Box, Plant } from '../../../office/scene/parts'
import { Npc } from '../../../world/npc/Npc'
import { Crowd } from '../../../world/npc/Crowd'
import type { Person } from '../../../world/npc/schedule'
import { Board, Chair, Hotspot, Lamp, Room } from './common'
import { signPainting, useInterior } from './kit'
import {
  CANDIDATE_CHAIR,
  INTERVIEWER_CHAIR,
  INTERVIEWER_PLACES,
  MEETING,
  MEETING_TABLE,
  OFFICES_SIZE,
  RECEPTION_DESK,
  RECEPTIONIST,
  WAITING_CHAIRS,
} from './officesLayout'

const INTERVIEWER: Person = {
  id: TOWN_PEOPLE.interviewer.id,
  role: 'Interviewer',
  own: 'room',
  arrives: 0,
  leaves: 24 * 60,
  lunch: null,
  meetings: {},
  errands: [],
}
const PEOPLE = [INTERVIEWER]
const LOOKS = {
  [INTERVIEWER.id]: {
    skin: 2,
    hair: 'short' as const,
    hairColor: 1,
    outfit: 'shirt' as const,
    top: '#e2e8f0',
    trousers: '#1e293b',
    smile: true,
  },
}
const WHO = { [INTERVIEWER.id]: TOWN_PEOPLE.interviewer }
/** Just inside the meeting room's doorway (where the interviewer would come in from). */
const ROOM_DOOR = { x: (MEETING.door[0] + MEETING.door[1]) / 2, z: MEETING.z1 - 0.4 }

const GLASS = '#bfdbfe'

export default function Offices() {
  const { dark, low, day, minute, interviewer } = useInterior()
  const callers = useMemo(
    () => (interviewer === 'collect' ? { [INTERVIEWER.id]: 'collect' } : undefined),
    [interviewer],
  )
  const { width, depth, height } = OFFICES_SIZE
  return (
    <group>
      <Room
        floorKind="carpet"
        width={width}
        depth={depth}
        height={height}
        floor="#475569"
        wall="#f1f5f9"
        side="#e2e8f0"
        ceiling="#f8fafc"
      />
      <Board
        size={[3.6, 0.7]}
        position={[2.2, 2.5, -4.86]}
        painting={signPainting('Harbourside House', '#0f766e', '#ffffff')}
        paintingKey="offices-sign"
        glow={dark}
      />

      {/* Reception: the front desk with a screen, the visitors' book and the receptionist */}
      <group position={[RECEPTION_DESK.x, 0, RECEPTION_DESK.z]}>
        <Box size={[2.6, 1.05, 0.8]} position={[0, 0.52, 0]} color="#0f766e" />
        <Box size={[2.7, 0.05, 0.9]} position={[0, 1.07, 0]} color="#e7e5e4" />
        <Box
          size={[0.55, 0.36, 0.03]}
          position={[-0.7, 1.3, -0.2]}
          color="#0f172a"
          emissive="#5eead4"
        />
        {/* The visitors' book, open, with a pen */}
        <Box size={[0.42, 0.02, 0.3]} position={[0.4, 1.1, 0.2]} color="#fafaf9" />
        <Box size={[0.14, 0.01, 0.01]} position={[0.5, 1.12, 0.22]} color="#1e3a8a" />
        {/* Visitor badges in a tray */}
        <Box size={[0.24, 0.04, 0.16]} position={[0.95, 1.11, 0.15]} color="#334155" />
      </group>
      <Npc
        who={TOWN_PEOPLE.officesReception}
        reach={2.1}
        position={[RECEPTIONIST.x, 0, RECEPTIONIST.z]}
        rotation={RECEPTIONIST.heading}
        look={{
          skin: 5,
          hair: 'bun',
          hairColor: 0,
          outfit: 'blazer',
          top: '#134e4a',
          trousers: '#1f2937',
          smile: true,
        }}
        phase={0.9}
      />

      {/* The waiting area: chairs along the right wall, a low table with magazines */}
      {WAITING_CHAIRS.map((c, i) => (
        <Chair key={i} position={[c.x, 0, c.z]} rotation={c.heading} colour="#115e59" />
      ))}
      <Box size={[0.7, 0.45, 1.0]} position={[4.4, 0.22, 1.3]} color="#d6d3d1" />
      <Box size={[0.3, 0.02, 0.22]} position={[4.4, 0.46, 1.1]} color="#f97316" />
      <Box size={[0.3, 0.02, 0.22]} position={[4.35, 0.47, 1.5]} color="#38bdf8" />
      <Plant position={[5.3, 0, -4.3]} scale={1.4} />
      <Plant position={[-5.4, 0, 4.2]} />

      {/* Meeting Room 2: glass partition, a doorway, the table and two chairs */}
      {[
        [MEETING.x0, MEETING.door[0]],
        [MEETING.door[1], MEETING.x1],
      ].map(([a, b]) => (
        <group key={a}>
          <Box
            size={[b - a, 2.6, 0.04]}
            position={[(a + b) / 2, 1.3, MEETING.z1]}
            color={GLASS}
            opacity={0.35}
          />
          <Box
            size={[b - a, 0.06, 0.08]}
            position={[(a + b) / 2, 2.6, MEETING.z1]}
            color="#64748b"
          />
          {/* A frosted band at eye level */}
          <Box
            size={[b - a, 0.3, 0.05]}
            position={[(a + b) / 2, 1.5, MEETING.z1]}
            color="#f8fafc"
            opacity={0.6}
          />
        </group>
      ))}
      <Box
        size={[0.04, 2.6, MEETING.z1 - MEETING.z0]}
        position={[MEETING.x1, 1.3, (MEETING.z0 + MEETING.z1) / 2]}
        color={GLASS}
        opacity={0.35}
      />
      <Board
        size={[0.9, 0.24]}
        position={[MEETING.door[1] + 0.45, 2.1, MEETING.z1 + 0.04]}
        painting={signPainting('Meeting Room 2', '#334155', '#ffffff')}
        paintingKey="offices-room-sign"
      />
      <group position={[MEETING_TABLE.x, 0, MEETING_TABLE.z]}>
        <Box size={[2.0, 0.05, 1.0]} position={[0, 0.74, 0]} color="#e7e5e4" />
        <Box size={[0.1, 0.72, 0.1]} position={[-0.8, 0.36, 0]} color="#57534e" />
        <Box size={[0.1, 0.72, 0.1]} position={[0.8, 0.36, 0]} color="#57534e" />
        {/* The player's application, printed, and a jug of water */}
        <Box size={[0.22, 0.01, 0.3]} position={[0.1, 0.775, -0.25]} color="#fafafa" />
        <Box
          size={[0.1, 0.22, 0.1]}
          position={[-0.6, 0.88, 0]}
          color="#bae6fd"
          opacity={0.7}
        />
      </group>
      <Chair
        position={[INTERVIEWER_CHAIR.x, 0, INTERVIEWER_CHAIR.z]}
        rotation={INTERVIEWER_CHAIR.heading}
        colour="#1e293b"
      />
      <Chair
        position={[CANDIDATE_CHAIR.x, 0, CANDIDATE_CHAIR.z]}
        rotation={CANDIDATE_CHAIR.heading}
        colour="#1e293b"
      />
      {/* A screen on the meeting room's back wall */}
      <Box
        size={[1.6, 0.9, 0.05]}
        position={[-3, 1.7, MEETING.z0 + 0.06]}
        color="#0f172a"
      />

      {interviewer && (
        <Crowd
          people={PEOPLE}
          places={INTERVIEWER_PLACES}
          gatherings={[]}
          door={ROOM_DOOR}
          day={day ?? 1}
          minute={minute ?? 18 * 60}
          looks={LOOKS}
          who={WHO}
          callers={callers}
          low={low}
        />
      )}
      {/* The waiting chairs are where to sit and wait (once signed in). */}
      <Hotspot
        action="interview-wait"
        position={[WAITING_CHAIRS[1].x - 0.6, 0, WAITING_CHAIRS[1].z]}
        ring={1.2}
        tag={2}
      >
        <group />
      </Hotspot>

      {[-3, 2].map((x) => (
        <Lamp
          key={x}
          position={[x, height - 0.4, 0]}
          colour="#ffffff"
          intensity={4}
          shade="#cbd5e1"
        />
      ))}
    </group>
  )
}
