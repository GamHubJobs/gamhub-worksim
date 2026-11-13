import { describe, expect, it } from 'vitest'
import { sampleLegal } from './data'
import { billableHours, deadline, limitationDate } from './jurisdiction'
import {
  addKeyDate,
  conflictHits,
  createInvoice,
  declineMatter,
  logTime,
  openMatter,
  reviewClause,
  runConflictCheck,
  saveAuthority,
  searchLibrary,
  sendEngagement,
  tagDocument,
  unbilled,
  verifyClient,
} from './model'
import { LegalStateSchema } from './schema'

const start = () => sampleLegal()

describe('Westmark (fictional) rules', () => {
  it('moves deadlines past weekends and holidays', () => {
    // 2026-03-02 is a Monday: 21 days later is Monday 23 March.
    expect(deadline('2026-03-02', 21)).toBe('2026-03-23')
    // 2026-03-07 is a Saturday: 28 days later is Saturday 4 April → Monday 6 April is a holiday → 7 April.
    expect(deadline('2026-03-07', 28)).toBe('2026-04-07')
  })
  it('works out limitation and billing units', () => {
    expect(limitationDate('2026-01-19', 'employment')).toBe('2027-01-19')
    expect(billableHours(14)).toBe(0.3)
    expect(billableHours(60)).toBe(1)
    expect(billableHours(1)).toBe(0.1)
  })
})

describe('Matter Desk', () => {
  it('has valid, fictional practice data', () => {
    expect(() => LegalStateSchema.parse(start())).not.toThrow()
  })

  it('finds a conflict with a current client, and the firm declines', () => {
    expect(conflictHits(start(), 'M-2043')).toEqual([
      expect.objectContaining({
        name: 'Brightwater Bakery Ltd',
        relation: 'client',
        blocking: true,
      }),
    ])
    let s = runConflictCheck(start(), 'M-2043').state
    expect(openMatter(s, 'M-2043').problems[0]).toMatch(/cannot act/)
    s = declineMatter(s, 'M-2043', 'We act for Brightwater Bakery, the other side.').state
    expect(s.matters.find((m) => m.id === 'M-2043')?.status).toBe('declined')
  })

  it('opens a matter only after the checks, identity and engagement', () => {
    let s = start()
    expect(openMatter(s, 'M-2042').problems[0]).toMatch(/conflict check/)
    s = runConflictCheck(s, 'M-2042').state
    expect(openMatter(s, 'M-2042').problems[0]).toMatch(/identity/)
    expect(sendEngagement(s, 'c2').problems[0]).toMatch(/identity/)
    s = verifyClient(s, 'c2', 'Passport, checked in person').state
    s = sendEngagement(s, 'c2').state
    s = openMatter(s, 'M-2042').state
    expect(s.matters.find((m) => m.id === 'M-2042')?.status).toBe('open')
  })

  it('records key dates, research and clause decisions', () => {
    let s = addKeyDate(start(), 'M-2041', 'Defence due', deadline('2026-03-02', 21)).state
    expect(s.matters[0].keyDates[0].date).toBe('2026-03-23')
    expect(searchLibrary(s, 'flour').map((a) => a.id)).toEqual(['harlow'])
    s = saveAuthority(s, 'M-2041', 'harlow').state
    expect(reviewClause(s, 'K-1', 'k1-liability', 'amend', '').problems).toHaveLength(1)
    s = reviewClause(
      s,
      'K-1',
      'k1-liability',
      'amend',
      'Liability for defective goods up to the contract value.',
    ).state
    expect(s.contracts[0].clauses[1].decision).toBe('amend')
  })

  it('bills in six-minute units, only billable time, once', () => {
    let s = logTime(start(), 'M-2041', 14, 'Reviewing the delivery notes', true).state
    s = logTime(s, 'M-2041', 60, 'Call with the client about the claim', true).state
    s = logTime(s, 'M-2041', 30, 'Correcting my own filing error', false).state
    expect(unbilled(s, 'M-2041')).toMatchObject({ hours: 1.3, total: 234 })
    s = createInvoice(s, 'M-2041').state
    expect(s.invoices[0]).toMatchObject({ hours: 1.3, total: 234 })
    expect(createInvoice(s, 'M-2041').problems[0]).toMatch(/no billable time/)
    expect(logTime(start(), 'M-2042', 10, 'Intake call', true).problems[0]).toMatch(
      /open matter/,
    )
  })

  it('needs a basis to mark a document privileged', () => {
    expect(tagDocument(start(), 'D-03', 'privileged').problems).toHaveLength(1)
    const s = tagDocument(
      start(),
      'D-03',
      'privileged',
      'Legal advice from the firm to the client',
    ).state
    expect(s.documents[2]).toMatchObject({ tag: 'privileged' })
  })
})

describe('Matter Desk grading', () => {
  it('rewards good law and catches a conflicted matter', async () => {
    const { legal } = await import('./definition')
    const base = { title: 't', why: 'w', hint: 'h', points: 10 }
    const checks = legal.check.array().parse([
      {
        ...base,
        id: 'law',
        type: 'authorities',
        matter: 'M-2041',
        include: ['harlow'],
        exclude: ['quill'],
      },
      { ...base, id: 'conflict', type: 'no-conflict-breach' },
    ])
    const good = saveAuthority(start(), 'M-2041', 'harlow').state
    expect(
      legal.grade(checks, good, { start: start(), solution: good }).map((r) => r.status),
    ).toEqual(['passed', 'passed'])
    const bad = saveAuthority(good, 'M-2041', 'quill').state
    const forced = {
      ...bad,
      matters: bad.matters.map((m) =>
        m.id === 'M-2043' ? { ...m, status: 'open' as const } : m,
      ),
    }
    expect(
      legal
        .grade(checks, forced, { start: start(), solution: good })
        .map((r) => r.status),
    ).toEqual(['partial', 'failed'])
  })
})
