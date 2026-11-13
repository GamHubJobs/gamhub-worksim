/**
 * Law: "Good Law". A first month at Kestrel & Vane LLP (fictional, in the
 * fictional jurisdiction of Westmark). A walk-in client who must not tell
 * you his story yet; then an old case that would win the argument, if only
 * it were still good law. Whether the player checks comes back in court.
 * Original story; fictional people; not legal advice.
 */
import type { Campaign } from '../types'
import { answer, scene, talk } from './kit'

export const LEGAL_STORY: Campaign = {
  id: 'legal',
  careerId: 'legal',
  title: 'Good Law',
  premise:
    'Your first month at a law firm. Everyone wants to win. The job is to win the right way: no conflicts, no shortcuts, and nothing you cannot stand behind in court.',
  cast: {
    manager: 'Eleanor Vane',
    senior: 'Tobias Kestrel',
    reception: 'Imogen Shaw',
    facilities: 'Marcus Hale',
    backM: 'Priyanka Rao',
    front2: 'Leo Marchetti',
    analyst: 'Hana Kowalski',
    coordinator: 'Sunita Bhatt',
  },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · Before you listen',
      missions: [
        {
          id: 'first-day',
          type: 'main',
          title: 'First day at Kestrel & Vane',
          from: 'manager',
          intro: [
            'Your first day. Eleanor wants to meet you; Tobias will show you the files.',
          ],
          objectives: [
            talk(
              'eleanor',
              'manager',
              'law-eleanor',
              'Meet Eleanor, your supervising partner',
              'manager',
            ),
            talk(
              'tobias',
              'senior',
              'law-tobias',
              'Ask Tobias about the Brightwater case',
              'desk',
            ),
          ],
          reward: { xp: 20, trust: { manager: 2 } },
          summary: () =>
            'Eleanor wants every deadline in the calendar. Tobias wants every citation checked. Both, you suspect, are right.',
        },
        {
          id: 'walk-in',
          type: 'main',
          title: 'The walk-in',
          from: 'reception',
          after: ['first-day'],
          intro: [
            'A man from Corvid Logistics is at reception, papers in hand, ready to tell you everything about a dispute.',
          ],
          objectives: [
            talk(
              'imogen',
              'reception',
              'law-imogen',
              'See the visitor at reception',
              'reception',
            ),
            answer('client', 'law-will-i-win', 'Reply to Maya Brightwater (Cases)'),
          ],
          reward: { xp: 40, trust: { manager: 1 } },
          summary: (flags) =>
            flags.includes('law-waited')
              ? 'You stopped him before he said a word. The conflict check showed he wanted to sue our own client. Nothing confidential was heard.'
              : 'He told you everything before the conflict check. He wanted to sue our own client. Eleanor had to put a wall around you on that file.',
        },
        {
          id: 'library',
          type: 'side',
          title: 'The library',
          from: 'analyst',
          after: ['first-day'],
          intro: [
            'Hana runs the firm’s knowledge service and wants to show you how to tell good law from bad.',
          ],
          objectives: [
            talk('hana', 'analyst', 'law-hana', 'Find Hana in the kitchen', 'breakroom'),
          ],
          reward: { xp: 10, trust: { analyst: 3 } },
          summary: () =>
            'Every authority has a status. Hana says the red ones have ended more careers than bad speeches.',
        },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter 2 · Candour',
      missions: [
        {
          id: 'old-case',
          type: 'main',
          title: 'The perfect case',
          from: 'senior',
          after: ['walk-in'],
          intro: [
            'Priyanka has found an old case that seems to answer Millstone’s whole argument. She is thrilled.',
          ],
          objectives: [
            talk('priyanka', 'backM', 'law-priyanka', 'Look at Priyanka’s case', 'desk'),
            talk(
              'tobias2',
              'senior',
              'law-tobias-check',
              'Tell Tobias what you found',
              'desk',
            ),
          ],
          reward: { xp: 40 },
          summary: (flags) =>
            flags.includes('law-checked')
              ? 'You checked: the case had been overruled. You found the case that overruled it, and it is even better for Brightwater.'
              : 'It went into the skeleton argument as it was.',
        },
        {
          id: 'court',
          type: 'main',
          title: 'In court',
          from: 'manager',
          after: ['old-case'],
          intro: [
            'The hearing. Eleanor is on her feet; you are beside her with the bundle.',
          ],
          objectives: [
            talk(
              'eleanor2',
              'manager',
              'law-eleanor-court',
              'Talk to Eleanor after the hearing',
              'manager',
            ),
          ],
          flags: ['story-complete'],
          reward: { xp: 60, trust: { manager: 2 } },
          summary: (flags) =>
            flags.includes('law-checked')
              ? 'The judge asked about the old case; Eleanor already had the answer, from your note. Brightwater won the point. Eleanor asked you to train the next intake on checking authorities.'
              : 'The judge pointed out the old case had been overruled. Eleanor apologised to the court. Brightwater still won, just, and you will never cite a case again without checking it.',
        },
      ],
    },
  ],
  scenes: {
    'law-eleanor': scene(
      'law-eleanor',
      'manager',
      () => [
        '*Eleanor closes a file and looks at you properly.*',
        'Welcome, {name}. Three rules. Check conflicts before you listen. Put every deadline in the calendar. And never tell a court anything you cannot stand behind.',
      ],
      [
        {
          id: 'note',
          label: 'Write the three rules down',
          reply: ['Good. Keep the list.'],
          trust: { manager: 2 },
        },
        {
          id: 'ask',
          label: 'Ask which rule is broken most often',
          reply: ['The first. People want to help, so they listen too soon.'],
          trust: { manager: 3 },
        },
      ],
    ),
    'law-tobias': scene(
      'law-tobias',
      'senior',
      () => [
        '*Tobias pulls the Brightwater file.*',
        'Mouldy flour, a supplier who says we should have looked harder. It is a good case. Good cases are lost by sloppy research.',
      ],
      [
        {
          id: 'listen',
          label: 'Ask him to show you how he researches',
          reply: ['*He grins.* Find it, read it, check it. Then rely on it.'],
          trust: { senior: 2 },
        },
      ],
    ),
    'law-imogen': scene(
      'law-imogen',
      'reception',
      () => [
        '*Imogen nods towards the visitor.*',
        'He is very keen to tell someone his story. I have said nothing about who we act for.',
      ],
      [
        {
          id: 'wait',
          label:
            'Take only his name and the other side’s, and run the conflict check before he tells you anything else',
          reply: ['*Imogen smiles.* Textbook.'],
          flags: ['law-waited'],
          trust: { reception: 2 },
        },
        {
          id: 'listen',
          label: 'Hear him out first: he has come all this way',
          reply: ['*He talks for twenty minutes. Imogen looks worried.*'],
        },
      ],
    ),
    'law-hana': scene(
      'law-hana',
      'analyst',
      () => [
        '*Hana opens the library on her laptop.*',
        'See this red flag? Overruled. Still in every textbook printed before 2011. The library knows; the textbooks don’t.',
      ],
      [
        {
          id: 'thanks',
          label: 'Ask her to show you the citator',
          reply: ['With pleasure. Check every case, every time.'],
          trust: { analyst: 3 },
        },
      ],
    ),
    'law-priyanka': scene(
      'law-priyanka',
      'backM',
      () => [
        '*Priyanka holds up a printout.*',
        'Quill v Asterton, 2004! A buyer who didn’t inspect can’t complain. Wait, that’s their argument… but look how it is reasoned. We could turn it around!',
      ],
      [
        {
          id: 'check',
          label: 'Check its status in the library together first',
          reply: [
            '*Red flag: overruled by Harlow v Penmore in 2011.* “Oh. And Harlow is about flour!”',
          ],
          flags: ['law-checked'],
          trust: { backM: 2 },
        },
        {
          id: 'use',
          label: 'Put it straight in the skeleton argument',
          reply: ['*She beams and starts typing.*'],
        },
      ],
    ),
    'law-tobias-check': scene(
      'law-tobias-check',
      'senior',
      (flags) => [
        '*Tobias reads your note.*',
        flags.includes('law-checked')
          ? 'Quill overruled, Harlow on point. That is exactly what I want to see.'
          : 'You’re relying on Quill? Have you checked it is still good law?',
      ],
      [
        {
          id: 'stand',
          label: 'Stand by your note',
          reply: ['Then let’s see what the court makes of it.'],
        },
        {
          id: 'recheck',
          label: 'Go back and check the library',
          reply: ['*Red flag: overruled.* Tobias nods. “Now fix it.”'],
          flags: ['law-checked'],
          trust: { senior: 3 },
        },
      ],
    ),
    'law-eleanor-court': scene(
      'law-eleanor-court',
      'manager',
      (flags) => [
        '*Outside court, Eleanor unbuttons her jacket.*',
        flags.includes('law-checked')
          ? 'When the judge asked about Quill, I had your note in my hand. That is what good preparation looks like.'
          : 'The judge knew Quill was overruled. I didn’t. That cannot happen again.',
      ],
      [
        {
          id: 'learn',
          label: 'Say what you learned',
          reply: ['Write it down. Then teach it.'],
          trust: { manager: 2 },
        },
        {
          id: 'quiet',
          label: 'Say nothing',
          reply: ['*She nods, and you walk back to the office together.*'],
        },
      ],
    ),
  },
}
