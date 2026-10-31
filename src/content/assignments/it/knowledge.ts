/** The service desk's knowledge base, shared by the IT tasks. */

export const IT_CATEGORIES = [
  'Hardware',
  'Software',
  'Network',
  'Access',
  'Email',
  'Security',
]

export const PRIORITY_GUIDE = {
  title: 'How to set the priority',
  body: `Priority = impact × urgency.

P1 Critical: a whole floor, team or the office cannot work; a key system is down; or a security incident (phishing, viruses, a lost laptop).
P2 High: several people affected, or one person completely blocked on work that is due today.
P3 Medium: one person affected, but they can keep working (there is a workaround).
P4 Low: requests, questions and minor annoyances; nobody is blocked.`,
}

export const CATEGORY_GUIDE = {
  title: 'Choosing the category',
  body: `Hardware: laptops, screens, printers, phones, docks.
Software: applications not working, installs, updates.
Network: internet, Wi-Fi, VPN, network drives that cannot be reached.
Access: passwords, locked accounts, permissions, new and leaving staff.
Email: Outlook, mailboxes, calendars.
Security: phishing, viruses, suspicious activity, lost or stolen devices.`,
}

export const STATUS_GUIDE = {
  title: 'Ticket statuses',
  body: `Open: you are working on it.
Pending: you are waiting for the user (to try something, or to send information). Use it after you reply with steps to try.
Escalated: passed to a specialist team (Security, Network, Infrastructure). Security incidents are always escalated straight away.
Resolved: fixed, and the user has confirmed it.`,
}

export const SECURITY_GUIDE = {
  title: 'Phishing reports',
  body: `1. Thank the user for reporting it: reports are how we catch attacks.
2. Tell them not to click any link or open attachments, and to delete the email.
3. Remind them that IT will never ask for their password.
4. Set the ticket to P1, category Security, and escalate it to the Security team.
If they already clicked a link or entered a password, they must reset their password immediately.`,
}

export const WRITING_GUIDE = {
  title: 'Writing to users',
  body: `Greet the user by name. Say what you did or what you need, in plain words (no jargon). Number the steps if there are several. Say what happens next and when. Thank them.`,
}
