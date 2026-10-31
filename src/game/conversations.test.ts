import { describe, expect, it } from 'vitest'
import { HOURS } from '../content/workday'
import { newProfileData, type ProfileData } from './career'
import { absoluteTime } from './clock'
import {
  conversationWith,
  haveLunchBreak,
  holdConversation,
  isMentor,
  MENTOR_TRUST,
  type ColleagueId,
} from './conversations'
import { trustOf } from './relationships'
import { applyEffects, recordScene } from './scenes'

function fresh(): ProfileData {
  return newProfileData('Alex Morgan', 0)
}

function at(profile: ProfileData, minute: number, day = profile.work.day): ProfileData {
  return { ...profile, work: { ...profile.work, day, minute } }
}

/** Walks up to someone, and picks a choice if one is given. */
function talk(profile: ProfileData, person: ColleagueId, choiceId?: string) {
  const conversation = conversationWith(profile, person)
  let next = holdConversation(profile, person, conversation)
  const choice = conversation.dialogue.choices?.find((c) => c.id === choiceId)
  if (choice) {
    next = applyEffects(
      recordScene(next, conversation.dialogue.id!, choice.id),
      choice.effects,
    )
  }
  return { conversation, profile: next }
}

describe('conversations', () => {
  it('starts with an introduction from Marcus, then small talk', () => {
    const first = talk(at(fresh(), 10 * 60), 'senior', 'learn')
    expect(first.conversation.topicId).toBe('marcus-intro')
    expect(first.conversation.dialogue.choices?.map((c) => c.id)).toEqual([
      'learn',
      'neutral',
      'joke',
    ])
    // +2 for the chat, +5 for genuine curiosity.
    expect(trustOf(first.profile.work, 'senior')).toBe(40 + 2 + 5)
    const second = talk(first.profile, 'senior')
    expect(second.conversation.topicId).toBeNull()
    expect(second.conversation.dialogue.choices ?? []).toEqual([])
  })

  it('takes time and builds trust, but only a little per day', () => {
    let profile = at(fresh(), 10 * 60)
    const start = trustOf(profile.work, 'facilities')
    for (let i = 0; i < 4; i++) profile = talk(profile, 'facilities').profile
    // +2, +1, then nothing.
    expect(trustOf(profile.work, 'facilities')).toBe(start + 3)
    expect(profile.work.minute).toBe(10 * 60 + 10 + 10 + 10 + 2)
    const busy = conversationWith(profile, 'facilities')
    expect(busy.dialogue.lines[0]).toContain('Back to work')
  })

  it('remembers a one-off conversation even if the player walks away', () => {
    const { profile } = talk(at(fresh(), 10 * 60), 'senior')
    expect(conversationWith(profile, 'senior').topicId).toBeNull()
  })

  it('lets Nina invite the player to lunch with the team', () => {
    let profile = talk(at(fresh(), 9 * 60), 'reception').profile
    const invite = talk(profile, 'reception', 'join')
    expect(invite.conversation.topicId).toBe('nina-lunch-invite')
    profile = at(invite.profile, 12 * 60 + 30)
    const before = trustOf(profile.work, 'facilities')
    const after = haveLunchBreak(profile)
    expect(after.work.today.lunch).toBe(true)
    expect(after.work.today.log.at(-1)?.text).toBe('Had lunch with Nina and Tom')
    expect(trustOf(after.work, 'facilities')).toBe(before + 1)
  })

  it('brings up a misunderstanding on a later day, with ethical ways to respond', () => {
    let profile = talk(at(fresh(), 9 * 60), 'reception').profile
    profile = talk(profile, 'reception', 'join').profile
    expect(conversationWith(profile, 'reception').topicId).toBeNull()
    profile = at(profile, 9 * 60, 2)
    profile = {
      ...profile,
      work: { ...profile.work, today: { ...profile.work.today, talks: {} } },
    }
    const calm = talk(profile, 'reception', 'clarify')
    const defensive = talk(profile, 'reception', 'defensive')
    expect(calm.conversation.topicId).toBe('nina-misunderstanding')
    expect(trustOf(calm.profile.work, 'reception')).toBeGreaterThan(
      trustOf(defensive.profile.work, 'reception'),
    )
    expect(defensive.profile.work.reputation).toBeLessThan(calm.profile.work.reputation)
  })

  it('makes Marcus a mentor once he trusts the player, with advice on the current task', () => {
    let profile = talk(at(fresh(), 10 * 60), 'senior', 'learn').profile
    expect(isMentor(profile)).toBe(false)
    profile = {
      ...profile,
      work: {
        ...profile.work,
        relationships: { senior: { trust: MENTOR_TRUST, talks: 1 } },
        today: { ...profile.work.today, talks: {} },
      },
    }
    expect(isMentor(profile)).toBe(true)
    const advice = conversationWith(profile, 'senior').dialogue
    expect(advice.lines[0]).toContain('Price the office supplies order')
    expect(advice.actions[0].open.assignmentId).toBe('supplies-order')
  })

  it('lets the player ask Priya for more time when a deadline is close', () => {
    const morning = conversationWith(at(fresh(), 10 * 60), 'manager')
    expect(morning.dialogue.choices).toBeUndefined()
    const afternoon = at(fresh(), 15 * 60)
    const { profile, conversation } = talk(
      afternoon,
      'manager',
      'extension:supplies-order',
    )
    expect(conversation.dialogue.choices?.[0].label).toContain('Ask for more time')
    expect(profile.work.deadlines['supplies-order']).toMatchObject({
      due: absoluteTime(2, HOURS.end),
      extended: true,
    })
  })
})
