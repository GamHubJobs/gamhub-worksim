import { describe, expect, it } from 'vitest'
import { getScenario, scenariosFor } from '../content/scenarios'
import { HOURS } from '../content/workday'
import {
  ARCH,
  COURT_DOOR,
  COURT_START,
  COURTHOUSE_BOXES,
  courthouseActivities,
  courtRoomAt,
  HALL,
  USHER_DESK,
} from '../court/courthouseLayout'
import { buildGrid, findPath, standing } from '../world/physics/nav'
import { newProfileData, type ProfileData } from './career'
import { backFromCourt, canGoToCourt, COURT_TRAVEL, goToCourt } from './court'

const hearing = getScenario('law-small-claim')!

function at(minute: number): ProfileData {
  const base = newProfileData('Alex', 1, 'legal')
  return { ...base, work: { ...base.work, minute } }
}

describe('going to court from the office', () => {
  it('is a law hearing, played at the court', () => {
    expect(hearing.venue).toBe('court')
    expect(scenariosFor('legal').map((s) => s.id)).toContain('law-small-claim')
    // The moot hearing stays in the firm's own courtroom.
    expect(getScenario('law-hearing')!.venue).toBeUndefined()
  })

  it('only while the court sits', () => {
    expect(canGoToCourt(at(HOURS.start))).toMatch(/sits from 10:00 am/)
    expect(canGoToCourt(at(10 * 60 + 30))).toBeNull()
    expect(canGoToCourt(at(15 * 60 + 50))).toMatch(/finished hearing cases/)
  })

  it('takes office time each way, and notes the journey', () => {
    const before = at(10 * 60 + 30)
    const there = goToCourt(before, hearing)
    expect(there.work.minute).toBe(before.work.minute + COURT_TRAVEL)
    expect(there.work.today.log.at(-1)?.text).toContain('Westmark County Court')
    const back = backFromCourt(there)
    expect(back.work.minute).toBe(there.work.minute + COURT_TRAVEL)
    expect(back.work.today.log.at(-1)?.text).toContain('Back at the office')
    // Too early: nothing happens.
    expect(goToCourt(at(HOURS.start), hearing).work.minute).toBe(HOURS.start)
  })
})

describe('the courthouse', () => {
  const grid = buildGrid(COURTHOUSE_BOXES, 0.32)

  it('can be walked from the door, through the arch and into Court 2', () => {
    expect(standing(grid, COURTHOUSE_BOXES, COURT_START)).toBe(true)
    const through = findPath(grid, COURT_START, { x: ARCH.x, z: ARCH.z + 1 })
    expect(through).not.toBeNull()
    expect(
      findPath(grid, COURT_START, { x: COURT_DOOR.x, z: HALL.z1 + 1 }),
    ).not.toBeNull()
    expect(findPath(grid, COURT_START, hearing.player.at)).not.toBeNull()
  })

  it('has every activity at a spot the player can reach', () => {
    for (const a of courthouseActivities()) {
      expect(findPath(grid, COURT_START, a.spot), a.id).not.toBeNull()
      expect(standing(grid, COURTHOUSE_BOXES, a.anchor), a.id).toBe(true)
    }
  })

  it('knows the hall from Court 2', () => {
    expect(courtRoomAt(USHER_DESK.x, USHER_DESK.z)).toBe('hall')
    expect(courtRoomAt(hearing.player.at.x, hearing.player.at.z)).toBe('court')
  })
})
