/**
 * Software Development: sprint planning at the sprint board. Split a story
 * too big to estimate, negotiate scope with the product owner against the
 * team's capacity, catch a security flaw in a story, ask for testable
 * acceptance criteria, include accessibility, and agree the sprint goal.
 */
import { SMART } from './looks'
import type { Scenario } from './types'

const BOARD = { x: 11.9, z: 2.6 }

export const PLANNING: Scenario = {
  id: 'dev-planning',
  careerId: 'software-development',
  title: 'Sprint planning at the board',
  summary:
    'Plan the next sprint with the product owner: split a big story, fit the work to capacity, and catch a security flaw before it is built.',
  workplace: 'devteam',
  room: 'The dev team area',
  minLevel: 1,
  player: { at: { x: 10.9, z: 2.6 }, faces: BOARD },
  camera: { from: [7.4, 3.4, 5.2], looks: [11.3, 1.3, 2.4] },
  cast: [
    {
      id: 'priya',
      name: 'Priya Nair',
      role: 'Product Owner',
      look: SMART(3, 'long', 0, '#7e22ce'),
      at: { x: 9.95, z: 1.5 },
      faces: { x: 10.9, z: 2.6 },
    },
    {
      id: 'rosa',
      name: 'Rosa Ferreira',
      role: 'Senior Software Engineer',
      look: SMART(2, 'ponytail', 0, '#0f766e', { glasses: true }),
      at: { x: 9.9, z: 3.6 },
      faces: { x: 10.9, z: 2.6 },
      personId: 'senior',
    },
    {
      id: 'samuel',
      name: 'Samuel Adeyemi',
      role: 'Engineering Manager',
      look: SMART(5, 'crop', 0, '#1e3a8a'),
      at: { x: 9.1, z: 2.6 },
      faces: BOARD,
      personId: 'manager',
    },
  ],
  exhibits: [
    {
      id: 'story',
      title: 'Story: customer accounts',
      text: '“Customers can create an account and log in.” Notes: store the password in the users table so support can read it out if they forget it.',
    },
    {
      id: 'velocity',
      title: 'Team velocity',
      text: 'Last three sprints: 21, 24, 22 points. Two people on leave next sprint (capacity about 16).',
    },
    {
      id: 'backlog',
      title: 'Proposed sprint',
      text: '12 stories, 31 points, including the 13-point “customer accounts”.',
    },
  ],
  beats: [
    {
      id: 'open',
      kind: 'say',
      who: 'priya',
      gesture: 'present',
      text: 'I’d like all twelve stories this sprint. The customer accounts one is the most important.',
    },
    {
      id: 'capacity',
      kind: 'exhibit',
      who: 'samuel',
      prompt: 'Samuel: “Can we take 31 points?” Show the evidence.',
      points: 10,
      items: ['story', 'velocity', 'backlog'],
      correct: 'velocity',
      right: [
        {
          who: 'samuel',
          text: 'About 22 usually, 16 with two on leave. 31 won’t fit.',
          gesture: 'talk',
        },
      ],
      wrong: [{ who: 'samuel', text: 'That doesn’t tell us how much we can do.' }],
      lesson: 'Plan from measured velocity and real capacity, not from wishes.',
    },
    {
      id: 'scope',
      kind: 'choose',
      prompt: 'Priya wants 31 points; capacity is about 16.',
      points: 20,
      options: [
        {
          id: 'prioritise',
          label:
            'Ask Priya to rank the stories, take the top ones that fit 16 points, and agree what moves to the next sprint.',
          score: 1,
          reply: [
            {
              who: 'priya',
              text: 'Okay: accounts first, then search. The rest can wait.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Fit the sprint to capacity by priority; the product owner decides what matters most.',
        },
        {
          id: 'all',
          label: 'Agree to all 12: we’ll work late.',
          score: 0,
          reply: [
            {
              who: 'rosa',
              text: 'Then we’ll miss half and burn out doing it.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -1 } },
          lesson: 'Overcommitting guarantees missed promises and tired teams.',
        },
      ],
    },
    {
      id: 'split',
      kind: 'choose',
      who: 'rosa',
      prompt: 'Rosa: “Customer accounts is 13 points. That’s a lot of unknowns.”',
      points: 15,
      options: [
        {
          id: 'split-it',
          label:
            'Split it into smaller stories that each deliver something: sign up, log in, reset password.',
          score: 1,
          reply: [
            {
              who: 'rosa',
              text: 'Much easier to estimate and test. Three, three and five.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Split big stories into small, valuable slices: they are easier to estimate, build and test.',
        },
        {
          id: 'keep',
          label: 'Keep it as one 13-point story.',
          score: 0.3,
          reply: [
            {
              who: 'rosa',
              text: 'It’ll be half-done at the end of the sprint, you watch.',
            },
          ],
          lesson: 'Large stories hide risk and often end the sprint unfinished.',
        },
      ],
    },
    {
      id: 'security',
      kind: 'choose',
      prompt:
        'The story’s notes say: store the password so support can read it out to customers.',
      points: 25,
      options: [
        {
          id: 'hash',
          label:
            'Flag it: passwords must never be stored readable. Store a salted hash, and give support a reset link instead of reading passwords out.',
          score: 1,
          reply: [
            {
              who: 'priya',
              text: 'I didn’t know that was a risk. Reset link it is.',
              gesture: 'talk',
            },
            {
              who: 'samuel',
              text: 'Good catch. That would have been a serious breach waiting to happen.',
            },
          ],
          effects: { reputation: 2 },
          lesson:
            'Passwords are stored only as salted hashes; nobody, including support, should be able to read them.',
        },
        {
          id: 'build',
          label: 'Build it as written: it’s what the product owner asked for.',
          score: 0,
          reply: [
            {
              who: 'rosa',
              text: 'We can’t store readable passwords. Ever.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -2 } },
          lesson:
            'Developers are responsible for refusing insecure designs, whoever asks.',
        },
      ],
    },
    {
      id: 'criteria',
      kind: 'choose',
      who: 'samuel',
      prompt: 'Samuel: “How will we know “log in” is done?”',
      points: 10,
      options: [
        {
          id: 'testable',
          label:
            'Write acceptance criteria we can test: wrong password shows an error, five failures locks for 15 minutes, works with a keyboard and a screen reader.',
          score: 1,
          reply: [
            {
              who: 'samuel',
              text: 'Testable, and accessibility included. Good.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Acceptance criteria are specific and testable, and include accessibility.',
        },
        {
          id: 'vague',
          label: '“When it works.”',
          score: 0.2,
          reply: [{ who: 'priya', text: 'Works how?' }],
          lesson: 'Vague “done” means arguments at the end of the sprint.',
        },
      ],
    },
    {
      id: 'goal',
      kind: 'speak',
      who: 'samuel',
      prompt: 'State the sprint goal and what’s in it, in your own words.',
      points: 20,
      minWords: 25,
      mentions: [
        ['sign up', 'log in', 'account'],
        ['hash', 'reset'],
        ['16', 'capacity', 'points'],
      ],
      model:
        'Sprint goal: customers can sign up and log in securely. In scope: sign up, log in and password reset (11 points) plus search (5), 16 points to match our capacity with two on leave. Passwords stored as salted hashes, with a reset link for support. The rest moves to next sprint.',
      good: [
        {
          who: 'priya',
          text: 'Clear. I can tell the stakeholders that.',
          gesture: 'talk',
        },
      ],
      weak: [
        { who: 'samuel', text: 'Say what the goal is, what’s in, and why it fits.' },
      ],
      lesson: 'A sprint goal says what will be true at the end, and why the scope fits.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'A realistic, secure sprint the whole team believes in',
      feedback:
        'Capacity-based, well split, and a security flaw caught before a line was written.',
      effects: { trust: { manager: 3, senior: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Sprint planned',
      feedback: 'Good planning. Push back a little earlier next time.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Sprint planned, with risks',
      feedback: 'We have a plan, but some of it is optimistic. Let’s watch it closely.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Planning restarted by the engineering manager',
      feedback:
        'Too much scope and an insecure design. Let’s go through planning together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 100,
  skills: { 'software-design': 25, 'software-testing': 20, programming: 15 },
}
