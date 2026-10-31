/** Finance & Administration: the original department. */
import { COMPANY } from '../company'
import type { Department } from './types'

export const finance: Department = {
  careerId: 'office-admin-finance',
  name: 'Finance & Administration',
  sign: 'FINANCE & ADMINISTRATION',
  manager: {
    id: 'manager',
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    email: `priya.raman@${COMPANY.emailDomain}`,
    initials: 'PR',
    color: 'bg-teal-600',
    startingTrust: 50,
    personality:
      'Direct and demanding, but fair. Values reliability and honesty above everything, and is under pressure from the directors at quarter-end.',
  },
  senior: {
    id: 'senior',
    name: 'Marcus Webb',
    role: 'Senior Finance Assistant',
    email: `marcus.webb@${COMPANY.emailDomain}`,
    initials: 'MW',
    color: 'bg-sky-700',
    startingTrust: 40,
    personality:
      'Ambitious and very capable, with five years in the team. Protective of his reputation and can be competitive with newcomers, but a great teacher once he trusts you.',
  },
  director: 'the finance director',
  intro:
    'The Finance & Administration team keeps the office running and the money in order: orders, expenses, invoices, budgets and payments.',
  standup: {
    senior: 'Supplier statements for the month-end. Should be done by lunch.',
    facilities:
      'The new printers arrive at ten. If anything goes missing, it was not me.',
  },
  planning: {
    lines: [
      'Right, the rest of the week. Quarter-end is close, and the directors want the cost report early.',
      '{senior} will lead the report. I need someone to pull the supplier figures together.',
      'Any volunteers?',
    ],
    volunteerReply: 'Fine by me. I will send you the list.',
    nobodyReply: 'I will do it myself, then.',
  },
  seniorWork:
    'Month-end close, supplier accounts, the cost reports for the directors. The interesting stuff.',
  seniorTeaches: 'Watch how I check my numbers; that is the bit nobody teaches you.',
  seniorSmallTalk: [
    'Month-end never really ends, you know. It just becomes next month’s month-end.',
    'If you want to get noticed here, do not just finish things. Finish them so {manager} never has to check.',
    'Coffee from the machine is fine. Do not touch the oat milk; that is Nina’s.',
  ],
  tips: [
    'Press F2 to edit a cell without retyping it. Saves me about an hour a week.',
    'If a total looks odd, click it and read the formula bar. Nine times out of ten the range is one row short.',
    'Ctrl+D fills a formula down. Select the first cell and everything below it, then press it.',
    'Put a $ in front of a column or row (like $B$2) and it stays fixed when you copy the formula.',
    'Before you send anything to {manager}, change one number and check the totals update. If they don’t, something was typed in.',
    'VLOOKUP without FALSE at the end is how I once paid for 200 staplers. Always FALSE.',
    'Select a range and look at the bottom-right: the spreadsheet shows the sum and average for free.',
    'Never edit the data someone sends you. Work next to it. Then nobody can say you changed their numbers.',
  ],
  news: [
    'Quarterly all-hands on Friday at 4 pm in the large meeting room. Snacks provided.',
    'Reminder: expense claims for this month are due by the 28th.',
    'The kitchen fridge is cleared every Friday afternoon. Label your lunch!',
    'New starters: IT induction sessions run every Tuesday morning.',
  ],
}
