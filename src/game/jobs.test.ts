import { describe, expect, it } from 'vitest'
import { LifeSchema } from '../persistence/schemas'
import type { JobListing } from '../jobs/types'
import { newProfileData } from './career'
import {
  dueReminders,
  isSaved,
  markClosed,
  pipeline,
  removeJob,
  saveJob,
  setCv,
  setJobPrefs,
  updateJob,
} from './jobs'

const listing = (id: string): JobListing => ({
  id,
  provider: 'jobicy',
  sourceId: id.split(':')[1] ?? id,
  title: `Job ${id}`,
  company: 'Co',
  location: 'EMEA',
  countries: [],
  regions: ['europe'],
  worldwide: false,
  arrangement: 'remote',
  employment: ['full-time'],
  categories: [],
  tags: [],
  description: 'x'.repeat(5000),
  posted: '2026-11-18T00:00:00.000Z',
  url: `https://jobicy.com/jobs/${id}`,
})

const fresh = () => newProfileData('Alex', 1, 'it-support')

describe('saved jobs and applications', () => {
  it('a save from before has no saved jobs, and nothing else changes', () => {
    const { jobs, ...old } = fresh().work.life
    void jobs
    const loaded = LifeSchema.parse(old)
    expect(loaded.jobs.saved).toEqual([])
    expect(loaded.jobs.prefs.country).toBe('')
    expect(loaded.jobs.cv.includePractice).toBe(true)
  })

  it('saves once, the advert trimmed to fit the save; removes', () => {
    let p = saveJob(fresh(), listing('jobicy:1'), 100)
    p = saveJob(p, listing('jobicy:1'), 200)
    expect(p.work.life.jobs.saved).toHaveLength(1)
    expect(p.work.life.jobs.saved[0].listing.description.length).toBeLessThanOrEqual(2500)
    expect(LifeSchema.parse(p.work.life).jobs.saved[0].savedAt).toBe(100)
    p = removeJob(p, 'jobicy:1')
    expect(isSaved(p.work.life, 'jobicy:1')).toBe(false)
  })

  it('tracks the application: applied (today), notes, a reminder when due', () => {
    let p = saveJob(fresh(), listing('jobicy:1'))
    p = updateJob(p, 'jobicy:1', { status: 'applied' }, '2026-11-19')
    expect(p.work.life.jobs.saved[0]).toMatchObject({
      status: 'applied',
      appliedOn: '2026-11-19',
    })
    p = updateJob(p, 'jobicy:1', {
      notes: 'Emailed Jo',
      remindOn: '2026-11-26',
      remindWhat: 'Follow up',
      shortlisted: true,
    })
    expect(dueReminders(p.work.life, '2026-11-25')).toHaveLength(0)
    expect(dueReminders(p.work.life, '2026-11-26')[0].remindWhat).toBe('Follow up')
    // Finished with: no more reminders.
    p = updateJob(p, 'jobicy:1', { status: 'rejected' })
    expect(dueReminders(p.work.life, '2026-12-01')).toHaveLength(0)
    expect(pipeline(p.work.life).rejected).toBe(1)
    // Clearing the reminder leaves it out.
    p = updateJob(p, 'jobicy:1', { remindOn: '' })
    expect(p.work.life.jobs.saved[0].remindOn).toBeUndefined()
  })

  it('an advert its source says has closed is marked, and kept with its notes', () => {
    let p = saveJob(saveJob(fresh(), listing('jobicy:1')), listing('jobicy:2'))
    p = markClosed(p, ['jobicy:1'], ['jobicy:1', 'jobicy:2'], 5)
    const [two, one] = p.work.life.jobs.saved
    expect(one).toMatchObject({ closed: true, checkedAt: 5 })
    expect(two).toMatchObject({ closed: false, checkedAt: 5 })
  })

  it('where to work and the CV details are kept, and survive saving and loading', () => {
    let p = setJobPrefs(fresh(), { country: 'GM', place: 'Banjul' })
    p = setCv(p, { summary: 'Hello', includePractice: false })
    const loaded = LifeSchema.parse(JSON.parse(JSON.stringify(p.work.life)))
    expect(loaded.jobs.prefs).toMatchObject({
      country: 'GM',
      place: 'Banjul',
      radiusKm: 25,
    })
    expect(loaded.jobs.cv).toMatchObject({ summary: 'Hello', includePractice: false })
  })
})
