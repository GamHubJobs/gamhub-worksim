/**
 * Workplace events: requests, mistakes, recognition, tension and decisions.
 *
 * Events are never random. Each one is caused by the player's own situation
 * (their results, workload, deadlines, relationships or wellbeing), so it
 * always feels connected to what they did. At most one event waits for the
 * player at a time, and only during working hours. Some requests lapse if
 * ignored for too long, with a small, explained consequence.
 */
import { getAssignment } from '../content/assignments'
import { HOURS } from '../content/workday'
import { fill, findPerson } from '../content/departments'
import { bestScore, firstName, isPassed, type ProfileData } from './career'
import { weekNumber } from './clock'
import { now } from './deadlines'
import { isMentor } from './conversations'
import type { Dialogue } from './office'
import { currentTask, fillDialogue } from './office'
import { trustOf } from './relationships'
import {
  applyEffects,
  choiceMade,
  recordScene,
  sceneDone,
  type Choice,
  type Effects,
} from './scenes'
import { hasOverdueWork, openTasks } from './workday'

export interface WorkplaceEvent {
  id: string
  /** Who comes to the player. */
  person: string
  /** What they say when they arrive, e.g. "Got a minute?". */
  opener: string
  /** When the event happens. Checked after every change. */
  trigger: (profile: ProfileData) => boolean
  scene: (profile: ProfileData) => { lines: string[]; choices: Choice[] }
  /** Office minutes the person waits before giving up. */
  expiresAfter?: number
  /** What happens if the player never responds. */
  ignored?: { effects: Effects; log: string }
}

const passed = (profile: ProfileData, assignmentId: string) => {
  const assignment = getAssignment(assignmentId)
  return assignment ? isPassed(assignment, profile.assignments[assignmentId]) : false
}

const passedCount = (profile: ProfileData) =>
  Object.keys(profile.assignments).filter((id) => passed(profile, id)).length

const duringWork = (profile: ProfileData, from = HOURS.start, until = HOURS.end) =>
  profile.work.minute >= from && profile.work.minute < until

/** The latest submission of each assignment, newest first. */
function latestAttempts(profile: ProfileData) {
  return Object.values(profile.assignments)
    .flatMap((progress) =>
      progress.attempts.map((attempt, index) => ({
        assignmentId: progress.assignmentId,
        attempt,
        index,
      })),
    )
    .sort((a, b) => b.attempt.submittedAt - a.attempt.submittedAt)
}

// ---------------------------------------------------------------------------
// Events that happen once per career
// ---------------------------------------------------------------------------

const ONE_OFF: WorkplaceEvent[] = [
  {
    id: 'tom-favour',
    person: 'facilities',
    opener: 'Got a minute? I am drowning in boxes.',
    trigger: (p) =>
      passedCount(p) >= 1 &&
      duringWork(p, 10 * 60, 16 * 60) &&
      !hasOverdueWork(p.work) &&
      p.work.wellbeing.stress < 70,
    expiresAfter: 60,
    ignored: {
      effects: { trust: { facilities: -2 } },
      log: 'You never got back to Tom about the delivery',
    },
    scene: (p) => {
      const busy = openTasks(p).length > 0
      return {
        lines: [
          'The new printer supplies arrived and the delivery note does not match what is on the pallet. Could you help me count the boxes against the note? Fifteen minutes, tops.',
        ],
        choices: [
          {
            id: 'help',
            label: 'Help him now',
            reply: [
              '*You count while Tom reads out the note. Two boxes of toner are missing.*',
              'Knew it! I will get onto the supplier. Thanks, I owe you a coffee.',
            ],
            effects: {
              minutes: 15,
              trust: { facilities: 6 },
              reputation: 1,
              wellbeing: { engagement: 3 },
              log: { text: 'Helped Tom check a delivery', tone: 'good' },
            },
            lesson:
              'Small favours build goodwill that comes back when you need help. Fifteen minutes is often a good investment.',
          },
          {
            id: 'later',
            label: busy
              ? 'Explain you are finishing a task, and offer to help after'
              : 'Say you will come by later',
            reply: busy
              ? ['Fair enough, deadlines first. I will rope in Nina.']
              : ['*Tom glances at your empty screen.*', 'Right. Sure. Later.'],
            effects: busy ? { trust: { facilities: 1 } } : { trust: { facilities: -3 } },
            lesson: busy
              ? 'Saying no with a reason, and offering an alternative, keeps the relationship intact.'
              : 'People notice when "later" really means "no". If you have time, it is better to help or to say no honestly.',
          },
        ],
      }
    },
  },
  {
    id: 'priya-urgent',
    person: 'manager',
    opener: 'I need a favour, quickly.',
    trigger: (p) => {
      if (passedCount(p) < 2 || !duringWork(p, 10 * 60, 15 * 60)) return false
      if (p.work.wellbeing.stress >= 60 || hasOverdueWork(p.work)) return false
      // Only when the player is not about to miss a deadline.
      const soon = Object.values(p.work.deadlines).some(
        (d) => d.status === 'open' && d.due - now(p.work) < 120,
      )
      return !soon
    },
    scene: (p) => {
      const task = currentTask(p)
      return {
        lines: [
          'The finance director wants the October expense total for her board pack before three o’clock.',
          '{senior} pulled it together this morning, but I have not had time to check it. Could you go through it? Twenty minutes.',
        ],
        choices: [
          {
            id: 'yes',
            label: 'Say yes and do it now',
            reply: ['Thank you. Send me anything odd straight away.'],
            effects: {
              minutes: 20,
              trust: { manager: 3 },
              reputation: 1,
              wellbeing: { stress: 3, engagement: 3 },
              log: { text: 'Checked the expense total for {manager}', tone: 'good' },
            },
            lesson:
              'Urgent requests from your manager are a chance to show you are dependable. Do them well, and say so if they affect your other work.',
          },
          ...(task
            ? [
                {
                  id: 'prioritise',
                  label: `Ask whether it should come before “${task.assignment.title}”`,
                  reply: [
                    'Good question. Yes, this first. I will push your deadline back a day so you are not squeezed.',
                  ],
                  effects: {
                    minutes: 20,
                    extend: task.assignment.id,
                    trust: { manager: 4 },
                    reputation: 1,
                    log: {
                      text: 'Agreed priorities with {manager}',
                      tone: 'good' as const,
                    },
                  },
                  lesson:
                    'When a new request clashes with existing work, ask which comes first. It protects your deadlines and shows you think about priorities.',
                },
              ]
            : []),
          {
            id: 'no',
            label: 'Say you do not have time',
            reply: ['*A pause.*', 'Okay. I will find someone else.'],
            effects: { trust: { manager: task ? -1 : -4 } },
            lesson: task
              ? 'Saying no to your manager is sometimes right, but explaining your workload and asking about priorities is usually better.'
              : 'Turning down your manager when you have capacity is noticed.',
          },
        ],
      }
    },
  },
  {
    id: 'marcus-error',
    person: 'senior',
    opener: 'You have found something in {senior}’s figures.',
    trigger: (p) => {
      const choice = choiceMade(p, 'priya-urgent')
      return choice === 'yes' || choice === 'prioritise'
    },
    scene: () => ({
      lines: [
        '*Going through the expense total, you find that one claim, £480 for training, was left out. {senior}’s total is too low.*',
        '*{manager} needs the figure by three. {senior} is at his desk.*',
      ],
      choices: [
        {
          id: 'tell-marcus',
          label: 'Tell {senior} privately first, so he can correct it',
          reply: [
            '*{senior} checks, and winces.*',
            '{senior}: “You are right. I filtered on the wrong date. Thanks for coming to me first. I will tell {manager} myself.”',
          ],
          effects: { trust: { senior: 8, manager: 2 }, reputation: 2 },
          lesson:
            'Giving a colleague the chance to fix their own mistake, while making sure it is fixed, is honest and respectful. It turns a potential rival into an ally.',
        },
        {
          id: 'tell-priya',
          label: 'Report it straight to {manager}',
          reply: [
            '{manager}: “Good catch, thank you. I will sort it out with {senior}.”',
            '*Later, {senior} is noticeably cooler towards you.*',
          ],
          effects: { trust: { manager: 3, senior: -4 }, reputation: 1 },
          lesson:
            'Reporting the error is honest, and the figure gets fixed. Going around a colleague can cost you their trust, though; talking to them first is often better when time allows.',
        },
        {
          id: 'quiet-fix',
          label: 'Quietly correct the number and say nothing',
          reply: [
            '*The board pack goes out with the right figure. Nobody knows there was a problem, including {senior}, who will make the same mistake next month.*',
          ],
          effects: { trust: { manager: -1 } },
          lesson:
            'Silent fixes hide problems instead of solving them. Transparency lets the team learn and prevents the same mistake next time.',
        },
      ],
    }),
  },
  {
    id: 'recognition',
    person: 'manager',
    opener: 'Have you got a second? Good news.',
    trigger: (p) =>
      duringWork(p) &&
      latestAttempts(p).some(({ attempt, index }) => index === 0 && attempt.score >= 90),
    scene: (p) => {
      const mentored = isMentor(p) || choiceMade(p, 'marcus-intro') === 'learn'
      return {
        lines: [
          '{director} saw your work this week and asked who did it. I said it was our newest team member.',
          'First time, no corrections. That does not happen often. Well done.',
        ],
        choices: [
          ...(mentored
            ? [
                {
                  id: 'credit-team',
                  label: 'Thank {manager}, and mention that {senior}’s advice helped',
                  reply: [
                    'That is generous of you. I will make sure {senior} hears it.',
                    '*{senior} gives you a nod from across the room later.*',
                  ],
                  effects: {
                    trust: { manager: 2, senior: 6 },
                    reputation: 2,
                    wellbeing: { engagement: 5 },
                  },
                  lesson:
                    'Sharing credit costs you nothing and builds strong relationships. People remember who acknowledged them.',
                },
              ]
            : []),
          {
            id: 'thanks',
            label: 'Thank {manager}',
            reply: ['You earned it. Keep it up.'],
            effects: {
              trust: { manager: 1 },
              reputation: 2,
              wellbeing: { engagement: 5 },
            },
            lesson: 'Accepting praise simply and graciously is a professional skill.',
          },
          {
            id: 'downplay',
            label: 'Say it was nothing, anyone could have done it',
            reply: [
              'It was not nothing. Learn to take a compliment; you will need it when you ask for a promotion.',
            ],
            effects: { reputation: 1, wellbeing: { engagement: 3 } },
            lesson:
              'Downplaying good work can make others undervalue it too. A simple "thank you" is enough.',
          },
        ],
      }
    },
  },
  {
    id: 'marcus-jealous',
    person: 'senior',
    opener: 'Must be nice being the favourite.',
    trigger: (p) =>
      sceneDone(p, 'recognition') &&
      choiceMade(p, 'recognition') !== 'credit-team' &&
      trustOf(p.work, 'senior') < 65 &&
      duringWork(p),
    scene: () => ({
      lines: [
        'Heard about the director. Must be nice, being the favourite after a week.',
        'Some of us have been doing this for five years.',
      ],
      choices: [
        {
          id: 'acknowledge',
          label: 'Acknowledge {senior}’s experience, and ask for input on your next task',
          reply: [
            '*{senior} is caught off guard.*',
            '…Fine. Bring it over when you start it. I will show you how I check the totals.',
          ],
          effects: { trust: { senior: 8 }, wellbeing: { stress: -2 } },
          lesson:
            'Jealousy often comes from feeling overlooked. Recognising someone’s experience, sincerely, usually defuses it.',
        },
        {
          id: 'professional',
          label: 'Ignore the remark and stay professional',
          reply: ['*{senior} shrugs and turns back to the screen.*'],
          effects: { wellbeing: { stress: 2 } },
          lesson:
            'Not reacting avoids escalation, but the tension remains. A direct, friendly conversation can resolve it.',
        },
        {
          id: 'snap',
          label: 'Say that maybe {senior} should work harder, then',
          reply: ['*The open-plan office goes very quiet.*'],
          effects: {
            trust: { senior: -8 },
            reputation: -3,
            wellbeing: { stress: 5 },
          },
          lesson:
            'Responding to a jab with a jab makes you look like part of the problem, in front of everyone.',
        },
        {
          id: 'complain',
          label: 'Complain to {manager} about {senior}’s attitude',
          reply: [
            '{manager}: “I will keep an eye on it. But have you tried talking to {senior} directly? There is a good colleague under all that pressure.”',
          ],
          effects: { trust: { manager: -1, senior: -4 } },
          lesson:
            'Escalating to your manager is right for serious or repeated behaviour. For a one-off remark, try a direct conversation first.',
        },
      ],
    }),
  },
  {
    id: 'credit-taking',
    person: 'manager',
    opener: 'Great catch on those expense claims.',
    trigger: (p) =>
      passed(p, 'expense-summary') &&
      p.assignments['invoice-check'] !== undefined &&
      trustOf(p.work, 'senior') < 65 &&
      duringWork(p),
    scene: (p) => ({
      lines: [
        '*{manager} stops by your desk on her way out of a meeting with the directors.*',
        '{senior} just walked the directors through the expense summary: the claims over the approval limit, the averages. Great catch on his part.',
        `Anyway, ${firstName(p.name)}, how is the invoice check going?`,
        '*It was your summary. {senior} presented it as his own.*',
      ],
      choices: [
        {
          id: 'clarify',
          label:
            'Calmly mention that you built that summary, and offer to walk her through it',
          reply: [
            '*{manager} pauses.*',
            'Did you? I did not realise. Yes, show me later. I want to know who did what.',
          ],
          effects: { trust: { manager: 2, senior: -2 }, reputation: 2 },
          lesson:
            'Stating facts calmly, without accusing anyone, makes sure your work is seen. Offering to walk someone through it is the strongest evidence.',
        },
        {
          id: 'talk-marcus',
          label: 'Say it is going well, then talk to {senior} privately',
          reply:
            trustOf(p.work, 'senior') >= 45
              ? [
                  '{senior}: “You are right, I should have said it was yours. I got carried away in the meeting. I will tell {manager}.”',
                  '*The next day, {manager} thanks you for the summary by name.*',
                ]
              : [
                  '{senior}: “It is a team effort. That is how it works here.”',
                  '*He does not correct it. You decide to keep copies of your work and name your files clearly from now on.*',
                ],
          effects:
            trustOf(p.work, 'senior') >= 45
              ? { trust: { senior: 4, manager: 1 }, reputation: 2 }
              : { trust: { senior: -1 }, wellbeing: { stress: 3 } },
          lesson:
            'Talking to the person first gives them a chance to put it right. If they do not, you can still raise it with your manager, calmly and with evidence.',
        },
        {
          id: 'call-out',
          label: 'Email the whole team that {senior} stole your work',
          reply: [
            '*The email causes a stir. {manager} calls you both in. The facts come out, but so does the impression that you prefer public confrontation.*',
          ],
          effects: {
            trust: { senior: -10, manager: -2 },
            reputation: -2,
            wellbeing: { stress: 6 },
          },
          lesson:
            'Public accusations damage everyone, including the person who is right. Raise it privately first.',
        },
        {
          id: 'let-go',
          label: 'Let it go; it is not worth the trouble',
          reply: [
            '*You say the invoices are going fine. The summary stays “{senior}’s”.*',
          ],
          effects: { wellbeing: { stress: 4, engagement: -3 } },
          lesson:
            'Letting small things go can be wise, but if your contributions are regularly invisible it will affect your reviews and promotion. Speak up calmly.',
        },
      ],
    }),
  },
  {
    id: 'priya-pressure',
    person: 'manager',
    opener: 'We need to talk about that deadline.',
    trigger: (p) =>
      duringWork(p) && Object.values(p.work.deadlines).some((d) => d.status === 'late'),
    scene: () => ({
      lines: [
        '*{manager} looks tired and short-tempered.*',
        'I needed that work yesterday. I had to tell the director it was not ready. I do not have time to chase people.',
      ],
      choices: [
        {
          id: 'calm',
          label: 'Stay calm, acknowledge it, and ask what {manager} needs first',
          reply: [
            '*{manager}’s shoulders drop a little.*',
            'Get me the task by the end of today, and next time tell me before the deadline if it is slipping. That is all I ask.',
          ],
          effects: { trust: { manager: 4 }, wellbeing: { stress: -2 } },
          lesson:
            'When a manager is under pressure, respond to the need, not the tone: acknowledge, ask what matters most, and agree a plan.',
        },
        {
          id: 'excuses',
          label: 'Explain at length why it was not your fault',
          reply: [
            'I am not interested in whose fault it is. I am interested in when it will be done.',
          ],
          effects: { trust: { manager: -3 }, wellbeing: { stress: 3 } },
          lesson:
            'Excuses, even true ones, sound like blame when someone is under pressure. Focus on the fix first; discuss causes later.',
        },
        {
          id: 'overwork',
          label: 'Say nothing, and plan to work late tonight',
          reply: [
            '*{manager} nods and leaves. You feel the evening disappearing already.*',
          ],
          effects: { wellbeing: { stress: 6, energy: -5 } },
          lesson:
            'Silently absorbing pressure leads to exhaustion. It is better to agree a realistic plan out loud.',
        },
      ],
    }),
  },
]

// ---------------------------------------------------------------------------
// Events that can happen more than once (with their own IDs)
// ---------------------------------------------------------------------------

/** {manager} follows up on a submission that did not pass, once per task. */
function mistakeEvent(profile: ProfileData): WorkplaceEvent | null {
  const latest = latestAttempts(profile)[0]
  if (!latest || latest.attempt.rating !== 'fail') return null
  const assignment = getAssignment(latest.assignmentId)
  if (!assignment) return null
  const best = bestScore(profile.assignments[assignment.id]) ?? 0
  return {
    id: `mistake:${assignment.id}`,
    person: 'manager',
    opener: `About your “${assignment.title}”…`,
    trigger: (p) => duringWork(p),
    scene: () => ({
      lines: [
        `I have been through your “${assignment.title}”. It came back at ${best}%, and some of those numbers would have gone straight into a report.`,
        'What happened?',
      ],
      choices: [
        {
          id: 'own-it',
          label: 'Own it, and explain how you will check your work next time',
          reply: [
            'That is the right attitude. Everyone makes mistakes; what matters is that you catch them before they leave the building.',
          ],
          effects: { trust: { manager: 3 }, wellbeing: { stress: -2 } },
          lesson:
            'Owning a mistake and explaining how you will prevent it builds more trust than never making one.',
        },
        {
          id: 'blame',
          label: 'Say the instructions were unclear',
          reply: [
            'Then ask me before you submit. The instructions have been the same for every intern.',
          ],
          effects: { trust: { manager: -4 }, reputation: -1 },
          lesson:
            'Blaming the instructions or the data, even when partly true, makes it sound like you will not learn from it. Ask questions before, own the result after.',
        },
        {
          id: 'self-doubt',
          label: 'Apologise and say you might not be cut out for this',
          reply: [
            '*{manager}’s tone softens.*',
            'Stop that. You are a week in. Read the feedback, fix it, send it back. That is the job.',
          ],
          effects: { wellbeing: { stress: 4, engagement: -2 } },
          lesson:
            'Mistakes are part of learning, not a verdict on your ability. Focus on the fix.',
        },
      ],
    }),
  }
}

/** When the player is overloaded, {manager} checks in (at most once a week). */
function wellbeingEvent(profile: ProfileData): WorkplaceEvent {
  const week = weekNumber(profile.work.day)
  const earliest = Object.entries(profile.work.deadlines)
    .filter(([, d]) => d.status === 'open' && !d.extended)
    .sort((a, b) => a[1].due - b[1].due)[0]
  return {
    id: `wellbeing-check:${week}`,
    person: 'manager',
    opener: 'Are you okay? You look worn out.',
    trigger: (p) =>
      duringWork(p) && (p.work.wellbeing.stress >= 75 || p.work.wellbeing.fatigue >= 60),
    scene: () => ({
      lines: [
        'I have noticed you have been under a lot of pressure. Is everything okay?',
      ],
      choices: [
        {
          id: 'honest',
          label: 'Be honest about your workload',
          reply: earliest
            ? [
                'Thank you for telling me. I will move your next deadline by a day. And take a proper lunch today; that is an instruction.',
              ]
            : [
                'Thank you for telling me. Take a proper break today, and go home on time.',
              ],
          effects: {
            trust: { manager: 3 },
            wellbeing: { stress: -10 },
            ...(earliest ? { extend: earliest[0] } : {}),
          },
          lesson:
            'Telling your manager when you are overloaded is professional, not weak. They cannot fix problems they do not know about.',
        },
        {
          id: 'fine',
          label: 'Say you are fine',
          reply: ['Okay. My door is open if that changes.'],
          effects: {},
          lesson:
            'Hiding stress rarely makes it go away. Breaks, lunch and going home on time all help; so does asking for help.',
        },
      ],
    }),
  }
}

/** Reactions to the player's own results and conduct come before anything else. */
const REACTIONS = new Set([
  'recognition',
  'marcus-jealous',
  'priya-pressure',
  'marcus-error',
])

/** All events, most urgent first. */
function allEvents(profile: ProfileData): WorkplaceEvent[] {
  const mistake = mistakeEvent(profile)
  return [
    ...(mistake ? [mistake] : []),
    ...ONE_OFF.filter((event) => REACTIONS.has(event.id)),
    ...ONE_OFF.filter((event) => !REACTIONS.has(event.id)),
    wellbeingEvent(profile),
  ]
}

function findEvent(profile: ProfileData, id: string): WorkplaceEvent | undefined {
  return allEvents(profile).find((event) => event.id === id)
}

// ---------------------------------------------------------------------------
// Running events
// ---------------------------------------------------------------------------

/**
 * Starts the next event whose cause is present, and lets ignored requests
 * lapse. Call after every change to the profile.
 */
export function checkEvents(profile: ProfileData): ProfileData {
  const { work } = profile
  if (work.dayOver) return profile
  let next = profile

  // Events whose cause has gone (e.g. the task was fixed before {manager} came
  // over) are dropped; requests that waited too long lapse.
  const stale = work.events.pending.filter((p) => !findEvent(next, p.id))
  if (stale.length > 0) {
    next = {
      ...next,
      work: {
        ...next.work,
        events: {
          ...next.work.events,
          pending: next.work.events.pending.filter((p) => !stale.includes(p)),
        },
      },
    }
  }
  for (const pending of next.work.events.pending) {
    const event = findEvent(next, pending.id)
    if (!event?.expiresAfter || now(work) - pending.at < event.expiresAfter) continue
    next = recordScene(next, event.id, 'ignored')
    if (event.ignored) {
      next = applyEffects(next, {
        ...event.ignored.effects,
        log: { text: event.ignored.log, tone: 'bad' },
      })
    }
  }

  if (next.work.events.pending.length > 0) return next
  const due = allEvents(next).find(
    (event) => !sceneDone(next, event.id) && event.trigger(next),
  )
  if (!due) return next
  return {
    ...next,
    work: {
      ...next.work,
      events: {
        ...next.work.events,
        pending: [{ id: due.id, at: now(next.work) }],
      },
    },
  }
}

export interface PendingEvent {
  id: string
  person: string
  opener: string
}

export function pendingEvents(profile: ProfileData): PendingEvent[] {
  return profile.work.events.pending.flatMap((pending) => {
    const event = findEvent(profile, pending.id)
    return event
      ? [{ id: event.id, person: event.person, opener: fill(event.opener) }]
      : []
  })
}

/** The conversation for an event that is waiting for the player. */
export function eventScene(profile: ProfileData, id: string): Dialogue | null {
  const event = findEvent(profile, id)
  if (!event) return null
  return fillDialogue({
    id: event.id,
    speaker: event.person,
    title: findPerson(event.person)?.name ?? 'A colleague',
    actions: [],
    ...event.scene(profile),
  })
}
