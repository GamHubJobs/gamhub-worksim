import { afterEach, describe, expect, it } from 'vitest'
import { setActiveCareer, workplaceKind } from '../../content/departments'
import { errandAt } from '../../world/npc/schedule'
import { buildGrid, findPath, standing } from '../../world/physics/nav'
import { bayFor, floorWith, roomAt } from './bays'
import { hasWing, OFFICE_PEOPLE, OFFICE_PLACES } from './officeCast'
import { themeOf } from './themeLayout'

afterEach(() => setActiveCareer('office-admin-finance'))

const CAREERS: Array<[string, string]> = [
  ['healthcare', 'Bay B'],
  ['engineering-services', 'The inspection bench'],
  ['legal', 'The records room'],
]

/** Whether someone has a wing errand at some point in a working week. */
function goesToWing(id: string): boolean {
  const p = OFFICE_PEOPLE.find((q) => q.id === id)!
  for (let day = 1; day <= 5; day++)
    for (let minute = 9 * 60; minute < 17 * 60; minute += 5)
      if (errandAt(p, day, minute)?.to === 'wing:work') return true
  return false
}

describe('colleagues at work in the wing', () => {
  it.each(CAREERS)('%s: they go into the wing during the week', (career, room) => {
    setActiveCareer(career)
    expect(hasWing()).toBe(true)
    const kind = workplaceKind()
    const bay = bayFor(kind as Parameters<typeof bayFor>[0])
    const boxes = floorWith(bay, themeOf(kind))
    const place = OFFICE_PLACES['wing:work']
    expect(roomAt(place.x, place.z, bay, themeOf(kind))).toBe(room)
    const grid = buildGrid(boxes, 0.3)
    expect(standing(grid, boxes, place)).toBe(true)
    expect(findPath(grid, { x: 2.4, z: 2.4 }, place)).not.toBeNull()
    expect(goesToWing('senior') || goesToWing('backR')).toBe(true)
  })

  it('never in an office without a wing', () => {
    setActiveCareer('office-admin-finance')
    expect(hasWing()).toBe(false)
    expect(goesToWing('senior')).toBe(false)
    expect(goesToWing('backR')).toBe(false)
  })
})
