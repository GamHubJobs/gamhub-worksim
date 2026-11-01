/**
 * The portfolio at scale: 500 records (ten times what one device can hold
 * today) stay quick to store, list, filter, assess and export.
 */
import { startingWorkState } from '../../persistence/workState'
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { ASSIGNMENTS } from '../../content/assignments'
import { competencies, experienceRecord, skillsOf } from '../../game/competencies'
import {
  buildEmployabilityProfile,
  defaultProfileSettings,
} from '../../game/employabilityProfile'
import { decideCapture } from '../../game/portfolio'
import { progressReport } from '../../game/progressReport'
import { portfolioPdf } from '../../export/pdf/reports'
import { createId } from '../../lib/ids'
import { WorkSimDatabase } from '../../persistence/db'
import { listPortfolioItems } from '../../persistence/portfolio'
import {
  PortfolioItemSchema,
  type PortfolioItem,
  type Profile,
} from '../../persistence/schemas'
import { defaultFilters, filterItems, filterOptions } from './filters'

const PROFILE = createId()

function item(i: number): PortfolioItem {
  const task = ASSIGNMENTS[i % ASSIGNMENTS.length]
  const decision = decideCapture({
    profileId: PROFILE,
    assignment: task,
    grade: {
      score: 70 + (i % 31),
      rating: 'pass',
      passed: true,
      earned: 0,
      maxPoints: 0,
      checks: [
        {
          id: 'c',
          title: 'Check',
          why: 'Why it matters.',
          hint: '',
          status: 'passed',
          earned: 10,
          points: 10,
          problems: [],
        },
      ],
    },
    attempts: [],
    submittedAt: 1_700_000_000_000 + i * 60_000,
    files: [],
    existing: undefined,
  })
  if (decision.action !== 'evidence') throw new Error('not captured')
  return PortfolioItemSchema.parse({
    ...decision.evidence,
    key: `${PROFILE}|${task.id}|${i}`,
    id: createId(),
    createdAt: 1,
    updatedAt: 1,
    rev: 1,
    deviceId: createId(),
    deleted: false,
    files: [],
    included: i % 7 !== 0,
    featured: i % 50 === 0,
    note: '',
    order: 0,
  })
}

const items = Array.from({ length: 500 }, (_, i) => item(i))
const profile = {
  id: PROFILE,
  name: 'Alex',
  careerId: ASSIGNMENTS[0].careerId,
  levelId: ASSIGNMENTS[0].levelId,
  assignments: {},
  work: startingWorkState(),
} as unknown as Profile

/** Milliseconds taken by a function. */
function time(run: () => unknown): number {
  const start = performance.now()
  run()
  return performance.now() - start
}

let database: WorkSimDatabase | undefined
afterEach(async () => {
  if (!database) return
  database.close()
  await Dexie.delete(database.name)
  database = undefined
})

describe('a 500-record portfolio', () => {
  it('stores and lists quickly', async () => {
    database = new WorkSimDatabase(`test-${createId()}`)
    await database.portfolioItems.bulkPut(items)
    const start = performance.now()
    const listed = await listPortfolioItems([PROFILE], database)
    expect(listed).toHaveLength(500)
    expect(performance.now() - start).toBeLessThan(2000)
  })

  it('filters, sorts and offers options in a few milliseconds', () => {
    expect(
      time(() => filterItems([...items], { ...defaultFilters('all'), sort: 'score' })),
    ).toBeLessThan(100)
    expect(time(() => filterOptions(items))).toBeLessThan(100)
  })

  it('calculates competencies, experience, the report and the profile quickly', () => {
    const skills = skillsOf([profile])
    expect(time(() => competencies(items, skills))).toBeLessThan(200)
    expect(time(() => experienceRecord(items, [profile]))).toBeLessThan(200)
    expect(time(() => progressReport(profile, items))).toBeLessThan(300)
    expect(
      time(() =>
        buildEmployabilityProfile(defaultProfileSettings('Alex'), [profile], items),
      ),
    ).toBeLessThan(300)
  })

  it('exports 100 items as one PDF in reasonable time', () => {
    const entries = items
      .slice(0, 100)
      .map((i) => ({ item: i, files: [], saveName: 'Alex' }))
    let bytes: Uint8Array = new Uint8Array()
    const ms = time(() => {
      bytes = portfolioPdf('Alex', entries)
    })
    expect(bytes.length).toBeGreaterThan(10_000)
    expect(ms).toBeLessThan(20_000)
  }, 60_000)
})
