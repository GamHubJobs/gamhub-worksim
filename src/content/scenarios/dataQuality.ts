/**
 * Data Analysis: a data-quality incident at the standing table. The sales
 * dashboard shows sales doubled overnight; find the duplicate rows from a
 * bad join, hold the report rather than publish wrong numbers, minimise
 * personal data asked for casually, and write the incident note.
 */
import { SMART } from './looks'
import type { Scenario } from './types'

const TABLE = { x: 8.6, z: 4.0 }

export const DATA_INCIDENT: Scenario = {
  id: 'data-incident',
  careerId: 'data-analytics',
  title: 'The dashboard that doubled overnight',
  summary:
    'The sales dashboard says sales doubled overnight. Find out why, hold the report, protect personal data, and write it up.',
  workplace: 'insights',
  room: 'The insights wall',
  minLevel: 1,
  player: { at: { x: 7.55, z: 4.0 }, faces: TABLE },
  camera: { from: [5.4, 3.4, 1.4], looks: [9.4, 1.0, 4.4] },
  cast: [
    {
      id: 'kenji',
      name: 'Kenji Sato',
      role: 'Senior Data Analyst',
      look: SMART(1, 'side', 0, '#0369a1', { glasses: true }),
      at: { x: 9.6, z: 2.75 },
      faces: TABLE,
      personId: 'senior',
    },
    {
      id: 'amara',
      name: 'Amara Nwosu',
      role: 'Head of Data & Insights',
      look: SMART(6, 'curly', 0, '#4d7c0f'),
      at: { x: 9.7, z: 5.25 },
      faces: TABLE,
      personId: 'manager',
    },
    {
      id: 'dan',
      name: 'Dan Reyes',
      role: 'Operations Manager',
      look: SMART(2, 'short', 2, '#9a3412'),
      at: { x: 7.3, z: 5.7 },
      faces: { x: 8.4, z: 4.2 },
    },
  ],
  exhibits: [
    {
      id: 'rows',
      title: 'Row counts',
      text: 'orders: 10,420 rows. orders joined to customer_addresses: 20,873 rows. Customers with 2 addresses since Monday’s import: 10,410.',
    },
    {
      id: 'chart',
      title: 'Dashboard: daily sales',
      text: 'Monday £61,200; Tuesday £122,900 (+101%).',
    },
    {
      id: 'request',
      title: 'Dan’s request',
      text: '“Send me every customer’s name, email, address and spend this year, so I can see who our big spenders are.”',
    },
  ],
  beats: [
    {
      id: 'alarm',
      kind: 'say',
      who: 'dan',
      gesture: 'present',
      text: 'Sales doubled yesterday! I’ve told the directors. Can you publish the weekly report today?',
    },
    {
      id: 'suspicious',
      kind: 'choose',
      prompt: 'A 101% jump overnight with no campaign or event.',
      points: 15,
      options: [
        {
          id: 'check',
          label:
            'Treat it as suspicious until checked: compare row counts and recent changes to the data before anyone relies on it.',
          score: 1,
          reply: [
            {
              who: 'kenji',
              text: 'Agreed. Too good to be true usually is.',
              gesture: 'talk',
            },
          ],
          lesson:
            'A sudden, unexplained jump is a data-quality question first, a business result second.',
        },
        {
          id: 'celebrate',
          label: 'Great news: publish it.',
          score: 0,
          reply: [
            {
              who: 'amara',
              text: 'Before we check it? If it’s wrong, the directors will make bad decisions.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Publishing unchecked anomalies spreads errors faster than corrections.',
        },
      ],
    },
    {
      id: 'cause',
      kind: 'exhibit',
      who: 'kenji',
      prompt: 'Which evidence explains the jump?',
      points: 20,
      items: ['chart', 'rows', 'request'],
      correct: 'rows',
      right: [
        {
          who: 'kenji',
          text: 'The join to addresses doubled the rows: Monday’s import gave almost every customer a second address. Every order counted twice.',
          gesture: 'talk',
        },
      ],
      wrong: [
        {
          who: 'kenji',
          text: 'That shows the jump, not the cause. Check the row counts.',
        },
      ],
      lesson:
        'Compare row counts before and after a join: duplicates from one-to-many joins inflate totals.',
    },
    {
      id: 'hold',
      kind: 'choose',
      who: 'dan',
      prompt:
        'Dan: “Can’t you publish now and fix it next week? I’ve already told the directors.”',
      points: 20,
      options: [
        {
          id: 'correct',
          label:
            'Hold the report, tell the directors today that yesterday’s figure was a data error (sales were about £61k), fix the join, and add a row-count check.',
          score: 1,
          reply: [
            {
              who: 'dan',
              text: 'Embarrassing, but better now than after they’ve acted on it.',
              gesture: 'talk',
            },
            { who: 'amara', text: 'Exactly right. Correct it quickly and openly.' },
          ],
          effects: { reputation: 2 },
          lesson: 'Correct known errors quickly and openly, even when it is awkward.',
        },
        {
          id: 'publish',
          label: 'Publish now and quietly fix it next week.',
          score: 0,
          reply: [
            {
              who: 'amara',
              text: 'We never publish numbers we know are wrong.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -3 }, reputation: -2 },
          lesson: 'Knowingly publishing wrong figures destroys trust in all your work.',
        },
      ],
    },
    {
      id: 'personal',
      kind: 'say',
      who: 'dan',
      gesture: 'talk',
      text: 'While you’re at it, send me every customer’s name, email, address and spend this year so I can see the big spenders.',
    },
    {
      id: 'minimise',
      kind: 'choose',
      prompt: 'Dan wants full personal details for every customer, to find big spenders.',
      points: 15,
      options: [
        {
          id: 'minimal',
          label:
            'Ask what decision it supports, then give the least data needed: spend bands by region, with customer IDs instead of names, shared securely.',
          score: 1,
          reply: [
            {
              who: 'dan',
              text: 'That answers my question just as well.',
              gesture: 'talk',
            },
          ],
          lesson: 'Data minimisation: share only the personal data the purpose needs.',
        },
        {
          id: 'send',
          label: 'Email him the full spreadsheet.',
          score: 0,
          reply: [
            {
              who: 'amara',
              text: 'Names, emails and addresses for every customer, by email? That’s a data protection risk.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson: 'Sending unnecessary personal data increases the harm of any leak.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'speak',
      who: 'amara',
      prompt:
        'Write the data incident note in your own words: what happened, the impact, the fix, and the prevention.',
      points: 30,
      minWords: 30,
      mentions: [
        ['join', 'duplicate', 'address'],
        ['doubl', '101', 'twice'],
        ['corrected', 'directors', 'held'],
        ['row count', 'check', 'test'],
      ],
      model:
        'Tuesday’s dashboard showed sales up 101%. Cause: Monday’s address import gave most customers two addresses, so the join to customer_addresses duplicated every order. Impact: figures doubled; the directors were told of the error the same day and the weekly report was held. Fix: join on the current address only. Prevention: an automatic row-count check before publishing.',
      good: [
        {
          who: 'amara',
          text: 'That’s a model incident note. Thank you.',
          gesture: 'talk',
        },
      ],
      weak: [
        {
          who: 'amara',
          text: 'Cover the cause, the impact, the fix and how we stop it happening again.',
        },
      ],
      lesson: 'Incident notes record cause, impact, fix and prevention, without blame.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Error caught and corrected before anyone acted on it',
      feedback:
        'You found the cause, corrected it openly and protected customers’ data. Excellent.',
      effects: { trust: { manager: 3, senior: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Error corrected',
      feedback: 'Good investigation. Raise the alarm a little faster next time.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Error corrected late',
      feedback: 'We fixed it, but wrong numbers were out for a while. Let’s add checks.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Wrong figures reached the directors',
      feedback:
        'Wrong numbers went out and personal data was put at risk. Let’s review together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 100,
  skills: { 'data-cleaning': 25, 'data-analysis': 20, 'insight-communication': 15 },
}
