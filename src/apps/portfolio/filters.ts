/** Filtering and sorting the portfolio list (pure, so it can be tested). */
import type { PortfolioItem } from '../../persistence/schemas'

export type PortfolioSort = 'date' | 'score' | 'level'

export interface PortfolioFilters {
  /** A career save's ID, or 'all'. */
  profileId: string
  /** A skill ID, or '' for any. */
  skill: string
  /** A tool or app ID, or '' for any. */
  tool: string
  /** A level number (1 = first), or 0 for any. */
  level: number
  includedOnly: boolean
  sort: PortfolioSort
}

export function defaultFilters(profileId: string): PortfolioFilters {
  return { profileId, skill: '', tool: '', level: 0, includedOnly: false, sort: 'date' }
}

export function filterItems(
  items: PortfolioItem[],
  filters: PortfolioFilters,
): PortfolioItem[] {
  const shown = items.filter(
    (item) =>
      (filters.profileId === 'all' || item.profileId === filters.profileId) &&
      (!filters.skill || filters.skill in item.skills) &&
      (!filters.tool || item.tools.includes(filters.tool)) &&
      (!filters.level || item.levelIndex === filters.level) &&
      (!filters.includedOnly || item.included),
  )
  const newest = (a: PortfolioItem, b: PortfolioItem) => b.completedAt - a.completedAt
  const order: Record<PortfolioSort, (a: PortfolioItem, b: PortfolioItem) => number> = {
    date: newest,
    score: (a, b) => b.score - a.score || newest(a, b),
    level: (a, b) => b.levelIndex - a.levelIndex || newest(a, b),
  }
  // Featured work comes first, whatever the order.
  return shown.sort(
    (a, b) => Number(b.featured) - Number(a.featured) || order[filters.sort](a, b),
  )
}

/** The skills, tools and levels that appear in these items (for the filter menus). */
export function filterOptions(items: PortfolioItem[]) {
  return {
    skills: [...new Set(items.flatMap((i) => Object.keys(i.skills)))].sort(),
    tools: [...new Set(items.flatMap((i) => i.tools))].sort(),
    levels: [...new Set(items.map((i) => i.levelIndex))].sort((a, b) => a - b),
  }
}

/** The Portfolio app's sections. */
export const PORTFOLIO_TABS = [
  { id: 'work', label: 'Work' },
  { id: 'skills', label: 'Skills' },
  { id: 'report', label: 'Progress report' },
  { id: 'export', label: 'Export' },
] as const

export type PortfolioTab = (typeof PORTFOLIO_TABS)[number]['id']
