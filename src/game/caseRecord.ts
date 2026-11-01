/**
 * The written record of a case: what was asked, the evidence, what the
 * player decided at each step, how it was judged and why. It is kept in the
 * portfolio as the evidence of the work (a frozen document).
 */
import { bullets, docContent, h, p } from '../apps/docs/templates'
import type { Case, CaseStep } from '../content/cases/schema'
import type { DocContent } from '../persistence/schemas'
import { answerFor, type CaseResult } from './cases'

const DECISIONS = { approve: 'Approve', reject: 'Reject', escalate: 'Escalate' } as const

/** The player's answer to a step, in words. */
export function describeAnswer(step: CaseStep, raw: unknown): string[] {
  switch (step.kind) {
    case 'review': {
      const marked = new Set(answerFor('review', raw) ?? [])
      const issues = step.findings.filter((f) => marked.has(f.id)).map((f) => f.text)
      return issues.length > 0 ? issues.map((t) => `Ticked: ${t}`) : ['Nothing ticked.']
    }
    case 'figure':
      return [
        `Answer: ${answerFor('figure', raw) || '(none)'}${step.unit && step.unit !== '£' ? ` ${step.unit}` : ''}`,
      ]
    case 'decide': {
      const chosen = step.options.find((o) => o.id === answerFor('decide', raw))
      return [chosen ? `Decision: ${chosen.label}` : 'No decision made.']
    }
    case 'approve': {
      const decisions = answerFor('approve', raw) ?? {}
      return step.requests.map(
        (r) =>
          `${r.summary} (£${r.amount.toLocaleString('en-GB')}): ${decisions[r.id] ? DECISIONS[decisions[r.id]] : 'no decision'}`,
      )
    }
    case 'assign': {
      const chosen = answerFor('assign', raw) ?? {}
      return step.items.map(
        (i) =>
          `${i.label}: ${step.members.find((m) => m.id === chosen[i.id])?.name ?? 'not assigned'}`,
      )
    }
    case 'actions': {
      const owners = answerFor('actions', raw) ?? {}
      return step.items.map(
        (i) =>
          `${i.label}: ${step.people.find((p) => p.id === owners[i.id])?.name ?? 'no owner'}`,
      )
    }
    case 'reply':
      return [answerFor('reply', raw) || '(no reply written)']
    case 'handoff': {
      const given = answerFor('handoff', raw) ?? {}
      return step.fields.map((f) => `${f.label}: ${given[f.id] || '(blank)'}`)
    }
    case 'document':
      return [`${step.deliverable.title} (attached to this record)`]
  }
}

export function caseRecordContent(
  def: Case,
  answers: Record<string, unknown>,
  result: CaseResult,
  player: string,
): DocContent {
  return docContent([
    h(1, `Case record: ${def.title}`),
    p(
      `From ${def.from.name}, ${def.from.role}, ${def.from.organisation}. Handled by ${player}. Result: ${result.score}% (${result.rating}).`,
    ),
    h(2, 'What was asked'),
    p(def.summary),
    bullets(def.objectives),
    h(2, 'Evidence examined'),
    bullets(def.evidence.map((e) => e.title)),
    ...def.steps.flatMap((step) => {
      const graded = result.steps.find((s) => s.id === step.id)
      return [
        h(2, step.title),
        p(step.prompt),
        bullets(describeAnswer(step, answers[step.id])),
        p(
          graded
            ? `Assessment: ${graded.earned} of ${graded.points} points.${graded.notes.length > 0 ? '' : ' All correct.'}`
            : 'Not assessed.',
        ),
        ...(graded && graded.notes.length > 0 ? [bullets(graded.notes)] : []),
      ]
    }),
    h(2, 'Why it matters'),
    p(def.whyItMatters),
  ])
}
