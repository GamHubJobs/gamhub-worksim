/**
 * A security incident at the company (fictional, and safely simulated: no
 * real accounts, addresses or malware). A phishing email about payroll
 * reached four people in Finance; Owen Price entered his password on the fake
 * page. At 03:14 someone signed in to his account from overseas, added a
 * mailbox rule forwarding invoices outside the company, and a remote-access
 * program now starts with his laptop. Carmen reported the email. Among the
 * alerts are two false alarms. Addresses use reserved example ranges.
 */
import { COMPANY } from '../../content/company'
import type { SocInput } from './schema'

const domain = COMPANY.emailDomain

export function securityScenario(): SocInput {
  return {
    signIns: [
      {
        id: 'S-1',
        user: 'u19',
        time: 'Mon 08:51',
        location: 'Office (floor 1)',
        ip: '10.20.1.71',
        device: 'LT-0171 (company laptop)',
        result: 'success',
      },
      {
        id: 'S-2',
        user: 'u19',
        time: 'Tue 03:09',
        location: 'Overseas, unknown provider',
        ip: '203.0.113.45',
        device: 'Unknown browser',
        result: 'failure',
      },
      {
        id: 'S-3',
        user: 'u19',
        time: 'Tue 03:11',
        location: 'Overseas, unknown provider',
        ip: '203.0.113.45',
        device: 'Unknown browser',
        result: 'failure',
      },
      {
        id: 'S-4',
        user: 'u19',
        time: 'Tue 03:14',
        location: 'Overseas, unknown provider',
        ip: '203.0.113.45',
        device: 'Unknown browser',
        result: 'success',
      },
      {
        id: 'S-5',
        user: 'u21',
        time: 'Tue 07:58',
        location: 'Home broadband (Leeds)',
        ip: '198.51.100.23',
        device: 'LT-0170 (company laptop)',
        result: 'success',
      },
      {
        id: 'S-6',
        user: 'u18',
        time: 'Tue 08:57',
        location: 'Office (floor 2)',
        ip: '10.20.2.61',
        device: 'LT-0161 (company laptop)',
        result: 'failure',
      },
      {
        id: 'S-7',
        user: 'u18',
        time: 'Tue 08:57',
        location: 'Office (floor 2)',
        ip: '10.20.2.61',
        device: 'LT-0161 (company laptop)',
        result: 'failure',
      },
      {
        id: 'S-8',
        user: 'u18',
        time: 'Tue 08:58',
        location: 'Office (floor 2)',
        ip: '10.20.2.61',
        device: 'LT-0161 (company laptop)',
        result: 'success',
      },
      {
        id: 'S-9',
        user: 'u19',
        time: 'Tue 08:49',
        location: 'Office (floor 1)',
        ip: '10.20.1.71',
        device: 'LT-0171 (company laptop)',
        result: 'success',
      },
    ],
    alerts: [
      {
        id: 'A-1',
        severity: 'high',
        title: 'Sign-in from an unusual location',
        source: 'Sign-in risk',
        time: 'Tue 03:14',
        entity: 'u19',
      },
      {
        id: 'A-2',
        severity: 'medium',
        title: 'New forwarding rule to an external address',
        source: 'Mailbox',
        time: 'Tue 03:16',
        entity: 'u19',
      },
      {
        id: 'A-3',
        severity: 'medium',
        title: 'Unsigned program set to start with Windows',
        source: 'Endpoint',
        time: 'Tue 03:20',
        entity: 'LT-0171',
      },
      {
        id: 'A-4',
        severity: 'low',
        title: 'Email reported as phishing',
        source: 'Phishing report',
        time: 'Tue 09:02',
        entity: 'E-1',
      },
      {
        id: 'A-5',
        severity: 'low',
        title: 'Several failed sign-ins',
        source: 'Sign-in risk',
        time: 'Tue 08:58',
        entity: 'u18',
      },
      {
        id: 'A-6',
        severity: 'low',
        title: 'Email reported as phishing',
        source: 'Phishing report',
        time: 'Tue 09:10',
        entity: 'E-2',
      },
    ],
    endpoints: [
      {
        device: 'LT-0171',
        user: 'u19',
        processes: [
          { name: 'explorer', path: 'C:\\Windows\\explorer.exe', signed: true },
          {
            name: 'Office Suite',
            path: 'C:\\Program Files\\Office\\office.exe',
            signed: true,
          },
          {
            name: 'Company Chat',
            path: 'C:\\Program Files\\Chat\\chat.exe',
            signed: true,
          },
          {
            name: 'syshelper',
            path: 'C:\\Users\\owen.price\\AppData\\Roaming\\syshelper\\syshelper.exe',
            signed: false,
          },
        ],
        changes: [
          {
            time: 'Mon 16:42',
            what: 'Downloaded “Payroll_details.zip” from a link in an email',
          },
          {
            time: 'Tue 03:20',
            what: 'New startup item: syshelper.exe (user folder, unsigned)',
          },
        ],
      },
      {
        device: 'LT-0170',
        user: 'u21',
        processes: [
          { name: 'explorer', path: 'C:\\Windows\\explorer.exe', signed: true },
          {
            name: 'Office Suite',
            path: 'C:\\Program Files\\Office\\office.exe',
            signed: true,
          },
          {
            name: 'OneSync',
            path: 'C:\\Program Files\\OneSync\\onesync.exe',
            signed: true,
          },
        ],
        changes: [{ time: 'Mon 09:12', what: 'Office Suite updated to 16.0.17' }],
      },
      {
        device: 'LT-0161',
        user: 'u18',
        processes: [
          { name: 'explorer', path: 'C:\\Windows\\explorer.exe', signed: true },
          {
            name: 'LedgerPro',
            path: 'C:\\Program Files\\LedgerPro\\ledgerpro.exe',
            signed: true,
          },
        ],
        changes: [],
      },
    ],
    emails: [
      {
        id: 'E-1',
        fromName: 'Payroll Team',
        fromAddress: 'payroll@cobaltridge-hr.example.net',
        replyTo: 'verify@payroll-update.example.org',
        subject: 'Action required: confirm your bank details before Friday’s pay run',
        received: 'Mon 16:30',
        recipients: ['u19', 'u18', 'u17', 'u21'],
        reportedBy: 'u18',
        body: 'Dear colleague, due to a system upgrade, all staff must confirm their bank details by Thursday or their salary may be delayed. Sign in with your work account using the secure link below. The attached file explains the change. Payroll Team',
        links: [
          {
            text: 'Secure payroll portal',
            url: 'https://cobaltridge-payroll.example.org/login',
          },
        ],
      },
      {
        id: 'E-2',
        fromName: 'IT Service Desk',
        fromAddress: `it-support@${domain}`,
        subject: 'Planned maintenance: Saturday 06:00–08:00',
        received: 'Tue 08:30',
        recipients: ['u17', 'u18', 'u19', 'u21', 'u3'],
        reportedBy: 'u17',
        body: 'Hello, the email system will be briefly unavailable on Saturday between 06:00 and 08:00 for planned maintenance. You do not need to do anything. IT Service Desk',
        links: [{ text: 'Service status page', url: `https://status.${domain}` }],
      },
    ],
    mailboxes: [
      {
        user: 'u19',
        rules: [
          {
            id: 'R-1',
            name: 'Newsletters',
            condition: 'From contains “newsletter”',
            action: 'Move to folder “Reading”',
          },
          {
            id: 'R-2',
            name: 'Archive',
            condition: 'Subject or body contains “invoice” or “payment”',
            action: 'Forward to ledger.archive@mail-sync.example.net, then mark as read',
          },
        ],
        audit: [
          {
            time: 'Mon 08:52',
            action: 'Mailbox opened',
            ip: '10.20.1.71',
            location: 'Office (floor 1)',
          },
          {
            time: 'Tue 03:15',
            action: 'Mailbox opened',
            ip: '203.0.113.45',
            location: 'Overseas, unknown provider',
          },
          {
            time: 'Tue 03:16',
            action: 'New inbox rule “Archive”',
            ip: '203.0.113.45',
            location: 'Overseas, unknown provider',
          },
        ],
      },
      {
        user: 'u17',
        rules: [
          {
            id: 'R-3',
            name: 'Out of office',
            condition: 'All messages, 24–28 March',
            action: 'Reply with “I am on leave this week”',
          },
        ],
        audit: [
          {
            time: 'Tue 09:01',
            action: 'Mailbox opened',
            ip: '10.20.1.63',
            location: 'Office (floor 1)',
          },
        ],
      },
    ],
    accounts: [
      { user: 'u19', name: 'Owen Price', department: 'Finance', person: 'backR' },
      { user: 'u18', name: 'Carmen Ruiz', department: 'Finance', person: 'front2' },
      { user: 'u17', name: 'Leila Haddad', department: 'Accounting', person: 'backM' },
      { user: 'u21', name: 'Grace Mensah', department: 'Accounting', person: 'backL' },
      { user: 'u3', name: 'Priya Raman', department: 'Finance', person: '' },
    ],
    incident: {
      id: 'IR-2026-014',
      title: 'Unusual sign-in to Owen Price’s account',
      alert: 'A-1',
    },
    truth: {
      user: 'u19',
      device: 'LT-0171',
      email: 'E-1',
      rule: 'R-2',
      process: 'syshelper',
      signIn: 'S-4',
      severity: 'high',
      category: 'account-compromise',
    },
  }
}
