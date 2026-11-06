import { afterEach, describe, expect, it } from 'vitest'
import {
  DOOR,
  OFFICE_GATHERINGS,
  OFFICE_PEOPLE,
  OFFICE_PLACES,
} from '../../office/scene/officeCast'
import { OFFICE_BOXES } from '../../office/scene/officeLayout'
import type { Box } from '../character/controller'
import { blocked } from '../character/controller'
import { buildGrid } from '../physics/nav'
import { agent, NPC_RADIUS, placeAt, stepAgent, type Agent, type Goal } from './agent'
import { doingNow, everyone, wanted, type Intent } from './schedule'
import {
  allNpcs,
  approachPoint,
  canSee,
  engage,
  engagedFor,
  engagedIds,
  nearestNpc,
  release,
  removeNpc,
  setNpc,
  TALK_DISTANCE,
} from './people'
import type { Who } from '../../game/encounters'

const at = (h: number, m = 0) => h * 60 + m
const MONDAY = 1
const WEDNESDAY = 3
const place = (i: Intent | undefined) => (i?.kind === 'at' ? i.place : 'away')

describe('the office day', () => {
  it('every place anyone can be sent to exists', () => {
    for (const p of OFFICE_PEOPLE) {
      const names = [
        p.own,
        ...Object.values(p.meetings),
        ...p.errands.map((e) => e.to),
        ...(p.lunch && p.lunch.place !== 'own' && p.lunch.place !== 'out'
          ? [p.lunch.place]
          : []),
      ]
      for (const n of names) expect(OFFICE_PLACES[n], `${p.id}: ${n}`).toBeDefined()
    }
  })

  it('people arrive, settle at their places, and go home at the end of the day', () => {
    const early = everyone(OFFICE_PEOPLE, MONDAY, at(8), OFFICE_GATHERINGS)
    expect([...early.values()].every((i) => i.kind === 'away')).toBe(true)
    const night = everyone(OFFICE_PEOPLE, MONDAY, at(18, 30), OFFICE_GATHERINGS)
    expect([...night.values()].every((i) => i.kind === 'away')).toBe(true)
    // Mid-morning most people are at their own places.
    const work = everyone(OFFICE_PEOPLE, MONDAY, at(10, 5), OFFICE_GATHERINGS)
    const own = OFFICE_PEOPLE.filter((p) => place(work.get(p.id)) === p.own)
    expect(own.length).toBeGreaterThanOrEqual(OFFICE_PEOPLE.length - 4)
  })

  it('the team gathers at the whiteboard for the stand-up, and the manager leads it', () => {
    const standup = everyone(OFFICE_PEOPLE, MONDAY, at(9, 20), OFFICE_GATHERINGS)
    expect(place(standup.get('manager'))).toBe('standup:host')
    for (const id of ['senior', 'backL', 'backM', 'backR', 'front2', 'coordinator'])
      expect(place(standup.get(id)), id).toMatch(/^standup:/)
    // Reception and facilities carry on.
    expect(place(standup.get('reception'))).toBe('reception')
  })

  it('weekly planning is in the manager’s office on Wednesdays only', () => {
    const wed = everyone(OFFICE_PEOPLE, WEDNESDAY, at(11, 10), OFFICE_GATHERINGS)
    expect(place(wed.get('senior'))).toBe('planning:0')
    const mon = everyone(OFFICE_PEOPLE, MONDAY, at(11, 10), OFFICE_GATHERINGS)
    expect(place(mon.get('senior'))).not.toBe('planning:0')
  })

  it('lunch differs by person: the break room, the desk, or out', () => {
    const lunch = everyone(OFFICE_PEOPLE, MONDAY, at(12, 35), OFFICE_GATHERINGS)
    expect(place(lunch.get('senior'))).toBe('table:south')
    expect(place(lunch.get('coordinator'))).toBe('away')
    const late = everyone(OFFICE_PEOPLE, MONDAY, at(13, 20), OFFICE_GATHERINGS)
    expect(place(late.get('reception'))).toBe('reception')
  })

  it('no two people are ever at the same place, all day, all week', () => {
    for (let day = 1; day <= 5; day++)
      for (let m = at(8); m < at(19); m++) {
        const all = everyone(OFFICE_PEOPLE, day, m, OFFICE_GATHERINGS)
        const places = [...all.values()].filter((i) => i.kind === 'at').map(place)
        expect(new Set(places).size, `day ${day} at ${m}`).toBe(places.length)
      }
  })

  it('a visit only happens when the person visited is at their desk', () => {
    for (let m = at(8); m < at(19); m++) {
      const all = everyone(OFFICE_PEOPLE, MONDAY, m, OFFICE_GATHERINGS)
      for (const [, i] of all) {
        if (i.kind !== 'at' || i.reason !== 'visit') continue
        const host = OFFICE_PEOPLE.find((p) => p.id === i.with)!
        expect(place(all.get(host.id))).toBe(host.own)
      }
    }
  })

  it('every trip has a purpose and an end: no one goes back and forth for nothing', () => {
    // Through a whole day, a person changes place at most a few times an hour,
    // and each errand lasts its full length before they go back.
    for (const p of OFFICE_PEOPLE) {
      let last = ''
      let changes = 0
      for (let m = at(8); m < at(19); m++) {
        const now = place(wanted(p, MONDAY, m, OFFICE_GATHERINGS))
        if (now !== last) changes++
        last = now
      }
      expect(changes, p.id).toBeLessThan(40)
    }
  })

  it('someone the player comes to talk to is at their own place', () => {
    const all = everyone(OFFICE_PEOPLE, MONDAY, at(9, 20), OFFICE_GATHERINGS, {
      attending: new Set(['senior']),
    })
    expect(place(all.get('senior'))).toBe('desk:senior')
  })

  it('every place is on clear floor or a seat, inside the office', () => {
    const grid = buildGrid(OFFICE_BOXES, NPC_RADIUS)
    for (const [id, p] of Object.entries(OFFICE_PLACES)) {
      expect(p.x, id).toBeGreaterThan(-12)
      expect(p.x, id).toBeLessThan(12)
      expect(p.z, id).toBeGreaterThan(-8)
      expect(p.z, id).toBeLessThan(9.2)
      if (!p.seated) expect(blocked(p.x, p.z, 0.15, OFFICE_BOXES), id).toBe(false)
    }
    expect(grid.cells.length).toBeGreaterThan(0)
  })
})

describe('walking there', () => {
  const grid = buildGrid(OFFICE_BOXES, NPC_RADIUS + 0.04)
  const world = { grid, solids: OFFICE_BOXES, door: DOOR }
  const goalOf = (key: string): Goal => ({ key, ...OFFICE_PLACES[key] })

  function walk(a: Agent, goal: Goal | null, others: Box[] = [], seconds = 60) {
    const trail: Array<[number, number]> = []
    for (let t = 0; t < seconds; t += 0.05) {
      a = stepAgent(a, goal, world, others, 0.05)
      trail.push([a.x, a.z])
      if (a.status === 'there' || a.status === 'hidden') break
    }
    return { a, trail }
  }

  it('comes in through the door and walks to the desk, then stays put', () => {
    const { a } = walk(agent('senior'), goalOf('desk:senior'))
    expect(a.status).toBe('there')
    expect(Math.hypot(a.x - -1.2, a.z - 1.65)).toBeLessThan(0.05)
    // Staying there: no movement over the next half minute.
    let b = a
    for (let t = 0; t < 30; t += 0.1)
      b = stepAgent(b, goalOf('desk:senior'), world, [], 0.1)
    expect(b.x).toBe(a.x)
    expect(b.z).toBe(a.z)
  })

  it('walks round furniture, never through it, except stepping into the seat', () => {
    const start = placeAt(agent('senior'), goalOf('desk:senior'))
    const { a, trail } = walk(start, goalOf('printer'))
    expect(a.status).toBe('there')
    // All but the very ends are clear of the furniture.
    const inside = trail
      .slice(12, -12)
      .filter(([x, z]) => blocked(x, z, 0.18, OFFICE_BOXES))
    expect(inside).toEqual([])
  })

  it('waits for someone in the way, then goes round them', () => {
    const start = placeAt(agent('coordinator'), goalOf('standing'))
    // Someone standing in the doorway of the manager's office path.
    const { a } = walk(start, goalOf('visit:manager'), [
      { x: 5.6, z: -2.8, hx: 0.3, hz: 0.3, top: 1.7, round: true },
    ])
    expect(a.status).toBe('there')
  })

  it('a way that cannot be found is given up on, not tried forever', () => {
    const start = placeAt(agent('admin'), goalOf('filing'))
    // A goal walled in on every side.
    const shut: Box[] = [...OFFICE_BOXES, { x: 0, z: -6, hx: 1, hz: 1, top: 2 }]
    const g = buildGrid(shut, NPC_RADIUS + 0.04)
    let a = start
    const goal: Goal = { key: 'nowhere', x: 0, z: -6, heading: 0 }
    for (let t = 0; t < 120 && a.status !== 'there'; t += 0.05)
      a = stepAgent(a, goal, { grid: g, solids: shut, door: DOOR }, [], 0.05)
    expect(a.status).toBe('there')
  })

  it('leaves through the door when going home, and is then gone', () => {
    const start = placeAt(agent('backL'), goalOf('desk:backL'))
    const { a } = walk(start, null, [], 90)
    expect(a.status).toBe('hidden')
    expect(a.shown).toBe(false)
  })
})

describe('talking to people: who is near, where to stand', () => {
  const who = (id: string): Who => ({
    id,
    name: `${id} Person`,
    role: 'Tester',
    kind: 'colleague',
    personality: 'warm',
  })
  afterEach(() => {
    for (const n of allNpcs()) removeNpc(n.who.id)
    release()
  })

  it('the nearest person in reach and in sight, not through a wall', () => {
    setNpc({ who: who('a'), x: 1, z: 0, heading: 0, reach: 1.5, availability: 'free' })
    setNpc({ who: who('b'), x: 0, z: 1.2, heading: 0, reach: 1.5, availability: 'free' })
    expect(nearestNpc(0, 0, [])?.npc.who.id).toBe('a')
    // A wall between the player and a: b is the one.
    const wall: Box = { x: 0.5, z: 0, hx: 0.05, hz: 1, top: 2.9 }
    expect(nearestNpc(0, 0, [wall])?.npc.who.id).toBe('b')
    // Too far for anyone.
    expect(nearestNpc(5, 5, [])).toBeNull()
  })

  it('the player stands facing them, at talking distance, on the player’s side', () => {
    const at = approachPoint({ x: 0, z: 0, reach: 1.5 }, { x: 3, z: 0 })
    expect(at.x).toBeCloseTo(TALK_DISTANCE)
    expect(at.z).toBeCloseTo(0)
    // Facing −x, towards them (heading 0 faces −z).
    expect(Math.sin(at.heading)).toBeCloseTo(1)
    // Across a counter, as near as the counter allows.
    const counter = approachPoint({ x: 0, z: 0, reach: 2.1 }, { x: 0, z: 2.5 })
    expect(counter.z).toBeCloseTo(1.9)
  })

  it('who is talking to the player, and everyone back to their day after', () => {
    engage(['a', 'b'])
    expect(engagedFor('a')).toBeGreaterThanOrEqual(0)
    expect(engagedIds().sort()).toEqual(['a', 'b'])
    release()
    expect(engagedFor('a')).toBe(-1)
  })

  it('what someone is doing, as the player sees it on walking up', () => {
    const p = OFFICE_PEOPLE.find((q) => q.id === 'backL')!
    const none = new Map()
    expect(
      doingNow(p, { kind: 'at', place: p.own, reason: 'own' }, false, none, 600)
        .availability,
    ).toBe('working')
    expect(
      doingNow(p, { kind: 'at', place: 'standup:2', reason: 'meeting' }, false, none, 600)
        .availability,
    ).toBe('meeting')
    expect(
      doingNow(p, { kind: 'at', place: p.own, reason: 'own' }, true, none, 600)
        .availability,
    ).toBe('walking')
    expect(
      doingNow(p, { kind: 'at', place: p.own, reason: 'own' }, false, none, p.leaves - 2)
        .availability,
    ).toBe('leaving')
    // Someone has come over for a word: chatting, with them.
    const visit = new Map([
      [
        'backM',
        {
          kind: 'at' as const,
          place: 'visit:backL',
          reason: 'visit' as const,
          with: 'backL',
        },
      ],
    ])
    expect(
      doingNow(p, { kind: 'at', place: p.own, reason: 'own' }, false, visit, 600),
    ).toEqual({
      availability: 'chatting',
      with: 'backM',
    })
  })
})

describe('seeing someone across a desk', () => {
  it('a desk or a counter does not block the view; a wall does', () => {
    const desk: Box = { x: 0.5, z: 0, hx: 0.2, hz: 1, top: 1.1 }
    const wall: Box = { x: 0.5, z: 0, hx: 0.05, hz: 1, top: 2.9 }
    expect(canSee({ x: 0, z: 0 }, { x: 1.5, z: 0 }, [desk])).toBe(true)
    expect(canSee({ x: 0, z: 0 }, { x: 1.5, z: 0 }, [wall])).toBe(false)
  })
})
