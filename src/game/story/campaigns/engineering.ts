/**
 * Software Development: "Release Day". A first job in the engineering team.
 * A vague bug report that turns out to be losing customers' data; then a
 * feature with an impossible deadline, and a release with a known problem.
 * Whether the player ships it anyway comes back on release day. Original story.
 */
import type { Campaign } from '../types'
import { answer, scene, SHARED_CAST, standup, talk } from './kit'

export const ENGINEERING_STORY: Campaign = {
  id: 'software-development',
  careerId: 'software-development',
  title: 'Release Day',
  premise:
    'Your first job as a developer. The code is older than some of your colleagues, and the release is in two weeks.',
  cast: { ...SHARED_CAST, manager: 'Samuel Adeyemi', senior: 'Rosa Ferreira' },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · It works on my machine',
      missions: [
        {
          id: 'first-day',
          type: 'main',
          title: 'Hello, world',
          from: 'manager',
          intro: [
            'First day in Engineering. Samuel wants to meet you; Rosa will help you set up.',
          ],
          objectives: [
            talk(
              'samuel',
              'manager',
              'dev-samuel',
              'Meet Samuel, the engineering manager',
              'manager',
            ),
            talk(
              'rosa',
              'senior',
              'dev-rosa',
              'Ask Rosa to help you get the code running',
              'desk',
            ),
          ],
          reward: { xp: 20, trust: { manager: 2 } },
          summary: () =>
            'Samuel cares about shipping. Rosa cares about not shipping bugs. The trick, it seems, is both.',
        },
        {
          id: 'vague-bug',
          type: 'main',
          title: '“It doesn’t work”',
          from: 'senior',
          after: ['first-day'],
          intro: [
            'A bug report, in full: “The invoice screen doesn’t work.” Rosa thinks it might be nothing.',
          ],
          objectives: [
            talk(
              'carmen',
              'front2',
              'dev-carmen',
              'Ask Carmen, who reported it, what she saw',
              'desk',
            ),
            answer('case', 'dev-vague-bug', 'Reply to the bug report (Cases)'),
            talk('rosa', 'senior', 'dev-rosa-bug', 'Tell Rosa what you found', 'desk'),
          ],
          reward: { xp: 40 },
          summary: (flags) =>
            flags.includes('dev-found-loss')
              ? 'It was not nothing: saving an invoice with an accent in the name was silently dropping the line items. You found it by asking Carmen exactly what she typed.'
              : 'You closed it as “could not reproduce”. It is still happening, somewhere.',
        },
        {
          id: 'tom-script',
          type: 'side',
          title: 'Tom’s spreadsheet',
          from: 'facilities',
          after: ['first-day'],
          intro: [
            'Tom has heard you “do computers”. He has a spreadsheet of every lightbulb in the building, and a dream.',
          ],
          objectives: [
            talk(
              'tom',
              'facilities',
              'dev-tom',
              'Find Tom in the break room',
              'breakroom',
            ),
          ],
          reward: { xp: 10, trust: { facilities: 3 } },
          summary: () =>
            'Tom’s lightbulb spreadsheet now tells him which ones to replace first. He is overjoyed.',
        },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter 2 · Release day',
      missions: [
        {
          id: 'deadline',
          type: 'main',
          title: 'The impossible deadline',
          from: 'manager',
          after: ['vague-bug'],
          intro: [
            'A client wants a new export feature in the release, two weeks early. Samuel has half said yes.',
          ],
          objectives: [
            answer(
              'case',
              'dev-feature-deadline',
              'Reply about the feature and the deadline (Cases)',
            ),
            talk(
              'rosa',
              'senior',
              'dev-rosa-deadline',
              'Plan the release with Rosa',
              'desk',
            ),
            talk(
              'samuel',
              'manager',
              'dev-samuel-deadline',
              'Tell Samuel what can ship',
              'manager',
            ),
          ],
          reward: { xp: 45 },
          summary: (flags) =>
            flags.includes('dev-ship-known') && !flags.includes('dev-scope-cut')
              ? 'Everything ships on time, including a known problem with large exports, “to be fixed next sprint”.'
              : 'The release ships on time with a smaller export feature that works, and the rest next month. The client grumbled, then agreed.',
        },
        {
          id: 'release',
          type: 'main',
          title: 'Release day',
          from: 'manager',
          after: ['deadline'],
          intro: [
            'Release day. Everyone is at the stand-up early, and nobody is saying it out loud.',
          ],
          objectives: [
            standup('Be at the stand-up: release day'),
            talk(
              'samuel',
              'manager',
              'dev-samuel-release',
              'Samuel, after the release',
              'manager',
            ),
          ],
          flags: ['story-complete'],
          reward: { xp: 70 },
          summary: (flags) =>
            flags.includes('dev-ship-known') && !flags.includes('dev-scope-cut')
              ? 'The end of “Release Day”. The biggest client ran a large export on day one, and it failed in front of their board. The fix took a week. Samuel says you will both remember this. You will.'
              : 'The end of “Release Day”. The release went out quietly, which is the best kind. Samuel asks you to lead the next one.',
        },
      ],
    },
  ],
  scenes: {
    'dev-samuel': scene(
      'dev-samuel',
      'manager',
      () => [
        '*Samuel has a countdown on his screen: 14 days.*',
        'Welcome, {name}. We ship every month. Small changes, reviewed, tested. If you are not sure, ask. Asking is cheaper than rolling back.',
      ],
      [
        {
          id: 'ok',
          label: 'Say you will ask',
          reply: ['Good. Rosa will get you running.'],
          trust: { manager: 2 },
        },
      ],
    ),
    'dev-rosa': scene(
      'dev-rosa',
      'senior',
      () => [
        '*Rosa has eleven terminals open and knows what is in every one.*',
        'The code is older than me, and I am not young. Run the tests first. Every time. If a test fails, it is telling you something.',
      ],
      [
        {
          id: 'tests',
          label: 'Ask her to show you the tests',
          reply: ['*Her face lights up.* Finally. Someone who asks about the tests.'],
          trust: { senior: 3 },
        },
        {
          id: 'code',
          label: 'Say you would rather dive into the code',
          reply: ['Bold. Run the tests anyway.'],
          trust: { senior: 1 },
        },
      ],
    ),
    'dev-carmen': scene(
      'dev-carmen',
      'front2',
      () => [
        '*Carmen remembers exactly.*',
        'I saved an invoice for a café called “Crème”, with the little accent. The lines were all gone when I opened it. I thought it was me.',
      ],
      [
        {
          id: 'accent',
          label: 'Ask her to show you, with the same name',
          reply: ['*The lines vanish again.* Carmen gasps. “It is not me!”'],
          flags: ['dev-found-loss'],
          trust: { front2: 3 },
        },
        {
          id: 'retry',
          label: 'Suggest it was probably a one-off',
          reply: ['Maybe. I will tell you if it happens again.'],
        },
      ],
    ),
    'dev-rosa-bug': scene(
      'dev-rosa-bug',
      'senior',
      (flags) =>
        flags.includes('dev-found-loss')
          ? [
              '*Rosa goes pale.*',
              'Accented names, silently dropping lines? That is data loss. That is the worst kind of bug. Well found. Write the test first, then the fix.',
            ]
          : [
              '*Rosa shrugs.*',
              '“Could not reproduce” is a reason, not an answer. But fine.',
            ],
      [{ id: 'ok', label: 'Nod', reply: ['Good work. Really.'], trust: { senior: 2 } }],
    ),
    'dev-tom': scene(
      'dev-tom',
      'facilities',
      () => [
        '*Tom shows you a spreadsheet with four hundred lightbulbs on it, colour-coded by feeling.*',
        'Is there any way it could tell me which ones will go first?',
      ],
      [
        {
          id: 'help',
          label: 'Add a formula that sorts them by age',
          reply: ['*He gasps.* It is beautiful. You are a wizard.'],
          trust: { facilities: 3 },
        },
      ],
    ),
    'dev-rosa-deadline': scene(
      'dev-rosa-deadline',
      'senior',
      () => [
        '*Rosa sketches the release on the whiteboard.*',
        'We can ship the full export if we skip the large-file tests. Or ship a smaller export that works, and the rest next month. The first will probably be fine. Probably.',
      ],
      [
        {
          id: 'small',
          label: 'Ship the smaller export, properly tested',
          reply: ['Good. Small and right beats big and broken.'],
          flags: ['dev-scope-cut'],
          trust: { senior: 3 },
        },
        {
          id: 'all',
          label: 'Ship it all, skip the large-file tests',
          reply: [
            '*She writes “KNOWN ISSUE” on the board, in red.* Your call. I will note my objection.',
          ],
          flags: ['dev-ship-known'],
          trust: { senior: -2 },
        },
      ],
    ),
    'dev-samuel-deadline': scene(
      'dev-samuel-deadline',
      'manager',
      (flags) => [
        '*Samuel looks at the plan.*',
        flags.includes('dev-ship-known')
          ? 'Everything, on time, with a known issue. The client will be happy on day one. Will they be on day two?'
          : 'A smaller feature, working, and the rest next month. The client will grumble. I can sell that.',
      ],
      [
        { id: 'stand', label: 'Stand by the plan', reply: ['All right. Let’s go.'] },
        {
          id: 'switch',
          label: 'Change it: ship less, and test it all',
          reply: ['Thank you. That is the harder call.'],
          flags: ['dev-scope-cut'],
          trust: { manager: 2 },
        },
      ],
    ),
    'dev-samuel-release': scene(
      'dev-samuel-release',
      'manager',
      (flags) => [
        '*Samuel’s countdown says 0.*',
        flags.includes('dev-ship-known') && !flags.includes('dev-scope-cut')
          ? 'The big client’s export failed in front of their board this morning. We knew it might. I am not angry. I am thinking about how we decide next time.'
          : 'Quiet release. No incidents, no rollbacks. The client is already using the export.',
      ],
      [
        {
          id: 'own',
          label: 'Say what you would do differently, or the same',
          reply: ['That is a good engineer talking. Lead the next one.'],
          trust: { manager: 2 },
        },
      ],
    ),
  },
}
