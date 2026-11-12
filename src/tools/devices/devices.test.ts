import { describe, expect, it } from 'vitest'
import { getAssignment } from '../../content/assignments'
import { troubleDoing, troubleLine } from '../../game/encounters'
import { guidanceFor } from '../../game/guidance'
import {
  applyEnvironmentChange,
  disruptionsOf,
  evaluateTicket,
  requestStatus,
} from '../../game/incidents'
import {
  applyTicketSolution,
  buildQueueContent,
  gradeEnvironment,
  gradeTickets,
} from '../../game/tickets'
import { TicketsContentSchema, type TicketsContent } from '../../persistence/schemas'
import { companyDevices } from './data'
import {
  clearPrintQueue,
  connect,
  cpuOf,
  diskCleanup,
  disconnect,
  endProcess,
  findDevice,
  freeGb,
  installApp,
  installUpdates,
  issuesOf,
  repairApp,
  resetNetwork,
  restartDevice,
  restartService,
  uninstallApp,
} from './model'
import { DevicesStateSchema, type DevicesState } from './schema'

const task = getAssignment('device-support')!
const when = { at: 5_000, time: 'Wednesday (day 5), 09:30' }
const fresh = () => buildQueueContent(task, 1_000)
const devices = (c: TicketsContent) => c.environment!.devices!
const ticket = (c: TicketsContent, id: string) => c.tickets.find((t) => t.id === id)!
const dev = (
  c: TicketsContent,
  step: (s: DevicesState) => { state: DevicesState; problems: string[] },
) => applyEnvironmentChange(c, 'devices', (s) => step(s).state, when)
const device = (s: DevicesState, name: string) => findDevice(s, name)!

function ok(r: { state: DevicesState; problems: string[] }) {
  expect(r.problems).toEqual([])
  return r.state
}

describe('device actions (remote support)', () => {
  const start = () => devices(fresh())

  it('need a remote session to the device, and it must be reachable', () => {
    const s = start()
    expect(diskCleanup(s, 'LT-0170').problems[0]).toBe(
      'Connect to LT-0170 with Remote Desktop first.',
    )
    expect(connect(s, 'LT-0190').problems[0]).toContain('not reachable')
    expect(connect(s, 'LT-0170', false).problems[0]).toContain('not reachable')
    expect(connect(s, 'PRN-FL1').problems[0]).toContain('is a printer')
    const connected = ok(connect(s, 'LT-0170'))
    expect(connected.session).toEqual({ device: 'LT-0170' })
    expect(ok(disconnect(connected)).session).toBeNull()
  })

  it('end a runaway process, never a Windows one', () => {
    const s = ok(connect(start(), 'LT-0170'))
    expect(cpuOf(device(s, 'LT-0170'))).toBeGreaterThan(80)
    expect(endProcess(s, 'LT-0170', 'System').problems[0]).toContain('part of Windows')
    const after = ok(endProcess(s, 'LT-0170', 'SyncHelper'))
    expect(cpuOf(device(after, 'LT-0170'))).toBeLessThan(20)
    expect(after.log.at(-1)).toMatchObject({
      action: 'End process',
      detail: 'SyncHelper',
    })
  })

  it('free space with Disk Cleanup (temporary files only)', () => {
    const s = ok(connect(start(), 'LT-0170'))
    expect(freeGb(device(s, 'LT-0170'))).toBe(18)
    const after = ok(diskCleanup(s, 'LT-0170'))
    expect(freeGb(device(after, 'LT-0170'))).toBe(39.5)
    expect(diskCleanup(after, 'LT-0170').problems[0]).toContain('no temporary files')
  })

  it('repair fixes damaged files; reinstall installs the company version', () => {
    const s = ok(connect(start(), 'LT-0171'))
    const repaired = ok(repairApp(s, 'LT-0171', 'LedgerPro'))
    expect(
      device(repaired, 'LT-0171').apps.find((a) => a.name === 'LedgerPro')!.state,
    ).toBe('working')
    const removed = ok(uninstallApp(s, 'LT-0171', 'LedgerPro'))
    const reinstalled = ok(installApp(removed, 'LT-0171', 'LedgerPro'))
    expect(
      device(reinstalled, 'LT-0171').apps.find((a) => a.name === 'LedgerPro'),
    ).toMatchObject({
      state: 'working',
      fault: 'none',
    })
  })

  it('installs only approved software, with the installer service and space', () => {
    const s = ok(connect(start(), 'LT-0162'))
    expect(installApp(s, 'LT-0162', 'DataViz Studio').problems[0]).toContain(
      'Windows Installer',
    )
    const started = ok(restartService(s, 'LT-0162', 'Windows Installer'))
    expect(
      device(started, 'LT-0162').services.find((x) => x.name === 'Windows Installer'),
    ).toMatchObject({
      running: true,
      startup: 'automatic',
    })
    const installed = ok(installApp(started, 'LT-0162', 'DataViz Studio'))
    expect(device(installed, 'LT-0162').storage.usedGb).toBe(
      device(started, 'LT-0162').storage.usedGb + 4,
    )
    expect(installApp(started, 'LT-0162', 'Torrent Client').problems[0]).toContain(
      'not approved',
    )
  })

  it('updates need the update service, then a restart (which ends the session)', () => {
    let s = ok(connect(start(), 'LT-0163'))
    expect(installUpdates(s, 'LT-0163').problems[0]).toContain('Windows Update service')
    s = ok(restartService(s, 'LT-0163', 'Windows Update'))
    s = ok(installUpdates(s, 'LT-0163'))
    expect(device(s, 'LT-0163').restartPending).toBe(true)
    s = ok(restartDevice(s, 'LT-0163'))
    expect(device(s, 'LT-0163').restartPending).toBe(false)
    expect(s.session).toBeNull()
  })

  it('printing: the spooler must run; restarting it clears the stuck job', () => {
    const s = ok(connect(start(), 'DT-0180'))
    expect(clearPrintQueue(s, 'DT-0180').problems[0]).toContain('Print Spooler')
    const after = ok(restartService(s, 'DT-0180', 'Print Spooler'))
    expect(device(after, 'DT-0180').printQueue).toEqual([])
  })

  it('reports each device’s issues from its state', () => {
    const s = start()
    expect(issuesOf(s, device(s, 'DT-0181'))).toContain('Non-standard network settings')
    expect(issuesOf(s, device(s, 'LT-0134'))).toEqual([])
    const fixed = ok(resetNetwork(ok(connect(s, 'DT-0181')), 'DT-0181'))
    expect(issuesOf(fixed, device(fixed, 'DT-0181'))).toEqual([])
  })
})

describe('tickets resolved by fixing the device', () => {
  it('start with every ticket failing, each check describing the device', () => {
    const c = fresh()
    for (const t of c.tickets)
      expect(evaluateTicket(t, c.environment).fixed, t.id).toBe(false)
    expect(
      evaluateTicket(ticket(c, 'INC-3301'), c.environment).failing.map((r) => r.state),
    ).toEqual([
      'LT-0170’s processor is at 96% (SyncHelper uses 86%).',
      'LT-0170 has only 18 GB free.',
    ])
  })

  it('resolve automatically when the cause is fixed, and not before', () => {
    let c = dev(fresh(), (s) => connect(s, 'LT-0170'))
    c = dev(c, (s) => endProcess(s, 'LT-0170', 'SyncHelper'))
    expect(ticket(c, 'INC-3301').status).not.toBe('resolved')
    expect(ticket(c, 'INC-3301').activity.map((a) => a.text)).toContain(
      'Change made: End process SyncHelper on LT-0170.',
    )
    c = dev(c, (s) => diskCleanup(s, 'LT-0170'))
    expect(ticket(c, 'INC-3301')).toMatchObject({
      status: 'resolved',
      resolution: { by: 'automatic' },
    })
    // Other tickets are untouched.
    expect(ticket(c, 'INC-3302').status).toBe('new')
  })

  it('a restart finishes Leila’s updates; Resolved by hand is refused before', () => {
    let c = fresh()
    expect(requestStatus(c, 'INC-3306', 'resolved', when).refused?.[1]).toContain(
      'KB5035853 failed',
    )
    c = dev(c, (s) => connect(s, 'LT-0163'))
    c = dev(c, (s) => restartService(s, 'LT-0163', 'Windows Update'))
    c = dev(c, (s) => installUpdates(s, 'LT-0163'))
    expect(
      evaluateTicket(ticket(c, 'INC-3306'), c.environment).failing[0].state,
    ).toContain('needs a restart')
    c = dev(c, (s) => restartDevice(s, 'LT-0163'))
    expect(ticket(c, 'INC-3306').status).toBe('resolved')
  })

  it('reopens if the fault comes back', () => {
    let c = dev(fresh(), (s) => connect(s, 'DT-0180'))
    c = dev(c, (s) => restartService(s, 'DT-0180', 'Print Spooler'))
    expect(ticket(c, 'INC-3303').status).toBe('resolved')
    c = dev(c, (s) => (s.session ? { state: s, problems: [] } : connect(s, 'DT-0180')))
    c = applyEnvironmentChange(
      c,
      'devices',
      (s) => ({
        ...s,
        devices: s.devices.map((d) =>
          d.name === 'DT-0180'
            ? {
                ...d,
                services: d.services.map((x) =>
                  x.name === 'Print Spooler' ? { ...x, running: false } : x,
                ),
              }
            : d,
        ),
      }),
      when,
    )
    expect(ticket(c, 'INC-3303').status).toBe('reopened')
  })

  it('guides from the device’s real state, towards its own tools', () => {
    const c = fresh()
    const g = guidanceFor(ticket(c, 'INC-3301'), c)
    expect(g.hints[0].text).toContain('SyncHelper uses 86%')
    expect(g.hints[1].tool).toBe('devices')
    expect(g.hints[2].text).toContain('Task Manager on LT-0170')
    expect(guidanceFor(ticket(c, 'INC-3305'), c).hints[2].text).toContain(
      'Windows Installer',
    )
  })

  it('holds up the colleagues until their computer works, then they say so', () => {
    const held = disruptionsOf(fresh(), task.id)
    expect(held.find((d) => d.person === 'backL')).toMatchObject({
      what: 'their computer',
      state: 'blocked',
    })
    expect(held.find((d) => d.person === 'coordinator')?.what).toBe('the printer')
    expect(troubleDoing({ what: 'their computer', state: 'blocked' })).toBe(
      'a computer that keeps freezing',
    )
    expect(troubleLine({ what: 'the printer', state: 'restored' })).toBe(
      'Printing works again, thank you! Just in time.',
    )
  })
})

describe('grading and saving', () => {
  const grade = (c: TicketsContent) => [
    ...gradeTickets(task, c),
    ...gradeEnvironment(task, c),
  ]

  it('gives the model answer full marks (replies aside), out of 100', () => {
    const solved = applyTicketSolution(task, fresh())
    const results = grade(solved)
    expect(
      results.filter((r) => !r.id.endsWith('-reply') && r.status !== 'passed'),
    ).toEqual([])
    expect(results.reduce((sum, r) => sum + r.points, 0)).toBe(100)
  })

  it('marks down a session left open, and a ticket chosen Resolved without a fix', () => {
    let c = dev(fresh(), (s) => connect(s, 'LT-0171'))
    c = requestStatus(c, 'INC-3302', 'resolved', when).content
    const results = grade(c)
    expect(results.find((r) => r.id === 'disconnected')?.status).toBe('failed')
    expect(results.find((r) => r.id === 'owen-fixed')?.status).toBe('failed')
  })

  it('keeps the devices with the queue across a reload; older queues load', () => {
    let c = dev(fresh(), (s) => connect(s, 'LT-0170'))
    c = dev(c, (s) => diskCleanup(s, 'LT-0170'))
    const reloaded = TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))
    expect(reloaded).toEqual(c)
    const wifi = buildQueueContent(getAssignment('wifi-outage')!, 1)
    expect(
      TicketsContentSchema.parse(JSON.parse(JSON.stringify(wifi))).environment!.devices,
    ).toBeUndefined()
    expect(DevicesStateSchema.parse(companyDevices()).devices.length).toBe(11)
  })
})
