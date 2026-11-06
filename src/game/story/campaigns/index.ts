/**
 * The story campaigns, one per career. Finance & Administration is the first,
 * complete one; the others follow (see docs/STORY_MODE_PLAN.md).
 */
import type { Campaign } from '../types'
import { FINANCE_STORY } from './finance'

export const CAMPAIGNS: Campaign[] = [FINANCE_STORY]

export function campaignFor(careerId: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.careerId === careerId)
}
