/**
 * Software Development: a release review at the pairing desk. A colleague's
 * pull request to review, a failing test an hour before release, a
 * stakeholder pushing to ship anyway, then an error spike after deployment.
 * Code review, testing, release judgement and incident response.
 */
import { SMART } from './looks'
import type { Scenario } from './types'

const DESK = { x: 8.3, z: 4.8 }

export const RELEASE: Scenario = {
  id: 'dev-release',
  careerId: 'software-development',
  title: 'Release day: review, go or no-go, and an incident',
  summary:
    'Review a pull request, decide whether to ship with a failing test, and lead the response when errors spike after release.',
  workplace: 'devteam',
  room: 'The dev team area',
  minLevel: 1,
  player: { at: { x: 7.3, z: 3.45 }, faces: DESK },
  camera: { from: [5.2, 3.0, 1.6], looks: [9.6, 1.0, 5.0] },
  cast: [
    {
      id: 'rosa',
      name: 'Rosa Ferreira',
      role: 'Senior Software Engineer',
      look: SMART(2, 'ponytail', 0, '#0f766e', { glasses: true }),
      at: { x: 9.25, z: 4.3 },
      faces: { x: 7.4, z: 3.6 },
      personId: 'senior',
    },
    {
      id: 'samuel',
      name: 'Samuel Adeyemi',
      role: 'Engineering Manager',
      look: SMART(5, 'crop', 0, '#1e3a8a'),
      at: { x: 6.6, z: 5.6 },
      faces: DESK,
      personId: 'manager',
    },
    {
      id: 'hannah',
      name: 'Hannah Lee',
      role: 'QA Engineer',
      look: SMART(1, 'bob', 1, '#9333ea'),
      at: { x: 9.3, z: 2.9 },
      faces: { x: 7.4, z: 3.5 },
    },
    {
      id: 'tom',
      name: 'Tom Ashby',
      role: 'Head of Billing (the stakeholder)',
      look: SMART(0, 'side', 2, '#475569'),
      at: { x: 7.4, z: 6.6 },
      faces: { x: 7.4, z: 3.5 },
      moves: [{ from: 'push', at: { x: 7.9, z: 6.2 }, faces: { x: 7.4, z: 3.5 } }],
    },
  ],
  exhibits: [
    {
      id: 'diff',
      title: 'PR #212: invoice rounding',
      text: '- total = items.reduce((s, i) => s + i.price * i.qty, 0)\n+ total = Math.round(items.reduce(…) * 100) / 100\n(no test added for the rounding)',
    },
    {
      id: 'ci',
      title: 'CI run #1840',
      text: '311 passed, 1 failed: "invoice total includes VAT for EU customers": expected 1224.00, received 1020.00.',
    },
    {
      id: 'dash',
      title: 'Error dashboard, 14:05',
      text: 'Checkout errors 0.2% → 9.4% since 14:00 (release 4.12). Top error: TypeError in applyDiscount (null coupon).',
    },
  ],
  beats: [
    {
      id: 'pr',
      kind: 'say',
      who: 'rosa',
      gesture: 'talk',
      text: 'Can you review my PR before the release? It’s the invoice rounding fix.',
    },
    {
      id: 'review',
      kind: 'choose',
      prompt: 'The change rounds the total but adds no test. What do you comment?',
      points: 15,
      options: [
        {
          id: 'kind-test',
          label:
            '“Looks right to me. Could we add a test for the rounding, e.g. 3 × £0.335, so it can’t regress?”',
          score: 1,
          reply: [{ who: 'rosa', text: 'Good shout. Adding it now.', gesture: 'talk' }],
          lesson:
            'Good reviews are specific and kind, and ask for tests that prove the change.',
        },
        {
          id: 'approve',
          label: 'Approve it: Rosa is senior, it’ll be fine.',
          score: 0.2,
          reply: [{ who: 'rosa', text: 'Thanks… though I’d have liked a proper look.' }],
          lesson:
            'Reviewing seniors’ code properly is part of the job, and they want it.',
        },
        {
          id: 'harsh',
          label: '“This is sloppy. Where are the tests?”',
          score: 0.4,
          reply: [{ who: 'rosa', text: 'Fair point, rough delivery.' }],
          lesson:
            'The point was right; the tone damages trust. Comment on the code, not the person.',
        },
      ],
    },
    {
      id: 'failing',
      kind: 'say',
      who: 'hannah',
      gesture: 'talk',
      text: 'Heads up: one test is failing on the release branch. Release is in an hour.',
    },
    {
      id: 'which',
      kind: 'exhibit',
      who: 'hannah',
      prompt: 'Look at what is failing.',
      points: 10,
      items: ['diff', 'ci', 'dash'],
      correct: 'ci',
      right: [
        {
          who: 'hannah',
          text: 'EU customers are being invoiced without VAT. That’s money and compliance.',
          gesture: 'talk',
        },
      ],
      wrong: [{ who: 'hannah', text: 'That’s not the test run. CI run 1840.' }],
      lesson:
        'Read the failing test: what it expected and what it got tells you the risk.',
    },
    {
      id: 'push',
      kind: 'say',
      who: 'tom',
      gesture: 'present',
      text: 'We promised customers this release today. Can’t you just skip that one test?',
    },
    {
      id: 'go',
      kind: 'choose',
      prompt:
        'A failing test on VAT for EU customers, an hour before release. Your recommendation?',
      points: 20,
      options: [
        {
          id: 'no-go',
          label:
            'No-go until it’s fixed: wrong VAT on invoices is a real customer and legal problem. Offer a plan: fix and re-test this afternoon, or release today without the billing change.',
          score: 1,
          reply: [
            {
              who: 'samuel',
              text: 'Agreed. Ship without the billing change; fix VAT properly.',
              gesture: 'talk',
            },
            { who: 'tom', text: 'Okay. As long as customers get the rest today.' },
          ],
          lesson:
            'A failing test is information: weigh the risk, and offer options rather than just “no”.',
        },
        {
          id: 'skip',
          label: 'Skip the test and ship: the deadline matters.',
          score: 0,
          reply: [
            {
              who: 'samuel',
              text: 'Hold on. We don’t ship known VAT errors. No.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 }, reputation: -1 },
          lesson: 'Disabling a failing test hides the problem; it does not remove it.',
        },
        {
          id: 'delay',
          label: '“We can’t release today.”',
          score: 0.5,
          reply: [{ who: 'tom', text: 'At all? Is there nothing we can ship?' }],
          lesson:
            'Right to stop the risky part, but look for what can still be delivered safely.',
        },
      ],
    },
    {
      id: 'incident',
      kind: 'say',
      who: 'hannah',
      gesture: 'talk',
      text: 'It’s 14:05. The release went out at 14:00 and checkout errors just jumped to 9%.',
    },
    {
      id: 'respond',
      kind: 'choose',
      prompt: 'Checkout errors at 9.4% since the release. First action?',
      points: 20,
      options: [
        {
          id: 'rollback',
          label:
            'Roll back to 4.11 now to stop customer impact, tell the team and support, then find the cause on a branch.',
          score: 1,
          reply: [
            { who: 'narrator', text: 'Errors fall back to 0.2% within three minutes.' },
            { who: 'samuel', text: 'Good. Stop the bleeding first.', gesture: 'talk' },
          ],
          lesson: 'In an incident, restore service first (roll back); investigate after.',
        },
        {
          id: 'hotfix',
          label: 'Debug in production and push a hotfix as fast as you can.',
          score: 0.3,
          reply: [
            {
              who: 'rosa',
              text: 'Customers are failing to pay while we debug. Roll back first.',
            },
          ],
          lesson:
            'Fixing forward under pressure prolongs the outage and risks a second bad release.',
        },
      ],
    },
    {
      id: 'cause',
      kind: 'exhibit',
      who: 'rosa',
      prompt: 'What caused it?',
      points: 5,
      items: ['dash', 'diff'],
      correct: 'dash',
      right: [
        {
          who: 'rosa',
          text: 'applyDiscount with a null coupon. We never tested no-coupon checkouts.',
          gesture: 'talk',
        },
      ],
      wrong: [{ who: 'rosa', text: 'Not that change. Look at the error dashboard.' }],
      lesson: 'The error dashboard points to the failing code path.',
    },
    {
      id: 'meeting-decision',
      kind: 'choose',
      who: 'tom',
      prompt:
        'Tom: “While you’re here: can you also add PDF export to the billing report before Friday?”',
      points: 15,
      options: [
        {
          id: 'backlog',
          label:
            'Add it to the backlog to be prioritised for next sprint, after the CSV export already promised',
          score: 1,
          reply: [
            {
              who: 'samuel',
              text: 'Good answer. It respects the plan and the commitment already made, and the request will be considered properly.',
              gesture: 'talk',
            },
          ],
          lesson:
            'It respects the plan and the commitment already made, and the request will be considered properly.',
        },
        {
          id: 'yes',
          label: 'Say yes, it’s small',
          score: 0,
          reply: [
            {
              who: 'samuel',
              text: 'Unplanned work pushes back promised work, and “small” is often wrong.',
              gesture: 'talk',
            },
          ],
          lesson: 'Unplanned work pushes back promised work, and “small” is often wrong.',
        },
        {
          id: 'no',
          label: 'Say no: the sprint is fixed',
          score: 0.4,
          reply: [
            {
              who: 'samuel',
              text: 'Protects the sprint, but the request deserves a place in the backlog.',
              gesture: 'talk',
            },
          ],
          lesson: 'Protects the sprint, but the request deserves a place in the backlog.',
        },
      ],
    },
    {
      id: 'postmortem',
      kind: 'speak',
      who: 'samuel',
      prompt:
        'Write the short incident summary for the team: what happened, impact, what fixed it, and what we change.',
      points: 30,
      minWords: 35,
      mentions: [
        ['roll back', 'rolled back', 'rollback'],
        ['9', 'checkout', 'error'],
        ['null', 'coupon', 'applyDiscount'],
        ['test'],
      ],
      model:
        'At 14:00 release 4.12 raised checkout errors from 0.2% to 9.4%. We rolled back to 4.11 at 14:07 and errors returned to normal. Cause: applyDiscount failed on a null coupon, a path with no test. Actions: add tests for checkouts without a coupon and a canary release step. No blame: the gap was in our tests.',
      good: [
        {
          who: 'samuel',
          text: 'Clear, blameless, with actions. Post it.',
          gesture: 'talk',
        },
      ],
      weak: [
        {
          who: 'samuel',
          text: 'Include impact, the rollback, the cause and the test we’re adding.',
        },
      ],
      lesson:
        'Blameless incident summaries record impact, fix, cause and actions so it does not happen again.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'A safe release: VAT error kept out, incident over in seven minutes',
      feedback:
        'Thoughtful review, a sound release call and a calm rollback. That’s senior behaviour.',
      effects: { trust: { manager: 3, senior: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Release out, incident handled',
      feedback: 'Good day overall. A few calls could have been sharper.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Release out, with avoidable problems',
      feedback:
        'We got there, but customers felt some of it. Let’s review release practice.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Release rolled back by the manager',
      feedback:
        'Some decisions today put customers at risk. Let’s go through review and release together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 120,
  skills: { 'software-testing': 25, debugging: 20, 'software-design': 15 },
  caseLink: {
    caseId: 'mtg-dev-sprint-review',
    answers: [
      {
        beat: 'meeting-decision',
        step: 'late',
        options: { backlog: 'backlog', yes: 'yes', no: 'no' },
      },
    ],
  },
}
