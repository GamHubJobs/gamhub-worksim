import type { AssignmentInput } from '../../schemas'
import { securityScenario } from '../../../tools/soc/data'
import {
  acknowledgeAlert,
  advance,
  flagProcess,
  flagRule,
  flagSignIn,
  isolateDevice,
  killProcess,
  quarantineEmail,
  removeRule,
  resetAccountPassword,
  restoreDevice,
  revokeSessions,
  setLessons,
  setReport,
  setTriage,
  setVerdict,
} from '../../../tools/soc/model'
import { SocStateSchema, type SocState } from '../../../tools/soc/schema'
import { IT_CATEGORIES, WRITING_GUIDE } from './knowledge'

/**
 * IT Help Desk (Senior Support Analyst): a security incident, worked through
 * its stages in the Security Console. A phishing email led to Owen Price's
 * account being used from overseas, a forwarding rule in his mailbox and a
 * remote-access program on his laptop. Teaches: evidence before action,
 * containing the right account and device, removing what the attacker left,
 * recovering, and documenting. Safely simulated: nothing real is involved.
 */
const start = securityScenario()

export const INCIDENT_REPORT =
  'At 03:14 on Tuesday someone signed in to Owen Price’s account from an overseas address (203.0.113.45) after two failed attempts. Owen had entered his password on a fake payroll page linked from a phishing email that reached four people in Finance and Accounting. The attacker added a mailbox rule called Archive forwarding invoices and payments outside the company, and a remote-access program, syshelper.exe, was set to start on his laptop LT-0171. We ended his sessions, reset his password, isolated LT-0171, removed the rule and the program, quarantined the email from every inbox, and reconnected the laptop once it was clean.'

export const LESSONS =
  'Register multi-factor authentication for everyone in Finance, so a stolen password alone is not enough. Block forwarding to external addresses by default. Remind staff how to recognise lookalike domains, and thank Carmen publicly for reporting it quickly.'

function solution(): SocState {
  let s = SocStateSchema.parse(start)
  const run = (r: { state: SocState; problems: string[] }) => {
    if (r.problems.length) throw new Error(r.problems.join(' '))
    s = r.state
  }
  run(acknowledgeAlert(s, 'A-1'))
  run(advance(s))
  run(setTriage(s, 'high', 'account-compromise'))
  run(advance(s))
  run(flagSignIn(s, 'S-4'))
  run(setVerdict(s, 'E-1', 'phishing'))
  run(setVerdict(s, 'E-2', 'legitimate'))
  run(flagRule(s, 'u19', 'R-2'))
  run(flagProcess(s, 'LT-0171', 'syshelper'))
  run(advance(s))
  run(revokeSessions(s, 'u19'))
  run(resetAccountPassword(s, 'u19'))
  run(isolateDevice(s, 'LT-0171'))
  run(advance(s))
  run(removeRule(s, 'u19', 'R-2'))
  run(killProcess(s, 'LT-0171', 'syshelper'))
  run(quarantineEmail(s, 'E-1'))
  run(advance(s))
  run(restoreDevice(s, 'LT-0171'))
  run(advance(s))
  run(setReport(s, INCIDENT_REPORT))
  run(advance(s))
  run(setLessons(s, LESSONS))
  run(advance(s))
  return s
}

export const securityIncident: AssignmentInput = {
  id: 'security-incident',
  version: 1,
  careerId: 'it-support',
  levelId: 'senior-support-analyst',
  order: 15,
  kind: 'tickets',
  title: 'Incident response: a compromised account',
  summary:
    'A sign-in from overseas, a phishing email and a forwarding rule: investigate, contain, eradicate, recover and document, in the Security Console.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Security incident: Owen’s account',
    body: `Hi {name},

Overnight our security tools flagged a sign-in to Owen Price’s account from overseas, and this morning Carmen reported a suspicious payroll email. I’ve opened incident **IR-2026-014** in the **Security Console**.

Work it through its stages. **Evidence before action**: find what happened before you contain anything, and contain the right account and device. Disabling the wrong person or isolating the wrong laptop stops someone working and leaves the attacker where they are.

Then clean up, get Owen working again, and write it up. Reply to Carmen too: reporting it was exactly right.

Ravi`,
  },
  whyItMatters:
    'Most breaches start with one stolen password. How fast and how accurately the service desk responds decides whether it stays one account or becomes the whole company, and acting on the wrong thing is as damaging as acting too late.',
  objectives: [
    'Triage an alert: how serious, and what kind of incident',
    'Investigate sign-ins, an email, a mailbox and a device for evidence',
    'Contain the right account and device, and nothing else',
    'Remove what the attacker left, recover, and document it',
  ],
  steps: [
    {
      id: 'detect',
      title: 'Detect and triage',
      instructions:
        'Open the **Security Console** in the Help Desk. Acknowledge the alert that opened the incident, then set its severity and category.',
    },
    {
      id: 'investigate',
      title: 'Investigate',
      instructions:
        'Find the evidence: the sign-in that was not Owen (compare it with his usual ones), the email that started it (inspect its sender and links), what changed in his mailbox, and what runs on his laptop. Flag each one. Some alerts are false alarms.',
      hint: 'Look at where and when each sign-in happened, whether a sender’s domain is really ours, and processes that are unsigned and in a user folder.',
    },
    {
      id: 'respond',
      title: 'Contain, eradicate, recover',
      instructions:
        'Secure Owen’s account (end its sessions, reset the password) and isolate his laptop. Then remove the rule and the program, quarantine the email, and reconnect the laptop.',
    },
    {
      id: 'document',
      title: 'Document and review',
      instructions:
        'Write the incident report and the lessons learned in **Report**, and complete the last stages. Reply to Carmen.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  queue: {
    title: 'Security incident IR-2026-014',
    categories: IT_CATEGORIES,
    knowledge: [
      {
        title: 'Incident response stages',
        body: `Detect, triage, investigate, contain, eradicate, recover, document, review. Each stage needs its work done before the next: the console will say what is missing.

Evidence first. Containment is targeted: the compromised account and device, nothing else.`,
      },
      WRITING_GUIDE,
    ],
    tickets: [
      {
        id: 'INC-3501',
        from: 'Carmen Ruiz',
        department: 'Finance',
        received: '09:02',
        subject: 'Suspicious payroll email',
        body: 'I got an email asking me to confirm my bank details for payroll by Thursday. It looks a bit off, the address is strange. I didn’t click anything. Owen said he got it too and did fill it in…',
        requester: 'front2',
        conditions: [{ type: 'incident-closed', incident: 'IR-2026-014' }],
      },
    ],
    environment: {
      soc: {
        start,
        solution: solution(),
        checks: [
          {
            id: 'closed',
            type: 'stage',
            stage: 'closed',
            title: 'The incident worked through to the end',
            points: 40,
            why: 'Each stage only moves on when its work is really done.',
            hint: 'The console says what each stage still needs.',
          },
          {
            id: 'accurate',
            type: 'no-mistakes',
            title: 'No wrong actions',
            points: 25,
            why: 'Containing the wrong account or device, or dismissing a real alert, harms people and helps the attacker.',
            hint: 'Find the evidence before you act on anything.',
          },
          {
            id: 'report',
            type: 'report',
            mentions: [
              ['203.0.113.45', 'overseas'],
              ['rule', 'forward'],
              ['LT-0171'],
              ['password', 'session'],
              ['phishing', 'fake'],
            ],
            title: 'A clear incident report',
            points: 15,
            why: 'Others need to know what happened and what was done, from the evidence.',
            hint: 'The sign-in, the email, the rule, the laptop, and what you did.',
          },
        ],
      },
    },
  },
  ticketSolution: { 'INC-3501': { status: 'resolved' } },
  ticketChecks: [
    {
      id: 'carmen-fixed',
      type: 'fixed',
      ticket: 'INC-3501',
      title: 'Carmen’s report closed with the incident',
      points: 10,
      why: 'Her ticket resolves when the incident is closed.',
      hint: 'Work the incident through to the end.',
    },
    {
      id: 'carmen-reply',
      type: 'reply',
      ticket: 'INC-3501',
      mentions: [['thank'], ['phishing', 'fake', 'scam']],
      minWords: 25,
      title: 'Carmen thanked, and told what it was',
      points: 10,
      why: 'People who report phishing should hear it helped, so they do it again.',
      hint: 'Thank her, confirm it was phishing, and say it has been removed.',
    },
  ],
  passScore: 70,
  xp: 200,
  skills: { 'incident-management': 50, 'access-control': 35, 'technical-writing': 15 },
  feedback: {
    excellent: `Hi {name},

A textbook response. Evidence first, the right account and laptop contained, everything the attacker left removed, and a report I can send to the board as it is. Thank you.

Ravi`,
    good: `Hi {name},

Good response; a detail or two to tighten. See the notes.

Ravi`,
    pass: `Hi {name},

The incident is handled, but some actions hit the wrong thing or the write-up is thin. Read the notes carefully: in security, accuracy matters.

Ravi`,
    fail: `Hi {name},

Let’s go through this together. Start with the evidence: which sign-in was not Owen?

Ravi`,
  },
}
