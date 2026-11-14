/** Accounting: the books, reconciliations and the month-end close. */
import { COMPANY } from '../company'
import type { Department } from './types'

export const accounting: Department = {
  careerId: 'accounting',
  name: 'Accounting',
  workplace: 'records',
  sign: 'ACCOUNTING',
  manager: {
    id: 'manager',
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    email: `daniel.okoro@${COMPANY.emailDomain}`,
    initials: 'DO',
    color: 'bg-indigo-600',
    startingTrust: 50,
    personality:
      'Calm, methodical and precise. Believes every number must be traceable to a document, and teaches by asking questions rather than giving answers.',
  },
  senior: {
    id: 'senior',
    name: 'Helen Park',
    role: 'Senior Accountant',
    email: `helen.park@${COMPANY.emailDomain}`,
    initials: 'HP',
    color: 'bg-fuchsia-700',
    startingTrust: 40,
    personality:
      'Brilliant with the ledgers and impatient with sloppiness. Guards the month-end close closely, but generous with her knowledge once you show you check your work.',
  },
  director: 'the chief financial officer',
  intro:
    'The Accounting team keeps the company’s books: recording transactions, reconciling the bank, looking after fixed assets and producing the monthly accounts.',
  standup: {
    senior: 'Closing the October ledgers. I need every journal posted by Wednesday.',
    facilities:
      'The archive room is full again. If you have old files, talk to me first.',
  },
  planning: {
    lines: [
      'This week we close October. The auditors arrive in three weeks and want clean reconciliations.',
      '{senior} is leading the close. I need someone to tick through the supplier statements with her.',
      'Any volunteers?',
    ],
    volunteerReply: 'Good. Bring a pencil; we tick every line.',
    nobodyReply: 'Then it will be me, again.',
  },
  seniorWork:
    'The month-end close, the ledgers, fixed assets and the audit files. If it has a debit and a credit, it crosses my desk.',
  seniorTeaches:
    'I will show you how to make a reconciliation an auditor never questions.',
  seniorSmallTalk: [
    'Debits on the left, credits on the right. Say it until you dream about it.',
    'An unreconciled difference never disappears. It just waits for the auditors.',
    'If {manager} asks “where does this number come from?”, the answer must be a document.',
  ],
  tips: [
    'Every journal entry must balance: total debits equal total credits. If they don’t, stop and find out why.',
    'Expenses and assets increase with a debit; income and liabilities increase with a credit.',
    'In a bank reconciliation, start from both balances and explain the differences one by one.',
    'Never delete a wrong entry: reverse it with an opposite entry, so the history stays visible.',
    'Write the source document number next to each entry. Future you will be grateful.',
    'SUMIF is the accountant’s best friend: it turns a journal into ledger balances in one formula.',
  ],
  news: [
    'Month-end close: all October journals must be posted by Wednesday 5 pm.',
    'The external auditors arrive on the 21st. Please keep your desks and files tidy.',
    'Reminder: purchase invoices need an approved order number before they can be posted.',
    'New starters: the accounting policies manual is on the shared drive.',
  ],
}
