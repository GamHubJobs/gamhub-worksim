/**
 * Social Planner: compose posts for each channel, attach images, and
 * schedule them on the week's calendar, within each channel's rules.
 */
import { z } from 'zod'

const DateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)

export const ChannelSchema = z.object({
  id: z.string().min(1).max(20),
  name: z.string().max(40),
  /** Most characters a post may have. */
  limit: z.number().int().positive(),
  /** Posts on this channel need an image. */
  requiresImage: z.boolean().default(false),
  /** When our audience is most active: hours (24h), e.g. [8, 10] = 08:00–10:00. */
  bestHours: z.tuple([z.number().int().min(0).max(23), z.number().int().min(1).max(24)]),
})

export const PostSchema = z.object({
  id: z.string().min(1).max(20),
  channel: z.string().max(20),
  text: z.string().max(5000),
  image: z.string().max(100).default(''),
  /** Empty while a draft. */
  scheduledAt: z.union([DateTime, z.literal('')]).default(''),
  status: z.enum(['draft', 'scheduled']),
})

export const SocialStateSchema = z.object({
  /** The Monday of the week being planned; posts can go out Monday to Friday. */
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  channels: z.array(ChannelSchema).min(1).max(10),
  images: z.array(z.object({ name: z.string(), description: z.string() })).max(50),
  /** Times when nothing may be posted (e.g. website maintenance). */
  blackouts: z
    .array(z.object({ start: DateTime, end: DateTime, reason: z.string() }))
    .max(20),
  /** Brand rules shown to the writer. */
  rules: z.array(z.string().max(200)).max(20).default([]),
  posts: z.array(PostSchema).max(200),
})

export type Channel = z.infer<typeof ChannelSchema>
export type Post = z.infer<typeof PostSchema>
export type SocialState = z.infer<typeof SocialStateSchema>
