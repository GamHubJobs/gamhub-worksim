import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import {
  WorkStateSchema,
  TicketsContentSchema,
  type TicketsContent,
} from '../persistence/schemas'
import { resetPassword, unlockUser } from '../tools/directory/model'
import {
  addFinding,
  restartDevice,
  restartService,
  runConsole,
  switchToAutomaticSettings,
} from '../tools/network/actions'
import { changeDevice, officeNetwork, wifiScenario } from '../tools/network/data'
import { reachable, route, runCommand } from '../tools/network/simulation'
import { getTool } from '../tools/registry'
import { newProfileData } from './career'
import { meet, troubleLine } from './encounters'
import {
  applyEnvironmentChange,
  assignToMe,
  disruptionsOf,
  evaluateCondition,
  evaluateTicket,
  requestStatus,
  troubleOf,
} from './incidents'
import {
  applyTicketSolution,
  buildQueueContent,
  gradeEnvironment,
  gradeTickets,
} from './tickets'

const task = getAssignment('wifi-outage')!
const when = { at: 1_000, time: 'Monday (day 3), 09:20' }
const fresh = () => buildQueueContent(task, 500)
const ticket = (content: TicketsContent, id: string) =>
  content.tickets.find((t) => t.id === id)!

const net = (
  content: TicketsContent,
  change: Parameters<typeof applyEnvironmentChange<'network'>>[2],
) => applyEnvironmentChange(content, 'network', change, when)
const dir = (
  content: TicketsContent,
  change: Parameters<typeof applyEnvironmentChange<'directory'>>[2],
) => applyEnvironmentChange(content, 'directory', change, when)

const restartAp = (content: TicketsContent) =>
  net(content, (s) => restartDevice(s, 'AP-FL2').state)
const kinds = (content: TicketsContent, id: string) =>
  ticket(content, id).activity.map((a) => a.kind)

describe('the Wi-Fi network (an access point and the laptops on it)', () => {
  it('cuts a laptop off while its access point is down, and not before', () => {
    const state = wifiScenario()
    expect(route(state, 'LT-0161', '10.20.0.15')).toEqual([
      { name: 'AP-FL2', ip: '10.20.2.5', ok: false },
    ])
    expect(runCommand(state, 'LT-0161', 'ipconfig')[0]).toMatch(
      /not reachable over the network/,
    )
    // From the service desk, the laptop does not answer either.
    expect(reachable(state, 'IT-PC-07', '10.20.2.121')).toBe(false)
    const fixed = restartDevice(state, 'AP-FL2').state
    expect(reachable(fixed, 'LT-0161', '10.20.0.15')).toBe(true)
    expect(reachable(fixed, 'IT-PC-07', '10.20.2.121')).toBe(true)
  })

  it('leaves devices without Wi-Fi as they were (the other scenarios do not change)', () => {
    const state = changeDevice('AP-FL2', (d) => ({ ...d, up: false }))(officeNetwork())
    expect(reachable(state, 'LT-0153', '10.20.0.15')).toBe(true)
  })

  it('checks evidence by what the command printed, when asked to', () => {
    const check = {
      id: 'v',
      type: 'evidence' as const,
      title: 'Verified',
      why: '',
      hint: '',
      points: 10,
      items: [
        {
          description: 'tested',
          from: 'LT-0161',
          pattern: '^ping',
          output: '^Reply from',
        },
      ],
    }
    const grade = (state: ReturnType<typeof wifiScenario>) =>
      getTool('network')!.grade([check], state, { start: state, solution: state })[0]
        .status
    const before = runConsole(wifiScenario(), 'LT-0161', 'ping 10.20.0.15')
    expect(grade(before)).toBe('failed')
    const after = runConsole(
      restartDevice(wifiScenario(), 'AP-FL2').state,
      'LT-0161',
      'ping 10.20.0.15',
    )
    expect(grade(after)).toBe('passed')
  })
})

describe('tickets tied to the systems', () => {
  it('start open, with their history, while the problem is there', () => {
    const content = fresh()
    for (const id of ['INC-3101', 'INC-3102', 'INC-3103']) {
      expect(ticket(content, id).status).toBe('new')
      expect(evaluateTicket(ticket(content, id), content.environment).fixed).toBe(false)
      expect(kinds(content, id)).toEqual(['created'])
    }
    expect(
      evaluateTicket(ticket(content, 'INC-3101'), content.environment).failing.map(
        (r) => r.state,
      ),
    ).toEqual([
      'AP-FL2 is not responding.',
      'LT-0161 is off the network: its Wi-Fi access point AP-FL2 is not responding.',
    ])
  })

  it('resolve automatically when the right fix is made, saying why', () => {
    const content = restartAp(assignToMe(fresh(), 'INC-3101', when))
    const carmen = ticket(content, 'INC-3101')
    expect(carmen.status).toBe('resolved')
    expect(carmen.resolution).toEqual({
      by: 'automatic',
      explanation: 'AP-FL2 is responding. LT-0161 reaches file-01 (port 445).',
      at: 1_000,
    })
    expect(kinds(content, 'INC-3101')).toEqual([
      'created',
      'assigned',
      'change',
      'condition-ok',
      'condition-ok',
      'resolved',
      'update-sent',
    ])
    expect(carmen.activity.at(-1)!.text).toMatch(
      /^Update sent to Carmen Ruiz: “Hi Carmen, this is fixed now/,
    )
    expect(
      carmen.activity.every((a) => a.time === when.time || a.kind === 'created'),
    ).toBe(true)
  })

  it('let several tickets watch the same system without getting in each other’s way', () => {
    const content = restartAp(fresh())
    expect(ticket(content, 'INC-3101').status).toBe('resolved')
    expect(ticket(content, 'INC-3102').status).toBe('resolved')
    // The lockout is in another system: untouched.
    expect(ticket(content, 'INC-3103')).toEqual(ticket(fresh(), 'INC-3103'))
  })

  it('do not resolve for the wrong fix, or for anything unrelated', () => {
    let content = fresh()
    content = net(content, (s) => restartDevice(s, 'LT-0161').state)
    content = net(content, (s) => switchToAutomaticSettings(s, 'LT-0162').state)
    content = net(content, (s) => restartDevice(s, 'SW-FL2').state)
    content = net(content, (s) => restartService(s, 'PRINT-01', 631).state)
    content = net(content, (s) => runConsole(s, 'IT-PC-07', 'ping 10.20.2.5'))
    content = net(
      content,
      (s) => addFinding(s, { device: 'AP-FL2', fault: 'device-crashed', note: '' }).state,
    )
    content = dir(content, (s) => unlockUser(s, 'u3').state)
    for (const id of ['INC-3101', 'INC-3102', 'INC-3103']) {
      expect(ticket(content, id).status).toBe('new')
      expect(kinds(content, id)).not.toContain('resolved')
    }
    // The changes to what a ticket is about are in its history; the console is not.
    expect(ticket(content, 'INC-3101').activity.map((a) => a.text)).toContain(
      'Change made: Restart device LT-0161.',
    )
    expect(ticket(content, 'INC-3101').activity.some((a) => /ping/.test(a.text))).toBe(
      false,
    )
  })

  it('need every condition: a password reset alone does not unlock an account', () => {
    let content = dir(fresh(), (s) => resetPassword(s, 'u17').state)
    const leila = ticket(content, 'INC-3103')
    expect(leila.status).toBe('new')
    expect(
      evaluateTicket(leila, content.environment).results.map((r) => r.passed),
    ).toEqual([false, true])
    expect(kinds(content, 'INC-3103')).toEqual(['created', 'change', 'condition-ok'])
    content = dir(content, (s) => unlockUser(s, 'u17').state)
    expect(ticket(content, 'INC-3103').status).toBe('resolved')
    expect(ticket(content, 'INC-3103').resolution?.explanation).toBe(
      'Leila Haddad’s account is unlocked. Leila Haddad has a temporary password to sign in with.',
    )
  })

  it('cannot be resolved by choosing Resolved while the problem is there', () => {
    const before = fresh()
    const attempt = requestStatus(before, 'INC-3101', 'resolved', when)
    expect(attempt.refused).toEqual([
      'The problem is not fixed yet.',
      'AP-FL2 is not responding.',
      'LT-0161 is off the network: its Wi-Fi access point AP-FL2 is not responding.',
    ])
    expect(ticket(attempt.content, 'INC-3101').status).toBe('new')
    // The attempt is kept in the history, not silently dropped.
    expect(ticket(attempt.content, 'INC-3101').activity.at(-1)).toMatchObject({
      kind: 'resolve-rejected',
      text: expect.stringMatching(/^Not resolved: The problem is not fixed yet\./),
    })
    // Nor closed.
    const close = requestStatus(before, 'INC-3101', 'closed', when)
    expect(close.refused?.[0]).toMatch(/Only a resolved ticket can be closed/)
  })

  it('can be resolved by hand once the systems show the fix, and record it as such', () => {
    // The systems fixed without the tickets reacting (e.g. a queue from before).
    const content = fresh()
    const solved: TicketsContent = {
      ...content,
      environment: {
        ...content.environment,
        network: restartDevice(content.environment!.network!, 'AP-FL2').state,
      },
    }
    const result = requestStatus(solved, 'INC-3102', 'resolved', when)
    expect(result.refused).toBeNull()
    expect(ticket(result.content, 'INC-3102').resolution?.by).toBe('manual')
    expect(kinds(result.content, 'INC-3102').slice(-2)).toEqual([
      'resolved',
      'update-sent',
    ])
  })

  it('resolve only once: later changes add no second resolution', () => {
    let content = restartAp(fresh())
    content = restartAp(content)
    content = net(content, (s) => restartService(s, 'PRINT-01', 631).state)
    content = net(content, (s) => runConsole(s, 'LT-0161', 'ping file-01'))
    expect(kinds(content, 'INC-3101').filter((k) => k === 'resolved')).toHaveLength(1)
    expect(kinds(content, 'INC-3101').filter((k) => k === 'update-sent')).toHaveLength(1)
  })

  it('reopen when the fault comes back before they are closed', () => {
    let content = restartAp(fresh())
    content = net(
      content,
      changeDevice('AP-FL2', (d) => ({ ...d, up: false })),
    )
    const carmen = ticket(content, 'INC-3101')
    expect(carmen.status).toBe('reopened')
    expect(carmen.resolution).toBeNull()
    expect(carmen.activity.at(-1)!.text).toMatch(
      /^Reopened: the fault is back\. AP-FL2 is not responding\./,
    )
    content = restartAp(content)
    expect(ticket(content, 'INC-3101').status).toBe('resolved')
  })

  it('stay closed whatever happens afterwards', () => {
    let content = restartAp(fresh())
    content = requestStatus(content, 'INC-3101', 'closed', when).content
    expect(ticket(content, 'INC-3101').status).toBe('closed')
    const history = ticket(content, 'INC-3101').activity
    content = net(
      content,
      changeDevice('AP-FL2', (d) => ({ ...d, up: false })),
    )
    expect(ticket(content, 'INC-3101').status).toBe('closed')
    expect(ticket(content, 'INC-3101').activity).toEqual(history)
    // INC-3102 was not closed: it reopens.
    expect(ticket(content, 'INC-3102').status).toBe('reopened')
    expect(requestStatus(content, 'INC-3101', 'open', when).refused?.[0]).toMatch(
      /closed/,
    )
  })

  it('move from assigned to in progress when work starts on what they are about', () => {
    let content = assignToMe(fresh(), 'INC-3103', when)
    expect(ticket(content, 'INC-3103').status).toBe('assigned')
    content = dir(content, (s) => resetPassword(s, 'u17').state)
    expect(ticket(content, 'INC-3103').status).toBe('open')
  })

  it('fail safely when a system is not connected', () => {
    const result = evaluateCondition({ type: 'device-up', device: 'AP-FL2' }, undefined)
    expect(result.passed).toBe(false)
    expect(result.state).toMatch(/not connected to this queue/)
    expect(
      evaluateCondition(
        { type: 'account-unlocked', user: 'nobody' },
        fresh().environment,
      ),
    ).toMatchObject({
      passed: false,
      state: 'There is no account for nobody.',
    })
  })

  it('leave ordinary tickets as they were', () => {
    const triage = getAssignment('triage-queue')!
    const queue = buildQueueContent(triage)
    const id = queue.tickets[0].id
    const result = requestStatus(queue, id, 'resolved', when)
    expect(result.refused).toBeNull()
    expect(ticket(result.content, id).status).toBe('resolved')
    expect(ticket(result.content, id).activity).toEqual([])
    expect(queue.environment).toBeUndefined()
  })
})

describe('colleagues held up by the tickets', () => {
  it('are those the tickets are about, and only while their problem lasts', () => {
    const before = disruptionsOf(fresh(), 'wifi-outage')
    expect(before.map((d) => [d.person, d.state, d.what])).toEqual([
      ['front2', 'blocked', 'the Wi-Fi'],
      ['analyst', 'blocked', 'the Wi-Fi'],
      ['backM', 'blocked', 'their account'],
    ])
    const after = disruptionsOf(restartAp(fresh()), 'wifi-outage')
    expect(after.map((d) => [d.person, d.state])).toEqual([
      ['front2', 'restored'],
      ['analyst', 'restored'],
      ['backM', 'blocked'],
    ])
  })

  it('say so when the player comes over, and thank them once it is fixed', () => {
    const disruptions = disruptionsOf(restartAp(fresh()), 'wifi-outage')
    const underWay = () => true
    expect(troubleOf(disruptions, 'backM', underWay)).toEqual({
      what: 'their account',
      state: 'blocked',
    })
    expect(troubleOf(disruptions, 'front2', underWay)?.state).toBe('restored')
    // Nobody else, and nobody once the task is done.
    expect(troubleOf(disruptions, 'backR', underWay)).toBeUndefined()
    expect(troubleOf(disruptions, 'backM', () => false)).toBeUndefined()
    const who = {
      id: 'backM',
      name: 'Leila Haddad',
      role: 'Accounts assistant',
      kind: 'colleague' as const,
      personality: 'chatty' as const,
    }
    const encounter = meet(
      who,
      {
        availability: 'working',
        minute: 9 * 60 + 20,
        trouble: { what: 'their account', state: 'blocked' },
      },
      { trust: 50, talks: 1, today: 0 },
    )
    expect(encounter.opening.at(-1)!.text).toBe(
      troubleLine({ what: 'their account', state: 'blocked' }),
    )
    expect(troubleLine({ what: 'the Wi-Fi', state: 'restored' })).toBe(
      'The Wi-Fi is back, thank you! I can get on with my work again.',
    )
  })
})

describe('saving and grading', () => {
  it('keep the tickets, their history and the systems across a save', () => {
    let content = restartAp(assignToMe(fresh(), 'INC-3101', when))
    content = requestStatus(content, 'INC-3101', 'closed', when).content
    const reloaded = TicketsContentSchema.parse(JSON.parse(JSON.stringify(content)))
    expect(reloaded).toEqual(content)
  })

  it('open queues and profiles saved before this change unchanged', () => {
    const old = {
      categories: ['Network'],
      knowledge: [],
      tickets: [
        {
          id: 'INC-1',
          from: 'A',
          department: 'B',
          received: '09:00',
          subject: 'S',
          body: 'B',
          priority: 'P2',
          category: 'Network',
          status: 'open',
          reply: '',
          note: '',
        },
      ],
    }
    const parsed = TicketsContentSchema.parse(old)
    expect(parsed.tickets[0]).toMatchObject({
      status: 'open',
      conditions: [],
      activity: [],
      assignee: null,
      resolution: null,
    })
    expect(parsed.environment).toBeUndefined()
    const profile = newProfileData('Sam', 0, 'it-support')
    const { disruptions: _, ...work } = profile.work
    expect(WorkStateSchema.parse(work).disruptions).toEqual([])
  })

  it('give the model answer full marks', () => {
    const solved = applyTicketSolution(task, fresh())
    const checks = [...gradeTickets(task, solved), ...gradeEnvironment(task, solved)]
    expect(
      checks.filter((c) => c.id !== 'carmen-reply' && c.status !== 'passed'),
    ).toEqual([])
    expect(checks.reduce((sum, c) => sum + c.points, 0)).toBe(100)
  })

  it('give nothing for tickets set to Resolved while the problems remain', () => {
    const content = fresh()
    const claimed: TicketsContent = {
      ...content,
      tickets: content.tickets.map((t) => ({ ...t, status: 'resolved' as const })),
    }
    const fixed = gradeTickets(task, claimed).filter((c) => c.id.endsWith('-fixed'))
    expect(fixed.map((c) => c.earned)).toEqual([0, 0, 0])
    expect(fixed[0].problems[0]).toMatch(
      /^INC-3101 is not fixed: AP-FL2 is not responding\./,
    )
    expect(gradeEnvironment(task, claimed).map((c) => c.status)).toEqual([
      'failed',
      'failed',
    ])
  })

  it('assess what the player did: the cause recorded and the fix verified', () => {
    let content = restartAp(fresh())
    expect(gradeEnvironment(task, content).map((c) => c.status)).toEqual([
      'failed',
      'failed',
    ])
    content = net(content, (s) => runConsole(s, 'IT-PC-07', 'ping 10.20.2.5'))
    content = net(content, (s) => runConsole(s, 'LT-0161', 'ping file-01'))
    content = net(
      content,
      (s) =>
        addFinding(s, { device: 'AP-FL2', fault: 'device-crashed', note: 'No reply.' })
          .state,
    )
    expect(gradeEnvironment(task, content).map((c) => c.status)).toEqual([
      'passed',
      'passed',
    ])
  })

  it('start valid systems, checks and model answers for the tools', () => {
    for (const id of ['network', 'directory'] as const) {
      const tool = getTool(id)!
      const env = task.queue!.environment![id]!
      expect(tool.state.safeParse(env.start).success).toBe(true)
      expect(tool.state.safeParse(env.solution).success).toBe(true)
      for (const check of env.checks)
        expect(tool.check.safeParse(check).success).toBe(true)
    }
  })
})
