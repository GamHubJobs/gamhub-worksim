/**
 * Getting ready to apply: a CV from the player's own details, a cover letter
 * for one advert, and interview questions to practise for it. All are drafts
 * for the player to read, change and send themselves; none is sent anywhere.
 *
 * What the player practised in GamHub WorkSim appears only under a heading
 * that says it is practice in a simulation, never as jobs, experience or
 * qualifications.
 */
import { CAREERS, SKILLS } from '../content/careers'
import type { CvDetails } from '../game/jobs'
import { providerOf } from './providers'
import { compareSkills, skillLevelName } from './match'
import type { JobListing } from './types'

export interface PlayerFacts {
  name: string
  careerId: string
  skills: Record<string, number>
  /** Simulated tasks passed, by title. */
  tasksPassed: string[]
}

export const PRACTICE_HEADING = 'Workplace simulation practice (GamHub WorkSim)'
export const PRACTICE_NOTE =
  'Practice exercises in a workplace simulation game: not employment, work experience or a qualification.'

/** The skills practised, strongest first, with their level in the game. */
export function practisedSkills(skills: Record<string, number>) {
  return Object.entries(skills)
    .filter(([, xp]) => xp > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, xp]) => ({
      id,
      name: SKILLS.find((s) => s.id === id)?.name ?? id,
      level: skillLevelName(xp),
    }))
}

const section = (title: string, body: string) =>
  body.trim() ? `${title.toUpperCase()}\n${body.trim()}\n` : ''

/** The CV as plain text, ready to copy into a document or print. */
export function cvText(cv: CvDetails, player: PlayerFacts): string {
  const career = CAREERS.find((c) => c.id === player.careerId)
  const skills = practisedSkills(player.skills)
  const practice =
    cv.includePractice && (skills.length || player.tasksPassed.length)
      ? [
          PRACTICE_NOTE,
          skills.length
            ? `Skills practised: ${skills.map((s) => `${s.name} (${s.level.toLowerCase()} in the game)`).join('; ')}.`
            : '',
          player.tasksPassed.length
            ? `Simulated ${career?.name.toLowerCase() ?? 'workplace'} tasks completed: ${player.tasksPassed.length} (for example: ${player.tasksPassed.slice(0, 4).join('; ')}).`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : ''
  return [
    player.name.toUpperCase(),
    cv.headline.trim(),
    cv.contact.trim(),
    '',
    section('Profile', cv.summary),
    section(
      'Experience',
      cv.experience || '[Your real jobs, volunteering and placements, newest first]',
    ),
    section('Education', cv.education || '[Your schools, colleges and courses]'),
    section('Qualifications and certificates', cv.qualifications),
    section(PRACTICE_HEADING, practice),
  ]
    .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
    .join('\n')
    .trim()
}

/** A first draft of a cover letter for this advert, to be checked and finished by hand. */
export function coverLetter(
  listing: JobListing,
  cv: CvDetails,
  player: PlayerFacts,
): string {
  const match = compareSkills(listing, player)
  const source = providerOf(listing.provider).name
  const company =
    listing.company && listing.company !== 'Company not named' ? listing.company : ''
  const firstSentence = cv.summary.trim().split(/(?<=[.!?])\s/)[0] ?? ''
  const paragraphs = [
    `Dear Hiring Manager${company ? ` at ${company}` : ''},`,
    `I am writing to apply for the ${listing.title} role${company ? ` at ${company}` : ''}, which I saw advertised on ${source}.`,
    firstSentence || '[A sentence about who you are and what you are looking for.]',
    cv.experience.trim()
      ? '[A sentence or two from your experience that fits this role: what you did, and what came of it.]'
      : '[Something real you have done that fits this role: a job, a placement, a course, a project.]',
    match.practised.length
      ? `The role asks for ${list(match.practised.map((s) => s.name.toLowerCase()))}. I have been building these through practice in a workplace simulation (GamHub WorkSim), working through realistic tasks; I would be glad to develop them further in a real team.`
      : '',
    match.real.length
      ? `[The advert asks for: ${match.real.join('; ').toLowerCase()}. Say how you meet each one, or leave it out.]`
      : '',
    `I would welcome the chance to talk about how I could contribute${company ? ` to ${company}` : ''}. Thank you for considering my application.`,
    `Kind regards,\n${player.name}${cv.contact.trim() ? `\n${cv.contact.trim()}` : ''}`,
  ]
  return paragraphs.filter(Boolean).join('\n\n')
}

/** Questions an interviewer for this job might ask (to practise answering aloud). */
export function interviewQuestions(
  listing: JobListing,
  player: Pick<PlayerFacts, 'skills'>,
): string[] {
  const match = compareSkills(listing, player)
  const company =
    listing.company && listing.company !== 'Company not named' ? listing.company : 'us'
  const asked = [...match.practised, ...match.toPractise].slice(0, 3)
  return [
    `Why do you want to work as a ${listing.title}${company === 'us' ? '' : ` at ${company}`}?`,
    'Tell me about yourself and what has led you to apply.',
    ...asked.map(
      (s) =>
        `This role needs ${s.name.toLowerCase()}. Tell me about a time you used it, and what happened.`,
    ),
    'Tell me about a time something went wrong at work or in your studies. What did you do?',
    listing.arrangement === 'remote'
      ? 'How do you organise your day and keep in touch with a team when working remotely?'
      : 'How would you get up to speed in your first few weeks?',
    `Do you have any questions for ${company === 'us' ? 'us' : company}?`,
  ]
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}
