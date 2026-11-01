/**
 * Ad Campaigns: paid campaigns across channels, each with ad sets that have
 * a daily budget, a status and their recent daily results. Changes (pausing,
 * budgets) are logged, and the month's pacing is projected from them.
 */
import { z } from 'zod'

const Money = z.number().finite().min(0).max(1e8)

export const DayResultSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  impressions: z.number().int().min(0),
  clicks: z.number().int().min(0),
  spend: Money,
  conversions: z.number().int().min(0),
  revenue: Money,
})

export const AdSetSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  channel: z.string().max(40),
  audience: z.string().max(120),
  status: z.enum(['active', 'paused']),
  dailyBudget: Money,
  /** Results for the last days, oldest first. */
  results: z.array(DayResultSchema).max(60),
})

export const CampaignSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  objective: z.string().max(80),
  adSets: z.array(AdSetSchema).max(30),
})

export const ChangeSchema = z.object({
  adSet: z.string(),
  change: z.string().max(120),
})

export const CampaignsStateSchema = z.object({
  account: z.string().max(80),
  /** "Today": results are up to the day before. */
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Days in the month, and the month's total budget. */
  monthDays: z.number().int().min(28).max(31),
  monthBudget: Money,
  /** Spent earlier in the month, before the results shown. */
  spentBefore: Money,
  /** The most the account may spend per day across all ad sets. */
  dailyCap: Money,
  campaigns: z.array(CampaignSchema).max(20),
  changes: z.array(ChangeSchema).max(500).default([]),
})

export type DayResult = z.infer<typeof DayResultSchema>
export type AdSet = z.infer<typeof AdSetSchema>
export type Campaign = z.infer<typeof CampaignSchema>
export type CampaignsState = z.infer<typeof CampaignsStateSchema>
