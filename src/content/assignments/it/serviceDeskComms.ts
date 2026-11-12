import type { AssignmentInput } from '../../schemas'
import {
  answerCall,
  linkVoicemail,
  listen,
  sayInCall,
  sendMessage,
  ticketFromCall,
  ticketFromVoicemail,
} from '../../../tools/comms/model'
import {
  CommsStateSchema,
  type CommsInput,
  type CommsState,
} from '../../../tools/comms/schema'
import { companyDevices } from '../../../tools/devices/data'
import { connect, disconnect, repairApp } from '../../../tools/devices/model'
import type { DevicesState } from '../../../tools/devices/schema'
import { IT_CATEGORIES, WRITING_GUIDE } from './knowledge'

/**
 * IT Help Desk (Service Desk Analyst): a morning on the phones. The shared
 * drive is down for Finance, people are asking in chat, two voicemails are
 * waiting and two calls come in. Teaches: routing what comes in (a new
 * ticket, or linking it to the one already open), communicating on a call
 * (questions, plain words, empathy, next steps, closing), keeping a channel
 * informed, and that a call is not a verified request.
 *
 * Everyone here is from the office. Their words are written for the game.
 */
const devices: DevicesState = (() => {
  const base = companyDevices()
  return {
    ...base,
    devices: base.devices.map((d) =>
      d.name === 'DT-0181'
        ? {
            ...d,
            apps: d.apps.map((a) =>
              a.name === 'Office Suite'
                ? { ...a, state: 'crashing' as const, fault: 'corrupt' as const }
                : a,
            ),
            events: [
              ...d.events,
              {
                time: '09:20',
                level: 'error' as const,
                source: 'Application',
                message:
                  'Office Suite stopped working while saving. Faulting module: officecore.dll (file damaged).',
              },
            ],
          }
        : d,
    ),
  }
})()

const comms: CommsInput = {
  channels: [
    {
      id: 'it',
      name: '#it-support',
      kind: 'channel',
      person: '',
      description: 'Ask the service desk',
    },
    {
      id: 'finance',
      name: '#finance',
      kind: 'channel',
      person: '',
      description: 'Finance and Accounting',
    },
    {
      id: 'dm-front2',
      name: 'Carmen Ruiz',
      kind: 'direct',
      person: 'front2',
      description: '',
    },
  ],
  messages: [
    {
      id: 'm1',
      channel: 'finance',
      from: 'backR',
      name: 'Owen Price',
      time: '09:02',
      text: 'Is the finance shared drive down for anyone else? I can’t open the month-end folder.',
      read: false,
      ticket: '',
    },
    {
      id: 'm2',
      channel: 'finance',
      from: 'backM',
      name: 'Leila Haddad',
      time: '09:04',
      text: 'Same here. Has anyone told IT?',
      read: false,
      ticket: '',
    },
    {
      id: 'm3',
      channel: 'dm-front2',
      from: 'front2',
      name: 'Carmen Ruiz',
      time: '09:06',
      text: 'Morning! No rush at all, but my second monitor flickers now and then. I logged a ticket.',
      read: false,
      ticket: 'INC-3402',
    },
  ],
  voicemails: [
    {
      id: 'VM-1',
      from: 'backL',
      name: 'Grace Mensah',
      department: 'Accounting',
      extension: '2470',
      received: '08:58',
      seconds: 24,
      transcript:
        'Hi, it’s Grace in Accounting. The finance shared drive won’t open on my laptop, it just says the location isn’t available. I think Owen has the same. Could someone call me back? Thanks.',
      listened: false,
      handled: false,
      ticket: '',
    },
    {
      id: 'VM-2',
      from: 'coordinator',
      name: 'Dana Kowalski',
      department: 'Operations',
      extension: '2180',
      received: '09:05',
      seconds: 31,
      transcript:
        'Hello, Dana here. The projector in meeting room two shows “no signal” with every laptop we try. The board meets there at two o’clock, so if someone could look at it this morning that would be great.',
      listened: false,
      handled: false,
      ticket: '',
      opens: {
        id: 'INC-3410',
        subject: 'Meeting room 2 projector: no signal',
        body: 'Voicemail from Dana Kowalski (ext 2180): the projector in meeting room 2 shows “no signal” with every laptop. Board meeting there at 14:00.',
      },
    },
  ],
  calls: [
    {
      id: 'CALL-1',
      from: 'admin',
      name: 'Ben Carter',
      department: 'Operations',
      extension: '2181',
      received: '09:22',
      state: 'ringing',
      at: '',
      transcript: [],
      choices: [],
      notes: '',
      ticket: '',
      opens: {
        id: 'INC-3411',
        subject: 'Office Suite crashes when saving (DT-0181)',
        body: 'Call from Ben Carter (ext 2181): the spreadsheet app closes every time he saves the expenses file on DT-0181.',
        requester: 'admin',
        conditions: [{ type: 'app-working', device: 'DT-0181', app: 'Office Suite' }],
      },
      nodes: [
        {
          id: 'start',
          says: 'Hi, is that IT? This is the third time this morning! Every time I save the expenses spreadsheet the whole thing just closes. I’ve lost my work twice.',
          options: [
            {
              text: 'Hi Ben, sorry, that sounds really frustrating, losing work twice. Let’s sort it out. Which computer are you on, and does it happen with every file or just that one?',
              next: 'details',
              qualities: { tone: 1, empathy: 1, questions: 1 },
              note: 'You acknowledged his frustration and asked what you needed to know before suggesting anything.',
            },
            {
              text: 'Have you tried turning it off and on again?',
              next: 'restarted',
              qualities: { questions: -1, empathy: -1 },
              note: 'A stock answer before understanding the problem makes a frustrated caller feel unheard.',
            },
            {
              text: 'It’s probably a corrupted DLL in the Office binaries. I’ll need to remote in and repair the installation.',
              next: 'details',
              qualities: { jargon: -1, questions: -1 },
              note: 'Jumping to a technical diagnosis in jargon, before asking anything, loses the caller.',
            },
          ],
        },
        {
          id: 'restarted',
          says: 'Yes! Twice! It still closes as soon as I save. I really need this done today.',
          options: [
            {
              text: 'Sorry, I should have asked first. Which computer is it, and is it every file or just the expenses one?',
              next: 'details',
              qualities: { tone: 1, empathy: 1, questions: 1 },
              note: 'You recovered well: apologised, then asked the right questions.',
            },
            {
              text: 'Well, it must be something you’re doing then.',
              next: 'details',
              qualities: { tone: -1, empathy: -1 },
              note: 'Blaming the caller is never professional, even when a problem is hard to find.',
            },
          ],
        },
        {
          id: 'details',
          says: 'It’s my desk PC, DT-0181. It happens with any spreadsheet when I save, not just the expenses one.',
          options: [
            {
              text: 'Thanks, that helps. It sounds like the spreadsheet app itself is damaged rather than your file. I can connect to your PC and repair it while you stay on the line, if that’s OK?',
              next: 'plan',
              qualities: { clarity: 1, jargon: 1, updates: 1 },
              note: 'You explained the likely cause in plain words and said what you would do, with his agreement.',
            },
            {
              text: 'OK. I’ll log it and someone will get back to you.',
              next: 'plan',
              qualities: { updates: -1, clarity: -1 },
              note: '“Someone will get back to you” gives no reason and no time: say what happens next and when.',
            },
          ],
        },
        {
          id: 'plan',
          says: 'Fine, yes. How long will it take? And will I lose the file I have open?',
          options: [
            {
              text: 'About ten minutes. Please save what you can to the shared drive first, or close the file without saving, and I’ll connect now. I’ll also put this in a ticket so you have a record.',
              next: 'close',
              qualities: { updates: 1, clarity: 1 },
              note: 'A time, what he should do, and a record: exactly what a caller needs.',
            },
            {
              text: 'Hard to say. It depends what I find.',
              next: 'close',
              qualities: { updates: -1 },
              note: 'Give an estimate and what happens if it takes longer, rather than nothing.',
            },
          ],
        },
        {
          id: 'close',
          says: 'OK, thanks. Anything else I need to do?',
          options: [
            {
              text: 'No, that’s all. I’ll message you as soon as it’s repaired. Thanks for your patience, Ben.',
              next: 'end-good',
              qualities: { closing: 1, tone: 1 },
              note: 'A clear, warm close with the next contact agreed.',
            },
            {
              text: 'No. Bye.',
              next: 'end-cold',
              qualities: { closing: -1 },
              note: 'An abrupt ending undoes a good call: confirm the next step and thank them.',
            },
          ],
        },
        { id: 'end-good', says: 'Great, thanks very much. Bye!', options: [] },
        { id: 'end-cold', says: 'Right… bye then.', options: [] },
      ],
    },
    {
      id: 'CALL-2',
      from: 'analyst',
      name: 'Arjun Mehta',
      department: 'Data & Insights',
      extension: '2162',
      received: '09:31',
      state: 'ringing',
      at: '',
      transcript: [],
      choices: [],
      notes: '',
      ticket: '',
      nodes: [
        {
          id: 'start',
          says: 'Hi, it’s Arjun from Data. Quick one: can you reset my password and read me the new one? I’m about to present and I can’t sign in.',
          options: [
            {
              text: 'Hi Arjun, I can help, but I can’t reset a password from a call alone: I need to verify it’s you first. Can I call you back on your desk extension in two minutes?',
              next: 'verify',
              qualities: { tone: 1, clarity: 1, updates: 1 },
              note: 'Polite and firm: you explained why verification comes first and offered the quickest safe route.',
            },
            {
              text: 'Sure, what do you want it to be?',
              next: 'unsafe',
              qualities: { clarity: -1 },
              note: 'Resetting a password on an unverified call, and reading it out, is exactly how accounts are taken over.',
            },
          ],
        },
        {
          id: 'unsafe',
          says: 'Er… anything, just read it out to me.',
          options: [
            {
              text: 'Actually, sorry, I need to verify you first. I’ll call you back on your desk extension in two minutes.',
              next: 'verify',
              qualities: { tone: 1, updates: 1 },
              note: 'Good that you stopped yourself: verify first, always.',
            },
          ],
        },
        {
          id: 'verify',
          says: 'Oh. I suppose that makes sense. I’m at my desk, go ahead.',
          options: [
            {
              text: 'Thanks for understanding. I’ll call you on 2162 now, and once you’re verified you’ll set your own new password at sign-in, nobody reads it out.',
              next: 'end',
              qualities: { closing: 1, clarity: 1, jargon: 1 },
              note: 'Clear next steps, in plain words, and a safe process explained.',
            },
          ],
        },
        { id: 'end', says: 'Perfect, thanks!', options: [] },
      ],
    },
  ],
  log: [],
}

function devicesSolution(): DevicesState {
  let s = devices
  for (const step of [
    (x: DevicesState) => connect(x, 'DT-0181'),
    (x: DevicesState) => repairApp(x, 'DT-0181', 'Office Suite'),
    (x: DevicesState) => disconnect(x),
  ]) {
    const r = step(s)
    if (r.problems.length) throw new Error(r.problems.join(' '))
    s = r.state
  }
  return s
}

function commsSolution(): CommsState {
  let s: CommsState = CommsStateSchema.parse(comms)
  const run = (r: { state: CommsState; problems: string[] }) => {
    if (r.problems.length) throw new Error(r.problems.join(' '))
    s = r.state
  }
  run(listen(s, 'VM-1'))
  run(linkVoicemail(s, 'VM-1', 'INC-3401'))
  run(listen(s, 'VM-2'))
  run(ticketFromVoicemail(s, 'VM-2'))
  run(answerCall(s, 'CALL-1'))
  for (const option of [0, 0, 0, 0]) run(sayInCall(s, 'CALL-1', option))
  run(ticketFromCall(s, 'CALL-1'))
  run(answerCall(s, 'CALL-2'))
  for (const option of [0, 0]) run(sayInCall(s, 'CALL-2', option))
  run(
    sendMessage(
      s,
      'finance',
      'Hi all, we know the finance shared drive is not opening and we are looking into it now. I will post an update here by 10:00, or sooner when it is back.',
      '09:35',
    ),
  )
  return s
}

export const serviceDeskComms: AssignmentInput = {
  id: 'service-desk-comms',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-analyst',
  order: 10,
  kind: 'tickets',
  title: 'Phones, voicemail and chat',
  summary:
    'A busy morning on the service desk: route voicemail and calls to the right tickets, handle two calls well, and keep Finance informed.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'You’re on the phones this morning',
    body: `Hi {name},

You’re covering the phones and chat this morning. The finance shared drive is down (Jess is on that one: INC-3401), and people are already asking.

In the **Help Desk**, **Communications** has the company chat, our voicemail and the phone. Everything that comes in should end up in the right ticket: link it to the one already open if it’s the same problem, or create a new one.

Two things matter as much as fixing: how you speak to people, and keeping them informed. Let Finance know in their channel that we are on it.

Ravi`,
  },
  whyItMatters:
    'People judge the service desk by how they are treated as much as by the fix. A caller who is listened to, told what happens next, and kept informed stays patient; one who gets jargon or silence does not. And a phone call is not a verified request.',
  objectives: [
    'Route voicemail and calls: link to the open ticket, or create a new one',
    'Handle a frustrated caller: listen, ask, explain in plain words, say what happens next',
    'Refuse an unsafe request politely and explain the safe way',
    'Keep a team informed during an outage',
  ],
  steps: [
    {
      id: 'chat',
      title: 'Read the chat',
      instructions:
        'Open **Communications** in the Help Desk. Read **#finance**: what is affected? Post an update there: that we know, that we are on it, and when you will update them.',
    },
    {
      id: 'voicemail',
      title: 'Voicemail',
      instructions:
        'Listen to each voicemail. Is it the problem already in the queue (link it to that ticket), or something new (create a ticket)?',
    },
    {
      id: 'calls',
      title: 'Two calls',
      instructions:
        'Answer Ben, then Arjun. Choose what you say carefully: you get a communication assessment for each. Keep notes, and record Ben’s call in a new ticket.',
      hint: 'Listen and ask before you suggest anything; plain words; say what happens next.',
    },
    {
      id: 'fix',
      title: 'Fix Ben’s PC',
      instructions:
        'Ben’s ticket is tied to his PC. Repair the app in **Remote Desktop**; the ticket resolves by itself, and Ben will message you.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  queue: {
    title: 'Service desk: phones and chat',
    categories: IT_CATEGORIES,
    knowledge: [
      {
        title: 'On the phone',
        body: `Greet and use their name. Listen, and acknowledge frustration. Ask before you suggest: which computer, since when, every time? Explain in plain words. Say what happens next and when. Close warmly, with the next contact agreed. Write notes as you go.

Never reset a password or change access on an unverified call: call back on the extension on record.`,
      },
      {
        title: 'Updating people during an outage',
        body: `Post where people are asking. Say what is affected, that you are working on it, and when the next update will be. Then keep that promise, even if the update is “still working on it”.`,
      },
      WRITING_GUIDE,
    ],
    tickets: [
      {
        id: 'INC-3401',
        from: 'Owen Price',
        department: 'Finance',
        received: '09:00',
        subject: 'Finance shared drive not opening',
        body: 'The finance shared drive says the location is not available. Month-end files are on it. (Assigned to Jess Taylor.)',
      },
      {
        id: 'INC-3402',
        from: 'Carmen Ruiz',
        department: 'Finance',
        received: '09:06',
        subject: 'Second monitor flickers',
        body: 'My second monitor flickers now and then. Not urgent.',
      },
    ],
    environment: {
      devices: { start: devices, solution: devicesSolution(), checks: [] },
      comms: {
        start: comms,
        solution: commsSolution(),
        checks: [
          {
            id: 'vm-grace',
            type: 'routed',
            item: 'VM-1',
            expect: 'INC-3401',
            title: 'Grace’s voicemail linked to the open ticket',
            points: 10,
            why: 'It is the same outage: linking keeps one ticket and tells Jess who else is affected.',
            hint: 'The shared drive is already INC-3401.',
          },
          {
            id: 'vm-dana',
            type: 'routed',
            item: 'VM-2',
            expect: 'new',
            title: 'Dana’s voicemail became a ticket',
            points: 10,
            why: 'A new problem with a deadline: it needs its own ticket.',
            hint: 'Create a ticket from the voicemail.',
          },
          {
            id: 'call-ben',
            type: 'call',
            call: 'CALL-1',
            minScore: 80,
            title: 'Ben’s call handled well',
            points: 20,
            why: 'Empathy, questions before answers, plain words, next steps, a warm close.',
            hint: 'Acknowledge his frustration, ask which PC and which files, explain simply, say how long.',
          },
          {
            id: 'call-ben-ticket',
            type: 'routed',
            item: 'CALL-1',
            expect: 'new',
            title: 'Ben’s call recorded in a ticket',
            points: 5,
            why: 'Every call ends up in a ticket, so there is a record.',
            hint: 'Create ticket from call.',
          },
          {
            id: 'call-arjun',
            type: 'call',
            call: 'CALL-2',
            minScore: 80,
            title: 'Arjun’s request handled safely and politely',
            points: 20,
            why: 'No password reset on an unverified call, explained without making him feel accused.',
            hint: 'Offer to call him back on his extension on record.',
          },
          {
            id: 'finance-update',
            type: 'chat',
            channel: 'finance',
            mentions: [
              ['shared drive', 'drive', 'file server'],
              ['looking', 'investigating', 'working on', 'aware', 'know'],
              ['update', 'let you know'],
            ],
            minWords: 15,
            title: 'Finance kept informed',
            points: 15,
            why: 'Say what is affected, that you are on it, and when the next update is.',
            hint: 'Post in #finance.',
          },
        ],
      },
    },
  },
  ticketSolution: { 'INC-3411': { status: 'resolved' } },
  ticketChecks: [
    {
      id: 'ben-fixed',
      type: 'fixed',
      ticket: 'INC-3411',
      title: 'Ben can save again',
      points: 20,
      why: 'The app on his PC is repaired: the ticket from his call resolved itself.',
      hint: 'Repair Office Suite on DT-0181 in Remote Desktop.',
    },
  ],
  passScore: 70,
  xp: 150,
  skills: { 'customer-service': 55, 'incident-management': 20, 'access-control': 15 },
  feedback: {
    excellent: `Hi {name},

Great morning on the phones. Ben went from fuming to thanking you, Arjun got a polite no and a safe way, Finance knew what was going on, and nothing was logged twice.

Ravi`,
    good: `Hi {name},

Good work; a couple of things to polish. See the notes.

Ravi`,
    pass: `Hi {name},

The work got done, but how we speak to people matters. Read the call assessments.

Ravi`,
    fail: `Hi {name},

Let’s go through it together: routing first, then how the calls went.

Ravi`,
  },
}
