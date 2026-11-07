/**
 * Talking to anyone in the world: one set of rules for every person, whoever
 * and wherever they are. What the player can say depends on who the person
 * is (their kind of work), their personality, what they are doing right now
 * (working, in a meeting, serving, walking, chatting with someone), how well
 * they know the player, what happened last time and the time of day. What
 * they say back depends on the same.
 *
 * Consequences are small and earned: the first friendly word of the day with
 * someone builds a little trust, a real favour builds more, being rude costs
 * some, and talking to the same person over and over builds nothing (they
 * politely get back to what they were doing). Everything is remembered in the
 * save (`work.relationships`, `work.today.talks`). Pure, so it can be tested.
 *
 * The office's four named colleagues keep their own conversations (see
 * conversations.ts); this covers everyone else, and what anyone says when
 * they are busy.
 */
import type { ProfileData } from './career'
import { decayed, withLife } from './lifeTime'
import { trustOf } from './relationships'
import { personalOptions, respondPersonal } from './personal'
import { adultOf, bondOf, movedIn, talked, withBond, type Bond } from './romance'
import { restFor } from './workday'

export type NpcKind =
  | 'colleague'
  | 'manager'
  | 'reception'
  | 'facilities'
  | 'barista'
  | 'diner'
  | 'cashier'
  | 'shopper'
  | 'shop-staff'
  | 'salesperson'
  | 'mechanic'
  | 'gym-staff'
  | 'trainer'
  | 'gym-member'
  | 'neighbour'
  | 'courier'

export type Personality = 'warm' | 'quiet' | 'chatty' | 'dry' | 'focused'

/** Who someone is: the same for them everywhere. */
export interface Who {
  id: string
  name: string
  role: string
  kind: NpcKind
  personality: Personality
}

/** What they are doing when the player comes up. */
export type Availability =
  | 'free'
  | 'working'
  | 'meeting'
  | 'walking'
  | 'serving'
  | 'exercising'
  | 'eating'
  | 'chatting'
  | 'leaving'

export interface Situation {
  availability: Availability
  /** What it looks like they are doing ("at the printer"). */
  doing?: string
  /** Talking with someone else, when chatting. */
  with?: Who
  /** Minutes since midnight. */
  minute: number
}

export interface Line {
  /** Who says it (a name), or null for what happens. */
  speaker: string | null
  text: string
}

export type Tone = 'kind' | 'neutral' | 'rude'

export interface Option {
  id: string
  label: string
  tone: Tone
}

export interface Relation {
  trust: number
  /** Conversations ever, and today. */
  talks: number
  today: number
  /** What the player chose last time. */
  last?: string
  /** For the adults who could become close (see romance.ts): the bond, and the day. */
  bond?: Bond
  day?: number
  /** They live with the player. */
  together?: boolean
}

export interface Encounter {
  who: Who
  /** They are busy: they say so, and the player can only leave them to it (or insist). */
  busy: boolean
  opening: Line[]
  options: Option[]
}

export interface Outcome {
  lines: Line[]
  /** Trust change, for the person (and whoever they were chatting with). */
  trust: number
  /** Minutes it took. */
  minutes: number
  /** Remembered for next time. */
  memory: string
  /** A place action to do now (ordering a coffee from the barista). */
  action?: string
  /** What changed, for the player. */
  notes: string[]
  /** The bond afterwards, for the adults who could become close. */
  bond?: Bond
}

/** Talks a day with one person that still build anything. */
export const TALKS_THAT_COUNT = 1
/** Talks a day before they would rather get on. */
export const TALKS_BEFORE_BUSY = 3

const say = (who: Who | string, text: string): Line => ({
  speaker: typeof who === 'string' ? who : who.name,
  text,
})
const act = (text: string): Line => ({ speaker: null, text })
const first = (who: Who) => who.name.split(' ')[0]

function greeting(minute: number): string {
  if (minute < 12 * 60) return 'Morning'
  if (minute < 17 * 60) return 'Afternoon'
  return 'Evening'
}

/** A choice that depends on the person, so two people never sound the same. */
function pick<T>(who: Who, list: T[], salt = 0): T {
  let h = salt
  for (let i = 0; i < who.id.length; i++) h = (h * 31 + who.id.charCodeAt(i)) >>> 0
  return list[h % list.length]
}

const BUSY: Partial<Record<Availability, (who: Who, s: Situation) => Line[]>> = {
  meeting: (who) => [
    act(`*${first(who)} glances over from the meeting and lifts a hand: not now.*`),
    say(who, 'In a meeting. Catch me after?'),
  ],
  serving: (who) => [
    act(`*${first(who)} is serving someone, and nods to show they have seen you.*`),
    say(who, 'With you in just a moment.'),
  ],
  exercising: (who) => [
    act(`*${first(who)} keeps going, breathing hard, and gives you a thumbs up.*`),
    say(who, 'Mid-set. Two minutes?'),
  ],
  chatting: (who, s) => [
    act(
      `*${first(who)} and ${s.with ? first(s.with) : 'a colleague'} are mid-conversation. They both look round.*`,
    ),
    say(who, 'Oh, hi. Did you want to join us?'),
  ],
  leaving: (who) => [
    act(`*${first(who)} has their coat on.*`),
    say(who, 'I am just heading off. Tomorrow?'),
  ],
}

/** What someone says when the player comes up to them, and what the player can say. */
export function meet(who: Who, situation: Situation, rel: Relation): Encounter {
  const a = situation.availability
  const hello = greeting(situation.minute)
  // Asked too often today: politely back to work.
  if (rel.today >= TALKS_BEFORE_BUSY && a !== 'chatting') {
    return {
      who,
      busy: true,
      opening: [
        act(`*${first(who)} looks up, a little less brightly than before.*`),
        say(who, pick(who, TIRED)),
      ],
      options: [{ id: 'leave', label: 'Leave them to it', tone: 'kind' }],
    }
  }
  const busy = BUSY[a]
  if (busy) {
    const options: Option[] =
      a === 'chatting'
        ? [
            { id: 'join', label: 'Join the conversation', tone: 'kind' },
            { id: 'later', label: 'Say you will come back later', tone: 'kind' },
            {
              id: 'interrupt',
              label: `Ask ${first(who)} something anyway`,
              tone: 'rude',
            },
          ]
        : [
            { id: 'later', label: 'Say you will come back later', tone: 'kind' },
            { id: 'interrupt', label: 'Insist: it cannot wait', tone: 'rude' },
          ]
    return { who, busy: true, opening: busy(who, situation), options }
  }
  return {
    who,
    busy: false,
    opening: opening(who, situation, rel, hello),
    options: optionsFor(who, situation, rel),
  }
}

const TIRED = [
  'I really do need to get on, sorry. Later?',
  'Third time today! I am going to have to crack on.',
  'Let me get this finished, and I am all yours.',
]

function opening(who: Who, s: Situation, rel: Relation, hello: string): Line[] {
  const n = first(who)
  const lines: Line[] = []
  // The courier, just handed the bag over, turning back on the way out.
  if (who.kind === 'courier')
    return [
      act(`*${n} turns back on the landing.*`),
      say(
        who,
        rel.talks
          ? 'You again! All there this time?'
          : 'All there? Shout if anything is wrong with it.',
      ),
    ]
  // They turn, and show how they feel about the player.
  if (rel.last === 'rude') lines.push(act(`*${n} turns, a little warily.*`))
  else if (rel.trust >= 70) lines.push(act(`*${n} turns with a real smile.*`))
  else if (s.availability === 'walking') lines.push(act(`*${n} stops and turns to you.*`))
  else if (s.availability === 'working')
    lines.push(act(`*${n} looks up from ${s.doing ?? 'their work'}.*`))
  else lines.push(act(`*${n} turns to you.*`))

  if (rel.talks === 0) {
    lines.push(say(who, introduction(who, hello)))
    return lines
  }
  if (rel.last === 'rude') {
    lines.push(say(who, 'Oh. Hello. What is it?'))
    return lines
  }
  if (rel.last === 'help-offer') {
    lines.push(
      say(who, `${hello}! Thanks again for the hand before. What can I do for you?`),
    )
    return lines
  }
  const byPersonality: Record<Personality, string[]> = {
    warm: [`${hello}! Lovely to see you.`, `Hey, you! How are things?`],
    quiet: [`Oh. ${hello}.`, `Hi.`],
    chatty: [
      `${hello}! I was just thinking about you. Well, not you exactly. How are you?`,
      `There you are! Have you heard the latest?`,
    ],
    dry: [`${hello}. Survived so far?`, `Ah. Our newest celebrity.`],
    focused: [`${hello}. Quick one?`, `Hi. What do you need?`],
  }
  lines.push(say(who, pick(who, byPersonality[who.personality], rel.talks)))
  return lines
}

function introduction(who: Who, hello: string): string {
  const n = first(who)
  switch (who.kind) {
    case 'colleague':
      return `${hello}. I don't think we have met properly. I'm ${n}, ${who.role.toLowerCase()}.`
    case 'barista':
      return `${hello}! I'm ${n}. First time in? What can I get you?`
    case 'cashier':
      return `${hello}! I'm ${n}, on the tills. Need anything?`
    case 'shop-staff':
      return `Hi there, I'm ${n}. Looking for something?`
    case 'salesperson':
      return `${hello}, welcome in! ${n}. Bikes, cars, questions: I do all three.`
    case 'mechanic':
      return `${n}. Mind the oil. Something wrong with your wheels?`
    case 'gym-staff':
      return `${hello}! I'm ${n}, on the front desk. Members' area is through there.`
    case 'trainer':
      return `${hello}! ${n}, one of the trainers. New here?`
    case 'gym-member':
      return `Oh, hi. ${n}. You new?`
    case 'neighbour':
      return `${hello}! You are the new one on the street, aren't you? I'm ${n}.`
    case 'diner':
    case 'shopper':
      return `Oh! Hello. I'm ${n}. Do I know you?`
    case 'courier':
      return `Hi! Delivery for you.`
    default:
      return `${hello}. I'm ${n}.`
  }
}

const opt = (id: string, label: string, tone: Tone = 'kind'): Option => ({
  id,
  label,
  tone,
})

/** What there is to say, by who they are (never the same list for everyone). */
/** The options, with the personal ones for the adults who could become close (personal.ts). */
function optionsFor(who: Who, s: Situation, rel: Relation): Option[] {
  const base = baseOptions(who, s, rel)
  const adult = adultOf(who.id)
  if (!adult || !rel.bond) return base
  const tail = base.filter((o) => o.id === 'leave' || o.id === 'rude')
  return [
    ...base.filter((o) => !tail.includes(o)),
    ...personalOptions(who, adult, rel.bond, rel.together),
    ...tail,
  ]
}

function baseOptions(who: Who, s: Situation, rel: Relation): Option[] {
  const n = first(who)
  const rude = opt('rude', `Brush ${n} off`, 'rude')
  const leave = opt('leave', 'Say goodbye', 'neutral')
  switch (who.kind) {
    case 'colleague':
      return [
        opt('chat', `Chat with ${n}`),
        opt('work', `Ask ${n} what they are working on`, 'neutral'),
        opt('ask-help', `Ask ${n} for advice`, 'neutral'),
        opt('help-offer', `Offer ${n} a hand (15 min)`),
        rude,
        leave,
      ]
    case 'manager':
      return [
        opt('feedback', 'Ask how you are doing', 'neutral'),
        opt('guidance', 'Ask what to focus on'),
        opt('workload', 'Talk about your workload', 'neutral'),
        leave,
      ]
    case 'reception':
      return [
        opt('directions', 'Ask where things are', 'neutral'),
        opt('visitors', 'Ask if anyone is expected today', 'neutral'),
        opt('chat', `Chat with ${n}`),
        leave,
      ]
    case 'facilities':
      return [
        opt('chat', `Chat with ${n}`),
        opt('report', 'Report something broken', 'neutral'),
        leave,
      ]
    case 'barista':
      return [
        opt('order', 'Order a coffee'),
        opt('menu', 'Ask what is good today', 'neutral'),
        opt('chat', `Chat with ${n}`),
        leave,
      ]
    case 'cashier':
      return [
        opt('checkout', 'Get your shopping through the till'),
        opt('products', 'Ask if something is in stock', 'neutral'),
        opt('chat', `Chat with ${n}`),
        leave,
      ]
    case 'shop-staff':
      return [
        opt('products', 'Ask where to find something', 'neutral'),
        opt('offers', 'Ask about offers', 'neutral'),
        leave,
      ]
    case 'salesperson':
      return [
        opt('bikes', 'Ask about bikes', 'neutral'),
        opt('cars', 'Ask about leasing a car', 'neutral'),
        opt('chat', `Chat with ${n}`),
        leave,
      ]
    case 'mechanic':
      return [
        opt('advice', 'Ask for maintenance advice', 'neutral'),
        opt('chat', `Chat with ${n}`),
        leave,
      ]
    case 'gym-staff':
      return [
        opt('classes', 'Ask about classes', 'neutral'),
        opt('equipment', 'Ask how the equipment works', 'neutral'),
        opt('chat', `Chat with ${n}`),
        leave,
      ]
    case 'trainer':
      return [
        opt('guidance', 'Ask for fitness guidance'),
        opt('equipment', 'Ask about the equipment', 'neutral'),
        opt('class', 'Join the class', 'neutral'),
        leave,
      ]
    case 'gym-member':
      return [
        opt('chat', `Chat with ${n}`),
        opt('tips', 'Ask for a tip', 'neutral'),
        leave,
      ]
    case 'neighbour':
      return [
        opt('chat', `Chat with ${n}`),
        opt('local', 'Ask what is on locally', 'neutral'),
        opt('invite', `Suggest a coffee some time`),
        leave,
      ]
    case 'diner':
    case 'shopper':
      return [
        opt('chat', 'Make small talk'),
        opt(
          'recommend',
          s.availability === 'eating' ? 'Ask if it is good' : 'Ask for a recommendation',
          'neutral',
        ),
        opt('leave', 'Leave them in peace', 'kind'),
      ]
    case 'courier':
      return [
        opt('thank', 'Thank them'),
        opt('order', 'Check it is your order', 'neutral'),
        opt('problem', 'Report a problem with it', 'neutral'),
      ]
  }
  void rel
  return [leave]
}

/** What happens when the player says something. */
export function respond(
  who: Who,
  situation: Situation,
  rel: Relation,
  optionId: string,
): Outcome {
  const adult = adultOf(who.id)
  if (adult && rel.bond) {
    const personal = respondPersonal(who, adult, situation, rel, rel.bond, optionId)
    if (personal) return personal
    const out = baseRespond(who, situation, rel, optionId)
    // An ordinary chat (or rudeness) changes the bond too.
    if (optionId === 'chat' || optionId === 'rude' || optionId === 'join')
      return {
        ...out,
        bond: talked(
          rel.bond,
          adult,
          optionId === 'rude' ? 'rude' : 'chat',
          rel.today < 1,
        ),
      }
    return out
  }
  return baseRespond(who, situation, rel, optionId)
}

function baseRespond(
  who: Who,
  situation: Situation,
  rel: Relation,
  optionId: string,
): Outcome {
  const n = first(who)
  const counts = rel.today < TALKS_THAT_COUNT
  const warmth = counts ? (who.personality === 'quiet' ? 1 : 2) : 0
  const out = (
    lines: Line[],
    trust: number,
    minutes: number,
    extra: Partial<Outcome> = {},
  ): Outcome => ({
    lines,
    trust,
    minutes,
    memory: optionId,
    notes:
      trust > 0
        ? [`${n} warms to you a little.`]
        : trust < 0
          ? [`${n} seems put out.`]
          : [],
    ...extra,
  })
  switch (optionId) {
    case 'leave':
      return out(
        [
          act(
            `*${n} nods and goes back to ${situation.doing ?? 'what they were doing'}.*`,
          ),
        ],
        0,
        0,
      )
    case 'later':
      return out(
        [
          say(who, pick(who, ['Thanks. Find me later.', 'Cheers, appreciated.'])),
          act(`*${n} turns back.*`),
        ],
        0,
        0,
      )
    case 'interrupt':
      return out(
        [
          act(`*${n} stops what they are doing, not entirely happily.*`),
          say(who, 'Right. Go on then, quickly.'),
          act('*You ask your question. The answer is short.*'),
        ],
        -2,
        3,
        { memory: 'rude' },
      )
    case 'join': {
      const other = situation.with
      const lines = [
        act(`*${n}${other ? ` and ${first(other)}` : ''} make room for you.*`),
        say(who, pick(who, JOIN_LINES)),
      ]
      if (other) lines.push(say(other, pick(other, JOIN_REPLIES)))
      lines.push(act('*You chip in. Everyone laughs at the right moment.*'))
      return out(lines, counts ? 1 : 0, 5)
    }
    case 'rude':
      return out(
        [
          act('*You cut them short.*'),
          say(who, pick(who, ['Oh. Right. Sorry I asked.', 'Fine. Noted.'])),
          act(`*${n} turns away.*`),
        ],
        -3,
        1,
        { memory: 'rude' },
      )
    case 'chat':
      return out(
        [
          say(who, pick(who, CHAT[who.personality], rel.talks)),
          act('*You talk for a few minutes.*'),
        ],
        warmth,
        5,
      )
    case 'work':
      return out([say(who, pick(who, WORK_LINES, rel.talks))], counts ? 1 : 0, 4)
    case 'ask-help':
      if (rel.trust < 35)
        return out(
          [say(who, 'I am a bit swamped, honestly. Maybe ask the manager?')],
          0,
          2,
        )
      return out(
        [say(who, pick(who, ADVICE, rel.talks)), act('*It is genuinely useful.*')],
        0,
        5,
        { notes: ['A useful tip.'] },
      )
    case 'help-offer':
      if (!counts)
        return out(
          [say(who, 'You already helped today: I am fine, honestly. Thank you!')],
          0,
          1,
        )
      return out(
        [
          say(who, 'Would you? That would be brilliant.'),
          act(`*You spend a quarter of an hour helping ${n} sort it out.*`),
          say(who, 'I owe you one.'),
        ],
        3,
        15,
      )
    case 'feedback':
      return out(
        [
          say(
            who,
            rel.trust >= 60
              ? 'Honestly? You are doing well. Keep asking questions.'
              : 'Steady so far. Show me a bit more ownership of your work and I will notice.',
          ),
        ],
        0,
        5,
      )
    case 'guidance':
      if (who.kind === 'trainer')
        return out(
          [say(who, pick(who, FITNESS)), act(`*${n} shows you, slowly, twice.*`)],
          warmth,
          5,
          { notes: ['A fitness tip.'] },
        )
      return out(
        [
          say(
            who,
            'Finish what is due first, then the thing nobody else wants to do. People notice the second one.',
          ),
        ],
        counts ? 1 : 0,
        5,
      )
    case 'workload':
      return out(
        [
          say(
            who,
            'If it is too much, tell me early, not on the day. That is all I ask.',
          ),
        ],
        0,
        4,
      )
    case 'directions':
      return out(
        [
          say(
            who,
            "Kitchen at the back left, the manager's office back right, the printer by the windows. Toilets past the kitchen.",
          ),
        ],
        0,
        2,
      )
    case 'visitors':
      return out(
        [
          say(
            who,
            pick(who, [
              'Two suppliers this afternoon, and a courier who is always late.',
              'Nobody booked in. A quiet day, touch wood.',
            ]),
          ),
        ],
        0,
        2,
      )
    case 'report':
      return out(
        [say(who, 'Noted. If it is the printer again, I know. Believe me, I know.')],
        counts ? 1 : 0,
        2,
      )
    case 'order':
      if (who.kind === 'courier')
        return out([say(who, 'One order, your name on it. All paid for.')], 0, 1)
      return out(
        [say(who, 'Coming right up. Grab it at the end of the counter.')],
        0,
        0,
        { action: 'cafe-coffee' },
      )
    case 'menu':
      return out([say(who, 'The banana bread. Always the banana bread.')], 0, 1)
    case 'checkout':
      return out(
        [say(who, 'Grab a basket and bring it over when you are ready.')],
        0,
        0,
        { action: 'shop-groceries' },
      )
    case 'products':
      return out(
        [
          say(
            who,
            pick(who, [
              'Aisle two, by the bread. If it is not there, it is gone.',
              'Fresh things are by the door; tins at the back.',
            ]),
          ),
        ],
        0,
        1,
      )
    case 'offers':
      return out([say(who, 'Reduced stickers go on about an hour before closing.')], 0, 1)
    case 'bikes':
      return out(
        [
          say(
            who,
            'A bike is the cheapest way across town. Buy one at the counter; sell it back any time.',
          ),
        ],
        0,
        3,
      )
    case 'cars':
      return out(
        [
          say(
            who,
            'Leasing is a monthly cost, plus fuel and insurance. Worth it only if you really drive.',
          ),
        ],
        0,
        3,
      )
    case 'advice':
      return out(
        [
          say(
            who,
            'Pump your tyres every fortnight. That is half of all my work, right there.',
          ),
        ],
        warmth,
        3,
      )
    case 'classes':
      return out(
        [say(who, 'Classes run on the hour, in the studio. Just turn up.')],
        0,
        2,
      )
    case 'equipment':
      return out(
        [say(who, 'Start light. Nobody is watching you as much as you think.')],
        0,
        3,
      )
    case 'class':
      return out([say(who, 'Brilliant. Grab a mat.')], 0, 0, { action: 'gym-class' })
    case 'tips':
      return out([say(who, pick(who, FITNESS))], counts ? 1 : 0, 2)
    case 'local':
      return out(
        [
          say(
            who,
            pick(who, [
              'There is a quiz at the café on Thursdays. Terrible questions, great cake.',
              'The park gets lovely in the evening. Bring a jumper.',
            ]),
          ),
        ],
        warmth,
        4,
      )
    case 'invite':
      if (rel.trust < 50 && rel.talks < 2)
        return out(
          [say(who, 'Oh, that is kind. Let us get to know each other first, maybe?')],
          0,
          2,
        )
      return out(
        [say(who, 'I would like that. The café on the corner? Say the word.')],
        counts ? 2 : 0,
        3,
      )
    case 'recommend':
      return out(
        [
          say(
            who,
            pick(who, ['The soup. Every time.', 'Honestly? Everything here is good.']),
          ),
        ],
        counts ? 1 : 0,
        2,
      )
    case 'thank':
      return out([say(who, 'No problem at all. Enjoy!')], 0, 1)
    case 'problem':
      return out(
        [
          say(
            who,
            'Sorry about that. Report it in the app and they will refund that part. I will mention it too.',
          ),
        ],
        0,
        2,
      )
  }
  return out([act(`*${n} nods.*`)], 0, 0)
}

const CHAT: Record<Personality, string[]> = {
  warm: [
    'Honestly, the best part of this week was the cake in the kitchen. Did you get any?',
    'How are you settling in? It took me months to find the good mugs.',
  ],
  quiet: [
    'I am reading a book about lighthouses. It is better than it sounds.',
    'It is a calm one today. I like those.',
  ],
  chatty: [
    'So I tried that new place by the station. Long story. You will not believe the queue.',
    'My cat learned to open the fridge. I have no idea what to do with that information.',
  ],
  dry: [
    'Another day, another meeting that could have been an email.',
    'The coffee machine and I have reached an understanding. It wins.',
  ],
  focused: [
    'Busy, but good busy. You?',
    'I am trying to get one thing finished before lunch. One thing!',
  ],
}

const WORK_LINES = [
  'Reconciling last month: the numbers nearly add up, which is the worst kind.',
  'A report for the manager. Due Friday. It will be due Friday until Thursday night.',
  'Chasing three people for the same answer.',
  'Tidying a spreadsheet nobody has touched since 2019.',
]

const ADVICE = [
  'Write down what you were asked, in their words. Then check it before you send.',
  'If you are stuck for more than half an hour, ask. Nobody minds the question; they mind the silence.',
  'Name your files with the date first. You will thank me in a month.',
]

const JOIN_LINES = [
  'We were just arguing about the best biscuit. Settle it.',
  'Perfect timing: we needed someone neutral.',
]
const JOIN_REPLIES = [
  'Do not listen to them: they think plain is a flavour.',
  'Neutral! Ha. Pick a side.',
]

const FITNESS = [
  'Slow on the way down. That is where the work is.',
  'Drink before you are thirsty, and rest a day between heavy sessions.',
  'Little and often beats big and rarely.',
]

/** How the player stands with someone, from the save. */
export function relationOf(profile: ProfileData, id: string): Relation {
  const rel = profile.work.relationships[id]
  return {
    trust: trustOf(profile.work, id),
    talks: rel?.talks ?? 0,
    today: profile.work.today.talks[id] ?? 0,
    last: rel?.last,
    ...(adultOf(id)
      ? {
          bond: bondOf(profile.work.life, id),
          day: profile.work.day,
          together: profile.work.life.partner?.id === id,
        }
      : {}),
  }
}

/** Remembers a conversation: trust, how many talks, today's count and what was said. */
export function recordEncounter(
  profile: ProfileData,
  ids: string[],
  outcome: Pick<Outcome, 'trust' | 'memory'>,
): ProfileData {
  let work = profile.work
  for (const id of ids) {
    const rel = work.relationships[id]
    const trust = Math.min(
      100,
      Math.max(0, Math.round(trustOf(work, id) + outcome.trust)),
    )
    work = {
      ...work,
      relationships: {
        ...work.relationships,
        [id]: { trust, talks: (rel?.talks ?? 0) + 1, last: outcome.memory },
      },
      today: {
        ...work.today,
        talks: { ...work.today.talks, [id]: (work.today.talks[id] ?? 0) + 1 },
      },
    }
  }
  return { ...profile, work }
}

/** Nothing was really said (a wave and "later"): nothing to remember. */
const PASSING = new Set(['leave', 'later'])

/**
 * The result of something said: remembered by everyone in the conversation,
 * and the time it took (in the office, a short break; out and about, the
 * evening moves on, and a friendly chat helps the player's social need).
 */
export function holdEncounter(
  profile: ProfileData,
  ids: string[],
  outcome: Outcome,
  where: 'office' | 'out',
): ProfileData {
  if (PASSING.has(outcome.memory) && outcome.minutes === 0) return profile
  let next = recordEncounter(profile, ids, outcome)
  if (outcome.bond) {
    let life = withBond(next.work.life, ids[0], outcome.bond)
    // Said yes to moving in: they live here from today.
    if (
      outcome.memory === 'move-in' &&
      outcome.notes.some((n) => n.includes('moving in'))
    )
      life = movedIn(
        life,
        ids[0],
        next.work.day,
        outcome.lines.find((l) => l.speaker)?.speaker ?? 'them',
      )
    next = { ...next, work: { ...next.work, life } }
  }
  if (outcome.minutes <= 0) return next
  if (where === 'office') return restFor(next, 'chat', outcome.minutes)
  const life = next.work.life
  const social = outcome.trust > 0 ? 3 : 0
  const needs = decayed(life.needs, outcome.minutes)
  next = withLife(next, {
    ...life,
    minute: life.minute + outcome.minutes,
    needs: { ...needs, social: Math.min(100, needs.social + social) },
  })
  return next
}
