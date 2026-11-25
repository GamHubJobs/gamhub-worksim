/**
 * Good care, played automatically: every critical and recommended action as
 * soon as it is due, then the key questions and a note. Used as the model
 * answer for patient-case tasks and in the tests (it shows every case can be
 * passed). Deterministic.
 */
import { act, advance, finish, say, startEncounter } from './engine'
import type { CaseDef, Difficulty, Role } from './model'
import type { Encounter } from './schema'

export function goodCare(
  def: CaseDef,
  difficulty: Difficulty = 'intermediate',
  role: Role = 3,
  startClock = 9 * 60,
): Encounter {
  let enc = startEncounter(def, difficulty, role, startClock)
  const note = def.documentation.map((g) => g[0]).join(', ')
  enc = say(
    def,
    enc,
    `Hello, my name is Sam, I'm one of the healthcare assistants. Can you tell me your full name and date of birth? Is it okay if I check you over?`,
  ).enc
  const wanted = Object.entries(def.actions).filter(
    ([, a]) => a.as === 'critical' || a.as === 'recommended',
  )
  for (let guard = 0; guard < 60 && !enc.ended; guard++) {
    const reached = new Set(enc.phases.map((p) => p.id))
    const due = wanted
      .filter(([, a]) => !a.within?.from || reached.has(a.within.from))
      .filter(([id, a]) => {
        const since = a.within?.from
          ? enc.phases.find((p) => p.id === a.within!.from)!.t
          : 0
        return ![id, ...(a.alt ?? [])].some((x) =>
          (enc.done[x] ?? []).some((t) => t >= since),
        )
      })
      .filter(([id, a]) => !a.requires || enc.done[a.requires] || id === a.requires)
      .sort(([, a], [, b]) =>
        a.as === b.as
          ? (a.within?.minutes ?? 99) - (b.within?.minutes ?? 99)
          : a.as === 'critical'
            ? -1
            : 1,
      )
    if (!due.length) {
      const waiting = wanted.some(
        ([, a]) => a.within?.from && !reached.has(a.within.from),
      )
      if (!waiting) break
      enc = advance(def, enc, 2)
      continue
    }
    const [id] = due[0]
    if (
      id === 'consent' ||
      id === 'introduce' ||
      id === 'check-id' ||
      id === 'reassure'
    ) {
      enc = say(
        def,
        enc,
        id === 'reassure'
          ? "I understand, don't worry, I'm here and I'll get the nurse."
          : 'Is it okay if I help you with that?',
      ).enc
      enc = act(def, enc, id).enc
    } else
      enc = act(def, enc, id, `Situation and assessment: ${note}. Told the nurse.`).enc
  }
  for (const f of def.facts.filter((f) => f.key))
    if (!enc.ended) enc = say(def, enc, `Can I ask about ${f.topics[0]}?`).enc
  if (!enc.ended) enc = act(def, enc, 'write-note', `Note: ${note}.`).enc
  return finish(def, enc)
}
