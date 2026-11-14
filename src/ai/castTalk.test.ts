import { describe, expect, it } from 'vitest'
import { getScenario, SCENARIOS } from '../content/scenarios'
import { playThrough } from '../game/scenarios'
import { builtinReply, castContext, castRequest, TOPICS } from './castTalk'

const hearing = getScenario('law-hearing')!

describe('talking to the cast after a scenario', () => {
  it('gives every member of every cast a set answer to every question', () => {
    for (const s of SCENARIOS)
      for (const best of [true, false]) {
        const run = playThrough(s, best)
        for (const c of s.cast)
          for (const t of TOPICS)
            expect(builtinReply(s, run, c, t.id).length).toBeGreaterThan(20)
      }
  })

  it('answers from how it was actually played', () => {
    const judge = hearing.cast[0]
    const best = playThrough(hearing, true)
    const worst = playThrough(hearing, false)
    expect(builtinReply(hearing, best, judge, 'better')).toMatch(/Nothing I would change/)
    expect(builtinReply(hearing, worst, judge, 'better')).toMatch(/you said/)
    expect(builtinReply(hearing, worst, judge, 'well')).toMatch(/not much went/)
    expect(builtinReply(hearing, best, judge, 'next')).toContain(
      hearing.outcomes.excellent.verdict,
    )
  })

  it('talks about their own part first', () => {
    const worst = playThrough(hearing, false)
    for (const c of hearing.cast) {
      const theirs = hearing.beats.filter(
        (b) => 'who' in b && b.who === c.id && worst.answers.some((a) => a.beat === b.id),
      )
      const own = worst.answers.find((a) => theirs.some((b) => b.id === a.beat))
      if (own) expect(builtinReply(hearing, worst, c, 'better')).toContain('you said')
    }
  })

  it('briefs the model in character with the record, and never the player’s name', () => {
    const run = playThrough(hearing, false)
    const judge = hearing.cast[0]
    const request = castRequest(hearing, run, judge, [
      { role: 'user', text: 'Why did I lose, judge? I am {name}.' },
    ])
    expect(request.messages[0].text).toContain(`You are ${judge.name}, ${judge.role}`)
    expect(request.messages[0].text).toContain('Why did I lose')
    expect(request.messages[0].text).not.toContain('{name}')
    expect(request.context.text).toContain('Outcome:')
    expect(request.context.text).toContain(run.answers[0].lesson.slice(0, 20))
    expect(castContext(hearing, run, judge)).not.toContain('{name}')
  })
})
