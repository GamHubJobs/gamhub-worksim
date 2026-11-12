/**
 * Weekly performance reviews. The manager reviews the player's week at Friday's
 * one-to-one (or by email, if the meeting does not happen) on four areas:
 * quality of work, reliability, teamwork and professionalism. Wellbeing is
 * discussed but never scored. A good enough review is needed for promotion
 * beyond Junior Finance Assistant.
 */
import { createId } from '../lib/ids'
import type { MailMessage, Review } from '../persistence/schemas'
import {
  advanceCareer,
  bestScore,
  firstName,
  promotionProgress,
  type ProfileData,
  type ReviewRating,
} from './career'
import { splitTime, weekdayIndex, weekNumber } from './clock'
import { fillDialogue, type Dialogue } from './office'
import { fill } from '../content/departments'
import { reputationReading, trustOf } from './relationships'
import type { Choice } from './scenes'
import { log } from './workday'

export const REVIEW_AREAS = [
  { id: 'quality', name: 'Quality of work' },
  { id: 'reliability', name: 'Reliability' },
  { id: 'teamwork', name: 'Teamwork' },
  { id: 'professionalism', name: 'Professionalism' },
] as const

type Area = (typeof REVIEW_AREAS)[number]['id']

const TEAM = ['manager', 'senior', 'reception', 'facilities']

export const RATING_NAMES: Record<ReviewRating, string> = {
  outstanding: 'Outstanding',
  strong: 'Strong',
  solid: 'Solid',
  developing: 'Developing',
}

const band = (value: number, limits: [number, number, number, number]) =>
  value >= limits[0]
    ? 5
    : value >= limits[1]
      ? 4
      : value >= limits[2]
        ? 3
        : value >= limits[3]
          ? 2
          : 1

function weekDays(profile: ProfileData) {
  const week = weekNumber(profile.work.day)
  const past = profile.work.history.filter((day) => weekNumber(day.day) === week)
  return { week, past }
}

/** The review of the current week, from the player's real record. */
export function reviewFor(profile: ProfileData): Review {
  const { work } = profile
  const { week, past } = weekDays(profile)

  // Quality: the best results on every task attempted so far.
  const scores = Object.keys(profile.assignments)
    .map((id) => bestScore(profile.assignments[id]))
    .filter((score): score is number => score !== null)
  const averageScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : null
  const quality = averageScore === null ? 3 : band(averageScore, [95, 85, 75, 60])

  // Reliability: deadlines this week, meetings this week (including today).
  const lateDeadlines = Object.values(work.deadlines).filter(
    (d) => d.status === 'late' && weekNumber(splitTime(d.due).day) === week,
  ).length
  const todaysMeetings = work.dayOver ? [] : Object.values(work.today.meetings)
  const meetingsMissed =
    past.reduce((sum, day) => sum + day.meetingsMissed, 0) +
    todaysMeetings.filter((m) => m === 'missed').length
  const lateArrivals = todaysMeetings.filter((m) => m === 'late').length
  const reliability = Math.max(
    1,
    Math.min(
      5,
      Math.round(5 - 1.5 * lateDeadlines - meetingsMissed - 0.5 * lateArrivals),
    ),
  )

  // Teamwork: how much the team trusts the player.
  const trust = TEAM.reduce((sum, id) => sum + trustOf(work, id), 0) / TEAM.length
  const teamwork = band(trust, [72, 62, 50, 40])

  // Professionalism: the player's reputation in the office.
  const professionalism = band(work.reputation, [72, 60, 48, 36])

  const scoresByArea: Record<Area, number> = {
    quality,
    reliability,
    teamwork,
    professionalism,
  }
  const average = (quality + reliability + teamwork + professionalism) / 4
  const rating: ReviewRating =
    average >= 4.5
      ? 'outstanding'
      : average >= 3.75
        ? 'strong'
        : average >= 2.75
          ? 'solid'
          : 'developing'

  const strengths: string[] = []
  const improvements: string[] = []
  if (quality >= 4)
    strengths.push('Your work is accurate: I can use it without re-checking.')
  else if (averageScore === null)
    improvements.push(
      'I have not seen much of your work yet. Submitting tasks is how I can judge it.',
    )
  else if (quality <= 2)
    improvements.push(
      'Check your work before submitting: use the task hints and test that totals update when the data changes.',
    )
  if (reliability >= 5) strengths.push('You meet your deadlines and turn up to meetings.')
  else if (reliability <= 3)
    improvements.push(
      'Reliability: be on time for meetings and tell me early if a deadline is at risk.',
    )
  if (teamwork >= 4) strengths.push('The team enjoys working with you.')
  else if (teamwork <= 2)
    improvements.push(
      'Invest in your relationships: talk to people, help when you can, handle disagreements calmly.',
    )
  if (professionalism >= 4) strengths.push('People across the office speak well of you.')
  else if (professionalism <= 2)
    improvements.push(
      'Your reputation needs rebuilding: reliability and calm, honest choices will get it there.',
    )

  // Wellbeing is discussed, never scored.
  const overtime = past.reduce((sum, day) => sum + day.overtimeMinutes, 0)
  const skippedLunches = past.filter((day) => !day.lunch).length
  if (overtime >= 120 || skippedLunches >= 2 || work.wellbeing.fatigue >= 60) {
    improvements.push(
      'Look after yourself: take your lunch break and go home on time. Tired people make mistakes, and I need you here for the long run.',
    )
  }
  // IT service evidence, from the Help Desk tasks' recorded results.
  const it = itServiceEvidence(profile)
  strengths.push(...it.strengths)
  improvements.push(...it.improvements)

  if (strengths.length === 0) strengths.push('You are settling in and learning quickly.')

  return {
    day: work.day,
    week,
    rating,
    scores: scoresByArea,
    strengths,
    improvements,
  }
}

/**
 * What the IT manager says about the player's service desk work, from the
 * checks recorded on their Help Desk task attempts (the latest of each):
 * technical fixes, security compliance, communication, documentation,
 * prioritisation and SLAs, and how much they worked without hints. Only
 * areas with recorded results are mentioned.
 */
export function itServiceEvidence(profile: ProfileData): {
  strengths: string[]
  improvements: string[]
} {
  const strengths: string[] = []
  const improvements: string[] = []
  if (profile.careerId !== 'it-support') return { strengths, improvements }
  const attempts = Object.values(profile.assignments)
    .map((p) => p.attempts.at(-1))
    .filter((a) => a !== undefined)
  const checks = attempts.flatMap((a) => a.checks)
  const area = (match: (id: string) => boolean) => {
    const found = checks.filter((c) => match(c.id))
    if (found.length === 0) return null
    return (
      found.reduce((sum, c) => sum + (c.points ? c.earned / c.points : 0), 0) /
      found.length
    )
  }
  const areas: Array<[number | null, string, string]> = [
    [
      area((id) => id.endsWith('-fixed')),
      'Your fixes hold: the systems show the problems really solved, not just marked resolved.',
      'Several problems you handled were not actually fixed: check in the systems before you close a ticket.',
    ],
    [
      area((id) => id === 'policy' || id === 'accurate'),
      'You follow security procedure: verification before changes, and the right account and device contained.',
      'Security procedure needs attention: verify first, and act only on what the evidence shows.',
    ],
    [
      area((id) => id.startsWith('call-')),
      'People like dealing with you on the phone: you listen, explain simply and say what happens next.',
      'Work on your calls: ask before suggesting, avoid jargon, and close with what happens next.',
    ],
    [
      area((id) => id.endsWith('-reply') || id === 'report'),
      'Your write-ups are clear: people know what happened and what you did.',
      'Your ticket replies and reports need more: what was wrong, what you did, what they should do.',
    ],
    [
      area((id) => id === 'priorities' || id === 'sla'),
      'You prioritise by business impact and meet the service levels.',
      'Prioritise by business impact, and watch the time left on each ticket’s SLA.',
    ],
  ]
  for (const [rate, good, bad] of areas) {
    if (rate === null) continue
    if (rate >= 0.8) strengths.push(good)
    else if (rate < 0.5) improvements.push(bad)
  }
  const helpDesk = attempts.filter((a) => a.hintsUsed !== undefined)
  const independent = helpDesk.filter((a) => a.hintsUsed === 0).length
  if (helpDesk.length >= 2 && independent === helpDesk.length)
    strengths.push(
      'You troubleshoot independently: no hints needed on your recent tickets.',
    )
  else if (helpDesk.length >= 2 && independent === 0)
    improvements.push(
      'You lean on the hints: try the Knowledge Base and the tools first, then a hint if you are stuck.',
    )
  return { strengths, improvements }
}

export function hasReviewThisWeek(profile: ProfileData): boolean {
  const week = weekNumber(profile.work.day)
  return profile.work.reviews.some((review) => review.week === week)
}

function reviewMail(
  profile: ProfileData,
  review: Review,
  inPerson: boolean,
  now: number,
): MailMessage {
  const name = firstName(profile.name)
  const scores = REVIEW_AREAS.map(
    (area) => `• ${area.name}: ${review.scores[area.id]} out of 5`,
  ).join('\n')
  const promotion = promotionProgress(profile)
  return {
    id: createId(),
    from: 'manager',
    kind: 'review',
    receivedAt: now,
    readAt: null,
    subject: `Your week ${review.week} review: ${RATING_NAMES[review.rating]}`,
    body: fill(`Hi ${name},

${inPerson ? 'Thanks for our one-to-one today. As promised, here is your review in writing.' : 'We didn’t manage to have our one-to-one this week, so here is your review in writing. Let’s make sure we meet next Friday.'}

Overall: **${RATING_NAMES[review.rating]}**

${scores}

What is going well:
${review.strengths.map((s) => `• ${s}`).join('\n')}
${review.improvements.length ? `\nWhat to work on:\n${review.improvements.map((s) => `• ${s}`).join('\n')}\n` : ''}
${promotion.next ? `For promotion to ${promotion.next.title} I will be looking at your XP, your tasks, your reputation${promotion.next.minReview ? ` and a review of at least “${RATING_NAMES[promotion.next.minReview]}”` : ''}. The Career app shows where you stand.` : ''}

{manager}`),
  }
}

/**
 * Records this week's review, emails it to the player, and promotes them if
 * the review completes their promotion requirements.
 */
export function holdReview(
  profile: ProfileData,
  inPerson: boolean,
  now = Date.now(),
): ProfileData {
  if (hasReviewThisWeek(profile)) return profile
  const review = reviewFor(profile)
  let work = { ...profile.work, reviews: [...profile.work.reviews, review] }
  work = log(
    work,
    `Weekly review: ${RATING_NAMES[review.rating]}`,
    review.rating === 'developing' ? 'bad' : 'good',
  )
  let next: ProfileData = {
    ...profile,
    work,
    inbox: [...profile.inbox, reviewMail(profile, review, inPerson, now)],
  }
  next = advanceCareer(next, now).profile
  return next
}

/** At the end of a Friday without a one-to-one, the review arrives by email. */
export function checkReviews(profile: ProfileData, now: number): ProfileData {
  const { work } = profile
  if (!work.dayOver || weekdayIndex(work.day) !== 4 || hasReviewThisWeek(profile)) {
    return profile
  }
  return holdReview(profile, false, now)
}

/** The one-to-one conversation: the manager goes through the review. */
export function reviewScene(profile: ProfileData, review: Review): Dialogue {
  return fillDialogue(rawReviewScene(profile, review))
}

function rawReviewScene(profile: ProfileData, review: Review): Dialogue {
  const name = firstName(profile.name)
  const scores = REVIEW_AREAS.map(
    (area) => `${area.name}: ${review.scores[area.id]}/5`,
  ).join(' · ')
  const weakest = REVIEW_AREAS.reduce((low, area) =>
    review.scores[area.id] < review.scores[low.id] ? area : low,
  )
  const choices: Choice[] = [
    {
      id: 'ask-improve',
      label: 'Thank {manager}, and ask what would make the biggest difference',
      reply: [
        `${weakest.name}. ${review.improvements[0] ?? 'Keep doing what you are doing, and take on a little more responsibility each week.'}`,
        'I appreciate you asking. That is exactly the attitude I want to see.',
      ],
      effects: { trust: { manager: 2 }, wellbeing: { engagement: 3 } },
      lesson:
        'Treat a review as useful information, not a verdict. Asking “what would make the biggest difference?” turns feedback into a plan.',
    },
    {
      id: 'evidence',
      label: 'Calmly mention something {manager} may have missed, with an example',
      reply: [
        'Fair point. I had not seen that. I will keep it in mind; keep bringing me examples like that.',
      ],
      effects: { trust: { manager: 1 }, reputation: 1 },
      lesson:
        'It is fine to disagree with feedback, respectfully and with evidence. Keep a short note of your achievements so you have examples ready.',
    },
    {
      id: 'defensive',
      label: 'Argue with the lower scores',
      reply: [
        '*{manager} waits for you to finish.*',
        'I hear you. But I can only go on what I see. Show me next week.',
      ],
      effects: { trust: { manager: -3 }, wellbeing: { stress: 3 } },
      lesson:
        'Getting defensive makes it harder for your manager to give you honest feedback in future, and honest feedback is how you grow.',
    },
  ]
  return {
    id: `review:${review.week}`,
    speaker: 'manager',
    title: 'One-to-one with {manager}',
    lines: [
      `Thanks for coming in, ${name}. Let’s look at your week.`,
      `Overall I would call it ${RATING_NAMES[review.rating].toLowerCase()}. ${scores}.`,
      review.strengths[0] ?? '',
      `Your reputation in the office: ${reputationReading(profile.work.reputation).label.toLowerCase()}. I will send you all of this in writing.`,
    ].filter(Boolean),
    actions: [],
    choices,
  }
}
