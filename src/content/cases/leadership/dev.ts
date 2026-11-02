/** Leadership cases: software-development. */
import type { CaseInput } from '../schema'
import { replies, FEEDBACK_AVOID } from './shared'

const devLead: CaseInput = {
  id: 'lead-dev-team',
  version: 1,
  careerId: 'software-development',
  kind: 'leadership',
  minLevel: 4,
  title: 'Plan the sprint and review a pull request',
  summary:
    'Plan the sprint with the team’s capacity, review a junior’s code change and handle a disagreement.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'mileage-tests' },
  deadlineHours: 8,
  email: {
    subject: 'Sprint planning is yours',
    body: `Hi {name},

As Lead Developer you now plan the sprint. Please assign the work, review Aisha’s pull request for the invoice export, and settle the testing argument between Kai and Aisha.

Samuel`,
  },
  whyItMatters:
    'Lead developers multiply the team: planning within real capacity, reviewing code to raise quality without crushing people, and setting standards everyone agrees with.',
  objectives: [
    'Plan work within capacity',
    'Review a pull request constructively',
    'Set a team standard fairly',
  ],
  evidence: [
    {
      id: 'pr',
      title: 'Aisha’s pull request: invoice export',
      text: 'Adds CSV export of invoices. Clear function names. **No tests.** Builds the CSV by joining fields with commas, so a client name like “Smith, Jones & Co” breaks the columns. Uses the existing date helper correctly.',
    },
    {
      id: 'argument',
      title: 'The disagreement',
      text: '**Kai**: “Every pull request must have tests.” **Aisha**: “Tests slow us down; we can test by hand.”',
    },
  ],
  steps: [
    {
      id: 'plan',
      kind: 'assign',
      title: 'Plan the sprint',
      prompt: 'Give each item to the right developer.',
      points: 25,
      members: [
        {
          id: 'kai',
          name: 'Kai Morgan',
          strengths: 'Senior; payments and security',
          capacity: 2,
        },
        {
          id: 'aisha',
          name: 'Aisha Rahman',
          strengths: 'Junior; front-end, learning testing',
          capacity: 1,
        },
        {
          id: 'noah',
          name: 'Noah Wells',
          strengths: 'Databases and performance',
          capacity: 1,
        },
      ],
      items: [
        {
          id: 'payments',
          label: 'Online payments integration',
          best: ['kai'],
          why: 'Payments need the most experienced developer.',
        },
        {
          id: 'security',
          label: 'Fix the login rate-limit issue',
          best: ['kai'],
          why: 'Security work suits Kai.',
        },
        {
          id: 'query',
          label: 'Speed up the slow reports query',
          best: ['noah'],
          why: 'Database performance is Noah’s strength.',
        },
        {
          id: 'ui',
          label: 'Booking form improvements',
          best: ['aisha'],
          why: 'Front-end work suits Aisha.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review the pull request',
      prompt: 'Which of these should be fixed before merging?',
      points: 30,
      findings: [
        {
          id: 'tests',
          text: 'There are no tests for the export.',
          issue: true,
          why: 'Without tests, the next change could break exports silently.',
        },
        {
          id: 'commas',
          text: 'Names containing commas break the CSV columns.',
          issue: true,
          why: 'CSV fields with commas must be quoted.',
        },
        {
          id: 'names',
          text: 'The function names are unclear.',
          issue: false,
          why: 'They are clear: say so in the review.',
        },
      ],
    },
    {
      id: 'standard',
      kind: 'decide',
      title: 'The testing disagreement',
      prompt: 'How do you settle it?',
      points: 15,
      options: [
        {
          id: 'agree',
          label:
            'Agree a team standard together: tests for every change to business logic, with pairing to help anyone new to testing',
          verdict: 'best',
          why: 'A standard the team agrees on sticks, and pairing makes it achievable.',
          effects: { reputation: 2 },
        },
        {
          id: 'kai-wins',
          label: 'Tell Aisha Kai is right and move on',
          verdict: 'acceptable',
          why: 'The outcome is right, but imposing it without support leaves Aisha behind.',
        },
        {
          id: 'manual',
          label: 'Allow manual testing to keep things fast',
          verdict: 'poor',
          why: 'Bugs like the comma problem reach clients when testing is skipped.',
          effects: { indicators: { risk: 3 } },
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Aisha Rahman',
      title: 'Review comments for Aisha',
      prompt: 'Write your review: what’s good, what to fix, and how you’ll help.',
      points: 30,
      minWords: 50,
      mentions: [
        ['clear', 'good', 'nice'],
        ['test'],
        ['comma', 'quote'],
        ['pair', 'help', 'together'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Aisha, nice work on the export: the function names are clear and you used the date helper exactly right. Two things before we merge: names with commas, like “Smith, Jones & Co”, break the columns, so fields need quoting; and please add tests, including one for a name with a comma, so it can’t break again. Happy to pair on the tests this afternoon if that helps. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { risk: -2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -4 },
  },
  replies: replies(
    'Samuel',
    'A well-planned sprint, and the team has adopted the testing standard. Aisha’s export now has its first tests.',
  ),
  lapseLog: 'The sprint started without a plan.',
  skills: { 'software-design': 25, 'software-testing': 20 },
  xp: 150,
}

export const LEADERSHIP_DEV: CaseInput[] = [devLead]
