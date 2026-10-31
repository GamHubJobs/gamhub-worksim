/**
 * Player profiles: the career save (XP, skills, assignment progress, mail).
 * Works like the documents repository: every change is validated, raises
 * `rev`, is stamped with time and device, and is recorded in the outbox, in
 * one transaction.
 */
import { z } from 'zod'
import { createId } from '../lib/ids'
import { db as defaultDb, getDeviceId, recordChange, type WorkSimDatabase } from './db'
import { createDocument, type NewDocument } from './documentsRepo'
import { InvalidRecordError, NewerFormatError, RecordNotFoundError } from './errors'
import { getMetaValue, setMetaValue } from './meta'
import {
  IdSchema,
  PROFILE_FORMAT_VERSION,
  ProfileSchema,
  type AnyDocument,
  type DocContent,
  type Profile,
  type SlidesContent,
  type TicketsContent,
  type CodeContent,
  type ToolContent,
  type SheetContent,
  type SyncFields,
} from './schemas'
import { createVersion } from './versions'
import { startingWorkState } from './workState'

const ACTIVE_PROFILE_KEY = 'activeProfileId'

/** The parts of a profile that the game controls. */
export type ProfileFields = Omit<Profile, keyof SyncFields | 'formatVersion'>

/**
 * Upgrades an old profile to the current format, one step at a time, like
 * `documentMigrations.ts`.
 * - 1 → 2: adds the working life (office clock, wellbeing, colleagues). Older
 *   careers continue on a fresh Monday morning; their tasks have no deadlines.
 */
export function upgradeProfile(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  const version = (raw as { formatVersion?: unknown }).formatVersion
  if (typeof version !== 'number') return raw
  if (version > PROFILE_FORMAT_VERSION) {
    throw new NewerFormatError('profile', version, PROFILE_FORMAT_VERSION)
  }
  let upgraded = raw as Record<string, unknown>
  if (version < 2) {
    upgraded = { ...upgraded, formatVersion: 2, work: startingWorkState() }
  }
  return upgraded
}

export function parseStoredProfile(raw: unknown, id: string): Profile {
  const result = ProfileSchema.safeParse(upgradeProfile(raw))
  if (!result.success) {
    throw new InvalidRecordError('profiles', id, z.prettifyError(result.error))
  }
  return result.data
}

/** The profile currently in use on this device, if any. */
export async function getActiveProfile(
  database: WorkSimDatabase = defaultDb,
): Promise<Profile | undefined> {
  const id = await getMetaValue(ACTIVE_PROFILE_KEY, IdSchema, database)
  if (id) {
    const raw = await database.profiles.get(id)
    if (raw && !raw.deleted) return parseStoredProfile(raw, id)
  }
  // No active profile recorded (e.g. restored from a backup): use the newest one.
  const all = await database.profiles.toArray()
  const newest = all
    .filter((p) => !p.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  return newest ? parseStoredProfile(newest, newest.id) : undefined
}

/** Every career save on this device (one per career), newest first. */
export async function listProfiles(
  database: WorkSimDatabase = defaultDb,
): Promise<Profile[]> {
  const all = await database.profiles.toArray()
  const profiles: Profile[] = []
  for (const raw of all) {
    if (raw.deleted) continue
    try {
      profiles.push(parseStoredProfile(raw, raw.id))
    } catch (error) {
      console.error(error)
    }
  }
  return profiles.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Makes another career save the one in use. */
export async function setActiveProfile(
  id: string,
  database: WorkSimDatabase = defaultDb,
): Promise<Profile> {
  const raw = await database.profiles.get(id)
  if (!raw || raw.deleted) throw new RecordNotFoundError('profiles', id)
  const profile = parseStoredProfile(raw, id)
  await setMetaValue(ACTIVE_PROFILE_KEY, id, database)
  return profile
}

export async function createProfile(
  fields: ProfileFields,
  database: WorkSimDatabase = defaultDb,
): Promise<Profile> {
  return database.transaction(
    'rw',
    [database.meta, database.profiles, database.outbox],
    async () => {
      const deviceId = await getDeviceId(database)
      const now = Date.now()
      const profile = ProfileSchema.parse({
        ...fields,
        id: createId(),
        createdAt: now,
        updatedAt: now,
        rev: 1,
        deviceId,
        deleted: false,
        formatVersion: PROFILE_FORMAT_VERSION,
      })
      await database.profiles.add(profile)
      await recordChange(database, 'profiles', profile)
      await setMetaValue(ACTIVE_PROFILE_KEY, profile.id, database)
      return profile
    },
  )
}

/** Saves a changed profile (inside an existing transaction). */
async function saveProfile(
  current: Profile,
  fields: ProfileFields,
  database: WorkSimDatabase,
): Promise<Profile> {
  const deviceId = await getDeviceId(database)
  const updated = ProfileSchema.parse({
    ...current,
    ...fields,
    rev: current.rev + 1,
    updatedAt: Math.max(Date.now(), current.updatedAt + 1),
    deviceId,
  })
  await database.profiles.put(updated)
  await recordChange(database, 'profiles', updated)
  return updated
}

async function loadForUpdate(id: string, database: WorkSimDatabase): Promise<Profile> {
  const raw = await database.profiles.get(id)
  if (!raw || raw.deleted) throw new RecordNotFoundError('profiles', id)
  return parseStoredProfile(raw, id)
}

/**
 * Changes a profile. `change` receives the latest saved profile, so changes
 * made at nearly the same moment never overwrite each other.
 */
export async function updateProfile(
  id: string,
  change: (profile: Profile) => ProfileFields,
  database: WorkSimDatabase = defaultDb,
): Promise<Profile> {
  return database.transaction(
    'rw',
    [database.meta, database.profiles, database.outbox],
    async () => {
      const current = await loadForUpdate(id, database)
      return saveProfile(current, change(current), database)
    },
  )
}

/**
 * Starts an assignment: creates its workbook, and its report and presentation
 * if it has them (each with an "original" version in its history), and
 * records them in the profile, all at once. If the assignment was already
 * started, nothing changes.
 */
export async function startAssignment(
  profileId: string,
  input: {
    assignmentId: string
    assignmentVersion: number
    /** The main file: a workbook (default) or a ticket queue. */
    kind?: 'sheet' | 'tickets' | 'code' | 'tool'
    title: string
    content: SheetContent | TicketsContent | CodeContent | ToolContent
    /** A report and/or presentation to create with the workbook. */
    files?: Array<
      | { kind: 'doc'; title: string; content: DocContent }
      | { kind: 'slides'; title: string; content: SlidesContent }
    >
  },
  database: WorkSimDatabase = defaultDb,
): Promise<{ profile: Profile; documentId: string }> {
  return database.transaction(
    'rw',
    [
      database.meta,
      database.profiles,
      database.documents,
      database.documentVersions,
      database.outbox,
    ],
    async () => {
      const current = await loadForUpdate(profileId, database)
      const existing = current.assignments[input.assignmentId]
      if (existing) return { profile: current, documentId: existing.documentId }

      const document = await createDocument(
        (input.kind === 'tool'
          ? { kind: 'tool', title: input.title, content: input.content, owner: profileId }
          : input.kind === 'code'
            ? {
                kind: 'code',
                title: input.title,
                content: input.content,
                owner: profileId,
              }
            : input.kind === 'tickets'
              ? {
                  kind: 'tickets',
                  title: input.title,
                  content: input.content,
                  owner: profileId,
                }
              : {
                  kind: 'sheet',
                  title: input.title,
                  content: input.content,
                  owner: profileId,
                }) as NewDocument,
        database,
      )
      // Kept forever, so the workbook as received can always be restored.
      await createVersion(document, 'original', { keep: true }, database)
      const files: { doc?: string; slides?: string } = {}
      for (const file of input.files ?? []) {
        const created = await createDocument({ ...file, owner: profileId }, database)
        await createVersion(created, 'original', { keep: true }, database)
        files[file.kind] = created.id
      }
      const profile = await saveProfile(
        current,
        {
          ...current,
          assignments: {
            ...current.assignments,
            [input.assignmentId]: {
              assignmentId: input.assignmentId,
              assignmentVersion: input.assignmentVersion,
              documentId: document.id,
              startedAt: Date.now(),
              completedSteps: [],
              attempts: [],
              ...(input.files?.length ? { files } : {}),
            },
          },
        },
        database,
      )
      return { profile, documentId: document.id }
    },
  )
}

/**
 * Records a submission: keeps a copy of every file as submitted (in their
 * version history) and saves the updated profile, together. `change`
 * receives the version ID of the first file (the workbook).
 */
export async function saveSubmission(
  profileId: string,
  documents: AnyDocument | AnyDocument[],
  change: (profile: Profile, versionId: string | undefined) => ProfileFields,
  database: WorkSimDatabase = defaultDb,
): Promise<Profile> {
  const list = Array.isArray(documents) ? documents : [documents]
  return database.transaction(
    'rw',
    [database.meta, database.profiles, database.documentVersions, database.outbox],
    async () => {
      const current = await loadForUpdate(profileId, database)
      const versions = []
      for (const document of list) {
        versions.push(
          await createVersion(document, 'submitted', { keep: true }, database),
        )
      }
      return saveProfile(current, change(current, versions[0]?.id), database)
    },
  )
}
