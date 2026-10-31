import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { HOURS } from '../content/workday'
import { newProfileData, recordSubmission, type ProfileData } from './career'
import type { GradeResult } from './grading'
import {
  checkReviews,
  hasReviewThisWeek,
  holdReview,
  reviewFor,
  reviewScene,
} from './reviews'
import { endDay, passTime } from './workday'

function grade(score: number): GradeResult {
  const rating = score < 70 ? 'fail' : score >= 90 ? 'excellent' : 'good'
  return {
    score,
    rating,
    passed: rating !== 'fail',
    earned: score,
    maxPoints: 100,
    checks: [],
  }
}

function at(profile: ProfileData, minute: number, day = profile.work.day): ProfileData {
  return { ...profile, work: { ...profile.work, day, minute } }
}

function submit(profile: ProfileData, id: string, score: number): ProfileData {
  const started: ProfileData = {
    ...profile,
    assignments: {
      ...profile.assignments,
      [id]: {
        assignmentId: id,
        assignmentVersion: 1,
        documentId: '00000000-0000-4000-8000-000000000000',
        startedAt: 0,
        completedSteps: [],
        attempts: [],
      },
    },
  }
  return recordSubmission(started, getAssignment(id)!, grade(score), 1).profile
}

/** Friday afternoon of week 1. */
function friday(profile = newProfileData('Alex Morgan', 0)): ProfileData {
  return at(profile, 15 * 60 + 30, 5)
}

describe('performance reviews', () => {
  it('scores a good week: accurate work, reliable, getting on with people', () => {
    let profile = friday()
    profile = submit(profile, 'supplies-order', 98)
    profile = submit(profile, 'expense-summary', 96)
    profile = { ...profile, work: { ...profile.work, reputation: 62 } }
    const review = reviewFor(profile)
    expect(review.week).toBe(1)
    expect(review.scores).toMatchObject({
      quality: 5,
      reliability: 5,
      professionalism: 4,
    })
    expect(['strong', 'outstanding']).toContain(review.rating)
    expect(review.strengths[0]).toContain('accurate')
  })

  it('marks reliability down for missed meetings and deadlines, with advice', () => {
    let profile = at(newProfileData('Alex', 0), 9 * 60, 1)
    // Miss Monday's stand-up and the 5:30 pm deadline.
    profile = passTime(profile, 9 * 60, 'work')
    expect(profile.work.deadlines['supplies-order'].status).toBe('late')
    const review = reviewFor(profile)
    expect(review.scores.reliability).toBeLessThanOrEqual(3)
    expect(review.improvements.join(' ')).toContain('Reliability')
  })

  it('mentions wellbeing without scoring it', () => {
    const profile = friday()
    const tired = {
      ...profile,
      work: { ...profile.work, wellbeing: { ...profile.work.wellbeing, fatigue: 70 } },
    }
    const review = reviewFor(tired)
    expect(review.improvements.join(' ')).toContain('Look after yourself')
    expect(Object.keys(review.scores)).toEqual([
      'quality',
      'reliability',
      'teamwork',
      'professionalism',
    ])
    expect(reviewFor(profile).rating).toBe(review.rating)
  })

  it('records the review once a week and sends it in writing', () => {
    const reviewed = holdReview(friday(), true, 100)
    expect(reviewed.work.reviews).toHaveLength(1)
    expect(hasReviewThisWeek(reviewed)).toBe(true)
    expect(reviewed.inbox.at(-1)).toMatchObject({ kind: 'review', from: 'manager' })
    expect(reviewed.inbox.at(-1)?.body).toContain('Thanks for our one-to-one')
    expect(holdReview(reviewed, true, 200)).toBe(reviewed)
  })

  it('sends the review by email if Friday ends without a one-to-one', () => {
    const thursday = endDay(at(newProfileData('Alex', 0), HOURS.end, 4))
    expect(checkReviews(thursday, 0).work.reviews).toHaveLength(0)
    const fridayEvening = endDay(at(newProfileData('Alex', 0), HOURS.end, 5))
    const reviewed = checkReviews(fridayEvening, 0)
    expect(reviewed.work.reviews).toHaveLength(1)
    expect(reviewed.inbox.at(-1)?.body).toContain('didn’t manage to have our one-to-one')
  })

  it('can complete a promotion that was waiting for a good review', () => {
    let profile = friday()
    profile = {
      ...profile,
      levelId: 'junior',
      xp: 950,
      work: { ...profile.work, reputation: 60 },
    }
    for (const id of [
      'budget-report',
      'payment-run',
      'petty-cash',
      'performance-report',
    ]) {
      profile = submit(profile, id, 95)
    }
    // Everything else is done, but there is no review yet.
    expect(profile.levelId).toBe('junior')
    const reviewed = holdReview(profile, true, 100)
    expect(reviewed.work.reviews[0].rating).not.toBe('developing')
    expect(reviewed.levelId).toBe('assistant')
    expect(reviewed.inbox.some((m) => m.kind === 'promotion')).toBe(true)
  })

  it('discusses the review at the one-to-one, with ways to respond', () => {
    const profile = friday()
    const scene = reviewScene(profile, reviewFor(profile))
    expect(scene.title).toBe('One-to-one with Priya')
    expect(scene.lines.join(' ')).toContain('Quality of work')
    expect(scene.choices?.map((c) => c.id)).toEqual([
      'ask-improve',
      'evidence',
      'defensive',
    ])
  })
})
