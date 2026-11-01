/**
 * The employability profile: a one-page summary of what the player has shown
 * in the simulation, for them to present. It has two kinds of content:
 *
 * - generated from the records (career levels, competencies, tools, featured
 *   work, experience), which the player can show or hide but never edit;
 * - written by the player (display name, headline, summary), which describes
 *   them, not their results.
 *
 * There are deliberately no fields for employers, job dates, references or
 * qualifications, and every export carries the honesty statement.
 */
import { z } from 'zod'
import { getSkill } from '../content/careers'
import type { PortfolioItem, Profile } from '../persistence/schemas'
import {
  competencies,
  experienceRecord,
  skillsOf,
  type CompetencyLevel,
} from './competencies'
import { careerLevel } from './career'
import { toolName } from './portfolio'
import { HONESTY_STATEMENT } from './progressReport'

export const PROFILE_SECTIONS = [
  { id: 'careers', label: 'Simulated career progress' },
  { id: 'competencies', label: 'Competencies' },
  { id: 'featured', label: 'Featured work' },
  { id: 'tools', label: 'Tools used' },
  { id: 'experience', label: 'Experience in numbers' },
] as const

export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]['id']

export const ProfileSettingsSchema = z.object({
  displayName: z.string().trim().max(60),
  headline: z.string().trim().max(120),
  summary: z.string().trim().max(800),
  /** Generated sections the player chose to hide. */
  hidden: z.array(z.enum(PROFILE_SECTIONS.map((s) => s.id))).max(10),
})

export type ProfileSettings = z.infer<typeof ProfileSettingsSchema>

export function defaultProfileSettings(name: string): ProfileSettings {
  return { displayName: name, headline: '', summary: '', hidden: [] }
}

/**
 * Words that suggest the simulation is being described as real employment,
 * a qualification or a reference. The player is reminded, not blocked.
 */
const MISLEADING =
  /\b(employed (?:at|by)|worked (?:at|for)|employment|certified|certification|certificate|qualified|qualification|degree|diploma|accredited|reference|referee)\b/i

export function misleadingWords(text: string): string | null {
  return MISLEADING.exec(text)?.[0] ?? null
}

export interface EmployabilityProfile {
  name: string
  headline: string
  summary: string
  show: Record<ProfileSectionId, boolean>
  careers: Array<{ statement: string; tasksPassed: number }>
  competencies: Array<{ level: CompetencyLevel; names: string[] }>
  featured: Array<{
    itemId: string
    title: string
    summary: string
    score: number
    completedAt: number
    levelTitle: string
    skills: string[]
    tools: string[]
  }>
  tools: Array<{ name: string; tasks: number }>
  experience: { tasks: number; attempts: number; estimatedHours: number }
  honesty: string
}

const LEVEL_ORDER: CompetencyLevel[] = ['proficient', 'practised', 'demonstrated']

/** Builds the profile from the records and the player's own words. */
export function buildEmployabilityProfile(
  settings: ProfileSettings,
  profiles: Profile[],
  items: PortfolioItem[],
): EmployabilityProfile {
  const own = items.filter((i) => profiles.some((p) => p.id === i.profileId))
  const skills = competencies(own, skillsOf(profiles))
  const experience = experienceRecord(own, profiles)
  const show = Object.fromEntries(
    PROFILE_SECTIONS.map((s) => [s.id, !settings.hidden.includes(s.id)]),
  ) as Record<ProfileSectionId, boolean>

  return {
    name: settings.displayName || profiles[0]?.name || 'Portfolio',
    headline: settings.headline,
    summary: settings.summary,
    show,
    careers: profiles.map((profile) => {
      const { career, current } = careerLevel(profile)
      const number = career.levels.findIndex((l) => l.id === current.id) + 1
      const passed = own.filter(
        (i) => i.profileId === profile.id && i.type === 'task',
      ).length
      return {
        statement: `Reached ${current.title} (level ${number} of ${career.levels.length}) in the simulated ${career.name} career`,
        tasksPassed: passed,
      }
    }),
    competencies: LEVEL_ORDER.map((level) => ({
      level,
      names: skills.filter((s) => s.level === level).map((s) => s.name),
    })).filter((group) => group.names.length > 0),
    featured: own
      .filter((i) => i.featured && i.included)
      .sort((a, b) => a.order - b.order || b.completedAt - a.completedAt)
      .map((i) => ({
        itemId: i.id,
        title: i.title,
        summary: i.summary,
        score: i.score,
        completedAt: i.completedAt,
        levelTitle: i.levelTitle,
        skills: Object.keys(i.skills).map((id) => getSkill(id)?.name ?? id),
        tools: i.tools.map(toolName),
      })),
    tools: Object.entries(experience.tools)
      .sort((a, b) => b[1] - a[1])
      .map(([id, tasks]) => ({ name: toolName(id), tasks })),
    experience: {
      tasks: experience.tasksCompleted,
      attempts: experience.attempts,
      estimatedHours: Math.round((experience.estimatedMinutes / 60) * 10) / 10,
    },
    honesty: HONESTY_STATEMENT,
  }
}
