import { beforeEach, describe, expect, it } from 'vitest'
import { loadVisit as load, saveVisit as save, VISIT_KEY } from './visitStore'

const items = new Map<string, string>()
const store = {
  getItem: (k: string) => items.get(k) ?? null,
  setItem: (k: string, v: string) => void items.set(k, v),
  removeItem: (k: string) => void items.delete(k),
}
const loadVisit = (w: Parameters<typeof load>[0]) => load(w, store)
const saveVisit = (w: Parameters<typeof save>[0], v: Parameters<typeof save>[1]) =>
  save(w, v, store)
const localStorage = { clear: () => items.clear(), setItem: store.setItem }

const where = { name: 'Sam Lee', careerId: 'legal', day: 3, dayOver: false }
const visit = { security: true, signedIn: false, note: null }

describe('the visit to court, kept across a reload', () => {
  beforeEach(() => localStorage.clear())

  it('comes back on the same working day', () => {
    saveVisit(where, visit)
    expect(loadVisit(where)).toEqual(visit)
  })

  it('is gone once the player is back at the office', () => {
    saveVisit(where, visit)
    saveVisit(where, null)
    expect(loadVisit(where)).toBeNull()
  })

  it('does not carry over to another day, another person or a finished day', () => {
    saveVisit(where, visit)
    expect(loadVisit({ ...where, day: 4 })).toBeNull()
    expect(loadVisit({ ...where, name: 'Alex' })).toBeNull()
    expect(loadVisit({ ...where, careerId: 'healthcare' })).toBeNull()
    expect(loadVisit({ ...where, dayOver: true })).toBeNull()
  })

  it('ignores something unreadable', () => {
    localStorage.setItem(VISIT_KEY, '{oops')
    expect(loadVisit(where)).toBeNull()
    localStorage.setItem(
      VISIT_KEY,
      JSON.stringify({ who: 'legal:Sam Lee', day: 3, visit: {} }),
    )
    expect(loadVisit(where)).toBeNull()
  })
})
