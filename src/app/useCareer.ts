/**
 * The player's career for the interface: loads the profile and offers the
 * actions that change it (start a career, start or submit an assignment, read
 * mail, tick off steps). Game rules live in `src/game`, storage in
 * `src/persistence`; this hook only connects them.
 */
import { useCallback, useEffect, useState } from 'react'
import { getAssignment } from '../content/assignments'
import { newProfileData, recordSubmission, type Reward } from '../game/career'
import { gradeAssignment, type GradeResult } from '../game/grading'
import { buildStartingContent } from '../game/workbooks'
import { getDocument } from '../persistence/documentsRepo'
import {
  createProfile,
  getActiveProfile,
  saveSubmission,
  startAssignment as startAssignmentInStorage,
  updateProfile,
} from '../persistence/profiles'
import type { Profile } from '../persistence/schemas'

export type CareerState =
  | { status: 'loading' }
  | { status: 'new' }
  | { status: 'ready'; profile: Profile }
  | { status: 'error'; message: string }

export interface SubmissionResult {
  assignmentId: string
  grade: GradeResult
  reward: Reward
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useCareer() {
  const [state, setState] = useState<CareerState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    getActiveProfile()
      .then((profile) => {
        if (active) setState(profile ? { status: 'ready', profile } : { status: 'new' })
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: errorMessage(error) })
      })
    return () => {
      active = false
    }
  }, [])

  const profileId = state.status === 'ready' ? state.profile.id : null

  const createCareer = useCallback(async (name: string) => {
    const profile = await createProfile(newProfileData(name, Date.now()))
    setState({ status: 'ready', profile })
  }, [])

  /** Starts an assignment (creating its workbook) and returns the workbook's ID. */
  const startAssignment = useCallback(
    async (assignmentId: string): Promise<string> => {
      const assignment = getAssignment(assignmentId)
      if (!profileId || !assignment) throw new Error('This task could not be found.')
      const { profile, documentId } = await startAssignmentInStorage(profileId, {
        assignmentId,
        assignmentVersion: assignment.version,
        title: assignment.workbook.title,
        content: buildStartingContent(assignment),
      })
      setState({ status: 'ready', profile })
      return documentId
    },
    [profileId],
  )

  /**
   * Grades the saved workbook of an assignment and records the result. The
   * caller must make sure all changes are saved first.
   */
  const submitAssignment = useCallback(
    async (assignmentId: string): Promise<SubmissionResult> => {
      const assignment = getAssignment(assignmentId)
      if (!profileId || !assignment) throw new Error('This task could not be found.')
      if (state.status !== 'ready') throw new Error('Your career is not loaded yet.')
      const progress = state.profile.assignments[assignmentId]
      const document = progress ? await getDocument(progress.documentId) : undefined
      if (!document || document.kind !== 'sheet') {
        throw new Error('The workbook for this task could not be found.')
      }
      const grade = gradeAssignment(assignment, document.content)
      let reward: Reward | null = null
      const profile = await saveSubmission(profileId, document, (latest, versionId) => {
        const result = recordSubmission(latest, assignment, grade, Date.now(), versionId)
        reward = result.reward
        return { ...latest, ...result.profile }
      })
      setState({ status: 'ready', profile })
      return { assignmentId, grade, reward: reward! }
    },
    [profileId, state],
  )

  const markRead = useCallback(
    async (mailId: string) => {
      if (!profileId) return
      const profile = await updateProfile(profileId, (latest) => ({
        ...latest,
        inbox: latest.inbox.map((mail) =>
          mail.id === mailId && mail.readAt === null
            ? { ...mail, readAt: Date.now() }
            : mail,
        ),
      }))
      setState({ status: 'ready', profile })
    },
    [profileId],
  )

  const toggleStep = useCallback(
    async (assignmentId: string, stepId: string) => {
      if (!profileId) return
      const profile = await updateProfile(profileId, (latest) => {
        const progress = latest.assignments[assignmentId]
        if (!progress) return latest
        const done = progress.completedSteps.includes(stepId)
        return {
          ...latest,
          assignments: {
            ...latest.assignments,
            [assignmentId]: {
              ...progress,
              completedSteps: done
                ? progress.completedSteps.filter((id) => id !== stepId)
                : [...progress.completedSteps, stepId],
            },
          },
        }
      })
      setState({ status: 'ready', profile })
    },
    [profileId],
  )

  return { state, createCareer, startAssignment, submitAssignment, markRead, toggleStep }
}

export type Career = ReturnType<typeof useCareer>
