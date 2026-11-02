/** Incidents cases: it-support. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const itLogin: CaseInput = {
  id: 'inc-it-suspicious-login',
  version: 1,
  careerId: 'it-support',
  kind: 'incident',
  minLevel: 3,
  title: 'A suspicious login to the finance director’s account',
  summary:
    'The finance director’s account signed in from two countries 20 minutes apart.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'network-intranet' },
  deadlineHours: 2,
  email: {
    subject: 'URGENT: odd sign-ins on the finance director’s account',
    body: `Hi {name},

The sign-in alerts flagged the finance director’s account this morning. Please investigate now and act. Logs attached.

Ravi`,
  },
  whyItMatters:
    'Compromised accounts are how most cyber attacks start, and a finance director’s account can approve payments. Reading the evidence quickly, containing the threat first and telling the right people is what limits the damage.',
  objectives: [
    'Read sign-in evidence',
    'Contain a compromised account',
    'Report a security incident properly',
  ],
  evidence: [
    {
      id: 'logins',
      title: 'Sign-in log: finance director',
      table: {
        head: ['Time', 'Location', 'Device', 'Result'],
        rows: [
          ['08:52', 'London, UK', 'Company laptop LT-0101', 'Success (with MFA)'],
          [
            '09:14',
            'Lagos, Nigeria',
            'Unknown browser',
            'Success (no MFA prompt: legacy mail app)',
          ],
          [
            '09:16',
            'Lagos, Nigeria',
            'Unknown browser',
            'Mailbox rule created: forward “invoice” emails',
          ],
        ],
      },
    },
    {
      id: 'note',
      title: 'Phone call with the finance director',
      text: 'She is in the office in London and has not travelled. She clicked a link in an email about a “shared invoice” yesterday and entered her password.',
    },
  ],
  steps: [
    {
      id: 'signs',
      kind: 'review',
      title: 'What the evidence shows',
      prompt: 'Which of these are true?',
      points: 25,
      findings: [
        {
          id: 'impossible',
          text: 'Signing in from London and Lagos 22 minutes apart is impossible travel.',
          issue: true,
          why: 'Nobody can travel that far that fast: one sign-in is someone else.',
        },
        {
          id: 'rule',
          text: 'The forwarding rule for “invoice” emails is a sign of invoice fraud being prepared.',
          issue: true,
          why: 'Attackers forward invoices to change bank details on them.',
        },
        {
          id: 'phish',
          text: 'Her password was probably stolen by the “shared invoice” link.',
          issue: true,
          why: 'She entered it on a fake page yesterday.',
        },
        {
          id: 'vpn',
          text: 'The Lagos sign-in is probably her VPN.',
          issue: false,
          why: 'Our VPN exits in London, and she is on the company network.',
        },
      ],
    },
    {
      id: 'contain',
      kind: 'decide',
      title: 'Contain it',
      prompt: 'What do you do first?',
      points: 35,
      options: [
        {
          id: 'contain',
          label:
            'Revoke all her sessions, reset her password, remove the forwarding rule, block legacy sign-in, and report it to security and Finance',
          verdict: 'best',
          why: 'It shuts the attacker out, closes the gap they used, and lets Finance watch for fraudulent invoices.',
          effects: { indicators: { risk: -8 } },
        },
        {
          id: 'reset-only',
          label: 'Reset her password',
          verdict: 'acceptable',
          why: 'Necessary, but the attacker’s session and forwarding rule stay active.',
          effects: { indicators: { risk: 2 } },
        },
        {
          id: 'watch',
          label: 'Watch the account for a day to see what the attacker does',
          verdict: 'poor',
          why: 'Every minute risks fraudulent payments: contain first.',
          effects: { indicators: { risk: 10 } },
        },
      ],
    },
    {
      id: 'report',
      kind: 'reply',
      to: 'Ravi Menon',
      title: 'Report the incident',
      prompt: 'Report what happened, what you did and what Finance must watch for.',
      points: 40,
      minWords: 60,
      mentions: [
        ['forward', 'rule'],
        ['password', 'reset'],
        ['sessions', 'signed out'],
        ['invoice', 'bank details'],
        ['phishing', 'link'],
      ],
      avoid: [
        {
          terms: ['her fault', 'careless'],
          why: 'Phishing fools careful people; blame stops people reporting.',
        },
      ],
      model:
        'Hi Ravi, the finance director’s account was compromised: she entered her password on a phishing link yesterday, and at 09:14 someone signed in from Lagos through a legacy mail app with no MFA and created a rule forwarding “invoice” emails. I have revoked all her sessions, reset her password, removed the forwarding rule and blocked legacy sign-in. Finance should treat any change of supplier bank details as suspicious this week and confirm by phone. I have reported it to security. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 4 }, reputation: 4, indicators: { risk: -3 } },
    fail: { indicators: { risk: 4 } },
    lapse: { reputation: -4, indicators: { risk: 10 } },
  },
  replies: replies(
    'Ravi',
    'Textbook incident response. Finance caught a fake invoice with changed bank details this afternoon, thanks to your warning.',
  ),
  lapseLog:
    'The compromised account stayed open for hours: a fraudulent invoice was sent to a supplier.',
  skills: { 'incident-management': 35, troubleshooting: 20, 'technical-writing': 15 },
  xp: 130,
}

export const INCIDENT_IT: CaseInput[] = [itLogin]
