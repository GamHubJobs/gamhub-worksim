import { describe, expect, it } from 'vitest'
import { buildContext } from '../ai/context'
import { builtinAnswer, intentOf } from '../ai/builtin/guide'
import { systemPrompt } from '../ai/prompt'
import type { AiRequest } from '../ai/types'
import { newProfileData, type ProfileData } from './career'
import { goHome, goToBed, leaveForWork } from './life'
import {
  IDEAL_BEDTIME,
  budgetItem,
  budgetOf,
  categoryOf,
  learningOf,
  lifeContext,
  planOf,
} from './lifeAdvice'
import { withLife } from './lifeTime'
import { endDay, passTime } from './workday'

function evening(day = 1): ProfileData {
  let p = newProfileData('Sam Taylor', 1)
  p = { ...p, work: { ...p.work, day } }
  return goHome(endDay(passTime(p, 8 * 60 + 40, 'work')))
}

const request = (p: ProfileData, text: string, action?: string): AiRequest => ({
  messages: [{ role: 'user', text }],
  context: buildContext(lifeContext(p), p.name),
  mode: 'learning',
  action,
})

describe('WorkSim AI at home: what it is given', () => {
  it('sorts the statement into categories', () => {
    expect(categoryOf('Pay for week 1', 38000)).toBe('Pay')
    expect(categoryOf('Evening tutoring', 1800)).toBe('Side business')
    expect(categoryOf('Rent for week 2', -16000)).toBe('Rent')
    expect(categoryOf('Taxi to work', -1400)).toBe('Travel')
    expect(categoryOf('Bus home', -250)).toBe('Travel')
    expect(categoryOf('Order a takeaway', -1500)).toBe('Food')
    expect(categoryOf('Car lease for week 2', -6000)).toBe('Car')
  })

  it('the budget notices taxis and an overdraft', () => {
    let p = evening()
    let life = p.work.life
    life = {
      ...life,
      money: -500,
      ledger: [
        ...life.ledger,
        { day: 1, text: 'Taxi to work', amount: -1400 },
        { day: 1, text: 'Taxi home', amount: -1400 },
      ],
    }
    p = withLife(p, life)
    const b = budgetOf(p)
    expect(b.week.Travel).toBe(-250 - 2800)
    expect(b.advice.join(' ')).toContain('overdrawn by £5.00')
    expect(b.advice.join(' ')).toContain('2 taxi journey(s)')
    expect(b.advice.join(' ')).toContain('£23.00')
  })

  it('the plan starts with the lowest need and ends with bedtime', () => {
    let p = evening()
    p = withLife(p, { ...p.work.life, needs: { ...p.work.life.needs, hunger: 10 } })
    const plan = planOf(p)
    expect(plan[0]).toMatch(/^Hunger is at 10: /)
    expect(plan.at(-1)).toContain('Be in bed by')
    expect(IDEAL_BEDTIME).toBe(23 * 60)
    // The morning plan: breakfast, shower, clothes, and when to leave.
    const morning = planOf(goToBed(p))
    expect(morning.join(' ')).toContain('Eat breakfast')
    expect(morning.at(-1)).toMatch(/Leave by .* for the bus/)
  })

  it('learning advice: the weakest skills, promotion and a job advert gap', () => {
    const advice = learningOf(evening())
    expect(advice[0]).toContain('least practised skills')
    expect(advice.join(' ')).toContain('For promotion to')
    expect(advice.join(' ')).toContain('would not shortlist you yet')
  })

  it('what a model would be given has no name and stays small', () => {
    const p = evening()
    const context = buildContext(lifeContext(p), p.name)
    const text = context.items.map((i) => i.text).join('\n')
    expect(text).not.toContain('Sam')
    expect(text).toContain('Balance:')
    expect(text.length).toBeLessThan(2000)
    expect(systemPrompt(request(p, 'How is my money?', 'budget'))).toContain(
      'weekly budget',
    )
  })
})

describe('WorkSim AI at home: the built-in guide', () => {
  it('answers the quick questions from the save, labelled as not an AI model', () => {
    const p = evening()
    for (const [action, title] of [
      ['budget', 'Your budget this week'],
      ['plan-day', 'A plan'],
      ['learn-next', 'What to learn next'],
    ]) {
      const answer = builtinAnswer(request(p, 'help', action))
      expect(answer.text).toContain(title)
      expect(answer.text).toContain('not by an AI model')
      expect(answer.source).toEqual({
        engine: 'builtin',
        label: 'Built-in guide',
        model: false,
      })
    }
  })

  it('recognises typed questions only when the home context is there', () => {
    const p = evening()
    expect(intentOf(request(p, 'Can I afford a takeaway?'))).toBe('budget')
    expect(intentOf(request(p, 'What should I do tonight?'))).toBe('plan-day')
    expect(intentOf(request(p, 'How do I get promoted?'))).toBe('learn-next')
    // At work, without it, "plan" is still about the task.
    expect(
      intentOf({
        messages: [{ role: 'user', text: 'How should I plan this?' }],
        context: { items: [], trimmed: 0 },
        mode: 'learning',
      }),
    ).toBe('approach')
  })

  it('works on a day at work too (the budget item alone)', () => {
    const p = leaveForWork(goToBed(evening()), 'bus')
    expect(budgetItem(p).text).toContain('Weekly pay')
    expect(planOf(p)[0]).toContain('You are at work')
  })
})
