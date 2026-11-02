import { describe, expect, it } from 'vitest'
import { CAREERS } from '../content/careers'
import { getCase } from '../content/cases'
import { CaseSchema, type Case } from '../content/cases/schema'
import { CASE_VARIANTS } from '../content/cases/variants'
import { CASES } from '../content/cases'
import { HOURS } from '../content/workday'
import { modelAnswers } from './caseModel'
import {
  applyVariant,
  caseFor,
  caseInVariant,
  ORIGINAL,
  pickVariant,
  variantFor,
} from './caseVariants'
import { newProfileData, type ProfileData } from './career'
import { arriveCase, caseContext, gradeCase, NO_AUTHORITY } from './cases'
import { caseContact } from './mailSender'

const ALL = Object.entries(CASE_VARIANTS).flatMap(([caseId, variants]) =>
  variants.map((variant) => ({ caseId, variant, def: getCase(caseId)! })),
)

/** Every text in a case (not the IDs), for checking what a variant replaces. */
function texts(def: Case): string[] {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(def)
  return out
}

/** The parts of a case that decide how hard it is and how it is marked. */
function shape(def: Case) {
  return {
    passScore: def.passScore,
    deadlineHours: def.deadlineHours,
    steps: def.steps.map((s) => ({
      id: s.id,
      kind: s.kind,
      points: s.points,
      ...(s.kind === 'review' ? { issues: s.findings.map((f) => f.issue) } : {}),
      ...(s.kind === 'decide' ? { verdicts: s.options.map((o) => o.verdict) } : {}),
      ...(s.kind === 'figure' ? { tolerance: s.tolerance } : {}),
      ...(s.kind === 'approve'
        ? { requests: s.requests.map((r) => [r.amount, !!r.policyBreach, r.department]) }
        : {}),
      ...(s.kind === 'reply'
        ? { mentions: s.mentions.length, minWords: s.minWords }
        : {}),
    })),
  }
}

describe('case variants', () => {
  it('belong to real cases, with unique IDs', () => {
    for (const [caseId, variants] of Object.entries(CASE_VARIANTS)) {
      expect(getCase(caseId), caseId).toBeDefined()
      const ids = variants.map((v) => v.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).not.toContain(ORIGINAL)
    }
  })

  it.each(ALL.map((a) => [`${a.caseId} ~ ${a.variant.id}`, a] as const))(
    '%s: changes only what exists, keeps the marking, and is fully solvable',
    (_, { def, variant }) => {
      const all = texts(def).join('\n')
      for (const [from] of variant.text) expect(all, `text "${from}"`).toContain(from)
      for (const [from] of variant.exact ?? [])
        expect(texts(def), `cell "${from}"`).toContain(from)
      const answers = def.steps.flatMap((s) =>
        s.kind === 'figure'
          ? [s.answer]
          : s.kind === 'approve'
            ? s.requests.map((r) => r.amount)
            : [],
      )
      for (const [from] of variant.numbers ?? []) expect(answers).toContain(from)

      const varied = applyVariant(def, variant)
      // Still a valid case, and exactly as hard: same steps, marks and verdicts.
      expect(() => CaseSchema.parse(varied)).not.toThrow()
      expect(varied.id).toBe(def.id)
      expect(shape(varied)).toEqual(
        variant.numbers
          ? shape(applyVariant(def, { id: 'x', text: [], numbers: variant.numbers }))
          : shape(def),
      )
      expect(texts(varied).join('\n')).not.toBe(all)

      // The variant's own answers score full marks.
      expect(gradeCase(varied, modelAnswers(varied, NO_AUTHORITY)).score).toBe(100)
      // When the figures change, the original's answers no longer do.
      if (variant.numbers?.length)
        expect(gradeCase(varied, modelAnswers(def, NO_AUTHORITY)).score).toBeLessThan(100)
    },
  )

  it('vary at least four cases in every career, at least two of them in their figures', () => {
    for (const career of CAREERS) {
      const varied = Object.keys(CASE_VARIANTS).filter(
        (id) => getCase(id)!.careerId === career.id,
      )
      const figures = varied.filter((id) =>
        CASE_VARIANTS[id].some((v) => v.numbers?.length),
      )
      expect(varied.length, career.id).toBeGreaterThanOrEqual(4)
      expect(figures.length, career.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('are chosen by the save’s seed: the same seed always gives the same variant', () => {
    expect(pickVariant(0, 'fa-short-delivery')).toBe(ORIGINAL)
    expect(pickVariant(17, 'fa-short-delivery')).toBe(
      pickVariant(17, 'fa-short-delivery'),
    )
    expect(pickVariant(17, 'fa-assignment-without-variants')).toBe(ORIGINAL)
    const seen = new Set(
      Array.from({ length: 200 }, (_, i) => pickVariant(i + 1, 'fa-short-delivery')),
    )
    expect(seen).toEqual(new Set([ORIGINAL, 'brightline']))
  })
})

describe('a case arriving in a variant', () => {
  function profileWithSeed(seed: number): ProfileData {
    const base = newProfileData('Alex', 1, 'office-admin-finance', seed)
    return { ...base, work: { ...base.work, minute: HOURS.start + 60 } }
  }
  const seed = Array.from({ length: 50 }, (_, i) => i + 1).find(
    (s) => pickVariant(s, 'fa-short-delivery') === 'brightline',
  )!

  it('keeps its variant, shows it everywhere, and grades against it', () => {
    const def = getCase('fa-short-delivery')!
    const arrived = arriveCase(profileWithSeed(seed), def, 1)
    expect(arrived.work.cases[def.id]?.variant).toBe('brightline')
    const mail = arrived.inbox.at(-1)!
    expect(mail.subject).toContain('BLS-7716')
    expect(mail.from).toBe('case:fa-short-delivery~brightline')
    expect(caseContact(mail.from.slice(5))?.name).toBe('Dana Whitfield')

    const shown = caseFor(arrived, def.id)!
    expect(shown.from.organisation).toBe('Brightline Supplies')
    const owed = shown.steps.find((s) => s.id === 'owed')
    expect(owed?.kind === 'figure' && owed.answer).toBe(576)
    expect(gradeCase(shown, modelAnswers(shown, caseContext(arrived))).score).toBe(100)

    // A later change of seed does not change a case that has already arrived.
    const reseeded: ProfileData = {
      ...arrived,
      work: { ...arrived.work, record: { ...arrived.work.record, seed: 0 } },
    }
    expect(caseFor(reseeded, def.id)?.from.name).toBe('Dana Whitfield')
  })

  it('an old case with no variant recorded is the original', () => {
    const def = getCase('fa-short-delivery')!
    const arrived = arriveCase(profileWithSeed(0), def, 1)
    expect(arrived.work.cases[def.id]?.variant).toBeUndefined()
    expect(caseFor(arrived, def.id)).toBe(def)
    expect(caseInVariant(def.id, 'no-such-variant')).toBe(def)
  })
})

describe('variants never contradict themselves', () => {
  it.each(ALL.map((a) => [`${a.caseId} ~ ${a.variant.id}`, a] as const))(
    '%s: the original answer appears nowhere in the varied text',
    (_, { def, variant }) => {
      const varied = texts(applyVariant(def, variant)).join('\n')
      for (const [from, to] of variant.numbers ?? []) {
        if (from === to) continue
        const forms = [String(from), from.toLocaleString('en-GB')]
        for (const form of new Set(forms)) {
          const escaped = form.replace(/[.,]/g, (c) => `\\${c}`)
          // The number on its own: not part of a longer number such as 1,250 or 12.5.
          const standalone = new RegExp(`(?<![\\d.,])${escaped}(?![\\d]|[.,]\\d)`)
          expect(varied, `“${form}” is still in the text`).not.toMatch(standalone)
        }
      }
    },
  )

  it('a follow-up continues in the variant of the case it follows', () => {
    const base = getCase('wf-fa-purchase-order')!
    const followUp = CASES.find((c) => c.trigger.afterCase === base.id)!
    // Temporary variants of both, with the same name.
    CASE_VARIANTS[base.id] = [{ id: 'linked', text: [['Helen', 'Hanna']] }]
    CASE_VARIANTS[followUp.id] = [
      { id: 'linked', text: [['Helen', 'Hanna']] },
      { id: 'other', text: [['Helen', 'Holly']] },
    ]
    try {
      const seed = Array.from({ length: 200 }, (_, i) => i + 1).find(
        (s) =>
          pickVariant(s, base.id) === 'linked' &&
          pickVariant(s, followUp.id) !== 'linked',
      )!
      const start = newProfileData('Alex', 1, base.careerId, seed)
      const arrived = arriveCase(
        { ...start, work: { ...start.work, minute: HOURS.start + 60 } },
        base,
        1,
      )
      expect(arrived.work.cases[base.id]?.variant).toBe('linked')
      const done: ProfileData = {
        ...arrived,
        work: {
          ...arrived.work,
          cases: {
            ...arrived.work.cases,
            [base.id]: { ...arrived.work.cases[base.id]!, status: 'submitted' },
          },
        },
      }
      expect(variantFor(done, followUp.id)).toBe('linked')
      expect(arriveCase(done, followUp, 2).work.cases[followUp.id]?.variant).toBe(
        'linked',
      )
    } finally {
      delete CASE_VARIANTS[base.id]
      delete CASE_VARIANTS[followUp.id]
    }
  })

  it('keeps every variant that saves may already hold (they are never renamed or removed)', () => {
    const released: Record<string, string[]> = {
      'fa-short-delivery': ['brightline'],
      'fa-expense-query': ['train'],
      'acc-vat-request': ['kingsway'],
      'acc-statement-dispute': ['kestrel'],
      'it-ticket-chaser': ['novak'],
      'it-admin-rights': ['depot-planner'],
      'mkt-unhappy-results': ['lang-joinery'],
      'mkt-brief-change': ['ashdown'],
      'data-numbers-mismatch': ['smaller-quarter'],
      'data-extra-analysis': ['ten-regions'],
      'dev-vague-bug': ['friday-close'],
      'dev-feature-deadline': ['bigger-estimates'],
      'ops-acc-payment-run': ['new-suppliers'],
    }
    for (const [caseId, ids] of Object.entries(released))
      for (const id of ids)
        expect(
          CASE_VARIANTS[caseId]?.map((v) => v.id),
          caseId,
        ).toContain(id)
  })
})
