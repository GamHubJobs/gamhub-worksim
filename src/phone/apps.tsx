/**
 * The phone's apps. Each one shows and changes the game's own state (friends'
 * messages, money, meetings, the takeaway, the story, the people the player
 * knows); nothing here keeps a second copy of it.
 */
import { useEffect, useState } from 'react'
import { audio } from '../audio/manager'
import { FRIENDS, PLANS, friendshipName, getFriend } from '../content/friends'
import { formatMoney } from '../content/life'
import { getJobAd } from '../content/careerLife'
import { careerLevel, type ProfileData } from '../game/career'
import { formatTime, weekdayName } from '../game/clock'
import { deliveryStage, untilArrival } from '../game/delivery'
import { holdEncounter, relationOf, respond } from '../game/encounters'
import { canDo, getHomeAction } from '../game/life'
import {
  calendar,
  canCall,
  clockOf,
  contacts,
  feed,
  mapPlaces,
  RESTAURANTS,
  RINGTONES,
  SITES,
  WALLPAPERS,
  type PhoneContact,
} from '../game/phone'
import { CONTACTS, canContact, friendOf, type Contact } from '../game/social'
import { canTakePhoto, deletePhoto, photos, takePhoto, type Photo } from './photos'
import { closePhone } from './store'
import { openMap } from '../world/map/store'
import { setDestination } from '../game/nav'

type Act = (change: (p: ProfileData) => ProfileData) => unknown

const button =
  'rounded-lg border border-slate-200 px-2.5 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50'

// ---------------------------------------------------------------------------
// Messages (friends), as before, on a phone screen
// ---------------------------------------------------------------------------

export function MessagesApp({
  profile,
  onRespond,
  onContact,
  onRead,
}: {
  profile: ProfileData
  onRespond: (messageId: string, accept: boolean) => void
  onContact: (friendId: string, how: Contact) => void
  onRead: (friendId: string) => void
}) {
  const life = profile.work.life
  const messages = life.social.messages
  const unread = (id: string) => messages.filter((m) => m.from === id && !m.read).length
  const [open, setOpen] = useState<string>(
    () =>
      [...messages].reverse().find((m) => m.from !== 'me' && !m.read)?.from ??
      FRIENDS[0].id,
  )
  const friend = getFriend(open)!
  const state = friendOf(life, open)
  const thread = messages.filter((m) => m.from === open || m.to === open)
  function choose(id: string) {
    setOpen(id)
    if (unread(id)) onRead(id)
  }
  return (
    <div className="space-y-3">
      <ul aria-label="Friends" className="flex gap-2 overflow-x-auto pb-1">
        {FRIENDS.map((f) => {
          const count = unread(f.id)
          return (
            <li key={f.id}>
              <button
                type="button"
                aria-current={f.id === open ? 'true' : undefined}
                onClick={() => choose(f.id)}
                className={`flex w-16 flex-col items-center gap-0.5 rounded-lg p-1 text-[11px] ${
                  f.id === open ? 'bg-emerald-50 ring-1 ring-emerald-300' : ''
                }`}
              >
                <span
                  aria-hidden
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: f.colour }}
                >
                  {f.initials}
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-red-600 px-1 text-[9px]">
                      {count}
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-center">{f.name}</span>
                {count > 0 && <span className="sr-only">{count} new</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <div data-testid="phone-thread">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-medium">{friend.name}</p>
          <p className="text-xs text-slate-500">{friend.relation}</p>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
          <span>{friendshipName(state.friendship)}</span>
          <span
            role="meter"
            aria-label={`Friendship with ${friend.name}`}
            aria-valuenow={state.friendship}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
          >
            <span
              className="block h-full rounded-full bg-emerald-500"
              style={{ width: `${state.friendship}%` }}
            />
          </span>
        </div>
        <ol className="mt-2 space-y-1.5" aria-label="Messages">
          {thread.length === 0 && (
            <li className="text-slate-500">No messages yet. Say hello?</li>
          )}
          {thread.map((m) => {
            const mine = m.from === 'me'
            const plan = m.invite ? PLANS[m.invite.kind] : null
            return (
              <li key={m.id} className={mine ? 'text-right' : ''}>
                <span
                  className={`inline-block max-w-[85%] rounded-2xl px-3 py-1.5 text-left ${
                    mine ? 'bg-emerald-700 text-white' : 'bg-slate-100'
                  }`}
                >
                  {m.text}
                </span>
                {plan && m.invite && (
                  <div className="mt-1 text-xs text-slate-600" data-testid="invitation">
                    {plan.title} · {formatTime(plan.at)}
                    {plan.cost ? ` · ${formatMoney(plan.cost)}` : ''} ·{' '}
                    {m.invite.status === 'open' ? (
                      <span className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRespond(m.id, true)}
                          className="rounded bg-emerald-700 px-2 py-0.5 text-white hover:bg-emerald-800"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => onRespond(m.id, false)}
                          className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50"
                        >
                          Decline
                        </button>
                      </span>
                    ) : (
                      <span className="font-medium">
                        {
                          {
                            accepted: 'You said yes: leave from the front door',
                            declined: 'You declined',
                            done: 'You went',
                            missed: 'Missed',
                            open: '',
                          }[m.invite.status]
                        }
                      </span>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
          {(Object.keys(CONTACTS) as Contact[]).map((how) => {
            const blocked = canContact(profile, friend.id, how)
            return (
              <button
                key={how}
                type="button"
                disabled={!!blocked}
                title={blocked ?? undefined}
                onClick={() => onContact(friend.id, how)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-emerald-50 disabled:opacity-50"
              >
                {CONTACTS[how].label} · {CONTACTS[how].minutes} min
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contacts, and calls
// ---------------------------------------------------------------------------

export function ContactsApp({
  profile,
  act,
  onContact,
}: {
  profile: ProfileData
  act: Act
  onContact: (friendId: string, how: Contact) => void
}) {
  const [calling, setCalling] = useState<PhoneContact | null>(null)
  const list = contacts(profile)
  if (calling)
    return (
      <CallScreen
        profile={profile}
        contact={calling}
        act={act}
        onContact={onContact}
        onEnd={() => setCalling(null)}
      />
    )
  return (
    <ul
      className="divide-y divide-slate-100"
      aria-label="Contacts"
      data-testid="phone-contacts"
    >
      {list.map((c) => (
        <li key={c.id} className="flex items-center gap-2 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{c.name}</span>
            <span className="block truncate text-xs text-slate-500">
              {c.role} · {c.closeness}
            </span>
          </span>
          <button
            type="button"
            aria-label={`Call ${c.name}`}
            onClick={() => setCalling(c)}
            className="rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800"
          >
            Call
          </button>
        </li>
      ))}
      {list.length <= FRIENDS.length && (
        <li className="py-2 text-xs text-slate-500">
          People you get to know at work and in town are added here.
        </li>
      )}
    </ul>
  )
}

/** A call: ringing, then they answer (or not), what is said, and the end. */
function CallScreen({
  profile,
  contact,
  act,
  onContact,
  onEnd,
}: {
  profile: ProfileData
  contact: PhoneContact
  act: Act
  onContact: (friendId: string, how: Contact) => void
  onEnd: () => void
}) {
  const [stage, setStage] = useState<'ringing' | 'talking' | 'no-answer'>('ringing')
  const [lines, setLines] = useState<string[]>([])
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    audio.play('ring', { variant: profile.work.life.phone.ringtone })
    const t = window.setTimeout(() => {
      const why =
        contact.kind === 'friend'
          ? canContact(profile, contact.id, 'call')
          : canCall(profile, contact)
      if (why) {
        setStage('no-answer')
        setLines([why])
        return
      }
      audio.play('call')
      setStage('talking')
      if (contact.kind === 'friend') {
        onContact(contact.id, 'call')
        setLines([
          `${contact.name.split(' ')[0]}: “Hey! Good to hear from you.”`,
          'You catch up for a while.',
        ])
      } else if (contact.who) {
        const situation = { availability: 'free' as const, minute: clockOf(profile) }
        const outcome = respond(
          contact.who,
          situation,
          relationOf(profile, contact.id),
          'chat',
        )
        void act((p) =>
          holdEncounter(
            p,
            [contact.id],
            outcome,
            p.work.life.phase === 'work' ? 'office' : 'out',
          ),
        )
        setLines(
          outcome.lines.map((l) =>
            l.speaker
              ? `${l.speaker.split(' ')[0]}: “${l.text}”`
              : l.text.replace(/^\*|\*$/g, ''),
          ),
        )
      }
    }, 1600)
    return () => window.clearTimeout(t)
    // Once, when the call starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (stage !== 'talking') return
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [stage])
  return (
    <div
      className="flex flex-col items-center gap-3 py-4 text-center"
      data-testid="phone-call"
    >
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-2xl font-semibold text-white">
        {contact.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)}
      </span>
      <p className="text-lg font-semibold">{contact.name}</p>
      <p className="text-xs text-slate-500" aria-live="polite">
        {stage === 'ringing'
          ? 'Calling…'
          : stage === 'no-answer'
            ? 'No answer'
            : `Connected · 0:${String(seconds).padStart(2, '0')}`}
      </p>
      <div className="space-y-1 text-sm">
        {lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          audio.play('call')
          onEnd()
        }}
        className="mt-2 rounded-full bg-red-600 px-5 py-2 font-medium text-white hover:bg-red-700"
      >
        End call
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calendar, maps, bank, career
// ---------------------------------------------------------------------------

export function CalendarApp({ profile }: { profile: ProfileData }) {
  const entries = calendar(profile)
  return (
    <ol className="space-y-1" data-testid="phone-calendar">
      {entries.map((e, i) => {
        const head = i === 0 || entries[i - 1].day !== e.day
        return (
          <li key={i}>
            {head && (
              <p className="mt-2 text-xs font-semibold text-slate-500 uppercase">
                {e.day === profile.work.day ? 'Today' : weekdayName(e.day)}
              </p>
            )}
            <p className="flex justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <span>
                <span className="font-medium">{e.title}</span>
                <span className="block text-xs text-slate-500">{e.where}</span>
              </span>
              {e.kind !== 'mission' && (
                <span className="text-xs text-slate-600">{formatTime(e.minute)}</span>
              )}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Maps: a shortcut to the world map (which opens on its own, full screen, and
 * the phone goes away), with where the player is heading and recent places.
 */
export function MapsApp({ profile, act }: { profile: ProfileData; act: Act }) {
  const nav = profile.work.life.nav
  const name = (id: string) => mapPlaces(profile).find((p) => p.id === id)?.name ?? id
  return (
    <div className="space-y-3" data-testid="phone-map">
      <button
        type="button"
        onClick={() => {
          closePhone()
          openMap()
        }}
        className="w-full rounded-xl bg-teal-700 px-3 py-4 font-semibold text-white hover:bg-teal-800"
      >
        🗺️ Open the map
      </button>
      {nav.destination ? (
        <p className="rounded-lg bg-rose-50 p-2 text-rose-900">
          Heading to <strong>{name(nav.destination)}</strong>
          <button
            type="button"
            onClick={() => void act((p) => setDestination(p, null))}
            className="ml-2 text-xs underline"
          >
            Clear
          </button>
        </p>
      ) : (
        <p className="text-xs text-slate-500">No destination. Choose one on the map.</p>
      )}
      {nav.recent.length > 0 && (
        <div>
          <p className="font-medium">Recent</p>
          <ul className="mt-1 space-y-1">
            {nav.recent.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => void act((p) => setDestination(p, id))}
                  className={`${button} w-full`}
                >
                  {name(id)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function BankApp({ profile }: { profile: ProfileData }) {
  const life = profile.work.life
  const ledger = [...life.ledger].reverse()
  const week = Math.ceil(profile.work.day / 7)
  const thisWeek = life.ledger.filter((e) => Math.ceil(e.day / 7) === week)
  const income = thisWeek.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0)
  const spent = thisWeek.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0)
  return (
    <div className="space-y-3" data-testid="phone-bank">
      <div className="rounded-xl bg-blue-700 p-3 text-white">
        <p className="text-xs text-blue-100">Current account</p>
        <p className="text-2xl font-semibold" data-testid="phone-balance">
          {formatMoney(life.money)}
        </p>
        <p className="mt-1 text-xs text-blue-100">
          This week: in {formatMoney(income)} · out {formatMoney(spent)}
        </p>
      </div>
      <p className="text-xs text-slate-500">Paid on Fridays; rent goes out on Mondays.</p>
      <ol className="divide-y divide-slate-100" aria-label="Transactions">
        {ledger.length === 0 && (
          <li className="py-2 text-slate-500">No transactions yet.</li>
        )}
        {ledger.map((e, i) => (
          <li key={i} className="flex justify-between gap-2 py-1.5">
            <span>
              {e.text}
              <span className="block text-xs text-slate-500">{weekdayName(e.day)}</span>
            </span>
            <span className={e.amount < 0 ? 'text-slate-800' : 'text-emerald-700'}>
              {e.amount < 0 ? '−' : '+'}
              {formatMoney(Math.abs(e.amount))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function JobsApp({ profile }: { profile: ProfileData }) {
  const { current, next } = careerLevel(profile)
  const apps = profile.work.life.career.applications
  return (
    <div className="space-y-3" data-testid="phone-jobs">
      <div className="rounded-xl bg-violet-700 p-3 text-white">
        <p className="text-xs text-violet-100">Your job</p>
        <p className="font-semibold">{current.title}</p>
        <p className="text-xs text-violet-100">
          {profile.xp} XP
          {next ? ` · next: ${next.title} at ${next.xpRequired} XP` : ' · top level'}
        </p>
      </div>
      <div>
        <p className="font-medium">Applications</p>
        {apps.length === 0 ? (
          <p className="text-xs text-slate-500">
            None yet. Look for jobs on your laptop at home (Career).
          </p>
        ) : (
          <ul className="mt-1 space-y-1">
            {apps.map((a) => (
              <li key={a.jobId} className="rounded-lg bg-slate-50 px-2 py-1.5">
                {getJobAd(a.jobId)?.employer ?? a.jobId} ·{' '}
                <span className="font-medium">{a.stage}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Food, social, browser, camera, settings
// ---------------------------------------------------------------------------

export function FoodApp({
  profile,
  onOrder,
}: {
  profile: ProfileData
  onOrder: () => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const life = profile.work.life
  const stage = deliveryStage(life)
  const action = getHomeAction('takeaway')!
  const why = canDo(profile, action as Parameters<typeof canDo>[1])
  const r = RESTAURANTS.find((x) => x.id === open)
  return (
    <div className="space-y-2" data-testid="phone-food">
      {stage !== 'none' && (
        <p
          className="rounded-lg bg-orange-50 p-2 text-orange-900"
          data-testid="phone-delivery"
        >
          {stage === 'coming'
            ? `Your order is on its way: about ${untilArrival(life)} minutes.`
            : stage === 'at-door'
              ? 'Your courier is at the door!'
              : stage === 'doorstep'
                ? 'Left on your doorstep.'
                : 'Delivered: enjoy.'}
        </p>
      )}
      {!r ? (
        <ul className="space-y-1.5">
          {RESTAURANTS.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => setOpen(x.id)}
                className={`${button} w-full`}
              >
                <span className="font-medium">{x.name}</span>
                <span className="block text-xs text-slate-500">
                  {x.cuisine} · about {x.minutes} min
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2">
          <p className="font-medium">{r.name}</p>
          <ul className="list-disc pl-5 text-slate-700">
            {r.menu.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!!why}
            onClick={() => {
              onOrder()
              setOpen(null)
            }}
            className="w-full rounded-lg bg-orange-700 px-3 py-2 font-medium text-white hover:bg-orange-800 disabled:opacity-50"
          >
            Order for delivery · {formatMoney(action.cost ?? 0)}
          </button>
          {why && <p className="text-xs text-slate-600">{why}</p>}
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="text-xs text-blue-600"
          >
            Other restaurants
          </button>
        </div>
      )}
      <p className="text-xs text-slate-500">Delivered to your front door at home.</p>
    </div>
  )
}

export function SocialApp({ profile, act }: { profile: ProfileData; act: Act }) {
  const liked = profile.work.life.phone.liked
  return (
    <ol className="space-y-2" data-testid="phone-social">
      {feed(profile).map((p) => {
        const on = liked.includes(p.id)
        return (
          <li key={p.id} className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{p.author}</span> ·{' '}
              {p.minutesAgo < 60
                ? `${p.minutesAgo} min`
                : `${Math.floor(p.minutesAgo / 60)} h`}
            </p>
            <p className="mt-0.5">{p.text}</p>
            <button
              type="button"
              aria-pressed={on}
              onClick={() =>
                void act((q) => {
                  const life = q.work.life
                  const list = on
                    ? life.phone.liked.filter((x) => x !== p.id)
                    : [...life.phone.liked, p.id].slice(-50)
                  return {
                    ...q,
                    work: {
                      ...q.work,
                      life: { ...life, phone: { ...life.phone, liked: list } },
                    },
                  }
                })
              }
              className={`mt-1 text-xs font-medium ${on ? 'text-pink-600' : 'text-slate-500'}`}
            >
              {on ? '♥ Liked' : '♡ Like'}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function BrowserApp() {
  const [site, setSite] = useState<string | null>(null)
  const s = SITES.find((x) => x.id === site)
  return (
    <div className="space-y-2" data-testid="phone-browser">
      <p className="truncate rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
        {s ? s.address : 'Search or choose a site'}
      </p>
      {!s ? (
        <ul className="space-y-1">
          {SITES.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => setSite(x.id)}
                className={`${button} w-full`}
              >
                <span className="font-medium">{x.title}</span>
                <span className="block text-xs text-slate-500">{x.address}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <article className="space-y-1.5">
          <h3 className="font-semibold">{s.title}</h3>
          {s.body.map((b) => (
            <p key={b}>{b}</p>
          ))}
          <button
            type="button"
            onClick={() => setSite(null)}
            className="text-xs text-blue-600"
          >
            ‹ All sites
          </button>
        </article>
      )}
    </div>
  )
}

export function CameraApp() {
  const [list, setList] = useState<Photo[]>(photos)
  const [flash, setFlash] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const can = canTakePhoto()
  return (
    <div className="space-y-2" data-testid="phone-camera">
      <button
        type="button"
        disabled={!can}
        onClick={() => {
          setFlash(true)
          window.setTimeout(() => setFlash(false), 180)
          audio.play('click')
          void takePhoto().then((p) => {
            if (p) setList(photos())
            setNote(p ? 'Saved to your gallery.' : 'Nothing to take a picture of here.')
          })
        }}
        className={`w-full rounded-xl px-3 py-6 font-semibold text-white ${flash ? 'bg-white' : 'bg-slate-800 hover:bg-slate-700'} disabled:opacity-50`}
      >
        {can ? '◉ Take a photo' : 'Go somewhere in 3D to take photos'}
      </button>
      {note && (
        <p className="text-xs text-slate-600" role="status">
          {note}
        </p>
      )}
      <p className="font-medium">Gallery</p>
      {list.length === 0 && <p className="text-xs text-slate-500">No photos yet.</p>}
      <ul className="grid grid-cols-3 gap-1" aria-label="Gallery">
        {list.map((p) => (
          <li key={p.id} className="relative">
            <img
              src={p.src}
              alt={`Photo taken ${new Date(p.at).toLocaleString()}`}
              className="aspect-square w-full rounded object-cover"
            />
            <button
              type="button"
              aria-label="Delete photo"
              onClick={() => {
                deletePhoto(p.id)
                setList(photos())
              }}
              className="absolute top-0.5 right-0.5 rounded-full bg-black/60 px-1.5 text-[10px] text-white"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">Photos are kept on this device.</p>
    </div>
  )
}

export function SettingsApp({ profile, act }: { profile: ProfileData; act: Act }) {
  const phone = profile.work.life.phone
  const set = (change: Partial<typeof phone>) =>
    void act((q) => {
      const life = q.work.life
      return {
        ...q,
        work: { ...q.work, life: { ...life, phone: { ...life.phone, ...change } } },
      }
    })
  return (
    <div className="space-y-4" data-testid="phone-settings">
      <section>
        <p className="font-medium">Wallpaper</p>
        <div
          className="mt-1 grid grid-cols-3 gap-1.5"
          role="radiogroup"
          aria-label="Wallpaper"
        >
          {WALLPAPERS.map((w, i) => (
            <button
              key={w.name}
              type="button"
              role="radio"
              aria-checked={phone.wallpaper === i}
              aria-label={w.name}
              onClick={() => set({ wallpaper: i })}
              className={`h-14 rounded-lg ${phone.wallpaper === i ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
              style={{ background: w.css }}
            />
          ))}
        </div>
      </section>
      <section>
        <p className="font-medium">Ringtone</p>
        <div className="mt-1 flex gap-1.5" role="radiogroup" aria-label="Ringtone">
          {RINGTONES.map((r, i) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={phone.ringtone === i}
              onClick={() => {
                set({ ringtone: i })
                audio.play('ring', { variant: i })
              }}
              className={`rounded-full px-3 py-1 text-xs ${phone.ringtone === i ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>
      <label className="flex items-center justify-between gap-2">
        <span>
          <span className="font-medium">Notifications</span>
          <span className="block text-xs text-slate-500">
            Banners for messages, deliveries, meetings, missions
          </span>
        </span>
        <input
          type="checkbox"
          checked={phone.notifications}
          onChange={(e) => set({ notifications: e.target.checked })}
          className="h-5 w-5"
        />
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>
          <span className="font-medium">Mini-map</span>
          <span className="block text-xs text-slate-500">
            The small map on the screen while you play
          </span>
        </span>
        <input
          type="checkbox"
          aria-label="Mini-map"
          checked={phone.minimap}
          onChange={(e) => set({ minimap: e.target.checked })}
          className="h-5 w-5"
        />
      </label>
      <p className="text-xs text-slate-500">
        Volumes are in Sound &amp; graphics, in the top bar.
      </p>
    </div>
  )
}
