/**
 * Story Mode's rules (see docs/STORY_MODE_PLAN.md): which missions are open,
 * which is being played, what is left to do, what the player decided, and
 * what a finished mission is worth. A campaign is data (campaigns/); this
 * works it out. Objectives are done by the game's own systems: being dressed
 * or somewhere (checked after every change), a meeting attended, a case
 * answered, or a scene played on walking up to someone. Rewards are given
 * once, by mission. Pure.
 */
import type { Story, WorkState } from '../../persistence/schemas'
import type { ProfileData } from '../career'
import { arriveCase } from '../cases'
import { caseFor } from '../caseVariants'
import { firstName } from '../career'
import { earn } from '../lifeTime'
import { changeTrust } from '../relationships'
import { campaignFor } from './campaigns'
import type { Campaign, Mission, Objective, Scene } from './types'

export function storyOf(profile: ProfileData): Story | undefined {
  return profile.work.story
}

/** A fresh story: the first mission under way. */
export function startStory(profile: ProfileData, now = Date.now()): ProfileData {
  const campaign = campaignFor(profile.careerId)
  if (!campaign) return profile
  const story: Story = {
    campaign: campaign.id,
    started: profile.work.day,
    chapter: campaign.chapters[0].id,
    active: null,
    progress: {},
    done: [],
    decisions: {},
    flags: [],
    finished: null,
  }
  const first = campaign.chapters[0].missions[0]
  return checkStory(startMission(withStory(profile, story), first.id, now))
}

/** Free play again: the story is put away (its progress is not kept). */
export function endStory(profile: ProfileData): ProfileData {
  const { story: _story, ...work } = profile.work
  void _story
  return { ...profile, work: work as WorkState }
}

function withStory(profile: ProfileData, story: Story): ProfileData {
  return { ...profile, work: { ...profile.work, story } }
}

export function missionsOf(campaign: Campaign): Mission[] {
  return campaign.chapters.flatMap((c) => c.missions)
}

export function missionById(campaign: Campaign, id: string | null): Mission | undefined {
  return id ? missionsOf(campaign).find((m) => m.id === id) : undefined
}

function chapterIndexOf(campaign: Campaign, m: Mission): number {
  return campaign.chapters.findIndex((c) => c.missions.includes(m))
}

export type MissionStatus = 'done' | 'active' | 'open' | 'locked'

export function statusOf(campaign: Campaign, story: Story, m: Mission): MissionStatus {
  if (story.done.includes(m.id)) return 'done'
  if (story.active === m.id) return 'active'
  const reached = campaign.chapters.findIndex((c) => c.id === story.chapter)
  if (chapterIndexOf(campaign, m) > reached) return 'locked'
  if (m.after?.some((id) => !story.done.includes(id))) return 'locked'
  if (m.needs?.some((f) => !story.flags.includes(f))) return 'locked'
  if (m.unless?.some((f) => story.flags.includes(f))) return 'locked'
  return 'open'
}

/** The objective to do now in the mission under way (they are done in order). */
export function currentObjective(campaign: Campaign, story: Story): Objective | null {
  const m = missionById(campaign, story.active)
  if (!m) return null
  const done = story.progress[m.id] ?? []
  return m.objectives.find((o) => !done.includes(o.id)) ?? null
}

/** Starts (or switches to) an open mission. A case it needs arrives in the inbox. */
export function startMission(
  profile: ProfileData,
  missionId: string,
  now = Date.now(),
): ProfileData {
  const story = storyOf(profile)
  const campaign = story && campaignFor(profile.careerId)
  const m = campaign && missionById(campaign, missionId)
  if (!story || !campaign || !m) return profile
  const status = statusOf(campaign, story, m)
  if (status !== 'open' && status !== 'active') return profile
  let next = withStory(profile, {
    ...story,
    active: m.id,
    progress: { ...story.progress, [m.id]: story.progress[m.id] ?? [] },
  })
  for (const o of m.objectives)
    if (o.kind === 'case' && !next.work.cases[o.case]) {
      const def = caseFor(next, o.case)
      if (def) next = arriveCase(next, def, now)
    }
  return next
}

/** Whether a state objective is true now. */
export function isTrue(profile: ProfileData, o: Objective): boolean {
  const life = profile.work.life
  const out = life.phase !== 'work'
  switch (o.kind) {
    case 'state':
      switch (o.state) {
        case 'dressed':
          return life.ready.dressed
        case 'at-office':
          return life.phase === 'work' && !profile.work.dayOver
        case 'at-home':
          return out && life.city.at === 'home' && life.city.inside
        default:
          return out && life.city.inside && life.city.at === o.state.slice(3)
      }
    case 'meeting': {
      const m = profile.work.today.meetings[o.meeting]
      return m === 'attended' || m === 'late'
    }
    case 'case':
      return profile.work.cases[o.case]?.status === 'submitted'
    case 'talk':
      return false
  }
}

/**
 * After any change: objectives that have come true are done (in order), and a
 * mission with everything done is finished: its flags set, its reward given
 * (once), the next chapter opened when the main missions of this one are done.
 */
export function checkStory(profile: ProfileData): ProfileData {
  let story = storyOf(profile)
  const campaign = story && campaignFor(profile.careerId)
  if (!story || !campaign) return profile
  let next = profile
  for (let guard = 0; guard < 20; guard++) {
    const o = currentObjective(campaign, story)
    if (!o || !isTrue(next, o)) break
    story = markDone(story, o)
  }
  next = withStory(next, story)
  return finishIfDone(next, campaign)
}

function markDone(story: Story, o: Objective): Story {
  const id = story.active!
  return {
    ...story,
    progress: { ...story.progress, [id]: [...(story.progress[id] ?? []), o.id] },
  }
}

function finishIfDone(profile: ProfileData, campaign: Campaign): ProfileData {
  const story = storyOf(profile)!
  const m = missionById(campaign, story.active)
  if (!m || currentObjective(campaign, story)) return profile
  if (story.done.includes(m.id)) return profile
  const done = [...story.done, m.id]
  const index = chapterIndexOf(campaign, m)
  const chapter = campaign.chapters[index]
  const chapterDone = chapter.missions
    .filter((x) => x.type === 'main')
    .every((x) => done.includes(x.id))
  const nextChapter = chapterDone ? campaign.chapters[index + 1] : undefined
  let next = withStory(profile, {
    ...story,
    active: null,
    done,
    chapter: nextChapter?.id ?? story.chapter,
    flags: [...new Set([...story.flags, ...(m.flags ?? [])])],
    finished: m.id,
  })
  // The reward, once (the mission is now in `done`).
  const r = m.reward
  if (r.xp) next = { ...next, xp: next.xp + r.xp }
  let work = next.work
  for (const [person, delta] of Object.entries(r.trust ?? {}))
    work = changeTrust(work, person, delta)
  if (r.money)
    work = { ...work, life: earn(work.life, work.day, r.money, `Story: ${m.title}`) }
  return { ...next, work }
}

/** The scene to play on walking up to someone, if the mission under way needs it. */
export function sceneFor(profile: ProfileData, person: string): Scene | null {
  const story = storyOf(profile)
  const campaign = story && campaignFor(profile.careerId)
  if (!story || !campaign) return null
  const o = currentObjective(campaign, story)
  if (!o || o.kind !== 'talk' || o.person !== person) return null
  return campaign.scenes[o.scene] ?? null
}

/** A scene's lines, as said to this player (with what they decided before). */
export function sceneLines(profile: ProfileData, scene: Scene): string[] {
  const flags = storyOf(profile)?.flags ?? []
  const name = firstName(profile.name)
  return scene.lines(flags).map((l) => l.replaceAll('{name}', name))
}

/**
 * The player made a choice in a scene: remembered (once), its flags set, the
 * trust it changes, and the talk objective done.
 */
export function playScene(
  profile: ProfileData,
  sceneId: string,
  choiceId: string,
): ProfileData {
  const story = storyOf(profile)
  const campaign = story && campaignFor(profile.careerId)
  const scene = campaign?.scenes[sceneId]
  const choice = scene?.choices.find((c) => c.id === choiceId)
  if (!story || !campaign || !scene || !choice) return profile
  if (story.decisions[sceneId]) return profile
  let next = withStory(profile, {
    ...story,
    decisions: { ...story.decisions, [sceneId]: choiceId },
    flags: [...new Set([...story.flags, ...(choice.flags ?? [])])],
  })
  let work = next.work
  for (const [person, delta] of Object.entries(choice.trust ?? {}))
    work = changeTrust(work, person, delta)
  next = { ...next, work }
  const o = currentObjective(campaign, storyOf(next)!)
  if (o?.kind === 'talk' && o.scene === sceneId)
    next = withStory(next, markDone(storyOf(next)!, o))
  return checkStory(finishIfDone(next, campaign))
}

/** The finished mission's summary has been read. */
export function seenFinished(profile: ProfileData): ProfileData {
  const story = storyOf(profile)
  return story ? withStory(profile, { ...story, finished: null }) : profile
}

/** How far through the campaign: missions done of all main missions. */
export function progressOf(
  campaign: Campaign,
  story: Story,
): { done: number; of: number } {
  const main = missionsOf(campaign).filter((m) => m.type === 'main')
  return { done: main.filter((m) => story.done.includes(m.id)).length, of: main.length }
}
