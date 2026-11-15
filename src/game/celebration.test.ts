import { describe, expect, it } from 'vitest'
import { newProfileData, type ProfileData } from './career'
import {
  CELEBRATION,
  canJoinCelebration,
  celebrationOn,
  joinCelebration,
  joinedCelebration,
} from './celebration'
import { trustOf } from './relationships'
import { applyEffects } from './scenes'

const at = (day: number, minute: number): ProfileData => {
  const p = newProfileData('Alex', 0)
  return { ...p, work: { ...p.work, day, minute } }
}

describe('the team’s Friday celebration', () => {
  it('is on on Fridays at a quarter past four, for twenty minutes', () => {
    expect(celebrationOn(at(5, CELEBRATION.start).work)).toBe(true)
    expect(celebrationOn(at(5, CELEBRATION.start + 19).work)).toBe(true)
    expect(celebrationOn(at(5, CELEBRATION.start + 20).work)).toBe(false)
    expect(celebrationOn(at(4, CELEBRATION.start).work)).toBe(false)
    expect(canJoinCelebration(at(4, CELEBRATION.start))).toContain('Fridays')
  })

  it('can be joined once: time, mood and the team’s trust', () => {
    const p = at(5, CELEBRATION.start + 2)
    const after = joinCelebration(p)
    expect(after.work.minute).toBe(p.work.minute + 15)
    // Calmer than the same quarter of an hour without it.
    const without = applyEffects(p, { minutes: 15 })
    expect(after.work.wellbeing.stress).toBeLessThan(without.work.wellbeing.stress)
    expect(trustOf(after.work, 'senior')).toBe(trustOf(p.work, 'senior') + 1)
    expect(joinedCelebration(after.work)).toBe(true)
    expect(canJoinCelebration(after)).toBe('You have had your cake.')
    expect(joinCelebration(after)).toBe(after)
  })
})
