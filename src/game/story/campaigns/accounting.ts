/**
 * Accounting: "The Halden Account". A first job in the accounts team. The
 * firm's oldest client, a family chain of bakeries, disputes its statement;
 * then, in VAT season, the player finds expenses coded so that tax is
 * reclaimed on things it should not be, signed off by someone senior. What
 * the player does with that follows them to the year-end. Original story.
 */
import type { Campaign } from '../types'
import { answer, scene, SHARED_CAST, standup, talk } from './kit'

export const ACCOUNTING_STORY: Campaign = {
  id: 'accounting',
  careerId: 'accounting',
  title: 'The Halden Account',
  premise:
    'Your first job in an accounts team. The firm’s oldest client says their statement is wrong, and they have been a client for thirty years. Numbers do not lie, people say. People do.',
  cast: { ...SHARED_CAST, manager: 'Daniel Okoro', senior: 'Helen Park' },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · Opening balances',
      missions: [
        {
          id: 'first-day',
          type: 'main',
          title: 'Opening balances',
          from: 'manager',
          intro: [
            'Your first day in Accounts. Daniel wants to see you once Nina has signed you in.',
          ],
          objectives: [
            talk(
              'nina',
              'reception',
              'acc-nina',
              'Sign in with Nina at reception',
              'reception',
            ),
            talk(
              'daniel',
              'manager',
              'acc-daniel',
              'Meet Daniel, the accounting manager',
              'manager',
            ),
          ],
          reward: { xp: 20, trust: { manager: 2 } },
          summary: () =>
            'Daniel runs a tidy team: every number has a source, every source has a folder. You like him already, and you are slightly scared of the folders.',
        },
        {
          id: 'halden-dispute',
          type: 'main',
          title: 'The Halden dispute',
          from: 'manager',
          after: ['first-day'],
          intro: [
            'Halden’s Bakeries say they were charged twice for March. They have been a client for thirty years, and they are not happy.',
          ],
          objectives: [
            talk(
              'helen',
              'senior',
              'acc-helen-halden',
              'Ask Helen how Halden’s is usually handled',
              'desk',
            ),
            talk(
              'owen',
              'backR',
              'acc-owen-ledger',
              'Ask Owen for the ledger history',
              'desk',
            ),
            answer(
              'case',
              'acc-statement-dispute',
              'Reply to Halden’s about the statement (Cases)',
            ),
            talk(
              'report',
              'manager',
              'acc-daniel-halden',
              'Tell Daniel what you found',
              'manager',
            ),
          ],
          reward: { xp: 40, trust: { manager: 1 } },
          summary: (flags) =>
            flags.includes('acc-wrote-off')
              ? 'Halden’s are happy: the difference was written off, quietly. Helen says that is how it has always been done. You have a feeling that is the problem.'
              : 'You found it: one payment posted twice by hand, two years ago, and never caught. Halden’s were right, and now they know someone checked.',
        },
        {
          id: 'leila-lunch',
          type: 'side',
          title: 'Lunch with Leila',
          from: 'backM',
          after: ['first-day'],
          intro: [
            'Leila has decided you are her new lunch friend. Resistance is futile.',
          ],
          objectives: [
            talk(
              'leila',
              'backM',
              'acc-leila-lunch',
              'Have lunch with Leila (the break room)',
              'breakroom',
            ),
          ],
          flags: ['acc-leila-friend'],
          reward: { xp: 10, trust: { backM: 3 } },
          summary: () =>
            'You now know who takes milk, who has a feud with the printer, and that the director’s expenses “go through Helen”. That last one sticks in your head.',
        },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter 2 · VAT season',
      missions: [
        {
          id: 'vat-quarter',
          type: 'main',
          title: 'The VAT quarter',
          from: 'manager',
          after: ['halden-dispute'],
          intro: [
            'The quarterly VAT return is due, and a client wants their figures today. While pulling them together, you notice something odd in the firm’s own expenses.',
          ],
          objectives: [
            answer(
              'case',
              'acc-vat-request',
              'Send the client their VAT figures (Cases)',
            ),
            talk(
              'leila',
              'backM',
              'acc-leila-vat',
              'Ask Leila about the director’s expense codes',
              'desk',
            ),
            talk(
              'helen',
              'senior',
              'acc-helen-vat',
              'Raise it with Helen, who signed them off',
              'desk',
            ),
          ],
          reward: { xp: 45 },
          summary: (flags) =>
            flags.includes('acc-reported')
              ? 'You put it in writing to Daniel: £4,180 of VAT reclaimed on things it should not have been. Helen will not look at you. You did the right thing, and it does not feel good yet.'
              : flags.includes('acc-helen-fixes')
                ? 'Helen says she will correct it herself, before anyone notices. She sounded relieved. You hope she means it.'
                : 'You said nothing. The return went in. The codes are still there.',
        },
        {
          id: 'year-end',
          type: 'main',
          title: 'Year-end',
          from: 'manager',
          after: ['vat-quarter'],
          intro: [
            'Year-end. The external accountants arrive on Monday, and Daniel wants everyone at the stand-up.',
          ],
          objectives: [
            standup('Be at the stand-up (9:15)'),
            talk(
              'daniel',
              'manager',
              'acc-daniel-year-end',
              'Daniel wants to see you',
              'manager',
            ),
          ],
          flags: ['story-complete'],
          reward: { xp: 70 },
          summary: (flags) =>
            flags.includes('acc-reported') || flags.includes('acc-checked-helen')
              ? 'The end of “The Halden Account”. The VAT was corrected before the year-end; the external accountants found nothing to worry about. Daniel asks you to run the next quarter’s return. Helen, eventually, says thank you.'
              : flags.includes('acc-helen-fixes')
                ? 'The end of “The Halden Account”. Helen kept her word. Nobody else ever knows. You carry on, and you check every code twice, always.'
                : 'The end of “The Halden Account”. The external accountants found the codes. Daniel asks who knew. You have to decide, in that room, what kind of accountant you are going to be.',
        },
      ],
    },
  ],
  scenes: {
    'acc-nina': scene(
      'acc-nina',
      'reception',
      () => [
        '*Nina hands you a lanyard with your name spelled almost correctly.*',
        'Welcome to Accounts, {name}! Daniel is in his office. He will give you a tour of the filing system. All of it.',
      ],
      [
        {
          id: 'ok',
          label: 'Thank Nina',
          reply: ['Good luck. Bring snacks.'],
          trust: { reception: 2 },
        },
      ],
    ),
    'acc-daniel': scene(
      'acc-daniel',
      'manager',
      () => [
        '*Daniel straightens a folder that was already straight.*',
        'Welcome, {name}. One rule here: every number has a source. If you cannot show me where a number came from, it is not a number. It is a guess.',
      ],
      [
        {
          id: 'agree',
          label: 'Say that suits you',
          reply: ['Good. You will fit in.'],
          trust: { manager: 2 },
        },
        {
          id: 'ask',
          label: 'Ask what happens when the source is wrong',
          reply: ['*A pause.* Then you tell me. Immediately.'],
          trust: { manager: 3 },
          flags: ['acc-asked-source'],
        },
      ],
    ),
    'acc-helen-halden': scene(
      'acc-helen-halden',
      'senior',
      () => [
        '*Helen does not look up.*',
        'Halden’s? They complain every year. We write off the difference and send them a cake. It keeps them happy, and it is nine hundred pounds. Not worth anyone’s afternoon.',
      ],
      [
        {
          id: 'write-off',
          label: 'Agree to write it off',
          reply: ['Sensible. You will go far.'],
          flags: ['acc-wrote-off'],
          trust: { senior: 3 },
        },
        {
          id: 'check',
          label: 'Say you would like to check the ledger first',
          reply: ['*She sighs.* Suit yourself. Owen has the history.'],
          flags: ['acc-checked'],
          trust: { senior: -1 },
        },
      ],
    ),
    'acc-owen-ledger': scene(
      'acc-owen-ledger',
      'backR',
      (flags) => [
        '*Owen pulls the history up without a word, then points.*',
        flags.includes('acc-checked')
          ? 'There. March, two years ago: the same payment posted twice, by hand. Nobody has ever looked.'
          : 'If you are writing it off anyway, it is all here. Though… March, two years ago. That looks posted twice.',
      ],
      [
        {
          id: 'thanks',
          label: 'Thank Owen',
          reply: ['*A small nod.* Nobody usually asks.'],
          trust: { backR: 3 },
        },
      ],
    ),
    'acc-daniel-halden': scene(
      'acc-daniel-halden',
      'manager',
      (flags) =>
        flags.includes('acc-wrote-off')
          ? [
              '*Daniel reads it.*',
              'Written off. Helen’s usual. And the double posting Owen spotted? Where does that go, {name}?',
            ]
          : [
              '*Daniel reads it twice.*',
              'A double posting, two years old, never caught. Thirty years of Halden’s complaining, and they were right. How did you find it?',
            ],
      [
        {
          id: 'straight',
          label: 'Explain exactly what you did, and what Owen found',
          reply: ['Good. Credit where it is due. I will call Halden’s myself.'],
          trust: { manager: 3, backR: 2 },
        },
        {
          id: 'helen',
          label: 'Say Helen’s way is how it is usually done',
          reply: ['*His jaw tightens.* Usually. Not any more.'],
          trust: { manager: -1 },
        },
      ],
    ),
    'acc-leila-lunch': scene(
      'acc-leila-lunch',
      'backM',
      () => [
        '*Leila slides half a sandwich across the table.*',
        'So. Gossip. Daniel irons his ties. Tom is secretly brilliant. And the director’s expenses all go through Helen, and nobody else ever sees them. Don’t ask me why. I only know everything.',
      ],
      [
        {
          id: 'laugh',
          label: 'Laugh, and ask about the printer feud',
          reply: ['That is a three-lunch story. Tomorrow.'],
          trust: { backM: 2 },
        },
        {
          id: 'note',
          label: 'Make a mental note about the expenses',
          reply: [
            '*She sees your face.* Oh, you are one of those. The careful ones. Good.',
          ],
          flags: ['acc-noticed'],
          trust: { backM: 1 },
        },
      ],
    ),
    'acc-leila-vat': scene(
      'acc-leila-vat',
      'backM',
      () => [
        '*Leila looks over her shoulder.*',
        'Those codes? Restaurants, a family holiday, a sofa, all as “client entertaining”, VAT reclaimed. Helen signs them. I always assumed someone above her said it was fine.',
      ],
      [
        {
          id: 'thanks',
          label: 'Thank her, and say you will handle it carefully',
          reply: ['Careful is good. Careful and right is better.'],
          trust: { backM: 2 },
        },
      ],
    ),
    'acc-helen-vat': scene(
      'acc-helen-vat',
      'senior',
      () => [
        '*Helen goes very still when you show her.*',
        'He asked me to. Years ago. I said it was wrong and he said he would sort it with the auditors. He never did, and I never pushed. Are you going to tell Daniel?',
      ],
      [
        {
          id: 'report',
          label: 'Tell her you have to report it to Daniel, today',
          reply: ['*She closes her eyes.* I know. I would, in your place.'],
          flags: ['acc-reported'],
          trust: { senior: -2, manager: 3 },
        },
        {
          id: 'together',
          label: 'Offer to go to Daniel with her, so it is corrected properly',
          reply: ['…Together. Yes. Thank you. I should have done this years ago.'],
          flags: ['acc-checked-helen', 'acc-reported'],
          trust: { senior: 4, manager: 2 },
        },
        {
          id: 'her',
          label: 'Let her correct it herself, quietly',
          reply: ['I will. This week. You have my word.'],
          flags: ['acc-helen-fixes'],
          trust: { senior: 3 },
        },
      ],
    ),
    'acc-daniel-year-end': scene(
      'acc-daniel-year-end',
      'manager',
      (flags) => [
        '*Daniel closes the door.*',
        flags.includes('acc-reported')
          ? 'The VAT is corrected, and repaid. That was not easy for anyone, least of all Helen. You handled it properly.'
          : flags.includes('acc-helen-fixes')
            ? 'Helen corrected a run of expense codes last week, on her own. She would not say why. Do you know anything about that?'
            : 'The external accountants found something in the director’s expenses. Did anyone in this team know?',
      ],
      [
        {
          id: 'honest',
          label: 'Tell him everything you know',
          reply: ['Thank you. That is the only answer I ever want.'],
          flags: ['acc-honest-end'],
          trust: { manager: 3 },
        },
        {
          id: 'next',
          label: 'Ask what he needs from you next',
          reply: ['The next VAT return. All of it. You have earned it.'],
          trust: { manager: 1 },
        },
      ],
    ),
  },
}
