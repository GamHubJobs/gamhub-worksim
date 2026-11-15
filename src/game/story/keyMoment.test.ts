import { describe, expect, it } from 'vitest'
import { CAMPAIGNS } from './campaigns'
import { keyMoment } from './engine'

describe('key moments of a story, framed like a film', () => {
  it('every campaign has an opening for each chapter, and most a finale', () => {
    for (const campaign of CAMPAIGNS) {
      const moments = Object.keys(campaign.scenes)
        .map((id) => keyMoment(campaign, id))
        .filter((m) => m !== null)
      const openings = moments.filter((m) => m.kind === 'opening')
      expect(openings.length, campaign.id).toBe(campaign.chapters.length)
      expect(openings.map((m) => m.number).sort(), campaign.id).toEqual(
        campaign.chapters.map((_, i) => i + 1),
      )
      expect(moments.every((m) => m.campaign === campaign.title)).toBe(true)
    }
  })

  it('an ordinary scene is not a key moment', () => {
    const campaign = CAMPAIGNS[0]
    const ordinary = Object.keys(campaign.scenes).filter((id) => !keyMoment(campaign, id))
    expect(ordinary.length).toBeGreaterThan(0)
    expect(keyMoment(campaign, 'no-such-scene')).toBeNull()
  })
})
