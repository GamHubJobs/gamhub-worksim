import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryStorage } from '../test/memoryStorage'
import { beginSession, endSession, resumeSession } from './session'

let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
})

describe('session marker', () => {
  it('reports no crash on the very first start', () => {
    expect(beginSession(storage).previousSessionCrashed).toBe(false)
  })

  it('reports no crash after a normal close', () => {
    beginSession(storage)
    endSession(storage)
    expect(beginSession(storage).previousSessionCrashed).toBe(false)
  })

  it('reports a crash when the previous session never closed', () => {
    beginSession(storage)
    // ...browser crashes: endSession is never called...
    expect(beginSession(storage).previousSessionCrashed).toBe(true)
  })

  it('treats a page restored from the back/forward cache as open again', () => {
    beginSession(storage)
    endSession(storage)
    resumeSession(storage)
    expect(beginSession(storage).previousSessionCrashed).toBe(true)
  })

  it('ignores a damaged marker', () => {
    storage.setItem('gamhub-worksim:session', 'garbage')
    expect(beginSession(storage).previousSessionCrashed).toBe(false)
  })

  it('works without storage', () => {
    expect(beginSession(null).previousSessionCrashed).toBe(false)
  })
})
