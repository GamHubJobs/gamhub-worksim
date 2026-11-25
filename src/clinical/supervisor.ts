/**
 * Grace Mbeki's feedback after a case: built from what the player actually
 * did, with the ward clock times from the event log, so every sentence can
 * be traced to the record. Compared with the player's earlier attempts at the
 * same case when there are any.
 */
import { clockText } from '../tools/clinical/model'
import { getAction } from './actions'
import type { Debrief } from './assessment'
import type { CaseDef } from './model'
import type { Attempt, Encounter } from './schema'

const at = (enc: Encounter, t: number) =>
  clockText((enc.startClock + Math.floor(t)) % (24 * 60))
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export function graceFeedback(
  def: CaseDef,
  enc: Encounter,
  d: Debrief,
  earlier: Attempt[],
): string[] {
  const lines: string[] = []
  const name = def.patient.callMe
  lines.push(
    d.passed
      ? d.score >= 90
        ? `That was excellent care for ${name}.`
        : `Good. ${name} was safe with you.`
      : d.harmful.length
        ? `We need to talk about ${name}.`
        : `${name} needed more from you today.`,
  )

  const praise = d.items
    .filter((i) => i.as === 'critical' && i.outcome === 'done' && i.t !== null)
    .sort((a, b) => a.t! - b.t!)[0]
  if (praise)
    lines.push(
      `At ${at(enc, praise.t!)} you chose to ${lower(praise.label)}. ${praise.why}`,
    )

  const { at: worse, escalated, delay } = d.deterioration
  if (worse !== null && escalated !== null)
    lines.push(
      delay! <= 5
        ? `${name} got worse at ${at(enc, worse)} and I had a call ${delay === 0 ? 'straight away' : `${delay} minute${delay === 1 ? '' : 's'} later`}. That is exactly what I want on this ward.`
        : `${name} got worse at ${at(enc, worse)}, but nobody qualified heard until ${at(enc, escalated)}. ${delay} minutes is too long: if you are worried, say so straight away.`,
    )
  if (worse !== null && escalated === null)
    lines.push(
      `${name} got worse at ${at(enc, worse)} and nobody qualified was told. That is the one thing I need every time.`,
    )

  const harmful = d.harmful[0]
  if (harmful)
    lines.push(
      `At ${at(enc, harmful.t!)} you chose to ${lower(harmful.label)}. ${harmful.why}`,
    )
  const missed = d.criticalMissed[0]
  if (missed) lines.push(`You didn't ${lower(missed.label)}. ${missed.why}`)
  const late = d.items.find((i) => i.outcome === 'late')
  if (late && !missed)
    lines.push(
      `You did ${lower(late.label)} at ${at(enc, late.t!)}, which was later than I'd like. ${late.why}`,
    )

  if (d.referred.length) {
    const label = getAction(d.referred[0])?.label ?? d.referred[0]
    lines.push(
      `You asked a nurse rather than trying to "${lower(label)}" yourself. Knowing where your role ends keeps patients safe.`,
    )
  }
  if (d.conduct.length)
    lines.push(
      'And leave diagnoses to the doctors: tell the patient what you will do, not what you think they have.',
    )
  if (d.documentation.missing.length && def.documentation.length)
    lines.push(
      `Your notes didn't mention ${d.documentation.missing.slice(0, 2).join(' or ')}. If it isn't written down, the next shift won't know.`,
    )

  const before = earlier.filter((a) => a.caseId === def.id)
  if (before.length) {
    const last = before.at(-1)!
    const best = Math.max(...before.map((a) => a.score))
    lines.push(
      d.score > best
        ? `${d.score}%: your best on this case yet (up from ${best}%).`
        : d.score > last.score
          ? `${d.score}%, up from ${last.score}% last time.`
          : `${d.score}% this time; your best is ${best}%. Read the debrief and try again.`,
    )
  }

  lines.push(
    d.passed
      ? enc.difficulty === 'expert'
        ? 'Help the newer staff with this one.'
        : 'Try it at the next difficulty when you are ready.'
      : 'Go through the debrief with the tutor, then try it again.',
  )
  return lines
}
