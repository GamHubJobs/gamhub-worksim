/** Data & Insights: turning the company's data into decisions. */
import { COMPANY } from '../company'
import type { Department } from './types'

export const data: Department = {
  careerId: 'data-analytics',
  name: 'Data & Insights',
  workplace: 'insights',
  sign: 'DATA & INSIGHTS',
  manager: {
    id: 'manager',
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    email: `amara.nwosu@${COMPANY.emailDomain}`,
    initials: 'AN',
    color: 'bg-violet-600',
    startingTrust: 50,
    personality:
      'Calm, curious and precise. Always asks “how do you know?” and “so what?”, in that order, and values an honest caveat over a confident guess.',
  },
  senior: {
    id: 'senior',
    name: 'Kenji Sato',
    role: 'Senior Data Analyst',
    email: `kenji.sato@${COMPANY.emailDomain}`,
    initials: 'KS',
    color: 'bg-cyan-700',
    startingTrust: 40,
    personality:
      'Quiet and methodical, with a dry sense of humour. Has seen every kind of messy data and checks everything twice, including your work.',
  },
  director: 'the chief operating officer',
  intro:
    'The Data & Insights team cleans, analyses and explains the company’s data: clients, sales, surveys and performance, so that decisions are based on evidence.',
  standup: {
    senior:
      'The CRM export has duplicates again. I am writing up the rules so we catch them every month.',
    facilities:
      'The server room air conditioning is being serviced on Thursday. It will be loud.',
  },
  planning: {
    lines: [
      'Operations wants a dashboard of client activity before the board meeting.',
      '{senior} is rebuilding the data model. I need someone to check last quarter’s figures against the source systems.',
      'Any volunteers?',
    ],
    volunteerReply: 'Thank you. Write down every difference you find, however small.',
    nobodyReply: 'All right. I will do the checks myself this week.',
  },
  seniorWork:
    'The data model behind our reports, the monthly data quality checks, and the analysis for the big decisions.',
  seniorTeaches:
    'I will show you how to make messy data trustworthy before anyone analyses it.',
  seniorSmallTalk: [
    'Eighty per cent of analysis is cleaning the data. The other twenty is explaining it.',
    'Never overwrite the raw data. Clean it in new columns, so anyone can check your work.',
    'An average without a count is a rumour. Always say how many.',
  ],
  tips: [
    'Keep the raw data untouched and clean it in new columns: TRIM, PROPER and VALUE are your friends.',
    'SUMIFS adds up values that meet several conditions. The values to add come first.',
    'COUNTIF on a column against itself finds duplicates: anything counted more than once.',
    'Say how many responses an average is based on. Small groups can mislead.',
    'Calculate percentages from totals, not by averaging other percentages.',
    'A good insight answers “so what?”: what should we do differently because of it?',
  ],
  news: [
    'The new client dashboard goes live next month. Feedback welcome.',
    'Data protection refresher training is due by the end of the quarter.',
    'Reminder: client data never leaves the shared drive, and never goes in personal email.',
    'The customer survey closed with a record number of responses.',
  ],
}
