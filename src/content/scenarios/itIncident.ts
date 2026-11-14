/**
 * IT Help Desk: a major incident at the IT corner. Email is down for the
 * whole company before a board meeting. Declare it, separate the roles,
 * keep people informed on a schedule, resist an untested fix under
 * pressure, confirm the fix with users, and write the review. Standard
 * service management practice, simplified.
 */
import { SMART, SUIT } from './looks'
import type { Scenario } from './types'

const BENCH = { x: 11.3, z: 5.6 }

export const MAJOR_INCIDENT: Scenario = {
  id: 'it-major-incident',
  careerId: 'it-support',
  title: 'Major incident: email is down',
  summary:
    'Email is down for everyone before a board meeting: declare it, organise the response, communicate, and close it properly.',
  workplace: 'office',
  room: 'The IT corner',
  minLevel: 1,
  player: { at: { x: 10.2, z: 4.3 }, faces: BENCH },
  camera: { from: [6.3, 4.0, 1.6], looks: [10.6, 0.8, 4.5] },
  cast: [
    {
      id: 'ravi',
      name: 'Ravi Menon',
      role: 'IT Services Manager',
      look: SMART(4, 'short', 0, '#1e3a8a', { glasses: true }),
      at: { x: 9.45, z: 2.55 },
      faces: { x: 10.2, z: 4.3 },
      personId: 'manager',
    },
    {
      id: 'jess',
      name: 'Jess Taylor',
      role: 'Senior Support Analyst',
      look: SMART(2, 'ponytail', 3, '#0f766e'),
      at: { x: 10.95, z: 3.05 },
      faces: { x: 10.2, z: 4.3 },
      personId: 'senior',
    },
    {
      id: 'ben',
      name: 'Ben Carter',
      role: 'Network and systems engineer',
      look: SMART(1, 'crop', 2, '#0f766e'),
      at: { x: 10.65, z: 2.25 },
      faces: { x: 11.5, z: 2.2 },
    },
    {
      id: 'cfo',
      name: 'Helen Osei',
      role: 'Finance Director',
      look: SUIT(5, 'bob', 0, '#7f1d1d', { tie: undefined }),
      at: { x: 9.6, z: 6.4 },
      faces: { x: 10.2, z: 4.4 },
      moves: [{ from: 'pressure', at: { x: 9.55, z: 5.45 }, faces: { x: 10.2, z: 4.4 } }],
    },
  ],
  exhibits: [
    {
      id: 'status',
      title: 'Email provider status page',
      text: 'Investigating: authentication errors for some customers in Europe since 08:40. Next update 09:30.',
    },
    {
      id: 'tickets',
      title: 'Tickets in the last 20 minutes',
      text: '37 tickets: “Outlook keeps asking for my password”, “can’t send email”. All departments.',
    },
    {
      id: 'change',
      title: 'Change log',
      text: 'No changes to email or sign-in in the last 7 days.',
    },
  ],
  beats: [
    {
      id: 'flood',
      kind: 'say',
      who: 'jess',
      gesture: 'talk',
      text: 'Thirty-seven tickets in twenty minutes: nobody can send email. The board meets at ten.',
    },
    {
      id: 'declare',
      kind: 'choose',
      prompt: 'Everyone is affected. How do you treat it?',
      points: 15,
      options: [
        {
          id: 'major',
          label:
            'Declare a major incident: one master ticket with the others linked, Ravi as incident manager, Ben investigating.',
          score: 1,
          reply: [
            {
              who: 'ravi',
              text: 'Agreed. I’ll run it; Ben, you fix; Jess, the queue.',
              gesture: 'talk',
            },
          ],
          lesson: 'A major incident needs one owner, one master ticket and clear roles.',
        },
        {
          id: 'queue',
          label: 'Work through the tickets one by one.',
          score: 0.1,
          reply: [
            {
              who: 'ravi',
              text: 'With the whole company down? This is a major incident.',
            },
          ],
          lesson:
            'Treating a company-wide outage as separate tickets wastes time and hides the scale.',
        },
      ],
    },
    {
      id: 'cause',
      kind: 'exhibit',
      who: 'ben',
      prompt: 'Ben asks what the evidence says about where the fault is.',
      points: 15,
      items: ['tickets', 'status', 'change'],
      correct: 'status',
      right: [
        {
          who: 'ben',
          text: 'The provider is having an authentication outage. It’s not us.',
          gesture: 'talk',
        },
      ],
      wrong: [
        { who: 'ben', text: 'That tells us who’s affected, not where the fault is.' },
      ],
      lesson:
        'Check the supplier’s status page early: it may be their outage, not yours.',
    },
    {
      id: 'comms',
      kind: 'choose',
      who: 'ravi',
      prompt: 'Ravi: “How do we keep the company informed?”',
      points: 15,
      options: [
        {
          id: 'cadence',
          label:
            'A short message now on Teams and the intranet (email is down): what’s affected, that we’re on it, a workaround, and the next update time; then update every 30 minutes.',
          score: 1,
          reply: [
            {
              who: 'ravi',
              text: 'Good: through channels that work, on a schedule.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Communicate early, through channels that still work, with the time of the next update.',
        },
        {
          id: 'email',
          label: 'Email everyone to say email is down.',
          score: 0,
          reply: [{ who: 'jess', text: 'Email is the thing that’s broken…' }],
          lesson: 'Use a channel that is not affected by the outage.',
        },
        {
          id: 'wait',
          label: 'Wait until it’s fixed, then tell them.',
          score: 0.2,
          reply: [
            { who: 'ravi', text: 'Silence means 300 people ringing us. Tell them now.' },
          ],
          lesson: 'Silence during an outage creates more calls and less trust.',
        },
      ],
    },
    {
      id: 'pressure',
      kind: 'say',
      who: 'cfo',
      gesture: 'present',
      text: 'I need email for the board at ten. Can’t you just reset everyone’s passwords or switch provider settings? Do something!',
    },
    {
      id: 'untested',
      kind: 'choose',
      prompt: 'The fault is at the provider. The Finance Director wants action now.',
      points: 20,
      options: [
        {
          id: 'workaround',
          label:
            'Explain calmly that the fault is the provider’s and untested changes could make it worse; offer a workaround now: the board papers from SharePoint, and Teams for messages.',
          score: 1,
          reply: [
            {
              who: 'cfo',
              text: 'All right. As long as the board gets the papers.',
              gesture: 'talk',
            },
            { who: 'ravi', text: 'Well handled.' },
          ],
          lesson:
            'Under pressure, give a workaround, not an untested change that could make things worse.',
        },
        {
          id: 'reset',
          label: 'Reset everyone’s passwords to look busy.',
          score: 0,
          reply: [
            {
              who: 'ben',
              text: 'That would lock 300 people out when the provider recovers!',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson: 'Changes made to look active can turn one outage into two.',
        },
      ],
    },
    {
      id: 'restored',
      kind: 'say',
      who: 'ben',
      gesture: 'talk',
      text: '09:52: the provider says it’s resolved. My test mailbox is sending again.',
    },
    {
      id: 'confirm',
      kind: 'choose',
      prompt: 'Is the incident over?',
      points: 10,
      options: [
        {
          id: 'confirm-users',
          label:
            'Confirm with a few users in different teams that they can send and receive, then tell the company it’s fixed and resolve the linked tickets.',
          score: 1,
          reply: [
            {
              who: 'jess',
              text: 'Finance and Sales both confirm. Closing the tickets.',
              gesture: 'talk',
            },
          ],
          lesson: 'Confirm the fix with users before declaring the incident over.',
        },
        {
          id: 'close',
          label: 'Close all 37 tickets now.',
          score: 0.3,
          reply: [
            {
              who: 'jess',
              text: 'What if some people still can’t sign in? Let’s check first.',
            },
          ],
          lesson: 'Closing before checking can leave people stuck with closed tickets.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'speak',
      who: 'ravi',
      prompt:
        'Write the major incident summary in your own words: impact, cause, response, and one improvement.',
      points: 25,
      minWords: 35,
      mentions: [
        ['37', 'everyone', 'all departments', 'company'],
        ['provider', 'authentication', 'supplier'],
        ['Teams', 'intranet', 'workaround', 'SharePoint'],
        ['status page', 'improve', 'next time', 'monitor'],
      ],
      model:
        'Major incident 08:40–09:52: email unavailable company-wide (37 tickets, all departments). Cause: the email provider’s authentication outage; no changes on our side. Response: master ticket, Ravi as incident manager, updates every 30 minutes on Teams and the intranet, board papers via SharePoint as a workaround. Improvement: monitor the provider’s status page automatically.',
      good: [
        {
          who: 'ravi',
          text: 'That’s a proper review. Thanks for staying calm.',
          gesture: 'talk',
        },
      ],
      weak: [
        {
          who: 'ravi',
          text: 'Cover the impact, the cause, what we did and one improvement.',
        },
      ],
      lesson: 'A major incident review records impact, cause, response and improvements.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict:
        'Major incident handled: the board got its papers and the company was kept informed',
      feedback: 'Organised, calm and clear. That’s how a major incident should run.',
      effects: { trust: { manager: 3, senior: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Major incident handled',
      feedback: 'Good response. Communication could have started sooner.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Service restored, with confusion along the way',
      feedback:
        'It got fixed, but the company felt left in the dark. Let’s review major incident practice.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Incident taken over by the IT manager',
      feedback:
        'Some actions risked making it worse. Let’s go through the major incident process together.',
      effects: { trust: { manager: -2 }, wellbeing: { stress: 5 } },
    },
  },
  xp: 100,
  skills: { 'incident-management': 30, 'customer-service': 15, troubleshooting: 15 },
}
