/**
 * Data Analysis: "Signal and Noise". A first job in the data team. Sales and
 * Finance have different numbers for the same month; then a director who wants
 * analysis that supports a decision already made. Whether the player shows the
 * numbers as they are comes back at the board meeting. Original story.
 */
import type { Campaign } from '../types'
import { answer, scene, SHARED_CAST, standup, talk } from './kit'

export const DATA_STORY: Campaign = {
  id: 'data-analytics',
  careerId: 'data-analytics',
  title: 'Signal and Noise',
  premise:
    'Your first job in a data team. Everyone wants a number. Not everyone wants the right one.',
  cast: { ...SHARED_CAST, manager: 'Amara Nwosu', senior: 'Kenji Sato' },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · Two versions of the truth',
      missions: [
        {
          id: 'first-day',
          type: 'main',
          title: 'First query',
          from: 'manager',
          intro: [
            'First day in Data & Insights. Amara wants to meet you; Kenji will give you access.',
          ],
          objectives: [
            talk(
              'amara',
              'manager',
              'data-amara',
              'Meet Amara, the head of data',
              'manager',
            ),
            talk(
              'kenji',
              'senior',
              'data-kenji',
              'Ask Kenji for access to the data',
              'desk',
            ),
          ],
          reward: { xp: 20, trust: { manager: 2 } },
          summary: () =>
            'Amara wants answers she can defend. Kenji wants queries he can read. Both, you sense, are tired of dashboards.',
        },
        {
          id: 'mismatch',
          type: 'main',
          title: 'Two numbers',
          from: 'manager',
          after: ['first-day'],
          intro: [
            'Sales says March was £412k. Finance says £398k. Both are sure, and both have a slide.',
          ],
          objectives: [
            talk(
              'leila',
              'backM',
              'data-leila',
              'Ask Leila how Finance counts a sale',
              'desk',
            ),
            talk(
              'dana',
              'coordinator',
              'data-dana',
              'Ask Dana how Sales books an order',
              'desk',
            ),
            answer('case', 'data-numbers-mismatch', 'Explain the difference (Cases)'),
          ],
          reward: { xp: 40, trust: { manager: 1 } },
          summary: () =>
            'Sales counts an order when it is signed; Finance when it is paid. Both were right. Now, for the first time, both are on the same slide.',
        },
        {
          id: 'arjun-pair',
          type: 'side',
          title: 'A second pair of eyes',
          from: 'analyst',
          after: ['first-day'],
          intro: [
            'Arjun has a query that takes forty minutes to run, and a meeting in fifty.',
          ],
          objectives: [
            talk(
              'arjun',
              'analyst',
              'data-arjun',
              'Help Arjun at the break room table',
              'breakroom',
            ),
          ],
          reward: { xp: 10, trust: { analyst: 3 } },
          summary: () =>
            'One missing index. Forty minutes became four seconds. Arjun has named a coffee mug after you.',
        },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter 2 · The board',
      missions: [
        {
          id: 'extra-analysis',
          type: 'main',
          title: 'By tomorrow',
          from: 'manager',
          after: ['mismatch'],
          intro: [
            'A director wants analysis by tomorrow showing that closing the Northgate office will save money. He has already told the board it will.',
          ],
          objectives: [
            talk(
              'kenji',
              'senior',
              'data-kenji-close',
              'Ask Kenji what the data actually says',
              'desk',
            ),
            answer('case', 'data-extra-analysis', 'Reply to the director (Cases)'),
            talk(
              'amara',
              'manager',
              'data-amara-close',
              'Take your analysis to Amara',
              'manager',
            ),
          ],
          reward: { xp: 45 },
          summary: (flags) =>
            flags.includes('data-honest')
              ? 'The analysis says what the data says: closing Northgate saves money for one year, then costs more. The director is not pleased.'
              : 'The analysis says what the director wanted. The chart is very clean.',
        },
        {
          id: 'board',
          type: 'main',
          title: 'The board meeting',
          from: 'manager',
          after: ['extra-analysis'],
          intro: [
            'The board meets on Friday. Amara wants the team at the stand-up, and you in her office after.',
          ],
          objectives: [
            standup('Be at the stand-up (9:15)'),
            talk(
              'amara',
              'manager',
              'data-amara-board',
              'See Amara after the stand-up',
              'manager',
            ),
          ],
          flags: ['story-complete'],
          reward: { xp: 70 },
          summary: (flags) =>
            flags.includes('data-honest')
              ? 'The end of “Signal and Noise”. The board kept Northgate open, on your numbers. The director has stopped emailing you. Amara has started inviting you to the meetings that matter.'
              : 'The end of “Signal and Noise”. Northgate closed. Six months later, the costs went up, exactly as the data said they would. Nobody asks who made the chart. You know.',
        },
      ],
    },
  ],
  scenes: {
    'data-amara': scene(
      'data-amara',
      'manager',
      () => [
        '*Amara has a single sheet of paper on her desk, with one chart on it.*',
        'Welcome, {name}. One chart, one message, and the honest version of it. If you cannot explain a number in a sentence, we do not show it.',
      ],
      [
        {
          id: 'ok',
          label: 'Say that sounds right to you',
          reply: ['Good. Kenji will set you up.'],
          trust: { manager: 2 },
        },
      ],
    ),
    'data-kenji': scene(
      'data-kenji',
      'senior',
      () => [
        '*Kenji is reading someone else’s query, and frowning.*',
        'Access, yes. Rule one: name your columns. Rule two: never trust a total you did not count yourself.',
      ],
      [
        {
          id: 'ok',
          label: 'Promise to name your columns',
          reply: ['*Almost a smile.* We will get on.'],
          trust: { senior: 3 },
        },
      ],
    ),
    'data-leila': scene(
      'data-leila',
      'backM',
      () => [
        '*Leila does not hesitate.*',
        'Finance counts it when the money arrives. Not a moment before. Ask Sales when they count it, and watch their face.',
      ],
      [
        {
          id: 'thanks',
          label: 'Thank Leila',
          reply: ['Any time. I love a mystery with a spreadsheet in it.'],
          trust: { backM: 2 },
        },
      ],
    ),
    'data-dana': scene(
      'data-dana',
      'coordinator',
      () => [
        '*Dana checks her log.*',
        'Sales books it the day it is signed. Sometimes the day it is promised. So, yes: before the money.',
      ],
      [
        {
          id: 'thanks',
          label: 'Thank Dana',
          reply: ['Glad someone is finally asking.'],
          trust: { coordinator: 2 },
        },
      ],
    ),
    'data-arjun': scene(
      'data-arjun',
      'analyst',
      () => [
        '*Arjun’s query is still running.*',
        'Forty minutes, every time. I have a meeting in fifty. Help?',
      ],
      [
        {
          id: 'index',
          label: 'Look at the query plan, and add the missing index',
          reply: ['*Four seconds.* Arjun stares. “That is witchcraft.”'],
          trust: { analyst: 3 },
        },
      ],
    ),
    'data-kenji-close': scene(
      'data-kenji-close',
      'senior',
      () => [
        '*Kenji runs the numbers while you watch.*',
        'Closing Northgate saves rent for a year. Then the travel, the lost clients and the hiring cost more than the rent. It is not close. He will not like it.',
      ],
      [
        {
          id: 'honest',
          label: 'Say you will show it exactly as it is',
          reply: ['Good. Show the uncertainty too. Do not overclaim, either way.'],
          flags: ['data-honest'],
          trust: { senior: 3 },
        },
        {
          id: 'year',
          label: 'Suggest showing only the first year',
          reply: [
            '*He takes his glasses off.* That is technically true and completely misleading. Your call.',
          ],
          flags: ['data-one-year'],
          trust: { senior: -2 },
        },
      ],
    ),
    'data-amara-close': scene(
      'data-amara-close',
      'manager',
      (flags) => [
        '*Amara reads the chart.*',
        flags.includes('data-honest')
          ? 'This says the opposite of what he promised the board. It is also right. Are you ready to defend it?'
          : 'One year only? That is the chart he asked for. Is it the chart that is true?',
      ],
      [
        {
          id: 'stand',
          label: 'Stand by it',
          reply: ['All right. My name goes next to yours.'],
          trust: { manager: 2 },
        },
        {
          id: 'redo',
          label: 'Redo it with the full picture',
          reply: ['Thank you. That is harder, and it is the job.'],
          flags: ['data-honest'],
          trust: { manager: 3 },
        },
      ],
    ),
    'data-amara-board': scene(
      'data-amara-board',
      'manager',
      (flags) => [
        '*Amara is back from the board.*',
        flags.includes('data-honest')
          ? 'They asked a lot of questions. Your chart answered all of them. Northgate stays open.'
          : 'They approved the closure. On our chart. I hope we are right.',
      ],
      [
        {
          id: 'reflect',
          label: 'Say what you learned',
          reply: ['Write it down. You will need it again.'],
          trust: { manager: 2 },
        },
      ],
    ),
  },
}
