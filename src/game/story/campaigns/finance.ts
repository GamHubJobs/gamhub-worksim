/**
 * Finance & Administration: "Short Delivery". The player has just moved to
 * the city for a first job at Cobalt Ridge Consulting: a rented flat, savings
 * that will last about a month, and nobody here who knows them. In chapter 1
 * a supplier says they have not been paid. The truth is messier, and the
 * mistake belongs to someone the player likes. What the player does about it
 * comes back at month-end. In chapter 2 the supplier review uncovers a
 * supplier paid for deliveries that never came; in chapter 3 the auditors
 * arrive, and what the player hid or told comes out. Three endings. Original
 * characters and story.
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
    coordinator: 'Dana Kowalski',
    'cafe:barista': 'Maya Lindqvist',
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
    {
      id: 'ch2',
      title: 'Chapter 2 · The supplier review',
      missions: [
        {
          id: 'supplier-review',
          type: 'main',
          title: 'The supplier review',
          from: 'manager',
          after: ['month-end'],
          intro: [
            'Priya: “Every supplier we pay, every contract, every price. Find what is wrong before the auditors do. Start with Leila: she knows who complains about whom.”',
          ],
          objectives: [
            {
              id: 'leila',
              kind: 'talk',
              person: 'backM',
              scene: 'leila-suppliers',
              label: 'Ask Leila which suppliers people complain about',
              where: 'desk',
            },
            {
              id: 'ben',
              kind: 'talk',
              person: 'admin',
              scene: 'ben-contracts',
              label: 'Ask Ben for the Brightline contract',
              where: 'desk',
            },
            {
              id: 'dana',
              kind: 'talk',
              person: 'coordinator',
              scene: 'dana-brightline',
              label: 'Ask Dana, who books the deliveries, about Brightline',
              where: 'desk',
            },
            {
              id: 'priya',
              kind: 'talk',
              person: 'manager',
              scene: 'priya-review',
              label: 'Take what you found to Priya',
              where: 'manager',
            },
          ],
          reward: { xp: 50, trust: { manager: 2 } },
          summary: (flags) =>
            flags.includes('brightline-named')
              ? 'You found it: Brightline has been charging for deliveries Dana never booked, and a director signed the contract. Priya has taken it upstairs, with your name on the report.'
              : 'You found Brightline’s phantom deliveries, and Priya has them now. Whose name goes on the report is still open.',
        },
        {
          id: 'taxi-claim',
          type: 'workplace',
          title: 'A taxi to Northgate',
          from: 'manager',
          after: ['month-end'],
          intro: [
            'A consultant’s taxi claim was rejected and he is not happy. Priya: “Rules are rules, but find out whether ours are any good.”',
          ],
          objectives: [
            {
              id: 'case',
              kind: 'case',
              case: 'fa-expense-query',
              label: 'Answer Owen’s query about his taxi claim (Cases)',
              where: 'desk',
            },
          ],
          reward: { xp: 25 },
          summary: () =>
            'Owen has his answer. Whether he likes it depends on what you wrote, which is rather the point.',
        },
        {
          id: 'bakery-books',
          type: 'side',
          title: 'Shoeboxes of receipts',
          from: 'park:walter',
          after: ['bakery'],
          needs: ['bakery-offer'],
          intro: [
            'Walter’s granddaughter turns out to be Maya, who runs the café on the corner. She has brought the shoeboxes.',
          ],
          objectives: [
            {
              id: 'maya',
              kind: 'talk',
              person: 'cafe:barista',
              scene: 'maya-books',
              label: 'Help Maya with her books, at the café (evenings)',
              where: 'cafe',
            },
          ],
          flags: ['helped-maya'],
          reward: { xp: 20, trust: { 'cafe:barista': 5, 'park:walter': 3 } },
          summary: (flags) =>
            flags.includes('maya-system')
              ? 'Maya has a simple system now: a box for each month and a spreadsheet she actually likes. She says she owes you a lifetime of banana bread.'
              : 'You sorted Maya’s year. Next year, she says, she will do it herself. Probably.',
        },
        {
          id: 'marcus-thursday',
          type: 'character',
          title: 'Thursday with Marcus',
          from: 'senior',
          after: ['month-end'],
          needs: ['marcus-shadow'],
          intro: ['Marcus keeps his word: you can shadow him for an afternoon.'],
          objectives: [
            {
              id: 'marcus',
              kind: 'talk',
              person: 'senior',
              scene: 'marcus-secret',
              label: 'Spend the afternoon with Marcus',
              where: 'desk',
            },
          ],
          reward: { xp: 20, trust: { senior: 3 } },
          summary: (flags) =>
            flags.includes('marcus-tells')
              ? 'Marcus is going to tell Priya he has been offered another job. You did not push; you just asked the right question.'
              : 'You learned more in an afternoon than in a month, and Marcus told you something nobody else knows.',
        },
      ],
    },
    {
      id: 'ch3',
      title: 'Chapter 3 · Audit week',
      missions: [
        {
          id: 'audit-week',
          type: 'main',
          title: 'Audit week',
          from: 'manager',
          after: ['supplier-review'],
          intro: [
            'The auditors are in the meeting room, with questions about Meadow, Brightline and everything in between.',
          ],
          objectives: [
            {
              id: 'standup',
              kind: 'meeting',
              meeting: 'standup',
              label: 'Be at the stand-up: the audit is the only topic',
              where: 'desk',
            },
            {
              id: 'nina',
              kind: 'talk',
              person: 'reception',
              scene: 'nina-auditors',
              label: 'Nina signed the auditors in: find out what they asked for',
              where: 'reception',
            },
            {
              id: 'marcus',
              kind: 'talk',
              person: 'senior',
              scene: 'marcus-audit',
              label: 'Talk to Marcus before the auditors do',
              where: 'desk',
            },
            {
              id: 'priya',
              kind: 'talk',
              person: 'manager',
              scene: 'priya-audit',
              label: 'See Priya in her office before the auditors’ report',
              where: 'manager',
            },
          ],
          reward: { xp: 60, trust: { manager: 2 } },
          summary: (flags) =>
            flags.includes('audit-truth')
              ? 'The audit closes with two findings, both already fixed, both with your name on the fix. The director who signed Brightline is “taking some time”.'
              : 'The audit closes. The finding about Meadow has no name on it. Yet.',
        },
        {
          id: 'next-step',
          type: 'main',
          title: 'What comes next',
          from: 'manager',
          after: ['audit-week'],
          intro: [
            'Priya asks you to come and see her at the end of the day. She has shut the blinds.',
          ],
          objectives: [
            {
              id: 'priya',
              kind: 'talk',
              person: 'manager',
              scene: 'priya-offer',
              label: 'See Priya in her office',
              where: 'manager',
            },
          ],
          flags: ['story-complete'],
          reward: { xp: 80 },
          summary: (flags) =>
            flags.includes('ending-lead')
              ? 'The end of “Short Delivery”. You lead supplier controls now: a small team, a real budget, and a door Nina knocks on with gossip. Not bad for someone who arrived with a month of savings.'
              : flags.includes('ending-marcus')
                ? 'The end of “Short Delivery”. Marcus stays and leads supplier controls; you work with him as equals, and he never forgets who put his name forward. The next opening is yours.'
                : 'The end of “Short Delivery”. You turned the role down to keep your evenings for Maya’s café and the shops on the corner, as their part-time bookkeeper. Priya says the door stays open. You believe her.',
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
    'leila-suppliers': {
      id: 'leila-suppliers',
      person: 'backM',
      lines: () => [
        '*Leila lowers her voice, which for Leila is still quite loud.*',
        'Complaints? Meadow are fine now, thanks to you. Brightline, though. Nobody has ever seen a Brightline van. Dana books every delivery, and she has never booked one either.',
      ],
      choices: [
        {
          id: 'thanks',
          label: 'Thank her, and ask her to keep it to herself for now',
          reply: ['My lips are sealed. Mostly. For you, entirely.'],
          trust: { backM: 2 },
        },
        {
          id: 'more',
          label: 'Ask who chose Brightline',
          reply: [
            'A director, apparently. Before your time. Before mine, nearly. Ask Ben for the contract.',
          ],
          flags: ['knows-director'],
          trust: { backM: 1 },
        },
      ],
    },
    'ben-contracts': {
      id: 'ben-contracts',
      person: 'admin',
      lines: (flags) => [
        '*Ben pulls a thin folder out of the cabinet and holds it a moment before handing it over.*',
        flags.includes('knows-gap')
          ? 'Remember what I said about the note and the invoice never meeting? This is the same problem, with a bigger number.'
          : 'Brightline. Signed by a director, three years ago. No delivery notes. Not one.',
      ],
      choices: [
        {
          id: 'copy',
          label: 'Ask for a copy, and sign it out properly',
          reply: ['*He looks almost moved.* Someone who signs things out. Here.'],
          trust: { admin: 3 },
        },
        {
          id: 'take',
          label: 'Just take the folder',
          reply: ['Bring it back.'],
        },
      ],
    },
    'dana-brightline': {
      id: 'dana-brightline',
      person: 'coordinator',
      lines: () => [
        '*Dana scrolls through the delivery log on her tablet, then scrolls again.*',
        'Brightline. Forty deliveries invoiced this year. I booked none of them, and nothing came in that I did not book. I would know. I know every box.',
      ],
      choices: [
        {
          id: 'record',
          label: 'Ask her to export the log for the report',
          reply: ['Already done. Dated, timestamped, and my name on it.'],
          trust: { coordinator: 3 },
          flags: ['have-log'],
        },
        {
          id: 'quiet',
          label: 'Ask her not to mention it to anyone yet',
          reply: ['Who would I tell? The boxes?'],
          trust: { coordinator: 1 },
        },
      ],
    },
    'priya-review': {
      id: 'priya-review',
      person: 'manager',
      lines: (flags) => [
        '*Priya reads it twice.*',
        flags.includes('have-log')
          ? 'Forty invoices, no deliveries, and Dana’s log to prove it. This is fraud, {name}, or something very close to it. And a director signed it.'
          : 'Forty invoices and no delivery notes. We need more than that, but it is enough to start. And a director signed it.',
        'This goes upstairs. Whose name goes on the report?',
      ],
      choices: [
        {
          id: 'mine',
          label: 'Yours and mine: you found it together',
          reply: [
            'Brave, given who signed it. Fine. Our names, and Dana’s log. Thank you.',
          ],
          flags: ['brightline-named'],
          trust: { manager: 3 },
        },
        {
          id: 'team',
          label: 'Credit the team: Leila, Ben and Dana did the work',
          reply: ['Generous, and true. I will make sure they know.'],
          flags: ['brightline-named', 'credited-team'],
          trust: { manager: 2, backM: 2, admin: 2, coordinator: 2 },
        },
        {
          id: 'none',
          label: 'Leave your name off: it is safer',
          reply: [
            '*She nods slowly.* Safer. I understand. I will hold it until the audit.',
          ],
          flags: ['stayed-anonymous'],
        },
      ],
    },
    'maya-books': {
      id: 'maya-books',
      person: 'cafe:barista',
      lines: () => [
        '*Maya puts three shoeboxes on the counter, and a slice of banana bread on top.*',
        'Grandad says you are good with this. I make bread. This is… not bread. Where do I even start?',
      ],
      choices: [
        {
          id: 'system',
          label: 'Set her up with a simple system she can keep going',
          reply: [
            'A box a month and one spreadsheet. That I can do. You are a hero. A boring hero.',
          ],
          flags: ['maya-system'],
        },
        {
          id: 'do-it',
          label: 'Just sort the whole year for her',
          reply: [
            '*Two hours later.* You did a whole year. I will name a cake after you.',
          ],
        },
      ],
    },
    'marcus-secret': {
      id: 'marcus-secret',
      person: 'senior',
      lines: (flags) => [
        '*Marcus walks you through the month-end close, step by step, then stops.*',
        flags.includes('covered-marcus')
          ? 'You kept quiet about Meadow for me. So I will tell you something: I have been offered a job somewhere else. More money. I have not told Priya.'
          : 'Can I tell you something? I have been offered a job somewhere else. More money. I have not told Priya.',
      ],
      choices: [
        {
          id: 'tell',
          label: 'Ask what would make him want to stay',
          reply: [
            '…Leading something. Being trusted again. Maybe I should just say that to Priya.',
          ],
          flags: ['marcus-tells'],
          trust: { senior: 2 },
        },
        {
          id: 'keep',
          label: 'Promise to keep it to yourself',
          reply: ['Thanks. Really.'],
          flags: ['marcus-secret'],
          trust: { senior: 3 },
        },
      ],
    },
    'nina-auditors': {
      id: 'nina-auditors',
      person: 'reception',
      lines: (flags) => [
        '*Nina waits until the meeting room door closes.*',
        flags.includes('covered-marcus')
          ? 'They asked for Meadow first. Specifically the credit note. And then for Brightline. I just sign people in, but I can read a visitors’ book upside down.'
          : 'They asked for Brightline, all of it. They seemed happy someone had already done the work. Was that you?',
      ],
      choices: [
        {
          id: 'thanks',
          label: 'Thank her: that helps',
          reply: ['Go on. Good luck. I will save you a biscuit.'],
          trust: { reception: 2 },
        },
      ],
    },
    'marcus-audit': {
      id: 'marcus-audit',
      person: 'senior',
      lines: (flags) =>
        flags.includes('covered-marcus')
          ? [
              '*Marcus is pale.*',
              'They are asking about Meadow. If they ask you, what are you going to say?',
            ]
          : [
              '*Marcus looks calmer than he has all month.*',
              'They asked about Meadow. I told them the truth, and what we fixed. It went fine. What about you?',
            ],
      choices: [
        {
          id: 'truth',
          label: 'Say you will tell the auditors exactly what happened',
          reply: ['*He closes his eyes, then nods.* Right. Me too, then. Together.'],
          flags: ['audit-truth'],
          trust: { senior: 1 },
        },
        {
          id: 'protect',
          label: 'Say you will not mention his part unless asked directly',
          reply: ['*He breathes out.* Thank you. I mean it.'],
          flags: ['audit-protect'],
          trust: { senior: 3 },
        },
      ],
    },
    'priya-audit': {
      id: 'priya-audit',
      person: 'manager',
      lines: (flags) => [
        '*Priya has the draft report open.*',
        flags.includes('stayed-anonymous')
          ? 'Brightline is in the report, with no name on it, as you wanted. The auditors are asking who found it.'
          : 'Brightline is in the report, and so are you. The auditors were impressed, which they never are.',
        flags.includes('audit-protect')
          ? 'They also asked me whether anyone knew Meadow was short before we paid. Did you, {name}?'
          : 'One last thing: they want to know how we stop this happening again.',
      ],
      choices: [
        {
          id: 'honest',
          label: 'Tell her everything, including your part',
          reply: [
            'Thank you. That is harder than finding fraud, and it matters more. We fix it, and we move on.',
          ],
          flags: ['audit-truth'],
          trust: { manager: 3 },
        },
        {
          id: 'plan',
          label: 'Give her your plan for supplier controls',
          reply: [
            'Delivery notes matched to invoices, every one, every month. Simple. I want you to run it.',
          ],
          flags: ['controls-plan'],
          trust: { manager: 2 },
        },
      ],
    },
    'priya-offer': {
      id: 'priya-offer',
      person: 'manager',
      lines: (flags) => [
        '*Priya leans back in her chair.*',
        'There is a new role: supplier controls lead. It is yours if you want it.',
        flags.includes('marcus-tells')
          ? 'Marcus came to see me. He wants it too, and he told me why. I would not mind either of you.'
          : 'Marcus would want it, if he were staying. I am not sure he is.',
        flags.includes('helped-maya')
          ? 'And I hear the café on the corner has its books in order. Word gets around.'
          : 'Take a day if you like.',
      ],
      choices: [
        {
          id: 'lead',
          label: 'Take the role',
          reply: ['Good. Monday, then. Bring a notebook.'],
          flags: ['ending-lead'],
          trust: { manager: 2 },
        },
        {
          id: 'marcus',
          label: 'Put Marcus forward, and offer to work alongside him',
          reply: [
            'That is a generous thing to do. He will not forget it, and neither will I.',
          ],
          flags: ['ending-marcus'],
          trust: { manager: 1, senior: 5 },
        },
        {
          id: 'own-way',
          label: 'Turn it down: you want to help small businesses like Maya’s',
          reply: [
            'I did not see that coming. I should have. The door stays open, {name}.',
          ],
          flags: ['ending-own-way'],
        },
      ],
    },
  },
}
