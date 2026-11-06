/**
 * The player's career for the interface: loads the profile and offers the
 * actions that change it (start a career, start or submit an assignment, read
 * mail, tick off steps). Game rules live in `src/game`, storage in
 * `src/persistence`; this hook only connects them.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { protectBeforeUpgrade } from '../persistence/safety'
import { gradePractical, startingFile } from '../game/practical'
import { loadCareers } from '../content/loader'
import {
  caseKey,
  decideCapture,
  decideCaseCapture,
  portfolioKey,
} from '../game/portfolio'
import {
  caseContext,
  checkCases,
  gradeCase,
  NO_AUTHORITY,
  type Practicals,
  levelNumber,
  recordCaseResult,
  saveCaseAnswer,
} from '../game/cases'
import { caseRecordContent } from '../game/caseRecord'
import { caseFor } from '../game/caseVariants'
import { checkStory } from '../game/story/engine'
import { careerLevel, DEFAULT_CAREER_ID } from '../game/career'
import { getDeviceId } from '../persistence/db'
import { DOCUMENT_FORMAT_VERSIONS } from '../persistence/schemas'
import type { CaseResult } from '../game/cases'
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
import { buildProjectContent } from '../game/code/grading'
import { gradeCodeSafely } from '../game/code/runInWorker'
import { gradeToolTask } from '../tools/grading'
import { buildStartingContent } from '../game/workbooks'
import { checkEvents } from '../game/events'
import { checkAchievements } from '../game/achievements'
import {
  attemptDef,
  checkAssessments,
  openAttempt,
  recordAssessmentResult,
} from '../game/assessments'
import { checkReviews } from '../game/reviews'
import { afterSubmission } from '../game/workday'
import { getDocument } from '../persistence/documentsRepo'
import { backfillPortfolio } from '../persistence/portfolioBackfill'
import { setActiveCareer } from '../content/departments'
import {
  createProfile,
  getActiveProfile,
  listProfiles,
  setActiveProfile,
  saveSubmission,
  startAssessmentFile,
  startCaseFile,
  startAssignment as startAssignmentInStorage,
  updateProfile,
} from '../persistence/profiles'
import { createId } from '../lib/ids'
import type {
  AnyDocument,
  DocContent,
  MailMessage,
  PortfolioFileRole,
  PortfolioItem,
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

/** A random seed for a new save's case variants (never 0, which is the original wording). */
function newSeed(): number {
  // The browser tests fix the seed (0 = every case in its original wording).
  const fixed = import.meta.env.VITE_CASE_SEED as string | undefined
  if (fixed !== undefined) return Number(fixed)
  return 1 + Math.floor(Math.random() * 0x7ffffffe)
}

/**
 * Loads the content of these careers, with a message a player can act on if
 * it fails (usually a lost connection before WorkSim was fully downloaded).
 */
async function ensureContent(careerIds: Iterable<string>): Promise<void> {
  try {
    await loadCareers(careerIds)
  } catch (error) {
    console.error('Career content failed to load:', error)
    throw new Error(
      'WorkSim could not load the content for this career. Check your internet connection (it is needed the first time a career is opened) and try again.',
    )
  }
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
    // Work passed in older saves (or restored backups) joins the portfolio.
    // A problem here must never stop the game from opening.
    // The content of every career with a save is loaded first: the portfolio
    // and the career overview look up their tasks and cases.
    // Saves in an older format are upgraded as they are next saved: keep a
    // safety copy of them as they are first. A problem here must not stop
    // WorkSim from opening.
    protectBeforeUpgrade()
      .catch((error: unknown) => console.error('Safety copy failed:', error))
      .then(() => listProfiles())
      .then((saves) => ensureContent(saves.map((p) => p.careerId)))
      .then(() =>
        backfillPortfolio().catch((error: unknown) =>
          console.error('Portfolio backfill failed:', error),
        ),
      )
      .then(() => getActiveProfile())
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
      await ensureContent([careerId ?? DEFAULT_CAREER_ID])
      const profile = await createProfile(
        newProfileData(name, Date.now(), careerId, newSeed()),
      )
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
      await ensureContent([careerId])
      const saves = await listProfiles()
      const existing = saves.find((p) => p.careerId === careerId)
      const profile = existing
        ? await setActiveProfile(existing.id)
        : await createProfile(
            newProfileData(state.profile.name, Date.now(), careerId, newSeed()),
          )
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
        ...(assignment.kind === 'tool' && assignment.tool
          ? {
              kind: 'tool' as const,
              title: assignment.tool.title,
              content: { tool: assignment.tool.id, state: assignment.tool.start },
            }
          : assignment.kind === 'code'
            ? {
                kind: 'code' as const,
                title: assignment.project?.title ?? assignment.title,
                content: buildProjectContent(assignment),
              }
            : assignment.kind === 'tickets'
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

      const mainContent =
        main?.kind === 'sheet' || main?.kind === 'tickets' || main?.kind === 'code'
          ? main.content
          : null
      const toolChecks =
        assignment.kind === 'tool'
          ? gradeToolTask(assignment, main?.kind === 'tool' ? main.content : null)
          : []
      // The player's code runs in a worker, with a time limit.
      const codeChecks =
        assignment.kind === 'code'
          ? await gradeCodeSafely(assignment, main?.kind === 'code' ? main.content : null)
          : []
      const grade = gradeAssignment(assignment, mainContent, files, [
        ...codeChecks,
        ...toolChecks,
      ])
      let reward: Reward | null = null
      // Each handed-in file's role in the portfolio, and its submitted version.
      const roleOf = (document: AnyDocument): PortfolioFileRole =>
        document === main
          ? 'main'
          : document.kind === 'slides'
            ? 'presentation'
            : 'report'
      const submittedAt = Date.now()
      const capture = {
        key: portfolioKey(profileId, assignment.id),
        projectId: assignment.projectId,
        decide: (saved: Profile, existing: PortfolioItem | undefined) =>
          decideCapture({
            profileId,
            assignment,
            grade,
            attempts: saved.assignments[assignment.id]?.attempts ?? [],
            submittedAt,
            files: handedIn.map((document) => ({ role: roleOf(document), document })),
            existing,
          }),
      }
      const profile = await saveSubmission(
        profileId,
        handedIn,
        (latest, versionId, versions) => {
          const withSent = sent ? { ...latest, inbox: [...latest.inbox, sent] } : latest
          const versionOf = (kind: 'doc' | 'slides') =>
            versions[handedIn.findIndex((d) => d !== main && d.kind === kind)]?.id
          const result = recordSubmission(
            withSent,
            assignment,
            grade,
            submittedAt,
            main ? versionId : undefined,
            { doc: versionOf('doc'), slides: versionOf('slides') },
          )
          reward = result.reward
          return {
            ...latest,
            ...checkAchievements(
              checkCases(
                checkEvents(
                  afterSubmission(result.profile, assignment, grade, result.reward),
                ),
              ),
              submittedAt,
            ),
          }
        },
        undefined,
        capture,
      )
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
        kind: 'sheet' | 'doc' | 'slides' | 'tickets' | 'code' | 'tool'
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
        return {
          ...latest,
          // The story moves on with whatever has just come true.
          ...checkStory(
            checkAchievements(
              checkAssessments(checkCases(checkEvents(checkReviews(changed, now)), now)),
              now,
            ),
          ),
        }
      })
      show(profile)
      return profile
    },
    [profileId, show],
  )

  /** Saves a draft answer to a step of an open case. */
  const saveCaseStep = useCallback(
    (caseId: string, stepId: string, answer: unknown) =>
      act((p) => saveCaseAnswer(p, caseId, stepId, answer)),
    [act],
  )

  /** Creates (or finds) the file for a case's document step. */
  const openCaseFile = useCallback(
    async (caseId: string, stepId: string): Promise<string> => {
      if (!profileId || state.status !== 'ready')
        throw new Error('Your career is not loaded yet.')
      const def = caseFor(state.profile, caseId)
      const step = def?.steps.find((s) => s.id === stepId)
      if (!def || step?.kind !== 'document')
        throw new Error('This case has no such document.')
      const { profile, documentId } = await startCaseFile(
        profileId,
        caseId,
        stepId,
        deliverableFile(step.deliverable, state.profile.name),
      )
      show(profile)
      return documentId
    },
    [profileId, state, show],
  )

  /**
   * Submits a case: grades it, records the result and its consequences, and
   * keeps the evidence in the portfolio when it passes, all in one save.
   */
  const submitCase = useCallback(
    async (caseId: string): Promise<CaseResult> => {
      if (!profileId || state.status !== 'ready')
        throw new Error('Your career is not loaded yet.')
      const def = caseFor(state.profile, caseId)
      const progress = state.profile.work.cases[caseId]
      if (!def || !progress || progress.status !== 'open') {
        throw new Error('This case is no longer open.')
      }
      // The documents made for the case, as they are now.
      const handedIn: AnyDocument[] = []
      const contents: Record<string, DocContent | SlidesContent | undefined> = {}
      for (const step of def.steps) {
        const fileId = progress.files[step.id]
        const document = fileId ? await getDocument(fileId) : undefined
        if (document && (document.kind === 'doc' || document.kind === 'slides')) {
          handedIn.push(document)
          contents[step.id] = document.content
        }
      }
      const submittedAt = Date.now()
      const deviceId = await getDeviceId()
      // Graded inside the save, from the answers as they are stored then, so an
      // answer saved a moment before submitting is never missed.
      let result: CaseResult | null = null
      let record: AnyDocument | null = null
      let level = { id: '', title: '', index: 1 }
      const capture = {
        key: caseKey(profileId, caseId),
        projectId: def.projectId,
        decide: () =>
          decideCaseCapture({
            profileId,
            def,
            result: result!,
            level,
            submittedAt,
            files: [
              { role: 'main' as const, document: record! },
              ...handedIn.map((document) => ({
                role:
                  document.kind === 'slides'
                    ? ('presentation' as const)
                    : ('report' as const),
                document,
              })),
            ],
          }),
      }
      const profile = await saveSubmission(
        profileId,
        handedIn,
        (latest) => {
          const answers = latest.work.cases[caseId]?.answers ?? {}
          result = gradeCase(
            def,
            answers,
            contents,
            caseContext(latest),
            latest.work.cases[caseId]?.joinedAt !== undefined,
          )
          const { current } = careerLevel(latest)
          level = {
            id: current.id,
            title: current.title,
            index: Math.max(1, levelNumber(latest)),
          }
          record = {
            id: createId(),
            createdAt: submittedAt,
            updatedAt: submittedAt,
            rev: 1,
            deviceId,
            deleted: false,
            title: `Case record: ${def.title}`,
            owner: profileId,
            formatVersion: DOCUMENT_FORMAT_VERSIONS.doc,
            kind: 'doc',
            content: caseRecordContent(def, answers, result, latest.name),
          }
          return {
            ...latest,
            ...checkStory(
              checkAchievements(
                checkCases(
                  recordCaseResult(latest, def, result, submittedAt),
                  submittedAt,
                ),
                submittedAt,
              ),
            ),
          }
        },
        undefined,
        capture,
      )
      show(profile)
      return result!
    },
    [profileId, state, show],
  )

  /** Creates (or finds) the report file of the open assessment attempt. */
  const openAssessmentFile = useCallback(
    async (assessmentId: string, stepId: string): Promise<string> => {
      if (!profileId || state.status !== 'ready')
        throw new Error('Your career is not loaded yet.')
      const open = openAttempt(state.profile, assessmentId)
      const def = open ? attemptDef(open) : undefined
      const step = def?.steps.find((s) => s.id === stepId)
      const task =
        step?.kind === 'practical' ? getAssignment(step.assignmentId) : undefined
      const file =
        step?.kind === 'document'
          ? deliverableFile(step.deliverable, state.profile.name)
          : task
            ? startingFile(task)
            : null
      if (!def || !file) throw new Error('This assessment has no such file.')
      const { profile, documentId } = await startAssessmentFile(
        profileId,
        assessmentId,
        stepId,
        file,
      )
      show(profile)
      return documentId
    },
    [profileId, state, show],
  )

  /**
   * Submits the open attempt at an assessment: grades the answers and the
   * report as they are saved, records the result (and a promotion it allows),
   * and keeps a passed attempt in the portfolio, all in one save.
   */
  const submitAssessment = useCallback(
    async (assessmentId: string): Promise<CaseResult> => {
      if (!profileId || state.status !== 'ready')
        throw new Error('Your career is not loaded yet.')
      const open = openAttempt(state.profile, assessmentId)
      const def = open ? attemptDef(open) : undefined
      if (!open || !def) throw new Error('This assessment is not in progress.')
      const handedIn: AnyDocument[] = []
      const contents: Record<string, DocContent | SlidesContent | undefined> = {}
      for (const step of def.steps) {
        const fileId = open.files[step.id]
        const document = fileId ? await getDocument(fileId) : undefined
        if (document && (document.kind === 'doc' || document.kind === 'slides')) {
          handedIn.push(document)
          contents[step.id] = document.content
        }
      }
      // Practical work is graded in its tool first, by the task's own checks
      // (code runs in a worker), and handed in with the assessment.
      const practicals: Practicals = {}
      for (const step of def.steps) {
        if (step.kind !== 'practical') continue
        const task = getAssignment(step.assignmentId)
        const fileId = open.files[step.id]
        const document = fileId ? await getDocument(fileId) : undefined
        if (document && document.kind !== 'doc' && document.kind !== 'slides')
          handedIn.push(document)
        practicals[step.id] = task
          ? await gradePractical(task, document)
          : { fraction: 0, notes: ['This task could not be found.'] }
      }
      const submittedAt = Date.now()
      const deviceId = await getDeviceId()
      let result: CaseResult | null = null
      let record: AnyDocument | null = null
      let level = { id: '', title: '', index: 1 }
      const capture = {
        key: caseKey(profileId, assessmentId),
        decide: () =>
          decideCaseCapture({
            profileId,
            def,
            result: result!,
            level,
            submittedAt,
            files: [
              { role: 'main' as const, document: record! },
              ...handedIn.map((document) => ({
                role:
                  document.kind === 'slides'
                    ? ('presentation' as const)
                    : ('report' as const),
                document,
              })),
            ],
          }),
      }
      const profile = await saveSubmission(
        profileId,
        handedIn,
        (latest) => {
          const answers = openAttempt(latest, assessmentId)?.answers ?? {}
          result = gradeCase(def, answers, contents, NO_AUTHORITY, true, practicals)
          const { current } = careerLevel(latest)
          level = {
            id: current.id,
            title: current.title,
            index: Math.max(1, levelNumber(latest)),
          }
          record = {
            id: createId(),
            createdAt: submittedAt,
            updatedAt: submittedAt,
            rev: 1,
            deviceId,
            deleted: false,
            title: `Assessment record: ${def.title.replace(/^Readiness assessment: /, '')}`,
            owner: profileId,
            formatVersion: DOCUMENT_FORMAT_VERSIONS.doc,
            kind: 'doc',
            content: caseRecordContent(def, answers, result, latest.name),
          }
          const recorded = recordAssessmentResult(
            latest,
            assessmentId,
            result,
            submittedAt,
          )
          return {
            ...latest,
            ...checkAchievements(
              advanceCareer(recorded, submittedAt).profile,
              submittedAt,
            ),
          }
        },
        undefined,
        capture,
      )
      show(profile)
      return result!
    },
    [profileId, state, show],
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
    saveCaseStep,
    openCaseFile,
    submitCase,
    openAssessmentFile,
    submitAssessment,
  }
}

export type Career = ReturnType<typeof useCareer>
