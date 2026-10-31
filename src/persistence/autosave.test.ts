import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutosaver } from './autosave'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** A save function that records what it saved. */
function recordingSave() {
  const saved: string[] = []
  const save = vi.fn(async (value: string) => {
    saved.push(value)
  })
  return { saved, save }
}

describe('createAutosaver', () => {
  it('saves one second after the last change', async () => {
    const { saved, save } = recordingSave()
    const autosaver = createAutosaver({ save })

    autosaver.schedule('a')
    expect(autosaver.getStatus().state).toBe('pending')
    await vi.advanceTimersByTimeAsync(999)
    expect(saved).toEqual([])

    await vi.advanceTimersByTimeAsync(1)
    expect(saved).toEqual(['a'])
    expect(autosaver.getStatus().state).toBe('saved')
    expect(autosaver.hasUnsavedChanges()).toBe(false)
  })

  it('saves only the newest value when changes come quickly', async () => {
    const { saved, save } = recordingSave()
    const autosaver = createAutosaver({ save })

    autosaver.schedule('a')
    await vi.advanceTimersByTimeAsync(300)
    autosaver.schedule('ab')
    await vi.advanceTimersByTimeAsync(300)
    autosaver.schedule('abc')
    await vi.advanceTimersByTimeAsync(1000)

    expect(saved).toEqual(['abc'])
  })

  it('still saves during non-stop work (at most every 5 seconds)', async () => {
    const { saved, save } = recordingSave()
    const autosaver = createAutosaver({ save })

    for (let i = 1; i <= 12; i++) {
      autosaver.schedule(`change ${i}`)
      await vi.advanceTimersByTimeAsync(500)
    }
    expect(saved.length).toBeGreaterThanOrEqual(1)
    expect(saved[0]).toBe('change 10')
  })

  it('saves immediately on flush', async () => {
    const { saved, save } = recordingSave()
    const autosaver = createAutosaver({ save })

    autosaver.schedule('urgent')
    expect(await autosaver.flush()).toBe(true)
    expect(saved).toEqual(['urgent'])
  })

  it('never runs two saves at the same time', async () => {
    let running = 0
    let maxRunning = 0
    const saved: string[] = []
    const autosaver = createAutosaver<string>({
      save: async (value) => {
        running++
        maxRunning = Math.max(maxRunning, running)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        saved.push(value)
        running--
      },
    })

    autosaver.schedule('first')
    await vi.advanceTimersByTimeAsync(1000) // first save starts and takes 2 s
    autosaver.schedule('second')
    await vi.advanceTimersByTimeAsync(5000)

    expect(maxRunning).toBe(1)
    expect(saved).toEqual(['first', 'second'])
  })

  it('retries a failed save and never loses the value', async () => {
    const saved: string[] = []
    let failuresLeft = 2
    const autosaver = createAutosaver<string>({
      save: async (value) => {
        if (failuresLeft > 0) {
          failuresLeft--
          throw new Error('Disk busy')
        }
        saved.push(value)
      },
    })

    autosaver.schedule('important')
    await vi.advanceTimersByTimeAsync(1000)
    expect(autosaver.getStatus()).toMatchObject({ state: 'error', error: 'Disk busy' })
    expect(autosaver.hasUnsavedChanges()).toBe(true)

    await vi.advanceTimersByTimeAsync(1000) // first retry fails
    await vi.advanceTimersByTimeAsync(3000) // second retry succeeds
    expect(saved).toEqual(['important'])
    expect(autosaver.getStatus().state).toBe('saved')
  })

  it('saves the newest value if changes are made while a save is failing', async () => {
    const saved: string[] = []
    let shouldFail = true
    const autosaver = createAutosaver<string>({
      save: async (value) => {
        if (shouldFail) throw new Error('Disk busy')
        saved.push(value)
      },
    })

    autosaver.schedule('old')
    await vi.advanceTimersByTimeAsync(1000)
    shouldFail = false
    autosaver.schedule('new')
    await vi.advanceTimersByTimeAsync(1000)
    expect(saved).toEqual(['new'])
  })

  it('reports flush failure while saving is impossible', async () => {
    const autosaver = createAutosaver<string>({
      save: async () => {
        throw new Error('Storage full')
      },
    })
    autosaver.schedule('value')
    expect(await autosaver.flush()).toBe(false)
    expect(autosaver.hasUnsavedChanges()).toBe(true)
    autosaver.dispose()
  })

  it('tells subscribers when the status changes', async () => {
    const { save } = recordingSave()
    const autosaver = createAutosaver({ save })
    const states: string[] = []
    autosaver.subscribe(() => states.push(autosaver.getStatus().state))

    autosaver.schedule('a')
    await vi.advanceTimersByTimeAsync(1000)
    expect(states).toEqual(['pending', 'saving', 'saved'])
  })

  it('stops saving after dispose', async () => {
    const { saved, save } = recordingSave()
    const autosaver = createAutosaver({ save })
    autosaver.schedule('a')
    autosaver.dispose()
    await vi.advanceTimersByTimeAsync(5000)
    expect(saved).toEqual([])
  })
})
