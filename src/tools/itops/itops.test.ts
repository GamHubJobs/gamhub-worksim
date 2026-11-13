import { describe, expect, it } from 'vitest'
import { applyEnvironmentChange, evaluateTicket } from '../../game/incidents'
import type { Ticket, TicketsContent } from '../../persistence/schemas'
import { companyItops } from './data'
import { itops } from './definition'
import {
  advance,
  connectCable,
  cablingLayout,
  hostnameFor,
  SOP,
  startRun,
  takeHint,
  type DeployResult,
} from './deployment'
import {
  checkIn,
  checkOut,
  confirmAddress,
  deliverDue,
  enableArchive,
  nodeState,
  powerCycle,
  rebootNode,
  registerAsset,
  registerProblems,
  releaseMessage,
  removeBlocked,
  restartNodeService,
  ship,
  type Result,
} from './model'
import { ItopsStateSchema, type ItopsState } from './schema'
import {
  bookIn,
  finishRepair,
  installPart,
  removePart,
  runTest,
  SCREWS,
  setBattery,
  setCover,
  toggleScrew,
} from './repair'
import { spotsFor } from './bench/geometry'

const ok = (r: Result | DeployResult) => {
  expect(r.problems).toEqual([])
  return r.state
}

function withFaults(): ItopsState {
  const s = companyItops()
  return {
    ...s,
    nodes: s.nodes.map((n) =>
      n.id === 'SW-F2'
        ? { ...n, status: 'down' as const, fault: 'hung' as const }
        : n.id === 'PRINT01'
          ? {
              ...n,
              services: n.services.map((x) => ({ ...x, state: 'stopped' as const })),
            }
          : n,
    ),
  }
}

describe('IT Operations state', () => {
  it('the healthy estate is valid and consistent', () => {
    const s = companyItops()
    expect(ItopsStateSchema.parse(s)).toBeTruthy()
    expect(registerProblems(s)).toEqual([])
    expect(s.nodes.every((n) => nodeState(s, n) === 'up')).toBe(true)
  })
})

describe('Server Room', () => {
  it('a hung switch cannot be reached remotely; a power-cycle at the cabinet brings it back', () => {
    let s = withFaults()
    const sw = s.nodes.find((n) => n.id === 'SW-F2')!
    expect(nodeState(s, sw)).toBe('down')
    expect(rebootNode(s, 'SW-F2').problems[0]).toMatch(/power-cycle it there/)
    s = ok(powerCycle(s, 'SW-F2'))
    expect(
      nodeState(
        s,
        s.nodes.find((n) => n.id === 'SW-F2')!,
      ),
    ).toBe('up')
    expect(s.log.at(-1)!.risk).toBe(false)
  })

  it('rebooting healthy core equipment is logged as risky', () => {
    const s = ok(rebootNode(companyItops(), 'FW-01'))
    expect(s.log.at(-1)!.risk).toBe(true)
    expect(s.log.at(-1)!.detail).toMatch(/240 people/)
  })

  it('a hardware fault survives a restart', () => {
    const base = companyItops()
    const s0 = {
      ...base,
      nodes: base.nodes.map((n) =>
        n.id === 'WLC-01'
          ? { ...n, status: 'down' as const, fault: 'hardware' as const }
          : n,
      ),
    }
    const s = ok(powerCycle(s0, 'WLC-01'))
    expect(
      nodeState(
        s,
        s.nodes.find((n) => n.id === 'WLC-01')!,
      ),
    ).toBe('down')
    // Everything below the controller is cut off.
    expect(
      nodeState(
        s,
        s.nodes.find((n) => n.id === 'AP-CAFE')!,
      ),
    ).toBe('unreachable')
  })

  it('a stopped service is started without restarting the server', () => {
    const s = ok(restartNodeService(withFaults(), 'PRINT01', 'Print Spooler'))
    expect(s.nodes.find((n) => n.id === 'PRINT01')!.services[0].state).toBe('running')
  })

  it('the provider cannot be rebooted from here', () => {
    expect(rebootNode(companyItops(), 'ISP').problems[0]).toMatch(/Check the ISP status/)
  })
})

describe('Mail', () => {
  it('an archive frees a full mailbox and the waiting mail is delivered', () => {
    const base = companyItops()
    const addr = base.mailboxes[0].address
    const s0: ItopsState = {
      ...base,
      mailboxes: base.mailboxes.map((m) =>
        m.address === addr ? { ...m, usedGb: 10.2, oldMailGb: 4 } : m,
      ),
      messages: [
        ...base.messages,
        {
          id: 'M-1',
          at: 'x',
          hoursAgo: 1,
          from: 'a@x.example',
          to: addr,
          subject: 'Invoice',
          status: 'pending',
          code: '452 4.2.2',
          scl: 1,
          verdict: 'clean',
          released: false,
        },
      ],
    }
    const s = ok(enableArchive(s0, addr))
    expect(s.mailboxes[0].usedGb).toBeCloseTo(6.2)
    expect(s.messages.find((m) => m.id === 'M-1')!.status).toBe('delivered')
  })

  it('releasing phishing is risky; removing a phishing block is risky', () => {
    const base = companyItops()
    const s0: ItopsState = {
      ...base,
      messages: [
        ...base.messages,
        {
          id: 'M-2',
          at: 'x',
          hoursAgo: 1,
          from: 'it-help@payr0ll.example',
          to: base.mailboxes[0].address,
          subject: 'Password expiry',
          status: 'quarantined',
          code: '',
          scl: 8,
          verdict: 'phishing',
          released: false,
        },
      ],
    }
    expect(ok(releaseMessage(s0, 'M-2')).log.at(-1)!.risk).toBe(true)
    expect(ok(removeBlocked(base, 'invoice-portal.example.org')).log.at(-1)!.risk).toBe(
      true,
    )
  })
})

describe('Assets and shipping', () => {
  it('only registered stock is checked out; returns need re-imaging', () => {
    let s = companyItops()
    s = {
      ...s,
      assets: [
        ...s.assets,
        {
          tag: 'A-1200',
          type: 'laptop',
          model: 'm',
          hostname: 'CR-L1200',
          assignedTo: null,
          site: null,
          status: 'needs-registration',
          build: 'imaging',
          onShelf: true,
          purchased: '2026-11-13',
          warrantyEnd: '2029-11-13',
          notes: '',
          hwFault: null,
        },
      ],
    }
    expect(checkOut(s, 'A-1200', 'grace.mensah').problems[0]).toMatch(/not registered/)
    s = ok(registerAsset(s, 'A-1200'))
    s = ok(checkOut(s, 'A-1200', 'grace.mensah'))
    expect(registerProblems(s)).toEqual([])
    s = ok(checkIn(s, 'A-1200'))
    const back = s.assets.find((a) => a.tag === 'A-1200')!
    expect(back).toMatchObject({ status: 'needs-image', onShelf: true, assignedTo: null })
    expect(checkOut(s, 'A-1200', 'owen.price').problems[0]).toMatch(/re-image/)
  })

  it('a computer ships only to the confirmed address, with a return label', () => {
    let s = companyItops()
    s = {
      ...s,
      assets: [
        ...s.assets,
        {
          tag: 'A-1201',
          type: 'laptop',
          model: 'm',
          hostname: 'CR-L1201',
          assignedTo: null,
          site: null,
          status: 'ready',
          build: 'imaging',
          onShelf: true,
          purchased: '2026-11-13',
          warrantyEnd: '2029-11-13',
          notes: '',
          hwFault: null,
        },
      ],
    }
    const rosa = s.people.find((p) => p.id === 'rosa.delgado')!
    const form = {
      to: 'rosa.delgado',
      address: rosa.addressOnFile!,
      items: ['computer' as const],
      unit: 'A-1201',
      speed: 'priority' as const,
      returnLabel: true,
      returnTo: 'it' as const,
      reference: 'INC-1',
    }
    // The address on file is out of date.
    expect(ship(s, form, 0).problems[0]).toMatch(/out of date/)
    s = ok(confirmAddress(s, 'rosa.delgado', '09:30'))
    expect(
      ship(s, { ...form, address: rosa.address!, returnLabel: false }, 0).problems[0],
    ).toMatch(/return label/)
    // A misspelt city is offered the matching record.
    expect(
      ship(s, { ...form, address: { ...rosa.address!, city: 'Fairhavn' } }, 0).suggestion,
    ).toEqual(rosa.address)
    s = ok(ship(s, { ...form, address: rosa.address! }, 1000))
    expect(s.shipments[0].status).toBe('in-transit')
    expect(deliverDue(s, 2000).shipments[0].status).toBe('in-transit')
    s = deliverDue(s, 1000 + 8000)
    expect(s.shipments[0].status).toBe('delivered')
    expect(s.assets.find((a) => a.tag === 'A-1201')).toMatchObject({
      status: 'deployed',
      assignedTo: 'rosa.delgado',
    })
  })
})

/** Runs a whole imaging build with the right answers. */
function imagingBuild(
  start: ItopsState,
  device: 'desktop' | 'laptop' = 'laptop',
): ItopsState {
  let s = ok(startRun(start, 'imaging', false))
  s = ok(advance(s, {}))
  s = ok(advance(s, { device }))
  for (const cable of cablingLayout(device).cables.filter((c) => c.required)) {
    const used = new Set(Object.values(s.run!.cables))
    const port = cablingLayout(device).ports.find(
      (p) =>
        p.plug === cable.plug &&
        (!cable.goes || cable.goes.includes(p.id)) &&
        !used.has(p.id),
    )!
    s = ok(connectCable(s, cable.id, port.id))
  }
  s = ok(advance(s, {}))
  s = ok(advance(s, { key: 'F12', entry: 'pxe4' }))
  s = ok(advance(s, { password: SOP.servicePassword }))
  s = ok(advance(s, { sequence: 'std-w11' }))
  s = ok(advance(s, { name: hostnameFor(s, s.run!) }))
  s = ok(advance(s, {}))
  s = ok(advance(s, { user: SOP.buildCheckUser, password: SOP.buildCheckPassword }))
  return ok(advance(s, {}))
}

describe('Computer Deployment', () => {
  it('an imaging build done right lands on the shelf, needing registration', () => {
    const s = imagingBuild(companyItops())
    const unit = s.assets.find((a) => a.tag === 'A-1100')!
    expect(unit).toMatchObject({
      hostname: 'CR-L1100',
      build: 'imaging',
      status: 'needs-registration',
      onShelf: true,
    })
    expect(s.run).toBeNull()
    expect(s.nextAsset).toBe(1101)
    expect(
      itops.grade(
        [
          {
            id: 'b',
            type: 'built',
            build: 'imaging',
            maxMistakes: 0,
            title: 't',
            points: 5,
            why: '',
            hint: '',
          },
        ],
        s,
        { start: s, solution: s },
      )[0].status,
    ).toBe('passed')
  })

  it('wrong answers are refused and counted; a dead deployment server blocks without blame', () => {
    let s = ok(startRun(companyItops(), 'imaging', true))
    s = ok(advance(s, {}))
    s = ok(advance(s, { device: 'desktop' }))
    let r = connectCable(s, 'eth-device', 'pc-dp')
    expect(r.problems[0]).toMatch(/does not fit/)
    s = r.state
    expect(s.run!.mistakes).toBe(1)
    s = ok(connectCable(s, 'eth-wall', 'wall-voice'))
    r = advance(s, {})
    expect(r.problems.join(' ')).toMatch(/VOICE socket/)
    expect(r.state.run!.step).toBe(2)
    s = ok(takeHint(r.state))
    expect(s.run!.hintsUsed).toBe(1)

    // The PXE responder is stopped: the boot is blocked, not counted.
    const dead: ItopsState = {
      ...companyItops(),
      nodes: companyItops().nodes.map((n) =>
        n.id === 'DEPLOY01'
          ? {
              ...n,
              services: n.services.map((x) => ({ ...x, state: 'stopped' as const })),
            }
          : n,
      ),
    }
    let d = ok(startRun(dead, 'imaging', false))
    d = { ...d, run: { ...d.run!, step: 3, device: 'desktop', unit: 'A-1100' } }
    const boot = advance(d, { key: 'F12', entry: 'pxe4' })
    expect(boot.problems[0]).toMatch(/PXE-E16/)
    expect(boot.state.run!.mistakes).toBe(0)
  })

  it('a manual build needs the online-account bypass, a strong password and a domain join', () => {
    let s = ok(startRun(companyItops(), 'manual', false))
    s = { ...s, run: { ...s.run!, step: 4, device: 'desktop', unit: 'A-1100' } }
    s = ok(advance(s, { region: 'United States', keyboard: 'US' }))
    expect(advance(s, { command: 'oobe\\bypassnro' }).problems[0]).toMatch(/removed/)
    s = ok(advance(s, { command: 'start ms-cxh:localonly' }))
    expect(advance(s, { user: SOP.localAdmin, password: 'short' }).problems[0]).toMatch(
      /14 characters/,
    )
    s = ok(advance(s, { user: SOP.localAdmin, password: 'Temp-Bench-Pass-77!' }))
    s = ok(
      advance(s, {
        location: 'off',
        diagnostics: 'off',
        tailored: 'off',
        ads: 'off',
        find: 'off',
      }),
    )
    expect(advance(s, { name: 'CR-D1100', member: 'workgroup' }).problems[0]).toMatch(
      /Workgroup/,
    )
    s = ok(
      advance(s, {
        name: 'CR-D1100',
        member: 'domain',
        domain: SOP.domain,
        joinUser: SOP.joinAccount,
        joinPassword: SOP.joinPassword,
      }),
    )
    expect(advance(s, { user: '.\\cr-localadmin', password: 'x' }).problems[0]).toMatch(
      /local account/,
    )
    s = ok(advance(s, { user: SOP.buildCheckUser, password: SOP.buildCheckPassword }))
    expect(
      advance(s, {
        apps: [...SOP.baseline, 'DriverBoost Optimizer (sponsored result)'].join('|'),
      }).problems[0],
    ).toMatch(/junkware/)
    s = ok(advance(s, { apps: SOP.baseline.join('|') }))
    s = ok(advance(s, {}))
    expect(s.assets.find((a) => a.tag === 'A-1100')).toMatchObject({
      build: 'manual',
      hostname: 'CR-D1100',
    })
  })
})

describe('Tickets react to IT Operations', () => {
  const ticket = (conditions: Ticket['conditions']): Ticket => ({
    id: 'INC-1',
    from: 'Dana',
    department: 'Ops',
    received: '09:00',
    subject: 'Floor 2 is down',
    body: '',
    priority: null,
    category: null,
    status: 'assigned',
    reply: '',
    note: '',
    conditions,
    assignee: 'you',
    activity: [],
    resolution: null,
    hintsUsed: 0,
  })
  const when = { at: 1, time: 'Day 1, 09:10' }

  it('a ticket resolves when the switch really comes back', () => {
    const content: TicketsContent = {
      categories: ['Network'],
      knowledge: [],
      tickets: [
        ticket([
          { type: 'node-up', node: 'SW-F2' },
          { type: 'node-service', node: 'PRINT01', service: 'Print Spooler' },
        ]),
      ],
      environment: { itops: withFaults() },
    }
    expect(evaluateTicket(content.tickets[0], content.environment).fixed).toBe(false)
    let next = applyEnvironmentChange(
      content,
      'itops',
      (s) => powerCycle(s, 'SW-F2').state,
      when,
    )
    expect(next.tickets[0].status).not.toBe('resolved')
    next = applyEnvironmentChange(
      next,
      'itops',
      (s) => restartNodeService(s, 'PRINT01', 'Print Spooler').state,
      when,
    )
    expect(next.tickets[0].status).toBe('resolved')
    expect(next.tickets[0].activity.some((a) => a.kind === 'change')).toBe(true)
  })

  it('a ticket for a new computer resolves only with the right build', () => {
    let s = imagingBuild(companyItops())
    s = ok(registerAsset(s, 'A-1100'))
    const content: TicketsContent = {
      categories: ['Hardware'],
      knowledge: [],
      tickets: [ticket([{ type: 'has-computer', user: 'sam.reyes', build: 'manual' }])],
      environment: { itops: s },
    }
    const next = applyEnvironmentChange(
      content,
      'itops',
      (x) => checkOut(x, 'A-1100', 'sam.reyes').state,
      when,
    )
    expect(next.tickets[0].status).not.toBe('resolved')
    expect(evaluateTicket(next.tickets[0], next.environment).failing[0].state).toMatch(
      /wrong build/,
    )
  })
})

describe('Repair Bench', () => {
  const faulty = (): ItopsState => {
    const s = companyItops()
    return {
      ...s,
      assets: s.assets.map((a) =>
        a.tag === 'A-1003' ? { ...a, hwFault: 'ram' as const } : a,
      ),
    }
  }

  it('the symptoms name the part; it cannot be opened with screws in or worked on live', () => {
    let s = ok(bookIn(faulty(), 'A-1003'))
    expect(ok(runTest(s, 'A-1003', 'power')).repairs[0].results[0]).toMatch(
      /three short beeps/,
    )
    expect(setCover(s, 'A-1003', true).problems[0]).toMatch(/8 screws/)
    for (let i = 0; i < SCREWS; i++) s = ok(toggleScrew(s, 'A-1003', i))
    s = ok(setCover(s, 'A-1003', true))
    const live = removePart(s, 'A-1003', 'ram')
    expect(live.problems[0]).toMatch(/Disconnect the battery/)
    expect(live.state.log.at(-1)!.risk).toBe(true)
    s = ok(setBattery(s, 'A-1003', false))
    s = ok(removePart(s, 'A-1003', 'ram'))
    expect(installPart(s, 'A-1003', 'ram-ddr4').problems[0]).toMatch(/keyed differently/)
    s = ok(installPart(s, 'A-1003', 'ram-ddr5'))
    expect(s.assets.find((a) => a.tag === 'A-1003')!.hwFault).toBeNull()
    expect(finishRepair(s, 'A-1003').problems[0]).toMatch(/Close the case/)
    s = ok(setBattery(s, 'A-1003', true))
    s = ok(setCover(s, 'A-1003', false))
    for (let i = 0; i < SCREWS; i++) s = ok(toggleScrew(s, 'A-1003', i))
    expect(finishRepair(s, 'A-1003').problems[0]).toMatch(/power-on test/)
    s = ok(runTest(s, 'A-1003', 'power'))
    s = ok(finishRepair(s, 'A-1003'))
    expect(s.repairs).toEqual([])
  })

  it('a ticket on the laptop resolves only when it is repaired and back', () => {
    const content: TicketsContent = {
      categories: ['Hardware'],
      knowledge: [],
      tickets: [
        {
          id: 'INC-9',
          from: 'Dana',
          department: 'Ops',
          received: '09:00',
          subject: 'Beeps',
          body: '',
          priority: null,
          category: null,
          status: 'assigned',
          reply: '',
          note: '',
          conditions: [{ type: 'hardware-ok', tag: 'A-1003' }],
          assignee: 'you',
          activity: [],
          resolution: null,
          hintsUsed: 0,
        },
      ],
      environment: { itops: faulty() },
    }
    expect(evaluateTicket(content.tickets[0], content.environment).fixed).toBe(false)
  })
})

describe('Bench drawing', () => {
  it('every port of both layouts has a place on the bench', () => {
    for (const device of ['desktop', 'laptop'] as const)
      for (const p of cablingLayout(device).ports)
        expect(spotsFor(device)[p.id], p.id).toBeTruthy()
  })
})
