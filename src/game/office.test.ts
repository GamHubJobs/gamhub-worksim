import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { INTERACTIONS, SPOTS, interactionsAt } from '../content/office'
import { createId } from '../lib/ids'
import { newProfileData, recordSubmission, type ProfileData } from './career'
import type { GradeResult } from './grading'
import { currentTask, dialogueFor } from './office'

function start(profile: ProfileData, id: string): ProfileData {
  return {
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
}

function grade(score: number): GradeResult {
  const rating = score < 70 ? 'fail' : score >= 90 ? 'excellent' : 'good'
  return { score, rating, passed: score >= 70, earned: score, maxPoints: 100, checks: [] }
}

describe('office layout', () => {
  it('every place has something to do, and every interaction is in a known place', () => {
    for (const spot of SPOTS) expect(interactionsAt(spot.id).length).toBeGreaterThan(0)
    const ids = SPOTS.map((spot) => spot.id)
    for (const interaction of INTERACTIONS) expect(ids).toContain(interaction.spot)
  })
})

describe('what Priya says', () => {
  it('points a new starter to the first task', () => {
    const profile = newProfileData('Alex Morgan', 0)
    const dialogue = dialogueFor('manager', profile)
    expect(dialogue.lines[0]).toContain('Hi Alex!')
    expect(dialogue.lines[0]).toContain('Price the office supplies order')
    expect(dialogue.actions[0].open).toEqual({
      app: 'tasks',
      assignmentId: 'supplies-order',
    })
  })

  it('encourages while a task is in progress, and refers to feedback after a fail', () => {
    let profile = start(newProfileData('Alex', 0), 'supplies-order')
    expect(dialogueFor('manager', profile).lines[0]).toContain('How is')
    profile = recordSubmission(
      profile,
      getAssignment('supplies-order')!,
      grade(40),
      1,
    ).profile
    const dialogue = dialogueFor('manager', profile)
    expect(dialogue.lines[0]).toContain('(40%)')
    expect(dialogue.actions[0].label).toBe('See the feedback')
  })

  it('moves on to the next task after a pass', () => {
    let profile = start(newProfileData('Alex', 0), 'supplies-order')
    profile = recordSubmission(
      profile,
      getAssignment('supplies-order')!,
      grade(100),
      1,
    ).profile
    expect(currentTask(profile)?.assignment.id).toBe('expense-summary')
    expect(dialogueFor('manager', profile).lines[0]).toContain(
      'Summarise the expense claims',
    )
  })

  it('congratulates after the promotion', () => {
    let profile = newProfileData('Alex', 0)
    for (const id of ['supplies-order', 'expense-summary', 'invoice-check']) {
      profile = start(profile, id)
      profile = recordSubmission(profile, getAssignment(id)!, grade(100), 1).profile
    }
    // The first Junior task arrives with the promotion.
    expect(currentTask(profile)?.assignment.id).toBe('budget-report')
    expect(dialogueFor('manager', profile).lines[0]).toContain(
      'Congratulations again on the promotion',
    )
    expect(dialogueFor('manager', profile).lines[0]).toContain('Junior Finance Assistant')
  })
})

describe('other people and things', () => {
  it('Nina welcomes a new starter and later mentions unread mail', () => {
    const fresh = newProfileData('Sam', 0)
    expect(dialogueFor('receptionist', fresh).lines[0]).toContain(
      'welcome to Cobalt Ridge, Sam',
    )
    const busy = start(fresh, 'supplies-order')
    expect(dialogueFor('receptionist', busy).lines[1]).toContain('2 unread emails')
  })

  it('Tom shares a different tip each time', () => {
    const profile = newProfileData('Sam', 0)
    const first = dialogueFor('colleague', profile, 0).lines[1]
    const second = dialogueFor('colleague', profile, 1).lines[1]
    expect(first).not.toBe(second)
    expect(dialogueFor('colleague', profile, -1).lines[1]).toBeTruthy()
  })

  it('the whiteboard shows the week’s tasks and their status', () => {
    const profile = start(newProfileData('Sam', 0), 'supplies-order')
    expect(dialogueFor('whiteboard', profile).lines).toEqual([
      'Price the office supplies order: in progress',
      'Summarise the expense claims: coming up',
      'Check a supplier invoice: coming up',
    ])
  })
})
