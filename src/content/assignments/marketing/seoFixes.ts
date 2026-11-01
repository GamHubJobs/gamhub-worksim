import type { AssignmentInput } from '../../schemas'
import { companySite } from '../../../tools/seo/data'
import { addRedirect, crawl, setAltText, updatePage } from '../../../tools/seo/model'
import type { SeoState } from '../../../tools/seo/schema'

/**
 * Digital Marketing (Digital Marketing Executive): fix the website's SEO
 * before the spring campaign. Teaches: crawling, titles and descriptions
 * that earn the click, unique titles, headings and alt text, redirects for
 * broken links, targeting a keyword, and verifying with a second crawl.
 */
const start = companySite()

function solution(): SeoState {
  const steps: Array<(s: SeoState) => { state: SeoState; problems: string[] }> = [
    (s) =>
      updatePage(s, '/', {
        title: 'Business advisory for growing companies | Cobalt Ridge',
      }),
    (s) =>
      updatePage(s, '/services', {
        title: 'Advisory, finance and training services | Cobalt Ridge',
      }),
    (s) =>
      updatePage(s, '/services/advisory', {
        title: 'Business advisory services for growing firms | Cobalt Ridge',
        description:
          'Practical business advisory for growing companies: planning, cash flow and reporting, from senior advisers who have done it.',
      }),
    (s) =>
      setAltText(
        s,
        '/services/advisory',
        'advisory-chart.png',
        'Chart of a client’s cash flow before and after our advice',
      ),
    (s) =>
      updatePage(s, '/services/training', {
        description:
          'Finance training workshops for teams: month-end, budgeting, forecasting and board reporting, in your office or online.',
      }),
    (s) =>
      updatePage(s, '/spring-offer', {
        title: 'Free business review with a senior adviser | Cobalt Ridge',
        h1: 'Book your free business review this spring',
      }),
    (s) =>
      setAltText(
        s,
        '/spring-offer',
        'spring-banner.png',
        'Spring offer: free business review and 20% off your first quarter',
      ),
    (s) => setAltText(s, '/about', 'office.jpg', 'The Cobalt Ridge office meeting room'),
    (s) => addRedirect(s, '/spring-offer-2025', '/spring-offer'),
    (s) => addRedirect(s, '/resources/cashflow-guide', '/services/training'),
  ]
  let s = crawl(start)
  for (const step of steps) {
    const result = step(s)
    if (result.problems.length > 0) throw new Error(result.problems.join(' '))
    s = result.state
  }
  return crawl(s)
}

export const seoFixes: AssignmentInput = {
  id: 'seo-fixes',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'digital-marketing-executive',
  order: 4,
  kind: 'tool',
  title: 'Get the website ready for search',
  summary:
    'Audit the website, fix every SEO issue, target the offer’s keyword and confirm with a second crawl.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Before we spend on ads: fix the website’s SEO',
    body: `Hi {name},

Before the spring campaign drives traffic to the website, I want it in good shape for search. You have **SEO Audit** now.

Please:
• run a crawl and fix **every** issue it finds: titles, descriptions, headings, alt text and broken links,
• make sure the spring offer page targets the phrase people actually search for: **“free business review”** (2,900 searches a month; we’re on page 2). Put it in the page’s **title** and **main heading**,
• crawl again to confirm everything is fixed before you hand it in.

A title should be 30–60 characters and unique to its page; a description 70–160 characters. For broken links, redirect the old address to the most relevant live page.

Sofia`,
  },
  whyItMatters:
    'Search brings the visitors you don’t pay for. Small fixes (a clear, unique title, a description that earns the click, no dead links) decide whether the right people find and choose your page, and they are routine work for every digital marketer.',
  objectives: [
    'Run and read a site audit',
    'Write titles and descriptions to length, unique per page',
    'Target a keyword and fix broken links with redirects',
  ],
  steps: [
    {
      id: 'crawl',
      title: 'Crawl the site',
      instructions:
        'In **Site audit**, click **Run crawl**. Read each group of issues; click a page to open it.',
    },
    {
      id: 'titles',
      title: 'Titles and descriptions',
      instructions:
        'In **Pages**, rewrite the titles that are too long, too short or duplicated, and add or shorten descriptions. The counters turn green within the limits; the preview shows how the page looks in search results.',
      hint: 'Start with what the page is about, end with “| Cobalt Ridge”.',
    },
    {
      id: 'offer',
      title: 'The spring offer page',
      instructions:
        'Give /spring-offer a title and a main heading that include “free business review”, and alt text for its banner.',
    },
    {
      id: 'links',
      title: 'Broken links and images',
      instructions:
        'In **Redirects**, send each old address to the right live page (last year’s offer → this year’s; the old cash-flow guide → training). Add alt text to every image that lacks it.',
    },
    {
      id: 'verify',
      title: 'Crawl again',
      instructions:
        'Back in **Site audit**, click **Crawl again**: there should be no issues left. Then **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'seo',
    title: 'SEO Audit: cobaltridge.example',
    start,
    solution: solution(),
    checks: [
      {
        id: 'titles',
        type: 'fixed',
        issues: ['missing-title', 'title-length', 'duplicate-title'],
        title: 'Titles fixed',
        points: 20,
        why: 'The title is the headline people click in search results.',
        hint: 'Every title 30–60 characters and different from every other page’s.',
      },
      {
        id: 'descriptions',
        type: 'fixed',
        issues: ['missing-description', 'description-length'],
        title: 'Descriptions fixed',
        points: 15,
        why: 'The description is the advert under the title.',
        hint: 'Add the missing one and shorten the long one to 70–160 characters.',
      },
      {
        id: 'structure',
        type: 'fixed',
        issues: ['missing-h1', 'missing-alt'],
        title: 'Headings and alt text',
        points: 15,
        why: 'Headings tell search engines what a page is about; alt text makes images accessible.',
        hint: 'Add the missing main heading and describe every image.',
      },
      {
        id: 'links',
        type: 'fixed',
        issues: ['broken-link'],
        title: 'No broken links',
        points: 15,
        why: 'Dead links lose visitors, including everyone clicking last year’s offer.',
        hint: 'Redirect /spring-offer-2025 and /resources/cashflow-guide to live pages.',
      },
      {
        id: 'keyword',
        type: 'keyword',
        page: '/spring-offer',
        keyword: 'free business review',
        fields: ['title', 'h1'],
        title: 'The offer page targets its keyword',
        points: 20,
        why: 'Pages rank for what they say they are about: the phrase belongs in the title and the main heading.',
        hint: 'Put “free business review” in both the title and the main heading of /spring-offer.',
      },
      {
        id: 'recrawled',
        type: 'recrawled',
        title: 'Confirmed with a second crawl',
        points: 15,
        why: 'Never assume a fix worked: check it.',
        hint: 'Run the crawl again after your last change.',
      },
    ],
  },
  passScore: 70,
  xp: 130,
  skills: {
    'content-strategy': 35,
    copywriting: 30,
    'campaign-analytics': 15,
    accuracy: 15,
  },
  feedback: {
    excellent: `Hi {name},

A clean audit, and the offer page now says exactly what people search for. Fixing the old offer link alone will save us a lot of lost visitors from last year’s posts.

Sofia`,
    good: `Hi {name},

Good progress; a few issues remain. See the notes.

Sofia`,
    pass: `Hi {name},

Several issues are still on the site. The notes list them.

Sofia`,
    fail: `Hi {name},

Not yet. Run the crawl, then work through the list one page at a time.

Sofia`,
  },
}
