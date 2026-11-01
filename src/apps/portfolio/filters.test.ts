import { describe, expect, it } from 'vitest'
import type { PortfolioItem } from '../../persistence/schemas'
import { defaultFilters, filterItems, filterOptions } from './filters'

function item(id: string, fields: Partial<PortfolioItem>): PortfolioItem {
  return {
    id,
    profileId: 'a',
    skills: {},
    tools: [],
    levelIndex: 1,
    included: true,
    featured: false,
    score: 80,
    completedAt: 1,
    ...fields,
  } as PortfolioItem
}

const items = [
  item('old', { completedAt: 1, score: 95, tools: ['sheets'], skills: { formulas: 10 } }),
  item('new', { completedAt: 3, score: 70, levelIndex: 2, tools: ['docs'] }),
  item('mid', { completedAt: 2, score: 85, included: false, tools: ['sheets', 'docs'] }),
  item('other', { profileId: 'b', completedAt: 4 }),
]

const ids = (list: PortfolioItem[]) => list.map((i) => i.id)

describe('portfolio filters', () => {
  it('shows the current career save, newest first', () => {
    expect(ids(filterItems(items, defaultFilters('a')))).toEqual(['new', 'mid', 'old'])
    expect(ids(filterItems(items, { ...defaultFilters('a'), profileId: 'all' }))).toEqual(
      ['other', 'new', 'mid', 'old'],
    )
  })

  it('filters by skill, tool, level and inclusion', () => {
    const base = defaultFilters('a')
    expect(ids(filterItems(items, { ...base, skill: 'formulas' }))).toEqual(['old'])
    expect(ids(filterItems(items, { ...base, tool: 'docs' }))).toEqual(['new', 'mid'])
    expect(ids(filterItems(items, { ...base, level: 2 }))).toEqual(['new'])
    expect(ids(filterItems(items, { ...base, includedOnly: true }))).toEqual([
      'new',
      'old',
    ])
  })

  it('sorts by score or level, with featured work first', () => {
    const base = defaultFilters('a')
    expect(ids(filterItems(items, { ...base, sort: 'score' }))).toEqual([
      'old',
      'mid',
      'new',
    ])
    expect(ids(filterItems(items, { ...base, sort: 'level' }))).toEqual([
      'new',
      'mid',
      'old',
    ])
    const featured = items.map((i) => (i.id === 'old' ? { ...i, featured: true } : i))
    expect(ids(filterItems(featured, base))).toEqual(['old', 'new', 'mid'])
  })

  it('offers only the options that appear in the work', () => {
    expect(filterOptions(items.slice(0, 3))).toEqual({
      skills: ['formulas'],
      tools: ['docs', 'sheets'],
      levels: [1, 2],
    })
  })
})
