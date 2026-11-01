/** The company website before the spring campaign: a realistic mix of SEO issues. */
import type { Page, SeoState } from './schema'

const page = (
  url: string,
  input: Omit<Page, 'url' | 'images' | 'links' | 'visits'> & Partial<Page>,
): Page => ({
  url,
  images: [],
  links: [],
  visits: 0,
  ...input,
})

export function companySite(): SeoState {
  return {
    domain: 'cobaltridge.example',
    pages: [
      page('/', {
        title: 'Cobalt Ridge Consulting: business advisory for growing companies',
        description:
          'Finance, operations and advisory support for growing businesses. Book a free 30-minute review with one of our senior advisers.',
        h1: 'Advice that helps growing businesses stay in control',
        words: 640,
        images: [
          { src: 'hero-team.jpg', alt: 'Cobalt Ridge advisers in a client workshop' },
        ],
        links: ['/services', '/spring-offer-2025', '/about', '/contact'],
        visits: 4200,
      }),
      page('/services', {
        title: 'Services | Cobalt Ridge',
        description:
          'Advisory, finance operations and training for growing businesses: see how Cobalt Ridge can help your team.',
        h1: 'Our services',
        words: 520,
        links: ['/services/advisory', '/services/training', '/contact'],
        visits: 1300,
      }),
      page('/services/advisory', {
        title: 'Services | Cobalt Ridge',
        description: '',
        h1: 'Business advisory',
        words: 980,
        images: [{ src: 'advisory-chart.png', alt: '' }],
        links: ['/spring-offer', '/contact'],
        visits: 900,
      }),
      page('/services/training', {
        title: 'Finance training workshops for teams | Cobalt Ridge',
        description:
          'Our finance training workshops cover month-end, budgeting, forecasting, reporting to boards, cash management and much more, delivered in your office or online by experienced trainers who have run finance teams themselves.',
        h1: 'Finance training workshops',
        words: 760,
        links: ['/resources/cashflow-guide', '/contact'],
        visits: 650,
      }),
      page('/spring-offer', {
        title: 'Spring offer',
        description:
          'Book a free 30-minute business review with a senior adviser this spring, and get 20% off your first quarter with code SPRING20.',
        h1: '',
        words: 430,
        images: [{ src: 'spring-banner.png', alt: '' }],
        links: ['/contact'],
        visits: 120,
      }),
      page('/about', {
        title: 'About us: twenty years of helping businesses grow',
        description:
          'Meet the Cobalt Ridge team: advisers, accountants and trainers who have helped growing businesses for twenty years.',
        h1: 'About Cobalt Ridge',
        words: 610,
        images: [{ src: 'office.jpg', alt: '' }],
        links: ['/contact'],
        visits: 700,
      }),
      page('/contact', {
        title: 'Contact Cobalt Ridge Consulting: book a free review',
        description:
          'Call, email or visit us. Book a free 30-minute business review, or ask about our advisory and training services.',
        h1: 'Contact us',
        words: 210,
        visits: 1100,
      }),
      page('/blog/month-end-checklist', {
        title: 'A month-end checklist for small finance teams',
        description:
          'Twelve steps to a faster, calmer month-end close, from bank reconciliations to the management accounts pack.',
        h1: 'A month-end checklist for small finance teams',
        words: 1450,
        links: ['/spring-offer-2025', '/services/training'],
        visits: 2600,
      }),
    ],
    removed: ['/spring-offer-2025', '/resources/cashflow-guide'],
    redirects: [],
    keywords: [
      {
        keyword: 'free business review',
        volume: 2900,
        position: 18,
        page: '/spring-offer',
      },
      {
        keyword: 'business advisory services',
        volume: 1600,
        position: 12,
        page: '/services/advisory',
      },
      {
        keyword: 'finance training for teams',
        volume: 880,
        position: 6,
        page: '/services/training',
      },
      {
        keyword: 'month end checklist',
        volume: 1900,
        position: 3,
        page: '/blog/month-end-checklist',
      },
    ],
    crawl: null,
  }
}
