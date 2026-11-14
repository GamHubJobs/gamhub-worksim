/**
 * IT Help Desk: at the IT corner, a colleague arrives with a laptop that
 * "won't connect" ten minutes before a client call. The player calms and
 * triages, diagnoses (a self-assigned address means no DHCP), checks the
 * comms cabinet, spots that it is wider than one laptop and raises an
 * incident, refuses to share the admin password, and writes the ticket.
 */
import { SMART } from './looks'
import type { Scenario } from './types'

const BENCH = { x: 11.3, z: 5.6 }

export const DESK_SIDE: Scenario = {
  id: 'it-desk-side',
  careerId: 'it-support',
  title: 'Desk-side support: “nothing works”',
  summary:
    'A colleague with a client call in ten minutes and no network: triage, diagnose, escalate an incident, keep it secure.',
  workplace: 'office',
  room: 'The IT corner',
  minLevel: 1,
  player: { at: { x: 10.2, z: 4.3 }, faces: BENCH },
  camera: { from: [7.4, 3.0, 2.6], looks: [10.8, 1.0, 4.6] },
  cast: [
    {
      id: 'leila',
      name: 'Leila Haddad',
      role: 'Consultant, with her laptop',
      look: SMART(3, 'long', 0, '#7c3aed'),
      at: { x: 9.35, z: 5.3 },
      faces: { x: 10.4, z: 4.6 },
    },
    {
      id: 'ben',
      name: 'Ben Carter',
      role: 'Network engineer',
      look: SMART(1, 'crop', 2, '#0f766e'),
      at: { x: 10.65, z: 2.25 },
      faces: { x: 11.5, z: 2.2 },
      moves: [{ from: 'cabinet', at: { x: 10.65, z: 2.9 }, faces: { x: 10.2, z: 4.3 } }],
    },
    {
      id: 'ravi',
      name: 'Ravi Menon',
      role: 'IT Services Manager',
      look: SMART(4, 'short', 0, '#1e3a8a', { glasses: true }),
      at: { x: 8.7, z: 3.4 },
      faces: { x: 10.2, z: 4.3 },
      personId: 'manager',
    },
  ],
  exhibits: [
    {
      id: 'ipconfig',
      title: 'ipconfig on Leila’s laptop',
      text: 'Wi-Fi: connected to CR-Staff. IPv4 address 169.254.31.7. Default gateway: (none).',
    },
    {
      id: 'switch',
      title: 'Floor 2 switch, port lights',
      text: 'Ports 1–24 link lights off. Uplink to the core: amber. Last config change: 08:55 today (change CHG-118).',
    },
    {
      id: 'battery',
      title: 'Battery report',
      text: 'Design capacity 52 Wh, full charge 48 Wh. Healthy.',
    },
  ],
  beats: [
    {
      id: 'arrive',
      kind: 'say',
      who: 'leila',
      gesture: 'talk',
      text: 'Nothing works! I’ve got a client call in ten minutes and my laptop won’t connect. Please, can you just fix it?',
    },
    {
      id: 'calm',
      kind: 'choose',
      prompt: 'Leila is stressed and in a hurry. How do you start?',
      points: 10,
      options: [
        {
          id: 'triage',
          label:
            'Acknowledge the deadline, offer a quick workaround for the call (join from your phone hotspot), and ask two questions: what exactly fails, and since when?',
          score: 1,
          reply: [
            {
              who: 'leila',
              text: 'Hotspot, good idea. Since about nine: Wi-Fi says connected but no internet. Teams won’t load.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Protect the user’s deadline first, then gather facts with focused questions.',
        },
        {
          id: 'reimage',
          label: '“Leave it with me, I’ll reimage it this afternoon.”',
          score: 0.1,
          reply: [{ who: 'leila', text: 'This afternoon? My call is in ten minutes!' }],
          lesson: 'Jumping to a heavy fix ignores the urgent need and skips diagnosis.',
        },
        {
          id: 'restart',
          label: '“Have you tried turning it off and on again?”',
          score: 0.4,
          reply: [{ who: 'leila', text: 'Twice. Still nothing.' }],
          lesson: 'A restart can help, but ask what is happening first.',
        },
      ],
    },
    {
      id: 'diagnose',
      kind: 'exhibit',
      prompt: 'Which evidence tells you what is wrong with the connection?',
      points: 15,
      items: ['battery', 'ipconfig'],
      correct: 'ipconfig',
      right: [
        {
          who: 'narrator',
          text: 'A 169.254 address and no gateway: the laptop never got an address from DHCP.',
        },
      ],
      wrong: [
        { who: 'leila', text: 'The battery’s fine. It’s the internet that’s broken.' },
      ],
      lesson:
        'An address starting 169.254 is self-assigned: the device could not reach a DHCP server.',
    },
    {
      id: 'others',
      kind: 'say',
      who: 'ravi',
      gesture: 'talk',
      text: 'Three more calls just came in from floor 2: same thing. Connected, no internet.',
    },
    {
      id: 'scope',
      kind: 'choose',
      prompt: 'It is not just Leila’s laptop. What now?',
      points: 15,
      options: [
        {
          id: 'incident',
          label:
            'Treat it as one incident affecting floor 2: raise a P2 with all the reports linked, and check the floor 2 switch in the comms cabinet with Ben.',
          score: 1,
          reply: [
            {
              who: 'ravi',
              text: 'Good. One incident, one owner. Go with Ben.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Several users with the same fault is one incident: link them and look for the shared cause.',
        },
        {
          id: 'one-by-one',
          label: 'Fix each laptop one at a time, starting with Leila’s.',
          score: 0.2,
          reply: [
            {
              who: 'ravi',
              text: 'If it’s the network, you could fix laptops all day and get nowhere.',
            },
          ],
          lesson:
            'Treating a shared fault device by device wastes time and misses the cause.',
        },
      ],
    },
    {
      id: 'cabinet',
      kind: 'say',
      who: 'ben',
      gesture: 'reach',
      text: 'Here’s the floor 2 switch. Have a look at the lights.',
    },
    {
      id: 'cause',
      kind: 'exhibit',
      who: 'ben',
      prompt: 'What does the switch tell you?',
      points: 10,
      items: ['switch', 'ipconfig'],
      correct: 'switch',
      right: [
        {
          who: 'ben',
          text: 'Uplink amber and a config change at 08:55: CHG-118. That change broke it. I’ll roll it back.',
          gesture: 'talk',
        },
        { who: 'narrator', text: 'Ben rolls back the change. The port lights come on.' },
      ],
      wrong: [
        {
          who: 'ben',
          text: 'We know the laptops have no address. Why? Look at the switch.',
        },
      ],
      lesson:
        'Faults after a change are usually the change: check the change record and roll back.',
    },
    {
      id: 'password',
      kind: 'say',
      who: 'leila',
      gesture: 'talk',
      text: 'Thank you! Next time, could you just give me the admin password so I can fix things myself?',
    },
    {
      id: 'secure',
      kind: 'choose',
      prompt: 'Leila asks for the admin password.',
      points: 15,
      options: [
        {
          id: 'refuse',
          label:
            'Refuse kindly: admin rights stay with IT for security; explain how to log a ticket or call for anything urgent.',
          score: 1,
          reply: [{ who: 'leila', text: 'Fair enough. I’ll call you next time.' }],
          effects: { reputation: 1 },
          lesson: 'Never share admin credentials: least privilege protects everyone.',
        },
        {
          id: 'share',
          label: 'Share it: she’s trustworthy and it saves you time.',
          score: 0,
          reply: [
            {
              who: 'ravi',
              text: 'We never share admin passwords. I’ll have to rotate it now.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -3 }, reputation: -2 },
          lesson:
            'Shared admin passwords are a common route for breaches, and break policy.',
        },
      ],
    },
    {
      id: 'update',
      kind: 'choose',
      who: 'ravi',
      prompt: 'Ravi: “How do we let floor 2 know?”',
      points: 5,
      options: [
        {
          id: 'plain',
          label:
            'A short message in plain words: the network on floor 2 is back, the cause was a change, and what to do if anything still fails.',
          score: 1,
          reply: [{ who: 'ravi', text: 'Send it. Clear and short.', gesture: 'talk' }],
          lesson:
            'Users want to know it is fixed and what to do: not the technical detail.',
        },
        {
          id: 'jargon',
          label: 'Explain the DHCP scope and uplink VLAN in detail.',
          score: 0.3,
          reply: [{ who: 'ravi', text: 'They won’t read that. Plain words, please.' }],
          lesson: 'Technical detail belongs in the ticket, not in the message to users.',
        },
      ],
    },
    {
      id: 'meeting-decision',
      kind: 'choose',
      who: 'ravi',
      prompt:
        'Ravi: “The Operations Director wants the high-severity security update on all 118 laptops tonight. What do we recommend at the change board?”',
      points: 15,
      options: [
        {
          id: 'pilot',
          label:
            'Pilot on 10 laptops tomorrow, then the rest in two groups over two days, with rollback ready',
          score: 1,
          reply: [
            {
              who: 'ravi',
              text: 'Good answer. It fixes the flaw within days while limiting the damage if the update causes problems.',
              gesture: 'talk',
            },
          ],
          lesson:
            'It fixes the flaw within days while limiting the damage if the update causes problems.',
        },
        {
          id: 'tonight',
          label: 'Agree: push it to all 118 tonight',
          score: 0,
          reply: [
            {
              who: 'ravi',
              text: 'An untested update to every laptop at once could stop everyone working tomorrow.',
              gesture: 'talk',
            },
          ],
          lesson:
            'An untested update to every laptop at once could stop everyone working tomorrow.',
        },
        {
          id: 'next-month',
          label: 'Wait for next month’s maintenance window',
          score: 0,
          reply: [
            {
              who: 'ravi',
              text: 'A high-severity flaw shouldn’t stay open for a month.',
              gesture: 'talk',
            },
          ],
          lesson: 'A high-severity flaw shouldn’t stay open for a month.',
        },
      ],
    },
    {
      id: 'ticket',
      kind: 'speak',
      who: 'ravi',
      prompt:
        'Write the incident notes for the ticket: symptoms, cause, fix and who was affected.',
      points: 15,
      minWords: 30,
      mentions: [
        ['169.254', 'DHCP', 'no address'],
        ['switch', 'uplink'],
        ['CHG-118', 'change', 'rolled back', 'roll back'],
        ['floor 2', 'four users', 'users'],
      ],
      model:
        'P2 incident, floor 2: from about 09:00 users connected to Wi-Fi had no internet; laptops showed 169.254 addresses (no DHCP). Cause: change CHG-118 at 08:55 on the floor 2 switch uplink. Ben rolled the change back at 10:40; links restored, users confirmed working. Four users affected; reports linked.',
      good: [
        {
          who: 'ravi',
          text: 'That’s a ticket anyone can learn from. Thanks.',
          gesture: 'talk',
        },
      ],
      weak: [
        { who: 'ravi', text: 'Add the cause and the fix: the next person needs them.' },
      ],
      lesson: 'Good incident notes record symptoms, cause, fix and impact.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Floor 2 back online in 40 minutes; Leila made her call',
      feedback:
        'You protected the call, found the cause fast, kept it secure and wrote it up properly.',
      effects: { trust: { manager: 3 }, reputation: 3 },
    },
    good: {
      verdict: 'Floor 2 back online',
      feedback: 'Fixed and recorded. A couple of steps could have been quicker.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Fixed, slowly',
      feedback: 'It got fixed, but floor 2 was down longer than it needed to be.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Escalated to the network team after a long outage',
      feedback: 'Let’s go through incident handling and access control together.',
      effects: { trust: { manager: -2 }, wellbeing: { stress: 5 } },
    },
  },
  xp: 110,
  skills: {
    troubleshooting: 25,
    'incident-management': 20,
    'access-control': 15,
    'customer-service': 10,
  },
  caseLink: {
    caseId: 'mtg-it-cab',
    answers: [
      {
        beat: 'meeting-decision',
        step: 'challenge',
        options: { pilot: 'pilot', tonight: 'tonight', 'next-month': 'next-month' },
      },
    ],
  },
}
