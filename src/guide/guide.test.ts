import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { hardwareLogistics, serverRoomMail } from '../content/assignments/it/itOperations'
import { newProfileData, type ProfileData } from '../game/career'
import { isBeginner, nextStep } from '../game/nextStep'
import { buildQueueContent } from '../game/tickets'
import { WorkStateSchema } from '../persistence/schemas'
import { benchHint } from '../tools/itops/bench/benchHint'
import { companyItops } from '../tools/itops/data'
import { startRun, type Cable } from '../tools/itops/deployment'
import { assignToMe } from '../game/incidents'
import {
  bookIn,
  installPart,
  removePart,
  runTest,
  SCREWS,
  setBattery,
  setCover,
  toggleScrew,
} from '../tools/itops/repair'
import { allTools } from '../tools/registry'
import { cabinetHint, deploymentHint, queueHint, repairHint } from './stepHints'
import { allTours, getTour, INTRO_TOUR, tourForWindow } from './tours'

const fresh = (): ProfileData => newProfileData('Alex', 1, 'it-support', 7)

describe('the next step', () => {
  it('in the office: the computer when there is mail, with the key, and detail for a beginner', () => {
    const p = fresh()
    const step = nextStep(
      {
        ...p,
        inbox: [
          {
            id: 'm1',
            from: 'manager',
            subject: 'Hi',
            body: '',
            receivedAt: 1,
            readAt: null,
            kind: 'info',
          },
        ],
      } as ProfileData,
      { place: 'office', app: null },
    )
    expect(step.text).toMatch(/use your computer: \d+ unread message/)
    expect(step.keys).toContain('E')
    expect(isBeginner(p)).toBe(true)
  })

  it('at the computer: start the next task, then its next unticked step, then submit', () => {
    let p = fresh()
    p = { ...p, inbox: p.inbox.map((m) => ({ ...m, readAt: 1 })) }
    expect(nextStep(p, { place: 'computer', app: 'mail' }).text).toMatch(
      /^Open Tasks and start/,
    )
    const task = getAssignment('triage-queue')!
    p = {
      ...p,
      assignments: {
        [task.id]: {
          assignmentId: task.id,
          assignmentVersion: task.version,
          documentId: 'doc-1',
          startedAt: 1,
          completedSteps: [task.steps[0].id],
          attempts: [],
        },
      },
    }
    expect(nextStep(p, { place: 'computer', app: 'helpdesk' }).text).toBe(
      `${task.title}: ${task.steps[1].title}`,
    )
    p.assignments[task.id].completedSteps = task.steps.map((s) => s.id)
    expect(nextStep(p, { place: 'computer', app: 'helpdesk' }).text).toMatch(
      /^Review your work, then submit/,
    )
  })

  it('hands-on work waiting in the office comes first at the computer, and there in the office', () => {
    const p = fresh()
    p.inbox = p.inbox.map((m) => ({ ...m, readAt: 1 }))
    p.work.fieldJobs = [
      {
        assignment: 'a',
        document: 'd',
        ticket: 'INC-1',
        kind: 'cabinet',
        target: 'cabinet',
        label: 'SW-F2 is not responding',
        subject: 'SW-F2',
      },
    ]
    expect(nextStep(p, { place: 'computer', app: 'mail' }).text).toBe(
      'Hands-on work is waiting in the office',
    )
    const office = nextStep(p, { place: 'office', app: null })
    expect(office.text).toBe('SW-F2 is not responding')
    expect(office.detail).toMatch(/comms cabinet/)
  })
})

describe('state-aware hints', () => {
  const laptop = (cables: Record<string, string>, held: Cable | null = null) =>
    benchHint('laptop', cables, held, 'left')

  it('the bench names the next cable still missing, not the opening instructions', () => {
    expect(laptop({}).text).toBe('Connect the dock power adapter to Power in on the dock')
    // The charger side is done (dock power and dock cable): the network lead is next.
    const powered = {
      'dock-psu': 'dock-power',
      'dock-cable': 'lap-usbc1',
      'power-mon': 'mon-power',
    }
    expect(laptop(powered).text).toBe(
      'Connect the dock end of the network lead to Ethernet on the dock',
    )
    // A lead in the wrong socket comes first.
    expect(laptop({ ...powered, 'eth-wall': 'wall-voice' }).text).toBe(
      'Move the network lead from the VOICE socket to the DATA socket',
    )
    // A port on the other side of the laptop says to turn it.
    expect(benchHint('laptop', { 'dock-psu': 'dock-power' }, null, 'right').text).toMatch(
      /\(turn the computer: left side\)$/,
    )
    const all = {
      ...powered,
      'eth-device': 'dock-lan',
      'eth-wall': 'wall-data',
      'dp-device': 'dock-dp1',
      'dp-mon': 'mon-dp',
      keyboard: 'dock-usb1',
      mouse: 'dock-usb2',
      headset: 'dock-usb3',
    }
    expect(laptop(all).text).toMatch(/^Every cable is in/)
  })

  it('the repair bench follows the real state of the laptop, step by step', () => {
    const base = companyItops()
    let s = {
      ...base,
      assets: base.assets.map((a) =>
        a.tag === 'A-1003' ? { ...a, hwFault: 'ram' as const } : a,
      ),
    }
    s = bookIn(s, 'A-1003').state
    const hint = () => repairHint(s, 'A-1003')!.text
    expect(hint()).toBe('Run the power-on test first')
    s = runTest(s, 'A-1003', 'power').state
    expect(hint()).toBe(`Undo the base screws (${SCREWS} still in)`)
    for (let i = 0; i < SCREWS; i++) s = toggleScrew(s, 'A-1003', i).state
    expect(hint()).toBe('Lift the bottom cover')
    s = setCover(s, 'A-1003', true).state
    expect(hint()).toMatch(/^Disconnect the battery/)
    s = setBattery(s, 'A-1003', false).state
    expect(hint()).toBe('Take out the part the tests point to')
    s = removePart(s, 'A-1003', 'ram').state
    expect(hint()).toMatch(/^Fit a replacement memory/)
    s = installPart(s, 'A-1003', 'ram-ddr5').state
    expect(hint()).toBe('Reconnect the battery')
    s = setBattery(s, 'A-1003', true).state
    s = setCover(s, 'A-1003', false).state
    expect(hint()).toBe(`Refit the base screws (${SCREWS} still out)`)
    for (let i = 0; i < SCREWS; i++) s = toggleScrew(s, 'A-1003', i).state
    expect(hint()).toBe('Prove the repair: run the power-on test')
    s = runTest(s, 'A-1003', 'power').state
    expect(hint()).toBe('Fixed and proven: take it back to Dana’s desk')
  })

  it('the cabinet: find the hung device, then cycle only it', () => {
    const s = buildQueueContent(serverRoomMail as never, 0).environment!.itops!
    const devices = s.nodes.filter((n) => n.location === 'Office comms cabinet')
    expect(cabinetHint(devices, s, null, [], []).text).toMatch(
      /^Find the device that has stopped/,
    )
    expect(cabinetHint(devices, s, 'SW-F2', [], []).text).toBe(
      'Switch SW-F2’s outlet off, then on again',
    )
    expect(cabinetHint(devices, s, 'SW-F2', ['SW-F2'], []).text).toBe(
      'Switch outlet 2 back on',
    )
  })

  it('deployment points to the SOP without giving the answer', () => {
    const run = startRun(companyItops(), 'imaging', false).state.run!
    expect(deploymentHint(run)!.text).toMatch(/SOP/)
    expect(deploymentHint({ ...run, step: 4 })!.detail).toMatch(/in the SOP/)
    expect(JSON.stringify(deploymentHint({ ...run, step: 4 }))).not.toContain(
      'Image-Cobalt',
    )
  })

  it('the queue: assign, then fix what the systems show, most urgent first', () => {
    let c = buildQueueContent(getAssignment(hardwareLogistics.id)!, 0)
    expect(queueHint(c)!.text).toMatch(
      /^Open INC-4201 \(Rosa Delgado\) and assign it to yourself/,
    )
    c = assignToMe(c, 'INC-4201', { at: 1, time: '' })
    expect(queueHint(c)!.text).toMatch(/^INC-4201: Rosa Delgado has a working computer/)
  })
})

describe('tours', () => {
  it('the introduction covers the twelve subjects, and every app and tool has one', () => {
    expect(INTRO_TOUR.steps.length).toBeGreaterThanOrEqual(12)
    const ids = allTours().map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const key of [
      'helpdesk',
      'sheets',
      'mail',
      'tasks',
      'career',
      'readiness',
      'portfolio',
      'ai',
      'docs',
      'slides',
      'cases',
      'code',
    ])
      expect(tourForWindow(key), key).toBeTruthy()
    for (const tool of allTools().filter((t) => t.id !== 'itops'))
      expect(getTour(`tool:${tool.id}`)?.steps[0].body, tool.id).toBe(tool.guide.intro)
  })

  it('old saves get the guidance defaults', () => {
    const { guide: _, ...work } = fresh().work
    expect(WorkStateSchema.parse(work).guide).toEqual({
      tours: {},
      hintsCollapsed: false,
    })
  })
})
