import type { AssignmentInput } from '../../schemas'
import { initRepository } from '../../../game/code/git'
import { runTerminal } from '../../../game/code/terminal'

/**
 * IT Help Desk, in the Code editor: the script that sorts new Help Desk
 * tickets into queues is sending them to the wrong place. Reproduce it in
 * the Debug console with real ticket subjects, fix the rules, test, commit.
 * Teaches: support teams own small scripts too; matching text regardless of
 * capitals; a safe default; and keeping scripts in version control.
 */
const route = `/**
 * Sorts a new Help Desk ticket into a queue by words in its subject.
 * Runs every few minutes on the tickets that arrived by email.
 */
const RULES = [
  { queue: 'Access', words: ['password', 'locked', 'login'] },
  { queue: 'Hardware', words: ['printer', 'laptop', 'monitor'] },
  { queue: 'Network', words: ['wifi', 'vpn', 'internet'] },
]

export function routeTicket(subject) {
  for (const rule of RULES) {
    for (const word of rule.words) {
      if (subject.includes(word)) return rule.queue
    }
  }
  return 'Access'
}
`

const routeFixed = route
  .replace(
    "words: ['wifi', 'vpn', 'internet']",
    "words: ['wifi', 'wi-fi', 'vpn', 'internet']",
  )
  .replace(
    `export function routeTicket(subject) {
  for (const rule of RULES) {`,
    `export function routeTicket(subject) {
  const text = subject.toLowerCase()
  for (const rule of RULES) {`,
  )
  .replace('if (subject.includes(word))', 'if (text.includes(word))')
  .replace("  return 'Access'\n}", "  return 'Triage'\n}")

const tests = `import { routeTicket } from './route.js'

test('subjects as people really type them', () => {
  expect(routeTicket('Printer on floor 3 jammed again')).toBe('Hardware')
  expect(routeTicket('Locked out after holiday')).toBe('Access')
})

test('nothing recognised: a person triages it', () => {
  expect(routeTicket('Question about the new phones')).toBe('Triage')
})
`

const hidden = `import { routeTicket } from './route.js'

test('Wi-Fi with a hyphen (how most people write it)', () => {
  expect(routeTicket('Floor 2 Wi-Fi keeps dropping')).toBe('Network')
})

test('capitals anywhere', () => {
  expect(routeTicket('VPN will not connect')).toBe('Network')
  expect(routeTicket('new LAPTOP for Dana')).toBe('Hardware')
  expect(routeTicket('password reset please')).toBe('Access')
})

test('unknown subjects never land in the Access queue', () => {
  expect(routeTicket('Can I order a second chair?')).toBe('Triage')
})
`

function solution() {
  const start = { 'route.js': route, 'route.test.js': tests }
  const git = initRepository(start)
  const done = runTerminal(
    { ...start, 'route.js': routeFixed },
    git,
    'git commit -am "Route tickets regardless of capitals, add Wi-Fi, send unknown to Triage"',
  )
  return {
    language: 'javascript' as const,
    files: [
      { name: 'route.js', text: done.files['route.js'], readOnly: false },
      { name: 'route.test.js', text: done.files['route.test.js'], readOnly: true },
    ],
    git: done.git,
    debug: [
      {
        file: 'route.js',
        fn: 'routeTicket',
        args: '["Floor 2 Wi-Fi keeps dropping"]',
        value: '"Access"',
        error: null,
      },
    ],
  }
}

export const ticketRouter: AssignmentInput = {
  id: 'it-ticket-router',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-lead',
  order: 21,
  kind: 'code',
  title: 'The ticket-sorting script',
  summary:
    'Fix the script that sorts new Help Desk tickets into queues: reproduce, fix, test and commit in Code.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Tickets in the wrong queues',
    body: `Hi {name},

Something is wrong with the little script that sorts tickets arriving by email into the **Help Desk** queues:
• “Floor 2 Wi-Fi keeps dropping” went to **Access**, so the network team never saw it,
• “Printer on floor 3 jammed again” went to Access too,
• anything the script does not recognise lands in Access, and that queue is overflowing.

The script is in the **Code** app (route.js). Please:
• **reproduce** it first: in the **Debug** console, call routeTicket with the real subjects above,
• fix the rules: match words **whatever the capitals**, recognise **Wi-Fi** as it is usually written, and send anything unrecognised to **Triage** for a person to look at,
• run the tests and **commit** on main, so we know what changed if it misbehaves again.

{manager}`,
  },
  whyItMatters:
    'Service desks run on small scripts: sorting tickets, resetting accounts, checking disks. When one is wrong, tickets quietly go to the wrong team and miss their SLA. Reproducing with real subjects, fixing, testing and committing is the same discipline developers use.',
  objectives: [
    'Reproduce a script’s mistake with real ticket subjects',
    'Match text regardless of capitals, and choose a safe default',
    'Test the change and commit it',
  ],
  steps: [
    {
      id: 'reproduce',
      title: 'Reproduce it',
      instructions:
        'In Code, open the **Debug** tab in the panel and call routeTicket with `["Floor 2 Wi-Fi keeps dropping"]`, then with `["Printer on floor 3 jammed again"]`. Read what comes back.',
      hint: '"Printer".includes("printer") is false: capitals count in JavaScript.',
    },
    {
      id: 'fix',
      title: 'Fix the rules',
      instructions:
        'Compare in lower case (`subject.toLowerCase()`), add `wi-fi` to the Network words, and return `Triage` when nothing matches.',
    },
    {
      id: 'test',
      title: 'Test',
      instructions: 'Run `npm test` in the Terminal, or **Run tests**.',
    },
    {
      id: 'commit',
      title: 'Commit',
      instructions:
        '`git commit -am "…"` (or Source Control) with a message saying what changed. `git status` should then be clean.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  project: {
    title: 'Help Desk: ticket routing script',
    git: true,
    files: [
      { name: 'route.js', text: route },
      { name: 'route.test.js', text: tests, readOnly: true },
    ],
  },
  codeSolution: { 'route.js': routeFixed },
  codeSolutionProject: solution(),
  codeChecks: [
    {
      id: 'reproduced',
      type: 'debugged',
      fn: 'routeTicket',
      title: 'The mistake reproduced in the Debug console',
      points: 15,
      why: 'Seeing what the script really does with a real subject comes first.',
      hint: 'Call routeTicket in the Debug tab with one of the subjects from the email.',
    },
    {
      id: 'tests',
      type: 'tests',
      file: 'route.test.js',
      on: 'main',
      title: 'The script’s tests pass on main',
      points: 25,
      why: 'Capitals and unknown subjects are the everyday cases.',
      hint: 'Lower-case the subject before comparing; return Triage when nothing matches.',
    },
    {
      id: 'review',
      type: 'tests',
      file: 'review.test.js',
      source: hidden,
      on: 'main',
      title: 'Wi-Fi, capitals and unknown subjects all routed correctly',
      points: 35,
      why: 'The Floor 2 Wi-Fi ticket missed the network team because of a hyphen.',
      hint: "Add 'wi-fi' to the Network words.",
    },
    {
      id: 'commit',
      type: 'commits',
      messageIncludes: ['route', 'queue', 'capital', 'case', 'wi-fi', 'triage'],
      title: 'Committed with a clear message',
      points: 15,
      why: 'If tickets go astray again, the history says what changed and when.',
      hint: 'git commit -am "Route tickets regardless of capitals; unknown to Triage".',
    },
    {
      id: 'clean',
      type: 'clean',
      title: 'Nothing left uncommitted',
      points: 10,
      why: 'Only committed changes are picked up by the server that runs the script.',
      hint: 'git status should be clean, on main.',
    },
  ],
  passScore: 70,
  xp: 180,
  skills: { troubleshooting: 50, accuracy: 25, 'technical-writing': 10 },
  feedback: {
    excellent: `Hi {name},

Wi-Fi tickets are reaching the network team again, and Access has stopped overflowing. Nicely reproduced, tested and committed.

{manager}`,
    good: `Hi {name},

Good fix; one thing is missing. See the notes.

{manager}`,
    pass: `Hi {name},

Some tickets still go astray. The notes show which.

{manager}`,
    fail: `Hi {name},

Start in the Debug tab: call routeTicket with “Floor 2 Wi-Fi keeps dropping”.

{manager}`,
  },
}
