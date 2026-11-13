/**
 * Healthcare: "Bay A". A first fortnight on Ward 4 of Riverside Community
 * Hospital (fictional). A patient getting worse that the observations show
 * before anyone says so; then a medicines near miss by a well-liked
 * colleague. Whether the player speaks up comes back at the incident review.
 * Original story; fictional people; not medical advice.
 */
import type { Campaign } from '../types'
import { answer, scene, talk } from './kit'

export const HEALTHCARE_STORY: Campaign = {
  id: 'healthcare',
  careerId: 'healthcare',
  title: 'Bay A',
  premise:
    'Your first fortnight on a busy hospital ward. Four beds, a lot to learn, and one question that matters more than any other: will you speak up?',
  cast: {
    manager: 'Grace Mbeki',
    senior: 'Owen Fraser',
    reception: 'Rosa Lindqvist',
    facilities: 'Dev Kapoor',
    backM: 'Lena Novak',
    backR: 'Tom Ashworth',
    analyst: 'Wei Zhang',
    coordinator: 'Dr Felix Moreau',
  },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · Four beds',
      missions: [
        {
          id: 'first-day',
          type: 'main',
          title: 'First shift',
          from: 'manager',
          intro: [
            'Your first shift on Ward 4. Grace wants to meet you; Owen will show you Bay A.',
          ],
          objectives: [
            talk(
              'grace',
              'manager',
              'hc-grace',
              'Meet Grace, the ward manager',
              'manager',
            ),
            talk('owen', 'senior', 'hc-owen', 'Ask Owen to show you Bay A', 'desk'),
          ],
          reward: { xp: 20, trust: { manager: 2 } },
          summary: () =>
            'Grace wants careful checks. Owen wants you to ask questions. Bay A has four beds, four people, and a lot of numbers.',
        },
        {
          id: 'margaret',
          type: 'main',
          title: 'The numbers say so',
          from: 'senior',
          after: ['first-day'],
          intro: [
            'Margaret Okafor in 4A-1 says she is “fine, just tired”. Her observations say something else.',
          ],
          objectives: [
            talk(
              'lena',
              'backM',
              'hc-lena',
              'Ask Lena about Margaret’s observations',
              'desk',
            ),
            talk('felix', 'coordinator', 'hc-felix', 'Escalate to Dr Moreau', 'desk'),
          ],
          reward: { xp: 40, trust: { senior: 2 } },
          flags: ['hc-escalated'],
          summary: () =>
            'Margaret’s score was 8. Dr Moreau changed her treatment within the hour. Owen says nothing, but he nods at you twice that afternoon.',
        },
        {
          id: 'wei',
          type: 'side',
          title: 'The pharmacy hatch',
          from: 'analyst',
          after: ['first-day'],
          intro: ['Wei from pharmacy has a prescription that does not look right.'],
          objectives: [
            talk('wei', 'analyst', 'hc-wei', 'See Wei at the nurses’ station', 'desk'),
          ],
          reward: { xp: 10, trust: { analyst: 3 } },
          summary: () =>
            'An allergy caught before the drug left pharmacy. Wei says the best checks are the boring ones, done every time.',
        },
        {
          id: 'family',
          type: 'workplace',
          title: 'Nobody told her',
          from: 'reception',
          after: ['margaret'],
          intro: [
            'Margaret’s daughter came to visit and found an empty bed. She has written in.',
          ],
          objectives: [answer('reply', 'hc-complaint', 'Reply to the complaint (Cases)')],
          reward: { xp: 30, trust: { manager: 1 } },
          summary: () =>
            'An honest apology, and a checklist that now cannot be finished without calling the family.',
        },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter 2 · Speak up',
      missions: [
        {
          id: 'near-miss',
          type: 'main',
          title: 'The wristband',
          from: 'senior',
          after: ['margaret'],
          intro: [
            'At the medicines trolley you see Tom give George Whitfield his tablets without checking his wristband. They are George’s tablets. This time.',
          ],
          objectives: [
            talk('tom', 'backR', 'hc-tom', 'Talk to Tom in the staff room', 'breakroom'),
            talk(
              'owen2',
              'senior',
              'hc-owen-near-miss',
              'Decide what to tell Owen',
              'desk',
            ),
          ],
          reward: { xp: 40 },
          summary: (flags) =>
            flags.includes('hc-reported')
              ? 'You reported the near miss. Tom was embarrassed, then grateful: it was the first time he had skipped the check, and he wants it to be the last.'
              : 'You kept it to yourself. Tom checks the wristband now, mostly. Nobody else knows.',
        },
        {
          id: 'review',
          type: 'main',
          title: 'The incident review',
          from: 'manager',
          after: ['near-miss'],
          intro: [
            'A week later, on another ward, two patients with the same surname got each other’s tablets. Grace calls the team together to review how Ward 4 checks identity.',
          ],
          objectives: [
            talk(
              'grace2',
              'manager',
              'hc-grace-review',
              'Join Grace’s review',
              'manager',
            ),
          ],
          flags: ['story-complete'],
          reward: { xp: 60, trust: { manager: 2 } },
          summary: (flags) =>
            flags.includes('hc-reported')
              ? 'Your report was in the review: proof that near misses here get spoken about. Grace made “check the wristband, every time” the ward’s first rule, and asked you to teach it to the next new starter.'
              : 'The review found nothing on Ward 4: no near misses reported. Grace was pleased. You know it was not quite true, and from now on you report what you see.',
        },
      ],
    },
  ],
  scenes: {
    'hc-grace': scene(
      'hc-grace',
      'manager',
      () => [
        '*Grace closes the rota and smiles.*',
        'Welcome to Ward 4, {name}. One rule above all the others: if you are worried about a patient, you say so. Straight away. Nobody here will ever be cross with you for asking.',
      ],
      [
        {
          id: 'promise',
          label: 'Promise you will',
          reply: ['Good. I will hold you to it.'],
          trust: { manager: 2 },
        },
        {
          id: 'ask',
          label: 'Ask what “worried” looks like',
          reply: [
            'Numbers that change, a patient who is not themselves, a family who says “this isn’t like him”. Owen will show you.',
          ],
          trust: { manager: 3 },
        },
      ],
    ),
    'hc-owen': scene(
      'hc-owen',
      'senior',
      () => [
        '*Owen walks you along Bay A.*',
        'Four beds. Read the allergy banner before anything else, check the wristband every time, and write it down or it did not happen.',
      ],
      [
        {
          id: 'note',
          label: 'Write it down',
          reply: ['*He grins.* You are going to be fine.'],
          trust: { senior: 2 },
        },
      ],
    ),
    'hc-lena': scene(
      'hc-lena',
      'backM',
      () => [
        '*Lena shows you the chart.*',
        'Her breathing is up, her oxygen is down, and she is hot. Each one on its own looks small. Together the score is 8. I wasn’t sure if it was my place to say.',
      ],
      [
        {
          id: 'together',
          label: 'Say you will escalate it together',
          reply: ['*She looks relieved.* Thank you. Let’s go.'],
          trust: { backM: 3 },
        },
        {
          id: 'wait',
          label: 'Suggest checking again in an hour',
          reply: [
            '*She hesitates.* Grace says a score like that can’t wait… but all right.',
          ],
          trust: { backM: -1 },
        },
      ],
    ),
    'hc-felix': scene(
      'hc-felix',
      'coordinator',
      () => [
        '*Dr Moreau looks up from his notes.*',
        'Go on: situation, background, assessment, recommendation.',
      ],
      [
        {
          id: 'sbar',
          label: 'Give a clear SBAR: score 8, the numbers, and “please review her now”',
          reply: ['*He is already standing.* Clear. Thank you. I am coming.'],
          trust: { coordinator: 3, senior: 1 },
        },
        {
          id: 'vague',
          label: 'Say Margaret “doesn’t look great”',
          reply: [
            '*He frowns.* What are her numbers? … Score 8? That is urgent. I am coming.',
          ],
        },
      ],
    ),
    'hc-wei': scene(
      'hc-wei',
      'analyst',
      () => [
        '*Wei holds up a prescription.*',
        'Brufenac for Aisha Rahman. Her banner says she wheezes with anti-inflammatories. What would you do?',
      ],
      [
        {
          id: 'query',
          label: 'Query it with the prescriber',
          reply: ['Exactly. We never change it ourselves: we ask.'],
          trust: { analyst: 3 },
        },
        {
          id: 'small',
          label: 'Give a smaller dose',
          reply: [
            '*Wei shakes his head.* An allergy is not about the dose. We query it.',
          ],
        },
      ],
    ),
    'hc-tom': scene(
      'hc-tom',
      'backR',
      () => [
        '*Tom is making tea.*',
        'You saw that, didn’t you. Look, I have known George for a week. It was his tablets. It is fine. No need to make a thing of it.',
      ],
      [
        {
          id: 'report',
          label: 'Say kindly that you will mention it to Owen: it is how the ward learns',
          reply: [
            '*He is quiet for a moment.* … Yeah. Fair. I’d want to know if it was me watching.',
          ],
          flags: ['hc-reported'],
          trust: { backR: 1 },
        },
        {
          id: 'leave',
          label: 'Agree to let it go',
          reply: ['*He looks relieved.* Thanks. It won’t happen again.'],
          flags: ['hc-silent'],
          trust: { backR: 2 },
        },
      ],
    ),
    'hc-owen-near-miss': scene(
      'hc-owen-near-miss',
      'senior',
      (flags) => [
        '*Owen catches you at the nurses’ station.*',
        flags.includes('hc-reported')
          ? 'Tom told me you were going to come and see me. That took courage, from both of you.'
          : 'All quiet on Bay A today? Anything I should know?',
      ],
      [
        {
          id: 'tell',
          label: 'Tell him what you saw, without blame',
          reply: [
            'Thank you. We will log it as a near miss: no harm, lots to learn. That is how it should work.',
          ],
          flags: ['hc-reported'],
          trust: { senior: 3 },
        },
        {
          id: 'quiet',
          label: 'Say everything is fine',
          reply: ['Good. *He goes back to his notes.*'],
          trust: { senior: 0 },
        },
      ],
    ),
    'hc-grace-review': scene(
      'hc-grace-review',
      'manager',
      (flags) => [
        '*Grace has the incident report from the other ward.*',
        flags.includes('hc-reported')
          ? 'Two patients, one surname, no wristband check. On our ward, someone reported a near miss just like it last week. That report is why I know our checks can slip, and why we can fix them.'
          : 'Two patients, one surname, no wristband check. Has anything like that ever nearly happened here?',
      ],
      [
        {
          id: 'stand',
          label: 'Say you will always speak up, and teach the check to new starters',
          reply: ['Then that is our first rule, and you are teaching it.'],
          flags: ['hc-reported'],
          trust: { manager: 3 },
        },
        {
          id: 'nothing',
          label: 'Say nothing',
          reply: ['*Grace looks round the room.* Then let’s keep it that way.'],
        },
      ],
    ),
  },
}
