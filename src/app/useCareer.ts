/**
 * The player's career for the interface: loads the profile and offers the
 * actions that change it (start a career, start or submit an assignment, read
 * mail, tick off steps). Game rules live in `src/game`, storage in
 * `src/persistence`; this hook only connects them.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAssignment } from '../content/assignments'
import {
  advanceCareer,
  newProfileData,
  recordSubmission,
  type ProfileData,
  type Reward,
} from '../game/career'
import { gradeAssignment, type GradeResult } from '../game/grading'
import { buildQueueContent } from '../game/tickets'
import { buildStartingContent } from '../game/workbooks'
import { checkEvents } from '../game/events'
import { checkReviews } from '../game/reviews'
import { afterSubmission } from '../game/workday'
import { getDocument } from '../persistence/documentsRepo'
import { setActiveCareer } from '../content/departments'
import {
  createProfile,
  getActiveProfile,
  listProfiles,
  setActiveProfile,
  saveSubmission,
  startAssignment as startAssignmentInStorage,
  updateProfile,
} from '../persistence/profiles'
import { createId } from '../lib/ids'
import type {
  AnyDocument,
  DocContent,
  MailMessage,
  Profile,
  SlidesContent,
} from '../persistence/schemas'
import { deliverableFile } from '../game/deliverables'

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

  /**
   * Shows a career save. Its department becomes the active one first, so
   * every name, dialogue and email belongs to the right team.
   */
  const shownId = useRef<string | null>(null)
  const show = useCallback((profile: Profile, opening = false) => {
    // A late save from a career that is no longer on screen (e.g. the clock
    // saving as the old desk closes after a switch) is kept, but not shown.
    if (!opening && shownId.current !== null && profile.id !== shownId.current) return
    shownId.current = profile.id
    setActiveCareer(profile.careerId)
    setState({ status: 'ready', profile })
  }, [])

  useEffect(() => {
    let active = true
    getActiveProfile()
      .then((profile) => {
        if (!active) return
        if (profile) show(profile, true)
        else setState({ status: 'new' })
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: errorMessage(error) })
      })
    return () => {
      active = false
    }
  }, [show])

  const profileId = state.status === 'ready' ? state.profile.id : null

  const createCareer = useCallback(
    async (name: string, careerId?: string) => {
      const profile = await createProfile(newProfileData(name, Date.now(), careerId))
      show(profile, true)
    },
    [show],
  )

  /**
   * Switches to another career: its existing save if there is one, or a new
   * first day in that department (with the same name).
   */
  const switchCareer = useCallback(
    async (careerId: string) => {
      if (state.status !== 'ready') return
      const saves = await listProfiles()
      const existing = saves.find((p) => p.careerId === careerId)
      const profile = existing
        ? await setActiveProfile(existing.id)
        : await createProfile(newProfileData(state.profile.name, Date.now(), careerId))
      show(profile, true)
    },
    [state, show],
  )

  /** Starts an assignment (creating its workbook) and returns the workbook's ID. */
  const startAssignment = useCallback(
    async (assignmentId: string): Promise<string> => {
      const assignment = getAssignment(assignmentId)
      if (!profileId || !assignment) throw new Error('This task could not be found.')
      const playerName = state.status === 'ready' ? state.profile.name : ''
      const { profile, documentId } = await startAssignmentInStorage(profileId, {
        assignmentId,
        assignmentVersion: assignment.version,
        ...(assignment.kind === 'tickets'
          ? {
              kind: 'tickets' as const,
              title: assignment.queue?.title ?? assignment.title,
              content: buildQueueContent(assignment),
            }
          : {
              kind: 'sheet' as const,
              title: assignment.workbook?.title ?? assignment.title,
              content: buildStartingContent(assignment),
            }),
        files: assignment.deliverables.map((d) => deliverableFile(d, playerName)),
      })
      show(profile)
      return documentId
    },
    [profileId, state, show],
  )

  /**
   * Grades an assignment and records the result. Without `attachments`, the
   * task's own workbook is graded (Submit in the task pane). With them (an
   * email to the manager), exactly the attached files are graded: the
   * workbook, report and presentation found among them. The caller must make
   * sure all changes are saved first. `sent` is the email to keep in Sent.
   */
  const submitAssignment = useCallback(
    async (
      assignmentId: string,
      attachments?: string[],
      sent?: MailMessage,
    ): Promise<SubmissionResult> => {
      const assignment = getAssignment(assignmentId)
      if (!profileId || !assignment) throw new Error('This task could not be found.')
      if (state.status !== 'ready') throw new Error('Your career is not loaded yet.')
      const progress = state.profile.assignments[assignmentId]
      if (!progress) throw new Error('This task has not been started yet.')

      // The main file is a workbook, or a ticket queue for Help Desk tasks.
      const mainKind = assignment.kind
      let main: AnyDocument | null = null
      const files: { doc?: DocContent; slides?: SlidesContent } = {}
      const handedIn: AnyDocument[] = []
      if (!attachments) {
        const document = await getDocument(progress.documentId)
        if (!document || document.kind !== mainKind) {
          throw new Error('The main file for this task could not be found.')
        }
        main = document
        handedIn.push(document)
      } else {
        // The task's own files first, then any other attached file of each kind.
        const preferred = [
          progress.documentId,
          progress.files?.doc,
          progress.files?.slides,
        ]
        const ordered = [
          ...attachments.filter((id) => preferred.includes(id)),
          ...attachments.filter((id) => !preferred.includes(id)),
        ]
        for (const id of ordered) {
          const document = await getDocument(id)
          if (!document) continue
          if (document.kind === mainKind && !main) main = document
          else if (document.kind === 'doc' && !files.doc) files.doc = document.content
          else if (document.kind === 'slides' && !files.slides)
            files.slides = document.content
          else continue
          handedIn.push(document)
        }
      }

      const grade = gradeAssignment(
        assignment,
        main?.kind === 'sheet' || main?.kind === 'tickets' ? main.content : null,
        files,
      )
      let reward: Reward | null = null
      const profile = await saveSubmission(profileId, handedIn, (latest, versionId) => {
        const withSent = sent ? { ...latest, inbox: [...latest.inbox, sent] } : latest
        const result = recordSubmission(
          withSent,
          assignment,
          grade,
          Date.now(),
          main ? versionId : undefined,
        )
        reward = result.reward
        return {
          ...latest,
          ...checkEvents(
            afterSubmission(result.profile, assignment, grade, result.reward),
          ),
        }
      })
      show(profile)
      return { assignmentId, grade, reward: reward! }
    },
    [profileId, state, show],
  )

  /**
   * Sends an email (a reply to a colleague), with files attached. A reply to a
   * task email of a started task hands the work in: the attachments are
   * graded and the manager replies with feedback. Returns the result then.
   */
  const sendMail = useCallback(
    async (input: {
      replyTo: MailMessage
      body: string
      attachments: Array<{
        documentId: string
        kind: 'sheet' | 'doc' | 'slides' | 'tickets'
        title: string
      }>
    }): Promise<SubmissionResult | null> => {
      if (!profileId || state.status !== 'ready') return null
      const now = Date.now()
      const subject = input.replyTo.subject.startsWith('Re:')
        ? input.replyTo.subject
        : `Re: ${input.replyTo.subject}`
      const sent: MailMessage = {
        id: createId(),
        from: 'me',
        to: input.replyTo.from,
        kind: 'sent',
        subject,
        body: input.body,
        receivedAt: now,
        readAt: now,
        ...(input.replyTo.assignmentId
          ? { assignmentId: input.replyTo.assignmentId }
          : {}),
        attachments: input.attachments,
      }
      const assignmentId = input.replyTo.assignmentId
      if (assignmentId && state.profile.assignments[assignmentId]) {
        return submitAssignment(
          assignmentId,
          input.attachments.map((a) => a.documentId),
          sent,
        )
      }
      const profile = await updateProfile(profileId, (latest) => ({
        ...latest,
        inbox: [...latest.inbox, sent],
      }))
      show(profile)
      return null
    },
    [profileId, state, submitAssignment, show],
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
      show(profile)
    },
    [profileId, show],
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
      show(profile)
    },
    [profileId, show],
  )

  /**
   * Applies a game action (see `src/game`) to the latest saved profile,
   * starts any workplace event it causes, and saves the result. Returns the
   * saved profile.
   */
  const act = useCallback(
    async (change: (profile: ProfileData) => ProfileData): Promise<Profile | null> => {
      if (!profileId) return null
      const now = Date.now()
      const profile = await updateProfile(profileId, (latest) => {
        // After the action: promotions and new tasks, Friday's review if it
        // was missed, then any workplace event the new situation causes.
        const changed = advanceCareer(change(latest), now).profile
        return { ...latest, ...checkEvents(checkReviews(changed, now)) }
      })
      show(profile)
      return profile
    },
    [profileId, show],
  )

  return {
    state,
    createCareer,
    startAssignment,
    submitAssignment,
    sendMail,
    switchCareer,
    markRead,
    toggleStep,
    act,
  }
}

export type Career = ReturnType<typeof useCareer>
