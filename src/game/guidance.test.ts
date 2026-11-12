import { describe, expect, it } from 'vitest'
import { systemPrompt } from '../ai/prompt'
import { resolveTicket } from '../ai/builtin/work'
import { ticketAiContext } from '../apps/helpdesk/aiContext'
import { getAssignment } from '../content/assignments'
import {
  getArticle,
  IT_KNOWLEDGE,
  KB_CATEGORIES,
  searchKnowledge,
} from '../content/knowledge/it'
import { createId } from '../lib/ids'
import {
  TicketsContentSchema,
  WorkStateSchema,
  type TicketsContent,
} from '../persistence/schemas'
import { unlockUser } from '../tools/directory/model'
import { checkAnswer, startVerification, withClock } from '../tools/directory/security'
import { restartDevice } from '../tools/network/actions'
import { newProfileData, recordSubmission, type ProfileData } from './career'
import type { GradeResult } from './grading'
import { guidanceFor, hintFactor, hintsUsed, revealHint } from './guidance'
import { applyEnvironmentChange, requestStatus } from './incidents'
import { buildQueueContent } from './tickets'

const when = { at: 2_000, time: 'Tuesday (day 4), 09:40' }
const wifi = () => buildQueueContent(getAssignment('wifi-outage')!, 1_000)
const unlock = () => buildQueueContent(getAssignment('account-unlock')!, 1_000)
const ticket = (c: TicketsContent, id: string) => c.tickets.find((t) => t.id === id)!
const net = (
  c: TicketsContent,
  change: Parameters<typeof applyEnvironmentChange<'network'>>[2],
) => applyEnvironmentChange(c, 'network', change, when)

describe('contextual guidance', () => {
  it('is about the ticket’s real failing condition, with four hints from general to concept', () => {
    const c = wifi()
    const g = guidanceFor(ticket(c, 'INC-3101'), c)
    expect(g.status).toBe('working')
    expect(g.focus?.label).toBe('AP-FL2 is responding')
    expect(g.hints.map((h) => h.title)).toEqual([
      'The problem',
      'Where to look',
      'What to try next',
      'Why it works this way',
    ])
    expect(g.hints[0].text).toContain('AP-FL2 is not responding.')
    expect(g.hints[1].tool).toBe('network')
    expect(g.hints[2].text).toContain('ping AP-FL2 (10.20.2.5)')
    expect(g.hints[3]).toMatchObject({ article: 'kb-no-network' })
    expect(g.hints[3].text).toBe(getArticle('kb-no-network')!.concept)
  })

  it('follows the route: Arjun’s laptop is off its Wi-Fi access point', () => {
    const c = wifi()
    const g = guidanceFor(ticket(c, 'INC-3102'), c)
    expect(g.hints[2].text).toContain('LT-0162 connects through AP-FL2')
  })

  it('remembers what was tried, and moves on once fixed', () => {
    let c = net(wifi(), (s) => restartDevice(s, 'LT-0161').state)
    const tried = guidanceFor(ticket(c, 'INC-3101'), c).attempted
    expect(tried.join(' ')).toContain('LT-0161')
    c = net(c, (s) => restartDevice(s, 'AP-FL2').state)
    const fixed = guidanceFor(ticket(c, 'INC-3101'), c)
    expect(fixed).toMatchObject({ status: 'fixed', hints: [] })
    expect(fixed.next).toContain('close it')
  })

  it('knows a password reset does not unlock, and records the refused attempt', () => {
    const c = wifi()
    const g = guidanceFor(ticket(c, 'INC-3103'), c)
    expect(g.focus?.condition.type).toBe('account-unlocked')
    expect(g.hints[2].text).toContain('A new password alone does not lift the lock')
    const refused = requestStatus(c, 'INC-3103', 'resolved', when).content
    expect(guidanceFor(ticket(refused, 'INC-3103'), refused).attempted).toContain(
      'Chose Resolved before it was fixed',
    )
  })

  it('puts verification first where the security policy applies, until it is done', () => {
    let c = unlock()
    expect(guidanceFor(ticket(c, 'INC-3201'), c).hints[2].text).toMatch(
      /^Verify Leila first/,
    )
    const at = 1_700_000_000_000
    c = applyEnvironmentChange(
      c,
      'directory',
      (s) =>
        startVerification(
          s,
          { ticket: 'INC-3201', user: 'u17', operations: ['unlock'] },
          at,
        ).state,
      { at, time: '' },
    )
    expect(guidanceFor(ticket(c, 'INC-3201'), c).hints[2].text).toContain(
      'Leila is not verified yet',
    )
    const id = c.environment!.directory!.security!.sessions[0].id
    c = applyEnvironmentChange(
      c,
      'directory',
      (s) => checkAnswer(s, id, 'badge', 'B-40417', at).state,
      { at, time: '' },
    )
    expect(guidanceFor(ticket(c, 'INC-3201'), c).hints[2].text).toMatch(/^Then unlock/)
    c = applyEnvironmentChange(
      c,
      'directory',
      (s) => unlockUser(withClock(s, at), 'u17').state,
      { at, time: '' },
    )
    expect(guidanceFor(ticket(c, 'INC-3201'), c).status).toBe('fixed')
  })

  it('guides a ticket without conditions through triage and the Knowledge Base', () => {
    const c = buildQueueContent(getAssignment('triage-queue')!, 1_000)
    const g = guidanceFor(c.tickets[0], c)
    expect(g.status).toBe('classic')
    expect(g.hints).toHaveLength(4)
    expect(g.hints[1].tool).toBe('knowledge')
  })
})

describe('progressive hints', () => {
  it('opens one at a time, counts them, and keeps each in the history', () => {
    let c = wifi()
    c = revealHint(c, 'INC-3101', when)
    c = revealHint(c, 'INC-3101', when)
    expect(ticket(c, 'INC-3101').hintsUsed).toBe(2)
    expect(
      ticket(c, 'INC-3101')
        .activity.filter((a) => a.kind === 'hint')
        .map((a) => a.text),
    ).toEqual(['Hint 1 of 4 opened: The problem.', 'Hint 2 of 4 opened: Where to look.'])
    for (let i = 0; i < 5; i++) c = revealHint(c, 'INC-3101', when)
    expect(ticket(c, 'INC-3101').hintsUsed).toBe(4)
    expect(hintsUsed(c)).toBe(4)
    // Other tickets are untouched.
    expect(ticket(c, 'INC-3102').hintsUsed).toBe(0)
  })

  it('offers none once the ticket is fixed, or closed', () => {
    let c = net(wifi(), (s) => restartDevice(s, 'AP-FL2').state)
    c = revealHint(c, 'INC-3101', when)
    expect(ticket(c, 'INC-3101').hintsUsed).toBe(0)
  })

  it('costs 5% of the XP per hint, never more than 30%', () => {
    expect([0, 1, 2, 4, 6, 12].map(hintFactor)).toEqual([1, 0.95, 0.9, 0.8, 0.7, 0.7])
  })

  it('reduces the XP and skill XP (not the score), and no first-try bonus with hints', () => {
    const task = getAssignment('wifi-outage')!
    const started = (p: ProfileData): ProfileData => ({
      ...p,
      assignments: {
        [task.id]: {
          assignmentId: task.id,
          assignmentVersion: task.version,
          documentId: createId(),
          startedAt: 1,
          completedSteps: [],
          attempts: [],
        },
      },
    })
    const grade = (hints?: number): GradeResult => ({
      score: 100,
      rating: 'excellent',
      passed: true,
      earned: 100,
      maxPoints: 100,
      checks: [],
      ...(hints !== undefined ? { hintsUsed: hints } : {}),
    })
    const base = started(newProfileData('Sam', 0, 'it-support'))
    const independent = recordSubmission(base, task, grade(0), 10)
    const helped = recordSubmission(base, task, grade(4), 10)
    expect(independent.attempt.xpEarned).toBe(Math.round(task.xp * 1.1))
    expect(helped.attempt.xpEarned).toBe(Math.round(task.xp * 0.8))
    expect(helped.attempt).toMatchObject({ score: 100, hintsUsed: 4 })
    expect(helped.attempt.skillXpEarned.troubleshooting).toBe(
      Math.round(task.skills.troubleshooting! * 0.8),
    )
  })

  it('is saved with the queue, and older queues and profiles load', () => {
    const c = revealHint(wifi(), 'INC-3101', when)
    const reloaded = TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))
    expect(ticket(reloaded, 'INC-3101').hintsUsed).toBe(1)
    const { hintsUsed: _, ...old } = ticket(wifi(), 'INC-3101')
    expect(
      TicketsContentSchema.parse({ ...wifi(), tickets: [old] }).tickets[0].hintsUsed,
    ).toBe(0)
    const { kbBookmarks: __, ...work } = newProfileData('Sam', 0, 'it-support').work
    expect(WorkStateSchema.parse(work).kbBookmarks).toEqual([])
  })
})

describe('the Knowledge Base', () => {
  it('covers every category, each article with steps to follow', () => {
    const ids = IT_KNOWLEDGE.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const category of KB_CATEGORIES)
      expect(
        IT_KNOWLEDGE.some((a) => a.category === category),
        category,
      ).toBe(true)
    for (const a of IT_KNOWLEDGE)
      expect(a.diagnose.length + a.resolve.length, a.id).toBeGreaterThan(0)
  })

  it('finds articles by words, title first, and filters by category', () => {
    expect(searchKnowledge('locked')[0].id).toBe('kb-lockout')
    expect(searchKnowledge('printer spooler')[0].id).toBe('kb-printer')
    expect(searchKnowledge('', 'Email').every((a) => a.category === 'Email')).toBe(true)
    expect(searchKnowledge('zzzz')).toEqual([])
  })
})

describe('AI assistance on a ticket', () => {
  const c = wifi()
  const t = ticket(c, 'INC-3101')
  const situation = {
    failing: [{ label: 'AP-FL2 is responding', state: 'AP-FL2 is not responding.' }],
    attempted: ['Restart device LT-0161'],
    next: 'Still to fix: AP-FL2 is responding.',
  }
  const items = ticketAiContext(t, c.knowledge, situation)

  it('shares what the systems show and what was tried, and matching articles', () => {
    expect(items[0].text).toContain('AP-FL2 is not responding.')
    expect(items[0].text).toContain('Restart device LT-0161')
    expect(items.some((i) => i.label.includes('Knowledge base'))).toBe(true)
  })

  it('offline, explains without solving, and points to the hints', () => {
    const answer = resolveTicket(items[0], 'learning')
    expect(answer).toContain('What the systems show is still wrong')
    expect(answer).toContain('hints go one step at a time')
    expect(answer).not.toContain('restart AP-FL2')
  })

  it('tells a model it cannot change the systems, and not to solve graded work', () => {
    const prompt = systemPrompt({
      messages: [{ role: 'user', text: 'How do I fix this?' }],
      context: { items, trimmed: 0 },
      mode: 'learning',
    })
    expect(prompt).toContain('must never say you have changed anything')
    expect(prompt).toContain('Do not give a complete step-by-step solution')
  })
})
