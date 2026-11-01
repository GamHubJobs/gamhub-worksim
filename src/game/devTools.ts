/**
 * Shortcuts for testing during development only (exposed as
 * `window.__worksim` in development builds; not part of the built app).
 */
import { getAssignment } from '../content/assignments'
import { careerAssessments, hasPassed } from './assessments'
import { getCareer } from '../content/careers'
import { createId } from '../lib/ids'
import { advanceCareer, careerAssignments, type ProfileData } from './career'

/**
 * Pretends every task before `assignmentId` was passed with full marks, and
 * that the player has the level and XP that task needs. The target task's
 * email arrives as usual. The skipped tasks have no workbooks.
 */
export function skipToAssignment(
  profile: ProfileData,
  assignmentId: string,
): ProfileData {
  const target = getAssignment(assignmentId)
  if (!target) return profile
  const assignments = { ...profile.assignments }
  let xp = profile.xp
  for (const assignment of careerAssignments(profile.careerId)) {
    if (assignment.order >= target.order || assignments[assignment.id]) continue
    xp += assignment.xp
    assignments[assignment.id] = {
      assignmentId: assignment.id,
      assignmentVersion: assignment.version,
      documentId: createId(),
      startedAt: Date.now(),
      completedSteps: [],
      attempts: [
        {
          submittedAt: Date.now(),
          score: 100,
          rating: 'excellent',
          checks: [],
          xpEarned: assignment.xp,
          skillXpEarned: {},
        },
      ],
    }
  }
  // The readiness assessments of the levels skipped count as passed.
  const level =
    getCareer(profile.careerId).levels.findIndex((l) => l.id === target.levelId) + 1
  const skipped = careerAssessments(profile.careerId).filter(
    (a) => a.minLevel < level && !hasPassed(profile, a.id),
  )
  const work = {
    ...profile.work,
    record: {
      ...profile.work.record,
      assessments: [
        ...profile.work.record.assessments,
        ...skipped.map((a) => ({
          caseId: a.id,
          version: a.version,
          variant: 'a',
          attempt: 1,
          status: 'submitted' as const,
          arrivedAt: 0,
          due: 0,
          answers: {},
          files: {},
          result: {
            submittedAt: Date.now(),
            score: 100,
            rating: 'excellent' as const,
            steps: [],
          },
        })),
      ],
    },
    reputation: Math.max(profile.work.reputation, 70),
    deadlines: Object.fromEntries(
      Object.entries(profile.work.deadlines).filter(([id]) => !assignments[id]),
    ),
  }
  return advanceCareer(
    { ...profile, xp, assignments, levelId: target.levelId, work },
    Date.now(),
  ).profile
}
