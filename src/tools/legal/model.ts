/**
 * Matter Desk: what each action does, as pure functions. Each returns the
 * new state and the problems that stopped it (empty when it worked); every
 * action is written to the audit log.
 *
 * The rules teach professional practice (conflicts, client identity,
 * engagement terms, deadlines, good law, privilege, accurate time). The
 * jurisdiction is fictional and simplified; this is not legal advice.
 */
import { billableHours } from './jurisdiction'
import type { Clause, DiscoveryDoc, LegalState, Matter } from './schema'

export interface Result {
  state: LegalState
  problems: string[]
}

const ok = (state: LegalState): Result => ({ state, problems: [] })
const fail = (state: LegalState, ...problems: string[]): Result => ({ state, problems })

function log(
  state: LegalState,
  action: string,
  matterId: string | null,
  detail = '',
): LegalState {
  return {
    ...state,
    audit: [...state.audit, { at: state.today, action, matterId, detail }].slice(-1000),
  }
}

export const matterById = (s: LegalState, id: string) =>
  s.matters.find((m) => m.id === id)
export const clientById = (s: LegalState, id: string) =>
  s.clients.find((c) => c.id === id)

const updateMatter = (
  s: LegalState,
  id: string,
  change: (m: Matter) => Matter,
): LegalState => ({
  ...s,
  matters: s.matters.map((m) => (m.id === id ? change(m) : m)),
})

const norm = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(ltd|limited|llp|plc|co|company|inc)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// ---------------------------------------------------------------------------
// Conflicts and intake
// ---------------------------------------------------------------------------

export interface ConflictHit {
  name: string
  relation: 'client' | 'former-client' | 'adverse'
  matter: string
  /** Acting would be against a current client: the firm must decline. */
  blocking: boolean
}

/**
 * Searches the firm's records for the new matter's client and the other side.
 * Acting against a current client is a conflict that stops the matter; the
 * other side already being a client (or the client having been on the other
 * side) needs care, and is shown.
 */
export function conflictHits(s: LegalState, matterId: string): ConflictHit[] {
  const matter = matterById(s, matterId)
  if (!matter) return []
  const client = clientById(s, matter.clientId)
  const hits: ConflictHit[] = []
  const records = [
    ...s.parties,
    // Current clients of other matters.
    ...s.matters
      .filter((m) => m.id !== matterId && m.status === 'open')
      .flatMap((m) => [
        {
          name: clientById(s, m.clientId)?.name ?? '',
          relation: 'client' as const,
          matter: m.id,
        },
        ...m.opposing.map((o) => ({
          name: o,
          relation: 'adverse' as const,
          matter: m.id,
        })),
      ]),
  ]
  const seen = new Set<string>()
  for (const name of matter.opposing) {
    for (const r of records.filter((r) => norm(r.name) === norm(name))) {
      const key = `${r.name}|${r.relation}|${r.matter}`
      if (seen.has(key)) continue
      seen.add(key)
      hits.push({
        name: r.name,
        relation: r.relation,
        matter: r.matter,
        blocking: r.relation === 'client',
      })
    }
  }
  if (client) {
    for (const r of records.filter(
      (r) => norm(r.name) === norm(client.name) && r.relation === 'adverse',
    )) {
      const key = `${r.name}|${r.relation}|${r.matter}`
      if (seen.has(key)) continue
      seen.add(key)
      hits.push({ name: r.name, relation: r.relation, matter: r.matter, blocking: false })
    }
  }
  return hits
}

export function runConflictCheck(s: LegalState, matterId: string): Result {
  const matter = matterById(s, matterId)
  if (!matter) return fail(s, 'There is no such matter.')
  const hits = conflictHits(s, matterId)
  return ok(
    log(
      updateMatter(s, matterId, (m) => ({ ...m, conflictChecked: true })),
      'Conflict check',
      matterId,
      hits.length
        ? hits.map((h) => `${h.name} (${h.relation}, ${h.matter})`).join('; ')
        : 'No matches',
    ),
  )
}

export function verifyClient(s: LegalState, clientId: string, document: string): Result {
  const client = clientById(s, clientId)
  if (!client) return fail(s, 'There is no such client.')
  if (document.trim().length < 5)
    return fail(
      s,
      'Record which document you checked (e.g. “passport” or “company register extract”).',
    )
  return ok(
    log(
      {
        ...s,
        clients: s.clients.map((c) =>
          c.id === clientId ? { ...c, idVerified: true, idDocument: document.trim() } : c,
        ),
      },
      'Verified client identity',
      null,
      `${client.name}: ${document.trim()}`,
    ),
  )
}

export function sendEngagement(s: LegalState, clientId: string): Result {
  const client = clientById(s, clientId)
  if (!client) return fail(s, 'There is no such client.')
  if (!client.idVerified)
    return fail(s, 'Verify the client’s identity before sending the engagement letter.')
  return ok(
    log(
      {
        ...s,
        clients: s.clients.map((c) =>
          c.id === clientId ? { ...c, engagementSent: true } : c,
        ),
      },
      'Sent engagement letter',
      null,
      client.name,
    ),
  )
}

/** Opens a matter: only after a clear conflict check, a verified client and an engagement letter. */
export function openMatter(s: LegalState, matterId: string): Result {
  const matter = matterById(s, matterId)
  if (!matter) return fail(s, 'There is no such matter.')
  if (matter.status !== 'intake') return fail(s, 'Only a matter at intake can be opened.')
  if (!matter.conflictChecked) return fail(s, 'Run the conflict check first.')
  if (conflictHits(s, matterId).some((h) => h.blocking))
    return fail(
      s,
      'The conflict check found a current client on the other side. The firm cannot act: decline the matter.',
    )
  const client = clientById(s, matter.clientId)
  if (!client?.idVerified) return fail(s, 'Verify the client’s identity first.')
  if (!client.engagementSent)
    return fail(
      s,
      'Send the engagement letter first, so the client knows the scope and the fees.',
    )
  return ok(
    log(
      updateMatter(s, matterId, (m) => ({ ...m, status: 'open' })),
      'Opened matter',
      matterId,
    ),
  )
}

export function declineMatter(s: LegalState, matterId: string, reason: string): Result {
  const matter = matterById(s, matterId)
  if (!matter || matter.status !== 'intake')
    return fail(s, 'Only a matter at intake can be declined.')
  if (reason.trim().length < 10) return fail(s, 'Record why the firm cannot act.')
  return ok(
    log(
      updateMatter(s, matterId, (m) => ({
        ...m,
        status: 'declined',
        declineReason: reason.trim(),
      })),
      'Declined matter',
      matterId,
      reason.trim(),
    ),
  )
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export function addKeyDate(
  s: LegalState,
  matterId: string,
  label: string,
  date: string,
): Result {
  const matter = matterById(s, matterId)
  if (!matter) return fail(s, 'There is no such matter.')
  if (!label.trim()) return fail(s, 'Say what the date is for.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(s, 'Enter the date as YYYY-MM-DD.')
  const id = `kd${matter.keyDates.length + 1}`
  return ok(
    log(
      updateMatter(s, matterId, (m) => ({
        ...m,
        keyDates: [...m.keyDates, { id, label: label.trim(), date }],
      })),
      'Added key date',
      matterId,
      `${label.trim()}: ${date}`,
    ),
  )
}

export function removeKeyDate(s: LegalState, matterId: string, id: string): Result {
  if (!matterById(s, matterId)) return fail(s, 'There is no such matter.')
  return ok(
    log(
      updateMatter(s, matterId, (m) => ({
        ...m,
        keyDates: m.keyDates.filter((k) => k.id !== id),
      })),
      'Removed key date',
      matterId,
    ),
  )
}

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

export function searchLibrary(s: LegalState, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return s.library
  return s.library.filter((a) => {
    const text =
      `${a.citation} ${a.title} ${a.summary} ${a.topics.join(' ')}`.toLowerCase()
    return words.every((w) => text.includes(w))
  })
}

export function saveAuthority(
  s: LegalState,
  matterId: string,
  authorityId: string,
): Result {
  const matter = matterById(s, matterId)
  const authority = s.library.find((a) => a.id === authorityId)
  if (!matter || !authority) return fail(s, 'Choose a matter and an authority.')
  if (matter.authorities.includes(authorityId))
    return fail(s, 'It is already saved to this matter.')
  return ok(
    log(
      updateMatter(s, matterId, (m) => ({
        ...m,
        authorities: [...m.authorities, authorityId],
      })),
      'Saved authority',
      matterId,
      authority.citation,
    ),
  )
}

export function removeAuthority(
  s: LegalState,
  matterId: string,
  authorityId: string,
): Result {
  if (!matterById(s, matterId)) return fail(s, 'There is no such matter.')
  return ok(
    log(
      updateMatter(s, matterId, (m) => ({
        ...m,
        authorities: m.authorities.filter((a) => a !== authorityId),
      })),
      'Removed authority',
      matterId,
    ),
  )
}

// ---------------------------------------------------------------------------
// Contract review
// ---------------------------------------------------------------------------

export function reviewClause(
  s: LegalState,
  contractId: string,
  clauseId: string,
  decision: NonNullable<Clause['decision']>,
  comment: string,
): Result {
  const contract = s.contracts.find((c) => c.id === contractId)
  const clause = contract?.clauses.find((c) => c.id === clauseId)
  if (!contract || !clause) return fail(s, 'There is no such clause.')
  if (decision !== 'accept' && comment.trim().length < 10)
    return fail(s, 'Explain what must change and why, for the other side.')
  return ok(
    log(
      {
        ...s,
        contracts: s.contracts.map((c) =>
          c.id === contractId
            ? {
                ...c,
                clauses: c.clauses.map((cl) =>
                  cl.id === clauseId ? { ...cl, decision, comment: comment.trim() } : cl,
                ),
              }
            : c,
        ),
      },
      `Clause ${decision}`,
      contract.matterId,
      clause.heading,
    ),
  )
}

// ---------------------------------------------------------------------------
// Time and billing
// ---------------------------------------------------------------------------

export function logTime(
  s: LegalState,
  matterId: string,
  minutes: number,
  description: string,
  billable: boolean,
): Result {
  const matter = matterById(s, matterId)
  if (!matter) return fail(s, 'Choose the matter.')
  if (matter.status !== 'open') return fail(s, 'Time is recorded only on an open matter.')
  if (!Number.isInteger(minutes) || minutes < 1)
    return fail(s, 'Enter the minutes spent.')
  if (description.trim().length < 8)
    return fail(s, 'Describe the work, so the client can see what they pay for.')
  const entry = {
    id: `t${s.time.length + 1}`,
    matterId,
    date: s.today,
    minutes,
    description: description.trim(),
    billable,
    invoiced: false,
  }
  return ok(
    log(
      { ...s, time: [...s.time, entry] },
      'Recorded time',
      matterId,
      `${minutes} min${billable ? '' : ' (not billable)'}`,
    ),
  )
}

/** What a matter's unbilled, billable time comes to. */
export function unbilled(
  s: LegalState,
  matterId: string,
): { hours: number; total: number; entries: string[] } {
  const matter = matterById(s, matterId)
  const entries = s.time.filter(
    (t) => t.matterId === matterId && t.billable && !t.invoiced,
  )
  const hours =
    Math.round(entries.reduce((sum, t) => sum + billableHours(t.minutes), 0) * 10) / 10
  return {
    hours,
    total: Math.round(hours * (matter?.rate ?? 0) * 100) / 100,
    entries: entries.map((t) => t.id),
  }
}

export function createInvoice(s: LegalState, matterId: string): Result {
  const { hours, total, entries } = unbilled(s, matterId)
  if (!entries.length) return fail(s, 'There is no billable time to invoice.')
  const invoice = {
    id: `INV-${s.invoices.length + 101}`,
    matterId,
    date: s.today,
    entries,
    hours,
    total,
  }
  return ok(
    log(
      {
        ...s,
        invoices: [...s.invoices, invoice],
        time: s.time.map((t) => (entries.includes(t.id) ? { ...t, invoiced: true } : t)),
      },
      'Raised invoice',
      matterId,
      `${invoice.id}: ${hours} h, £${total.toFixed(2)}`,
    ),
  )
}

// ---------------------------------------------------------------------------
// Document review (e-discovery)
// ---------------------------------------------------------------------------

export function tagDocument(
  s: LegalState,
  docId: string,
  tag: NonNullable<DiscoveryDoc['tag']>,
  reason = '',
): Result {
  const doc = s.documents.find((d) => d.id === docId)
  if (!doc) return fail(s, 'There is no such document.')
  if (tag === 'privileged' && reason.trim().length < 10)
    return fail(
      s,
      'Record the basis for privilege (e.g. “legal advice from the firm to the client”).',
    )
  return ok(
    log(
      {
        ...s,
        documents: s.documents.map((d) =>
          d.id === docId ? { ...d, tag, reason: reason.trim() } : d,
        ),
      },
      `Tagged ${tag}`,
      doc.matterId,
      doc.title,
    ),
  )
}
