/**
 * Story Mode (see game/story/): the screen to start, continue and follow a
 * story (the chapters and their missions, main and side, done and still to
 * come; the decisions made; the people in it and how they see the player),
 * and the tracker that stays on screen while playing: the mission under way,
 * what to do now and where, and a mission's summary when it is done.
 */
import { useEffect, useRef } from 'react'
import { trustOf, trustReading } from '../game/relationships'
import type { ProfileData } from '../game/career'
import { campaignFor } from '../game/story/campaigns'
import {
  currentObjective,
  endStory,
  missionById,
  missionsOf,
  progressOf,
  seenFinished,
  startMission,
  startStory,
  statusOf,
  storyOf,
} from '../game/story/engine'
import type { Mission, Where } from '../game/story/types'

type Act = (change: (p: ProfileData) => ProfileData) => unknown

const WHERE: Record<Where, string> = {
  home: 'at home',
  office: 'at the office',
  reception: 'at the office, reception',
  desk: 'at the office, the open-plan desks',
  manager: 'at the office, the manager’s office',
  breakroom: 'at the office, the break room',
  cafe: 'in town: the café',
  park: 'in town: the park',
  shop: 'in town: the supermarket',
  gym: 'in town: the gym',
  garage: 'in town: Cog & Kerb',
}

const TYPE: Record<Mission['type'], string> = {
  main: 'Main',
  side: 'Side',
  workplace: 'Work',
  personal: 'Personal',
  character: 'Character',
}

export function StoryPanel({
  profile,
  act,
  onClose,
}: {
  profile: ProfileData
  act: Act
  onClose: () => void
}) {
  const campaign = campaignFor(profile.careerId)
  const story = storyOf(profile)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6">
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-label="Story Mode"
        data-testid="story-panel"
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-rose-700 uppercase">
              Story Mode
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              {campaign ? campaign.title : 'Coming soon for this career'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        {!campaign ? (
          <p className="mt-3 text-sm text-slate-600">
            The story for this career is being written. Finance &amp; Administration has
            the first one; free play carries on as normal.
          </p>
        ) : !story ? (
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <p>{campaign.premise}</p>
            <p>
              Story Mode plays out in this career’s world: missions are things you do in
              person, people remember what you decide, and between missions your time is
              your own. Your career so far is kept; you can put the story away at any
              time.
            </p>
            <button
              type="button"
              onClick={() => {
                void act((p) => startStory(p))
                onClose()
              }}
              className="rounded-md bg-rose-700 px-4 py-2 font-medium text-white hover:bg-rose-800"
            >
              Start the story
            </button>
          </div>
        ) : (
          <StoryProgress profile={profile} act={act} onClose={onClose} />
        )}
      </div>
    </div>
  )
}

function StoryProgress({
  profile,
  act,
  onClose,
}: {
  profile: ProfileData
  act: Act
  onClose: () => void
}) {
  const campaign = campaignFor(profile.careerId)!
  const story = storyOf(profile)!
  const active = missionById(campaign, story.active)
  const now = currentObjective(campaign, story)
  const progress = progressOf(campaign, story)
  const decided = Object.entries(story.decisions)
  return (
    <div className="mt-4 space-y-5 text-sm">
      {progress.done === progress.of && (
        <section
          aria-label="The end"
          data-testid="story-ending"
          className="rounded-lg bg-slate-900 p-4 text-white"
        >
          <p className="text-xs font-semibold tracking-wide text-rose-300 uppercase">
            The end
          </p>
          <p className="mt-1">
            {missionsOf(campaign)
              .filter((m) => m.type === 'main')
              .at(-1)!
              .summary(story.flags)}
          </p>
          <p className="mt-2 text-xs text-slate-300">
            Your career carries on in free play. Side missions you have not done are still
            open.
          </p>
        </section>
      )}
      <section aria-label="Continue">
        <p className="text-slate-600">
          {progress.done} of {progress.of} main missions done ·{' '}
          {campaign.chapters.find((c) => c.id === story.chapter)?.title}
        </p>
        {active && now ? (
          <div className="mt-2 rounded-lg bg-rose-50 p-3 text-rose-950">
            <p className="font-semibold">{active.title}</p>
            <p>
              Now: {now.label} ({WHERE[now.where]})
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-md bg-rose-700 px-3 py-1.5 font-medium text-white hover:bg-rose-800"
            >
              Continue the story
            </button>
          </div>
        ) : (
          <p className="mt-2 text-slate-700">
            No mission under way. Choose one below, or carry on with your day.
          </p>
        )}
      </section>

      {campaign.chapters.map((chapter) => (
        <section key={chapter.id} aria-label={chapter.title}>
          <h3 className="font-semibold text-slate-900">{chapter.title}</h3>
          <ul className="mt-2 space-y-2">
            {chapter.missions.map((m) => {
              const status = statusOf(campaign, story, m)
              return (
                <li
                  key={m.id}
                  data-testid={`mission-${m.id}`}
                  data-status={status}
                  className={`rounded-lg border p-3 ${
                    status === 'active'
                      ? 'border-rose-300 bg-rose-50'
                      : status === 'locked'
                        ? 'border-slate-200 bg-slate-50 text-slate-400'
                        : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                        {TYPE[m.type]}
                      </span>
                      {status === 'locked' ? 'Not yet' : m.title}
                    </p>
                    {status === 'open' && (
                      <button
                        type="button"
                        onClick={() => void act((p) => startMission(p, m.id))}
                        className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-50"
                      >
                        {story.active ? 'Switch to this' : 'Start'}
                      </button>
                    )}
                    {status === 'done' && (
                      <span className="text-xs font-medium text-emerald-700">Done</span>
                    )}
                    {status === 'active' && (
                      <span className="text-xs font-medium text-rose-700">Under way</span>
                    )}
                  </div>
                  {status !== 'locked' && (
                    <p className="mt-1 text-slate-600">
                      {status === 'done' ? m.summary(story.flags) : m.intro[0]}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <section aria-label="People">
        <h3 className="font-semibold text-slate-900">People in your story</h3>
        <ul className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {Object.entries(campaign.cast).map(([id, name]) => {
            const r = trustReading(trustOf(profile.work, id))
            return (
              <li key={id} className="flex justify-between gap-2">
                <span>{name}</span>
                <span className="text-slate-500">{r.label}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-label="Your decisions">
        <h3 className="font-semibold text-slate-900">Your decisions</h3>
        {decided.length === 0 ? (
          <p className="mt-1 text-slate-500">None yet.</p>
        ) : (
          <ul className="mt-2 space-y-1" data-testid="story-decisions">
            {decided.map(([scene, choice]) => {
              const s = campaign.scenes[scene]
              const c = s?.choices.find((x) => x.id === choice)
              return (
                <li key={scene}>
                  <span className="text-slate-500">
                    {campaign.cast[s?.person ?? ''] ?? ''}:
                  </span>{' '}
                  {c?.label}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => {
          if (
            window.confirm(
              'Put the story away? Its progress is not kept; your career is.',
            )
          )
            void act((p) => endStory(p))
        }}
        className="text-xs text-slate-500 underline hover:text-slate-700"
      >
        Put the story away (back to free play only)
      </button>
    </div>
  )
}

/** On screen while playing: the mission, what to do now and where; a summary when done. */
export function StoryTracker({ profile, act }: { profile: ProfileData; act: Act }) {
  const story = storyOf(profile)
  const campaign = campaignFor(profile.careerId)
  if (!story || !campaign) return null
  const finished = missionById(campaign, story.finished)
  if (finished)
    return (
      <div
        role="status"
        data-testid="story-finished"
        className="fixed top-16 left-1/2 z-40 w-[28rem] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-slate-900/95 p-4 text-white shadow-2xl"
      >
        <p className="text-xs font-semibold tracking-wide text-rose-300 uppercase">
          Mission complete
        </p>
        <p className="text-lg font-semibold">{finished.title}</p>
        <p className="mt-1 text-sm text-slate-200">{finished.summary(story.flags)}</p>
        <p className="mt-1 text-xs text-slate-400">
          {[
            finished.reward.xp ? `+${finished.reward.xp} XP` : '',
            ...Object.keys(finished.reward.trust ?? {}).map(
              (id) => `${campaign.cast[id] ?? id} trusts you more`,
            ),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <button
          type="button"
          onClick={() => void act(seenFinished)}
          className="mt-2 rounded-md bg-white/15 px-3 py-1 text-sm hover:bg-white/25"
        >
          Carry on
        </button>
      </div>
    )
  const active = missionById(campaign, story.active)
  const now = currentObjective(campaign, story)
  if (!active || !now) return null
  return (
    <div
      role="status"
      aria-label="Mission"
      data-testid="story-tracker"
      className="pointer-events-none fixed top-16 right-4 z-30 w-72 rounded-lg bg-slate-900/85 p-3 text-white shadow-lg"
    >
      <p className="text-xs font-semibold tracking-wide text-rose-300 uppercase">
        {active.title}
      </p>
      <p className="text-sm font-medium">{now.label}</p>
      <p className="text-xs text-slate-300">{WHERE[now.where]}</p>
    </div>
  )
}
