/**
 * Every professional tool in WorkSim. A department makes a tool available to
 * its career by listing it in the career's `tools` (with the level it
 * unlocks at); the tool itself is registered here once.
 */
import type { Career } from '../content/schemas'
import { books } from './books/definition'
import { analytics } from './analytics/definition'
import { apiClient } from './api/definition'
import { campaigns } from './campaigns/definition'
import { dataStudio } from './datastudio/definition'
import { comms } from './comms/definition'
import { soc } from './soc/definition'
import { itops } from './itops/definition'
import { clinical } from './clinical/definition'
import { legal } from './legal/definition'
import { engineering } from './engineering/definition'
import { devices } from './devices/definition'
import { directory } from './directory/definition'
import { network } from './network/definition'
import { seo } from './seo/definition'
import { social } from './social/definition'
import type { AnyTool, CareerTool } from './types'

const TOOLS: AnyTool[] = [
  books,
  directory,
  devices,
  comms,
  soc,
  itops,
  clinical,
  legal,
  engineering,
  network,
  social,
  seo,
  campaigns,
  analytics,
  dataStudio,
  apiClient,
]

export function getTool(id: string): AnyTool | undefined {
  return TOOLS.find((tool) => tool.id === id)
}

export function allTools(): readonly AnyTool[] {
  return TOOLS
}

export interface ToolAccess {
  tool: AnyTool
  unlocked: boolean
  /** The title of the level the tool unlocks at, if it is still locked. */
  unlocksAt: string | null
  /** Sections still locked: section ID → the level title it unlocks at. */
  lockedSections: Record<string, string>
}

function levelIndex(career: Career, levelId: string | undefined): number {
  if (!levelId) return 0
  const index = career.levels.findIndex((level) => level.id === levelId)
  return index === -1 ? 0 : index
}

/** The tools a career uses, and what is unlocked at the player's level. */
export function careerTools(
  career: Career & { tools?: CareerTool[] },
  currentLevelId: string,
): ToolAccess[] {
  const current = levelIndex(career, currentLevelId)
  return (career.tools ?? []).flatMap((entry) => {
    const tool = getTool(entry.tool)
    if (!tool) return []
    const from = levelIndex(career, entry.fromLevel)
    const lockedSections: Record<string, string> = {}
    for (const [section, level] of Object.entries(entry.sections ?? {})) {
      const index = levelIndex(career, level)
      if (index > current) lockedSections[section] = career.levels[index].title
    }
    return [
      {
        tool,
        unlocked: from <= current,
        unlocksAt: from <= current ? null : career.levels[from].title,
        lockedSections,
      },
    ]
  })
}
