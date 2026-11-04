/**
 * Everything specific to the digital-marketing career: its tasks, cases and readiness
 * assessments. Loaded only when a save of this career is opened (see `loader.ts`).
 */
import type { CareerPack } from '../loader'
import { aiCases } from '../cases/ai'
import { abTest } from '../assignments/marketing/abTest'
import { campaignBudget } from '../assignments/marketing/campaignBudget'
import { funnelAnalysis } from '../assignments/marketing/funnelAnalysis'
import { seoFixes } from '../assignments/marketing/seoFixes'
import { socialLaunch } from '../assignments/marketing/socialLaunch'
import { campaignMetrics } from '../assignments/marketing/campaignMetrics'
import { contentCalendar } from '../assignments/marketing/contentCalendar'
import { quarterlyReport } from '../assignments/marketing/quarterlyReport'
import {
  launchAnalytics,
  launchCampaigns,
  launchPlan,
} from '../assignments/marketing/projectLaunch'
import { MARKETING_CASES } from '../cases/marketing'
import { OPERATIONS_MARKETING } from '../cases/operations/marketing'
import { WORKFLOW_MARKETING } from '../cases/workflows/marketing'
import { MEETING_MARKETING } from '../cases/meetings/marketing'
import { INCIDENT_MARKETING } from '../cases/incidents/marketing'
import { LEADERSHIP_MARKETING } from '../cases/leadership/marketing'
import { PROGRAMME_MARKETING } from '../cases/programme/marketing'
import { ADVANCED_MARKETING } from '../cases/advanced/marketing'
import { ASSESSMENTS_MARKETING } from '../assessments/marketing'

export const PACK: CareerPack = {
  careerId: 'digital-marketing',
  assignments: [
    abTest,
    campaignBudget,
    funnelAnalysis,
    seoFixes,
    socialLaunch,
    campaignMetrics,
    contentCalendar,
    quarterlyReport,
    launchAnalytics,
    launchCampaigns,
    launchPlan,
  ],
  cases: [
    ...aiCases('digital-marketing'),
    ...MARKETING_CASES,
    ...OPERATIONS_MARKETING,
    ...WORKFLOW_MARKETING,
    ...MEETING_MARKETING,
    ...INCIDENT_MARKETING,
    ...LEADERSHIP_MARKETING,
    ...PROGRAMME_MARKETING,
    ...ADVANCED_MARKETING,
  ],
  assessments: ASSESSMENTS_MARKETING,
}
