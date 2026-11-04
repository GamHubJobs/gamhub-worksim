import { describe, expect, it } from 'vitest'
import { CareerRecordSchema } from '../persistence/schemas'
import {
  aiCompetencies,
  recordAiUse,
  reviewPrompt,
  sensitiveIn,
  type AiEvent,
} from './aiUse'
import { newProfileData } from './career'

const question = (
  score: number,
  extra: Partial<Extract<AiEvent, { kind: 'question' }>> = {},
) =>
  ({
    kind: 'question',
    score,
    model: false,
    learning: true,
    typed: true,
    ...extra,
  }) as const

describe('prompt quality', () => {
  it('scores task, context, constraints and detail', () => {
    expect(reviewPrompt('help me', 0)).toMatchObject({ score: 1 })
    expect(reviewPrompt('help me', 0).tips).toHaveLength(3)
    const good = reviewPrompt(
      'Summarise this email for my manager in three bullet points, formal tone',
      1,
    )
    expect(good).toEqual({ score: 4, tips: [] })
  })

  it('counts shared context even when the prompt does not mention it', () => {
    expect(reviewPrompt('What should I check first?', 2).score).toBe(2)
    expect(reviewPrompt('What should I check first?', 0).score).toBe(1)
  })
})

describe('personal and secret information', () => {
  it('spots emails, phone numbers, cards, passwords and NI numbers', () => {
    expect(sensitiveIn('Reply to karen.holt@meadow.example about it')).toEqual([
      'an email address',
    ])
    expect(sensitiveIn('Call her on 07700 900123')).toContain('a phone number')
    expect(sensitiveIn('card 4111 1111 1111 1111')).toContain('a card number')
    expect(sensitiveIn('my password: hunter2')).toContain('a password')
    expect(sensitiveIn('NI number AB 12 34 56 C')).toContain(
      'a National Insurance number',
    )
  })

  it('does not flag ordinary work questions', () => {
    expect(sensitiveIn('Why is the total in D12 £1,250 and not £1,300?')).toEqual([])
    expect(sensitiveIn('Summarise the Q1 report for 2026')).toEqual([])
  })
})

describe('the AI record', () => {
  const base = newProfileData('Sam Taylor', 1)

  it('starts empty, also for saves from before it existed', () => {
    expect(base.work.record.ai.questions).toBe(0)
    const old = { promotions: [], achievements: {}, assessments: [], desk: {}, seed: 0 }
    expect(CareerRecordSchema.parse(old).ai).toEqual(base.work.record.ai)
  })

  it('sends the AI policy once, on first use', () => {
    const once = recordAiUse(base, question(3), 100)
    const twice = recordAiUse(once, question(2), 200)
    const policies = twice.inbox.filter((m) => m.subject.startsWith('Using WorkSim AI'))
    expect(policies).toHaveLength(1)
    expect(policies[0].body).toContain('responsible for anything you send')
    expect(policies[0].body).not.toContain('{manager}')
    expect(twice.work.record.ai).toMatchObject({
      questions: 2,
      promptScores: [3, 2],
      firstUsedDay: 1,
    })
  })

  it('scores only the player’s own prompts', () => {
    const p = recordAiUse(base, question(1, { typed: false }))
    expect(p.work.record.ai.promptScores).toEqual([])
    expect(p.work.record.ai.questions).toBe(1)
  })

  it('shows competencies from evidence, not from how much AI is used', () => {
    let p = base
    expect(aiCompetencies(p).every((c) => c.level === 'not-yet')).toBe(true)
    for (let i = 0; i < 10; i++) p = recordAiUse(p, question(1))
    expect(aiCompetencies(p).find((c) => c.id === 'prompting')?.level).toBe('developing')
    for (let i = 0; i < 30; i++) p = recordAiUse(p, question(4))
    expect(aiCompetencies(p).find((c) => c.id === 'prompting')?.level).toBe('strong')

    for (let i = 0; i < 4; i++) p = recordAiUse(p, question(4, { model: true }))
    expect(aiCompetencies(p).find((c) => c.id === 'verification')?.level).toBe(
      'developing',
    )
    for (let i = 0; i < 4; i++) p = recordAiUse(p, { kind: 'verified' })
    expect(aiCompetencies(p).find((c) => c.id === 'verification')?.level).toBe('strong')

    p = recordAiUse(p, { kind: 'privacy', heeded: true })
    p = recordAiUse(p, { kind: 'privacy', heeded: false })
    expect(aiCompetencies(p).find((c) => c.id === 'responsible')).toMatchObject({
      level: 'competent',
      evidence: 'You removed it 1 of 2 times when warned.',
    })
  })
})
