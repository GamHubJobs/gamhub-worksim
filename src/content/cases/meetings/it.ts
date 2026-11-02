/** Meetings cases: it-support. */
import type { CaseInput } from '../schema'
import { replies, people } from './shared'

const itCab: CaseInput = {
  id: 'mtg-it-cab',
  version: 1,
  careerId: 'it-support',
  kind: 'meeting',
  minLevel: 3,
  title: 'Present a change to the change advisory board',
  summary:
    'You want to update every laptop’s VPN software. Write the change request and get it approved.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'network-intranet' },
  deadlineHours: 8,
  meeting: {
    title: 'Change advisory board',
    inHours: 3,
    minutes: 30,
    room: 'Meeting room 1',
  },
  email: {
    subject: 'VPN update: take it to the CAB',
    body: `Hi {name},

The VPN software on our laptops has a security flaw, and the vendor has a fix. It’s your change: write the change request and present it at today’s change advisory board (in about three hours). They’ll want to know the risk, the plan, how we test it and how we roll back.

Ravi`,
  },
  whyItMatters:
    'Changes to systems cause most outages. Change advisory boards exist to make sure every change has a plan, a test, a rollback and the right timing, and presenting one well is a key skill for senior support staff.',
  objectives: [
    'Write a change request',
    'Defend a plan under questioning',
    'Agree actions and owners',
  ],
  evidence: [
    {
      id: 'advisory',
      title: 'Vendor advisory',
      text: 'VPN client 5.2 and earlier: a flaw lets an attacker on the same Wi-Fi network intercept connections. Fixed in 5.3. **Severity: high.**',
    },
    {
      id: 'estate',
      title: 'Our laptops',
      text: '118 laptops on VPN 5.2. Updates can be pushed in groups; a restart is needed.',
    },
  ],
  steps: [
    {
      id: 'request',
      kind: 'document',
      phase: 'prepare',
      title: 'The change request',
      prompt:
        'Write the change request: the reason, the plan, the testing and the rollback.',
      points: 35,
      deliverable: {
        kind: 'doc',
        title: 'Change request: VPN 5.3',
        template: 'report',
        checks: [
          {
            id: 'sections',
            type: 'sections',
            title: 'The sections a CAB expects',
            sections: [
              ['Summary', 'Executive summary', 'Reason'],
              ['Plan', 'Findings'],
              ['Rollback', 'Recommendations'],
            ],
            points: 15,
            why: 'The board needs the reason, the plan and the way back.',
            hint: 'Headings for the reason, the plan and the rollback.',
          },
          {
            id: 'content',
            type: 'mentions',
            title: 'Risk, testing and rollback',
            terms: [
              ['5.3'],
              ['pilot', 'test group', 'testing'],
              ['roll back', 'rollback'],
            ],
            points: 15,
            why: 'Every change needs a test and a way back.',
            hint: 'Mention the version, a pilot group and the rollback.',
          },
          {
            id: 'length',
            type: 'length',
            min: 120,
            max: 700,
            title: 'Length',
            points: 5,
            why: 'Complete but readable.',
            hint: '120 to 700 words.',
          },
        ],
      },
    },
    {
      id: 'challenge',
      kind: 'decide',
      phase: 'meeting',
      title: 'A challenge from the board',
      prompt:
        'The Operations Director says: “Do it all tonight, it’s high severity.” What do you say?',
      points: 25,
      options: [
        {
          id: 'pilot',
          label:
            'Pilot on 10 laptops tomorrow, then the rest in two groups over two days, with rollback ready',
          verdict: 'best',
          why: 'It fixes the flaw within days while limiting the damage if the update causes problems.',
          effects: { indicators: { risk: -4 } },
        },
        {
          id: 'tonight',
          label: 'Agree: push it to all 118 tonight',
          verdict: 'poor',
          why: 'An untested update to every laptop at once could stop everyone working tomorrow.',
          effects: { indicators: { risk: 5 } },
        },
        {
          id: 'next-month',
          label: 'Wait for next month’s maintenance window',
          verdict: 'poor',
          why: 'A high-severity flaw shouldn’t stay open for a month.',
          effects: { indicators: { risk: 6 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action the right owner.',
      points: 25,
      people: people(
        ['me', 'You'],
        ['ravi', 'Ravi Menon'],
        ['comms', 'Internal communications'],
      ),
      items: [
        {
          id: 'pilot',
          label: 'Run the pilot on 10 laptops tomorrow',
          owner: 'me',
          why: 'It is your change.',
        },
        {
          id: 'notice',
          label: 'Tell staff a restart will be needed',
          owner: 'comms',
          why: 'Company-wide notices go through internal communications.',
        },
        {
          id: 'approve',
          label: 'Approve the full roll-out after the pilot',
          owner: 'ravi',
          why: 'The change owner’s manager approves the next stage.',
        },
      ],
    },
    {
      id: 'summary',
      kind: 'reply',
      phase: 'after',
      to: 'The change advisory board',
      title: 'Confirm the plan',
      prompt: 'Confirm what the board approved.',
      points: 15,
      minWords: 35,
      mentions: [['pilot'], ['rollback', 'roll back'], ['5.3']],
      avoid: [],
      model:
        'Thanks all. To confirm: the board approved the VPN 5.3 update with a pilot on 10 laptops tomorrow, then the rest in two groups over the next two days, with the rollback to 5.2 ready at each stage. Internal communications will warn staff about the restart. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -3 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3, indicators: { risk: 4 } },
  },
  replies: replies(
    'Ravi',
    'The CAB approved it first time, and the pilot went perfectly. Well presented.',
  ),
  lapseLog: 'The VPN change missed the change advisory board.',
  skills: { 'incident-management': 20, 'technical-writing': 20, troubleshooting: 10 },
  xp: 110,
}

export const MEETING_IT: CaseInput[] = [itCab]
