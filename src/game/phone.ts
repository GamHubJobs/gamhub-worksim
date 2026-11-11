/**
 * What the phone shows, worked out from the game itself (there is no second
 * source of truth for money, messages, meetings, missions or people): the
 * notifications, the calendar, the contacts, a social feed, the websites,
 * and the restaurants that deliver. Pure, so it can be tested.
 */
import { FRIENDS, PLANS } from '../content/friends'
import { moneyTalkDue } from './money'
import { MEETINGS } from '../content/workday'
import { TOWN_PEOPLE } from '../content/townPeople'
import { PLACES } from '../content/city'
import { fill } from '../content/departments'
import { officeWho } from '../office/scene/officeCast'
import type { ProfileData } from './career'
import { deliveryStage, untilArrival } from './delivery'
import { formatTime } from './clock'
import { trustOf, trustReading } from './relationships'
import { friendOf } from './social'
import { campaignFor } from './story/campaigns'
import { currentObjective, missionById } from './story/engine'
import type { Who } from './encounters'
import { whoOf } from './dates'

export type PhoneApp =
  | 'messages'
  | 'contacts'
  | 'browser'
  | 'bank'
  | 'jobs'
  | 'maps'
  | 'camera'
  | 'social'
  | 'food'
  | 'calendar'
  | 'settings'

export const APPS: Array<{ id: PhoneApp; name: string; icon: string; colour: string }> = [
  { id: 'messages', name: 'Messages', icon: '💬', colour: '#16a34a' },
  { id: 'contacts', name: 'Contacts', icon: '👤', colour: '#64748b' },
  { id: 'calendar', name: 'Calendar', icon: '📅', colour: '#dc2626' },
  { id: 'maps', name: 'Maps', icon: '🗺️', colour: '#0d9488' },
  { id: 'bank', name: 'Bank', icon: '💷', colour: '#1d4ed8' },
  { id: 'jobs', name: 'Career', icon: '💼', colour: '#7c3aed' },
  { id: 'food', name: 'Food', icon: '🍜', colour: '#ea580c' },
  { id: 'social', name: 'Circle', icon: '🫧', colour: '#db2777' },
  { id: 'browser', name: 'Browser', icon: '🌐', colour: '#0284c7' },
  { id: 'camera', name: 'Camera', icon: '📷', colour: '#334155' },
  { id: 'settings', name: 'Settings', icon: '⚙️', colour: '#475569' },
]

/** The apps kept in the dock at the bottom of the home screen. */
export const DOCK: PhoneApp[] = ['messages', 'contacts', 'maps', 'camera']

export const WALLPAPERS = [
  { name: 'Dusk', css: 'linear-gradient(160deg,#1e1b4b 0%,#7c3aed 55%,#f472b6 100%)' },
  { name: 'Harbour', css: 'linear-gradient(160deg,#082f49 0%,#0e7490 60%,#67e8f9 100%)' },
  { name: 'Ember', css: 'linear-gradient(160deg,#431407 0%,#c2410c 55%,#fcd34d 100%)' },
  { name: 'Moss', css: 'linear-gradient(160deg,#052e16 0%,#15803d 60%,#bef264 100%)' },
  {
    name: 'Graphite',
    css: 'linear-gradient(160deg,#0f172a 0%,#334155 60%,#94a3b8 100%)',
  },
  { name: 'Blush', css: 'linear-gradient(160deg,#4c0519 0%,#be123c 50%,#fda4af 100%)' },
]

export const RINGTONES = ['Classic', 'Bright', 'Soft']

/** The minute of the game clock that applies now (office or evening). */
export function clockOf(profile: ProfileData): number {
  return profile.work.life.phase === 'work'
    ? profile.work.minute
    : profile.work.life.minute
}

export interface Notice {
  /** The same for the same news, so it is only shown once. */
  id: string
  app: PhoneApp
  from: string
  text: string
}

/** What there is to be told about now (newest first). */
export function notices(profile: ProfileData): Notice[] {
  const out: Notice[] = []
  const life = profile.work.life
  for (const m of [...life.social.messages].reverse())
    if (m.from !== 'me' && !m.read) {
      const f = FRIENDS.find((x) => x.id === m.from)
      out.push({
        id: `msg:${m.id}`,
        app: 'messages',
        from: f?.name ?? 'Message',
        text: m.text,
      })
    }
  const stage = deliveryStage(life)
  if (stage === 'at-door' || stage === 'doorstep')
    out.push({
      id: `food:${life.delivery!.id}:${stage}`,
      app: 'food',
      from: 'Your takeaway',
      text:
        stage === 'at-door' ? 'Your courier is at the door.' : 'Left on your doorstep.',
    })
  if (life.phase === 'work' && !profile.work.dayOver) {
    const weekday = (((profile.work.day - 1) % 7) + 7) % 7
    for (const m of MEETINGS)
      if ((m.days as number[]).includes(weekday)) {
        const until = m.start - profile.work.minute
        if (until > 0 && until <= 10 && !profile.work.today.meetings[m.id])
          out.push({
            id: `meet:${profile.work.day}:${m.id}`,
            app: 'calendar',
            from: 'Calendar',
            text: fill(`${m.title} at ${formatTime(m.start)}`),
          })
      }
  }
  // A partner at home asks about the evening; the wedding day.
  if (life.partner && life.phase === 'evening')
    out.push({
      id: `partner:${profile.work.day}`,
      app: 'messages',
      from: whoOf(life.partner.id)?.name ?? 'Your partner',
      text: 'Home for dinner tonight? I will cook.',
    })
  // Money is tight: they would like to talk about it (money.ts).
  if (life.partner && moneyTalkDue(life, life.bonds?.[life.partner.id], profile.work.day))
    out.push({
      id: `money:${profile.work.day}`,
      app: 'messages',
      from: whoOf(life.partner.id)?.name ?? 'Your partner',
      text: 'Can we talk about money when you are home? Things are a bit tight.',
    })
  for (const [id, b] of Object.entries(life.bonds ?? {}))
    if (b.wedding === profile.work.day)
      out.push({
        id: `wedding:${id}:${b.wedding}`,
        app: 'calendar',
        from: 'Your wedding',
        text: 'Tonight in the park, from 6 pm',
      })
  for (const [id, b] of Object.entries(life.bonds ?? {}))
    if (b.date && b.date.day === profile.work.day)
      out.push({
        id: `date:${id}:${b.date.day}`,
        app: 'calendar',
        from: whoOf(id)?.name ?? 'Your date',
        text: `Tonight at ${formatTime(b.date.minute)}, ${b.date.place === 'park' ? 'the park' : 'Kettle & Crumb'}`,
      })
  const story = profile.work.story
  const campaign = story && campaignFor(profile.careerId)
  if (story && campaign) {
    const o = currentObjective(campaign, story)
    const m = missionById(campaign, story.active)
    if (o && m)
      out.push({ id: `story:${m.id}:${o.id}`, app: 'maps', from: m.title, text: o.label })
  }
  return out
}

export interface CalendarEntry {
  day: number
  minute: number
  title: string
  where: string
  kind: 'meeting' | 'plan' | 'delivery' | 'mission'
}

/** What is coming up: this working week's meetings, plans with friends, a takeaway, the mission. */
export function calendar(profile: ProfileData): CalendarEntry[] {
  const out: CalendarEntry[] = []
  const day = profile.work.day
  const now = clockOf(profile)
  for (let d = day; d < day + 7; d++) {
    const weekday = (((d - 1) % 7) + 7) % 7
    for (const m of MEETINGS)
      if (
        (m.days as number[]).includes(weekday) &&
        (d > day || m.start + m.minutes > now)
      )
        out.push({
          day: d,
          minute: m.start,
          title: fill(m.title),
          where: 'Office',
          kind: 'meeting',
        })
  }
  for (const m of profile.work.life.social.messages)
    if (m.invite?.status === 'accepted') {
      const plan = PLANS[m.invite.kind]
      const f = FRIENDS.find((x) => x.id === m.from)
      out.push({
        day,
        minute: plan.at,
        title: `${plan.title}${f ? ` with ${f.name.split(' ')[0]}` : ''}`,
        where: 'Leave from your front door',
        kind: 'plan',
      })
    }
  const life = profile.work.life
  for (const [, b] of Object.entries(life.bonds ?? {}))
    if (b.wedding !== null && b.wedding >= day)
      out.push({
        day: b.wedding,
        minute: 18 * 60,
        title: 'Your wedding',
        where: 'The park',
        kind: 'plan',
      })
  for (const [id, b] of Object.entries(life.bonds ?? {}))
    if (b.date && b.date.day >= day)
      out.push({
        day: b.date.day,
        minute: b.date.minute,
        title: `A date with ${whoOf(id)?.name.split(' ')[0] ?? 'someone'}`,
        where: b.date.place === 'park' ? 'The park' : 'Kettle & Crumb',
        kind: 'plan',
      })
  if (life.delivery?.status === 'coming')
    out.push({
      day,
      minute: life.delivery.due,
      title: `Takeaway arrives (in ${untilArrival(life)} min)`,
      where: 'Home',
      kind: 'delivery',
    })
  const story = profile.work.story
  const campaign = story && campaignFor(profile.careerId)
  const o = story && campaign && currentObjective(campaign, story)
  if (o) out.push({ day, minute: now, title: o.label, where: 'Story', kind: 'mission' })
  return out.sort((a, b) => a.day - b.day || a.minute - b.minute)
}

export interface PhoneContact {
  id: string
  name: string
  role: string
  /** A friend (calls and messages), or someone from work or town (a call). */
  kind: 'friend' | 'work' | 'town'
  closeness: string
  who?: Who
}

/** Friends, and everyone the player has got to know at work and in town. */
export function contacts(profile: ProfileData): PhoneContact[] {
  const life = profile.work.life
  const out: PhoneContact[] = FRIENDS.map((f) => ({
    id: f.id,
    name: f.name,
    role: f.relation,
    kind: 'friend',
    closeness: `${friendOf(life, f.id).friendship}/100 friendship`,
  }))
  const office = officeWho()
  const town = Object.values(TOWN_PEOPLE)
  for (const [id, rel] of Object.entries(profile.work.relationships)) {
    if (!rel.talks) continue
    const who = office[id] ?? town.find((t) => t.id === id)
    if (!who) continue
    out.push({
      id,
      name: who.name,
      role: who.role,
      kind: office[id] ? 'work' : 'town',
      closeness: trustReading(trustOf(profile.work, id)).label,
      who,
    })
  }
  return out
}

/** Whether someone can take a call now (colleagues during working hours only). */
export function canCall(profile: ProfileData, c: PhoneContact): string | null {
  if (c.kind !== 'work') return null
  const minute = clockOf(profile)
  const weekday = (((profile.work.day - 1) % 7) + 7) % 7
  if (weekday > 4 || minute < 8 * 60 || minute > 18 * 60)
    return `${c.name.split(' ')[0]} is not at work now: try in working hours.`
  return null
}

export interface Post {
  id: string
  author: string
  text: string
  minutesAgo: number
}

const POSTS: Array<(name: string) => string> = [
  () => 'Finally fixed the wobbly table at home. Small wins.',
  () => 'Anyone else think Monday arrives faster every week?',
  () => 'New recipe tonight. Ambitious. Smoke alarm is on standby.',
  () => 'Ran 5k before work. Who am I?',
  () => 'The café on the corner does a banana bread that should be illegal.',
  () => 'Learning something new this month: one evening a week, no excuses.',
  () => 'Spreadsheet balanced first time. Framing it.',
  () => 'Rain again. The umbrella and I are now very close.',
]

/** A day's feed from friends and colleagues: the same for the same day. */
export function feed(profile: ProfileData): Post[] {
  const day = profile.work.day
  const names = [
    ...FRIENDS.map((f) => f.name),
    ...Object.values(officeWho())
      .filter((w) => !['manager', 'senior', 'reception', 'facilities'].includes(w.id))
      .map((w) => w.name),
  ]
  const out: Post[] = []
  for (let i = 0; i < 6; i++) {
    const author = names[(day * 3 + i * 5) % names.length]
    out.push({
      id: `post:${day}:${i}`,
      author,
      text: POSTS[(day + i * 3) % POSTS.length](author),
      minutesAgo: 20 + i * 47,
    })
  }
  if (profile.work.story?.done.length)
    out.unshift({
      id: `post:${day}:you`,
      author: 'Cobalt Ridge Consulting',
      text: 'Welcome to our newest team members. Good to have you!',
      minutesAgo: 5,
    })
  return out
}

export interface Site {
  id: string
  title: string
  address: string
  body: string[]
}

/** Websites to read (offline, written for the game). */
export const SITES: Site[] = [
  {
    id: 'cobalt',
    title: 'Cobalt Ridge Consulting',
    address: 'cobaltridge.example',
    body: [
      'Consulting, finance and advisory for small and growing businesses.',
      'Our teams: Finance & Administration, Accounting, IT Services, Marketing, Data & Insights, Engineering.',
      'Careers: we hire interns and graduates all year. Ask at reception.',
    ],
  },
  {
    id: 'jobs',
    title: 'CityJobs',
    address: 'cityjobs.example',
    body: [
      'Office administrator (part time) · Harbour Road · from £11.90 an hour',
      'Junior bookkeeper · city centre · £24,500',
      'IT support technician · Northgate · £25,000',
      'Applications for jobs like these are made from your laptop at home (Career).',
    ],
  },
  {
    id: 'basket',
    title: 'Daily Basket',
    address: 'dailybasket.example',
    body: [
      'Your neighbourhood supermarket. A week’s shopping from £38.',
      'Reduced stickers go on about an hour before closing.',
      'Open 7 am to 10 pm, every day.',
    ],
  },
  {
    id: 'services',
    title: 'Local services',
    address: 'ourstreet.example',
    body: [
      'Cog & Kerb: bikes to buy, cars to lease, repairs.',
      'Forge Fitness: day passes, classes on the hour.',
      'Kettle & Crumb: breakfast, coffee and dinner, by the park.',
    ],
  },
  {
    id: 'learn',
    title: 'WorkSim Learning',
    address: 'learn.worksim.example',
    body: [
      'How to write a clear email: say what you need in the first line.',
      'Spreadsheets: name your ranges, check your totals twice.',
      'Interviews: prepare three stories about things you did, and what you learned.',
    ],
  },
]

export interface Restaurant {
  id: string
  name: string
  cuisine: string
  menu: string[]
  minutes: number
}

/** Places that deliver: every order is the same takeaway rule (paid once, a courier to the door). */
export const RESTAURANTS: Restaurant[] = [
  {
    id: 'lotus',
    name: 'Lotus Noodle Bar',
    cuisine: 'Noodles · rice',
    menu: ['Chicken ramen', 'Tofu stir-fry', 'Gyoza (6)'],
    minutes: 25,
  },
  {
    id: 'forno',
    name: 'Forno Due',
    cuisine: 'Pizza · pasta',
    menu: ['Margherita', 'Arrabbiata', 'Garlic bread'],
    minutes: 25,
  },
  {
    id: 'spice',
    name: 'Spice Lane',
    cuisine: 'Curry · grill',
    menu: ['Chana masala', 'Chicken tikka', 'Naan'],
    minutes: 25,
  },
]

/** Places on the map, with where the mission wants the player to go. */
export function mapPlaces(profile: ProfileData) {
  const story = profile.work.story
  const campaign = story && campaignFor(profile.careerId)
  const o = story && campaign ? currentObjective(campaign, story) : null
  const target =
    o && ['cafe', 'park', 'shop', 'gym', 'garage', 'home'].includes(o.where)
      ? o.where
      : o
        ? 'office'
        : null
  const life = profile.work.life
  const here = life.phase === 'work' ? 'office' : life.city.at
  return PLACES.map((p) => ({ ...p, here: p.id === here, target: p.id === target }))
}
