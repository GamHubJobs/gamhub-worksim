import { afterEach, describe, expect, it } from 'vitest'
import { CAREERS } from '../../content/careers'
import { setActiveCareer } from '../../content/departments'
import { careerAssignments, newProfileData, type ProfileData } from '../../game/career'
import { activeBay, activeTheme, workplaceActivities } from './bays'
import { itActivities } from './officeLayout'
import { OFFICE_PEOPLE, OFFICE_PLACES, setStations } from './officeCast'
import { stationsFrom } from './stations'
import { boardFor } from './workBoard'

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
