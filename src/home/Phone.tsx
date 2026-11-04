/**
 * The player's phone: friends, how close they are, the messages with each,
 * invitations to answer, and ways to get in touch.
 */
import { useState } from 'react'
import { FRIENDS, PLANS, friendshipName, getFriend } from '../content/friends'
import { formatMoney } from '../content/life'
import { formatTime } from '../game/clock'
import { CONTACTS, canContact, friendOf, type Contact } from '../game/social'
import type { Profile } from '../persistence/schemas'

export function Phone({
  profile,
  onRespond,
  onContact,
  onRead,
  onClose,
}: {
  profile: Profile
  onRespond: (messageId: string, accept: boolean) => void
  onContact: (friendId: string, how: Contact) => void
  onRead: (friendId: string) => void
  onClose: () => void
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
    <section
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      aria-label="Phone"
      data-testid="phone"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Phone</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
        >
          Back to the flat
        </button>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-[13rem_1fr]">
        <ul aria-label="Friends" className="space-y-1">
          {FRIENDS.map((f) => {
            const points = friendOf(life, f.id).friendship
            const count = unread(f.id)
            return (
              <li key={f.id}>
                <button
                  type="button"
                  aria-current={f.id === open ? 'true' : undefined}
                  onClick={() => choose(f.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                    f.id === open
                      ? 'bg-amber-50 ring-1 ring-amber-300'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: f.colour }}
                  >
                    {f.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">
                      {f.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {friendshipName(points)}
                    </span>
                  </span>
                  {count > 0 && (
                    <span
                      className="rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white"
                      aria-label={`${count} new`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <div data-testid="phone-thread">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium text-slate-900">{friend.name}</p>
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
                className="block h-full rounded-full bg-amber-500"
                style={{ width: `${state.friendship}%` }}
              />
            </span>
          </div>

          <ol className="mt-3 max-h-64 space-y-2 overflow-y-auto" aria-label="Messages">
            {thread.length === 0 && (
              <li className="text-sm text-slate-500">No messages yet. Say hello?</li>
            )}
            {thread.map((m) => {
              const mine = m.from === 'me'
              const plan = m.invite ? PLANS[m.invite.kind] : null
              return (
                <li key={m.id} className={mine ? 'text-right' : ''}>
                  <span
                    className={`inline-block max-w-[85%] rounded-2xl px-3 py-1.5 text-left text-sm ${
                      mine ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-800'
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

          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {(Object.keys(CONTACTS) as Contact[]).map((how) => {
              const blocked = canContact(profile, friend.id, how)
              return (
                <button
                  key={how}
                  type="button"
                  disabled={!!blocked}
                  title={blocked ?? undefined}
                  onClick={() => onContact(friend.id, how)}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-amber-50 disabled:opacity-50"
                >
                  {CONTACTS[how].label} · {CONTACTS[how].minutes} min
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
