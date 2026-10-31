/**
 * What happens in meetings. The conversation reflects the player's real
 * situation (their current task, deadlines, how they are doing) and offers
 * realistic ways to respond, each with a workplace lesson.
 */
import { getMeeting } from '../content/workday'
import { firstName, type ProfileData } from './career'
import { formatMoment } from './clock'
import type { Dialogue } from './office'
import { currentTask } from './office'
import type { Choice } from './scenes'

/** Meeting scenes are remembered per day, e.g. "meeting:standup:3". */
export function meetingSceneId(meetingId: string, day: number): string {
  return `meeting:${meetingId}:${day}`
}

function standupChoices(profile: ProfileData): { lines: string[]; choices: Choice[] } {
  const name = firstName(profile.name)
  const task = currentTask(profile)
  const intro = [
    'Morning, everyone. Quick round, two minutes each.',
    'Marcus: “Supplier statements for the month-end. Should be done by lunch.”',
    'Tom: “The new printers arrive at ten. If anything goes missing, it was not me.”',
  ]
  if (!task) {
    return {
      lines: [...intro, `${name}, you’re all caught up, aren’t you?`],
      choices: [
        {
          id: 'offer-help',
          label: 'Offer to help someone with their work',
          reply: [
            'Good offer. Marcus, could you use a second pair of eyes on the statements?',
            '*Marcus nods, a little surprised.*',
          ],
          effects: {
            trust: { manager: 2, senior: 2 },
            reputation: 1,
            wellbeing: { engagement: 3 },
          },
          lesson:
            'Finishing early is a chance to show you are a team player. Offering help builds trust quickly.',
        },
        {
          id: 'practice',
          label: 'Say you will practise your spreadsheet skills',
          reply: ['Sensible. The practice workbook is there for exactly that.'],
          effects: { wellbeing: { engagement: 1 } },
          lesson:
            'Investing quiet time in your skills pays off when the busy weeks come.',
        },
      ],
    }
  }

  const { assignment } = task
  const deadline = profile.work.deadlines[assignment.id]
  const late = deadline?.status === 'late'
  const due = deadline ? formatMoment(deadline.due, profile.work.day) : null
  const lines = [...intro, `${name}, what are you on today?`]

  if (late) {
    return {
      lines,
      choices: [
        {
          id: 'own-it',
          label: `Admit “${assignment.title}” is late and give a realistic new time`,
          reply: [
            'Thank you for being straight with me. Get it to me as soon as you can, and tell me if anything is in your way.',
          ],
          effects: { trust: { manager: 3 }, reputation: 1, wellbeing: { stress: -3 } },
          lesson:
            'When something slips, say so early and give a new time. Managers can plan around delays; they cannot plan around surprises.',
        },
        {
          id: 'dodge',
          label: 'Say it is “nearly done” and move on quickly',
          reply: [
            '*Priya gives you a long look.*',
            'Nearly done is not done. Let’s talk later.',
          ],
          effects: { trust: { manager: -3 }, wellbeing: { stress: 4 } },
          lesson:
            'Vague updates about late work erode trust faster than the delay itself.',
        },
      ],
    }
  }

  return {
    lines,
    choices: [
      {
        id: 'clear-update',
        label: `Give a clear update: working on “${assignment.title}”${due ? `, done by ${due.replace(/^today at /, '')}` : ''}`,
        reply: ['Perfect, that is exactly what I need. Thanks.'],
        effects: { trust: { manager: 2 }, reputation: 1 },
        lesson:
          'A good stand-up update says what you are doing, when it will be done, and whether anything is blocking you.',
      },
      {
        id: 'ask-help',
        label: 'Mention a part you are unsure about',
        reply: [
          'Thanks for flagging it early. Marcus, could you give ' +
            `${name} five minutes after this?`,
          'Marcus: “Sure. Grab me at my desk.”',
        ],
        effects: {
          trust: { manager: 2, senior: 1 },
          wellbeing: { stress: -4, engagement: 2 },
        },
        lesson:
          'Raising a problem early is a strength, not a weakness. It is much cheaper to fix now.',
      },
      {
        id: 'fine',
        label: 'Just say “It’s going fine”',
        reply: [
          'Okay… anything blocking you?',
          '*You shake your head, and Priya moves on.*',
        ],
        effects: {},
        lesson: '“Fine” gives your team nothing to plan with. Be specific, even briefly.',
      },
    ],
  }
}

function planningChoices(profile: ProfileData): { lines: string[]; choices: Choice[] } {
  const busy = currentTask(profile) !== null
  return {
    lines: [
      'Right, the rest of the week. Quarter-end is close, and the directors want the cost report early.',
      'Marcus will lead the report. I need someone to pull the supplier figures together for him.',
      'Any volunteers?',
    ],
    choices: [
      {
        id: 'volunteer',
        label: 'Volunteer to pull the figures together',
        reply: [
          'Great. Marcus, you have a helper.',
          'Marcus: “Fine by me. I will send you the list.”',
        ],
        effects: {
          trust: { manager: 3, senior: 2 },
          reputation: 2,
          wellbeing: { engagement: 4, stress: busy ? 6 : 2 },
        },
        lesson: busy
          ? 'Taking on extra work shows initiative, but it adds pressure when you are already busy. Make sure you can deliver both.'
          : 'Volunteering when you have capacity is one of the fastest ways to build a reputation.',
      },
      {
        id: 'capacity',
        label: busy
          ? 'Explain that you want to finish your current task first'
          : 'Stay quiet and let someone else take it',
        reply: busy
          ? ['That is fair. Finish what you have; I would rather have that done well.']
          : ['*After a pause, Marcus sighs.*', 'Marcus: “I will do it myself, then.”'],
        effects: busy
          ? { trust: { manager: 1 }, wellbeing: { stress: -2 } }
          : { trust: { senior: -2 }, wellbeing: { engagement: -2 } },
        lesson: busy
          ? 'Being honest about your capacity is professional. Overcommitting and missing deadlines is worse than saying no.'
          : 'Staying silent when you have time is noticed, even if nobody says so.',
      },
    ],
  }
}

/**
 * The scene for a meeting the player has just joined, or null if the
 * meeting has no scene (e.g. one handled elsewhere).
 */
export function meetingScene(profile: ProfileData, meetingId: string): Dialogue | null {
  const meeting = getMeeting(meetingId)
  if (!meeting) return null
  const base = {
    id: meetingSceneId(meeting.id, profile.work.day),
    speaker: meeting.host,
    title: meeting.title,
    actions: [],
  }
  if (meeting.id === 'standup') return { ...base, ...standupChoices(profile) }
  if (meeting.id === 'planning') return { ...base, ...planningChoices(profile) }
  return {
    ...base,
    lines: [
      `Come in, ${firstName(profile.name)}. How has your week been?`,
      'We will go through your work properly in a moment. First: is there anything you need from me?',
    ],
  }
}
