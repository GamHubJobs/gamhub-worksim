/**
 * The campaigns the game knows about. They register themselves when the desk
 * loads (campaigns/index.ts), so the first screen and the saving code do not
 * have to carry every story's text.
 */
import type { Campaign } from './types'

let campaigns: Campaign[] = []

export function registerCampaigns(list: Campaign[]): void {
  campaigns = list
}

export function campaignFor(careerId: string): Campaign | undefined {
  return campaigns.find((c) => c.careerId === careerId)
}
