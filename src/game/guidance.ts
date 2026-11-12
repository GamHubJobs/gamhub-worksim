/**
 * Contextual guidance for a ticket: what the systems show is still wrong,
 * what the player has already tried, and four progressive hints (the
 * problem, where to look, what to do next, why it works this way). Built
 * from the ticket's real failing conditions and the systems' state, never
 * generic. Pure and deterministic.
 *
 * Hints are opened one at a time and counted on the ticket (`hintsUsed`).
 * Each one opened takes a little off the task's XP (see `hintFactor`), so
 * working it out independently is worth more, without making help costly.
 */
import { getArticle, searchKnowledge, type KbArticle } from '../content/knowledge/it'
import type { Ticket, TicketsContent } from '../persistence/schemas'
import { sessionForTicket, viewSession } from '../tools/directory/security'
import { deviceByName } from '../tools/network/simulation'
import {
  evaluateTicket,
  isMonitored,
  type ConditionResult,
  type Moment,
} from './incidents'

export interface Hint {
  level: 1 | 2 | 3 | 4
  title: string
  text: string
  /** The tool to use (a section of the Help Desk). */
  tool?: 'network' | 'directory' | 'devices' | 'knowledge'
  /** A Knowledge Base article that explains it. */
  article?: string
}

export interface Guidance {
  /** fixed: nothing left to repair; working: a condition fails; classic: no conditions. */
  status: 'fixed' | 'working' | 'classic'
  /** The first thing still wrong (what the hints are about). */
  focus?: ConditionResult
  /** What the player has done on this ticket so far, from its history. */
  attempted: string[]
  /** What to do now, in a sentence (free: not a hint). */
  next: string
  hints: Hint[]
}

export const HINT_TITLES = [
  'The problem',
  'Where to look',
  'What to try next',
  'Why it works this way',
] as const

/** Each hint opened takes 5% off the task's XP, at most 30%. */
export const HINT_COST = 0.05
export const HINT_COST_CAP = 0.3

export function hintFactor(hints: number): number {
  return Math.max(1 - HINT_COST_CAP, 1 - HINT_COST * hints)
}

/** Hints opened on all the tickets of a queue. */
export function hintsUsed(content: TicketsContent | null | undefined): number {
  return (content?.tickets ?? []).reduce((sum, t) => sum + (t.hintsUsed ?? 0), 0)
}

function attemptedOf(ticket: Ticket): string[] {
  return ticket.activity.flatMap((a) => {
    if (a.kind === 'change')
      return [a.text.replace(/^Change made: /, '').replace(/\.$/, '')]
    if (a.kind === 'resolve-rejected') return ['Chose Resolved before it was fixed']
    if (a.kind === 'security') return ['An account change refused by the security policy']
    return []
  })
}

const concept = (id: string) => getArticle(id)?.concept ?? ''

function make(
  texts: [string, string, string, string],
  tool: Hint['tool'],
  article: string,
): Hint[] {
  return texts.map((text, i) => ({
    level: (i + 1) as Hint['level'],
    title: HINT_TITLES[i],
    text,
    ...(i === 1 ? { tool } : {}),
    ...(i >= 2 ? { article } : {}),
  }))
}

function networkHints(focus: ConditionResult, content: TicketsContent): Hint[] {
  const c = focus.condition
  const network = content.environment?.network
  const ipOf = (name: string) => {
    const d = network ? deviceByName(network, name) : undefined
    return d ? ` (${d.ip})` : ''
  }
  const where =
    'In the Help Desk, open Network Tools: the Network map shows each device and what it connects through; the Console runs tests from any computer.'
  switch (c.type) {
    case 'device-up':
      return make(
        [
          `${focus.state} Anything that connects through ${c.device} is affected too, so think about what the people on this ticket have in common.`,
          where,
          `From your PC, ping ${c.device}${ipOf(c.device)}. If it does not answer, look at its row on the Network map: what can be done to it from there?`,
          concept('kb-no-network'),
        ],
        'network',
        'kb-no-network',
      )
    case 'service-running':
      return make(
        [
          `${focus.state} The server may still answer a ping: it is the application on it that has stopped.`,
          where,
          `Run portcheck ${c.device} ${c.port} from a user’s computer, then look at the services on ${c.device} in the Network map.`,
          concept('kb-service-down') ||
            'A server can be up while one of its services has stopped.',
        ],
        'network',
        'kb-service-down',
      )
    case 'can-reach': {
      const offWifi = /access point (\S+) is not responding/.exec(focus.state)?.[1]
      const stopsAt = /traffic stops at (\S+?)\)/.exec(focus.state)?.[1]
      const noName = /cannot be looked up/.test(focus.state)
      const port = /but not on port/.test(focus.state)
      const next = offWifi
        ? `${c.from} connects through ${offWifi}. From your PC, ping ${offWifi}${ipOf(offWifi)}.`
        : stopsAt
          ? `Run tracert ${c.host} from ${c.from}: the traffic stops at ${stopsAt}. Look at ${stopsAt} on the Network map.`
          : noName
            ? `Run nslookup ${c.host} from ${c.from}, and compare the answer with the server’s real address.`
            : port
              ? `Run portcheck ${c.host} ${c.port} from ${c.from}, then check that service on the server.`
              : `Ping ${c.host} from ${c.from} in the Console, and read where it fails.`
      const article = noName ? 'kb-dns' : port ? 'kb-service-down' : 'kb-no-network'
      return make(
        [
          `${focus.state} Work outwards from the user: their computer, what it connects through, then the server and the service.`,
          where,
          `${next} Test again from ${c.from} once you have fixed it: that is where the problem was.`,
          concept(article),
        ],
        'network',
        article,
      )
    }
    case 'dns-record':
      return make(
        [
          `${focus.state} Everyone who uses the name ${c.name} is sent to that address.`,
          where,
          `Run nslookup ${c.name} and compare it with the address of the server it should point to (${c.ip}).`,
          concept('kb-dns'),
        ],
        'network',
        'kb-dns',
      )
    default:
      return []
  }
}

function directoryHints(
  focus: ConditionResult,
  ticket: Ticket,
  content: TicketsContent,
): Hint[] {
  const c = focus.condition
  if (!('user' in c)) return []
  const directory = content.environment?.directory
  const user = directory?.users.find((u) => u.id === c.user)
  const name = user?.name ?? c.user
  const first = name.split(' ')[0]
  const where = `In the Help Desk, open Directory and find ${name}’s account (check the department: names can be shared).`
  // With a security policy, verifying them comes first.
  let verify = ''
  if (directory?.security) {
    const session = sessionForTicket(directory, ticket.id)
    const view = session ? viewSession(directory, session) : null
    verify = !view
      ? `Verify ${first} first, from this ticket’s Identity verification section: the Directory refuses changes nobody verified. `
      : view.identity !== 'verified'
        ? `${first} is not verified yet: check what they give you against the record, or call back on the extension on record. `
        : !view.authorised
          ? `${first} is verified, but the change also needs approval: see who the records name. `
          : ''
  }
  switch (c.type) {
    case 'account-unlocked':
      return make(
        [
          `${focus.state} Until it is unlocked, ${first} cannot sign in, whatever the password.${user?.signInLocation ? ` The failed sign-ins came from ${user.signInLocation}.` : ''}`,
          where,
          `${verify}Then unlock the account. A new password alone does not lift the lock.`,
          concept('kb-lockout'),
        ],
        'directory',
        'kb-lockout',
      )
    case 'password-reset':
      return make(
        [
          `${focus.state} ${first} does not know a password that works.`,
          where,
          `${verify}Then reset the password: they get a temporary one and choose their own at the next sign-in.`,
          concept('kb-lockout'),
        ],
        'directory',
        'kb-lockout',
      )
    case 'account-enabled':
      return make(
        [
          `${focus.state} A disabled account cannot be used at all.`,
          where,
          `${verify}Enable the account, if that is what was agreed (check the ticket: was it disabled on purpose?).`,
          concept('kb-access-request'),
        ],
        'directory',
        'kb-access-request',
      )
    case 'in-group':
      return make(
        [
          `${focus.state} Access to systems is given through security groups.`,
          where,
          `${verify}Add ${first} to the group the ticket asks for, and only that one.`,
          concept('kb-access-request'),
        ],
        'directory',
        'kb-access-request',
      )
    default:
      return []
  }
}

/** Hints for a ticket without conditions (triage, a reply): from the knowledge base. */
function classicHints(ticket: Ticket): Hint[] {
  const match: KbArticle | undefined = searchKnowledge(
    `${ticket.subject} ${ticket.body}`,
  )[0]
  return make(
    [
      'Read the ticket for two things: who and what is affected (impact), and how soon it hurts (urgency).',
      'Use the priority matrix on the ticket, and search the Knowledge Base for the symptom.',
      match
        ? `Open “${match.title}” in the Knowledge Base: ${match.summary}`
        : 'Ask the user for the exact error and when it started, then decide the priority and category.',
      concept('kb-priority'),
    ],
    'knowledge',
    match?.id ?? 'kb-priority',
  )
}

/** Guidance for one ticket, from its conditions, the systems and its history. */
export function guidanceFor(ticket: Ticket, content: TicketsContent): Guidance {
  const attempted = attemptedOf(ticket)
  if (!isMonitored(ticket))
    return {
      status: 'classic',
      attempted,
      next: 'Set the priority and category, reply to the requester, and choose the status.',
      hints: classicHints(ticket),
    }
  const evaluation = evaluateTicket(ticket, content.environment)
  if (evaluation.fixed)
    return {
      status: 'fixed',
      attempted,
      next:
        ticket.status === 'closed'
          ? 'Done: the ticket is closed.'
          : 'The systems show it is fixed. Tell the requester what was wrong and what you did, then close it.',
      hints: [],
    }
  const focus = evaluation.failing[0]
  const hints =
    focus.condition.type === 'device-up' ||
    focus.condition.type === 'service-running' ||
    focus.condition.type === 'can-reach' ||
    focus.condition.type === 'dns-record'
      ? networkHints(focus, content)
      : directoryHints(focus, ticket, content)
  return {
    status: 'working',
    focus,
    attempted,
    next: `Still to fix: ${focus.label}. ${evaluation.failing.length > 1 ? `(${evaluation.failing.length} checks still fail.)` : ''}`.trim(),
    hints,
  }
}

/** The player opens the next hint on a ticket (counted, and kept in its history). */
export function revealHint(
  content: TicketsContent,
  id: string,
  when: Moment,
): TicketsContent {
  return {
    ...content,
    tickets: content.tickets.map((ticket) => {
      if (ticket.id !== id || ticket.status === 'closed') return ticket
      const guidance = guidanceFor(ticket, content)
      const used = ticket.hintsUsed ?? 0
      const hint = guidance.hints[used]
      if (!hint) return ticket
      return {
        ...ticket,
        hintsUsed: used + 1,
        activity: [
          ...ticket.activity,
          {
            at: when.at,
            time: when.time,
            kind: 'hint' as const,
            text: `Hint ${hint.level} of ${guidance.hints.length} opened: ${hint.title}.`,
          },
        ].slice(-200),
      }
    }),
  }
}
