import { afterEach, describe, expect, it } from 'vitest'
import { CAREERS } from '../../content/careers'
import { setActiveCareer } from '../../content/departments'
import { careerAssignments, newProfileData, type ProfileData } from '../../game/career'
import { activeBay, activeTheme, workplaceActivities } from './bays'
import { itActivities } from './officeLayout'
import {
  HUDDLE,
  OFFICE_GATHERINGS,
  OFFICE_PEOPLE,
  OFFICE_PLACES,
  setStations,
  setWorkNow,
} from './officeCast'
import { wanted } from '../../world/npc/schedule'
import { stationsFrom } from './stations'
import { TASK_SPOTS } from './taskSpots'
import { boardFor } from './workBoard'
import { workStateOf } from './workState'

const stationsNow = () => {
  const bay = activeBay()
  return stationsFrom([
    ...workplaceActivities(bay, activeTheme()),
    ...(bay ? [] : itActivities([])),
  ])
}

afterEach(() => {
  setActiveCareer(CAREERS[0].id)
  setStations([])
  setWorkNow({ redo: 0 })
})

describe('the work in every workplace', () => {
  it('every career has work stations of its own, where colleagues go', () => {
    const seen = new Map<string, string>()
    for (const career of CAREERS) {
      setActiveCareer(career.id)
      const stations = stationsNow()
      expect(stations.length, career.id).toBeGreaterThanOrEqual(2)
      for (const s of stations) {
        expect(Number.isFinite(s.x) && Number.isFinite(s.z)).toBe(true)
        // Only what can be done anywhere (no shelf or whiteboard needed there).
        expect(['write', 'read', 'talk', 'phone', 'stand']).toContain(s.clip)
      }
      // Its own: not the same set of places as any other career's.
      const key = stations.map((s) => `${s.x},${s.z}`).join('|')
      expect([...seen.values()], career.id).not.toContain(key)
      seen.set(career.id, key)
    }
  })

  it('colleagues go to them through the day (and only where there are any)', () => {
    setActiveCareer('healthcare')
    const stations = stationsNow()
    setStations(stations)
    expect(OFFICE_PLACES['station:0']).toEqual(stations[0])
    const senior = OFFICE_PEOPLE.find((p) => p.id === 'senior')!
    const errand = senior.errands.find((e) => e.to.startsWith('station:'))!
    expect(errand.chance).toBeGreaterThan(0)
    setStations([])
    expect(errand.chance).toBe(0)
  })

  it('the team board follows the save: a task handed in is ticked off', () => {
    for (const career of CAREERS) {
      setActiveCareer(career.id)
      const fresh: ProfileData = newProfileData('Alex', 1, career.id)
      const before = boardFor(fresh)
      expect(before.team.length).toBeGreaterThan(0)
      expect(before.total).toBe(careerAssignments(career.id).length)
      expect(before.done).toBe(0)
      const first = careerAssignments(career.id)[0]
      const after = boardFor({
        ...fresh,
        assignments: {
          ...fresh.assignments,
          [first.id]: {
            assignmentId: first.id,
            assignmentVersion: 1,
            documentId: 'doc',
            startedAt: 0,
            completedSteps: [],
            attempts: [{ score: 100, rating: 'excellent', checks: [] }],
          } as never,
        },
      })
      expect(after.done, career.id).toBe(1)
      expect(after.items.some((i) => i.title === first.title && i.state === 'done')).toBe(
        true,
      )
    }
  })
})

describe('working together, and responding to the work', () => {
  it('the afternoon huddle gathers three at the main work station, every career', () => {
    expect(OFFICE_GATHERINGS).toContain(HUDDLE)
    for (const career of CAREERS) {
      setActiveCareer(career.id)
      setStations(stationsNow())
      const main = OFFICE_PLACES['huddle:0']
      expect(main.x).toBe(stationsNow()[0].x)
      for (const k of ['huddle:1', 'huddle:2']) {
        const p = OFFICE_PLACES[k]
        // Close beside the one at the station, not on top of them.
        const d = Math.hypot(p.x - main.x, p.z - main.z)
        expect(d, career.id).toBeGreaterThan(0.6)
        expect(d, career.id).toBeLessThan(1.4)
      }
      const monday = 1
      const at = HUDDLE.start + 5
      const where = ['senior', 'backM', 'backR'].map((id) => {
        const p = OFFICE_PEOPLE.find((q) => q.id === id)!
        return wanted(p, monday, at, OFFICE_GATHERINGS)
      })
      expect(where.map((w) => (w.kind === 'at' ? w.place : w.kind))).toEqual([
        'huddle:0',
        'huddle:1',
        'huddle:2',
      ])
    }
  })

  it('work sent back brings the senior colleague over to go through it', () => {
    const senior = OFFICE_PEOPLE.find((p) => p.id === 'senior')!
    const review = senior.errands.find((e) => e.to === 'review:player')!
    expect(OFFICE_PLACES['review:player']).toBeDefined()
    expect(review.chance).toBe(0)
    setWorkNow({ redo: 1 })
    expect(review.chance).toBeGreaterThan(0)
    setWorkNow({ redo: 0 })
    expect(review.chance).toBe(0)
  })
})

describe('each task at its equipment (the themed workplaces)', () => {
  it("every spot is one of that workplace career's own tasks, on the floor", () => {
    let spots = 0
    for (const career of CAREERS) {
      setActiveCareer(career.id)
      const theme = activeTheme()
      if (theme === 'office') continue
      const ids = careerAssignments(career.id).map((a) => a.id)
      for (const s of TASK_SPOTS[theme]) {
        expect(ids, `${career.id}: ${s.task}`).toContain(s.task)
        expect(s.y).toBeGreaterThan(0.5)
        expect(s.y).toBeLessThan(2.6)
        spots++
      }
      // Every one of the career's own tasks that has a place has a lamp there.
      expect(TASK_SPOTS[theme].length, career.id).toBeGreaterThanOrEqual(5)
    }
    expect(spots).toBe(15)
  })

  it("each task's state comes from the save, through to the scene", () => {
    setActiveCareer('legal')
    const fresh = newProfileData('Alex', 1, 'legal')
    // The first task is given; the rest are locked until it is done (no lamp yet).
    expect(boardFor(fresh).tasks['legal-intake']).toBe('next')
    expect(boardFor(fresh).tasks['legal-research']).toBeUndefined()
    const handed = boardFor({
      ...fresh,
      assignments: {
        'legal-research': {
          assignmentId: 'legal-research',
          assignmentVersion: 1,
          documentId: 'doc',
          startedAt: 0,
          completedSteps: [],
          attempts: [{ score: 10, rating: 'needs-work', checks: [] }],
        } as never,
        'legal-intake': {
          assignmentId: 'legal-intake',
          assignmentVersion: 1,
          documentId: 'doc',
          startedAt: 0,
          completedSteps: [],
          attempts: [],
        } as never,
      },
    })
    expect(handed.tasks['legal-research']).toBe('redo')
    expect(handed.tasks['legal-intake']).toBe('doing')
    const work = workStateOf(JSON.stringify(handed))
    expect(work.tasks['legal-research']).toBe('redo')
    expect(workStateOf(undefined).tasks).toEqual({})
  })
})

describe("the engineer's project on the board", () => {
  it('shows the project in hand, from the save, once there is one', async () => {
    const { startProject } = await import('../../engineering/engine')
    setActiveCareer('engineering-services')
    const fresh = newProfileData('Alex', 1, 'engineering-services')
    expect(boardFor(fresh).project).toBeUndefined()
    const started = startProject(fresh, 'yard-store')
    expect(boardFor(started).project).toBe('Yard store · rev 1 draft')
  })
})
