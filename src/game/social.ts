/**
 * Friends outside work: friendships that grow when the player makes time for
 * people and fade when they do not, a phone with messages and calls, and
 * invitations to accept, decline or (unwisely) ignore. Deterministic, like the
 * rest of the game: the same save gets the same evenings.
 */
import {
  FRIENDS,
  PLANS,
  STARTING_FRIENDSHIP,
  getFriend,
  type Friend,
  type Plan,
} from '../content/friends'
import { formatMoney, type NeedId } from '../content/life'
import type { Life } from '../persistence/schemas'
import type { ProfileData } from './career'
import { formatTime } from './clock'
import { enables } from './home'
import { clamp, decayed, note, spend, withLife, withWellbeing } from './lifeTime'

type Message = Life['social']['messages'][number]

const first = (friend: Friend) => friend.name.split(' ')[0]

export function friendOf(life: Life, id: string) {
  return life.social.friends[id] ?? { friendship: STARTING_FRIENDSHIP, lastDay: 1 }
}

export function unreadCount(life: Life): number {
  return life.social.messages.filter((m) => !m.read && m.from !== 'me').length
}

function withSocial(life: Life, social: Partial<Life['social']>): Life {
  return { ...life, social: { ...life.social, ...social } }
}

function addMessage(
  life: Life,
  message: Omit<Message, 'id' | 'read'> & { read?: boolean },
): Life {
  const id = `${message.day}-${message.minute}-${message.from}-${life.social.messages.length}`
  return withSocial(life, {
    messages: [...life.social.messages, { read: false, ...message, id }].slice(-40),
  })
}

/** Changes a friendship, and records that they were in touch today. */
function touch(life: Life, id: string, day: number, change: number): Life {
  const friend = friendOf(life, id)
  return withSocial(life, {
    friends: {
      ...life.social.friends,
      [id]: { friendship: clamp(friend.friendship + change), lastDay: day },
    },
  })
}

// ---------------------------------------------------------------------------
// Evenings: invitations
// ---------------------------------------------------------------------------

/**
 * When the player gets home: on two evenings in three, the friend they have
 * been in touch with least invites them to something they like doing.
 */
export function eveningMessages(life: Life, day: number): Life {
  if (day % 3 === 0) return life
  if (life.social.messages.some((m) => m.day === day && m.invite)) return life
  const friend = [...FRIENDS].sort(
    (a, b) => friendOf(life, a.id).lastDay - friendOf(life, b.id).lastDay,
  )[0]
  const choices = friend.likes.filter(
    (kind) => !PLANS[kind].needsItem || enables(life, PLANS[kind].needsItem!),
  )
  if (choices.length === 0) return life
  const plan = PLANS[choices[day % choices.length]]
  if (life.minute > plan.at - 15) return life
  return addMessage(life, {
    from: friend.id,
    day,
    minute: life.minute,
    text: plan.invite,
    invite: { kind: plan.kind, status: 'open' },
  })
}

/** The invitation in a message, with the plan it is for. */
export function inviteOf(
  life: Life,
  messageId: string,
): { message: Message; plan: Plan } | null {
  const message = life.social.messages.find((m) => m.id === messageId)
  return message?.invite ? { message, plan: PLANS[message.invite.kind] } : null
}

export function markRead(profile: ProfileData, friendId: string): ProfileData {
  const life = profile.work.life
  if (!life.social.messages.some((m) => m.from === friendId && !m.read)) return profile
  return withLife(
    profile,
    withSocial(life, {
      messages: life.social.messages.map((m) =>
        m.from === friendId ? { ...m, read: true } : m,
      ),
    }),
  )
}

export function respond(
  profile: ProfileData,
  messageId: string,
  accept: boolean,
): ProfileData {
  const life = profile.work.life
  const found = inviteOf(life, messageId)
  if (!found || found.message.invite!.status !== 'open') return profile
  const friend = getFriend(found.message.from)!
  const day = profile.work.day
  let next = withSocial(life, {
    messages: life.social.messages.map((m) =>
      m.id === messageId
        ? {
            ...m,
            read: true,
            invite: { ...m.invite!, status: accept ? 'accepted' : 'declined' },
          }
        : m,
    ),
  })
  next = addMessage(next, {
    from: 'me',
    to: friend.id,
    day,
    minute: life.minute,
    read: true,
    text: accept
      ? `I’d love to! See you at ${formatTime(found.plan.at)}.`
      : 'Sorry, not tonight: I need an evening in. Another time?',
  })
  // A polite no costs a little; a yes is a promise.
  next = touch(next, friend.id, day, accept ? 1 : -1)
  return withLife(profile, next)
}

/** Why the player cannot go to an accepted plan now, or null. */
export function canGo(profile: ProfileData, messageId: string): string | null {
  const life = profile.work.life
  const found = inviteOf(life, messageId)
  if (!found || found.message.invite!.status !== 'accepted') return 'Not arranged.'
  if (!profile.work.dayOver || life.phase !== 'evening') return 'It is not this evening.'
  if (found.message.day !== profile.work.day) return 'That was another day.'
  if (life.minute > found.plan.at + 30) return 'Too late: it started a while ago.'
  if (life.money < found.plan.cost)
    return `You cannot afford it (${formatMoney(found.plan.cost)}).`
  if (found.plan.needsItem && !enables(life, found.plan.needsItem))
    return 'You need a games console.'
  return null
}

/** The plans the player has said yes to this evening. */
export function plansTonight(profile: ProfileData) {
  const life = profile.work.life
  return life.social.messages
    .filter((m) => m.day === profile.work.day && m.invite?.status === 'accepted')
    .map((m) => ({ message: m, plan: PLANS[m.invite!.kind], friend: getFriend(m.from)! }))
}

/** Spends time with friends at home or out: needs, money, energy and the log. */
function spendTime(
  profile: ProfileData,
  life: Life,
  activity: {
    minutes: number
    cost?: number
    needs: Partial<Record<NeedId, number>>
    energy?: number
    stress?: number
    text: string
    startAt?: number
  },
): ProfileData {
  const start = Math.max(life.minute, activity.startAt ?? life.minute)
  const needs = decayed(life.needs, start - life.minute + activity.minutes)
  for (const [need, value] of Object.entries(activity.needs) as Array<[NeedId, number]>)
    needs[need] = clamp(needs[need] + value)
  let next: Life = { ...life, minute: start + activity.minutes, needs }
  next = spend(next, profile.work.day, activity.cost ?? 0, activity.text)
  next = note({ ...next, minute: start }, activity.text)
  next = { ...next, minute: start + activity.minutes }
  const energy = (activity.energy ?? 0) - (activity.minutes / 60) * 2
  return withLife(
    profile,
    next,
    withWellbeing(profile.work, Math.round(energy), activity.stress ?? 0),
  )
}

export function goOut(profile: ProfileData, messageId: string): ProfileData {
  if (canGo(profile, messageId)) return profile
  const { message, plan } = inviteOf(profile.work.life, messageId)!
  const friend = getFriend(message.from)!
  let life = withSocial(profile.work.life, {
    messages: profile.work.life.social.messages.map((m) =>
      m.id === messageId ? { ...m, invite: { ...m.invite!, status: 'done' } } : m,
    ),
  })
  life = touch(life, friend.id, profile.work.day, 10)
  return spendTime(profile, life, {
    minutes: plan.minutes,
    cost: plan.cost,
    needs: plan.needs,
    energy: plan.energy,
    stress: plan.stress,
    text: `${plan.title} with ${first(friend)}`,
    startAt: plan.at,
  })
}

// ---------------------------------------------------------------------------
// The phone, and having friends round
// ---------------------------------------------------------------------------

export type Contact = 'text' | 'call' | 'invite'

export const CONTACTS: Record<
  Contact,
  {
    label: string
    minutes: number
    until: number
    needs: Partial<Record<NeedId, number>>
    friendship: number
    stress?: number
  }
> = {
  text: {
    label: 'Send a message',
    minutes: 5,
    until: 24 * 60,
    needs: { social: 6 },
    friendship: 2,
  },
  call: {
    label: 'Call',
    minutes: 30,
    until: 23 * 60,
    needs: { social: 30, fun: 5 },
    friendship: 5,
    stress: -5,
  },
  invite: {
    label: 'Invite round for dinner',
    minutes: 120,
    until: 21 * 60,
    needs: { social: 40, fun: 20, hunger: 50 },
    friendship: 8,
    stress: -6,
  },
}

export function canContact(
  profile: ProfileData,
  friendId: string,
  how: Contact,
): string | null {
  const life = profile.work.life
  if (!getFriend(friendId)) return 'Not in your contacts.'
  if (!profile.work.dayOver || life.phase !== 'evening')
    return 'In the evening, after work.'
  const contact = CONTACTS[how]
  if (life.minute + contact.minutes > contact.until)
    return `Too late for that (until ${formatTime(contact.until)}).`
  if (how === 'invite') {
    if (life.food < 2) return 'You need two meals in the fridge to cook for a guest.'
    if (!life.home.furniture.table) return 'You need a table to have someone round.'
  }
  return null
}

export function contactFriend(
  profile: ProfileData,
  friendId: string,
  how: Contact,
): ProfileData {
  if (canContact(profile, friendId, how)) return profile
  const friend = getFriend(friendId)!
  const contact = CONTACTS[how]
  const day = profile.work.day
  let life = touch(profile.work.life, friendId, day, contact.friendship)
  if (how === 'text') {
    life = addMessage(life, {
      from: 'me',
      to: friendId,
      day,
      minute: life.minute,
      read: true,
      text: 'Hey, how are things? It’s been a while.',
    })
    life = addMessage(life, {
      from: friendId,
      day,
      minute: life.minute + 3,
      read: true,
      text: `So good to hear from you! All fine here. Let’s do something soon.`,
    })
  }
  if (how === 'invite') life = { ...life, food: life.food - 2 }
  return spendTime(profile, life, {
    minutes: contact.minutes,
    needs: contact.needs,
    stress: contact.stress,
    text:
      how === 'text'
        ? `Messaged ${first(friend)}`
        : how === 'call'
          ? `Called ${first(friend)}`
          : `${first(friend)} came round for dinner`,
  })
}

// ---------------------------------------------------------------------------
// Overnight
// ---------------------------------------------------------------------------

/**
 * Going to bed: tonight's invitations that were ignored, or accepted and not
 * kept, are missed (a broken promise hurts more); friendships the player has
 * not kept up fade a little.
 */
export function afterNight(life: Life, day: number): Life {
  let next = life
  for (const message of life.social.messages) {
    const status = message.invite?.status
    if (message.day !== day || (status !== 'open' && status !== 'accepted')) continue
    const friend = getFriend(message.from)
    if (!friend) continue
    next = withSocial(next, {
      messages: next.social.messages.map((m) =>
        m.id === message.id ? { ...m, invite: { ...m.invite!, status: 'missed' } } : m,
      ),
    })
    if (status === 'accepted') {
      next = touch(next, friend.id, friendOf(next, friend.id).lastDay, -8)
      next = addMessage(next, {
        from: friend.id,
        day,
        minute: PLANS[message.invite!.kind].at + 40,
        text: 'We waited for you… Everything OK?',
      })
    } else next = touch(next, friend.id, friendOf(next, friend.id).lastDay, -4)
  }
  for (const friend of FRIENDS) {
    const state = friendOf(next, friend.id)
    if (day - state.lastDay >= 3)
      next = withSocial(next, {
        friends: {
          ...next.social.friends,
          [friend.id]: { ...state, friendship: clamp(state.friendship - 2) },
        },
      })
  }
  return next
}
