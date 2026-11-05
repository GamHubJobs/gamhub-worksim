/**
 * React's side of sound: the scene for where the player is, the settings, and
 * the game's news as sounds. The news is read from changes to the save (a new
 * email, a passed task, a promotion, pay), so the game rules stay free of sound.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { isPassed, careerAssignments, type ProfileData } from '../game/career'
import { isPassedAttempt } from '../game/assessments'
import { audio, type EffectId } from './manager'
import type { Scene } from './scenes'
import type { AudioSettings } from './settings'

/** Asks for a scene while this component is shown; the one before comes back after. */
export function useAudioScene(scene: Scene | null): void {
  const claim = useRef<number | null>(null)
  useEffect(() => {
    claim.current = audio.claim(null)
    return () => {
      if (claim.current !== null) audio.release(claim.current)
      claim.current = null
    }
  }, [])
  // Cheap when nothing changed: the manager compares scenes by their key.
  useEffect(() => {
    if (claim.current !== null) audio.change(claim.current, scene)
  })
}

/** A scene for part of the page, as a component. */
export function AudioScene({ scene }: { scene: Scene | null }): null {
  useAudioScene(scene)
  return null
}

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(
    (change) => audio.subscribe(change),
    () => audio.settings,
  )
}

interface Snapshot {
  inbox: number
  unread: number
  attempts: number
  passed: number
  level: string
  achievements: number
  assessments: number
  assessmentsPassed: number
  income: number
  pay: number
  phone: number
  offers: number
  declined: number
  answers: number
  overdrawn: boolean
  /** Where in the neighbourhood, and the part of the day (for doors). */
  where: string
  phase: string
}

export function snapshot(profile: ProfileData): Snapshot {
  const life = profile.work.life
  const assignments = careerAssignments(profile.careerId)
  const record = profile.work.record
  const stages = life.career.applications.map((a) => a.stage)
  return {
    inbox: profile.inbox.length,
    unread: profile.inbox.filter((m) => !m.readAt).length,
    attempts: Object.values(profile.assignments).reduce(
      (n, p) => n + p.attempts.length,
      0,
    ),
    passed: assignments.filter((a) => isPassed(a, profile.assignments[a.id])).length,
    level: profile.levelId,
    achievements: Object.keys(record.achievements).length,
    assessments: record.assessments.length,
    assessmentsPassed: record.assessments.filter(isPassedAttempt).length,
    income: life.ledger.filter((e) => e.amount > 0 && !/^Pay for week/.test(e.text))
      .length,
    pay: life.ledger.filter((e) => /^Pay for week/.test(e.text)).length,
    phone: life.social.messages.filter((m) => m.from !== 'me' && !m.read).length,
    offers: stages.filter((s) => s === 'offer').length,
    declined: stages.filter((s) => s === 'declined').length,
    answers: stages.filter((s) => s === 'rejected' || s === 'interview' || s === 'failed')
      .length,
    overdrawn: life.money < 0,
    where: `${life.city.at}:${life.city.inside}`,
    phase: profile.work.dayOver ? life.phase : 'work',
  }
}

/** The sounds for what changed between two snapshots, most important first. */
export function soundsFor(before: Snapshot, after: Snapshot): EffectId[] {
  const out: EffectId[] = []
  if (after.level !== before.level) out.push('promotion')
  if (after.achievements > before.achievements) out.push('achievement')
  if (after.passed > before.passed) out.push('task')
  else if (after.attempts > before.attempts) out.push('fail')
  if (after.assessmentsPassed > before.assessmentsPassed) out.push('success')
  else if (after.assessments > before.assessments) out.push('fail')
  if (after.pay > before.pay) out.push('pay')
  else if (after.income > before.income) out.push('pay')
  if (after.offers > before.offers) out.push('offer')
  if (after.declined > before.declined) out.push('decline')
  if (after.answers > before.answers) out.push('notify')
  if (after.inbox > before.inbox && after.unread > before.unread) out.push('mail')
  if (after.phone > before.phone) out.push('phone')
  if (after.overdrawn && !before.overdrawn) out.push('warn')
  // Going in or out of a door in the neighbourhood (not the journey to work).
  if (
    after.where !== before.where &&
    after.phase === before.phase &&
    after.phase !== 'work'
  )
    out.push('door')
  // At most two at once, so big moments are not a jumble.
  return out.slice(0, 2)
}

/** Plays the game's news as it happens (not when a save is first opened). */
export function useGameSounds(profile: ProfileData | null): void {
  const previous = useRef<{ id: string; snap: Snapshot } | null>(null)
  useEffect(() => {
    if (!profile) return
    const snap = snapshot(profile)
    const before = previous.current
    previous.current = { id: profile.name + profile.careerId, snap }
    if (!before || before.id !== previous.current.id) return
    soundsFor(before.snap, snap).forEach((id, i) =>
      i === 0 ? audio.play(id) : window.setTimeout(() => audio.play(id), 700),
    )
  }, [profile])
}
