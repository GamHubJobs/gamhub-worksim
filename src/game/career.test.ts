import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { createId } from '../lib/ids'
import {
  assignmentStatus,
  bestScore,
  careerLevel,
  firstName,
  newProfileData,
  promotionProgress,
  recordSubmission,
  skillLevel,
  unreadCount,
  type ProfileData,
} from './career'
import type { GradeResult } from './grading'

const assignment = getAssignment('supplies-order')!

function grade(score: number, passScore = assignment.passScore): GradeResult {
  const rating =
    score < passScore ? 'fail' : score >= 90 ? 'excellent' : score >= 75 ? 'good' : 'pass'
  return {
    score,
    rating,
    passed: rating !== 'fail',
    earned: score,
    maxPoints: 100,
    checks: [
      {
        id: 'line-totals',
        title: 'Line totals',
        why: 'why',
        hint: 'Use =C2*D2',
        status: score === 100 ? 'passed' : 'partial',
        earned: score,
        points: 100,
        problems: score === 100 ? [] : ['E2 is empty.'],
      },
    ],
  }
}

function started(profile: ProfileData): ProfileData {
  return {
    ...profile,
    assignments: {
      [assignment.id]: {
        assignmentId: assignment.id,
        assignmentVersion: assignment.version,
        documentId: createId(),
        startedAt: 1,
        completedSteps: [],
        attempts: [],
      },
    },
  }
}

describe('a new career', () => {
  it('starts as an intern with a welcome email and the first task', () => {
    const profile = newProfileData('  Alex Morgan ', 1000)
    expect(profile.name).toBe('Alex Morgan')
    expect(careerLevel(profile).current.title).toBe('Finance & Admin Intern')
    expect(profile.inbox.map((m) => m.kind)).toEqual(['welcome', 'briefing'])
    expect(profile.inbox[1].body).toContain('Hi Alex,')
    expect(profile.inbox[1].assignmentId).toBe('supplies-order')
    expect(unreadCount(profile)).toBe(2)
    expect(assignmentStatus(profile, assignment)).toBe('available')
  })

  it('uses the first name in emails', () => {
    expect(firstName('Alex Morgan')).toBe('Alex')
    expect(firstName('Sam')).toBe('Sam')
  })
})

describe('submitting work', () => {
  it('rewards a pass with XP, skill XP, feedback and an excellent-first-try bonus', () => {
    const profile = started(newProfileData('Alex', 0))
    const {
      profile: after,
      reward,
      attempt,
    } = recordSubmission(profile, assignment, grade(100), 5000)
    expect(reward.xp).toBe(110) // 100 XP + 10% first-try bonus
    expect(reward.bonusXp).toBe(10)
    expect(after.xp).toBe(110)
    expect(after.skills.formulas).toBe(30)
    expect(reward.firstPass).toBe(true)
    expect(attempt.score).toBe(100)
    expect(assignmentStatus(after, assignment)).toBe('completed')

    const feedback = after.inbox.find((m) => m.kind === 'feedback')!
    expect(feedback.subject).toContain('(100%)')
    expect(feedback.body).toContain('spot on')
    expect(feedback.attemptIndex).toBe(0)
  })

  it('only rewards passing work, and only improvements when resubmitted', () => {
    let profile = started(newProfileData('Alex', 0))
    const first = recordSubmission(profile, assignment, grade(60), 1)
    expect(first.reward.xp).toBe(0) // a failed attempt earns nothing yet
    expect(first.reward.firstPass).toBe(false)
    expect(assignmentStatus(first.profile, assignment)).toBe('needs-revision')
    profile = first.profile

    const second = recordSubmission(profile, assignment, grade(85), 2)
    expect(second.reward.xp).toBe(85) // first pass: the full amount for 85%, no bonus
    expect(second.reward.firstPass).toBe(true)

    const third = recordSubmission(second.profile, assignment, grade(70), 3)
    expect(third.reward.xp).toBe(0) // worse than the best: nothing taken away
    expect(third.reward.firstPass).toBe(false)
    expect(third.profile.xp).toBe(85)
    expect(bestScore(third.profile.assignments[assignment.id])).toBe(85)
    expect(third.profile.assignments[assignment.id].attempts).toHaveLength(3)
  })

  it('lists what to fix in the feedback email when work is not perfect', () => {
    const { profile } = recordSubmission(
      started(newProfileData('Alex', 0)),
      assignment,
      grade(50),
      1,
    )
    const feedback = profile.inbox.at(-1)!
    expect(feedback.body).toContain('What to look at:\n• Line totals: Use =C2*D2')
    expect(feedback.body.trim().endsWith('Priya')).toBe(true)
  })

  it('reports skill level-ups', () => {
    const profile = { ...started(newProfileData('Alex', 0)), skills: { formulas: 30 } }
    const { reward } = recordSubmission(profile, assignment, grade(100), 1)
    expect(reward.skillLevelUps).toContainEqual({
      skillId: 'formulas',
      level: 2,
      name: 'Learner',
    })
  })

  it('refuses a submission for an assignment that was never started', () => {
    expect(() =>
      recordSubmission(newProfileData('Alex', 0), assignment, grade(100), 1),
    ).toThrow()
  })
})

describe('levels and promotion', () => {
  it('skill levels', () => {
    expect(skillLevel(0)).toMatchObject({ level: 1, name: 'Novice' })
    expect(skillLevel(40)).toMatchObject({ level: 2, name: 'Learner' })
    expect(skillLevel(39).next?.xpRequired).toBe(40)
    expect(skillLevel(10_000).next).toBeNull()
  })

  it('promotion needs both XP and every assignment of the level passed', () => {
    const profile = started(newProfileData('Alex', 0))
    const notEnough = promotionProgress({ ...profile, xp: 50 })
    expect(notEnough.eligible).toBe(false)
    expect(notEnough.xpNeeded).toBe(250)
    expect(notEnough.next?.title).toBe('Junior Finance Assistant')
    // Enough XP but the work is not done yet.
    expect(promotionProgress({ ...profile, xp: 1000 }).eligible).toBe(false)
  })
})

describe('improving a passed result', () => {
  it('pays only the difference', () => {
    const passed = recordSubmission(
      started(newProfileData('Alex', 0)),
      assignment,
      grade(80),
      1,
    )
    expect(passed.reward.xp).toBe(80)
    const better = recordSubmission(passed.profile, assignment, grade(95), 2)
    expect(better.reward.xp).toBe(15)
    expect(better.profile.xp).toBe(95)
  })
})

describe('the first week', () => {
  it('passing all three intern tasks well leads to promotion', () => {
    let profile = newProfileData('Alex', 0)
    const rewards = []
    for (const id of ['supplies-order', 'expense-summary', 'invoice-check']) {
      const task = getAssignment(id)!
      expect(assignmentStatus(profile, task)).toBe('available')
      profile = {
        ...profile,
        assignments: {
          ...profile.assignments,
          [id]: {
            assignmentId: id,
            assignmentVersion: 1,
            documentId: createId(),
            startedAt: 1,
            completedSteps: [],
            attempts: [],
          },
        },
      }
      const result = recordSubmission(profile, task, grade(100), 10)
      profile = result.profile
      rewards.push(result.reward)
    }
    expect(rewards.map((r) => r.unlocked?.id ?? null)).toEqual([
      'expense-summary',
      'invoice-check',
      null,
    ])
    expect(rewards[2].promotedTo).toBe('Junior Finance Assistant')
    expect(careerLevel(profile).current.title).toBe('Junior Finance Assistant')
    expect(profile.inbox.at(-1)?.kind).toBe('promotion')
  })

  it('later tasks stay locked until the previous one is passed', () => {
    const profile = newProfileData('Alex', 0)
    expect(assignmentStatus(profile, getAssignment('expense-summary')!)).toBe('locked')
    expect(assignmentStatus(profile, getAssignment('invoice-check')!)).toBe('locked')
  })
})
