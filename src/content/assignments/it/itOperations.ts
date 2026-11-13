import type { AssignmentInput } from '../../schemas'
import { companyItops, DOMAIN, message } from '../../../tools/itops/data'
import {
  assignLicence,
  checkOut,
  confirmAddress,
  deleteRule,
  deliverDue,
  enableArchive,
  rebootNode,
  reclaimLicence,
  registerAsset,
  releaseMessage,
  removeBlocked,
  restartNodeService,
  ship,
} from '../../../tools/itops/model'
import { completeBuild, must } from '../../../tools/itops/scenarios'
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
} from '../../../tools/itops/repair'
import type { ItopsState } from '../../../tools/itops/schema'
import { IT_CATEGORIES, WRITING_GUIDE } from './knowledge'

/**
 * Two IT Operations tasks (Service Desk Analyst), worked in the Help Desk's
 * Tools menu on the company's shared estate:
 *
 * - "The server room and the mail system": one broken floor reported twice,
 *   a stopped print service, a full mailbox, mail held by the filter (and a
 *   look-alike that must stay held), a partner blocked by an old clean-up,
 *   and a break-in forwarding rule.
 * - "A dead laptop, a new supervisor and a parcel": build computers on the
 *   bench (both methods), register them, hand one over in the office, ship
 *   one to someone at home with a return label, free a licence seat from a
 *   leaver, and send a headset.
 */

const mail = (name: string) => `${name}@${DOMAIN}`

// ---------------------------------------------------------------------------
// Task 1: the server room and the mail system
// ---------------------------------------------------------------------------

function morningStart(): ItopsState {
  const base = companyItops()
  const owen = mail('owen.price')
  const grace = mail('grace.mensah')
  const nina = mail('nina.petrova')
  const marcus = mail('marcus.webb')
  return {
    ...base,
    nodes: base.nodes.map((n) =>
      n.id === 'SW-F2'
        ? { ...n, status: 'down', fault: 'hung' }
        : n.id === 'PRINT01'
          ? {
              ...n,
              services: n.services.map((s) => ({ ...s, state: 'stopped' as const })),
            }
          : n,
    ),
    mailboxes: base.mailboxes.map((m) =>
      m.address === owen
        ? { ...m, usedGb: 10.04, oldMailGb: 3.8 }
        : m.address === marcus
          ? {
              ...m,
              rules: [
                {
                  id: 'r-news',
                  name: 'Newsletters',
                  condition: 'Subject contains “newsletter”',
                  action: 'Move to the folder Reading',
                  enabled: true,
                  forwardsOutside: false,
                },
                {
                  id: 'r-fwd',
                  name: '.',
                  condition: 'Apply to all incoming messages',
                  action:
                    'Forward to m.webb.exec@freemail.example and delete the original',
                  enabled: true,
                  forwardsOutside: true,
                },
              ],
            }
          : m,
    ),
    messages: [
      ...base.messages,
      message({
        at: '2026-11-12 15:20 UTC',
        hoursAgo: 18,
        from: 'accounts@northwind-supplies.example',
        to: owen,
        subject: 'Invoice 88412',
        status: 'failed',
        code: '552 5.2.2 Mailbox full',
        scl: 1,
        verdict: 'clean',
      }),
      message({
        at: '2026-11-13 08:05 UTC',
        hoursAgo: 1,
        from: 'accounts@northwind-supplies.example',
        to: owen,
        subject: 'Invoice 88412 (resent)',
        status: 'pending',
        code: '452 4.2.2 Mailbox full, will retry',
        scl: 1,
        verdict: 'clean',
      }),
      message({
        at: '2026-11-13 07:41 UTC',
        hoursAgo: 2,
        from: 'm.fischer@harlow-audit.example',
        to: grace,
        subject: 'Audit fieldwork: document request',
        status: 'quarantined',
        scl: 6,
        verdict: 'clean',
      }),
      message({
        at: '2026-11-13 07:55 UTC',
        hoursAgo: 2,
        from: 'm.fischer@harl0w-audit.example',
        to: grace,
        subject: 'URGENT: confirm your mailbox password for the audit portal',
        status: 'quarantined',
        scl: 8,
        verdict: 'phishing',
      }),
      message({
        at: '2026-11-12 16:02 UTC',
        hoursAgo: 17,
        from: 'studio@brightloop-studio.example',
        to: nina,
        subject: 'Spring campaign artwork, round 2',
        status: 'failed',
        code: '550 5.7.1 Message rejected by policy',
        scl: 1,
        verdict: 'clean',
      }),
    ],
    blocked: [
      ...base.blocked,
      {
        address: 'brightloop-studio.example',
        reason: 'manual',
        note: 'Added in the 2025 newsletter clean-up.',
        added: '2025-06-18',
      },
    ],
  }
}

const morning = morningStart()
const AUDIT = morning.messages.find((m) => m.subject.startsWith('Audit fieldwork'))!.id
const RESENT = morning.messages.find((m) => m.subject.endsWith('(resent)'))!.id

function morningSolution(): ItopsState {
  let s = morning
  s = must(rebootNode(s, 'SW-F2'))
  s = must(restartNodeService(s, 'PRINT01', 'Print Spooler'))
  s = must(enableArchive(s, mail('owen.price')))
  s = must(releaseMessage(s, AUDIT))
  s = must(removeBlocked(s, 'brightloop-studio.example'))
  s = must(deleteRule(s, mail('marcus.webb'), 'r-fwd'))
  return s
}

export const serverRoomMail: AssignmentInput = {
  id: 'server-room-mail',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-analyst',
  order: 11,
  kind: 'tickets',
  title: 'The server room and the mail system',
  summary:
    'A dead floor, a stopped print service and five mail problems, fixed in the Server Room, Mail Admin and Mail Security.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'The Tools menu, for real',
    body: `Hi {name},

Seven tickets this morning, and none of them are about one person’s laptop. They live in the company’s own systems, which you now look after from the **Tools** in the Help Desk sidebar:

- **Server Room**: the network equipment and servers. Look at the overview before anything else.
- **Mail Admin**: message trace, mailbox storage and archive, inbox rules.
- **Mail Security**: the filter’s quarantine and the blocked senders.

Two of these tickets are one problem. One message in quarantine must stay there. Restart only what is broken: a healthy switch or server you restart takes everyone below it down with it.

Ravi`,
  },
  whyItMatters:
    'Telling one broken laptop from one broken floor is the judgement that gets service desk people trusted with infrastructure. Mail is the other half of the job: most “I never got it” tickets are answered by a message trace in two minutes.',
  objectives: [
    'Check the infrastructure first when several people report the same thing',
    'Restart the broken equipment or service, and nothing healthy',
    'Use a message trace to find why mail did not arrive',
    'Release genuine mail from quarantine and leave the dangerous look-alike held',
    'Recognise and remove a break-in forwarding rule',
  ],
  steps: [
    {
      id: 'overview',
      title: 'Look at the Server Room',
      instructions:
        'Open **Server Room** in the Tools. What is not responding, and which zone is it in? Compare it with the Floor 2 tickets.',
    },
    {
      id: 'fix-infra',
      title: 'Fix the floor and the printing',
      instructions:
        'Reboot the broken switch. For printing, look at **Servers**: start the stopped service rather than restarting the whole server.',
      hint: 'SW-F2 is hung. PRINT01’s Print Spooler is stopped.',
    },
    {
      id: 'trace',
      title: 'Trace the missing mail',
      instructions:
        'In **Mail Admin**, run a **Message Trace** for Owen, Grace and Nina. The status column says why each message did not arrive: a full mailbox, the filter, or a blocked sender.',
    },
    {
      id: 'mail-fix',
      title: 'Fix each cause',
      instructions:
        'Owen’s mailbox: **Mailbox Admin**, enable the archive. Grace: **Mail Security**, read the senders carefully before releasing anything. Nina: the agency is on the blocked list; look at why.',
      hint: 'Two messages claim to be from the auditor. One domain has a zero instead of an o.',
    },
    {
      id: 'marcus',
      title: 'Marcus’s mailbox',
      instructions:
        'Open **Inbox Rules** for Marcus. A rule that applies to everything and forwards outside the company is the shape of a break-in.',
    },
    {
      id: 'finish',
      title: 'Reply and hand in',
      instructions:
        'Reply to Owen and to Marcus with what was wrong and what you did, then click **Submit to {manager}**.',
    },
  ],
  queue: {
    title: 'Service desk: infrastructure and mail',
    categories: IT_CATEGORIES,
    knowledge: [
      {
        title: 'One laptop or one floor',
        body: 'When two people on the same floor report the same symptom, check the Server Room overview before touching either computer. Find the lowest box in the topology that sits above everyone affected.',
      },
      {
        title: 'Reading a message trace',
        body: '552 5.2.2: the mailbox is full. 452 4.2.2: full, the sender’s server will retry. 550 5.7.1: rejected by policy (a block). Quarantined with an SCL: held by the filter. Delivered: it reached the mailbox; look in the user’s folders and rules.',
      },
      WRITING_GUIDE,
    ],
    tickets: [
      {
        id: 'INC-4101',
        from: 'Dana Kowalski',
        department: 'Operations',
        received: '08:58',
        subject: 'Floor 2: no network at all',
        body: 'Nothing works on my PC: no email, no shared drive, no internet. The people around me say the same. Floor 2.',
        requester: 'coordinator',
        conditions: [{ type: 'node-up', node: 'SW-F2' }],
        impact: { service: 'Floor 2 network', people: 80, deadline: '' },
      },
      {
        id: 'INC-4102',
        from: 'Ben Carter',
        department: 'Operations',
        received: '09:00',
        subject: 'My PC lost the network',
        body: 'My PC suddenly can’t reach anything. I’ve restarted it twice. Can someone look at my network cable?',
        requester: 'admin',
        conditions: [{ type: 'node-up', node: 'SW-F2' }],
      },
      {
        id: 'INC-4103',
        from: 'Leila Haddad',
        department: 'Finance',
        received: '09:02',
        subject: 'Can’t print the payslips',
        body: 'Every printer says it is offline or the job just disappears. Payslips have to go out today.',
        requester: 'backM',
        conditions: [{ type: 'node-service', node: 'PRINT01', service: 'Print Spooler' }],
        impact: {
          service: 'All shared printers',
          people: 160,
          deadline: 'Payslips today',
        },
      },
      {
        id: 'INC-4104',
        from: 'Owen Price',
        department: 'Finance',
        received: '09:05',
        subject: 'Supplier says my email bounces',
        body: 'Northwind Supplies say their invoice emails to me bounce back. I need invoice 88412 today.',
        requester: 'backR',
        conditions: [
          { type: 'mailbox-receiving', mailbox: mail('owen.price') },
          { type: 'message-delivered', message: RESENT },
        ],
      },
      {
        id: 'INC-4105',
        from: 'Grace Mensah',
        department: 'Finance',
        received: '09:07',
        subject: 'Auditor’s email never arrived',
        body: 'Our auditor, Mara Fischer at Harlow Audit, says she sent me a document request this morning. I can’t find it anywhere.',
        requester: 'backL',
        conditions: [{ type: 'message-delivered', message: AUDIT }],
      },
      {
        id: 'INC-4106',
        from: 'Nina Petrova',
        department: 'Marketing',
        received: '09:10',
        subject: 'Our design agency can’t email us',
        body: 'Brightloop Studio say every email to me comes back “rejected by policy” since yesterday. We have used them for two years.',
        conditions: [
          { type: 'sender-allowed', sender: 'studio@brightloop-studio.example' },
        ],
      },
      {
        id: 'INC-4107',
        from: 'Marcus Webb',
        department: 'Executive',
        received: '09:12',
        subject: 'Emails to me seem to vanish',
        body: 'Several people say they emailed me yesterday and I have nothing from them. My inbox is oddly quiet. Is something wrong with my mailbox?',
        conditions: [
          { type: 'rule-removed', mailbox: mail('marcus.webb'), rule: 'r-fwd' },
        ],
        impact: {
          service: 'Executive mailbox',
          people: 1,
          deadline: 'Possible data leak',
        },
      },
    ],
    environment: {
      itops: {
        start: morning,
        solution: morningSolution(),
        checks: [
          {
            id: 'no-risk',
            type: 'no-risk',
            title: 'Nothing healthy restarted, nothing dangerous released',
            points: 15,
            why: 'Restarting healthy equipment cuts people off; releasing phishing hands it to the user.',
            hint: 'Reboot only what is not responding; start a stopped service instead of rebooting its server; read the sender before releasing.',
          },
          {
            id: 'look-alike-held',
            type: 'action',
            action: 'Release',
            target: morning.messages.find((m) => m.verdict === 'phishing')!.id,
            absent: true,
            title: 'The look-alike stayed in quarantine',
            points: 5,
            why: 'harl0w-audit.example is not the auditor: a zero instead of an o.',
            hint: 'Compare the two sender domains letter by letter.',
          },
        ],
      },
    },
  },
  ticketSolution: Object.fromEntries(
    [
      'INC-4101',
      'INC-4102',
      'INC-4103',
      'INC-4104',
      'INC-4105',
      'INC-4106',
      'INC-4107',
    ].map((id) => [id, { status: 'resolved' as const }]),
  ),
  ticketChecks: [
    ...(
      [
        [
          'floor2-fixed',
          'INC-4101',
          10,
          'Floor 2 is back',
          'The hung access switch was restarted.',
        ],
        [
          'ben-fixed',
          'INC-4102',
          5,
          'Ben’s “cable” was the floor switch',
          'Same cause as Dana’s ticket.',
        ],
        [
          'print-fixed',
          'INC-4103',
          10,
          'Printing works again',
          'The Print Spooler on PRINT01 runs.',
        ],
        [
          'owen-fixed',
          'INC-4104',
          10,
          'Owen receives mail and has the invoice',
          'The archive freed space and the retry delivered it.',
        ],
        [
          'grace-fixed',
          'INC-4105',
          10,
          'The auditor’s real email reached Grace',
          'A genuine message held by the filter.',
        ],
        [
          'nina-fixed',
          'INC-4106',
          5,
          'The agency can email again',
          'An old manual block removed.',
        ],
        [
          'marcus-fixed',
          'INC-4107',
          10,
          'The forwarding rule is gone',
          'Mail is no longer sent outside and deleted.',
        ],
      ] as const
    ).map(([id, ticket, points, title, why]) => ({
      id,
      type: 'fixed' as const,
      ticket,
      points,
      title,
      why,
      hint: 'Use the Tools in the Help Desk sidebar.',
    })),
    {
      id: 'owen-reply',
      type: 'reply',
      ticket: 'INC-4104',
      mentions: [['full', 'quota', 'storage', 'space'], ['archive']],
      minWords: 20,
      title: 'Owen knows why it bounced',
      points: 5,
      why: 'He will see the archive folder appear; tell him why.',
      hint: 'His mailbox was full; older mail moved to the online archive.',
    },
    {
      id: 'marcus-reply',
      type: 'reply',
      ticket: 'INC-4107',
      mentions: [
        ['rule', 'forward'],
        ['password', 'security', 'sign-in', 'reset'],
      ],
      minWords: 25,
      title: 'Marcus knows it was a break-in sign',
      points: 5,
      why: 'Someone created that rule: his password and sign-ins need checking too.',
      hint: 'Explain the forwarding rule and that his password should be reset and his sign-ins reviewed.',
    },
  ],
  passScore: 70,
  xp: 170,
  skills: { troubleshooting: 45, 'incident-management': 30, 'access-control': 10 },
  feedback: {
    excellent: `Hi {name},

That is how infrastructure work is done: the floor switch found from the overview, the spooler started instead of the print server rebooted, the auditor’s mail released and the look-alike left where it was, and Marcus’s forwarding rule caught. Nicely done.

Ravi`,
    good: `Hi {name},

Good work. A detail or two to tidy up: see the notes.

Ravi`,
    pass: `Hi {name},

Some of these are still broken. The tickets say what the systems show.

Ravi`,
    fail: `Hi {name},

Let’s go through it together. Start in the Server Room overview, then a message trace for each mail ticket.

Ravi`,
  },
}

// ---------------------------------------------------------------------------
// Task 2: hardware: builds, the register, shipping and licences
// ---------------------------------------------------------------------------

function hardwareStart(): ItopsState {
  const base = companyItops()
  return {
    ...base,
    assets: base.assets.map((a) =>
      a.tag === 'A-1007'
        ? {
            ...a,
            status: 'broken',
            assignedTo: null,
            notes:
              'Rosa Delgado’s laptop: no power at all. Comes back with the replacement’s return label.',
          }
        : a.tag === 'A-1003'
          ? { ...a, hwFault: 'ram' as const }
          : a,
    ),
    licences: base.licences.map((l) =>
      l.product === 'DesignPro' ? { ...l, assigned: ['nina.petrova', 'kai.morgan'] } : l,
    ),
  }
}

const hardware = hardwareStart()

function hardwareSolution(): ItopsState {
  let s = completeBuild(hardware, 'imaging', 'laptop') // A-1100 for Rosa
  s = completeBuild(s, 'manual', 'desktop') // A-1101 for Sam
  s = must(registerAsset(s, 'A-1100'))
  s = must(registerAsset(s, 'A-1101'))
  s = must(checkOut(s, 'A-1101', 'sam.reyes'))
  s = must(confirmAddress(s, 'rosa.delgado', '09:20'))
  const rosa = s.people.find((p) => p.id === 'rosa.delgado')!
  s = must(
    ship(
      s,
      {
        to: rosa.id,
        address: rosa.address!,
        items: ['computer'],
        unit: 'A-1100',
        speed: 'priority',
        returnLabel: true,
        returnTo: 'it',
        reference: 'INC-4201',
      },
      0,
    ),
  )
  s = must(confirmAddress(s, 'tom.okafor', '09:25'))
  const tom = s.people.find((p) => p.id === 'tom.okafor')!
  s = must(
    ship(
      s,
      {
        to: tom.id,
        address: tom.address!,
        items: ['headset'],
        unit: null,
        speed: 'express',
        returnLabel: false,
        returnTo: null,
        reference: 'INC-4204',
      },
      0,
    ),
  )
  s = deliverDue(s, 60_000)
  s = must(reclaimLicence(s, 'DesignPro', 'kai.morgan'))
  s = must(assignLicence(s, 'DesignPro', 'arjun.mehta'))
  // Dana's laptop: test, open safely, swap the memory, close up, prove it.
  s = must(bookIn(s, 'A-1003'))
  s = must(runTest(s, 'A-1003', 'power'))
  for (let i = 0; i < SCREWS; i++) s = must(toggleScrew(s, 'A-1003', i))
  s = must(setCover(s, 'A-1003', true))
  s = must(setBattery(s, 'A-1003', false))
  s = must(removePart(s, 'A-1003', 'ram'))
  s = must(installPart(s, 'A-1003', 'ram-ddr5'))
  s = must(setBattery(s, 'A-1003', true))
  s = must(setCover(s, 'A-1003', false))
  for (let i = 0; i < SCREWS; i++) s = must(toggleScrew(s, 'A-1003', i))
  s = must(runTest(s, 'A-1003', 'power'))
  s = must(finishRepair(s, 'A-1003'))
  return s
}

export const hardwareLogistics: AssignmentInput = {
  id: 'hardware-logistics',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-analyst',
  order: 12,
  kind: 'tickets',
  title: 'A dead laptop, a new supervisor and a parcel',
  summary:
    'Build computers on the bench, register them, hand one over, ship one to someone at home, free a licence and send a headset.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Hardware day',
    body: `Hi {name},

Five hardware tickets. The machines don’t exist yet: you build them.

- **Computer Deployment** (Tools, Infrastructure): build on the bench. The SOP says which build each department gets, and has the passwords and the naming rule. Try it with hints off.
- **PC Shelf**: where finished builds wait.
- **Asset Management**: register new units before they go out, and keep the register honest. Licences are in there too.
- **Ship Manager**: for people who work from home. Ask them where to send it, and a computer always goes with a return label for the old one.

- **Repair Bench**: Dana left her laptop at the desk. Repair it like the real thing, safely.

Rosa works from home in Customer Support. Sam starts supervising the warehouse dock on Monday.

Ravi`,
  },
  whyItMatters:
    'Getting the right machine, built the right way, to the right person, with the register telling the truth at every step, is a large part of real service desk work, and the part auditors check.',
  objectives: [
    'Build a computer by network imaging and by hand, working from the SOP',
    'Choose the build each department needs',
    'Register new stock and keep status and holder in step',
    'Ship to a remote worker at their confirmed address, with a return label',
    'Free a licence seat held by a leaver before assigning it',
  ],
  steps: [
    {
      id: 'sop',
      title: 'Read the SOP',
      instructions:
        'Open **Computer Deployment** and check the build SOP: which build does Customer Support get, and which does the warehouse get?',
    },
    {
      id: 'builds',
      title: 'Build the two computers',
      instructions:
        'A laptop for Rosa and a desktop for Sam, each with the right method. If the network boot does not answer, look at the deployment server in the Server Room.',
      hint: 'Rosa: Server Imaging. Sam (Warehouse): Manual Domain Enrollment.',
    },
    {
      id: 'register',
      title: 'Register and hand over',
      instructions:
        'In **Asset Management**, register both units (**New asset**), then check Sam’s out to him: he is in the office.',
    },
    {
      id: 'ship',
      title: 'Ship Rosa’s laptop and Tom’s headset',
      instructions:
        'In **Ship Manager**, confirm each address with the person first: the address on file can be out of date. Reference the ticket. Rosa’s laptop needs a return label for the dead one.',
    },
    {
      id: 'licence',
      title: 'Arjun’s licence',
      instructions:
        'DesignPro has no free seats. Who holds them? Someone who has left should not.',
    },
    {
      id: 'repair',
      title: 'Dana’s laptop on the Repair Bench',
      instructions:
        'Book A-1003 in on the **Repair Bench** and test it: the symptoms name the part. Undo the screws, lift the cover, **disconnect the battery** before touching anything, fit the right replacement, close it up and prove it boots.',
      hint: 'Three beeps and no picture is the memory. The laptop takes DDR5 SO-DIMM.',
    },
    {
      id: 'finish',
      title: 'Reply and hand in',
      instructions:
        'Reply to Rosa with what is coming and what to do with the old laptop, then click **Submit to {manager}**.',
    },
  ],
  queue: {
    title: 'Service desk: hardware and logistics',
    categories: IT_CATEGORIES,
    knowledge: [
      {
        title: 'Shipping to remote staff',
        body: 'Confirm the delivery address with the person, in the ticket, every time. Put the ticket number in the reference. A computer goes with a prepaid return label so the old one comes back. The ticket is done when the person confirms it works.',
      },
      WRITING_GUIDE,
    ],
    tickets: [
      {
        id: 'INC-4201',
        from: 'Rosa Delgado',
        department: 'Customer Support',
        received: '08:50',
        subject: 'Laptop dead: no power at all',
        body: 'My work laptop won’t turn on at all, not even a light, with the charger in. I work from home and I’m on the phones from 1pm. What do I do?',
        conditions: [
          { type: 'has-computer', user: 'rosa.delgado', build: 'imaging' },
          { type: 'delivered', user: 'rosa.delgado', item: 'computer' },
        ],
        impact: {
          service: 'Customer Support phones',
          people: 1,
          deadline: 'On shift at 13:00',
        },
      },
      {
        id: 'INC-4202',
        from: 'Sam Reyes',
        department: 'Warehouse',
        received: '08:55',
        subject: 'PC for my new supervisor role',
        body: 'I’m taking over as shift supervisor at the loading dock from Monday and need my own PC there; the kiosk is for sign-ins. I’m in the building today.',
        conditions: [{ type: 'has-computer', user: 'sam.reyes', build: 'manual' }],
      },
      {
        id: 'INC-4203',
        from: 'Arjun Mehta',
        department: 'Data & Insights',
        received: '09:00',
        subject: 'Need DesignPro for the annual report',
        body: 'My manager approved DesignPro for me for the annual report charts. Could I have a licence?',
        requester: 'analyst',
        conditions: [
          { type: 'licence-assigned', user: 'arjun.mehta', product: 'DesignPro' },
        ],
      },
      {
        id: 'INC-4204',
        from: 'Tom Okafor',
        department: 'Customer Support',
        received: '09:04',
        subject: 'Headset broken',
        body: 'The microphone on my headset stopped working. Customers can’t hear me. I’m at home all week.',
        conditions: [{ type: 'delivered', user: 'tom.okafor', item: 'headset' }],
      },
      {
        id: 'INC-4205',
        from: 'Dana Kowalski',
        department: 'Operations',
        received: '09:09',
        subject: 'Laptop beeps and shows nothing',
        body: 'When I switch my laptop on (A-1003) the lights come on and it beeps three times, over and over, but the screen stays black. I’ve left it at the service desk.',
        requester: 'coordinator',
        conditions: [{ type: 'hardware-ok', tag: 'A-1003' }],
      },
    ],
    environment: {
      itops: {
        start: hardware,
        solution: hardwareSolution(),
        checks: [
          {
            id: 'imaging-build',
            type: 'built',
            build: 'imaging',
            maxMistakes: 2,
            title: 'A clean Server Imaging build',
            points: 10,
            why: 'Working from the SOP gets it right first time.',
            hint: 'F12 at the logo, network boot on IPv4, the service account password, the standard sequence, the name by the convention.',
          },
          {
            id: 'manual-build',
            type: 'built',
            build: 'manual',
            maxMistakes: 2,
            title: 'A clean Manual Domain Enrollment build',
            points: 10,
            why: 'Every screen of a hand build is in the SOP.',
            hint: 'Shift+F10 for the local account, a strong local admin password, the domain join account, baseline apps from the portal.',
          },
          {
            id: 'register',
            type: 'register-consistent',
            title: 'The register tells the truth',
            points: 10,
            why: 'Status and holder must agree, or the next technician goes to an empty shelf.',
            hint: 'Asset Management shows record problems at the top.',
          },
          {
            id: 'no-risk',
            type: 'no-risk',
            title: 'Nothing risky done',
            points: 5,
            why: 'Hardware work should not disturb anyone else.',
            hint: 'There is no need to restart anything in the Server Room unless the deployment server is down.',
          },
        ],
      },
    },
  },
  ticketSolution: Object.fromEntries(
    ['INC-4201', 'INC-4202', 'INC-4203', 'INC-4204', 'INC-4205'].map((id) => [
      id,
      { status: 'resolved' as const },
    ]),
  ),
  ticketChecks: [
    ...(
      [
        [
          'rosa-fixed',
          'INC-4201',
          15,
          'Rosa has a working imaged laptop',
          'Built, registered and delivered to her real address.',
        ],
        [
          'sam-fixed',
          'INC-4202',
          10,
          'Sam has a hand-built PC',
          'The warehouse gets the manual build.',
        ],
        [
          'arjun-fixed',
          'INC-4203',
          10,
          'Arjun has DesignPro',
          'The seat came back from a leaver.',
        ],
        [
          'tom-fixed',
          'INC-4204',
          5,
          'Tom’s headset arrived',
          'Peripherals ship too; no return label needed.',
        ],
        [
          'dana-fixed',
          'INC-4205',
          10,
          'Dana’s laptop works again',
          'Beep code 3 is memory: the module was replaced with the right one.',
        ],
      ] as const
    ).map(([id, ticket, points, title, why]) => ({
      id,
      type: 'fixed' as const,
      ticket,
      points,
      title,
      why,
      hint: 'Use the Tools in the Help Desk sidebar.',
    })),
    {
      id: 'rosa-reply',
      type: 'reply',
      ticket: 'INC-4201',
      mentions: [
        ['laptop', 'replacement'],
        ['return', 'label', 'old'],
      ],
      minWords: 25,
      title: 'Rosa knows what to do with the old laptop',
      points: 10,
      why: 'The return leg is the one everybody forgets.',
      hint: 'Tell her the replacement is on its way and to send the old one back with the return label in the box.',
    },
  ],
  passScore: 70,
  xp: 190,
  skills: { troubleshooting: 40, 'customer-service': 25, accuracy: 25 },
  feedback: {
    excellent: `Hi {name},

Two clean builds, the right one for each person, a register that matches the shelf, Rosa’s laptop at her real address with the return label in the box, and a seat back from someone who left. That is a very good hardware day.

Ravi`,
    good: `Hi {name},

Good work. A detail or two to tidy up: see the notes.

Ravi`,
    pass: `Hi {name},

Some of these people are still waiting. The tickets say what is missing.

Ravi`,
    fail: `Hi {name},

Let’s go through it. Start with the SOP in Computer Deployment, then build, register, and send.

Ravi`,
  },
}
