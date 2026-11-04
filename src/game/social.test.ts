import { describe, expect, it } from 'vitest'
import { PLANS, friendshipName } from '../content/friends'
import { newProfileData, type ProfileData } from './career'
import { goHome, goToBed } from './life'
import {
  canContact,
  canGo,
  contactFriend,
  friendOf,
  goOut,
  plansTonight,
  respond,
  unreadCount,
} from './social'
import { endDay, passTime } from './workday'

function evening(day = 1): ProfileData {
  let p = newProfileData('Sam', 1)
  p = { ...p, work: { ...p.work, day } }
  return goHome(endDay(passTime(p, 8 * 60 + 40, 'work')))
}

const invite = (p: ProfileData) => p.work.life.social.messages.find((m) => m.invite)!

describe('friends and the phone', () => {
  it('a friend invites the player on two evenings in three', () => {
    expect(evening(1).work.life.social.messages.filter((m) => m.invite)).toHaveLength(1)
    expect(evening(3).work.life.social.messages.filter((m) => m.invite)).toHaveLength(0)
    expect(unreadCount(evening(1).work.life)).toBe(1)
  })

  it('accepting and going out raises the friendship and needs, and costs time and money', () => {
    let p = evening(1)
    const message = invite(p)
    const plan = PLANS[message.invite!.kind]
    p = respond(p, message.id, true)
    expect(plansTonight(p)).toHaveLength(1)
    expect(canGo(p, message.id)).toBeNull()
    const before = p.work.life
    p = goOut(p, message.id)
    expect(friendOf(p.work.life, message.from).friendship).toBe(50 + 1 + 10)
    expect(p.work.life.minute).toBe(Math.max(before.minute, plan.at) + plan.minutes)
    expect(p.work.life.money).toBe(before.money - plan.cost)
    expect(p.work.life.needs.social).toBeGreaterThan(before.needs.social)
    expect(invite(p).invite!.status).toBe('done')
  })

  it('declining politely costs a little; a broken promise costs more', () => {
    const declined = respond(evening(1), invite(evening(1)).id, false)
    expect(friendOf(declined.work.life, invite(declined).from).friendship).toBe(49)
    const promised = respond(evening(1), invite(evening(1)).id, true)
    const next = goToBed(promised)
    const friend = invite(promised).from
    expect(friendOf(next.work.life, friend).friendship).toBe(51 - 8)
    expect(next.work.life.social.messages.at(-1)?.text).toContain('We waited for you')
  })

  it('an ignored invitation is missed overnight', () => {
    const p = goToBed(evening(1))
    expect(invite(p).invite!.status).toBe('missed')
    expect(friendOf(p.work.life, invite(p).from).friendship).toBe(46)
  })

  it('messages, calls and dinner at home keep friendships up', () => {
    let p = evening(3)
    p = contactFriend(p, 'leo', 'call')
    expect(friendOf(p.work.life, 'leo')).toEqual({ friendship: 55, lastDay: 3 })
    p = contactFriend(p, 'mei', 'text')
    expect(p.work.life.social.messages.at(-1)?.from).toBe('mei')
    p = contactFriend(p, 'aisha', 'invite')
    expect(p.work.life.food).toBe(2)
    expect(friendOf(p.work.life, 'aisha').friendship).toBe(58)
  })

  it('explains what cannot be done', () => {
    const p = evening(3)
    const hungry = { ...p, work: { ...p.work, life: { ...p.work.life, food: 0 } } }
    expect(canContact(hungry, 'aisha', 'invite')).toContain('two meals')
    const late = { ...p, work: { ...p.work, life: { ...p.work.life, minute: 23 * 60 } } }
    expect(canContact(late, 'aisha', 'call')).toContain('Too late')
    expect(canContact(newProfileData('Sam', 1), 'leo', 'call')).toContain('evening')
  })

  it('friendships not kept up fade, and have names', () => {
    let p = evening(5)
    p = goToBed(p)
    const faded = ['leo', 'aisha', 'dan', 'mei'].map(
      (id) => friendOf(p.work.life, id).friendship,
    )
    expect(faded.some((f) => f < 50)).toBe(true)
    expect(friendshipName(50)).toBe('Friend')
    expect(friendshipName(90)).toBe('Close friend')
    expect(friendshipName(10)).toBe('Drifting apart')
  })
})
