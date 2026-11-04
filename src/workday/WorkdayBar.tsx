/**
 * The office clock in the top bar, with energy and stress at a glance. Opens
 * "Your day": today's schedule, deadlines, wellbeing and what has happened.
 */
import { useEffect, useRef, useState } from 'react'
import { getAssignment } from '../content/assignments'
import { fill } from '../content/departments'
import { HOURS, LUNCH } from '../content/workday'
import { formatMoment, formatTime, weekdayName, weekNumber } from '../game/clock'
import { now } from '../game/deadlines'
import {
  energyReading,
  engagementReading,
  fatigueReading,
  stressReading,
  type Reading,
} from '../game/wellbeing'
import { lunchAvailability, meetingState, meetingsOn } from '../game/workday'
import type { Profile } from '../persistence/schemas'
import type { ClockStatus } from './useWorkClock'

const TONE_TEXT: Record<Reading['tone'], string> = {
  good: 'text-emerald-700',
  neutral: 'text-slate-600',
  bad: 'text-amber-700',
}

const TONE_BAR: Record<Reading['tone'], string> = {
  good: 'bg-emerald-500',
  neutral: 'bg-blue-500',
  bad: 'bg-amber-500',
}

export function Meter({
  label,
  value,
  reading,
  compact = false,
}: {
  label: string
  value: number
  reading: Reading
  compact?: boolean
}) {
  const percent = Math.round(value)
  return (
    <div className={compact ? 'w-16' : ''}>
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-slate-500">{label}</span>
        {!compact && <span className={TONE_TEXT[reading.tone]}>{reading.label}</span>}
      </div>
      <div
        className={`mt-0.5 overflow-hidden rounded-full bg-slate-200 ${compact ? 'h-1' : 'h-1.5'}`}
        role="meter"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percent} (${reading.label})`}
      >
        <div
          className={`h-full rounded-full ${TONE_BAR[reading.tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!compact && <p className="mt-0.5 text-xs text-slate-500">{reading.advice}</p>}
    </div>
  )
}

export function WorkdayBar({
  profile,
  pendingMinutes,
  status,
  variant = 'header',
}: {
  profile: Profile
  pendingMinutes: number
  status: ClockStatus
  /** 'taskbar': the clock at the end of the computer's taskbar, opening upwards. */
  variant?: 'header' | 'taskbar'
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const { work } = profile
  const minute = Math.min(HOURS.closing, work.minute + pendingMinutes)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const statusText =
    status === 'running'
      ? 'Clock running while you work'
      : status === 'paused'
        ? 'Clock paused: you seem to be away'
        : 'Time moves when you do things'

  if (variant === 'taskbar')
    return (
      <div className="relative flex" ref={root}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex flex-col items-center justify-center px-2.5 text-[11px] leading-tight text-white hover:bg-white/10 ${
            open ? 'bg-white/10' : ''
          }`}
          data-testid="workday-bar"
          title={statusText}
        >
          <span className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'running'
                  ? 'bg-emerald-400'
                  : status === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-white/40'
              }`}
              aria-hidden
            />
            <span data-testid="office-clock">{formatTime(minute)}</span>
          </span>
          <span>
            {weekdayName(work.day)}, week {weekNumber(work.day)}
          </span>
        </button>
        {open && <DayPanel profile={profile} statusText={statusText} above />}
      </div>
    )

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-slate-50"
        data-testid="workday-bar"
        title={statusText}
      >
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
            <span
              className={`h-2 w-2 rounded-full ${
                status === 'running'
                  ? 'bg-emerald-500'
                  : status === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-slate-300'
              }`}
              aria-hidden
            />
            <span data-testid="office-clock">{formatTime(minute)}</span>
          </span>
          <span className="block text-xs text-slate-500">
            {weekdayName(work.day)}, week {weekNumber(work.day)}
          </span>
        </span>
        <span className="hidden space-y-1 sm:block">
          <Meter
            compact
            label="Energy"
            value={work.wellbeing.energy}
            reading={energyReading(work.wellbeing.energy)}
          />
          <Meter
            compact
            label="Stress"
            value={work.wellbeing.stress}
            reading={stressReading(work.wellbeing.stress)}
          />
        </span>
      </button>
      {open && <DayPanel profile={profile} statusText={statusText} />}
    </div>
  )
}

function DayPanel({
  profile,
  statusText,
  above = false,
}: {
  profile: Profile
  statusText: string
  above?: boolean
}) {
  const { work } = profile
  const lunch = lunchAvailability(work)
  const deadlines = Object.entries(work.deadlines)
    .filter(([id, d]) => d.status !== 'met' && getAssignment(id))
    .sort((a, b) => a[1].due - b[1].due)
  const moment = now(work)

  return (
    <section
      className={`absolute right-0 z-40 max-h-[80vh] ${above ? 'bottom-full mb-1 rounded-none text-left' : 'top-full mt-2 rounded-xl'} w-[22rem] overflow-y-auto bg-white p-4 shadow-2xl ring-1 ring-slate-200`}
      aria-label="Your day"
      data-testid="day-panel"
    >
      <h2 className="font-semibold text-slate-900">
        {weekdayName(work.day)}, {formatTime(work.minute)}
      </h2>
      <p className="text-xs text-slate-500">
        {statusText}. Ten real minutes at the computer are one office hour; office actions
        such as lunch take a set time. Nothing moves while you are away.
      </p>

      <h3 className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Today
      </h3>
      <ul className="mt-1 space-y-1 text-sm">
        <ScheduleRow time={formatTime(HOURS.start)} text="Work starts" />
        {meetingsOn(work.day).map((meeting) => {
          const state = meetingState(work, meeting)
          return (
            <ScheduleRow
              key={meeting.id}
              time={formatTime(meeting.start)}
              text={fill(meeting.title)}
              state={
                state === 'attended'
                  ? { text: 'Attended', tone: 'good' }
                  : state === 'late'
                    ? { text: 'Late', tone: 'bad' }
                    : state === 'missed'
                      ? { text: 'Missed', tone: 'bad' }
                      : state === 'open'
                        ? { text: 'Starting now', tone: 'neutral' }
                        : undefined
              }
            />
          )
        })}
        <ScheduleRow
          time={`${formatTime(LUNCH.from)}–${formatTime(LUNCH.until)}`}
          text="Lunch (break room)"
          state={
            lunch === 'taken'
              ? { text: 'Done', tone: 'good' }
              : lunch === 'too-late'
                ? { text: 'Skipped', tone: 'bad' }
                : lunch === 'available'
                  ? { text: 'Now', tone: 'neutral' }
                  : undefined
          }
        />
        <ScheduleRow time={formatTime(HOURS.end)} text="End of the working day" />
      </ul>

      {deadlines.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Deadlines
          </h3>
          <ul className="mt-1 space-y-1 text-sm" data-testid="deadlines">
            {deadlines.map(([id, deadline]) => {
              const late = deadline.status === 'late' || deadline.due < moment
              return (
                <li key={id} className="flex justify-between gap-3">
                  <span className="text-slate-800">{getAssignment(id)?.title}</span>
                  <span
                    className={`shrink-0 ${late ? 'font-medium text-red-700' : 'text-slate-500'}`}
                  >
                    {late ? 'Overdue' : formatMoment(deadline.due, work.day)}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <h3 className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        How you are doing
      </h3>
      <div className="mt-1 space-y-2">
        <Meter
          label="Energy"
          value={work.wellbeing.energy}
          reading={energyReading(work.wellbeing.energy)}
        />
        <Meter
          label="Stress"
          value={work.wellbeing.stress}
          reading={stressReading(work.wellbeing.stress)}
        />
        <Meter
          label="Engagement"
          value={work.wellbeing.engagement}
          reading={engagementReading(work.wellbeing.engagement)}
        />
        <Meter
          label="Fatigue"
          value={work.wellbeing.fatigue}
          reading={fatigueReading(work.wellbeing.fatigue)}
        />
      </div>

      {work.today.log.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            So far today
          </h3>
          <ul className="mt-1 space-y-0.5 text-sm" data-testid="day-log">
            {work.today.log.map((entry, i) => (
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
        </>
      )}
    </section>
  )
}

function ScheduleRow({
  time,
  text,
  state,
}: {
  time: string
  text: string
  state?: { text: string; tone: 'good' | 'neutral' | 'bad' }
}) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="w-28 shrink-0 text-xs text-slate-500">{time}</span>
      <span className="flex-1 text-slate-800">{text}</span>
      {state && (
        <span
          className={`text-xs ${
            state.tone === 'good'
              ? 'text-emerald-700'
              : state.tone === 'bad'
                ? 'text-amber-700'
                : 'font-medium text-blue-700'
          }`}
        >
          {state.text}
        </span>
      )}
    </li>
  )
}
