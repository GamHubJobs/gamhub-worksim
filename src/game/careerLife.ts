/**
 * Career life, in the evenings at home: applying to other employers (screened
 * on the player's real record), interviews, offers, asking for a pay rise, and
 * running a side business. Pure functions like the rest of the game rules; no
 * randomness, so the same record always gets the same answer, with reasons.
 */
import {
  APPLY_MINUTES,
  BUSINESS_EVENINGS,
  INTERVIEW_MINUTES,
  INTERVIEW_PASS,
  MAX_BUSINESS_LEVEL,
  MAX_RAISE,
  OFFER_DAYS,
  PAY_TALK_MINUTES,
  PAY_TALK_WEEKS,
  RATING_SUPPORT,
  REAPPLY_DAYS,
  SESSIONS_PER_LEVEL,
  getBusiness,
  getJobAd,
  getQuestion,
  type BusinessId,
  type JobAd,
} from '../content/careerLife'
import { activeEmployer } from '../content/departments'
import { REVIEW_RATINGS } from '../content/schemas'
import { LATEST_BEDTIME, WEEKLY_PAY, formatMoney } from '../content/life'
import type { Life } from '../persistence/schemas'
import { careerAssignments, careerLevel, isPassed, type ProfileData } from './career'
import { levelNumber } from './cases'
import { weekNumber } from './clock'
import { RATING_NAMES } from './reviews'
import { changeReputation } from './relationships'
import { clamp, decayed, earn, note, spend, withLife, withWellbeing } from './lifeTime'

type Career = Life['career']
type Application = Career['applications'][number]

// ---------------------------------------------------------------------------
// Pay
// ---------------------------------------------------------------------------

/** The weekly pay for the player's level, before any rise. */
export function basePay(profile: ProfileData): number {
  return WEEKLY_PAY[Math.min(WEEKLY_PAY.length, levelNumber(profile)) - 1]
}

/** The weekly pay now, with rises won in pay talks. */
export function weeklyPay(profile: ProfileData): number {
  const raise = profile.work.life.career.raisePct
  return Math.round((basePay(profile) * (100 + raise)) / 100)
}

// ---------------------------------------------------------------------------
// Shared checks
// ---------------------------------------------------------------------------

function withCareer(profile: ProfileData, career: Career, life = profile.work.life) {
  return withLife(profile, { ...life, career })
}

/** Why the player cannot spend this long on career things at home now, if not. */
function eveningAtHome(profile: ProfileData, minutes: number): string | null {
  const life = profile.work.life
  if (!profile.work.dayOver || life.phase !== 'evening') return 'Only in the evening.'
  if (life.city.at !== 'home' || !life.city.inside) return 'At home, on your laptop.'
  if (life.minute + minutes > LATEST_BEDTIME) return 'It is very late: time for bed.'
  return null
}

/** Spends time at the laptop: the clock, needs and a little energy. */
function spendTime(profile: ProfileData, minutes: number, stress = 0): ProfileData {
  const life = profile.work.life
  const next: Life = {
    ...life,
    minute: life.minute + minutes,
    needs: decayed(life.needs, minutes),
  }
  return withLife(
    profile,
    next,
    withWellbeing(profile.work, -Math.round((minutes / 60) * 2), stress),
  )
}

function latestRating(profile: ProfileData) {
  return profile.work.reviews.at(-1)?.rating ?? null
}

export function tasksPassed(profile: ProfileData): number {
  return careerAssignments(profile.careerId).filter((a) =>
    isPassed(a, profile.assignments[a.id]),
  ).length
}

// ---------------------------------------------------------------------------
// Job hunting
// ---------------------------------------------------------------------------

/** The job title an advert is for, in the player's own career. */
export function roleFor(profile: ProfileData, ad: JobAd): string {
  const { career, current } = careerLevel(profile)
  const index = career.levels.findIndex((l) => l.id === current.id)
  return career.levels[Math.min(career.levels.length - 1, index + ad.step)].title
}

/** The weekly pay an employer would offer, rounded to the pound. */
export function offerFor(profile: ProfileData, ad: JobAd): number {
  return Math.round((weeklyPay(profile) * ad.payFactor) / 100) * 100
}

/** Why the employer would turn the application down: empty if it gets through. */
export function screening(profile: ProfileData, ad: JobAd): string[] {
  const reasons: string[] = []
  if (levelNumber(profile) < ad.minLevel)
    reasons.push(`They want more experience: someone a level or two further on.`)
  if (tasksPassed(profile) < ad.minTasks)
    reasons.push(
      `They look for at least ${ad.minTasks} pieces of work done to standard (you have ${tasksPassed(profile)}).`,
    )
  if (ad.minRating) {
    const rating = latestRating(profile)
    const rank = (r: string) => REVIEW_RATINGS.indexOf(r as never)
    if (!rating)
      reasons.push('They ask for a reference: you need a performance review first.')
    else if (rank(rating) < rank(ad.minRating))
      reasons.push(
        `Your latest review (${RATING_NAMES[rating]}) is below what they ask for (${RATING_NAMES[ad.minRating]} or better).`,
      )
  }
  return reasons
}

export function applicationFor(life: Life, jobId: string): Application | undefined {
  return life.career.applications.findLast((a) => a.jobId === jobId)
}

const OPEN_STAGES: Application['stage'][] = ['applied', 'interview', 'offer']

export function canApply(profile: ProfileData, jobId: string): string | null {
  const ad = getJobAd(jobId)
  if (!ad) return 'No such job.'
  const before = applicationFor(profile.work.life, jobId)
  if (before && OPEN_STAGES.includes(before.stage)) return 'You have already applied.'
  if (before && profile.work.day - before.since < REAPPLY_DAYS)
    return `You can apply again ${REAPPLY_DAYS - (profile.work.day - before.since)} days from now.`
  return eveningAtHome(profile, APPLY_MINUTES)
}

/** Sends an application; the answer comes on a later evening. */
export function apply(profile: ProfileData, jobId: string): ProfileData {
  if (canApply(profile, jobId)) return profile
  const ad = getJobAd(jobId)!
  const day = profile.work.day
  const next = spendTime(profile, APPLY_MINUTES)
  let life = next.work.life
  const application: Application = {
    jobId,
    day,
    since: day,
    stage: 'applied',
    offer: null,
    notes: [],
  }
  life = note(life, `Applied to ${ad.employer}`)
  return withCareer(
    next,
    {
      ...life.career,
      applications: [...life.career.applications, application].slice(-20),
    },
    life,
  )
}

function updateApplication(
  career: Career,
  jobId: string,
  change: Partial<Application>,
): Career {
  const index = career.applications.findLastIndex((a) => a.jobId === jobId)
  if (index < 0) return career
  const applications = [...career.applications]
  applications[index] = { ...applications[index], ...change }
  return { ...career, applications }
}

export function canInterview(profile: ProfileData, jobId: string): string | null {
  const application = applicationFor(profile.work.life, jobId)
  if (application?.stage !== 'interview') return 'No interview booked.'
  return eveningAtHome(profile, INTERVIEW_MINUTES)
}

export interface InterviewResult {
  score: number
  offer: number | null
  feedback: string[]
}

/** How an interview went, from the player's answers (indices, one per question). */
export function interviewResult(
  profile: ProfileData,
  ad: JobAd,
  answers: number[],
): InterviewResult {
  let score = 0
  const feedback = ad.questions.map((id, i) => {
    const answer = getQuestion(id).answers[answers[i] ?? -1]
    score += answer?.points ?? 0
    return answer ? answer.feedback : 'No answer given.'
  })
  return {
    score,
    offer: score >= INTERVIEW_PASS ? offerFor(profile, ad) : null,
    feedback,
  }
}

/** A video interview in the evening; an offer if it goes well. */
export function interview(
  profile: ProfileData,
  jobId: string,
  answers: number[],
): ProfileData {
  if (canInterview(profile, jobId)) return profile
  const ad = getJobAd(jobId)!
  const result = interviewResult(profile, ad, answers)
  const next = spendTime(profile, INTERVIEW_MINUTES, 4)
  let life = next.work.life
  const day = profile.work.day
  life = note(
    life,
    result.offer
      ? `Interview with ${ad.employer}: offered ${formatMoney(result.offer)} a week`
      : `Interview with ${ad.employer}: not this time`,
  )
  return withCareer(
    next,
    updateApplication(life.career, jobId, {
      stage: result.offer ? 'offer' : 'failed',
      since: day,
      offer: result.offer,
      notes: [`Interview score ${result.score} out of 6.`, ...result.feedback],
    }),
    life,
  )
}

/** Turns an offer down politely. */
export function declineOffer(profile: ProfileData, jobId: string): ProfileData {
  const life = profile.work.life
  if (applicationFor(life, jobId)?.stage !== 'offer') return profile
  return withCareer(
    profile,
    updateApplication(life.career, jobId, { stage: 'declined', since: profile.work.day }),
    note(life, `Turned down the offer from ${getJobAd(jobId)!.employer}`),
  )
}

/** Offers still standing. */
export function liveOffers(life: Life): Application[] {
  return life.career.applications.filter((a) => a.stage === 'offer')
}

// ---------------------------------------------------------------------------
// Asking for a rise
// ---------------------------------------------------------------------------

export function canAskForRaise(profile: ProfileData): string | null {
  const career = profile.work.life.career
  if (career.payTalk) return 'Waiting for your manager’s answer.'
  const week = weekNumber(profile.work.day)
  if (career.talkWeek && week - career.talkWeek < PAY_TALK_WEEKS)
    return `You asked recently: wait ${PAY_TALK_WEEKS - (week - career.talkWeek)} more week(s).`
  if (career.raisePct >= MAX_RAISE) return 'You are at the top of the pay range for now.'
  return eveningAtHome(profile, PAY_TALK_MINUTES)
}

/** Writes to the manager asking for a rise; the answer comes on a later evening. */
export function askForRaise(
  profile: ProfileData,
  ask: number,
  offerJob: string | null = null,
): ProfileData {
  if (canAskForRaise(profile)) return profile
  const life = profile.work.life
  const cited =
    offerJob && applicationFor(life, offerJob)?.stage === 'offer' ? offerJob : null
  const next = spendTime(profile, PAY_TALK_MINUTES, 2)
  let after = note(next.work.life, `Asked your manager for a ${ask}% rise`)
  let career: Career = {
    ...after.career,
    talkWeek: weekNumber(profile.work.day),
    payTalk: { ask, day: profile.work.day, offerJob: cited },
    payAnswer: null,
  }
  if (cited)
    career = updateApplication(career, cited, { stage: 'used', since: profile.work.day })
  after = { ...after, career }
  return withLife(next, after)
}

export interface PayDecision {
  /** The rise given, in per cent (0 for none). */
  granted: number
  /** What the record supports, and why. */
  support: number
  reasons: string[]
  /** Whether asking for so much with so little behind it cost some goodwill. */
  overreach: boolean
}

/** What the manager can offer, from the review, any outside offer and reputation. */
export function payDecision(
  profile: ProfileData,
  ask: number,
  offerJob: string | null,
): PayDecision {
  const reasons: string[] = []
  const rating = latestRating(profile)
  let support = 0
  if (rating) {
    support += RATING_SUPPORT[rating]
    reasons.push(`Your latest review: ${RATING_NAMES[rating]}.`)
  } else reasons.push('There is no performance review yet to go on.')
  const offer = offerJob ? applicationFor(profile.work.life, offerJob)?.offer : null
  if (offer) {
    const above = (offer / weeklyPay(profile) - 1) * 100
    const leverage = Math.max(0, Math.min(12, Math.round(above * 0.75)))
    support += leverage
    reasons.push(
      `An offer from ${getJobAd(offerJob!)!.employer} at ${formatMoney(offer)} a week.`,
    )
  }
  if (profile.work.reputation >= 70) {
    support += 1
    reasons.push('Your good reputation in the office.')
  }
  support = Math.min(15, support, MAX_RAISE - profile.work.life.career.raisePct)
  const granted = ask <= support ? ask : support >= 2 ? support : 0
  return { granted, support, reasons, overreach: granted === 0 && ask >= 10 }
}

function resolvePayTalk(profile: ProfileData): ProfileData {
  const life = profile.work.life
  const talk = life.career.payTalk
  if (!talk || talk.day >= profile.work.day) return profile
  const decision = payDecision(profile, talk.ask, talk.offerJob)
  const pay = (raise: number) =>
    formatMoney(Math.round((basePay(profile) * (100 + raise)) / 100))
  const raise = life.career.raisePct + decision.granted
  const answer =
    decision.granted === talk.ask
      ? `Your manager agreed a ${talk.ask}% rise: ${pay(raise)} a week from now on.`
      : decision.granted > 0
        ? `Your manager could not do ${talk.ask}%, but offered ${decision.granted}%: ${pay(raise)} a week from now on.`
        : `Your manager said not now. Build your record (a strong review helps) and ask again in a few weeks.`
  let work = profile.work
  if (decision.overreach) work = changeReputation(work, -2)
  const career: Career = {
    ...life.career,
    raisePct: raise,
    payTalk: null,
    payAnswer: `${answer} ${decision.reasons.join(' ')}`,
  }
  return withLife(profile, note({ ...life, career }, answer), work)
}

// ---------------------------------------------------------------------------
// The evening's news
// ---------------------------------------------------------------------------

/**
 * What happens when the player gets home: employers answer applications from
 * earlier days, old offers lapse and the manager answers about pay.
 */
export function careerEvening(profile: ProfileData): ProfileData {
  const day = profile.work.day
  let life = profile.work.life
  let career = life.career
  for (const application of career.applications) {
    const ad = getJobAd(application.jobId)
    if (!ad) continue
    if (application.stage === 'applied' && application.day < day) {
      const reasons = screening(profile, ad)
      career = updateApplication(career, ad.id, {
        stage: reasons.length ? 'rejected' : 'interview',
        since: day,
        notes: reasons,
      })
      life = note(
        life,
        reasons.length
          ? `${ad.employer} replied: not this time`
          : `${ad.employer} invited you to a video interview`,
      )
    } else if (application.stage === 'offer' && day - application.since > OFFER_DAYS) {
      career = updateApplication(career, ad.id, { stage: 'expired', since: day })
      life = note(life, `The offer from ${ad.employer} has lapsed`)
    }
  }
  return resolvePayTalk(withLife(profile, { ...life, career }))
}

// ---------------------------------------------------------------------------
// A side business
// ---------------------------------------------------------------------------

export function businessLevel(career: Career): number {
  return Math.min(
    MAX_BUSINESS_LEVEL,
    Math.floor(career.business.sessions / SESSIONS_PER_LEVEL),
  )
}

/** What one evening's session pays at the business's current level. */
export function sessionPay(career: Career): number {
  const business = career.business.id ? getBusiness(career.business.id) : undefined
  return business ? business.base + business.perLevel * businessLevel(career) : 0
}

export function canStartBusiness(profile: ProfileData, id: BusinessId): string | null {
  const life = profile.work.life
  const business = getBusiness(id)
  if (!business) return 'No such business.'
  if (life.career.business.id) return 'You already run a side business.'
  if (business.needsBike && !life.vehicles.bike) return 'You need a bike of your own.'
  if (life.money < business.setup)
    return `Setting up costs ${formatMoney(business.setup)}.`
  return eveningAtHome(profile, 0)
}

/**
 * Sets up a side business, declared to the employer (as staff are asked to):
 * outside work is fine if it does not clash with the day job.
 */
export function startBusiness(profile: ProfileData, id: BusinessId): ProfileData {
  if (canStartBusiness(profile, id)) return profile
  const business = getBusiness(id)!
  let life = spend(
    profile.work.life,
    profile.work.day,
    business.setup,
    `Setting up: ${business.name}`,
  )
  life = note(
    life,
    `Started a side business: ${business.name}, declared to ${activeEmployer().name}`,
  )
  return withCareer(
    profile,
    {
      ...life.career,
      business: { id, sessions: 0, earned: 0, week: 0, weekSessions: 0 },
    },
    life,
  )
}

export function canRunBusiness(profile: ProfileData): string | null {
  const life = profile.work.life
  const business = life.career.business.id
    ? getBusiness(life.career.business.id)
    : undefined
  if (!business) return 'You have no side business.'
  if (business.needsBike && !life.vehicles.bike) return 'You need your bike for this.'
  if (life.money < business.materials) return 'You cannot afford the materials.'
  return eveningAtHome(profile, business.minutes)
}

/** An evening on the side business: paid for the work, more regulars over time. */
export function runBusiness(profile: ProfileData): ProfileData {
  if (canRunBusiness(profile)) return profile
  const life0 = profile.work.life
  const business = getBusiness(life0.career.business.id!)!
  const pay = sessionPay(life0.career)
  const week = weekNumber(profile.work.day)
  const before = life0.career.business
  const weekSessions = (before.week === week ? before.weekSessions : 0) + 1
  // Too many evenings a week on top of a full-time job wears people down.
  const overdoing = weekSessions > BUSINESS_EVENINGS
  const next = spendTime(profile, business.minutes, overdoing ? 6 : 0)
  let life = next.work.life
  const needs = { ...life.needs }
  for (const [need, value] of Object.entries(business.needs))
    needs[need as keyof typeof needs] = clamp(needs[need as keyof typeof needs] + value)
  life = { ...life, needs }
  life = spend(life, profile.work.day, business.materials, `Materials: ${business.name}`)
  life = earn(life, profile.work.day, pay, business.name)
  const level = businessLevel(life.career)
  const career: Career = {
    ...life.career,
    business: {
      ...before,
      sessions: before.sessions + 1,
      earned: before.earned + pay,
      week,
      weekSessions,
    },
  }
  life = note(life, `${business.name}: earned ${formatMoney(pay)}`)
  if (businessLevel(career) > level) life = note(life, 'A new regular customer!')
  if (overdoing)
    life = note(
      life,
      `That is ${weekSessions} evenings this week on top of work: you are tired`,
    )
  return withLife(next, { ...life, career }, withWellbeing(next.work, business.energy))
}

/** Winds the side business down (nothing to pay). */
export function closeBusiness(profile: ProfileData): ProfileData {
  const life = profile.work.life
  if (!life.career.business.id) return profile
  const name = getBusiness(life.career.business.id)!.name
  return withCareer(
    profile,
    { ...life.career, business: { ...life.career.business, id: null, sessions: 0 } },
    note(life, `Closed your side business: ${name}`),
  )
}
