/**
 * Playing a live scenario (content/scenarios): where the player is in it,
 * what each answer earns and how the cast responds, the outcome, and what it
 * leads to: trust, reputation and wellbeing, XP and skills the first time,
 * the linked case's meeting and answers, and a record in the save. Pure, so
 * every scenario can be played through in tests.
 */
import { getCase } from '../content/cases'
import type {
  Band,
  Beat,
  CastMember,
  Line,
  Place,
  Scenario,
} from '../content/scenarios/types'
import { advanceCareer, firstName, type ProfileData } from './career'
import { joinMeeting, meetingStatus, saveCaseAnswer } from './cases'
import { applyEffects, type Effects } from './scenes'
import { log, passTime } from './workday'
import type { Activity } from '../world/interaction/activity'

/** One answer, for the review at the end. */
export interface Answered {
  beat: string
  prompt: string
  answer: string
  earned: number
  points: number
  lesson: string
}

export interface Run {
  scenario: string
  /** The beat the player is at. */
  at: string
  earned: number
  possible: number
  /** Choice and exhibit answers, by beat. */
  picks: Record<string, string>
  answers: Answered[]
  /** Effects of individual answers, applied at the end. */
  effects: Effects[]
}

export function startRun(scenario: Scenario): Run {
  return {
    scenario: scenario.id,
    at: scenario.beats[0].id,
    earned: 0,
    possible: 0,
    picks: {},
    answers: [],
    effects: [],
  }
}

export function beatOf(scenario: Scenario, run: Run): Beat {
  const beat = scenario.beats.find((b) => b.id === run.at)
  if (!beat) throw new Error(`No beat ${run.at} in ${scenario.id}`)
  return beat
}

export const isOver = (scenario: Scenario, run: Run): boolean =>
  beatOf(scenario, run).kind === 'end'

/** The beat after this one (or the one an answer leads to). */
function nextBeat(scenario: Scenario, from: string, goto?: string): string {
  if (goto) return goto
  const i = scenario.beats.findIndex((b) => b.id === from)
  return scenario.beats[Math.min(i + 1, scenario.beats.length - 1)].id
}

/** Past a line: on to the next beat. */
export function advance(scenario: Scenario, run: Run): Run {
  const beat = beatOf(scenario, run)
  if (beat.kind !== 'say') return run
  return { ...run, at: nextBeat(scenario, beat.id) }
}

function answered(
  run: Run,
  beat: { id: string; prompt: string; points: number },
  answer: string,
  share: number,
  lesson: string,
): Run {
  const earned = Math.round(beat.points * Math.max(0, Math.min(1, share)))
  return {
    ...run,
    earned: run.earned + earned,
    possible: run.possible + beat.points,
    answers: [
      ...run.answers,
      { beat: beat.id, prompt: beat.prompt, answer, earned, points: beat.points, lesson },
    ],
  }
}

/** Answers a choice: the cast's reaction, and where it leads. */
export function choose(
  scenario: Scenario,
  run: Run,
  optionId: string,
): { run: Run; reply: Line[] } {
  const beat = beatOf(scenario, run)
  if (beat.kind !== 'choose') return { run, reply: [] }
  const option = beat.options.find((o) => o.id === optionId)
  if (!option) throw new Error(`No option ${optionId} at ${beat.id}`)
  let next = answered(run, beat, option.label, option.score, option.lesson)
  next = {
    ...next,
    picks: { ...next.picks, [beat.id]: option.id },
    effects: option.effects ? [...next.effects, option.effects] : next.effects,
    at: nextBeat(scenario, beat.id, option.goto),
  }
  return { run: next, reply: option.reply }
}

/** Presents one exhibit. */
export function present(
  scenario: Scenario,
  run: Run,
  itemId: string,
): { run: Run; reply: Line[] } {
  const beat = beatOf(scenario, run)
  if (beat.kind !== 'exhibit') return { run, reply: [] }
  const right = itemId === beat.correct
  const title = scenario.exhibits?.find((e) => e.id === itemId)?.title ?? itemId
  let next = answered(run, beat, title, right ? 1 : 0, beat.lesson)
  next = {
    ...next,
    picks: { ...next.picks, [beat.id]: itemId },
    at: nextBeat(scenario, beat.id),
  }
  return { run: next, reply: right ? beat.right : beat.wrong }
}

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean)

/** How well a spoken answer covers the rubric: 0 to 1. */
export function speechShare(
  text: string,
  rubric: { minWords: number; mentions: string[][] },
): number {
  const lower = text.toLowerCase()
  const covered = rubric.mentions.filter((group) =>
    group.some((term) => lower.includes(term.toLowerCase())),
  ).length
  const coverage = rubric.mentions.length ? covered / rubric.mentions.length : 1
  const long = words(text).length >= rubric.minWords ? 1 : 0
  return 0.25 * long + 0.75 * coverage
}

/** Says something in the player's own words. */
export function speak(
  scenario: Scenario,
  run: Run,
  text: string,
): { run: Run; reply: Line[] } {
  const beat = beatOf(scenario, run)
  if (beat.kind !== 'speak') return { run, reply: [] }
  const share = speechShare(text, beat)
  let next = answered(run, beat, text.trim(), share, beat.lesson)
  next = { ...next, at: nextBeat(scenario, beat.id) }
  return { run: next, reply: share >= 0.6 ? beat.good : beat.weak }
}

export function percentOf(run: Run): number {
  return run.possible ? Math.round((run.earned / run.possible) * 100) : 0
}

export function bandFor(percent: number): Band {
  if (percent >= 85) return 'excellent'
  if (percent >= 70) return 'good'
  if (percent >= 50) return 'pass'
  return 'poor'
}

/** The scenarios record of a profile (absent in older saves). */
export const scenarioRecord = (profile: ProfileData, id: string) =>
  profile.work.scenarios?.[id]

/**
 * The scenario's consequences, applied once it is over:
 * - the outcome's effects and those of each answer (once per office day);
 * - XP and skills the first time it is played, scaled by the score;
 * - when it is the meeting of an open case that is on now: the meeting is
 *   joined and the answers saved as the case's answers;
 * - office time, the day's log, and a record of the result.
 */
export function applyScenario(
  profile: ProfileData,
  scenario: Scenario,
  run: Run,
  at: number = Date.now(),
): ProfileData {
  const percent = percentOf(run)
  const band = bandFor(percent)
  const outcome = scenario.outcomes[band]
  const before = scenarioRecord(profile, scenario.id)
  const today = profile.work.day
  let next = profile

  // Consequences for people: once a day, so repeating it is practice.
  if (!before || before.day !== today) {
    next = applyEffects(next, outcome.effects)
    for (const effects of run.effects) next = applyEffects(next, effects)
  }

  // The case whose meeting this is, if it is on now.
  let joined = false
  const link = scenario.caseLink
  const def = link && getCase(link.caseId)
  const progress = link && next.work.cases[link.caseId]
  if (
    link &&
    def &&
    progress?.status === 'open' &&
    meetingStatus(next.work, def, progress) === 'open'
  ) {
    next = joinMeeting(next, link.caseId)
    joined = true
    for (const { beat, step, options } of link.answers) {
      const pick = run.picks[beat]
      if (pick && options[pick])
        next = saveCaseAnswer(next, link.caseId, step, options[pick])
    }
  }
  if (!joined) next = passTime(next, 30, 'meeting')

  // XP and skills: the first time only.
  if (!before) {
    const share = percent / 100
    const skills = { ...next.skills }
    for (const [id, gain] of Object.entries(scenario.skills))
      skills[id] = (skills[id] ?? 0) + Math.round(gain * share)
    next = { ...next, xp: next.xp + Math.round(scenario.xp * share), skills }
  }

  const tone = band === 'poor' ? 'bad' : 'good'
  next = {
    ...next,
    work: {
      ...log(next.work, `${scenario.title}: ${outcome.verdict} (${percent}%)`, tone),
      scenarios: {
        ...next.work.scenarios,
        [scenario.id]: {
          best: Math.max(before?.best ?? 0, percent),
          last: percent,
          times: (before?.times ?? 0) + 1,
          day: today,
          band,
        },
      },
    },
  }
  return advanceCareer(next, at).profile
}

/** Fills {name} in a line for this player. */
export const fillName = (text: string, profile: ProfileData): string =>
  text.replaceAll('{name}', firstName(profile.name))

/** Where a member of the cast is at this beat (the last move before it, or their place). */
export function placeAt(
  scenario: Scenario,
  member: CastMember,
  beatId: string,
): { at: Place; faces: Place; seated: boolean } {
  const order = scenario.beats.map((b) => b.id)
  const here = order.indexOf(beatId)
  let place = { at: member.at, faces: member.faces, seated: !!member.seated }
  for (const move of member.moves ?? []) {
    if (order.indexOf(move.from) <= here)
      place = { at: move.at, faces: move.faces, seated: !!move.seated }
  }
  return place
}

/** Taking one's place for a scenario: walked to like any activity, then it begins. */
export function scenarioActivity(scenario: Scenario): Activity {
  const { at, faces } = scenario.player
  return {
    id: `scenario:${scenario.id}`,
    action: `scenario:${scenario.id}`,
    prompt: `take your place: ${scenario.title}`,
    spot: { x: at.x, z: at.z, reach: 0.9 },
    anchor: {
      x: at.x,
      z: at.z,
      heading: Math.atan2(-(faces.x - at.x), -(faces.z - at.z)),
    },
    stages: [
      { clip: 'stand', seconds: 0.6, label: `Taking your place: ${scenario.room}` },
    ],
  }
}
