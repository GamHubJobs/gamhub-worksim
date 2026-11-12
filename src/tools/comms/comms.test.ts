import { describe, expect, it } from 'vitest'
import { getAssignment } from '../../content/assignments'
import { applyEnvironmentChange, evaluateTicket } from '../../game/incidents'
import { presenceOf } from '../../game/presence'
import {
  applyTicketSolution,
  buildQueueContent,
  gradeEnvironment,
  gradeTickets,
} from '../../game/tickets'
import { TicketsContentSchema, type TicketsContent } from '../../persistence/schemas'
import { connect, repairApp } from '../devices/model'
import type { DevicesState } from '../devices/schema'
import {
  answerCall,
  assessCall,
  linkVoicemail,
  listen,
  markRead,
  sayInCall,
  sendMessage,
  ticketFromCall,
  ticketFromVoicemail,
  unreadIn,
} from './model'
import type { CommsState } from './schema'

const task = getAssignment('service-desk-comms')!
const when = { at: 7_000, time: '09:40' }
const fresh = () => buildQueueContent(task, 1_000)
const comms = (c: TicketsContent) => c.environment!.comms!
const ticket = (c: TicketsContent, id: string) => c.tickets.find((t) => t.id === id)
const talk = (
  c: TicketsContent,
  step: (s: CommsState) => { state: CommsState; problems: string[] },
) => {
  const r = step(comms(c))
  expect(r.problems).toEqual([])
  return applyEnvironmentChange(c, 'comms', (s) => step(s).state, when)
}
const fix = (
  c: TicketsContent,
  step: (s: DevicesState) => { state: DevicesState; problems: string[] },
) => applyEnvironmentChange(c, 'devices', (s) => step(s).state, when)

/** Plays a call through with the given option at each step. */
function call(c: TicketsContent, id: string, options: number[]) {
  let next = talk(c, (s) => answerCall(s, id))
  for (const o of options) next = talk(next, (s) => sayInCall(s, id, o))
  return next
}

describe('chat', () => {
  it('counts unread messages, marks a conversation read, and sends', () => {
    let c = fresh()
    expect(unreadIn(comms(c), 'finance')).toBe(2)
    c = talk(c, (s) => markRead(s, 'finance'))
    expect(unreadIn(comms(c), 'finance')).toBe(0)
    expect(sendMessage(comms(c), 'finance', '   ').problems).toEqual([
      'Write a message first.',
    ])
    c = talk(c, (s) => sendMessage(s, 'finance', 'We are on it.', '09:35'))
    expect(comms(c).messages.at(-1)).toMatchObject({
      from: 'you',
      channel: 'finance',
      time: '09:35',
    })
  })

  it('shows availability from the office schedule', () => {
    // Carmen (front2): in from 08:55, lunch out 12:00–12:50, stand-up on weekdays.
    expect(presenceOf('front2', 1, 8 * 60)).toBe('away')
    expect(presenceOf('front2', 1, 12 * 60 + 10)).toBe('away')
    expect(presenceOf('front2', 1, 11 * 60)).toBe('available')
    expect(presenceOf('front2', 1, 17 * 60 + 30)).toBe('away')
  })
})

describe('voicemail', () => {
  it('must be listened to first, then becomes a ticket once, or a link with a note', () => {
    let c = fresh()
    expect(ticketFromVoicemail(comms(c), 'VM-2').problems).toEqual([
      'Listen to the voicemail first.',
    ])
    c = talk(c, (s) => listen(s, 'VM-2'))
    c = talk(c, (s) => ticketFromVoicemail(s, 'VM-2'))
    expect(ticket(c, 'INC-3410')).toMatchObject({
      from: 'Dana Kowalski',
      status: 'new',
      subject: 'Meeting room 2 projector: no signal',
    })
    expect(ticket(c, 'INC-3410')!.activity[0].text).toBe(
      'Ticket created from a voicemail from Dana Kowalski: Meeting room 2 projector: no signal',
    )
    // Another change does not add it twice.
    const again = talk(c, (s) => listen(s, 'VM-1'))
    expect(again.tickets.filter((t) => t.id === 'INC-3410')).toHaveLength(1)
    // Grace's voicemail is the open outage: linked, and noted on that ticket.
    const linked = talk(again, (s) => linkVoicemail(s, 'VM-1', 'INC-3401'))
    expect(ticket(linked, 'INC-3401')!.activity.at(-1)).toMatchObject({
      kind: 'contact',
      text: 'Voicemail from Grace Mensah linked to this ticket.',
    })
    expect(comms(linked).voicemails.find((v) => v.id === 'VM-1')).toMatchObject({
      handled: true,
      ticket: 'INC-3401',
    })
  })
})

describe('support calls and the communication assessment', () => {
  it('a good call scores full marks, with what went well', () => {
    const c = call(fresh(), 'CALL-1', [0, 0, 0, 0])
    const ben = comms(c).calls.find((x) => x.id === 'CALL-1')!
    expect(ben.state).toBe('ended')
    expect(ben.transcript.at(-1)).toEqual({
      who: 'caller',
      text: 'Great, thanks very much. Bye!',
    })
    const a = assessCall(ben)
    expect(a.score).toBe(100)
    expect(a.improvements).toEqual([])
    expect(a.strengths[0]).toContain('acknowledged his frustration')
  })

  it('a poor call scores low, and says what to improve', () => {
    const c = call(fresh(), 'CALL-1', [1, 1, 1, 1, 1])
    const a = assessCall(comms(c).calls.find((x) => x.id === 'CALL-1')!)
    expect(a.score).toBeLessThan(30)
    expect(a.improvements).toContain(
      'Blaming the caller is never professional, even when a problem is hard to find.',
    )
  })

  it('recovering from a slip scores in between', () => {
    const c = call(fresh(), 'CALL-1', [1, 0, 0, 0, 0])
    const score = assessCall(comms(c).calls.find((x) => x.id === 'CALL-1')!).score
    expect(score).toBeGreaterThan(50)
    expect(score).toBeLessThan(100)
  })

  it('an unfinished call scores nothing', () => {
    const c = talk(fresh(), (s) => answerCall(s, 'CALL-2'))
    expect(assessCall(comms(c).calls.find((x) => x.id === 'CALL-2')!).score).toBe(0)
  })
})

describe('a call to a ticket to a fix to a thank you', () => {
  it('the call opens a ticket tied to the PC; fixing it resolves the ticket, and Ben writes', () => {
    let c = call(fresh(), 'CALL-1', [0, 0, 0, 0])
    c = talk(c, (s) => ticketFromCall(s, 'CALL-1'))
    const ben = ticket(c, 'INC-3411')!
    expect(ben.conditions).toEqual([
      { type: 'app-working', device: 'DT-0181', app: 'Office Suite' },
    ])
    expect(ben.requester).toBe('admin')
    expect(evaluateTicket(ben, c.environment).fixed).toBe(false)
    c = fix(c, (s) => connect(s, 'DT-0181'))
    c = fix(c, (s) => repairApp(s, 'DT-0181', 'Office Suite'))
    expect(ticket(c, 'INC-3411')!.status).toBe('resolved')
    const dm = comms(c).messages.filter((m) => m.channel === 'dm-admin')
    expect(dm).toHaveLength(1)
    expect(dm[0]).toMatchObject({ from: 'admin', ticket: 'INC-3411', read: false })
    expect(comms(c).channels.find((x) => x.id === 'dm-admin')).toMatchObject({
      kind: 'direct',
      person: 'admin',
    })
  })
})

describe('grading and saving', () => {
  const grade = (c: TicketsContent) => [
    ...gradeTickets(task, c),
    ...gradeEnvironment(task, c),
  ]

  it('gives the model answer full marks, out of 100', () => {
    const results = grade(applyTicketSolution(task, fresh()))
    expect(results.filter((r) => r.status !== 'passed')).toEqual([])
    expect(results.reduce((sum, r) => sum + r.points, 0)).toBe(100)
  })

  it('marks a duplicate ticket for a known problem as wrong routing', () => {
    let c = talk(fresh(), (s) => listen(s, 'VM-1'))
    c = talk(c, (s) => ticketFromVoicemail(s, 'VM-1'))
    const routed = grade(c).find((r) => r.id === 'vm-grace')!
    expect(routed.status).toBe('failed')
    expect(routed.problems[0]).toContain('opening a duplicate')
  })

  it('keeps the conversations with the queue; older queues load', () => {
    let c = call(fresh(), 'CALL-2', [0, 0])
    c = talk(c, (s) => sendMessage(s, 'it', 'Hello'))
    expect(TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))).toEqual(c)
    const old = buildQueueContent(getAssignment('wifi-outage')!, 1)
    expect(
      TicketsContentSchema.parse(JSON.parse(JSON.stringify(old))).environment!.comms,
    ).toBeUndefined()
  })
})
