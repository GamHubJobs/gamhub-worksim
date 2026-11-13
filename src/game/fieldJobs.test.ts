import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { hardwareLogistics, serverRoomMail } from '../content/assignments/it/itOperations'
import type { TicketsContent } from '../persistence/schemas'
import {
  deskOf,
  equipmentAt,
  isInteraction,
  itActivities,
} from '../office/scene/officeLayout'
import { powerCycle } from '../tools/itops/model'
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
} from '../tools/itops/repair'
import type { ItopsState } from '../tools/itops/schema'
import { fieldJobsOf } from './fieldJobs'
import { applyEnvironmentChange } from './incidents'
import { buildQueueContent } from './tickets'

const when = { at: 1, time: 'Day 1, 09:30' }
const change = (c: TicketsContent, fn: (s: ItopsState) => ItopsState) =>
  applyEnvironmentChange(c, 'itops', fn, when)
const queue = (id: string) => buildQueueContent(getAssignment(id)!, 0)

describe('IT jobs in the office', () => {
  it('a hung floor switch is a job at the comms cabinet until it is power-cycled', () => {
    let c = queue(serverRoomMail.id)
    expect(fieldJobsOf(c, 'a', 'd')).toEqual([
      expect.objectContaining({
        kind: 'cabinet',
        target: 'cabinet',
        subject: 'SW-F2',
        ticket: 'INC-4101',
      }),
    ])
    c = change(c, (s) => powerCycle(s, 'SW-F2').state)
    expect(fieldJobsOf(c, 'a', 'd')).toEqual([])
    expect(c.tickets.find((t) => t.id === 'INC-4101')!.status).toBe('resolved')
  })

  it('a faulty laptop is collected at the desk, repaired at the bench, and handed back', () => {
    let c = queue(hardwareLogistics.id)
    const kinds = () =>
      fieldJobsOf(c, 'a', 'd')
        .filter((j) => j.subject === 'A-1003')
        .map((j) => `${j.kind}@${j.target}`)
    expect(kinds()).toEqual(['collect@person:coordinator'])
    c = change(c, (s) => bookIn(s, 'A-1003').state)
    expect(kinds()).toEqual(['repair@bench'])
    c = change(c, (s) => {
      let x = s
      for (let i = 0; i < SCREWS; i++) x = toggleScrew(x, 'A-1003', i).state
      x = setCover(x, 'A-1003', true).state
      x = setBattery(x, 'A-1003', false).state
      x = removePart(x, 'A-1003', 'ram').state
      x = installPart(x, 'A-1003', 'ram-ddr5').state
      x = setBattery(x, 'A-1003', true).state
      x = setCover(x, 'A-1003', false).state
      for (let i = 0; i < SCREWS; i++) x = toggleScrew(x, 'A-1003', i).state
      return runTest(x, 'A-1003', 'power').state
    })
    expect(kinds()).toEqual(['return@person:coordinator'])
    // Not resolved while it is still at the bench: only once it is handed back.
    expect(c.tickets.find((t) => t.id === 'INC-4205')!.status).not.toBe('resolved')
    c = change(c, (s) => finishRepair(s, 'A-1003').state)
    expect(kinds()).toEqual([])
    expect(c.tickets.find((t) => t.id === 'INC-4205')!.status).toBe('resolved')
  })

  it('a computer to build is a job at the bench while the shelf is empty', () => {
    const jobs = fieldJobsOf(queue(hardwareLogistics.id), 'a', 'd')
    expect(jobs.some((j) => j.kind === 'build' && j.target === 'bench')).toBe(true)
  })
})

describe('The IT corner in the office', () => {
  it('every job has a place, and a desk to stand at', () => {
    expect(equipmentAt('cabinet')).toBeTruthy()
    expect(equipmentAt('bench')).toBeTruthy()
    expect(deskOf('coordinator')).toBeTruthy()
    for (const person of ['backL', 'backM', 'backR', 'senior', 'front2'])
      expect(deskOf(person), person).toBeTruthy()
  })

  it('hands-on work is its own kind of action, with a desk only while a laptop waits', () => {
    expect(isInteraction('onsite:bench')).toBe(false)
    expect(itActivities([]).map((a) => a.id)).toEqual(['onsite:cabinet', 'onsite:bench'])
    const withDesk = itActivities([
      { person: 'coordinator', kind: 'collect', name: 'Dana Kowalski' },
    ])
    expect(withDesk.at(-1)).toMatchObject({
      id: 'onsite:desk:coordinator',
      prompt: 'collect Dana’s laptop',
    })
  })
})
