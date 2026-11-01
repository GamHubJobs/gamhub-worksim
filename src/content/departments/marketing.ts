/** Marketing: campaigns, content and the numbers behind them. */
import { COMPANY } from '../company'
import type { Department } from './types'

export const marketing: Department = {
  careerId: 'digital-marketing',
  name: 'Marketing',
  sign: 'MARKETING',
  manager: {
    id: 'manager',
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    email: `sofia.alvarez@${COMPANY.emailDomain}`,
    initials: 'SA',
    color: 'bg-pink-700',
    startingTrust: 50,
    personality:
      'Creative, energetic and ruthlessly data-driven: loves a bold idea, but only keeps it if the numbers say it works.',
  },
  senior: {
    id: 'senior',
    name: 'Leo Brennan',
    role: 'Senior Digital Marketer',
    email: `leo.brennan@${COMPANY.emailDomain}`,
    initials: 'LB',
    color: 'bg-orange-700',
    startingTrust: 40,
    personality:
      'Runs the paid campaigns and guards the budget closely. Witty, a little sceptical of newcomers, and full of hard-won lessons about what actually converts.',
  },
  director: 'the commercial director',
  intro:
    'The Marketing team brings in new clients: campaigns across search, social and email, content, and the analytics that show what works.',
  standup: {
    senior:
      'Search ads are eating the budget again. I am pausing the weakest keywords today.',
    facilities:
      'The giant cardboard cut-out for the trade show is in the lift. Please do not take the lift.',
  },
  planning: {
    lines: [
      'The spring campaign launches in two weeks, and the agency brief is due on Friday.',
      '{senior} is building the media plan. I need someone to pull last year’s results together for it.',
      'Any volunteers?',
    ],
    volunteerReply:
      'Brilliant. I need cost per acquisition by channel, not vanity metrics.',
    nobodyReply: 'Fine. I will dig through last year’s dashboards myself.',
  },
  seniorWork:
    'Paid search and social, the media budget, and the reporting that proves which campaigns earn their money.',
  seniorTeaches:
    'I will show you how to tell a campaign that looks good from one that actually pays.',
  seniorSmallTalk: [
    'Impressions are nice. Revenue is nicer. Always ask what a number is worth.',
    'Never launch without a test. Two subject lines beat one opinion.',
    'If {manager} asks for “a quick post”, check the brand guide first. Trust me.',
  ],
  tips: [
    'Click-through rate is clicks divided by impressions; conversion rate is conversions divided by clicks.',
    'Return on ad spend (ROAS) is revenue divided by spend. Below 1, the campaign loses money.',
    'In an A/B test, change one thing at a time, or you won’t know what made the difference.',
    'Write for one reader, with one clear call to action.',
    'Check every link and every offer code before anything goes out.',
    'A good chart in a report answers one question. Give it a title that says the answer.',
  ],
  news: [
    'Spring campaign kick-off on Monday at 10 in the large meeting room.',
    'Brand guidelines have been updated: new colour palette and tone of voice.',
    'The trade show stand is booked for 14 to 16 May.',
    'Reminder: all social posts need a second pair of eyes before they go live.',
  ],
}
