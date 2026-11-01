/** SEO Audit, the website crawler: its registration with the tools framework. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { companySite } from './data'
import { findIssues, ISSUE_INFO } from './model'
import { ISSUE_TYPES, SeoStateSchema, type SeoState } from './schema'

export const SeoCheckSchema = z.discriminatedUnion('type', [
  /** No issues of these types are left (all types if none are listed). */
  FileCheckBaseSchema.extend({
    type: z.literal('fixed'),
    issues: z.array(z.enum(ISSUE_TYPES)).default([]),
  }),
  /** A page's title, heading or description contains a keyword. */
  FileCheckBaseSchema.extend({
    type: z.literal('keyword'),
    page: z.string(),
    keyword: z.string(),
    fields: z.array(z.enum(['title', 'h1', 'description'])).min(1),
  }),
  /** The site was crawled again after the last change, to confirm the fixes. */
  FileCheckBaseSchema.extend({
    type: z.literal('recrawled'),
  }),
])
export type SeoCheck = z.infer<typeof SeoCheckSchema>

function gradeCheck(check: SeoCheck, player: SeoState, start: SeoState) {
  switch (check.type) {
    case 'fixed': {
      const types = check.issues.length > 0 ? check.issues : ISSUE_TYPES
      const left = findIssues(player).filter((i) => types.includes(i.type))
      const before = findIssues(start).filter((i) => types.includes(i.type)).length || 1
      return checkResult(
        check,
        1 - left.length / before,
        left.map(
          (i) => `${i.page}: ${ISSUE_INFO[i.type].name.toLowerCase()} (${i.detail})`,
        ),
      )
    }
    case 'keyword': {
      const page = player.pages.find((p) => p.url === check.page)
      const ok =
        !!page &&
        check.fields.every((f) =>
          page[f].toLowerCase().includes(check.keyword.toLowerCase()),
        )
      return checkResult(
        check,
        ok ? 1 : 0,
        ok
          ? []
          : [
              `The ${check.fields.join(' and ')} of ${check.page} should contain “${check.keyword}”.`,
            ],
      )
    }
    case 'recrawled': {
      const current = JSON.stringify(findIssues(player))
      const ok = !!player.crawl && JSON.stringify(player.crawl.issues) === current
      return checkResult(
        check,
        ok ? 1 : 0,
        ok ? [] : ['Run the crawl again after your last change, to confirm the fixes.'],
      )
    }
  }
}

export const seo: ToolDefinition<SeoState, SeoCheck> = {
  id: 'seo',
  name: 'SEO Audit',
  category: 'Search engine optimisation',
  icon: 'seo',
  sections: [
    {
      id: 'issues',
      name: 'Site audit',
      description: 'Crawl the site and list every issue found.',
    },
    {
      id: 'pages',
      name: 'Pages',
      description: 'Edit titles, descriptions, headings and image alt text.',
    },
    {
      id: 'keywords',
      name: 'Keywords',
      description: 'The searches that matter, how often, and where we rank.',
    },
    {
      id: 'redirects',
      name: 'Redirects',
      description: 'Send old addresses to the right page.',
    },
  ],
  state: SeoStateSchema,
  practice: () => companySite(),
  summary: (state) => {
    const issues = findIssues(state).length
    return `${state.pages.length} pages, ${issues} issue${issues === 1 ? '' : 's'}`
  },
  check: SeoCheckSchema,
  grade: (checks, player, { start }) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player, start)
        : checkResult(check, 0, ['The audit was not handed in.']),
    ),
  guide: {
    intro:
      'SEO Audit crawls the company website the way a search engine does and lists what stops pages from being found or clicked. Most fixes are small (a clearer title, a missing description, a redirect), but together they decide whether people searching for what we offer find us.',
    topics: [
      {
        title: 'Run an audit',
        body: 'Click Run crawl in Site audit. Issues are grouped by type and page. Fix the ones that affect important pages first (see the visits on Pages, and the keywords), then crawl again: the list only updates when you do.',
      },
      {
        title: 'Write a good title and description',
        body: 'Each page needs its own title, 30–60 characters, starting with what the page is about (the keyword people search for) and ending with the brand. The description, 70–160 characters, is the advert under the title in search results: say what the reader gets and invite the click.',
      },
      {
        title: 'Fix broken links',
        body: 'A broken link points to an address that no longer exists. Add a redirect from the old address to the most relevant live page; every link to it, inside and outside the site, then works again.',
      },
      {
        title: 'Images and headings',
        body: 'Give every meaningful image alt text that describes it. Each page needs one main heading (H1) that says what it is about.',
      },
    ],
    glossary: [
      {
        term: 'SEO',
        meaning:
          'Search engine optimisation: helping the right pages appear in search results.',
      },
      {
        term: 'Crawl',
        meaning: 'Visiting every page and link, as a search engine does.',
      },
      {
        term: 'Title tag',
        meaning: 'The page title shown as the headline in search results.',
      },
      {
        term: 'Meta description',
        meaning: 'The short summary shown under the title in search results.',
      },
      { term: 'Alt text', meaning: 'A text description of an image.' },
      {
        term: '404 / redirect',
        meaning: 'A missing page / sending an old address to a new one.',
      },
      {
        term: 'Search volume',
        meaning: 'How many times a month people search for a phrase.',
      },
    ],
  },
}
