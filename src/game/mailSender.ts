/** Who a message is from: a colleague, or an outside contact of a case. */
import { getCase } from '../content/cases'
import type { Person } from '../content/company'
import { getPerson } from '../content/departments'
import type { MailMessage } from '../persistence/schemas'

/** An outside contact (client, supplier) shown like a colleague in Mail. */
export function caseContact(caseId: string): Person | null {
  const def = getCase(caseId)
  if (!def) return null
  const { name, role, organisation } = def.from
  const domain = organisation
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
  return {
    id: `case:${caseId}`,
    name,
    role: `${role}, ${organisation}`,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${domain}.example`,
    initials: name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    color: 'bg-slate-500',
    startingTrust: 50,
    personality: '',
  }
}

export function personFor(id: string): Person {
  return id.startsWith('case:')
    ? (caseContact(id.slice(5)) ?? getPerson(id))
    : getPerson(id)
}

export function senderOf(mail: MailMessage): Person {
  return personFor(mail.kind === 'sent' ? (mail.to ?? 'manager') : mail.from)
}
