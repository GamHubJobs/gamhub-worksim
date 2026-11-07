/**
 * Small helpers for writing campaigns: an objective to talk to someone, to
 * answer a case, to be at a meeting, and a scene. Keeps the stories readable.
 */
import type { Objective, Scene, SceneChoice, Where } from '../types'

export const talk = (
  id: string,
  person: string,
  scene: string,
  label: string,
  where: Where,
): Objective => ({ id, kind: 'talk', person, scene, label, where })

export const answer = (id: string, caseId: string, label: string): Objective => ({
  id,
  kind: 'case',
  case: caseId,
  label,
  where: 'desk',
})

export const standup = (label: string): Objective => ({
  id: 'standup',
  kind: 'meeting',
  meeting: 'standup',
  label,
  where: 'desk',
})

export const scene = (
  id: string,
  person: string,
  lines: Scene['lines'],
  choices: SceneChoice[],
): Scene => ({ id, person, lines, choices })

/** People everyone in the office knows, whatever their team (the shared cast). */
export const SHARED_CAST = {
  reception: 'Nina Patel',
  facilities: 'Tom Becker',
  backM: 'Leila Haddad',
  backR: 'Owen Price',
  admin: 'Ben Carter',
  coordinator: 'Dana Kowalski',
  front2: 'Carmen Ruiz',
  analyst: 'Arjun Mehta',
}
