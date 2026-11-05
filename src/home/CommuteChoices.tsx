/**
 * The ways to work, with what each costs and when the player would arrive:
 * at the front door at home, and at the end of the street.
 */
import { COMMUTES, formatMoney, type CommuteId } from '../content/life'
import { formatTime } from '../game/clock'
import { arrivalFor } from '../game/life'
import { canCommute } from '../game/transport'
import type { Profile } from '../persistence/schemas'

export function CommuteChoices({
  profile,
  onLeave,
  title = 'Leave for work',
}: {
  profile: Profile
  onLeave: (commute: CommuteId) => void
  title?: string
}) {
  const life = profile.work.life
  return (
    <>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {COMMUTES.map((c) => {
          const arrival = arrivalFor(profile, c.id)
          const blocked = canCommute(life, c.id)
          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={!!blocked}
                onClick={() => onLeave(c.id)}
                data-commute={c.id}
                className="h-full w-full rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="block font-medium text-slate-900">
                  {c.name}
                  {c.cost ? ` · ${formatMoney(c.cost)}` : ' · free'}
                </span>
                <span className="block text-xs text-slate-600">{c.description}</span>
                {blocked ? (
                  <span className="mt-1 block text-xs font-medium text-slate-600">
                    {blocked}
                  </span>
                ) : (
                  <span
                    className={`mt-1 block text-xs font-medium ${
                      arrival.late ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    Arrive {formatTime(arrival.minute)}
                    {arrival.late ? ` (${arrival.late} min late)` : ''}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {!(life.ready.ate && life.ready.showered && life.ready.dressed) && (
        <p className="mt-2 text-xs text-amber-800">
          Not ready yet:{' '}
          {[
            !life.ready.ate && 'breakfast',
            !life.ready.showered && 'a shower',
            !life.ready.dressed && 'work clothes',
          ]
            .filter(Boolean)
            .join(', ')}
          . It will show at work.
        </p>
      )}
    </>
  )
}
