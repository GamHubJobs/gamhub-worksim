import { describe, expect, it } from 'vitest'
import { getAssignment } from '../../content/assignments'
import { guidanceFor } from '../../game/guidance'
import { applyEnvironmentChange, disruptionsOf } from '../../game/incidents'
import {
  applyTicketSolution,
  buildQueueContent,
  gradeEnvironment,
  gradeTickets,
} from '../../game/tickets'
import { TicketsContentSchema, type TicketsContent } from '../../persistence/schemas'
import { INCIDENT_REPORT, LESSONS } from '../../content/assignments/it/securityIncident'
import {
  acknowledgeAlert,
  advance,
  blockers,
  disableAccount,
  dismissAlert,
  enableAccount,
  flagProcess,
  flagRule,
  flagSignIn,
  isolateDevice,
  killProcess,
  mistakes,
  quarantineEmail,
  removeRule,
  resetAccountPassword,
  restoreDevice,
  revokeSessions,
  setLessons,
  setReport,
  setTriage,
  setVerdict,
  type Result,
} from './model'
import type { SocState } from './schema'

const task = getAssignment('security-incident')!
const when = { at: 9_000, time: 'Tuesday (day 2), 09:30' }
const fresh = () => buildQueueContent(task, 1_000)
const soc = (c: TicketsContent) => c.environment!.soc!

/** Runs steps, expecting each to succeed. */
function run(state: SocState, ...steps: Array<(s: SocState) => Result>): SocState {
  return steps.reduce((s, step) => {
    const r = step(s)
    expect(r.problems).toEqual([])
    return r.state
  }, state)
}

const toInvestigate = (s: SocState) =>
  run(
    s,
    (x) => acknowledgeAlert(x, 'A-1'),
    advance,
    (x) => setTriage(x, 'high', 'account-compromise'),
    advance,
  )
const investigated = (s: SocState) =>
  run(
    toInvestigate(s),
    (x) => flagSignIn(x, 'S-4'),
    (x) => setVerdict(x, 'E-1', 'phishing'),
    (x) => flagRule(x, 'u19', 'R-2'),
    (x) => flagProcess(x, 'LT-0171', 'syshelper'),
    advance,
  )

describe('the incident moves on only when each stage’s work is done', () => {
  it('detect, then triage: an understated severity or the wrong category is refused', () => {
    let s = soc(fresh())
    expect(advance(s).problems).toEqual(['The alert has not been acknowledged.'])
    s = run(s, (x) => acknowledgeAlert(x, 'A-1'), advance)
    expect(s.incident.stage).toBe('triage')
    s = run(s, (x) => setTriage(x, 'low', 'phishing'))
    expect(advance(s).problems).toEqual([
      'A low severity understates it: an account in the attacker’s hands is serious.',
      'Look at the category again: what has the attacker actually taken over?',
    ])
    s = run(s, (x) => setTriage(x, 'critical', 'account-compromise'), advance)
    expect(s.incident.stage).toBe('investigate')
  })

  it('investigate: all four pieces of evidence are needed', () => {
    let s = toInvestigate(soc(fresh()))
    expect(blockers(s)).toHaveLength(4)
    s = run(
      s,
      (x) => flagSignIn(x, 'S-4'),
      (x) => setVerdict(x, 'E-1', 'phishing'),
    )
    expect(blockers(s)).toEqual([
      'The change in the mailbox has not been found.',
      'What runs on the device has not been found.',
    ])
  })

  it('contain, eradicate, recover: each needs the real work, in order', () => {
    let s = investigated(soc(fresh()))
    expect(s.incident.stage).toBe('contain')
    expect(advance(s).problems).toHaveLength(3)
    s = run(
      s,
      (x) => revokeSessions(x, 'u19'),
      (x) => resetAccountPassword(x, 'u19'),
      (x) => isolateDevice(x, 'LT-0171'),
      advance,
    )
    // The laptop cannot go back on the network while the program still runs.
    expect(restoreDevice(s, 'LT-0171').problems[0]).toContain(
      'remove the threat before you reconnect it',
    )
    s = run(
      s,
      (x) => removeRule(x, 'u19', 'R-2'),
      (x) => killProcess(x, 'LT-0171', 'syshelper'),
    )
    expect(advance(s).problems).toEqual([
      'The phishing email is still in people’s inboxes.',
    ])
    expect(quarantineEmail(soc(fresh()), 'E-1').problems[0]).toContain(
      'Decide the verdict first',
    )
    s = run(s, (x) => quarantineEmail(x, 'E-1'), advance)
    expect(advance(s).problems[0]).toContain('LT-0171 is still isolated')
    s = run(s, (x) => restoreDevice(x, 'LT-0171'), advance)
    expect(s.incident.stage).toBe('document')
  })

  it('document and review need a real report and lessons', () => {
    let s = run(soc(applyTicketSolution(task, fresh())))
    expect(s.incident.stage).toBe('closed')
    // From the start of documenting, a thin report is refused.
    s = {
      ...s,
      incident: {
        ...s.incident,
        stage: 'document',
        report: 'It was phishing.',
        lessons: '',
      },
    }
    expect(advance(s).problems).toContain(
      'The report is too short (3 words; at least 60).',
    )
    s = run(s, (x) => setReport(x, INCIDENT_REPORT), advance)
    expect(advance(s).problems[0]).toContain('lessons learned are too short')
    s = run(s, (x) => setLessons(x, LESSONS), advance)
    expect(s.incident.stage).toBe('closed')
    expect(s.incident.timeline.slice(-2).map((t) => t.stage)).toEqual([
      'document',
      'review',
    ])
  })
})

describe('wrong actions have consequences', () => {
  it('isolating the wrong laptop stops its user working, and is a mistake', () => {
    let c = fresh()
    c = applyEnvironmentChange(c, 'soc', (s) => isolateDevice(s, 'LT-0170').state, when)
    expect(mistakes(soc(c))).toHaveLength(1)
    expect(soc(c).consequences[0].text).toContain('Grace Mensah cannot work')
    expect(disruptionsOf(c, task.id)).toContainEqual(
      expect.objectContaining({
        person: 'backL',
        what: 'their computer',
        state: 'blocked',
      }),
    )
    // Recovery is refused while she is still cut off.
    let s = investigated(soc(c))
    s = run(
      s,
      (x) => revokeSessions(x, 'u19'),
      (x) => resetAccountPassword(x, 'u19'),
      (x) => isolateDevice(x, 'LT-0171'),
      advance,
    )
    s = run(
      s,
      (x) => removeRule(x, 'u19', 'R-2'),
      (x) => killProcess(x, 'LT-0171', 'syshelper'),
      (x) => quarantineEmail(x, 'E-1'),
      advance,
    )
    s = run(s, (x) => restoreDevice(x, 'LT-0171'))
    expect(advance(s).problems).toEqual(['LT-0170 is still isolated by mistake.'])
  })

  it('disabling the wrong account, and dismissing the real alert', () => {
    let s = run(soc(fresh()), (x) => disableAccount(x, 'u17'))
    expect(s.consequences[0].text).toContain('Leila Haddad’s account was disable account')
    s = run(s, (x) => enableAccount(x, 'u17'))
    s = run(s, (x) => dismissAlert(x, 'A-1'))
    expect(s.consequences.at(-1)!.text).toContain(
      'the attacker would still be in Owen Price’s account',
    )
    // A false alarm can be dismissed without a mistake.
    const fine = run(soc(fresh()), (x) => dismissAlert(x, 'A-5'))
    expect(mistakes(fine)).toEqual([])
  })

  it('calling the phishing email legitimate leaves it in the inboxes', () => {
    const s = run(soc(fresh()), (x) => setVerdict(x, 'E-1', 'legitimate'))
    expect(s.consequences[0].kind).toBe('phishing-released')
    expect(mistakes(s)).toHaveLength(1)
    // The genuine maintenance email is legitimate: no mistake.
    expect(
      mistakes(run(soc(fresh()), (x) => setVerdict(x, 'E-2', 'legitimate'))),
    ).toEqual([])
  })
})

describe('the ticket, guidance, grading and saving', () => {
  it('Carmen’s ticket closes with the incident, and she is not held up meanwhile', () => {
    const c = fresh()
    expect(disruptionsOf(c, task.id)).toEqual([])
    const t = c.tickets[0]
    expect(guidanceFor(t, c).hints[2].text).toContain('Acknowledge the alert')
    const solved = applyTicketSolution(task, c)
    expect(solved.tickets[0].status).toBe('resolved')
  })

  it('resolves the ticket automatically as the incident closes', () => {
    let c = fresh()
    const step = (fn: (s: SocState) => Result) => {
      c = applyEnvironmentChange(c, 'soc', (s) => fn(s).state, when)
    }
    const solved = soc(applyTicketSolution(task, fresh()))
    // Jump to the last stage with the work done, then close it.
    step(() => ({
      state: { ...solved, incident: { ...solved.incident, stage: 'review' } },
      problems: [],
    }))
    expect(c.tickets[0].status).not.toBe('resolved')
    step(advance)
    expect(c.tickets[0].status).toBe('resolved')
    expect(c.tickets[0].activity.map((a) => a.text)).toContain(
      'Change made: Incident IR-2026-014: Review complete.',
    )
  })

  it('gives the model answer full marks, out of 100', () => {
    const results = [
      ...gradeTickets(task, applyTicketSolution(task, fresh())),
      ...gradeEnvironment(task, applyTicketSolution(task, fresh())),
    ]
    expect(
      results.filter((r) => r.id !== 'carmen-reply' && r.status !== 'passed'),
    ).toEqual([])
    expect(results.reduce((sum, r) => sum + r.points, 0)).toBe(100)
  })

  it('marks down mistakes, even when the incident is closed', () => {
    const c = applyEnvironmentChange(
      fresh(),
      'soc',
      (s) => isolateDevice(s, 'LT-0161').state,
      when,
    )
    const accurate = gradeEnvironment(task, c).find((r) => r.id === 'accurate')!
    expect(accurate.status).toBe('partial')
    expect(accurate.problems[0]).toContain('Carmen Ruiz cannot work')
  })

  it('is saved with the queue', () => {
    const c = applyEnvironmentChange(
      fresh(),
      'soc',
      (s) => acknowledgeAlert(s, 'A-1').state,
      when,
    )
    expect(TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))).toEqual(c)
  })
})
