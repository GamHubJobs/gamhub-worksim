/**
 * Talking to colleagues. Each person has small talk that reflects the
 * player's situation, and one-off conversations that unlock as the
 * relationship and the career develop. Some are difficult (a misunderstanding,
 * a competitive colleague) and offer ethical ways to respond.
 *
 * Chatting builds trust, but only a little per day: the third chat with the
 * same person in a day gets a polite "I need to get back to work".
 */
import { PEOPLE } from '../content/company'
import { DURATIONS } from '../content/workday'
import { firstName, type ProfileData } from './career'
import { now } from './deadlines'
import { dialogueFor, currentTask, type Dialogue } from './office'
import { trustOf, changeTrust } from './relationships'
import { choiceMade, recordScene, sceneDone, type Choice } from './scenes'
import { haveLunch, restFor } from './workday'

/** People the player can walk up to in the office. */
export type ColleagueId = 'manager' | 'reception' | 'facilities' | 'senior'

/** Trust at which Marcus becomes the player's mentor. */
export const MENTOR_TRUST = 65

/** Chats per person per day that still build trust (+2, then +1). */
const TRUST_PER_CHAT = [2, 1]
const CHATS_BEFORE_BUSY = 3
const BUSY_MINUTES = 2

interface Topic {
  id: string
  person: ColleagueId
  when: (profile: ProfileData) => boolean
  scene: (profile: ProfileData) => { lines: string[]; choices: Choice[] }
}

const talks = (profile: ProfileData, person: string) =>
  profile.work.relationships[person]?.talks ?? 0

const name = (profile: ProfileData) => firstName(profile.name)

// ---------------------------------------------------------------------------
// One-off conversations
// ---------------------------------------------------------------------------

const TOPICS: Topic[] = [
  {
    id: 'marcus-intro',
    person: 'senior',
    when: () => true,
    scene: (profile) => ({
      lines: [
        '*Marcus finishes typing before he looks up.*',
        `So you are the new intern. ${name(profile)}, right? Priya has been talking you up.`,
        'I have been on this team five years. What can I do for you?',
      ],
      choices: [
        {
          id: 'learn',
          label: 'Ask what he works on, and whether you could learn from him',
          reply: [
            '*He relaxes a little.*',
            'Month-end close, supplier accounts, the cost reports for the directors. The interesting stuff.',
            'Sure. Watch how I check my numbers; that is the bit nobody teaches you.',
          ],
          effects: { trust: { senior: 5 } },
          lesson:
            'Experienced colleagues respond well to genuine curiosity about their work. It is the fastest way to learn and to be accepted.',
        },
        {
          id: 'neutral',
          label: 'Say you are just here to do a good job',
          reply: [
            'Good. Keep your head down and your numbers right, and you will be fine.',
          ],
          effects: {},
        },
        {
          id: 'joke',
          label: 'Joke that you are after his job',
          reply: [
            '*He doesn’t laugh.*',
            'Plenty of people have said that. Most of them are not here any more.',
          ],
          effects: { trust: { senior: -5 }, wellbeing: { stress: 2 } },
          lesson:
            'Jokes about ambition can land as a threat, especially with someone protective of their position. Build the relationship first.',
        },
      ],
    }),
  },
  {
    id: 'nina-lunch-invite',
    person: 'reception',
    when: (profile) => talks(profile, 'reception') >= 1,
    scene: () => ({
      lines: [
        'Oh, before I forget: a few of us eat together in the break room around half twelve. Tom, me, sometimes Marcus.',
        'You should join us! It is the best way to find out how things really work around here.',
      ],
      choices: [
        {
          id: 'join',
          label: 'Say you would love to',
          reply: ['Lovely! Bring something good; Tom will try to steal it.'],
          effects: { trust: { reception: 4 }, wellbeing: { engagement: 2 } },
          lesson:
            'Informal time with colleagues builds the relationships that make work easier, and lunch is also a real break.',
        },
        {
          id: 'work-through',
          label: 'Say you usually work through lunch',
          reply: ['Oh. Well, the offer stands. Do make sure you eat something!'],
          effects: { trust: { reception: -1 } },
          lesson:
            'Working through lunch feels productive but costs energy later in the day, and you miss the chance to get to know people.',
        },
      ],
    }),
  },
  {
    id: 'tom-first-day',
    person: 'facilities',
    when: (profile) => profile.work.day >= 2,
    scene: (profile) => ({
      lines: [`${name(profile)}! So, survived your first day? Honestly, how was it?`],
      choices: [
        {
          id: 'honest',
          label: 'Admit it was a lot, but you learned loads',
          reply: [
            'Ha, that is the right answer. My first week I sent the whole office the wrong fire drill date. Twice.',
            'Nobody expects you to know everything. They expect you to ask.',
          ],
          effects: { trust: { facilities: 4 }, wellbeing: { stress: -3 } },
          lesson:
            'Being open about the learning curve builds rapport. Colleagues help people who are honest about what they do not know yet.',
        },
        {
          id: 'easy',
          label: 'Say it was easy',
          reply: ['Oh yeah? Wait until month-end. Then we will talk.'],
          effects: {},
          lesson:
            'Projecting total confidence can make you harder to help. A little honesty goes a long way.',
        },
      ],
    }),
  },
  {
    id: 'nina-misunderstanding',
    person: 'reception',
    when: (profile) => profile.work.day >= 2 && sceneDone(profile, 'nina-lunch-invite'),
    scene: () => ({
      lines: [
        '*Nina is noticeably cooler than usual.*',
        'Can I ask you something? Someone told me you said reception “just answers the phones”.',
        'I organise every meeting room, every delivery and every visitor in this building, so… that stung a bit.',
      ],
      choices: [
        {
          id: 'clarify',
          label: 'Calmly say you never said that, and ask where it came from',
          reply: [
            '*She thinks for a moment.*',
            'Actually… it was second-hand. Somebody heard it from somebody. I should have checked with you first. Sorry.',
            'Thanks for not getting upset about it.',
          ],
          effects: { trust: { reception: 6 }, reputation: 1 },
          lesson:
            'Misunderstandings are best handled directly and calmly: state the facts without blaming, and ask questions. Most people are relieved to clear the air.',
        },
        {
          id: 'apologise',
          label: 'Apologise anyway, to keep the peace',
          reply: [
            'Oh. Well, thank you for apologising, I suppose.',
            '*She still seems unsure what to think of you.*',
          ],
          effects: { trust: { reception: 1 }, wellbeing: { stress: 3 } },
          lesson:
            'Apologising for something you did not do may calm things for a moment, but it leaves the false story standing. Clarify kindly instead.',
        },
        {
          id: 'defensive',
          label: 'Tell her that is ridiculous and walk off',
          reply: [
            '*Nina’s face falls, and she turns back to her screen without a word.*',
          ],
          effects: { trust: { reception: -6 }, reputation: -2, wellbeing: { stress: 4 } },
          lesson:
            'Getting defensive turns a misunderstanding into a conflict. Even when you are in the right, the way you respond is what people remember.',
        },
      ],
    }),
  },
]

// ---------------------------------------------------------------------------
// Advice from a mentor, and asking Priya for more time
// ---------------------------------------------------------------------------

/** Marcus's advice for the current task: the first step's hint, in his words. */
function marcusAdvice(profile: ProfileData): Dialogue | null {
  const task = currentTask(profile)
  if (!task) return null
  const step = task.assignment.steps.find((s) => s.hint) ?? task.assignment.steps[0]
  return {
    speaker: 'senior',
    title: 'Marcus Webb',
    lines: [
      `“${task.assignment.title}”? I have done that one a hundred times. Here is what I would do.`,
      step.hint ?? step.instructions.split('\n\n')[0],
      'And check every total twice before Priya sees it. She always spots it.',
    ],
    actions: [
      {
        label: 'Open the task',
        open: { app: 'tasks', assignmentId: task.assignment.id },
      },
    ],
  }
}

export function isMentor(profile: ProfileData): boolean {
  return (
    choiceMade(profile, 'marcus-intro') !== null &&
    trustOf(profile.work, 'senior') >= MENTOR_TRUST
  )
}

function extensionChoice(profile: ProfileData): Choice | null {
  const task = currentTask(profile)
  if (!task) return null
  const deadline = profile.work.deadlines[task.assignment.id]
  if (!deadline || deadline.status !== 'open' || deadline.extended) return null
  const hoursLeft = (deadline.due - now(profile.work)) / 60
  if (hoursLeft <= 0 || hoursLeft > 4) return null
  const trusted = trustOf(profile.work, 'manager') >= 40
  return {
    id: `extension:${task.assignment.id}`,
    label: `Ask for more time on “${task.assignment.title}”`,
    reply: trusted
      ? [
          'Thanks for telling me before the deadline rather than after. Take until the same time tomorrow, but no later.',
        ]
      : [
          '*Priya sighs.*',
          'Fine, one more day. But I need to be able to rely on your estimates.',
        ],
    effects: {
      extend: task.assignment.id,
      trust: { manager: trusted ? 0 : -1 },
      wellbeing: { stress: -5 },
    },
    lesson:
      'If you will miss a deadline, say so early and propose a new one. Asking before the deadline is professional; missing it silently is not.',
  }
}

// ---------------------------------------------------------------------------
// Talking to someone
// ---------------------------------------------------------------------------

const BUSY_LINES: Record<ColleagueId, string> = {
  manager:
    'I have back-to-back calls this afternoon. Unless it is urgent, it can wait for the stand-up?',
  reception: 'I would love to chat, but the phones are ringing off the hook. Later?',
  facilities: 'Again? People will think we are planning something. Back to work, you!',
  senior: 'I am in the middle of something. Can it wait?',
}

function smallTalk(
  profile: ProfileData,
  person: ColleagueId,
  tipIndex: number,
): Dialogue {
  switch (person) {
    case 'manager': {
      const dialogue = dialogueFor('manager', profile)
      const extension = extensionChoice(profile)
      return extension ? { ...dialogue, choices: [extension] } : dialogue
    }
    case 'reception':
      return dialogueFor('receptionist', profile)
    case 'facilities':
      return dialogueFor('colleague', profile, tipIndex)
    case 'senior': {
      if (isMentor(profile)) {
        const advice = marcusAdvice(profile)
        if (advice) return advice
      }
      const lines = [
        'Month-end never really ends, you know. It just becomes next month’s month-end.',
        'If you want to get noticed here, do not just finish things. Finish them so Priya never has to check.',
        'Coffee from the machine is fine. Do not touch the oat milk; that is Nina’s.',
      ]
      return {
        speaker: 'senior',
        title: 'Marcus Webb',
        lines: [lines[talks(profile, 'senior') % lines.length]],
        actions: [],
      }
    }
  }
}

export interface Conversation {
  dialogue: Dialogue
  /** The one-off conversation shown, if any. */
  topicId: string | null
  minutes: number
}

/** What happens when the player walks up to someone. */
export function conversationWith(
  profile: ProfileData,
  person: ColleagueId,
  tipIndex = 0,
): Conversation {
  const chatsToday = profile.work.today.talks[person] ?? 0
  const { name: title } = PEOPLE[person]
  if (chatsToday >= CHATS_BEFORE_BUSY) {
    return {
      dialogue: { speaker: person, title, lines: [BUSY_LINES[person]], actions: [] },
      topicId: null,
      minutes: BUSY_MINUTES,
    }
  }
  const topic = TOPICS.find(
    (t) => t.person === person && !sceneDone(profile, t.id) && t.when(profile),
  )
  if (topic) {
    return {
      dialogue: {
        id: topic.id,
        speaker: person,
        title,
        actions: [],
        ...topic.scene(profile),
      },
      topicId: topic.id,
      minutes: DURATIONS.chat,
    }
  }
  return {
    dialogue: smallTalk(profile, person, tipIndex),
    topicId: null,
    minutes: DURATIONS.chat,
  }
}

/**
 * The time and trust of a conversation (choices add their own effects).
 * One-off conversations are remembered straight away, so closing one without
 * choosing does not bring it back.
 */
export function holdConversation(
  profile: ProfileData,
  person: ColleagueId,
  conversation: Pick<Conversation, 'topicId' | 'minutes'>,
): ProfileData {
  const chatsToday = profile.work.today.talks[person] ?? 0
  const relationship = profile.work.relationships[person]
  let work = changeTrust(profile.work, person, TRUST_PER_CHAT[chatsToday] ?? 0)
  work = {
    ...work,
    relationships: {
      ...work.relationships,
      [person]: {
        trust: trustOf(work, person),
        talks: (relationship?.talks ?? 0) + 1,
      },
    },
    today: { ...work.today, talks: { ...work.today.talks, [person]: chatsToday + 1 } },
  }
  let next: ProfileData = { ...profile, work }
  if (conversation.topicId) next = recordScene(next, conversation.topicId, null)
  return restFor(next, 'chat', conversation.minutes)
}

// ---------------------------------------------------------------------------
// Lunch with the team
// ---------------------------------------------------------------------------

/** Players who accepted Nina's invitation eat with the team. */
export function lunchCompany(profile: ProfileData): string | null {
  return choiceMade(profile, 'nina-lunch-invite') === 'join' ? 'Nina and Tom' : null
}

export function haveLunchBreak(profile: ProfileData): ProfileData {
  const company = lunchCompany(profile)
  let next = haveLunch(profile, company ?? undefined)
  if (company && next.work.today.lunch && !profile.work.today.lunch) {
    let work = changeTrust(next.work, 'reception', 1)
    work = changeTrust(work, 'facilities', 1)
    next = { ...next, work }
  }
  return next
}
