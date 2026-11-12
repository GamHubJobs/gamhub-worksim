/**
 * What the Help Desk offers WorkSim AI: the open ticket, and the knowledge
 * base articles that share its key words (so the built-in guide can point
 * to the right guide, and a model can follow the desk's own procedures).
 */
import type { ContextItem } from '../../ai/types'
import { searchKnowledge } from '../../content/knowledge/it'

const STOP = new Set(
  'about after again also because been before being cannot could does doing from have here into just like more need only other please since some still than that their them then there they this when where which while will with would your'.split(
    ' ',
  ),
)

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  )
}

/** Articles sharing at least two key words with the ticket, best first (up to two). */
export function matchingArticles<T extends { title: string; body: string }>(
  ticket: { subject: string; body: string },
  knowledge: T[],
): T[] {
  const asked = words(`${ticket.subject} ${ticket.body}`)
  return knowledge
    .map((article) => {
      const own = words(`${article.title} ${article.title} ${article.body}`)
      let score = 0
      for (const word of own) if (asked.has(word)) score++
      return { article, score }
    })
    .filter((m) => m.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((m) => m.article)
}

/**
 * What the systems show for the ticket, for WorkSim AI: what is still wrong
 * (as the systems describe it), what the player has tried, and what to do
 * next. Never the hints themselves: the AI explains and guides, the player
 * does the work (and a model is told so, see ai/prompt.ts).
 */
export interface TicketSituation {
  failing: Array<{ label: string; state: string }>
  attempted: string[]
  next: string
  /** The Knowledge Base article that explains the problem. */
  article?: { title: string; summary: string; concept?: string }
}

export function ticketAiContext(
  ticket: { id: string; subject: string; body: string; from: string; department: string },
  knowledge: Array<{ title: string; body: string }>,
  situation?: TicketSituation,
): ContextItem[] {
  // The task's own articles, and the IT Knowledge Base's best match.
  const kb = searchKnowledge(`${ticket.subject} ${ticket.body}`)
    .slice(0, 2)
    .map((a) => ({ title: a.title, body: [a.summary, ...a.diagnose].join(' ') }))
  const articles = [...matchingArticles(ticket, knowledge), ...kb].slice(0, 3)
  const systems = situation
    ? [
        '',
        situation.failing.length
          ? `What the company's systems show is still wrong:\n${situation.failing.map((f) => `- ${f.label}: ${f.state}`).join('\n')}`
          : 'The systems show the problem is fixed.',
        situation.attempted.length
          ? `What the player has done so far: ${situation.attempted.join('; ')}.`
          : 'The player has not changed anything yet.',
      ].join('\n')
    : ''
  const items: ContextItem[] = [
    {
      kind: 'ticket',
      label: `Ticket ${ticket.id}: ${ticket.subject}`,
      text: `From ${ticket.from} (${ticket.department})\nSubject: ${ticket.subject}\n\n${ticket.body}${systems}`,
      data: { articles, ...(situation ? { situation } : {}) },
    },
  ]
  for (const article of articles)
    items.push({
      kind: 'document',
      label: `Knowledge base: ${article.title}`,
      text: article.body,
    })
  return items
}
