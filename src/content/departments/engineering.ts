/** Engineering: the internal software the company runs on. */
import { COMPANY } from '../company'
import type { Department } from './types'

export const engineering: Department = {
  careerId: 'software-development',
  name: 'Engineering',
  sign: 'ENGINEERING',
  manager: {
    id: 'manager',
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    email: `samuel.adeyemi@${COMPANY.emailDomain}`,
    initials: 'SA',
    color: 'bg-emerald-700',
    startingTrust: 50,
    personality:
      'Patient, practical and allergic to heroics. Prefers small, tested changes to clever ones, and always asks how you know it works.',
  },
  senior: {
    id: 'senior',
    name: 'Rosa Ferreira',
    role: 'Senior Software Engineer',
    email: `rosa.ferreira@${COMPANY.emailDomain}`,
    initials: 'RF',
    color: 'bg-fuchsia-700',
    startingTrust: 40,
    personality:
      'Sharp, direct and a generous reviewer once you have earned it. Reads every line of a pull request and expects tests with every change.',
  },
  director: 'the chief technology officer',
  intro:
    'The Engineering team builds and runs the company’s own software: the client portal, timesheets, invoicing and the reports everyone relies on.',
  standup: {
    senior:
      'The invoicing release is ready for review. I need one more pair of eyes on the tests.',
    facilities: 'The standing desks on the third floor are being fixed today. Sorry.',
  },
  planning: {
    lines: [
      'Finance has asked for a billing report in the timesheet app before the month end.',
      '{senior} is on the invoicing release. I need someone to write up how the report should work.',
      'Any volunteers?',
    ],
    volunteerReply: 'Great. Keep it short, and think about how we will test it.',
    nobodyReply: 'All right. I will draft it, but I will want reviewers.',
  },
  seniorWork:
    'The invoicing and timesheet services, code reviews for the whole team, and keeping the test suite fast and trustworthy.',
  seniorTeaches:
    'I will show you how to read a failing test, and how to write one that actually catches bugs.',
  seniorSmallTalk: [
    'A bug without a test is a bug that comes back. Write the test first.',
    'Read the error message. Then read it again. It usually tells you exactly what is wrong.',
    'Small pull requests get reviewed today. Big ones get reviewed “later”.',
  ],
  tips: [
    'When a test fails, read the expected and received values: they tell you where to look.',
    'Change one thing at a time, then run the tests again.',
    'A good test checks one behaviour and has a name that says which.',
    'Test the edges: empty lists, zero, the first and last day, and bad input.',
    'console.log is a fine debugging tool. Remove it before you hand the code in.',
    'Write down why you made a design decision. Future you will thank you.',
  ],
  news: [
    'The client portal moved to the new servers over the weekend. No downtime.',
    'Lunch and learn on Thursday: “Testing without tears”.',
    'Reminder: never commit passwords or API keys to the code repository.',
    'The timesheet app passed its security review with no major findings.',
  ],
}
