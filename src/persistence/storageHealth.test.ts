import { describe, expect, it, vi } from 'vitest'
import {
  checkStorageHealth,
  formatBytes,
  isIndexedDbUsable,
  requestPersistentStorage,
} from './storageHealth'

const MB = 1024 * 1024
const GB = 1024 * MB

function fakeStorage(options: { persisted?: boolean; usage?: number; quota?: number }) {
  return {
    persisted: vi.fn(async () => options.persisted ?? false),
    persist: vi.fn(async () => true),
    estimate: vi.fn(async () => ({ usage: options.usage, quota: options.quota })),
  }
}

describe('checkStorageHealth', () => {
  it('reports a healthy, protected storage', async () => {
    const health = await checkStorageHealth(
      fakeStorage({ persisted: true, usage: 2 * MB, quota: 10 * GB }),
    )
    expect(health).toEqual({
      persisted: true,
      usageBytes: 2 * MB,
      quotaBytes: 10 * GB,
      lowSpace: false,
      restrictedQuota: false,
    })
  })

  it('warns when little space is left', async () => {
    const health = await checkStorageHealth(
      fakeStorage({ usage: 990 * MB, quota: 1 * GB }),
    )
    expect(health.lowSpace).toBe(true)
  })

  it('warns about a very small quota (e.g. private windows)', async () => {
    const health = await checkStorageHealth(
      fakeStorage({ usage: 1 * MB, quota: 100 * MB }),
    )
    expect(health.restrictedQuota).toBe(true)
  })

  it('copes with a browser that offers no storage information', async () => {
    const health = await checkStorageHealth(null)
    expect(health).toMatchObject({ persisted: null, usageBytes: null, lowSpace: false })
  })

  it('copes with storage calls that fail', async () => {
    const broken = {
      persisted: vi.fn(async () => {
        throw new Error('nope')
      }),
      persist: vi.fn(),
      estimate: vi.fn(async () => {
        throw new Error('nope')
      }),
    }
    const health = await checkStorageHealth(broken)
    expect(health.persisted).toBeNull()
    expect(health.quotaBytes).toBeNull()
  })
})

describe('requestPersistentStorage', () => {
  it('does not ask again when already protected', async () => {
    const storage = fakeStorage({ persisted: true })
    expect(await requestPersistentStorage(storage)).toBe(true)
    expect(storage.persist).not.toHaveBeenCalled()
  })

  it('asks the browser when not yet protected', async () => {
    const storage = fakeStorage({ persisted: false })
    expect(await requestPersistentStorage(storage)).toBe(true)
    expect(storage.persist).toHaveBeenCalledOnce()
  })

  it('returns null when asking is not supported', async () => {
    expect(await requestPersistentStorage(null)).toBeNull()
  })
})

describe('isIndexedDbUsable', () => {
  it('detects a working IndexedDB', async () => {
    expect(await isIndexedDbUsable()).toBe(true)
  })
})

describe('formatBytes', () => {
  it.each([
    [500, '500 B'],
    [1536, '1.5 KB'],
    [5 * MB, '5.0 MB'],
    [250 * MB, '250 MB'],
    [3 * GB, '3.0 GB'],
  ])('%i bytes is "%s"', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text)
  })
})
