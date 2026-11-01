/**
 * SEO Audit: the company website as a search engine sees it. Pages have
 * titles, meta descriptions, headings, images and links; a crawl lists the
 * issues; the marketer fixes pages and adds redirects, then crawls again.
 */
import { z } from 'zod'

export const ImageSchema = z.object({
  src: z.string().max(120),
  alt: z.string().max(200),
})

export const PageSchema = z.object({
  url: z
    .string()
    .regex(/^\/[a-z0-9\-/]*$/)
    .max(120),
  title: z.string().max(200),
  description: z.string().max(400),
  h1: z.string().max(200),
  words: z.number().int().min(0),
  images: z.array(ImageSchema).max(30).default([]),
  links: z.array(z.string().max(120)).max(50).default([]),
  /** Visits from search last month. */
  visits: z.number().int().min(0).default(0),
})

export const KeywordSchema = z.object({
  keyword: z.string().max(100),
  /** Searches a month. */
  volume: z.number().int().min(0),
  /** Current position in search results (0 = not ranking). */
  position: z.number().int().min(0),
  /** The page that should rank for it. */
  page: z.string().max(120),
})

export const RedirectSchema = z.object({
  from: z.string().max(120),
  to: z.string().max(120),
})

export const ISSUE_TYPES = [
  'missing-title',
  'title-length',
  'duplicate-title',
  'missing-description',
  'description-length',
  'missing-h1',
  'missing-alt',
  'broken-link',
] as const

export const IssueSchema = z.object({
  type: z.enum(ISSUE_TYPES),
  page: z.string(),
  detail: z.string(),
})

export const SeoStateSchema = z.object({
  domain: z.string().max(80),
  pages: z.array(PageSchema).max(100),
  /** Addresses that no longer exist (they return "404 Not found"). */
  removed: z.array(z.string().max(120)).max(100).default([]),
  redirects: z.array(RedirectSchema).max(100).default([]),
  keywords: z.array(KeywordSchema).max(100).default([]),
  /** The last crawl's results, as shown in the tool. */
  crawl: z
    .object({
      number: z.number().int().positive(),
      issues: z.array(IssueSchema).max(1000),
    })
    .nullable()
    .default(null),
})

export type Page = z.infer<typeof PageSchema>
export type Issue = z.infer<typeof IssueSchema>
export type IssueType = (typeof ISSUE_TYPES)[number]
export type SeoState = z.infer<typeof SeoStateSchema>
