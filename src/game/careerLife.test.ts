import { describe, expect, it } from 'vitest'
import { JOB_ADS, SIDE_BUSINESSES, getQuestion } from '../content/careerLife'
import { WEEKLY_PAY } from '../content/life'
import type { AssignmentProgress, Review } from '../persistence/schemas'
import { careerAssignments, newProfileData, type ProfileData } from './career'
import {
  apply,
  applicationFor,
  askForRaise,
  basePay,
  businessLevel,
  canApply,
  canAskForRaise,
  canRunBusiness,
  canStartBusiness,
  closeBusiness,
  declineOffer,
  interview,
  payDecision,
  runBusiness,
  sessionPay,
  startBusiness,
  weeklyPay,
} from './careerLife'
import { goHome, goToBed, leaveForWork } from './life'
import { endDay, passTime } from './workday'

function evening(day = 1, p = newProfileData('Sam', 1)): ProfileData {
  p = { ...p, work: { ...p.work, day } }
  return goHome(endDay(passTime(p, 8 * 60 + 40, 'work')))
}

/** Sleeps, goes to work, works the day and comes home again. */
function nextEvening(p: ProfileData): ProfileData {
  const at = leaveForWork(goToBed(p), 'bus')
  return goHome(endDay(passTime(at, 8 * 60, 'work')))
}

/** A record with this many tasks passed and a latest review. */
function withRecord(p: ProfileData, tasks: number, rating: Review['rating'] | null) {
  const assignments: Record<string, AssignmentProgress> = {}
  for (const a of careerAssignments(p.careerId).slice(0, tasks))
    assignments[a.id] = {
      assignmentId: a.id,
      assignmentVersion: 1,
      documentId: a.id,
      startedAt: 1,
      completedSteps: [],
      attempts: [{ submittedAt: 1, score: 100, rating: 'excellent', checks: [] }],
    } as unknown as AssignmentProgress
  const reviews: Review[] = rating
    ? [{ day: 1, week: 1, rating, scores: {}, strengths: [], improvements: [] }]
    : []
  return { ...p, assignments, work: { ...p.work, reviews } }
}

/** The best answer to each question for an advert. */
const best = (jobId: string) =>
  JOB_ADS.find((a) => a.id === jobId)!.questions.map((id) =>
    getQuestion(id).answers.findIndex((a) => a.points === 2),
  )

describe('job hunting', () => {
  it('screens applications on the real record, with reasons', () => {
    let p = evening(1, withRecord(newProfileData('Sam', 1), 0, null))
    p = apply(p, 'harbour-lane')
    expect(canApply(p, 'harbour-lane')).toBe('You have already applied.')
    expect(applicationFor(p.work.life, 'harbour-lane')?.stage).toBe('applied')
    // The answer comes on a later evening.
    p = nextEvening(p)
    const application = applicationFor(p.work.life, 'harbour-lane')!
    expect(application.stage).toBe('rejected')
    expect(application.notes.join(' ')).toContain('at least 4 pieces of work')
    expect(application.notes.join(' ')).toContain('performance review first')
    // Not again straight away.
    expect(canApply(p, 'harbour-lane')).toContain('days from now')
  })

  it('a good record gets an interview; strong answers get an offer', () => {
    let p = evening(1, withRecord(newProfileData('Sam', 1), 5, 'strong'))
    p = nextEvening(apply(p, 'harbour-lane'))
    expect(applicationFor(p.work.life, 'harbour-lane')?.stage).toBe('interview')
    const minute = p.work.life.minute
    p = interview(p, 'harbour-lane', best('harbour-lane'))
    expect(p.work.life.minute).toBe(minute + 60)
    const application = applicationFor(p.work.life, 'harbour-lane')!
    expect(application.stage).toBe('offer')
    expect(application.offer).toBe(Math.round((WEEKLY_PAY[0] * 1.1) / 100) * 100)
    expect(application.notes[0]).toBe('Interview score 6 out of 6.')
    p = declineOffer(p, 'harbour-lane')
    expect(applicationFor(p.work.life, 'harbour-lane')?.stage).toBe('declined')
  })

  it('weak interview answers do not get an offer, and the feedback says why', () => {
    let p = evening(1, withRecord(newProfileData('Sam', 1), 5, 'strong'))
    p = nextEvening(apply(p, 'larkspur'))
    const weak = JOB_ADS.find((a) => a.id === 'larkspur')!.questions.map((id) =>
      getQuestion(id).answers.findIndex((a) => a.points === 0),
    )
    p = interview(p, 'larkspur', weak)
    const application = applicationFor(p.work.life, 'larkspur')!
    expect(application.stage).toBe('failed')
    expect(application.offer).toBeNull()
    expect(application.notes).toHaveLength(4)
  })

  it('offers lapse after a week', () => {
    let p = evening(1, withRecord(newProfileData('Sam', 1), 5, 'strong'))
    p = nextEvening(apply(p, 'larkspur'))
    p = interview(p, 'larkspur', best('larkspur'))
    for (let i = 0; i < 6; i++) p = nextEvening(p)
    expect(applicationFor(p.work.life, 'larkspur')?.stage).toBe('expired')
  })
})

describe('asking for a rise', () => {
  it('the record decides: a strong review supports a modest rise', () => {
    const p = evening(1, withRecord(newProfileData('Sam', 1), 5, 'strong'))
    expect(payDecision(p, 3, null).granted).toBe(3)
    // Asking for more than the record supports gets what it does support.
    expect(payDecision(p, 10, null).granted).toBe(payDecision(p, 10, null).support)
    // With nothing behind it, nothing, and some goodwill lost for asking a lot.
    const none = evening(1, withRecord(newProfileData('Sam', 1), 0, null))
    expect(payDecision(none, 15, null)).toMatchObject({ granted: 0, overreach: true })
  })

  it('the manager answers on a later evening, and Friday pay includes the rise', () => {
    // Monday evening: ask for 3%.
    let p = evening(1, withRecord(newProfileData('Sam', 1), 5, 'strong'))
    p = askForRaise(p, 3)
    expect(canAskForRaise(p)).toContain('Waiting')
    p = nextEvening(p)
    expect(p.work.life.career.raisePct).toBe(3)
    expect(p.work.life.career.payAnswer).toContain('agreed a 3% rise')
    expect(weeklyPay(p)).toBe(Math.round(basePay(p) * 1.03))
    expect(canAskForRaise(p)).toContain('wait')
    // Friday: paid with the rise.
    while (p.work.day < 5) p = nextEvening(p)
    expect(p.work.life.ledger.at(-1)).toMatchObject({ amount: weeklyPay(p) })
  })

  it('an outside offer strengthens the case, and is used up', () => {
    let p = evening(1, withRecord(newProfileData('Sam', 1), 5, 'solid'))
    p = nextEvening(apply(p, 'harbour-lane'))
    p = interview(p, 'harbour-lane', best('harbour-lane'))
    expect(payDecision(p, 10, 'harbour-lane').support).toBeGreaterThan(
      payDecision(p, 10, null).support,
    )
    p = askForRaise(p, 10, 'harbour-lane')
    expect(applicationFor(p.work.life, 'harbour-lane')?.stage).toBe('used')
    p = nextEvening(p)
    expect(p.work.life.career.raisePct).toBeGreaterThan(2)
  })
})

describe('a side business', () => {
  it('costs something to set up, pays each evening and grows with regulars', () => {
    let p = evening()
    expect(canStartBusiness(p, 'repairs')).toContain('need a bike')
    const money = p.work.life.money
    p = startBusiness(p, 'tutoring')
    const tutoring = SIDE_BUSINESSES.find((b) => b.id === 'tutoring')!
    expect(p.work.life.money).toBe(money - tutoring.setup)
    expect(p.work.life.log.join(' ')).toContain('declared')
    expect(canStartBusiness(p, 'crafts')).toContain('already')
    const before = p.work.life.money
    p = runBusiness(p)
    expect(p.work.life.money).toBe(before + tutoring.base)
    expect(p.work.life.career.business.sessions).toBe(1)
    // Three sessions bring a regular, and better pay.
    p = runBusiness(nextEvening(p))
    p = runBusiness(nextEvening(p))
    expect(businessLevel(p.work.life.career)).toBe(1)
    expect(sessionPay(p.work.life.career)).toBe(tutoring.base + tutoring.perLevel)
    p = closeBusiness(p)
    expect(canRunBusiness(p)).toContain('no side business')
  })

  it('too many evenings a week on top of work adds stress', () => {
    let p = evening(1)
    p = startBusiness(p, 'tutoring')
    for (let i = 0; i < 3; i++) p = runBusiness(i ? nextEvening(p) : p)
    p = nextEvening(p)
    const stress = p.work.wellbeing.stress
    p = runBusiness(p)
    expect(p.work.wellbeing.stress).toBe(Math.min(100, stress + 6))
    expect(p.work.life.log.at(-1)).toContain('4 evenings this week')
  })
})
