/**
 * Finance & Administration: "Short Delivery". The player has just moved to
 * the city for a first job at Cobalt Ridge Consulting: a rented flat, savings
 * that will last about a month, and nobody here who knows them. In chapter 1
 * a supplier says they have not been paid. The truth is messier, and the
 * mistake belongs to someone the player likes. What the player does about it
 * comes back at month-end. Original characters and story.
 */
import type { Campaign } from '../types'

export const FINANCE_STORY: Campaign = {
  id: 'finance',
  careerId: 'office-admin-finance',
  title: 'Short Delivery',
  premise:
    'New city, new flat, a first job in finance at Cobalt Ridge Consulting. Your savings will last about a month. Nobody here knows you yet, and the first thing on your desk is somebody else’s mistake.',
  cast: {
    reception: 'Nina Patel',
    manager: 'Priya Raman',
    senior: 'Marcus Webb',
    facilities: 'Tom Becker',
    backM: 'Leila Haddad',
    admin: 'Ben Carter',
    'park:walter': 'Walter Brooks',
  },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · The new starter',
      missions: [
        {
          id: 'first-morning',
          type: 'main',
          title: 'First morning',
          from: 'reception',
          intro: [
            'Your first day at Cobalt Ridge Consulting. Nina at reception messaged last night: “Come to the front desk when you get in. Smart, not formal. And breathe!”',
          ],
          objectives: [
            {
              id: 'nina',
              kind: 'talk',
              person: 'reception',
              scene: 'nina-welcome',
              label: 'Check in with Nina at reception',
              where: 'reception',
            },
            {
              id: 'priya',
              kind: 'talk',
              person: 'manager',
              scene: 'priya-first',
              label: 'Meet Priya, your manager, in her office',
              where: 'manager',
            },
          ],
          reward: { xp: 20, trust: { reception: 2, manager: 2 } },
          summary: () =>
            'You made it in and met the two people you will see most. Priya expects questions; Nina expects you to remember her name. Both good signs.',
        },
        {
          id: 'faces-and-names',
          type: 'character',
          title: 'Faces and names',
          from: 'manager',
          after: ['first-morning'],
          intro: [
            'Priya: “Go and say hello to people. Not by email: actually walk over.”',
          ],
          objectives: [
            {
              id: 'marcus',
              kind: 'talk',
              person: 'senior',
              scene: 'marcus-first',
              label: 'Introduce yourself to Marcus, at his desk',
              where: 'desk',
            },
            {
              id: 'tom',
              kind: 'talk',
              person: 'facilities',
              scene: 'tom-first',
              label: 'Find Tom, who keeps the kitchen going',
              where: 'breakroom',
            },
            {
              id: 'leila',
              kind: 'talk',
              person: 'backM',
              scene: 'leila-first',
              label: 'Say hello to Leila in accounts',
              where: 'desk',
            },
          ],
          reward: { xp: 15 },
          summary: (flags) =>
            flags.includes('marcus-shadow')
              ? 'Three new names. Marcus agreed to let you shadow him on Thursday; Tom knows where everything is; Leila knows everything else.'
              : 'Three new names. Marcus is sharp and busy; Tom knows where everything is; Leila knows everything else.',
        },
        {
          id: 'missing-invoice',
          type: 'main',
          title: 'The missing invoice',
          from: 'manager',
          after: ['first-morning'],
          intro: [
            'Priya catches you on the way back to your desk. “Meadow Office Supplies are chasing us for £612. Marcus placed that order. Find out what happened, and sort it properly.”',
          ],
          objectives: [
            {
              id: 'ask-marcus',
              kind: 'talk',
              person: 'senior',
              scene: 'marcus-invoice',
              label: 'Ask Marcus about the Meadow order',
              where: 'desk',
            },
            {
              id: 'files',
              kind: 'talk',
              person: 'admin',
              scene: 'ben-files',
              label: 'Get the delivery note from Ben, at the filing cabinets',
              where: 'desk',
            },
            {
              id: 'answer',
              kind: 'case',
              case: 'fa-short-delivery',
              label: 'Answer Meadow’s credit controller (Cases, on your computer)',
              where: 'desk',
            },
            {
              id: 'report',
              kind: 'talk',
              person: 'manager',
              scene: 'priya-invoice',
              label: 'Tell Priya what happened',
              where: 'manager',
            },
          ],
          reward: { xp: 40, trust: { manager: 1 } },
          summary: (flags) =>
            flags.includes('covered-marcus')
              ? 'Meadow is sorted, and nobody asked how it went wrong. Marcus owes you one. You are not sure how you feel about that.'
              : flags.includes('process-fix')
                ? 'Meadow is sorted, and the order process has a new check in it, with your name and Marcus’s on it. Priya noticed.'
                : 'Meadow is sorted, and Priya knows exactly whose mistake it was. Marcus has gone quiet around you.',
        },
        {
          id: 'bakery',
          type: 'side',
          title: 'The bakery on the corner',
          from: 'park:walter',
          after: ['first-morning'],
          intro: [
            'Walter, a retired neighbour, sits on a bench in the park most evenings. Nina says he knows everyone on the street.',
          ],
          objectives: [
            {
              id: 'walter',
              kind: 'talk',
              person: 'park:walter',
              scene: 'walter-bakery',
              label: 'Find Walter in the park, after work',
              where: 'park',
            },
            {
              id: 'cafe',
              kind: 'state',
              state: 'at-cafe',
              label: 'Go and see the café on the corner',
              where: 'cafe',
            },
          ],
          flags: ['knows-walter'],
          reward: { xp: 10 },
          summary: (flags) =>
            flags.includes('bakery-offer')
              ? 'Walter’s granddaughter runs the bakery now, with shoeboxes of receipts. You said you would have a look. Somebody will remember that.'
              : 'You met Walter, and found the café. The city feels a little smaller.',
        },
        {
          id: 'month-end',
          type: 'main',
          title: 'Month-end',
          from: 'manager',
          after: ['missing-invoice'],
          intro: [
            'The last week of the month. Everyone is busy, and the stand-up at the whiteboard is where the week gets decided.',
          ],
          objectives: [
            {
              id: 'standup',
              kind: 'meeting',
              meeting: 'standup',
              label: 'Be at the stand-up (9:15, at the whiteboard)',
              where: 'desk',
            },
            {
              id: 'word',
              kind: 'talk',
              person: 'manager',
              scene: 'priya-month-end',
              label: 'Priya wants a word in her office',
              where: 'manager',
            },
          ],
          flags: ['chapter1-done'],
          reward: { xp: 50, money: 0 },
          summary: (flags) =>
            flags.includes('own-it') || flags.includes('process-fix')
              ? 'Priya gives you the supplier review: your first real project. Chapter 1 is complete.'
              : 'Priya says you are doing fine. Just fine. Chapter 1 is complete.',
        },
      ],
    },
  ],
  scenes: {
    'nina-welcome': {
      id: 'nina-welcome',
      person: 'reception',
      lines: () => [
        '*Nina looks up from the visitors’ book and breaks into a grin.*',
        'You must be {name}! Welcome to Cobalt Ridge. Badge, lanyard, and a map I drew myself, which is better than the official one.',
        'Priya is in her office at the back. She is lovely, but she will ask what you think, so have an answer ready.',
      ],
      choices: [
        {
          id: 'ask',
          label: 'Ask Nina what Priya is like to work for',
          reply: [
            'Fair. Busy. Remembers everything you say, so say useful things. Go on, she is expecting you.',
          ],
          trust: { reception: 2 },
        },
        {
          id: 'nervous',
          label: 'Admit you are nervous',
          reply: [
            'Everyone is, on day one. Marcus walked into the glass door on his. Do not tell him I told you.',
          ],
          trust: { reception: 3 },
        },
      ],
    },
    'priya-first': {
      id: 'priya-first',
      person: 'manager',
      lines: () => [
        '*Priya closes her laptop and nods at the chair.*',
        'Welcome, {name}. Here is how this works: I give you real work, you ask questions early, and nobody hides mistakes. Mistakes are fine. Surprises are not.',
        'Your first weeks are invoices, suppliers and the month-end. Marcus knows the systems. Anything you want to ask?',
      ],
      choices: [
        {
          id: 'good-month',
          label: 'Ask what a good first month looks like',
          reply: [
            'Good question. Get the basics right, and tell me when something looks wrong, even when it is not your job. Especially then.',
          ],
          trust: { manager: 2 },
        },
        {
          id: 'ready',
          label: 'Say you are ready to start',
          reply: ['Good. Meet people first, though. Actually walk over.'],
        },
      ],
    },
    'marcus-first': {
      id: 'marcus-first',
      person: 'senior',
      lines: () => [
        '*Marcus finishes his sentence on the keyboard before turning round.*',
        'The new starter. Priya says you ask good questions. I am Marcus. Five years here, which makes me part of the furniture.',
      ],
      choices: [
        {
          id: 'shadow',
          label: 'Ask if you can shadow him for an afternoon',
          reply: ['Bold. Fine: Thursday. Bring a notebook, not your phone.'],
          flags: ['marcus-shadow'],
          trust: { senior: 3 },
        },
        {
          id: 'brief',
          label: 'Keep it short: he is clearly busy',
          reply: ['Appreciated. Shout if you get stuck.'],
          trust: { senior: 1 },
        },
      ],
    },
    'tom-first': {
      id: 'tom-first',
      person: 'facilities',
      lines: () => [
        '*Tom is elbow-deep in the coffee machine.*',
        'New face! Tom. Facilities, which means anything that beeps, leaks or jams. The printer hates everyone equally, so do not take it personally.',
      ],
      choices: [
        {
          id: 'help',
          label: 'Offer to pass him the spanner',
          reply: ['*He takes it.* A natural. You will go far.'],
          trust: { facilities: 2 },
        },
        {
          id: 'joke',
          label: 'Ask if the coffee is worth the trouble',
          reply: ['Honestly? No. But it is tradition.'],
          trust: { facilities: 1 },
        },
      ],
    },
    'leila-first': {
      id: 'leila-first',
      person: 'backM',
      lines: () => [
        '*Leila spins round on her chair before you have said a word.*',
        'You are {name}! I have heard all about you. Well, your name. And that you take your coffee black, which I made up. Do you?',
      ],
      choices: [
        {
          id: 'laugh',
          label: 'Laugh and ask what else she has made up',
          reply: ['Loads. Ask me anything about anyone. I am usually right, eventually.'],
          trust: { backM: 2 },
          flags: ['leila-friend'],
        },
        {
          id: 'polite',
          label: 'Smile politely and say hello',
          reply: ['Hello! Right, I will let you settle in.'],
          trust: { backM: 1 },
        },
      ],
    },
    'marcus-invoice': {
      id: 'marcus-invoice',
      person: 'senior',
      lines: () => [
        '*Marcus’s face changes when you say “Meadow”.*',
        'Ah. That one. They delivered short: two boxes of toner missing. I meant to raise it, then the quarter-end happened, and I… did not.',
        'Look, it is £612. Pay it, ask them for a credit next month, and nobody needs to make a thing of it. Please?',
      ],
      choices: [
        {
          id: 'cover',
          label: 'Agree to keep it quiet and pay in full',
          reply: ['*He breathes out.* You are a good one. I will not forget it.'],
          flags: ['covered-marcus'],
          trust: { senior: 4 },
        },
        {
          id: 'honest',
          label: 'Tell him you will have to tell Priya what happened',
          reply: ['*A long pause.* Right. Of course. Your call.'],
          flags: ['honest-invoice'],
          trust: { senior: -3 },
        },
        {
          id: 'fix',
          label: 'Suggest you tell Priya together, with a fix so it cannot happen again',
          reply: [
            '…That is annoyingly sensible. Fine. We tell her together, and we bring a fix.',
          ],
          flags: ['honest-invoice', 'process-fix'],
          trust: { senior: 1 },
        },
      ],
    },
    'ben-files': {
      id: 'ben-files',
      person: 'admin',
      lines: () => [
        '*Ben pulls a folder out of the cabinet without looking.*',
        'Meadow, March. Delivery note, signed by Tom. Two boxes short, written in pencil, as is tradition. Here.',
      ],
      choices: [
        {
          id: 'thank',
          label: 'Thank Ben',
          reply: ['Bring it back. People never bring it back.'],
          trust: { admin: 2 },
        },
        {
          id: 'ask',
          label: 'Ask why nobody chased it',
          reply: [
            'Because the note goes in the cabinet and the invoice goes to the computer, and they never meet. That is the problem, if you ask me. Nobody does.',
          ],
          trust: { admin: 1 },
          flags: ['knows-gap'],
        },
      ],
    },
    'priya-invoice': {
      id: 'priya-invoice',
      person: 'manager',
      lines: (flags) =>
        flags.includes('covered-marcus')
          ? [
              '*Priya reads your note.*',
              'Paid in full, a credit to follow. Fine. How did a short delivery get missed in the first place?',
            ]
          : flags.includes('process-fix')
            ? [
                '*Marcus is already with her when you get there.*',
                'You came together. That is either very good or very bad. Go on.',
              ]
            : [
                '*Priya reads your note, then looks up.*',
                'Marcus missed it, and you are the one telling me. Why?',
              ],
      choices: [
        {
          id: 'straight',
          label: 'Explain what happened, as it happened',
          reply: ['Thank you. That is exactly what I meant on your first day.'],
          trust: { manager: 3 },
          flags: ['told-priya'],
        },
        {
          id: 'vague',
          label: 'Keep it vague: these things happen',
          reply: [
            '*She looks at you a moment longer than is comfortable.* They do. Let us make sure they happen less.',
          ],
          flags: ['priya-doubts'],
          trust: { manager: -2 },
        },
      ],
    },
    'walter-bakery': {
      id: 'walter-bakery',
      person: 'park:walter',
      lines: () => [
        '*Walter pats the bench beside him.*',
        'You are the finance one, Nina says. My granddaughter has taken over the bakery on the corner. Wonderful bread. Terrible paperwork. Shoeboxes of receipts.',
      ],
      choices: [
        {
          id: 'offer',
          label: 'Offer to look at her books some time',
          reply: ['Would you? I will tell her. She will pretend not to need it.'],
          flags: ['bakery-offer'],
          trust: { 'park:walter': 3 },
        },
        {
          id: 'later',
          label: 'Say you are still finding your feet',
          reply: ['Of course. The offer is there whenever.'],
        },
      ],
    },
    'priya-month-end': {
      id: 'priya-month-end',
      person: 'manager',
      lines: (flags) => [
        '*Priya shuts the door behind you.*',
        flags.includes('covered-marcus')
          ? 'The auditors found Meadow’s credit note, dated after we paid in full. Somebody knew that delivery was short, {name}.'
          : flags.includes('process-fix')
            ? 'The supplier check you and Marcus put in caught two more short deliveries this week. That is real money.'
            : 'Month-end is closed. Cleanly, for once.',
        'Which brings me to next month.',
      ],
      choices: [
        {
          id: 'own',
          label: 'Own your part in how the month went',
          reply: ['Thank you. That is the job, honestly.'],
          flags: ['own-it'],
          trust: { manager: 2 },
        },
        {
          id: 'next',
          label: 'Ask what she needs from you next',
          reply: ['Fair. Keep the basics clean, and I will find you something bigger.'],
          trust: { manager: 1 },
        },
      ],
    },
  },
}
