/**
 * The player's smartphone: a device held up from the bottom of the screen,
 * with a status bar (the game's clock, signal, battery), a wallpaper, the
 * home screen's clock and app grid, a dock, and the apps, each one connected
 * to the game itself (see game/phone.ts). Opens with P (or the Phone
 * buttons), closes with P, Esc or the button; the home bar goes home, the
 * back arrow goes back. While it is out, the character holds it and stands
 * still (see PlayerRig). New news arrives as a banner, also when it is away.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { audio } from '../audio/manager'
import { weekdayName, formatTime } from '../game/clock'
import { APPS, clockOf, DOCK, notices, WALLPAPERS, type PhoneApp } from '../game/phone'
import type { ProfileData } from '../game/career'
import type { Contact } from '../game/social'
import { keymap } from '../world/keys'
import { closePhone, openPhone, showApp, togglePhone, usePhone } from './store'
import {
  BankApp,
  BrowserApp,
  CalendarApp,
  CameraApp,
  ContactsApp,
  FoodApp,
  JobsApp,
  MapsApp,
  MessagesApp,
  SettingsApp,
  SocialApp,
} from './apps'

export interface PhoneActions {
  act: (change: (p: ProfileData) => ProfileData) => unknown
  onRespond: (messageId: string, accept: boolean) => void
  onContact: (friendId: string, how: Contact) => void
  onRead: (friendId: string) => void
  /** Order the takeaway (the home's own action, with its courier). */
  onOrder: () => void
  /** Go to a place in town (from the street). */
  onGo: (place: string) => void
}

const TITLES = Object.fromEntries(APPS.map((a) => [a.id, a.name])) as Record<
  PhoneApp,
  string
>

/** The phone, and the banners for news while it is away. Lives at the top of the desk. */
export function PhoneHost({
  profile,
  ...actions
}: { profile: ProfileData } & PhoneActions) {
  const phone = usePhone()
  // P takes the phone out or puts it away (not while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))
        return
      if (keymap().phone.includes(e.code) && !e.repeat) {
        e.preventDefault()
        audio.play(phone.open ? 'close' : 'open')
        togglePhone()
      } else if (e.key === 'Escape' && phone.open) closePhone()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phone.open])
  return (
    <>
      <Banner profile={profile} hidden={phone.open} />
      {phone.open && <PhoneDevice profile={profile} app={phone.app} {...actions} />}
    </>
  )
}

/** A new notification, for a few seconds (only news that arrives after the game opens). */
function Banner({ profile, hidden }: { profile: ProfileData; hidden: boolean }) {
  const on = profile.work.life.phone.notifications
  const list = notices(profile)
  // What had already happened when the game opened is not news.
  const [seen, setSeen] = useState(() => new Set(list.map((n) => n.id)))
  const shown = list.find((n) => !seen.has(n.id)) ?? null
  const done = (id: string) => setSeen((old) => new Set([...old, id]))
  const id = shown?.id ?? null
  const fromMessages = shown?.app === 'messages'
  // Once per notification (not on every redraw).
  useEffect(() => {
    if (!id) return
    if (on) audio.play(fromMessages ? 'phone' : 'notify')
    const t = window.setTimeout(() => done(id), on ? 5000 : 0)
    return () => window.clearTimeout(t)
  }, [id, on, fromMessages])
  if (!on) return null
  if (!shown || hidden) return null
  const app = APPS.find((a) => a.id === shown.app)!
  return (
    <button
      type="button"
      data-testid="phone-banner"
      onClick={() => {
        done(shown.id)
        openPhone(shown.app)
      }}
      className="phone-banner fixed top-16 left-1/2 z-50 flex w-80 -translate-x-1/2 items-start gap-3 rounded-2xl bg-white/95 p-3 text-left shadow-2xl ring-1 ring-slate-200 backdrop-blur"
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ background: app.colour }}
      >
        {app.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex justify-between text-xs text-slate-500">
          <span>{app.name}</span>
          <span>now</span>
        </span>
        <span className="block truncate text-sm font-semibold text-slate-900">
          {shown.from}
        </span>
        <span className="block truncate text-sm text-slate-700">{shown.text}</span>
      </span>
    </button>
  )
}

function PhoneDevice({
  profile,
  app,
  ...actions
}: { profile: ProfileData; app: PhoneApp | null } & PhoneActions) {
  // Raised into view, and lowered again before it goes.
  const [up, setUp] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setUp(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const before = document.activeElement
    box.current?.focus()
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus()
    }
  }, [])
  function putAway() {
    audio.play('close')
    setUp(false)
    window.setTimeout(closePhone, 220)
  }
  const life = profile.work.life
  const wallpaper = WALLPAPERS[life.phone.wallpaper % WALLPAPERS.length].css
  const minute = clockOf(profile)
  const day = life.phase === 'morning' ? profile.work.day + 1 : profile.work.day
  const unread = life.social.messages.filter((m) => m.from !== 'me' && !m.read).length
  return (
    <div
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-label="Phone"
      data-testid="phone"
      className={`fixed right-6 bottom-3 z-50 outline-none transition-transform duration-200 ease-out ${
        up ? 'translate-y-0' : 'translate-y-[110%]'
      }`}
    >
      {/* The body */}
      <div className="relative h-[37rem] w-[19rem] rounded-[2.6rem] bg-zinc-900 p-2.5 shadow-2xl ring-1 ring-zinc-700">
        <div
          className="relative flex h-full flex-col overflow-hidden rounded-[2.1rem] text-white"
          style={{ background: wallpaper }}
        >
          {/* Status bar, with the camera notch */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-2.5 pb-1 text-[11px] font-semibold">
            <span data-testid="phone-time">{formatTime(minute)}</span>
            <span
              aria-hidden
              className="absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black"
            />
            <span
              role="img"
              className="flex items-center gap-1.5"
              aria-label="Signal full, battery 82 per cent"
            >
              <span aria-hidden className="flex items-end gap-px">
                {[3, 5, 7, 9].map((h) => (
                  <span
                    key={h}
                    className="w-[3px] rounded-sm bg-white"
                    style={{ height: h }}
                  />
                ))}
              </span>
              <span
                aria-hidden
                className="relative h-2.5 w-5 rounded-[3px] border border-white/80"
              >
                <span className="absolute inset-[1px] w-[75%] rounded-[1px] bg-white" />
              </span>
            </span>
          </div>

          {app === null ? (
            <Home
              time={formatTime(minute)}
              date={`${weekdayName(day)}, week ${Math.ceil(day / 7)}`}
              badges={{ messages: unread }}
            />
          ) : (
            <Screen title={TITLES[app]} onBack={() => showApp(null)}>
              <AppBody app={app} profile={profile} {...actions} />
            </Screen>
          )}

          {/* The home bar: back to the home screen */}
          <button
            type="button"
            aria-label="Home screen"
            onClick={() => {
              audio.play('click')
              showApp(null)
            }}
            className="mx-auto mt-auto mb-2 block h-1.5 w-28 shrink-0 rounded-full bg-white/80 hover:bg-white"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={putAway}
        className="absolute -top-3 -left-3 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-white shadow ring-1 ring-zinc-600 hover:bg-zinc-700"
      >
        Put the phone away
      </button>
    </div>
  )
}

function Home({
  time,
  date,
  badges,
}: {
  time: string
  date: string
  badges: Partial<Record<PhoneApp, number>>
}) {
  const grid = APPS.filter((a) => !DOCK.includes(a.id))
  const dock = APPS.filter((a) => DOCK.includes(a.id))
  return (
    <div className="flex flex-1 flex-col px-4" data-testid="phone-home">
      <div className="mt-6 text-center drop-shadow">
        <p className="text-5xl font-light tracking-tight">{time}</p>
        <p className="mt-1 text-sm font-medium text-white/85">{date}</p>
      </div>
      <ul className="mt-8 grid grid-cols-4 gap-x-2 gap-y-4" aria-label="Apps">
        {grid.map((a) => (
          <li key={a.id}>
            <AppIcon app={a} badge={badges[a.id]} />
          </li>
        ))}
      </ul>
      <ul
        className="mt-auto mb-3 grid grid-cols-4 gap-2 rounded-3xl bg-white/20 p-2.5 backdrop-blur"
        aria-label="Dock"
      >
        {dock.map((a) => (
          <li key={a.id}>
            <AppIcon app={a} badge={badges[a.id]} small />
          </li>
        ))}
      </ul>
    </div>
  )
}

function AppIcon({
  app,
  badge,
  small,
}: {
  app: (typeof APPS)[number]
  badge?: number
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => {
        audio.play('click')
        showApp(app.id)
      }}
      className="group flex w-full flex-col items-center gap-1 transition-transform active:scale-90"
    >
      <span
        aria-hidden
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-md ring-1 ring-white/20 group-hover:brightness-110"
        style={{ background: app.colour }}
      >
        {app.icon}
        {!!badge && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold">
            {badge}
          </span>
        )}
      </span>
      {!small && <span className="text-[11px] font-medium drop-shadow">{app.name}</span>}
      <span className="sr-only">
        {small ? app.name : ''}
        {badge ? `, ${badge} new` : ''}
      </span>
    </button>
  )
}

function Screen({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="phone-screen mx-1.5 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[1.6rem] bg-white text-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            audio.play('click')
            onBack()
          }}
          className="rounded-md px-1.5 py-0.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          ‹ Back
        </button>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-sm">{children}</div>
    </div>
  )
}

function AppBody({
  app,
  profile,
  ...a
}: { app: PhoneApp; profile: ProfileData } & PhoneActions) {
  switch (app) {
    case 'messages':
      return (
        <MessagesApp
          profile={profile}
          onRespond={a.onRespond}
          onContact={a.onContact}
          onRead={a.onRead}
        />
      )
    case 'contacts':
      return <ContactsApp profile={profile} act={a.act} onContact={a.onContact} />
    case 'calendar':
      return <CalendarApp profile={profile} />
    case 'maps':
      return <MapsApp profile={profile} act={a.act} />
    case 'bank':
      return <BankApp profile={profile} />
    case 'jobs':
      return <JobsApp profile={profile} />
    case 'food':
      return <FoodApp profile={profile} onOrder={a.onOrder} />
    case 'social':
      return <SocialApp profile={profile} act={a.act} />
    case 'browser':
      return <BrowserApp />
    case 'camera':
      return <CameraApp />
    case 'settings':
      return <SettingsApp profile={profile} act={a.act} />
  }
}
