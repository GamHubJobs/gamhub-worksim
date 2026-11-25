/**
 * "The Headquarters Transformation": the story waits for the real design work
 * (career tasks passed in Space Studio) and for the promotion, recognises work
 * done before the story was started, keeps its progress in the save, and ends
 * differently depending on the player's decisions.
 */
import { describe, expect, it } from 'vitest'
import { getAssignment } from '../../content/assignments'
import { WorkStateSchema } from '../../persistence/schemas'
import { newProfileData, recordSubmission, type ProfileData } from '../career'
import type { GradeResult } from '../grading'
// Registers the stories (as the desk does when it loads them).
import './campaigns'
import { ARCHITECTURE_STORY as HQ } from './campaigns/architecture'
import {
  checkStory,
  currentObjective,
  missionsOf,
  playScene,
  progressOf,
  skipTo,
  startMission,
  startStory,
  statusOf,
  storyOf,
} from './engine'

const fresh = () => newProfileData('Robin Hart', 0, 'architecture-interiors')
const story = (p: ProfileData) => storyOf(p)!

const grade = (score: number): GradeResult => ({
  score,
  rating: score >= 90 ? 'excellent' : score >= 70 ? 'pass' : 'fail',
  passed: score >= 70,
  earned: score,
  maxPoints: 100,
  checks: [],
})

/** Starts and hands in a career task (as the Tasks app and Space Studio do). */
function handIn(p: ProfileData, id: string, score: number): ProfileData {
  const assignment = getAssignment(id)!
  let next: ProfileData = p.assignments[id]
    ? p
    : {
        ...p,
        assignments: {
          ...p.assignments,
          [id]: {
            assignmentId: id,
            assignmentVersion: assignment.version,
            documentId: `doc-${id}`,
            startedAt: 1,
            completedSteps: [],
            attempts: [],
          },
        },
      }
  next = recordSubmission(next, assignment, grade(score), 2).profile
  return checkStory(next)
}

describe('The Headquarters Transformation', () => {
  it('begins in the studio, with the department’s people', () => {
    const p = startStory(fresh())
    expect(story(p).active).toBe('first-day')
    expect(currentObjective(HQ, story(p))).toMatchObject({
      kind: 'talk',
      person: 'manager',
    })
    expect(HQ.cast.manager).toBe('Marguerite Achebe')
    expect(HQ.chapters.map((c) => c.title)).toEqual([
      'Chapter 1 · New in the studio',
      'Chapter 2 · The brief',
      'Chapter 3 · Revisions',
      'Chapter 4 · The presentation',
    ])
  })

  it('waits for the design to be passed in Space Studio, not just started or failed', () => {
    let p = skipTo(fresh(), 'first-plan')
    expect(currentObjective(HQ, story(p))).toMatchObject({
      kind: 'task',
      assignment: 'arch-two-bed',
    })
    p = handIn(p, 'arch-two-bed', 40)
    expect(currentObjective(HQ, story(p))?.id).toBe('flat')
    p = handIn(p, 'arch-two-bed', 95)
    expect(currentObjective(HQ, story(p))).toMatchObject({
      kind: 'talk',
      person: 'backM',
    })
  })

  it('recognises a task passed before the story reached it (older saves)', () => {
    let p = handIn(fresh(), 'arch-two-bed', 100)
    p = skipTo(p, 'first-plan')
    expect(currentObjective(HQ, checkStory(p).work.story!)?.id).toBe('sana')
  })

  it('cannot be skipped: the next chapter stays locked until the main missions are done', () => {
    const p = startStory(fresh())
    const announce = missionsOf(HQ).find((m) => m.id === 'hq-announce')!
    expect(statusOf(HQ, story(p), announce)).toBe('locked')
    expect(story(startMission(p, 'hq-announce')).active).toBe('first-day')
  })

  it('needs the real promotion to Designer before the east zone is handed over', () => {
    let p = skipTo(fresh(), 'hq-promoted')
    expect(currentObjective(HQ, story(p))).toMatchObject({
      kind: 'level',
      level: 'designer',
    })
    p = checkStory(p)
    expect(currentObjective(HQ, story(p))?.id).toBe('designer')
    p = checkStory({ ...p, levelId: 'designer' })
    expect(currentObjective(HQ, story(p))).toMatchObject({
      kind: 'talk',
      scene: 'hq-zone',
    })
  })

  it('brings the rehearsal case into the inbox when its mission starts', () => {
    const p = skipTo(fresh(), 'hq-deadline')
    expect(p.work.cases['arch-design-review']?.status).toBeDefined()
  })

  it('keeps its progress in the save', () => {
    const p = skipTo(fresh(), 'hq-riser', ['hq-storage'])
    const saved = WorkStateSchema.parse(JSON.parse(JSON.stringify(p.work)))
    expect(saved.story).toMatchObject({ active: 'hq-riser', flags: ['hq-storage'] })
  })

  /** Plays to the end, choosing the first option (or the last) in every scene. */
  function playAll(choose: 'first' | 'last') {
    let p = startStory(fresh())
    for (let guard = 0; guard < 120; guard++) {
      const s = story(p)
      if (!s.active) {
        const next = missionsOf(HQ).find((m) => statusOf(HQ, s, m) === 'open')
        if (!next) break
        p = startMission(p, next.id)
        continue
      }
      const o = currentObjective(HQ, s)!
      if (o.kind === 'talk') {
        const ids = HQ.scenes[o.scene].choices.map((c) => c.id)
        p = playScene(p, o.scene, choose === 'first' ? ids[0] : ids[ids.length - 1])
      } else if (o.kind === 'task') p = handIn(p, o.assignment, 100)
      else if (o.kind === 'level') p = checkStory({ ...p, levelId: o.level })
      else if (o.kind === 'case')
        p = checkStory({
          ...p,
          work: {
            ...p.work,
            cases: {
              ...p.work.cases,
              [o.case]: { ...p.work.cases[o.case]!, status: 'submitted' },
            },
          },
        })
    }
    return p
  }

  it('builds to the board presentation, and the decisions decide the outcome and the promotion', () => {
    const good = playAll('first')
    const poor = playAll('last')
    for (const p of [good, poor]) {
      expect(story(p).flags).toContain('story-complete')
      const prog = progressOf(HQ, story(p))
      expect(prog.done).toBe(prog.of)
    }
    const finale = missionsOf(HQ).find((m) => m.id === 'hq-next')!
    expect(finale.summary(story(good).flags)).toMatch(
      /put you forward for Senior Designer/,
    )
    expect(finale.summary(story(poor).flags)).toMatch(/no promotion this time/)
    // The board raised exactly the problems the player chose to leave in.
    const board = HQ.scenes['hq-board'].lines(story(poor).flags).join(' ')
    expect(board).toMatch(/post room is in the basement/)
    expect(board).toMatch(/£38,000 duct reroute/)
    expect(HQ.scenes['hq-board'].lines(story(good).flags).join(' ')).toMatch(/cost plan/)
    // And the career itself moved on: every story task was really passed.
    expect(good.assignments['arch-tight']?.attempts.length).toBeGreaterThan(0)
  })
})
