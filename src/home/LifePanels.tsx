/**
 * How the player is and what they have: needs, energy and stress, and money.
 * Shown at home and out in the neighbourhood.
 */
import { NEEDS, formatMoney } from '../content/life'
import { weekdayName } from '../game/clock'
import { needWarnings } from '../game/life'
import type { Life, Profile } from '../persistence/schemas'

export function NeedsPanel({ profile }: { profile: Profile }) {
  const life = profile.work.life
  const warnings = needWarnings(life)
  return (
    <section
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      data-testid="needs"
    >
      <h2 className="font-semibold text-slate-900">How you are</h2>
      <ul className="mt-2 space-y-2">
        {NEEDS.map((need) => {
          const value = Math.round(life.needs[need.id])
          return (
            <li key={need.id}>
              <div className="flex justify-between text-xs text-slate-600">
                <span>{need.name}</span>
                <span>{value}</span>
              </div>
              <div
                role="meter"
                aria-label={need.name}
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className={`h-full rounded-full ${
                    value < 30
                      ? 'bg-red-500'
                      : value < 55
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </li>
          )
        })}
        <li className="flex justify-between text-xs text-slate-600">
          <span>Energy</span>
          <span>{Math.round(profile.work.wellbeing.energy)}</span>
        </li>
        <li className="flex justify-between text-xs text-slate-600">
          <span>Stress</span>
          <span>{Math.round(profile.work.wellbeing.stress)}</span>
        </li>
      </ul>
      {warnings.length > 0 && (
        <ul
          className="mt-3 space-y-0.5 text-xs text-amber-800"
          aria-label="Things to look after"
        >
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function MoneyPanel({ life }: { life: Life }) {
  return (
    <section
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      data-testid="money"
    >
      <h2 className="font-semibold text-slate-900">Money</h2>
      <p
        className={`text-2xl font-semibold ${life.money < 0 ? 'text-red-700' : 'text-slate-900'}`}
        data-testid="balance"
      >
        {formatMoney(life.money)}
      </p>
      <p className="text-xs text-slate-500">
        {life.food} meal{life.food === 1 ? '' : 's'} in the fridge · paid on Fridays, rent
        on Mondays
      </p>
      {life.ledger.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-slate-600">Statement</summary>
          <ul className="mt-1 space-y-0.5">
            {life.ledger
              .slice(-12)
              .reverse()
              .map((entry, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="text-slate-600">
                    {weekdayName(entry.day).slice(0, 3)} · {entry.text}
                  </span>
                  <span
                    className={entry.amount < 0 ? 'text-slate-700' : 'text-emerald-700'}
                  >
                    {entry.amount > 0 ? '+' : ''}
                    {formatMoney(entry.amount)}
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  )
}
