/**
 * IT Help Desk: "Ticket Zero". A first job on the service desk. A ticket
 * that nobody has fixed in three weeks; then a department head who wants admin
 * rights, now, and does not take no well. The player's choice about that comes
 * back on the day of the phishing email. Original story.
 */
import type { Campaign } from '../types'
import { answer, scene, SHARED_CAST, standup, talk } from './kit'

export const IT_STORY: Campaign = {
  id: 'it-support',
  careerId: 'it-support',
  title: 'Ticket Zero',
  premise:
    'Your first job on the service desk. Everyone’s computer is your problem now, and every problem is urgent to somebody.',
  cast: { ...SHARED_CAST, manager: 'Ravi Menon', senior: 'Jess Taylor' },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · Have you tried turning it off and on again',
      missions: [
        {
          id: 'first-day',
          type: 'main',
          title: 'First login',
          from: 'manager',
          intro: [
            'Day one on the service desk. Ravi wants to see you; Jess will show you the queue.',
          ],
          objectives: [
            talk(
              'ravi',
              'manager',
              'it-ravi',
              'Meet Ravi, the service desk manager',
              'manager',
            ),
            talk(
              'jess',
              'senior',
              'it-jess',
              'Ask Jess to show you the ticket queue',
              'desk',
            ),
          ],
          reward: { xp: 20, trust: { manager: 2 } },
          summary: () =>
            'Ravi believes in writing everything down. Jess believes in fixing it before anyone has to write anything down. You will need both.',
        },
        {
          id: 'ticket-zero',
          type: 'main',
          title: 'Ticket zero',
          from: 'senior',
          after: ['first-day'],
          intro: [
            'One ticket has been open for three weeks. The person who raised it is about to escalate, loudly.',
          ],
          objectives: [
            talk(
              'tom',
              'facilities',
              'it-tom-printer',
              'Ask Tom what is wrong with the printer, really',
              'breakroom',
            ),
            answer(
              'case',
              'it-ticket-chaser',
              'Reply to the colleague chasing their ticket (Cases)',
            ),
            talk('jess', 'senior', 'it-jess-closed', 'Tell Jess it is fixed', 'desk'),
          ],
          reward: { xp: 40 },
          summary: (flags) =>
            flags.includes('it-root-cause')
              ? 'Ticket zero is closed, properly: the print server’s certificate had expired. Jess says nobody had looked past “restart it”. You did.'
              : 'Ticket zero is closed. It will probably be back, but today, it is closed.',
        },
        {
          id: 'arjun-laptop',
          type: 'side',
          title: 'Arjun’s laptop',
          from: 'analyst',
          after: ['first-day'],
          intro: [
            'Arjun’s laptop makes a noise like a small aeroplane, and he has a presentation in an hour.',
          ],
          objectives: [
            talk(
              'arjun',
              'analyst',
              'it-arjun',
              'Help Arjun at the break room table',
              'breakroom',
            ),
          ],
          reward: { xp: 10, trust: { analyst: 3 } },
          summary: () =>
            'Fan full of biscuit crumbs. Presentation saved. Arjun has told everyone.',
        },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter 2 · Admin rights',
      missions: [
        {
          id: 'admin-rights',
          type: 'main',
          title: 'Admin rights',
          from: 'manager',
          after: ['ticket-zero'],
          intro: [
            'Owen, a department head’s right hand, wants full admin rights on his laptop, today, to install “a tool”. His boss has already emailed Ravi.',
          ],
          objectives: [
            talk(
              'owen',
              'backR',
              'it-owen-rights',
              'Ask Owen what he actually needs',
              'desk',
            ),
            answer(
              'case',
              'it-admin-rights',
              'Reply to the request for admin rights (Cases)',
            ),
            talk(
              'ravi',
              'manager',
              'it-ravi-rights',
              'Tell Ravi what you decided',
              'manager',
            ),
          ],
          reward: { xp: 45 },
          summary: (flags) =>
            flags.includes('it-granted')
              ? 'Owen has full admin rights. He is delighted. Jess is not.'
              : flags.includes('it-limited')
                ? 'Owen has the one tool he needed, installed by you, and nothing more. He grumbled, then said thank you.'
                : 'No admin rights. Owen has complained to his boss, who has complained to Ravi, who has said you were right.',
        },
        {
          id: 'phish',
          type: 'main',
          title: 'The phishing email',
          from: 'manager',
          after: ['admin-rights'],
          intro: [
            'Monday morning. A very convincing email has gone to the whole company: “Your password expires today”.',
          ],
          objectives: [
            standup('Be at the stand-up: there is only one topic'),
            talk(
              'dana',
              'coordinator',
              'it-dana-phish',
              'Dana clicked it. Find out what happened',
              'desk',
            ),
            talk('ravi', 'manager', 'it-ravi-phish', 'Report to Ravi', 'manager'),
          ],
          flags: ['story-complete'],
          reward: { xp: 70 },
          summary: (flags) =>
            flags.includes('it-granted')
              ? 'The end of “Ticket Zero”. The malware got in through Owen’s admin rights, and it took the team two days to clean up. Ravi does not blame you, out loud. You will never grant admin rights for convenience again.'
              : 'The end of “Ticket Zero”. The email was caught, the one password that was entered was reset within minutes, and nothing got in: no one had more rights than they needed. Ravi puts your name forward for the security project.',
        },
      ],
    },
  ],
  scenes: {
    'it-ravi': scene(
      'it-ravi',
      'manager',
      () => [
        '*Ravi’s desk has three monitors and one plant, which is fake.*',
        'Welcome, {name}. One rule: if it is not in a ticket, it did not happen. People will stop you in corridors. Smile, and say “log a ticket”.',
      ],
      [
        {
          id: 'ok',
          label: 'Promise to log everything',
          reply: ['Good. You will thank me in a month.'],
          trust: { manager: 2 },
        },
        {
          id: 'ask',
          label: 'Ask what the worst thing that could happen is',
          reply: ['Somebody clicks something. It is always somebody clicking something.'],
          trust: { manager: 2 },
          flags: ['it-warned'],
        },
      ],
    ),
    'it-jess': scene(
      'it-jess',
      'senior',
      () => [
        '*Jess has the queue on a big screen and a stress ball in each hand.*',
        'Forty-one open tickets. Thirty are passwords. Ten are printers. One is ticket zero, and we do not talk about ticket zero.',
      ],
      [
        {
          id: 'zero',
          label: 'Ask about ticket zero',
          reply: ['…Fine. Tom’s printer. Three weeks. Restarted nine times. Good luck.'],
          trust: { senior: 2 },
        },
        {
          id: 'passwords',
          label: 'Offer to take the password resets',
          reply: ['A hero. A small, password-shaped hero.'],
          trust: { senior: 3 },
        },
      ],
    ),
    'it-tom-printer': scene(
      'it-tom-printer',
      'facilities',
      () => [
        '*Tom pats the printer like a sick horse.*',
        'It prints for an hour after a restart, then nothing. Everyone restarts it. I have stopped telling them it does not help.',
      ],
      [
        {
          id: 'logs',
          label: 'Ask to see the print server’s error log',
          reply: [
            '*You find it in a minute: the security certificate expired three weeks ago.* Tom stares. “That is it? That is the whole thing?”',
          ],
          flags: ['it-root-cause'],
          trust: { facilities: 4 },
        },
        {
          id: 'restart',
          label: 'Restart it again',
          reply: ['*It prints. For now.* Tom sighs. “See you in an hour.”'],
        },
      ],
    ),
    'it-jess-closed': scene(
      'it-jess-closed',
      'senior',
      (flags) =>
        flags.includes('it-root-cause')
          ? [
              '*Jess reads your ticket notes twice.*',
              'An expired certificate. Three weeks. Nine restarts. I want to be annoyed, and I am mostly impressed.',
            ]
          : [
              '*Jess glances over.*',
              'Restarted? It will be back. They always come back.',
            ],
      [
        {
          id: 'ok',
          label: 'Smile',
          reply: ['Coffee is on me. Do not tell Ravi I said that.'],
          trust: { senior: 2 },
        },
      ],
    ),
    'it-arjun': scene(
      'it-arjun',
      'analyst',
      () => [
        '*Arjun’s laptop is very hot and very loud.*',
        'It sounds like it is about to take off. My presentation is on it. Is it dying? Please say it is not dying.',
      ],
      [
        {
          id: 'clean',
          label: 'Clean the fan, and back up his files while it cools',
          reply: [
            '*Crumbs. So many crumbs.* It is quiet. It is alive. You are my favourite person.',
          ],
          trust: { analyst: 3 },
        },
      ],
    ),
    'it-owen-rights': scene(
      'it-owen-rights',
      'backR',
      () => [
        '*Owen is polite, and in a hurry.*',
        'I need admin rights. I have a tool for the forecasts, and I cannot wait a week for a ticket every time I want to update it. My boss has said it is fine.',
      ],
      [
        {
          id: 'grant',
          label: 'Agree: give him full admin rights',
          reply: ['Brilliant. Thank you. Finally someone who gets it.'],
          flags: ['it-granted'],
          trust: { backR: 3, senior: -3 },
        },
        {
          id: 'limited',
          label: 'Offer to install the tool for him, and keep his rights as they are',
          reply: ['…Fine. Today, though?', '*Today.*'],
          flags: ['it-limited'],
          trust: { backR: 1, senior: 2 },
        },
        {
          id: 'no',
          label: 'Refuse, and explain why',
          reply: ['*He is not pleased.* My boss will hear about this.'],
          flags: ['it-refused'],
          trust: { backR: -2, senior: 2 },
        },
      ],
    ),
    'it-ravi-rights': scene(
      'it-ravi-rights',
      'manager',
      (flags) => [
        '*Ravi has the department head’s email open.*',
        flags.includes('it-granted')
          ? 'You gave him full admin. Did you write down why?'
          : 'You did not give him full admin. His boss is not happy. Talk me through it.',
      ],
      [
        {
          id: 'explain',
          label: 'Explain your reasons, plainly',
          reply: ['Good. That is what tickets are for. I will back you.'],
          trust: { manager: 3 },
        },
      ],
    ),
    'it-dana-phish': scene(
      'it-dana-phish',
      'coordinator',
      () => [
        '*Dana is white.*',
        'It looked exactly like ours. I typed my password in, and then I saw the address. I am so sorry. I know every box in this building and I fell for that.',
      ],
      [
        {
          id: 'kind',
          label: 'Tell her it happens to everyone, and reset her password now',
          reply: ['*She breathes again.* Thank you. Really.'],
          trust: { coordinator: 4 },
        },
        {
          id: 'blame',
          label: 'Tell her she should have looked more carefully',
          reply: ['*She nods, miserable.* I know.'],
          trust: { coordinator: -3 },
        },
      ],
    ),
    'it-ravi-phish': scene(
      'it-ravi-phish',
      'manager',
      (flags) => [
        '*Ravi has not slept.*',
        flags.includes('it-granted')
          ? 'It got in through Owen’s laptop. Full admin, so it could install itself. Two days to clean it up.'
          : 'One password typed in, reset in four minutes. Nothing installed anywhere: nobody had the rights to. That is what boring security looks like.',
      ],
      [
        {
          id: 'learn',
          label: 'Say what you will do differently, or the same, next time',
          reply: ['That is the job. Write it up; I want everyone to read it.'],
          trust: { manager: 2 },
        },
      ],
    ),
  },
}
