/**
 * Builds portfolio items for work passed before the portfolio existed (or
 * restored from an older backup). Safe to run any number of times: tasks that
 * already have an item are left alone.
 *
 * The files come from the "Submitted" copies in version history: the main
 * file through the attempt's version ID, the report and presentation through
 * the attempt's links or, for older saves, the task file's submitted copy made
 * at the same moment. A file that can no longer be found is listed as "not
 * available" instead of dropping the whole item.
 */
import { getAssignment } from '../content/assignments'
import type { Assignment } from '../content/schemas'
import {
  bestAttempt,
  decideCapture,
  gradeFromAttempt,
  portfolioKey,
  projectKey,
  type SubmittedFile,
} from '../game/portfolio'
import { db as defaultDb, type WorkSimDatabase } from './db'
import { getDocument } from './documentsRepo'
import { applyCapture, applyProjectCapture, findPortfolioItem } from './portfolio'
import { PROJECTS } from '../content/projects'
import { listProfiles } from './profiles'
import type { AnyDocument, AssignmentProgress, Attempt, Profile } from './schemas'
import { getVersion, listVersions } from './versions'

/** How far from the attempt's time a submitted copy may be (ms). */
const SAME_SUBMISSION = 2 * 60 * 1000

async function submittedCopy(
  documentId: string | undefined,
  versionId: string | undefined,
  submittedAt: number,
  database: WorkSimDatabase,
): Promise<AnyDocument | undefined> {
  if (versionId) {
    const version = await getVersion(versionId, database)
    if (version) return version.snapshot
  }
  if (!documentId) return undefined
  const nearest = (await listVersions(documentId, database))
    .filter((v) => v.reason === 'submitted')
    .map((v) => ({ v, gap: Math.abs(v.createdAt - submittedAt) }))
    .filter(({ gap }) => gap <= SAME_SUBMISSION)
    .sort((a, b) => a.gap - b.gap)[0]
  return nearest?.v.snapshot
}

/** The files handed in with an attempt, and which could not be found. */
async function filesOf(
  assignment: Assignment,
  progress: AssignmentProgress,
  attempt: Attempt,
  database: WorkSimDatabase,
): Promise<{ files: SubmittedFile[]; missing: Set<number> }> {
  const wanted: Array<{
    role: SubmittedFile['role']
    documentId: string | undefined
    versionId: string | undefined
  }> = [{ role: 'main', documentId: progress.documentId, versionId: attempt.versionId }]
  for (const deliverable of assignment.deliverables) {
    const kind = deliverable.kind
    wanted.push({
      role: kind === 'doc' ? 'report' : 'presentation',
      documentId: progress.files?.[kind],
      versionId: attempt.files?.[kind],
    })
  }
  const files: SubmittedFile[] = []
  const missing = new Set<number>()
  for (const { role, documentId, versionId } of wanted) {
    const copy = await submittedCopy(documentId, versionId, attempt.submittedAt, database)
    if (copy) {
      files.push({ role, document: copy })
      continue
    }
    // Not found: list the file (by its current name) as not available.
    const current = documentId ? await getDocument(documentId, database) : undefined
    if (!current) continue
    missing.add(files.length)
    files.push({ role, document: current })
  }
  return { files, missing }
}

async function backfillTask(
  profile: Profile,
  progress: AssignmentProgress,
  database: WorkSimDatabase,
): Promise<boolean> {
  const assignment = getAssignment(progress.assignmentId)
  const attempt = bestAttempt(progress.attempts)
  if (!assignment || !attempt) return false
  const key = portfolioKey(profile.id, assignment.id)
  if (await findPortfolioItem(key, database)) return false
  const { files, missing } = await filesOf(assignment, progress, attempt, database)
  const decision = decideCapture({
    profileId: profile.id,
    assignment,
    grade: gradeFromAttempt(assignment, attempt),
    attempts: progress.attempts,
    submittedAt: attempt.submittedAt,
    files,
    existing: undefined,
  })
  return database.transaction(
    'rw',
    [database.meta, database.outbox, database.portfolioItems, database.portfolioFiles],
    async () => {
      // Checked again inside the transaction, in case a submission just made one.
      if (await findPortfolioItem(key, database)) return false
      await applyCapture(decision, undefined, database, missing)
      return true
    },
  )
}

/** Adds an item for every passed task that has none. Returns how many were added. */
export async function backfillPortfolio(
  database: WorkSimDatabase = defaultDb,
): Promise<number> {
  let added = 0
  for (const profile of await listProfiles(database)) {
    for (const progress of Object.values(profile.assignments)) {
      try {
        if (await backfillTask(profile, progress, database)) added++
      } catch (error) {
        // One damaged task must not stop the others.
        console.error(`Portfolio backfill skipped ${progress.assignmentId}:`, error)
      }
    }
    // Projects whose stages are all in the portfolio now.
    for (const project of PROJECTS.filter((p) => p.careerId === profile.careerId)) {
      const before = await findPortfolioItem(projectKey(profile.id, project.id), database)
      if (before) continue
      const made = await database.transaction(
        'rw',
        [
          database.meta,
          database.outbox,
          database.portfolioItems,
          database.portfolioFiles,
        ],
        () => applyProjectCapture(profile.id, project.id, database),
      )
      if (made) added++
    }
  }
  return added
}
