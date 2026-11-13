/**
 * Engineering: "Safe Hands". A first month at Northbank Engineering Ltd
 * (fictional). A "quick look" at a machine without a permit; then a client
 * who wants a calculation issued before it has been checked. Whether the
 * player holds to the checks comes back at the handover. Original story;
 * fictional people.
 */
import type { Campaign } from '../types'
import { answer, scene, talk } from './kit'

export const ENGINEERING_SERVICES_STORY: Campaign = {
  id: 'engineering-services',
  careerId: 'engineering-services',
  title: 'Safe Hands',
  premise:
    'Your first month as a graduate engineer. Everything is urgent. Nothing is so urgent that it cannot be done safely, and checked.',
  cast: {
    manager: 'Helena Okoye',
    senior: 'Dmitri Volkov',
    reception: 'Fatima Noor',
    facilities: 'Gus Pemberton',
    backM: 'Kofi Mensah',
    backR: 'Ingrid Sorensen',
    front2: 'Lucy Wren',
    coordinator: 'Tomás Rivera',
  },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · Permit first',
      missions: [
        {
          id: 'first-day',
          type: 'main',
          title: 'Hard hat, induction, desk',
          from: 'manager',
          intro: [
            'Your first day at Northbank. Helena wants to meet you; Dmitri will show you the workshop.',
          ],
          objectives: [
            talk(
              'helena',
              'manager',
              'eng-helena',
              'Meet Helena, the engineering manager',
              'manager',
            ),
            talk(
              'dmitri',
              'senior',
              'eng-dmitri',
              'Ask Dmitri to show you around',
              'desk',
            ),
          ],
          reward: { xp: 20, trust: { manager: 2 } },
          summary: () =>
            'Helena checks every calculation. Dmitri checks every lock. You suspect they check each other, too.',
        },
        {
          id: 'quick-look',
          type: 'main',
          title: 'Just a quick look',
          from: 'facilities',
          after: ['first-day'],
          intro: [
            'Conveyor 3 is making a horrible noise. Production wants someone to “just have a quick look inside”, now.',
          ],
          objectives: [
            talk(
              'gus',
              'facilities',
              'eng-gus',
              'Talk to Gus in the mess room',
              'breakroom',
            ),
            answer('steel', 'eng-steel-order', 'Work out the steel order (Cases)'),
          ],
          reward: { xp: 40, trust: { facilities: 1 } },
          summary: (flags) =>
            flags.includes('eng-permit')
              ? 'You waited for the permit and the isolation. Inside: a sheared guard bolt next to the belt. Nobody’s hand went near it while it could move.'
              : 'You looked in with the belt stopped but not isolated. It did not start. Gus has not quite forgiven you.',
        },
        {
          id: 'kofi',
          type: 'side',
          title: 'Units',
          from: 'backM',
          after: ['first-day'],
          intro: ['Kofi has a cable calculation that gives a ridiculous answer.'],
          objectives: [
            talk('kofi', 'backM', 'eng-kofi', 'Help Kofi at his desk', 'desk'),
          ],
          reward: { xp: 10, trust: { backM: 3 } },
          summary: () =>
            'Milliohms, not ohms. Kofi has written UNITS on a sticky note on his screen.',
        },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter 2 · Checked',
      missions: [
        {
          id: 'unchecked',
          type: 'main',
          title: 'Issue it today',
          from: 'coordinator',
          after: ['quick-look'],
          intro: [
            'The client wants the mezzanine calculation today. Helena, who checks everything, is on a plane.',
          ],
          objectives: [
            talk(
              'ingrid',
              'backR',
              'eng-ingrid',
              'Ask Ingrid about the calculation',
              'desk',
            ),
            talk(
              'tomas',
              'coordinator',
              'eng-tomas',
              'Tell Tomás what you will do',
              'desk',
            ),
          ],
          reward: { xp: 40 },
          summary: (flags) =>
            flags.includes('eng-checked')
              ? 'Ingrid checked it that afternoon and found a wrong span in one load case. Fixed before it left the building.'
              : 'It went out unchecked, with a wrong span in one load case.',
        },
        {
          id: 'handover',
          type: 'main',
          title: 'The handover',
          from: 'manager',
          after: ['unchecked'],
          intro: ['Helena is back. The mezzanine steel goes up next week.'],
          objectives: [
            talk(
              'helena2',
              'manager',
              'eng-helena-final',
              'See Helena in her office',
              'manager',
            ),
          ],
          flags: ['story-complete'],
          reward: { xp: 60, trust: { manager: 2 } },
          summary: (flags) =>
            flags.includes('eng-checked')
              ? 'The mezzanine went up on time and to the checked design. Helena put your name on the drawing as designer, and Ingrid’s as checker.'
              : 'Helena caught the wrong span before the steel was cut. Nobody was hurt; the client waited a week. You will never issue an unchecked calculation again.',
        },
      ],
    },
  ],
  scenes: {
    'eng-helena': scene(
      'eng-helena',
      'manager',
      () => [
        '*Helena hands you a hard hat and a red pen.*',
        'Welcome, {name}. Two rules: nobody works on anything that is not isolated, and nothing leaves this office unchecked. The red pen is for checking other people’s work. Use it.',
      ],
      [
        {
          id: 'pen',
          label: 'Take the red pen',
          reply: ['Good. Mine has run out twice this year.'],
          trust: { manager: 2 },
        },
        {
          id: 'ask',
          label: 'Ask who checks hers',
          reply: ['*She laughs.* Ingrid. Ruthlessly.'],
          trust: { manager: 3 },
        },
      ],
    ),
    'eng-dmitri': scene(
      'eng-dmitri',
      'senior',
      () => [
        '*Dmitri opens the lockout cabinet.*',
        'Your lock, your key, your name on the tag. Nobody else touches it. Ever.',
      ],
      [
        {
          id: 'sign',
          label: 'Sign out your lock',
          reply: ['*He nods.* Now you are allowed to be useful.'],
          trust: { senior: 2 },
        },
      ],
    ),
    'eng-gus': scene(
      'eng-gus',
      'facilities',
      () => [
        '*Gus puts his mug down.*',
        'Production wants you to look in Conveyor 3 right now. It is stopped. Is that enough?',
      ],
      [
        {
          id: 'permit',
          label: 'No: get the permit, isolate it, lock it and prove it dead first',
          reply: ['*He grins and hands you a permit pad.* Right answer.'],
          flags: ['eng-permit'],
          trust: { facilities: 3 },
        },
        {
          id: 'look',
          label: 'It’s stopped: a quick look is fine',
          reply: ['*His face hardens.* Stopped is not isolated.'],
        },
      ],
    ),
    'eng-kofi': scene(
      'eng-kofi',
      'backM',
      () => [
        '*Kofi points at his screen.*',
        'This says the cable drops 1,000 volts. On a 230 volt supply.',
      ],
      [
        {
          id: 'units',
          label: 'Check his units',
          reply: ['*0.5 milliohms, typed as 0.5 ohms.* Kofi groans. “Units.”'],
          trust: { backM: 3 },
        },
      ],
    ),
    'eng-ingrid': scene(
      'eng-ingrid',
      'backR',
      () => [
        '*Ingrid looks up from a drawing.*',
        'The mezzanine calc? I can check it this afternoon. Or the client can have it unchecked this morning. Your call.',
      ],
      [
        {
          id: 'check',
          label: 'Ask her to check it this afternoon',
          reply: ['*She is already opening the file.*'],
          flags: ['eng-checked'],
          trust: { backR: 2 },
        },
        {
          id: 'issue',
          label: 'Issue it now; the client is waiting',
          reply: ['*She shrugs.* Your name on it.'],
        },
      ],
    ),
    'eng-tomas': scene(
      'eng-tomas',
      'coordinator',
      (flags) => [
        '*Tomás has the client on hold.*',
        flags.includes('eng-checked')
          ? 'Tomorrow morning, checked? I can sell that.'
          : 'Going out unchecked? Helena won’t like that.',
      ],
      [
        {
          id: 'stand',
          label: 'Stand by your decision',
          reply: ['Then I will tell them.'],
        },
        {
          id: 'wait',
          label: 'Ask Ingrid to check it before it goes',
          reply: [
            '*Ingrid finds a wrong span in one load case.* Tomás tells the client it will be tomorrow.',
          ],
          flags: ['eng-checked'],
          trust: { coordinator: 2 },
        },
      ],
    ),
    'eng-helena-final': scene(
      'eng-helena-final',
      'manager',
      (flags) => [
        '*Helena has the drawing on her desk.*',
        flags.includes('eng-checked')
          ? 'Checked, corrected, on time. That is engineering.'
          : 'This went out unchecked, with a wrong span. I caught it. Next time someone might not.',
      ],
      [
        {
          id: 'learn',
          label: 'Say what you learned',
          reply: ['Write it on the red pen.'],
          trust: { manager: 2 },
        },
        { id: 'quiet', label: 'Say nothing', reply: ['*She signs the drawing.*'] },
      ],
    ),
  },
}
