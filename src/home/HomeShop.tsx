/**
 * The furniture shop (on the player's phone) and the homes to move to. Every
 * item says what it does for life at home; the player sees the price, what
 * their old item sells for, and can pick a colour.
 */
import { useState } from 'react'
import {
  FURNITURE,
  HOMES,
  SLOT_NAMES,
  getFurniture,
  type HomeId,
  type SlotId,
} from '../content/home'
import { formatMoney } from '../content/life'
import { canBuy, canMove, homeOf, tradeIn } from '../game/home'
import type { Profile } from '../persistence/schemas'

export function HomeShop({
  profile,
  tab,
  onTab,
  onBuy,
  onSell,
  onRecolour,
  onMove,
  onClose,
}: {
  profile: Profile
  tab: 'shop' | 'move'
  onTab: (tab: 'shop' | 'move') => void
  onBuy: (item: string, colour: number) => void
  onSell: (slot: SlotId) => void
  onRecolour: (slot: SlotId, colour: number) => void
  onMove: (home: HomeId) => void
  onClose: () => void
}) {
  const life = profile.work.life
  const [colours, setColours] = useState<Record<string, number>>({})
  const slots = [...new Set(FURNITURE.map((f) => f.slot))]

  return (
    <section
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      aria-label={tab === 'shop' ? 'Furniture shop' : 'Move home'}
      data-testid="home-shop"
    >
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" className="flex gap-1">
          {(['shop', 'move'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTab(t)}
              className={`rounded-full px-3 py-1 text-sm ${
                tab === t ? 'bg-amber-700 text-white' : 'text-slate-700 hover:bg-amber-50'
              }`}
            >
              {t === 'shop' ? 'Furniture shop' : 'Move home'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
        >
          Back to the flat
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        You have <strong>{formatMoney(life.money)}</strong>.{' '}
        {tab === 'shop'
          ? 'Buying a new piece for a place sells the old one second-hand.'
          : 'Your furniture comes with you. The new rent starts next Monday.'}
      </p>

      {tab === 'shop' ? (
        <div className="mt-3 space-y-4">
          {slots.map((slot) => {
            const current = life.home.furniture[slot]
            const currentItem = current ? getFurniture(current.item) : undefined
            return (
              <div key={slot}>
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {SLOT_NAMES[slot]}
                </h3>
                <ul className="mt-1 space-y-2">
                  {FURNITURE.filter((f) => f.slot === slot && f.price > 0).map((item) => {
                    const mine = currentItem?.id === item.id
                    const blocked = canBuy(profile, item.id)
                    const colour = mine ? current!.colour : (colours[item.id] ?? 0)
                    const resale = currentItem && !mine ? tradeIn(life, slot) : 0
                    return (
                      <li
                        key={item.id}
                        className={`rounded-lg border p-3 text-sm ${
                          mine
                            ? 'border-emerald-300 bg-emerald-50/50'
                            : 'border-slate-200'
                        }`}
                        data-testid={`shop-${item.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {item.name}
                              {mine && (
                                <span className="ml-2 text-xs text-emerald-700">
                                  You have this
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-600">{item.does}</p>
                          </div>
                          <span className="shrink-0 font-medium text-slate-800">
                            {formatMoney(item.price)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {item.colours.length > 1 && (
                            <span
                              role="radiogroup"
                              aria-label={`${item.name} colour`}
                              className="flex gap-1"
                            >
                              {item.colours.map((c, i) => (
                                <button
                                  key={c}
                                  type="button"
                                  role="radio"
                                  aria-checked={colour === i}
                                  aria-label={`Colour ${i + 1}`}
                                  onClick={() =>
                                    mine
                                      ? onRecolour(slot, i)
                                      : setColours((all) => ({ ...all, [item.id]: i }))
                                  }
                                  className={`h-5 w-5 rounded-full ring-offset-1 ${
                                    colour === i
                                      ? 'ring-2 ring-slate-700'
                                      : 'ring-1 ring-slate-300'
                                  }`}
                                  style={{ background: c }}
                                />
                              ))}
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-2">
                            {resale > 0 && (
                              <span className="text-xs text-slate-500">
                                Your {currentItem!.name.toLowerCase()} sells for{' '}
                                {formatMoney(resale)}
                              </span>
                            )}
                            {mine ? (
                              currentItem!.price > 0 && (
                                <button
                                  type="button"
                                  onClick={() => onSell(slot)}
                                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50"
                                >
                                  Sell
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                disabled={!!blocked}
                                title={blocked ?? undefined}
                                onClick={() => onBuy(item.id, colour)}
                                className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                              >
                                Buy
                              </button>
                            )}
                          </span>
                        </div>
                        {blocked && !mine && (
                          <p className="mt-1 text-xs text-slate-500">{blocked}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {HOMES.map((home) => {
            const here = homeOf(life).id === home.id
            const blocked = canMove(profile, home.id)
            return (
              <li
                key={home.id}
                className={`rounded-lg border p-3 text-sm ${
                  here ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'
                }`}
                data-testid={`home-${home.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {home.name}
                      {here && (
                        <span className="ml-2 text-xs text-emerald-700">
                          You live here
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-600">{home.description}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Rent {formatMoney(home.rent)} a week ·{' '}
                      {home.commuteChange
                        ? `${-home.commuteChange} minutes nearer work`
                        : 'the usual commute'}
                      {home.moveCost ? ` · ${formatMoney(home.moveCost)} to move in` : ''}
                    </p>
                  </div>
                  {!here && (
                    <button
                      type="button"
                      disabled={!!blocked}
                      title={blocked ?? undefined}
                      onClick={() => onMove(home.id)}
                      className="shrink-0 rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                    >
                      Move here
                    </button>
                  )}
                </div>
                {blocked && !here && (
                  <p className="mt-1 text-xs text-slate-500">{blocked}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
