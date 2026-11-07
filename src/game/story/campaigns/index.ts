/**
 * The story campaigns, one per career: "Short Delivery" (Finance &
 * Administration), "The Halden Account" (Accounting), "Ticket Zero" (IT Help
 * Desk), "Launch Week" (Digital Marketing), "Signal and Noise" (Data
 * Analysis) and "Release Day" (Software Development). See
 * docs/STORY_MODE_PLAN.md.
 */
import { campaignFor, registerCampaigns } from '../registry'
import type { Campaign } from '../types'
import { ACCOUNTING_STORY } from './accounting'
import { DATA_STORY } from './data'
import { ENGINEERING_STORY } from './engineering'
import { FINANCE_STORY } from './finance'
import { IT_STORY } from './itSupport'
import { MARKETING_STORY } from './marketing'

export const CAMPAIGNS: Campaign[] = [
  FINANCE_STORY,
  ACCOUNTING_STORY,
  IT_STORY,
  MARKETING_STORY,
  DATA_STORY,
  ENGINEERING_STORY,
]

// Known to the game from now on (see ../registry.ts).
registerCampaigns(CAMPAIGNS)

export { campaignFor }
