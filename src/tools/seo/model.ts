/** SEO Audit: the crawl rules, and the changes a marketer can make. */
import type { Issue, IssueType, Page, SeoState } from './schema'

export const LIMITS = {
  titleMin: 30,
  titleMax: 60,
  descriptionMin: 70,
  descriptionMax: 160,
}

export const ISSUE_INFO: Record<IssueType, { name: string; why: string }> = {
  'missing-title': {
    name: 'Missing title',
    why: 'The title is the clickable headline in search results.',
  },
  'title-length': {
    name: 'Title too long or too short',
    why: `Search engines show about ${LIMITS.titleMax} characters; very short titles waste the space.`,
  },
  'duplicate-title': {
    name: 'Duplicate title',
    why: 'Two pages with the same title compete with each other and confuse searchers.',
  },
  'missing-description': {
    name: 'Missing meta description',
    why: 'Without one, search engines pick a random snippet of the page.',
  },
  'description-length': {
    name: 'Description too long or too short',
    why: `About ${LIMITS.descriptionMin}–${LIMITS.descriptionMax} characters fit in search results.`,
  },
  'missing-h1': {
    name: 'Missing H1 heading',
    why: 'The main heading tells readers and search engines what the page is about.',
  },
  'missing-alt': {
    name: 'Image without alt text',
    why: 'Alt text describes images for screen readers and for image search.',
  },
  'broken-link': {
    name: 'Broken link',
    why: 'Links to pages that no longer exist frustrate visitors and waste search engines’ time.',
  },
}

/** Where an address ends up, following redirects. Null if it is a dead end. */
export function resolveUrl(state: SeoState, url: string): string | null {
  let current = url
  for (let i = 0; i < 5; i++) {
    if (state.pages.some((p) => p.url === current)) return current
    const redirect = state.redirects.find((r) => r.from === current)
    if (!redirect) return null
    current = redirect.to
  }
  return null
}

/** Every issue on the site as it is now. */
export function findIssues(state: SeoState): Issue[] {
  const issues: Issue[] = []
  const titles = new Map<string, string[]>()
  for (const page of state.pages) {
    const title = page.title.trim()
    if (title)
      titles.set(title.toLowerCase(), [
        ...(titles.get(title.toLowerCase()) ?? []),
        page.url,
      ])
  }
  for (const page of state.pages) {
    const add = (type: IssueType, detail: string) =>
      issues.push({ type, page: page.url, detail })
    const title = page.title.trim()
    const description = page.description.trim()
    if (!title) add('missing-title', 'No title.')
    else if (title.length > LIMITS.titleMax || title.length < LIMITS.titleMin) {
      add(
        'title-length',
        `${title.length} characters (aim for ${LIMITS.titleMin}–${LIMITS.titleMax}).`,
      )
    }
    const same = titles.get(title.toLowerCase()) ?? []
    if (title && same.length > 1) {
      add(
        'duplicate-title',
        `Same title as ${same.filter((u) => u !== page.url).join(', ')}.`,
      )
    }
    if (!description) add('missing-description', 'No meta description.')
    else if (
      description.length > LIMITS.descriptionMax ||
      description.length < LIMITS.descriptionMin
    ) {
      add(
        'description-length',
        `${description.length} characters (aim for ${LIMITS.descriptionMin}–${LIMITS.descriptionMax}).`,
      )
    }
    if (!page.h1.trim()) add('missing-h1', 'No main heading.')
    for (const image of page.images) {
      if (!image.alt.trim()) add('missing-alt', `${image.src} has no alt text.`)
    }
    for (const link of page.links) {
      if (resolveUrl(state, link) === null)
        add('broken-link', `Links to ${link}, which returns “404 Not found”.`)
    }
  }
  return issues
}

/** Runs a crawl: the issues list in the tool is refreshed. */
export function crawl(state: SeoState): SeoState {
  return {
    ...state,
    crawl: { number: (state.crawl?.number ?? 0) + 1, issues: findIssues(state) },
  }
}

type Result = { state: SeoState; problems: string[] }

export function updatePage(
  state: SeoState,
  url: string,
  change: Partial<Pick<Page, 'title' | 'description' | 'h1'>>,
): Result {
  if (!state.pages.some((p) => p.url === url))
    return { state, problems: ['That page no longer exists.'] }
  return {
    state: {
      ...state,
      pages: state.pages.map((p) => (p.url === url ? { ...p, ...change } : p)),
    },
    problems: [],
  }
}

export function setAltText(
  state: SeoState,
  url: string,
  src: string,
  alt: string,
): Result {
  return {
    state: {
      ...state,
      pages: state.pages.map((p) =>
        p.url === url
          ? { ...p, images: p.images.map((i) => (i.src === src ? { ...i, alt } : i)) }
          : p,
      ),
    },
    problems: [],
  }
}

export function addRedirect(state: SeoState, from: string, to: string): Result {
  if (!state.removed.includes(from) && state.pages.some((p) => p.url === from)) {
    return { state, problems: [`${from} is a live page; redirecting it would hide it.`] }
  }
  if (!state.pages.some((p) => p.url === to))
    return { state, problems: ['Redirect to a page that exists.'] }
  if (state.redirects.some((r) => r.from === from))
    return { state, problems: [`${from} already redirects.`] }
  return {
    state: { ...state, redirects: [...state.redirects, { from, to }] },
    problems: [],
  }
}

export function removeRedirect(state: SeoState, from: string): SeoState {
  return { ...state, redirects: state.redirects.filter((r) => r.from !== from) }
}
