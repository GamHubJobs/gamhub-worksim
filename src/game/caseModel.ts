/** Model answers for cases: what full marks look like (used by tests and checks). */
import type { Case } from '../content/cases/schema'
import { expectedDecision, NO_AUTHORITY, type CaseContext } from './cases'

/** The answers that should get full marks (document steps are tested on their own). */
export function modelAnswers(
  def: Case,
  context: CaseContext = NO_AUTHORITY,
): Record<string, unknown> {
  const answers: Record<string, unknown> = {}
  for (const step of def.steps) {
    switch (step.kind) {
      case 'review':
        answers[step.id] = step.findings.filter((f) => f.issue).map((f) => f.id)
        break
      case 'figure':
        answers[step.id] = String(step.answer)
        break
      case 'decide':
        answers[step.id] = step.options.find((o) => o.verdict === 'best')!.id
        break
      case 'approve':
        answers[step.id] = Object.fromEntries(
          step.requests.map((r) => [r.id, expectedDecision(r, context).decision]),
        )
        break
      case 'assign': {
        const load = new Map<string, number>()
        answers[step.id] = Object.fromEntries(
          step.items.map((item) => {
            const member = item.best.find((id) => {
              const capacity = step.members.find((m) => m.id === id)!.capacity
              return (load.get(id) ?? 0) < capacity
            })!
            load.set(member, (load.get(member) ?? 0) + 1)
            return [item.id, member]
          }),
        )
        break
      }
      case 'actions':
        answers[step.id] = Object.fromEntries(step.items.map((i) => [i.id, i.owner]))
        break
      case 'reply':
        answers[step.id] = step.model
        break
      case 'document':
        break
    }
  }
  return answers
}
