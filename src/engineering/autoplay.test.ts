import { describe, expect, it } from 'vitest'
import { HOURS } from '../content/workday'
import { advanceCareer, newProfileData } from '../game/career'
import { checkAchievements } from '../game/achievements'
import { checkAssessments } from '../game/assessments'
import { checkCases } from '../game/cases'
import { checkEvents } from '../game/events'
import { checkReviews } from '../game/reviews'
import { checkStory } from '../game/story/engine'
import { MailMessageSchema, WorkStateSchema } from '../persistence/schemas'
import { advanceTo, submitCorrected, unlock } from './autoplay'
import {
  REVIEW_MINUTES,
  activeProject,
  checkEngineering,
  recordDocument,
  startConstruction,
} from './engine'

function onSite(id: string) {
  const base = newProfileData('Alex', 1, 'engineering-services')
  let p = unlock({ ...base, work: { ...base.work, minute: HOURS.start } }, id)
  p = submitCorrected(p, id)
  p = checkEngineering({
    ...p,
    work: { ...p.work, minute: p.work.minute + REVIEW_MINUTES },
  })
  const n = activeProject(p)!.revisions.at(-1)!.n
  p = recordDocument(p, id, 'drawings', 'd', n)
  p = recordDocument(p, id, 'quantities', 'q', n)
  return startConstruction(p, id)
}

describe('the tours’ fast-forward (development only)', () => {
  for (const id of ['yard-store', 'mill-footbridge', 'workshop-office'])
    it(`builds the ${id} to handover and the save stays valid`, () => {
      let p = onSite(id)
      expect(activeProject(p)?.status).toBe('construction')
      p = advanceTo(p, 'walls', 0.5)
      // As the game applies it: with every check that runs after an action.
      const now = Date.now()
      p = checkStory(
        checkAchievements(
          checkAssessments(
            checkCases(
              checkEvents(checkReviews(advanceCareer(p, now).profile, now)),
              now,
            ),
          ),
          now,
        ),
      ) as typeof p
      const check = WorkStateSchema.safeParse(p.work)
      expect(check.success ? null : check.error.issues.slice(0, 3)).toBeNull()
      p = advanceTo(p, 'ready')
      const done = WorkStateSchema.safeParse(p.work)
      expect(done.success ? null : done.error.issues.slice(0, 3)).toBeNull()
      expect(activeProject(p)?.inspections.final?.status).toBe('passed')
      // Every message the project sent is a valid message (stamped in real milliseconds).
      for (const m of p.inbox)
        expect(MailMessageSchema.safeParse(m).success, m.subject).toBe(true)
    })
})
