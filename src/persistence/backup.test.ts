import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createSheetContent, setCellInput } from '../apps/sheets/model'
import { createId } from '../lib/ids'
import {
  BACKUP_REMINDER_INTERVAL_MS,
  BackupError,
  exportBackup,
  getBackupStatus,
  importBackup,
  isBackedUpTable,
  readBackupFile,
  shouldRemindToBackUp,
  snoozeBackupReminder,
  TABLE_VALIDATORS,
} from './backup'
import { CURRENT_DATABASE_VERSION, getDeviceId, WorkSimDatabase } from './db'
import { createDocument, getDocument, listDocuments } from './documentsRepo'
import { getMetaValue, setMetaValue } from './meta'
import { IdSchema } from './schemas'
import { createVersion, listVersions } from './versions'

const databases: WorkSimDatabase[] = []

function newDatabase() {
  const database = new WorkSimDatabase(`test-${createId()}`)
  databases.push(database)
  return database
}

let source: WorkSimDatabase

beforeEach(() => {
  source = newDatabase()
})

afterEach(async () => {
  for (const database of databases.splice(0)) await database.delete()
})

async function addWorkbook(database: WorkSimDatabase, title: string, value: string) {
  const empty = createSheetContent()
  const content = setCellInput(empty, empty.sheets[0].id, 'A1', value)
  return createDocument({ kind: 'sheet', title, content }, database)
}

describe('backup round trip', () => {
  it('restores documents, versions and settings exactly', async () => {
    const workbook = await addWorkbook(source, 'Expenses', '120.50')
    await createVersion(workbook, 'manual', { keep: true }, source)
    await setMetaValue('workbenchDocumentId', workbook.id, source)

    const { text } = await exportBackup(source)
    const target = newDatabase()
    const preview = await readBackupFile(text)
    expect(preview.counts).toMatchObject({ documents: 1, documentVersions: 1 })
    expect(preview.documentTitles).toEqual(['Expenses'])
    expect(preview.skippedCount).toBe(0)

    await importBackup(preview, target)
    expect(await getDocument(workbook.id, target)).toEqual(workbook)
    expect(await listVersions(workbook.id, target)).toHaveLength(1)
    expect(await getMetaValue('workbenchDocumentId', IdSchema, target)).toBe(workbook.id)
  })

  it("keeps the importing device's own ID and backup history", async () => {
    await addWorkbook(source, 'Expenses', '1')
    const { text } = await exportBackup(source)

    const target = newDatabase()
    const targetDeviceId = await getDeviceId(target)
    await importBackup(await readBackupFile(text), target)

    expect(await getDeviceId(target)).toBe(targetDeviceId)
    expect((await getBackupStatus(target)).lastBackupAt).toBeNull()
  })

  it('replaces the data that was there before', async () => {
    await addWorkbook(source, 'From backup', '1')
    const { text } = await exportBackup(source)

    const target = newDatabase()
    await addWorkbook(target, 'Will be replaced', '2')
    await importBackup(await readBackupFile(text), target)

    const titles = (await listDocuments(target)).map((document) => document.title)
    expect(titles).toEqual(['From backup'])
  })

  it('marks imported records for future cloud sync', async () => {
    const workbook = await addWorkbook(source, 'Expenses', '1')
    const { text } = await exportBackup(source)

    const target = newDatabase()
    await importBackup(await readBackupFile(text), target)
    const outbox = await target.outbox.toArray()
    expect(outbox.some((entry) => entry.recordId === workbook.id)).toBe(true)
  })

  it('includes every table that holds player data', async () => {
    await source.open()
    for (const table of source.tables) {
      if (isBackedUpTable(table.name)) {
        expect(TABLE_VALIDATORS[table.name], `validator for ${table.name}`).toBeDefined()
      }
    }
  })

  it('suggests a dated file name and records the backup time', async () => {
    const { fileName } = await exportBackup(source)
    expect(fileName).toMatch(/^gamhub-worksim-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
    expect((await getBackupStatus(source)).lastBackupAt).not.toBeNull()
  })
})

describe('readBackupFile rejects unusable files', () => {
  async function validBackupJson() {
    await addWorkbook(source, 'Expenses', '1')
    return JSON.parse((await exportBackup(source)).text) as Record<string, unknown>
  }

  it('rejects a file that is not JSON', async () => {
    await expect(readBackupFile('hello')).rejects.toThrow(BackupError)
  })

  it('rejects JSON that is not a WorkSim backup', async () => {
    await expect(readBackupFile('{"name":"something else"}')).rejects.toThrow(
      /not a GamHub WorkSim backup/,
    )
  })

  it('rejects a backup that was changed after saving', async () => {
    const backup = await validBackupJson()
    const text = JSON.stringify(backup).replace('Expenses', 'Edited!!')
    await expect(readBackupFile(text)).rejects.toThrow(/damaged/)
  })

  it('rejects a backup from a newer version of the app', async () => {
    const backup = await validBackupJson()
    backup.databaseVersion = CURRENT_DATABASE_VERSION + 1
    await expect(readBackupFile(JSON.stringify(backup))).rejects.toThrow(/newer version/)
  })

  it('skips damaged items but keeps the rest', async () => {
    await addWorkbook(source, 'Good', '1')
    const bad = await addWorkbook(source, 'Bad', '2')
    await source.documents.update(bad.id, { rev: -1 })

    const preview = await readBackupFile((await exportBackup(source)).text)
    expect(preview.documentTitles).toEqual(['Good'])
    expect(preview.skippedCount).toBe(1)
  })
})

describe('backup reminders', () => {
  const day = 24 * 60 * 60 * 1000
  const now = 100 * day

  it('does not remind when nothing has been saved', () => {
    expect(shouldRemindToBackUp({ now })).toBe(false)
  })

  it('does not remind a new player during their first week', () => {
    expect(
      shouldRemindToBackUp({ now, firstCreatedAt: now - 2 * day, lastChangedAt: now }),
    ).toBe(false)
  })

  it('reminds after a week of work without any backup', () => {
    expect(
      shouldRemindToBackUp({ now, firstCreatedAt: now - 8 * day, lastChangedAt: now }),
    ).toBe(true)
  })

  it('reminds a week after the last backup if there were changes since', () => {
    const lastBackupAt = now - BACKUP_REMINDER_INTERVAL_MS
    expect(shouldRemindToBackUp({ now, lastBackupAt, lastChangedAt: now - day })).toBe(
      true,
    )
  })

  it('does not remind if nothing changed since the last backup', () => {
    const lastBackupAt = now - 30 * day
    expect(
      shouldRemindToBackUp({ now, lastBackupAt, lastChangedAt: lastBackupAt - 1 }),
    ).toBe(false)
  })

  it('does not remind while snoozed', () => {
    expect(
      shouldRemindToBackUp({
        now,
        firstCreatedAt: now - 30 * day,
        lastChangedAt: now,
        snoozedUntil: now + day,
      }),
    ).toBe(false)
  })

  it('can be snoozed', async () => {
    await snoozeBackupReminder(source)
    expect((await getBackupStatus(source)).reminderDue).toBe(false)
  })
})
