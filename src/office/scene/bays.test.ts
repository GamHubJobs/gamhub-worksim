import { describe, expect, it } from 'vitest'
import { clipFrame } from '../../world/character/rig'
import { buildGrid, findPath, standing } from '../../world/physics/nav'
import {
  BAY_KINDS,
  bayFor,
  floorWith,
  opensFor,
  roomAt,
  workplaceActivities,
} from './bays'
import { OFFICE_PLACES } from './officeCast'
import { officeActivities } from './officeLayout'
import { THEME_BOXES, themeOf, type Theme } from './themeLayout'

/** In front of the player's own desk: where they usually start. */
const DESK = { x: 2.4, z: 2.4 }
const CAREER_TOOLS = ['clinical', 'engineering', 'legal', 'books', 'social', 'datastudio']

describe.each(BAY_KINDS)('the %s workplace', (kind) => {
  const bay = bayFor(kind)
  const theme: Theme = themeOf(kind)
  const boxes = floorWith(bay, theme)
  // The radius the player's walking route is planned with (PlayerRig).
  const grid = buildGrid(boxes, 0.32)
  const own = workplaceActivities(bay, theme)

  it('opens an app or a career tool, and has things to do', () => {
    if (bay.opens.app === 'tool') expect(CAREER_TOOLS).toContain(bay.opens.tool)
    expect(own.map((a) => a.id)).toContain(bay.goTo)
    for (const a of own) expect(opensFor(a.action, bay), a.id).not.toBeNull()
  })

  it.each(
    workplaceActivities(bayFor(kind), themeOf(kind)).map((a) => [a.id, a] as const),
  )('%s: the player can stand there and walk there from the desk', (_, activity) => {
    const at = { x: activity.anchor!.x, z: activity.anchor!.z }
    expect(standing(grid, boxes, at)).toBe(true)
    expect(findPath(grid, DESK, at)).not.toBeNull()
  })

  it('keeps every everyday activity of the office reachable', () => {
    for (const a of officeActivities()) {
      if (!a.anchor || a.spot.reach < 0) continue
      const at = { x: a.anchor.x, z: a.anchor.z }
      expect(findPath(grid, DESK, at), a.id).not.toBeNull()
    }
  })

  it('leaves the colleagues’ places clear', () => {
    for (const [id, p] of Object.entries(OFFICE_PLACES)) {
      if (p.seated) continue
      expect(standing(grid, THEME_BOXES[theme], { x: p.x, z: p.z }), id).toBe(true)
    }
  })

  it('replaces the IT corner rather than adding to it', () => {
    expect(boxes.length).toBe(
      floorWith(null).length - 2 + bay.boxes.length + THEME_BOXES[theme].length,
    )
  })
})

describe('what an activity opens', () => {
  it('reads apps and tools from the action', () => {
    expect(opensFor('open:sheets', null)).toEqual({ app: 'sheets' })
    expect(opensFor('open:tool:books', null)).toEqual({ app: 'tool', tool: 'books' })
    expect(opensFor('bay', bayFor('records'))).toEqual({ app: 'tool', tool: 'books' })
    expect(opensFor('bedside', bayFor('ward'))).toEqual({ app: 'tool', tool: 'clinical' })
    expect(opensFor('coffee', null)).toBeNull()
  })
})

describe('which room the player is in', () => {
  it('names the corner, the theme’s rooms, and nothing on the open floor', () => {
    expect(roomAt(9, 4, bayFor('ward'), 'hospital')).toBe('Bay A')
    expect(roomAt(9, 4, null, 'office')).toBe('The IT corner')
    expect(roomAt(-2, -5, bayFor('ward'), 'hospital')).toBe('Treatment room')
    expect(roomAt(-10, 0, bayFor('courtroom'), 'law')).toBe('Client meeting room')
    expect(roomAt(-2, -5, bayFor('records'), 'office')).toBeNull()
    expect(roomAt(1, 2, bayFor('workshop'), 'engineering')).toBeNull()
  })
})

describe('postures in the workplace’s own activities', () => {
  it('never sits the character down on thin air: none of them has a seat', () => {
    for (const kind of BAY_KINDS) {
      for (const a of workplaceActivities(bayFor(kind), themeOf(kind))) {
        for (const stage of a.stages) {
          const seated = clipFrame(stage.clip, 0.5, stage.posture).seated
          expect(seated, `${a.id}: ${stage.label}`).toBe(false)
        }
      }
    }
  })
})
