/**
 * The IT Knowledge Base: the service desk's own articles, available in every
 * IT task and offline (they are part of the app). Each article explains the
 * problem, how to diagnose it, how to resolve it, and when to escalate.
 * Written for this game; the procedures are the usual ones in IT support.
 */

export const KB_CATEGORIES = [
  'Accounts and access',
  'Network',
  'Windows',
  'Devices',
  'Printers',
  'Software',
  'Email',
  'Security',
  'Escalation',
  'Documentation',
] as const

export type KbCategory = (typeof KB_CATEGORIES)[number]

export interface KbArticle {
  id: string
  title: string
  category: KbCategory
  /** One or two sentences: what it is about. */
  summary: string
  /** What the user reports. */
  symptoms: string[]
  /** How to find the cause, in order. */
  diagnose: string[]
  /** How to fix it. */
  resolve: string[]
  /** When to hand it on, and to whom. */
  escalate?: string
  /** Why it works this way (the concept). */
  concept?: string
  /** Extra words people search for. */
  keywords: string[]
}

export const IT_KNOWLEDGE: KbArticle[] = [
  {
    id: 'kb-lockout',
    title: 'Account locked out',
    category: 'Accounts and access',
    summary:
      'An account locks after too many wrong passwords. Unlocking and resetting are two different actions.',
    symptoms: [
      '“Your account has been locked” at sign-in',
      'The user may have changed their password recently, or a phone still has the old one',
    ],
    diagnose: [
      'Find the account in Directory: check the full name and department (names are shared).',
      'Look at the failed sign-ins: how many, and from where. Many attempts from an unknown network may be an attack, not a forgetful user.',
      'Verify the person’s identity before you change anything (see “Verifying who you are talking to”).',
    ],
    resolve: [
      'If they know their password: unlock the account.',
      'If they have forgotten it: reset the password (a temporary one, changed at next sign-in) and unlock.',
      'Ask them to sign in while you are with them, and update the ticket.',
    ],
    escalate:
      'Attempts from an unknown location, or a privileged account: tell IT security before unlocking.',
    concept:
      'A lockout protects against password guessing. A reset gives a new password but does not lift the lock; an unlock lifts the lock but does not change the password.',
    keywords: ['locked', 'lockout', 'sign in', 'password', 'unlock', 'login'],
  },
  {
    id: 'kb-verify',
    title: 'Verifying who you are talking to',
    category: 'Security',
    summary:
      'Never change an account on someone’s word. Check them against the records, then check the change is authorised.',
    symptoms: [
      'A request to unlock, reset, change access or MFA',
      'Pressure: “I’m in a hurry”, “my manager said it’s fine”',
    ],
    diagnose: [
      'Find the right account first.',
      'Ask for their employee number or staff badge number, and check it against the record (the Directory says whether it matches).',
      'Or call back on the extension on record, never on a number they give you.',
      'Check what the policy needs for the change: some need their manager’s or the group owner’s approval as well.',
    ],
    resolve: [
      'Once verified (and approved where needed), make the change while the verification is valid (10 minutes).',
      'If they cannot be verified: do not change anything. Set the ticket to Waiting for information and tell them how to verify.',
    ],
    escalate: 'Anyone pretending to be a colleague: report it to IT security.',
    concept:
      'Identity (is this really them?) and authorisation (may this change be made?) are separate. Most account takeovers start with a convincing call to the service desk.',
    keywords: [
      'verify',
      'identity',
      'badge',
      'callback',
      'approval',
      'social engineering',
    ],
  },
  {
    id: 'kb-access-request',
    title: 'Access to a shared folder or application',
    category: 'Accounts and access',
    summary:
      'Access is given through security groups. Check the account, the group, then the service.',
    symptoms: [
      '“Access denied” on a shared folder',
      'An app says they have no permission',
    ],
    diagnose: [
      'Is the account enabled and unlocked?',
      'Is the user in the group that grants this access? (Directory, their Groups)',
      'Is the service itself up, and reachable from their computer? (Network Tools)',
    ],
    resolve: [
      'Add them to the right group only with the approval the policy needs (usually their manager).',
      'Ask them to sign out and in again: group changes apply at the next sign-in.',
    ],
    escalate: 'Privileged groups (payroll, administrators): the group owner decides.',
    concept: 'Least privilege: people get the access their job needs, and no more.',
    keywords: ['access denied', 'permission', 'shared drive', 'group', 'folder'],
  },
  {
    id: 'kb-mfa',
    title: 'Lost or replaced phone (MFA)',
    category: 'Accounts and access',
    summary:
      'Reset MFA so the user can register their new phone. It needs strong verification.',
    symptoms: ['New phone, no authenticator app', 'Cannot approve sign-in prompts'],
    diagnose: [
      'Verify identity with two different checks: MFA resets are a favourite of attackers.',
    ],
    resolve: [
      'Reset MFA in Directory, then register the new device with the user.',
      'If the old phone was lost, report it so it can be removed from company apps.',
    ],
    keywords: ['mfa', 'authenticator', 'phone', 'two factor', '2fa'],
  },
  {
    id: 'kb-no-network',
    title: 'No network: one user or many?',
    category: 'Network',
    summary:
      'Work outwards from the user: their computer, their network (Wi-Fi), the server, the service.',
    symptoms: [
      '“No internet”, “can’t reach anything”',
      'Several people near each other at once',
    ],
    diagnose: [
      'Is it one person or several? Several on one floor point to something they share.',
      'On the Network map: is their computer on, and what does it connect through (switch or Wi-Fi access point)?',
      'From your PC, ping that shared device. No reply: it is the cause.',
      'Run tracert to see where traffic stops.',
    ],
    resolve: [
      'Fix the shared device (a crashed access point can be restarted remotely; one with no power needs someone on site).',
      'Test again from the user’s computer: that is where the problem was.',
    ],
    escalate: 'A whole site down, or a core switch or router: P1, tell the network team.',
    concept:
      'Many symptoms, one cause: before fixing anyone’s computer, find what the affected people have in common.',
    keywords: ['wifi', 'wi-fi', 'internet', 'offline', 'network', 'access point', 'ping'],
  },
  {
    id: 'kb-dns',
    title: 'A name does not resolve (DNS)',
    category: 'Network',
    summary: 'When a server answers by its address but not by its name, look at DNS.',
    symptoms: [
      '“Server not found” by name, but the address works',
      'Only some computers affected',
    ],
    diagnose: [
      'nslookup the name: what address comes back, and from which DNS server?',
      'Compare with the server’s real address.',
      'Check the computer’s DNS settings (ipconfig): a wrong DNS server affects that computer only.',
    ],
    resolve: [
      'Correct the wrong record, or the computer’s DNS setting.',
      'Test with ping by name from the user’s computer.',
    ],
    concept:
      'DNS turns names into addresses. A wrong record sends everyone to the wrong place.',
    keywords: ['dns', 'nslookup', 'name', 'resolve', 'server not found'],
  },
  {
    id: 'kb-service-down',
    title: 'A service is down (file share, intranet, mail)',
    category: 'Network',
    summary:
      'The server answers ping, but the application does not: the service has stopped.',
    symptoms: [
      'Everyone loses one system at once',
      'The server pings, the app does not open',
    ],
    diagnose: [
      'portcheck the service’s port from the user’s computer.',
      'On the server, look at its services: which one has stopped?',
    ],
    resolve: ['Start the service, and test the port again from a user’s computer.'],
    escalate:
      'A business-critical service: raise a major incident (P1) and update affected users.',
    keywords: ['service', 'stopped', 'port', 'file server', 'intranet', 'share'],
  },
  {
    id: 'kb-slow-pc',
    title: 'Computer running slowly',
    category: 'Windows',
    summary:
      'Usually one of: a process using the CPU or memory, a full disk, or pending updates.',
    symptoms: ['Everything takes ages', 'Fans loud, apps freeze'],
    diagnose: [
      'Connect with Remote Desktop and open Task Manager: what uses the CPU and memory?',
      'Check free storage: under about 10% free slows everything down.',
      'Check Windows Update for pending or failed updates.',
    ],
    resolve: [
      'End a runaway process (not a system one), with the user’s agreement.',
      'Clear temporary files with Disk Cleanup.',
      'Restart once updates are installed.',
    ],
    concept:
      'A computer slows when it runs out of something: processor time, memory or disk space. Find which, then free it.',
    keywords: ['slow', 'freeze', 'cpu', 'memory', 'task manager', 'performance'],
  },
  {
    id: 'kb-low-storage',
    title: 'Low disk space',
    category: 'Windows',
    summary:
      'Free space by clearing temporary files first; never delete the user’s own files.',
    symptoms: ['“Your disk is almost full”', 'Cannot save files or install updates'],
    diagnose: [
      'In Remote Desktop, open Storage: how much is free, and what is using it?',
    ],
    resolve: [
      'Run Disk Cleanup to remove temporary files.',
      'If it is still low, ask the user before moving their files to their network drive.',
    ],
    keywords: ['disk', 'storage', 'full', 'space', 'temp', 'cleanup'],
  },
  {
    id: 'kb-app-crash',
    title: 'An application keeps crashing',
    category: 'Software',
    summary: 'Find the error in the event log, then repair or reinstall the application.',
    symptoms: ['The app closes on its own', '“Has stopped working”'],
    diagnose: [
      'Event Viewer: what error is logged when it crashes?',
      'Apps: is the installed version damaged or out of date?',
    ],
    resolve: [
      'Repair the application; if that fails, reinstall it.',
      'Ask the user to try again, and record the version.',
    ],
    escalate:
      'Several users with the same crash after an update: tell the application team.',
    keywords: ['crash', 'stopped working', 'error', 'reinstall', 'repair', 'application'],
  },
  {
    id: 'kb-install',
    title: 'Software installation failed',
    category: 'Software',
    summary:
      'Installs need space, the right permissions, and a working installer service.',
    symptoms: ['Install stops with an error', 'App missing after install'],
    diagnose: [
      'Is there enough free storage?',
      'Is the Windows Installer service running? (Services)',
      'Is the software approved for the user? Only approved software is installed.',
    ],
    resolve: [
      'Fix the cause (space, service), then install again from the company catalogue.',
    ],
    concept:
      'Users do not get administrator rights: IT installs approved software for them.',
    keywords: ['install', 'installer', 'setup', 'software', 'msi'],
  },
  {
    id: 'kb-updates',
    title: 'Windows Update problems',
    category: 'Windows',
    summary:
      'A failed update usually needs space, a working update service, and a retry.',
    symptoms: ['Updates fail again and again', '“Restart required” never goes away'],
    diagnose: [
      'Windows Update: which update failed, and with what error?',
      'Check storage and the update service.',
    ],
    resolve: ['Free space, start the update service, retry, then restart.'],
    keywords: ['update', 'patch', 'windows update', 'restart'],
  },
  {
    id: 'kb-config',
    title: 'Incorrect network settings on a computer',
    category: 'Devices',
    summary:
      'A wrong proxy, DNS server or static address breaks one computer while everyone else is fine.',
    symptoms: ['Only this computer cannot browse', 'Colleagues next to them are fine'],
    diagnose: [
      'Compare its settings with a working computer (ipconfig, Settings > Network).',
      'Look for a manual proxy or DNS server, or a fixed address.',
    ],
    resolve: ['Set it back to the company standard (automatic), and test.'],
    keywords: ['proxy', 'settings', 'static ip', 'dns server', 'configuration'],
  },
  {
    id: 'kb-remote',
    title: 'Remote support: connecting to a user’s computer',
    category: 'Devices',
    summary:
      'Check it is reachable, tell the user before you connect, and disconnect when done.',
    symptoms: [],
    diagnose: [
      'Find the device in Device Management: who uses it, and is it online?',
      'If it is off the network, Remote Desktop cannot connect: fix the network first.',
    ],
    resolve: [
      'Connect, explain what you are doing, change only what the ticket needs.',
      'Disconnect, and record what you changed in the ticket.',
    ],
    concept: 'Remote support is done with the user’s knowledge, on company devices only.',
    keywords: ['remote', 'rdp', 'remote desktop', 'connect', 'device'],
  },
  {
    id: 'kb-printer',
    title: 'Printer not printing',
    category: 'Printers',
    summary: 'Check the printer, its queue, then the computer’s print service.',
    symptoms: ['Jobs stuck in the queue', '“Printer offline”'],
    diagnose: [
      'Is the printer on and on the network? (ping it)',
      'Is the job stuck? Is the computer’s Print Spooler service running?',
    ],
    resolve: ['Restart the Print Spooler, clear the stuck job, print a test page.'],
    escalate:
      'Hardware faults (paper jams, toner, errors on the display): facilities or the vendor.',
    keywords: ['printer', 'print', 'spooler', 'queue', 'offline'],
  },
  {
    id: 'kb-mail',
    title: 'Email not arriving or not sending',
    category: 'Email',
    summary: 'One user or everyone? Then the mailbox, its rules and the mail service.',
    symptoms: ['Mail stops arriving', 'Messages stuck in the outbox'],
    diagnose: [
      'Everyone: check the mail service. One user: check their mailbox rules and storage.',
      'An unexpected forwarding rule is a sign of a compromised account.',
    ],
    resolve: ['Fix the rule or the service; send a test message both ways.'],
    escalate:
      'Forwarding to an outside address the user did not set up: a security incident.',
    keywords: ['email', 'mail', 'outlook', 'inbox', 'forwarding', 'rule'],
  },
  {
    id: 'kb-phishing',
    title: 'Reported phishing email',
    category: 'Security',
    summary:
      'Check the sender and links, quarantine it everywhere, and find out who clicked.',
    symptoms: [
      'A suspicious email reported by a user',
      'Urgent password or payment requests',
    ],
    diagnose: [
      'Sender: does the domain really belong to who it claims?',
      'Links: where do they really go?',
      'Who else received it, and did anyone click or enter a password?',
    ],
    resolve: [
      'Quarantine the message from every mailbox.',
      'Reset the password and revoke sessions of anyone who entered it.',
      'Thank the reporter: reporting is exactly right.',
    ],
    escalate: 'Anyone who entered credentials: open a security incident.',
    keywords: ['phishing', 'suspicious email', 'spam', 'link', 'scam'],
  },
  {
    id: 'kb-suspicious-signin',
    title: 'Suspicious sign-ins',
    category: 'Security',
    summary: 'Compare sign-ins with what is normal for the user: place, time, device.',
    symptoms: ['Sign-ins from another country', 'Many failed attempts then a success'],
    diagnose: [
      'Sign-in history: where, when, from which device, success or failure.',
      'Ask the user (on a verified channel) whether it was them.',
    ],
    resolve: [
      'Not them: disable or reset, revoke sessions, check the mailbox for rules.',
      'Record the evidence in the incident.',
    ],
    keywords: ['sign-in', 'login', 'location', 'impossible travel', 'brute force'],
  },
  {
    id: 'kb-incident-response',
    title: 'Security incident response',
    category: 'Security',
    summary:
      'Detect, triage, investigate, contain, eradicate, recover, document, review.',
    symptoms: [],
    diagnose: [
      'Triage: how serious, who and what is affected?',
      'Investigate before acting: the evidence decides what to contain.',
    ],
    resolve: [
      'Contain the right thing (an account, a device), not everything.',
      'Remove the cause, restore normal service, and document what happened.',
    ],
    concept:
      'Containing the wrong device or account stops someone working and leaves the threat in place.',
    keywords: ['incident', 'response', 'contain', 'isolate', 'malware', 'soc'],
  },
  {
    id: 'kb-priority',
    title: 'Setting the priority',
    category: 'Escalation',
    summary: 'Priority = impact (how many, how important) × urgency (how soon it hurts).',
    symptoms: [],
    diagnose: [
      'Impact: one person, a team, or the whole company? A key system?',
      'Urgency: is work stopped now, or soon, or can it wait?',
    ],
    resolve: [
      'P1 critical: the company or a key service is down, or a security incident.',
      'P2 high: a team cannot work. P3: one person, with a workaround. P4: requests.',
    ],
    keywords: ['priority', 'impact', 'urgency', 'p1', 'triage', 'sla'],
  },
  {
    id: 'kb-escalation',
    title: 'When and how to escalate',
    category: 'Escalation',
    summary:
      'Escalate early when it is outside first-line support, with everything you found.',
    symptoms: [],
    diagnose: ['Is it beyond your access or skills, or affecting many people?'],
    resolve: [
      'Write what you checked and found, then hand it on to the right team.',
      'Keep the user updated: escalated is not forgotten.',
    ],
    keywords: ['escalate', 'second line', 'major incident', 'handover'],
  },
  {
    id: 'kb-writing',
    title: 'Writing ticket updates and replies',
    category: 'Documentation',
    summary: 'What was wrong, what you did, what the user needs to do: in plain words.',
    symptoms: [],
    diagnose: [],
    resolve: [
      'Start with the outcome. Then the cause, in plain words. Then any action for them.',
      'Avoid jargon, or explain it. Thank them for reporting.',
      'Record technical detail in the internal note, for colleagues.',
    ],
    keywords: ['reply', 'update', 'documentation', 'notes', 'writing', 'communication'],
  },
]

export function getArticle(id: string): KbArticle | undefined {
  return IT_KNOWLEDGE.find((a) => a.id === id)
}

/** Articles matching a search, best first: the title counts most, then keywords, then text. */
export function searchKnowledge(
  query: string,
  category: KbCategory | 'all' = 'all',
): KbArticle[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const scoped = IT_KNOWLEDGE.filter((a) => category === 'all' || a.category === category)
  if (words.length === 0) return scoped
  return scoped
    .map((a) => {
      const title = a.title.toLowerCase()
      const keys = a.keywords.join(' ').toLowerCase()
      const text = [
        a.summary,
        ...a.symptoms,
        ...a.diagnose,
        ...a.resolve,
        a.concept ?? '',
      ]
        .join(' ')
        .toLowerCase()
      let score = 0
      for (const w of words) {
        if (title.includes(w)) score += 5
        if (keys.includes(w)) score += 3
        if (text.includes(w)) score += 1
      }
      return { a, score }
    })
    .filter((m) => m.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((m) => m.a)
}
