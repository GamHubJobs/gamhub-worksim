/** The end of a working day: how it went, and on to the next morning. */
import { formatDuration, formatTime, nextWorkday, weekdayName } from '../game/clock'
import {
  energyReading,
  engagementReading,
  fatigueReading,
  stressReading,
} from '../game/wellbeing'
import { LUNCH } from '../content/workday'
import type { DaySummary, Profile } from '../persistence/schemas'
import { Meter } from './WorkdayBar'

function advice(summary: DaySummary): string[] {
  const tips: string[] = []
  const endedAt = summary.log.at(-1)?.minute ?? 0
  if (!summary.lunch && endedAt >= LUNCH.until)
    tips.push('You skipped lunch. A proper break keeps your energy up all afternoon.')
  if (summary.overtimeMinutes >= 60)
    tips.push('A long day. Late evenings add fatigue that carries into tomorrow.')
  if (summary.meetingsMissed > 0)
    tips.push('You missed a meeting. Check the schedule under the clock at the top.')
  if (summary.breaks === 0 && summary.workMinutes > 180)
    tips.push('No breaks today. Short breaks every couple of hours help you stay sharp.')
  if (tips.length === 0) tips.push('A well-balanced day. Keep it up.')
  return tips
}

export function DayEnd({
  profile,
  onNextDay,
}: {
  profile: Profile
  onNextDay: () => void
}) {
  const summary = profile.work.history.at(-1)
  const next = nextWorkday(profile.work.day)
  const weekend = next - profile.work.day > 1
  const { wellbeing } = profile.work

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100" data-testid="day-end">
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">End of {weekdayName(profile.work.day)}</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {weekend ? 'Have a good weekend!' : 'Time to go home'}
          </h1>
          {summary && (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Worked" value={formatDuration(summary.workMinutes)} />
              <Stat label="Tasks submitted" value={String(summary.submissions)} />
              <Stat
                label="Meetings"
                value={`${summary.meetingsAttended} attended${summary.meetingsMissed ? `, ${summary.meetingsMissed} missed` : ''}`}
              />
              <Stat
                label="Overtime"
                value={
                  summary.overtimeMinutes
                    ? formatDuration(summary.overtimeMinutes)
                    : 'None'
                }
              />
            </dl>
          )}
        </section>

        {summary && (
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-semibold text-slate-900">Your day</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {summary.log.map((entry, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-16 shrink-0 text-xs leading-5 text-slate-400">
                    {formatTime(entry.minute)}
                  </span>
                  <span
                    className={
                      entry.tone === 'good'
                        ? 'text-emerald-800'
                        : entry.tone === 'bad'
                          ? 'text-amber-800'
                          : 'text-slate-700'
                    }
                  >
                    {entry.text}
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              Looking after yourself
            </h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {advice(summary).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid gap-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2">
          <Meter
            label="Energy"
            value={wellbeing.energy}
            reading={energyReading(wellbeing.energy)}
          />
          <Meter
            label="Stress"
            value={wellbeing.stress}
            reading={stressReading(wellbeing.stress)}
          />
          <Meter
            label="Engagement"
            value={wellbeing.engagement}
            reading={engagementReading(wellbeing.engagement)}
          />
          <Meter
            label="Fatigue"
            value={wellbeing.fatigue}
            reading={fatigueReading(wellbeing.fatigue)}
          />
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNextDay}
            className="rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800"
          >
            Start {weekdayName(next)} morning
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
