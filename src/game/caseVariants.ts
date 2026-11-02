/**
 * Case variants: the same case with different people, organisations, figures
 * and circumstances, so a case is not the same in every career save.
 *
 * A variant lists text replacements (applied to every text in the case:
 * evidence, steps, options, the model reply…) and number replacements (applied
 * to the answers and amounts that grading uses). The steps, points and pass
 * mark never change, so a variant is never easier: only the scenario differs,
 * and the answers follow it. Tests check every variant end to end.
 *
 * Which variant a save sees is chosen from the save's seed and the case ID
 * when the case arrives, and stored with the case, so it never changes after.
 */
import { getCase } from '../content/cases'
import type { Case } from '../content/cases/schema'
import { CASE_VARIANTS, type CaseVariant } from '../content/cases/variants'
import type { ProfileData } from './career'

/** The original wording. */
export const ORIGINAL = 'original'

/** Fields that identify things (never shown as prose), so they are never rewritten. */
const KEEP = new Set([
  'id',
  'careerId',
  'kind',
  'projectId',
  'personId',
  'verdict',
  'outcome',
  'step',
  'afterCase',
  'afterAssignment',
  'phase',
  'best',
  'owner',
  'department',
  'skills',
])
/** Number fields that hold answers or amounts, which follow the variant's figures. */
const FIGURES = new Set(['answer', 'amount'])

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Replaces every pair in one pass, longest first, so replacements never chain
 * ("£150,000" → "£125,000" and "£180,000" → "£150,000" both work).
 */
function replacer(variant: CaseVariant): (text: string) => string {
  const pairs = new Map(variant.text)
  const exact = new Map(variant.exact ?? [])
  const pattern =
    pairs.size === 0
      ? null
      : new RegExp(
          [...pairs.keys()]
            .sort((a, b) => b.length - a.length)
            .map(escape)
            .join('|'),
          'g',
        )
  return (text) =>
    exact.get(text) ?? (pattern ? text.replace(pattern, (m) => pairs.get(m)!) : text)
}

export function applyVariant(def: Case, variant: CaseVariant): Case {
  const numbers = new Map(variant.numbers ?? [])
  const replaceText = replacer(variant)
  const walk = (value: unknown, key: string | null): unknown => {
    if (key !== null && KEEP.has(key)) return value
    if (typeof value === 'string') return replaceText(value)
    if (typeof value === 'number')
      return key !== null && FIGURES.has(key) && numbers.has(value)
        ? numbers.get(value)
        : value
    if (Array.isArray(value)) return value.map((v) => walk(v, null))
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, k)]))
    return value
  }
  return walk(def, null) as Case
}

/** A small, stable hash, so the same seed and case always give the same variant. */
function hash(text: string): number {
  let h = 2166136261
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  return h >>> 0
}

/** The variant a save with this seed gets for a case (seed 0 always gets the original). */
export function pickVariant(seed: number, caseId: string): string {
  const variants = CASE_VARIANTS[caseId] ?? []
  if (seed === 0 || variants.length === 0) return ORIGINAL
  const index = hash(`${seed}:${caseId}`) % (variants.length + 1)
  return index === 0 ? ORIGINAL : variants[index - 1].id
}

const cache = new Map<string, Case>()

/** A case in one of its variants (unknown variants give the original). */
export function caseInVariant(caseId: string, variantId = ORIGINAL): Case | undefined {
  const def = getCase(caseId)
  if (!def || variantId === ORIGINAL) return def
  const variant = CASE_VARIANTS[caseId]?.find((v) => v.id === variantId)
  if (!variant) return def
  const key = `${caseId}~${variantId}`
  let varied = cache.get(key)
  if (!varied) {
    varied = applyVariant(def, variant)
    cache.set(key, varied)
  }
  return varied
}

/**
 * The variant a case will arrive in for this save. A follow-up to an earlier
 * case (a hand-off coming back, the next stage of a programme) continues in
 * the earlier case's variant when it has one of the same name, so the people
 * and figures never contradict what the player has already seen.
 */
export function variantFor(profile: ProfileData, caseId: string): string {
  const def = getCase(caseId)
  const before = def?.trigger.afterCase
    ? profile.work.cases[def.trigger.afterCase]
    : undefined
  if (before) {
    const inherited = before.variant ?? ORIGINAL
    const own = CASE_VARIANTS[caseId] ?? []
    if (inherited === ORIGINAL || own.some((v) => v.id === inherited)) return inherited
  }
  return pickVariant(profile.work.record.seed, caseId)
}

/**
 * The case as this save sees it: the variant it arrived in, or (before it
 * arrives) the one the save's seed will pick.
 */
export function caseFor(profile: ProfileData, caseId: string): Case | undefined {
  const progress = profile.work.cases[caseId]
  const variant = progress ? (progress.variant ?? ORIGINAL) : variantFor(profile, caseId)
  return caseInVariant(caseId, variant)
}
