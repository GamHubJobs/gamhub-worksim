import { describe, expect, it } from 'vitest'
import { ACTIONS, getAction } from './actions'
import { assess, history, toAttempt } from './assessment'
import { CASES, casesFor, getCase } from './cases'
import { act, advance, finish, say, startEncounter } from './engine'
import { DIFFICULTIES, type CaseDef, type Difficulty } from './model'
import { AttemptSchema, CasesStateSchema, EncounterSchema } from './schema'
import { goodCare } from './demo'
import { graceFeedback } from './supervisor'
import { hint, patientRequest, tutorAnswer, tutorRequest } from './tutor'

const at = (id: string) => getCase(id)!

const playWell = (def: CaseDef, difficulty: Difficulty = 'intermediate') =>
  goodCare(def, difficulty)

describe('the case library', () => {
  it('has at least 20 cases across every difficulty and several rooms', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(20)
    for (const d of DIFFICULTIES) expect(CASES.some((c) => c.difficulty === d)).toBe(true)
    expect(new Set(CASES.map((c) => c.room)).size).toBeGreaterThanOrEqual(4)
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length)
    expect(new Set(CASES.map((c) => c.patient.id)).size).toBe(CASES.length)
  })

  it.each(CASES.map((c) => [c.id, c] as const))('%s is well formed', (_id, def) => {
    const phases = new Set(def.phases.map((p) => p.id))
    expect(phases.has(def.start)).toBe(true)
    for (const r of def.rules) {
      for (const f of r.from) expect(phases.has(f), `${r.id} from ${f}`).toBe(true)
      expect(phases.has(r.to), `${r.id} to ${r.to}`).toBe(true)
      if (r.done) expect(getAction(r.done), r.done).toBeTruthy()
      if (r.notDone) expect(getAction(r.notDone.action), r.notDone.action).toBeTruthy()
      expect(r.after !== undefined || r.done || r.notDone, r.id).toBeTruthy()
    }
    for (const [id, a] of Object.entries(def.actions)) {
      expect(getAction(id), id).toBeTruthy()
      for (const x of a.alt ?? []) expect(getAction(x), x).toBeTruthy()
      if (a.requires) expect(getAction(a.requires)).toBeTruthy()
      if (a.within?.from)
        expect(phases.has(a.within.from), `${id} from ${a.within.from}`).toBe(true)
      // Nothing beyond a support worker's role can be required of them.
      expect(
        getAction(id)!.minRole,
        `${id} must be within a support role`,
      ).toBeLessThanOrEqual(3)
    }
    expect(Object.values(def.actions).some((a) => a.as === 'critical')).toBe(true)
    expect(new Set(def.facts.map((f) => f.id)).size).toBe(def.facts.length)
    for (const f of def.facts)
      for (const p of f.phases ?? [])
        expect(phases.has(p), `${f.id} phase ${p}`).toBe(true)
    expect(def.debrief.points.length).toBeGreaterThan(0)
    for (const p of def.phases)
      for (const k of Object.keys(p.findings ?? {})) expect(getAction(k), k).toBeTruthy()
  })

  it.each(CASES.map((c) => [c.id, c] as const))(
    '%s can be passed with good care',
    (_id, def) => {
      const enc = playWell(def)
      const d = assess(def, enc)
      expect(d.harmful).toEqual([])
      expect(d.criticalMissed.map((i) => i.action)).toEqual([])
      expect(d.passed, `${def.id}: ${d.score}% ${d.improvements.join(' | ')}`).toBe(true)
    },
  )

  it('offers each role the cases written for it', () => {
    expect(casesFor(0).every((c) => c.role === 0)).toBe(true)
    expect(casesFor(3).length).toBe(CASES.length)
    expect(casesFor(0)[0].difficulty).toBe('beginner')
  })
})

describe('the encounter engine', () => {
  it('moves the patient on by time, and on what is or is not done', () => {
    const def = at('postop-bleed')
    let enc = startEncounter(def, 'intermediate', 1, 600)
    expect(enc.phase).toBe('settled')
    enc = advance(def, enc, 8)
    expect(enc.phase).toBe('bleeding')
    expect(enc.log.some((e) => e.kind === 'patient' && /faint/i.test(e.text))).toBe(true)
    const ignored = advance(def, enc, 10)
    expect(ignored.phase).toBe('shocked')
    const told = act(
      def,
      enc,
      'tell-nurse',
      'Dan is faint, BP 96/58, pulse 112, dressing soaked',
    ).enc
    expect(told.phase).toBe('reviewed')
  })

  it('measures the true observations of the current stage', () => {
    const def = at('postop-bleed')
    let enc = advance(def, startEncounter(def, 'intermediate', 1, 600), 8)
    enc = act(def, enc, 'full-obs').enc
    const bp = enc.measurements.find((m) => m.measure === 'bp')!
    expect(bp.value).toBe('96/58 mmHg')
    expect(bp.phase).toBe('bleeding')
  })

  it('never does clinician actions: they are referred, and nothing changes', () => {
    const def = at('breathless')
    const enc = startEncounter(def, 'advanced', 3, 600)
    const step = act(def, enc, 'give-oxygen')
    expect(step.enc.done['give-oxygen']).toBeUndefined()
    expect(step.enc.referred['give-oxygen']).toBe(0)
    expect(step.enc.phase).toBe('breathless')
    expect(step.events[0].kind).toBe('referred')
    expect(step.events[0].text).toMatch(/registered clinician/)
    // Not penalised in the score
    expect(assess(def, finish(def, step.enc)).harmful).toEqual([])
  })

  it('refers actions above the player’s grade to a senior', () => {
    const def = at('chest-pain')
    const trainee = act(def, startEncounter(def, 'advanced', 0, 600), 'ecg')
    expect(trainee.enc.done.ecg).toBeUndefined()
    expect(trainee.events[0].text).toMatch(/Healthcare Support Trainee/)
    const hca = act(def, startEncounter(def, 'advanced', 1, 600), 'ecg')
    expect(hca.enc.done.ecg).toEqual([0])
  })

  it('reveals facts only when asked, and not from a patient who cannot say', () => {
    const def = at('chest-pain')
    let enc = startEncounter(def, 'advanced', 1, 600)
    expect(Object.keys(enc.asked)).toEqual([])
    const step = say(def, enc, 'When did the pain start?')
    expect(step.reply).toMatch(/twenty minutes/)
    enc = step.enc
    expect(enc.asked.when).toBe(0)
    expect(enc.asked.where).toBeUndefined()

    const confused = at('confused-fever')
    let c = startEncounter(confused, 'intermediate', 1, 600)
    const r = say(confused, c, 'Do you have any allergies?')
    expect(r.enc.asked.allergies).toBeUndefined()
    c = act(confused, r.enc, 'read-notes').enc
    expect(c.asked.allergies).toBeDefined()
    expect(c.log.some((e) => /Penicillin/.test(e.text))).toBe(true)
  })

  it('hears introductions, identity checks, consent, jargon and diagnosing', () => {
    const def = at('routine-obs')
    let enc = startEncounter(def, 'beginner', 0, 600)
    enc = say(
      def,
      enc,
      "Hi, my name is Sam and I'm one of the healthcare assistants.",
    ).enc
    enc = say(def, enc, 'Could you tell me your full name and date of birth?').enc
    enc = say(def, enc, 'Is it okay if I take your obs and sats?').enc
    enc = say(def, enc, "It's probably an infection.").enc
    expect(enc.done.introduce).toBeDefined()
    expect(enc.done['check-id']).toBeDefined()
    expect(enc.done.consent).toBeDefined()
    expect(enc.speech.jargon).toEqual(expect.arrayContaining(['obs', 'sats']))
    expect(enc.log.some((e) => e.kind === 'conduct')).toBe(true)
    const d = assess(def, finish(def, enc))
    expect(d.conduct.length).toBe(1)
    expect(d.jargon.length).toBe(2)
  })

  it('is deterministic: the same play gives the same record', () => {
    const def = at('sepsis-signs')
    expect(JSON.stringify(playWell(def))).toBe(JSON.stringify(playWell(def)))
  })

  it('ends at the time limit', () => {
    const def = at('routine-obs')
    const enc = advance(def, startEncounter(def, 'beginner', 0, 600), 999)
    expect(enc.ended?.reason).toBe('time')
    expect(act(def, enc, 'full-obs').events).toEqual([])
  })

  it('tracks specimens to the laboratory and their results', () => {
    const def = at('confused-fever')
    let enc = startEncounter(def, 'intermediate', 1, 600)
    enc = act(def, enc, 'collect-urine').enc
    enc = act(def, enc, 'send-specimen').enc
    expect(enc.specimens[0].sent).not.toBeNull()
    let r = act(def, enc, 'view-results')
    expect(r.events.some((e) => /results expected/.test(e.text))).toBe(true)
    r = act(def, advance(def, r.enc, 20), 'view-results')
    expect(r.events.some((e) => /nitrite/i.test(e.text))).toBe(true)
  })
})

describe('the assessment', () => {
  it('fails a harmful action and a missed critical one, with the reasons', () => {
    const def = at('nil-by-mouth')
    let enc = startEncounter(def, 'beginner', 0, 600)
    enc = act(def, enc, 'offer-drink').enc
    const d = assess(def, finish(def, enc))
    expect(d.passed).toBe(false)
    expect(d.harmful.map((i) => i.action)).toEqual(['offer-drink'])
    expect(d.criticalMissed.map((i) => i.action)).toEqual(
      expect.arrayContaining(['read-notes', 'reassure']),
    )
    expect(d.improvements.join(' ')).toMatch(/anaesthetic/)
  })

  it('marks late escalation down, and scores how fast a deterioration reached the nurse', () => {
    const def = at('postop-bleed')
    const quick = (() => {
      let e = advance(def, startEncounter(def, 'advanced', 1, 600), 8)
      e = act(def, e, 'tell-nurse', 'bleeding').enc
      return assess(def, finish(def, e))
    })()
    const slow = (() => {
      let e = advance(def, startEncounter(def, 'advanced', 1, 600), 17)
      e = act(def, e, 'tell-nurse', 'bleeding').enc
      return assess(def, finish(def, e))
    })()
    expect(quick.deterioration.delay).toBe(0)
    expect(slow.deterioration.delay).toBe(9)
    expect(quick.items.find((i) => i.action === 'tell-nurse')!.outcome).toBe('done')
    expect(slow.items.find((i) => i.action === 'tell-nurse')!.outcome).toBe('late')
    const r = (d: typeof quick) => d.rubric.find((x) => x.id === 'escalation')!.score!
    expect(r(quick)).toBeGreaterThan(r(slow))
  })

  it('counts an alternative action (the emergency buzzer for telling the nurse)', () => {
    const def = at('fall-on-ward')
    const enc = act(def, startEncounter(def, 'intermediate', 0, 600), 'tell-nurse').enc
    expect(
      assess(def, finish(def, enc)).items.find((i) => i.action === 'emergency-call')!
        .outcome,
    ).toBe('done')
  })

  it('treats observations done before consent as a fault when the patient refused', () => {
    const def = at('refuses-obs')
    const pushy = assess(
      def,
      finish(def, act(def, startEncounter(def, 'intermediate', 1, 600), 'full-obs').enc),
    )
    expect(pushy.harmful.map((i) => i.action)).toEqual(['full-obs'])
    let polite = say(
      def,
      startEncounter(def, 'intermediate', 1, 600),
      'Would you mind if I did your observations? Is it okay?',
    ).enc
    polite = act(def, polite, 'full-obs').enc
    expect(assess(def, finish(def, polite)).harmful).toEqual([])
  })

  it('difficulty changes the time allowed and the pass mark, never the facts', () => {
    const def = at('chest-pain')
    const late = (d: Difficulty) => {
      let e = advance(def, startEncounter(def, d, 1, 600), 4)
      e = act(def, e, 'tell-nurse').enc
      return assess(def, finish(def, e))
    }
    expect(late('beginner').items.find((i) => i.action === 'tell-nurse')!.outcome).toBe(
      'done',
    )
    expect(late('expert').items.find((i) => i.action === 'tell-nurse')!.outcome).toBe(
      'late',
    )
    expect(late('beginner').passMark).toBeLessThan(late('expert').passMark)
    const a = say(
      def,
      startEncounter(def, 'beginner', 1, 600),
      'Where is the pain?',
    ).reply
    const b = say(def, startEncounter(def, 'expert', 1, 600), 'Where is the pain?').reply
    expect(a).toBe(b)
  })

  it('keeps first, latest and best attempts', () => {
    const def = at('routine-obs')
    const poor = toAttempt(
      def,
      finish(def, startEncounter(def, 'beginner', 0, 600)),
      1,
      'a1',
    )
    const good = toAttempt(def, playWell(def, 'beginner'), 2, 'a2')
    const okay = toAttempt(
      def,
      finish(def, act(def, startEncounter(def, 'beginner', 0, 600), 'full-obs').enc),
      3,
      'a3',
    )
    const h = history([poor, good, okay], def.id)
    expect(h.first!.id).toBe('a1')
    expect(h.latest!.id).toBe('a3')
    expect(h.best!.id).toBe('a2')
    expect(h.count).toBe(3)
    expect(h.passed).toBe(true)
    expect(AttemptSchema.parse(JSON.parse(JSON.stringify(good)))).toEqual(good)
  })
})

describe('saving', () => {
  it('round-trips an encounter, and old files read with no cases', () => {
    const enc = playWell(at('postop-bleed'))
    expect(EncounterSchema.parse(JSON.parse(JSON.stringify(enc)))).toEqual(enc)
    expect(CasesStateSchema.parse({})).toEqual({
      active: null,
      attempts: [],
      assigned: [],
    })
  })
})

describe('the tutor, the patient voice and Grace', () => {
  it('answers from the knowledge base and the case', () => {
    expect(tutorAnswer('What is SBAR?')).toMatch(/Situation/)
    expect(tutorAnswer('What does non-blanching mean?', at('pressure-area'))).toMatch(
      /stays red/,
    )
    expect(tutorAnswer('Can I give oxygen?')).toMatch(/registered/)
  })

  it('hints only on the easier settings', () => {
    const def = at('breathless')
    expect(hint(def, startEncounter(def, 'beginner', 1, 600))).toMatch(/^Try this next:/)
    expect(hint(def, startEncounter(def, 'intermediate', 1, 600))).toMatch(/^Think about/)
    expect(hint(def, startEncounter(def, 'expert', 1, 600))).toMatch(/no hints/)
  })

  it('gives an AI model only the facts the engine chose, and the knowledge for the tutor', () => {
    const def = at('chest-pain')
    const enc = startEncounter(def, 'advanced', 1, 600)
    const { reply } = say(def, enc, 'Where is the pain?')
    const req = patientRequest(def, enc, 'Where is the pain?', reply)
    expect(req.messages[0].text).toContain(reply)
    expect(req.messages[0].text).toMatch(/Keep exactly the same facts/)
    const t = tutorRequest('What is SBAR?', def, enc)
    expect(t.context.text).toMatch(/Situation/)
    expect(t.messages[0].text).toMatch(/never advise diagnosing/)
  })

  it('Grace refers to what actually happened, with the ward times', () => {
    const def = at('postop-bleed')
    let enc = advance(def, startEncounter(def, 'intermediate', 1, 10 * 60), 8)
    enc = act(def, enc, 'full-obs').enc
    enc = act(def, enc, 'tell-nurse', 'BP 96/58').enc
    const d = assess(def, finish(def, enc))
    const lines = graceFeedback(def, enc, d, [])
    expect(lines.join(' ')).toMatch(/10:08/)
    expect(lines.join(' ')).toMatch(/got worse at 10:08/)
    const again = graceFeedback(def, enc, d, [
      toAttempt(def, finish(def, startEncounter(def, 'intermediate', 1, 600)), 1, 'x'),
    ])
    expect(again.join(' ')).toMatch(/best on this case yet/)
  })
})

it('every catalogue action has a unique id', () => {
  expect(new Set(ACTIONS.map((a) => a.id)).size).toBe(ACTIONS.length)
})
