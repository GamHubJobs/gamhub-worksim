import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createId, isId } from '../lib/ids'
import { getDeviceId, WorkSimDatabase } from './db'

let database: WorkSimDatabase

beforeEach(() => {
  // A fresh, empty database for every test.
  database = new WorkSimDatabase(`test-${createId()}`)
})

afterEach(async () => {
  await database.delete()
})

describe('WorkSimDatabase', () => {
  it('opens with all expected tables', async () => {
    await database.open()
    const tableNames = database.tables.map((table) => table.name).sort()
    expect(tableNames).toEqual([
      'documentVersions',
      'documents',
      'meta',
      'outbox',
      'portfolioFiles',
      'portfolioItems',
      'profiles',
      'safetyCopies',
    ])
  })

  it('stores and reads back a value', async () => {
    await database.meta.put({ key: 'greeting', value: 'hello' })
    const entry = await database.meta.get('greeting')
    expect(entry?.value).toBe('hello')
  })

  it('numbers outbox entries automatically in order', async () => {
    const change = {
      table: 'documents',
      recordId: createId(),
      rev: 1,
      changedAt: Date.now(),
    }
    // Add separate copies: Dexie writes the new `seq` number back onto the
    // object it is given, so the same object must never be added twice.
    const first = await database.outbox.add({ ...change })
    const second = await database.outbox.add({ ...change })
    expect(second).toBeGreaterThan(first)
  })
})

describe('getDeviceId', () => {
  it('creates a valid device ID the first time', async () => {
    expect(isId(await getDeviceId(database))).toBe(true)
  })

  it('returns the same ID every time', async () => {
    const first = await getDeviceId(database)
    const second = await getDeviceId(database)
    expect(second).toBe(first)
  })

  it('keeps the same ID after the database is closed and reopened', async () => {
    const first = await getDeviceId(database)
    const name = database.name
    database.close()

    database = new WorkSimDatabase(name)
    expect(await getDeviceId(database)).toBe(first)
  })

  it('creates only one ID when asked twice at the same moment', async () => {
    const [first, second] = await Promise.all([
      getDeviceId(database),
      getDeviceId(database),
    ])
    expect(second).toBe(first)
  })

  it('replaces a damaged device ID with a new valid one', async () => {
    await database.meta.put({ key: 'deviceId', value: 'damaged' })
    expect(isId(await getDeviceId(database))).toBe(true)
  })
})
