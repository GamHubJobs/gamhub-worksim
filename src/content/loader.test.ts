import { describe, expect, it } from 'vitest'
import { CAREERS } from './careers'
import { ASSIGNMENTS } from './assignments'
import { ASSESSMENTS } from './assessments'
import { CASES } from './cases'
import {
  CAREER_IDS,
  isCareerLoaded,
  loadCareerContent,
  loadCareers,
  registerCareerPack,
} from './loader'

describe('career content loading', () => {
  it('has a content pack for every career, and only for real careers', async () => {
    expect([...CAREER_IDS].sort()).toEqual(CAREERS.map((c) => c.id).sort())
    await expect(loadCareerContent('astronaut')).rejects.toThrow('no career called')
  })

  it('loads each career once: the same request, and nothing added twice', async () => {
    // The test setup has already loaded every career.
    for (const id of CAREER_IDS) expect(isCareerLoaded(id)).toBe(true)
    const counts = [ASSIGNMENTS.length, CASES.length, ASSESSMENTS.length]
    expect(loadCareerContent('accounting')).toBe(loadCareerContent('accounting'))
    await loadCareers(CAREER_IDS)
    const { PACK } = await import('./packs/accounting')
    registerCareerPack(PACK)
    expect([ASSIGNMENTS.length, CASES.length, ASSESSMENTS.length]).toEqual(counts)
  })

  it('keeps every career’s content in its own pack', async () => {
    for (const id of CAREER_IDS) {
      const key = {
        'office-admin-finance': 'finance',
        accounting: 'accounting',
        'it-support': 'it',
        'digital-marketing': 'marketing',
        'data-analytics': 'data',
        'software-development': 'dev',
        healthcare: 'healthcare',
      }[id]!
      const { PACK } = (await import(`./packs/${key}.ts`)) as {
        PACK: {
          careerId: string
          cases: Array<{ careerId: string }>
          assignments: Array<{ careerId: string }>
        }
      }
      expect(PACK.careerId).toBe(id)
      expect(PACK.cases.every((c) => c.careerId === id)).toBe(true)
      expect(PACK.assignments.every((a) => a.careerId === id)).toBe(true)
    }
  })

  it('assignments stay in order after registering careers one by one', () => {
    const orders = ASSIGNMENTS.map((a) => a.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})
