/**
 * The employability profile as blocks, and as a web page (the PDF is in
 * pdf/profile.ts, loaded only when exporting). Generated sections come from the records; the honesty statement is
 * always included and cannot be hidden.
 */
import { type EmployabilityProfile } from '../game/employabilityProfile'
import { COMPETENCY_LEVEL_NAMES } from '../game/competencies'
import { formatDateTime } from '../lib/time'
import type { Block } from './blocks'
import { toHtml } from './formats'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function profileBlocks(profile: EmployabilityProfile): Block[] {
  const blocks: Block[] = []
  if (profile.headline) blocks.push({ kind: 'paragraph', text: profile.headline })
  if (profile.summary) {
    blocks.push({ kind: 'heading', level: 1, text: 'About me' })
    blocks.push({ kind: 'paragraph', text: profile.summary })
  }
  if (profile.show.careers && profile.careers.length > 0) {
    blocks.push({ kind: 'heading', level: 1, text: 'Simulated career progress' })
    blocks.push({
      kind: 'list',
      ordered: false,
      items: profile.careers.map(
        (c) =>
          `${c.statement}, with ${c.tasksPassed} ${c.tasksPassed === 1 ? 'task' : 'tasks'} passed.`,
      ),
    })
  }
  if (profile.show.competencies && profile.competencies.length > 0) {
    blocks.push({ kind: 'heading', level: 1, text: 'Competencies' })
    blocks.push({
      kind: 'list',
      ordered: false,
      items: profile.competencies.map(
        (g) => `${COMPETENCY_LEVEL_NAMES[g.level]}: ${g.names.join(', ')}`,
      ),
    })
  }
  if (profile.show.featured && profile.featured.length > 0) {
    blocks.push({ kind: 'heading', level: 1, text: 'Featured work' })
    for (const f of profile.featured) {
      blocks.push({ kind: 'heading', level: 2, text: `${f.title} (${f.score}%)` })
      blocks.push({
        kind: 'paragraph',
        text: `${f.summary} ${f.levelTitle} level, completed ${formatDateTime(f.completedAt)}. Skills: ${f.skills.join(', ')}. Tools: ${f.tools.join(', ')}.`,
      })
    }
  }
  if (profile.show.tools && profile.tools.length > 0) {
    blocks.push({ kind: 'heading', level: 1, text: 'Tools used in passed work' })
    blocks.push({
      kind: 'paragraph',
      text: profile.tools.map((t) => `${t.name} (${t.tasks})`).join(', '),
    })
  }
  if (profile.show.experience) {
    blocks.push({ kind: 'heading', level: 1, text: 'Experience in numbers' })
    blocks.push({
      kind: 'list',
      ordered: false,
      items: [
        `${plural(profile.experience.tasks, 'simulated workplace task')} passed (${plural(profile.experience.attempts, 'attempt')})`,
        `About ${profile.experience.estimatedHours} hours of practice (estimated from the tasks’ expected times)`,
      ],
    })
  }
  blocks.push({ kind: 'heading', level: 1, text: 'About this profile' })
  blocks.push({ kind: 'paragraph', text: profile.honesty })
  return blocks
}

export function profileHtml(profile: EmployabilityProfile): string {
  return toHtml(
    profile.name,
    profileBlocks(profile),
    'Made with GamHub WorkSim, a workplace simulation.',
  )
}
