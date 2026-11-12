/**
 * The built-in guide's help inside the apps: data analysis, formula
 * suggestions, report structure, slide reviews, code and test explanations,
 * and ticket resolutions from the knowledge base. All deterministic, from
 * the data the app shared.
 */
import type { AiMode, ContextItem, Proposal } from '../types'
import { reviewWriting, sentences } from './text'

const list = (items: string[]) => items.map((item) => `- ${item}`).join('\n')
const round = (n: number) =>
  Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, '')

interface Column {
  name: string
  values: Array<number | null>
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

export function analyseData(item: ContextItem | undefined, mode: AiMode): string {
  const columns = (item?.data?.columns as Column[] | undefined) ?? []
  const labels = (item?.data?.labels as string[] | undefined) ?? []
  const numeric = columns.filter((c) => c.values.filter((v) => v !== null).length >= 2)
  if (!item || numeric.length === 0)
    return 'Select the table you want analysed (including its header row), with at least two numbers in a column, then ask again.'
  const parts = [`**${item.label}**`]
  for (const column of numeric.slice(0, 4)) {
    const values = column.values.filter((v): v is number => v !== null)
    const total = values.reduce((a, b) => a + b, 0)
    const mean = total / values.length
    const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length)
    const max = Math.max(...values)
    const min = Math.min(...values)
    const labelFor = (value: number) => {
      const index = column.values.indexOf(value)
      return labels[index] ? ` (${labels[index]})` : ''
    }
    const unusual = sd > 0 ? values.filter((v) => Math.abs(v - mean) > 2 * sd) : []
    const half = Math.floor(values.length / 2)
    const first = values.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(1, half)
    const second =
      values.slice(half).reduce((a, b) => a + b, 0) / Math.max(1, values.length - half)
    const change = first !== 0 ? (second - first) / Math.abs(first) : 0
    const lines = [
      `${values.length} values, total ${round(total)}, average ${round(mean)}.`,
      `Largest ${round(max)}${labelFor(max)}; smallest ${round(min)}${labelFor(min)}.`,
      unusual.length
        ? `Unusual: ${unusual.map((v) => `${round(v)}${labelFor(v)}`).join(', ')} (more than two standard deviations from the average). Check whether ${unusual.length > 1 ? 'they are' : 'it is'} an error or a real event.`
        : 'No value stands far from the rest.',
      values.length >= 4 && Math.abs(change) > 0.1
        ? `The second half is ${change > 0 ? 'higher' : 'lower'} than the first by about ${Math.round(Math.abs(change) * 100)}%.`
        : '',
    ].filter(Boolean)
    parts.push(`**${column.name}**\n${list(lines)}`)
  }
  const dated = labels.some((l) =>
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|week|20\d\d)/i.test(l),
  )
  const chart =
    numeric.length === 1 && dated
      ? 'a **line chart**: the labels are periods, so a line shows the trend'
      : numeric.length === 1
        ? 'a **bar chart**: it compares one value across categories'
        : 'a **column chart** with one series per column, to compare them side by side'
  parts.push(`Chart: ${chart}.`)
  parts.push(
    mode === 'learning'
      ? 'Check one of these figures yourself with a formula (for example =AVERAGE on the column): does it match?'
      : 'Figures are from the selected cells only; check that the selection covers all the data.',
  )
  return parts.join('\n\n')
}

export function suggestFormula(
  item: ContextItem | undefined,
  mode: AiMode,
): { text: string; proposal?: Proposal } {
  const address = typeof item?.data?.address === 'string' ? item.data.address : null
  const above = typeof item?.data?.above === 'string' ? item.data.above : null
  const left = typeof item?.data?.left === 'string' ? item.data.left : null
  if (!address)
    return { text: 'Select the cell where the formula should go, then ask again.' }
  const range = above ?? left
  if (!range)
    return {
      text: `I cannot see numbers next to ${address} to total. Say what ${address} should calculate (for example "quantity times price"), or turn on an AI model for open requests.`,
    }
  const direction = above ? 'above it' : 'to its left'
  if (mode === 'learning')
    return {
      text: `${address} sits next to numbers ${direction} (${range}). To total them, use the **SUM** function with that range. Try writing it yourself: it starts with =SUM( and the first and last cells, separated by a colon.`,
    }
  const formula = `=SUM(${range})`
  return {
    text: `For ${address}, the total of the numbers ${direction}:\n\n${formula}\n\nIt keeps up when the numbers change. If ${address} should calculate something else, say what.`,
    proposal: { kind: 'formula', cell: address, formula },
  }
}

// ---------------------------------------------------------------------------
// Docs and Slides
// ---------------------------------------------------------------------------

const REPORT = [
  '**Executive summary**: the answer in three or four sentences, for someone who reads nothing else.',
  '**Background**: why the report was asked for, and the data used.',
  '**Findings**: what the data shows, one point per paragraph, with the figures.',
  '**Recommendations**: what should happen next, who should do it, and by when.',
  '**Appendix** (if needed): tables and details that support the findings.',
]

export function reportStructure(item: ContextItem | undefined): string {
  const headings = ((item?.data?.headings as string[] | undefined) ?? []).map((h) =>
    h.toLowerCase(),
  )
  const missing = ['summary', 'finding', 'recommend'].filter(
    (word) => !headings.some((h) => h.includes(word)),
  )
  return [
    'A clear structure for a workplace report:',
    list(REPORT),
    item && headings.length
      ? missing.length
        ? `Your document has ${headings.length} heading(s); it seems to be missing: ${missing.map((m) => (m === 'summary' ? 'a summary' : m === 'finding' ? 'findings' : 'recommendations')).join(', ')}.`
        : 'Your document already has a summary, findings and recommendations.'
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function reviewSlides(item: ContextItem | undefined, mode: AiMode): string {
  const slides =
    (item?.data?.slides as Array<{ title: string; words: number }> | undefined) ?? []
  if (!slides.length) return 'Open the presentation you want reviewed, then ask again.'
  const untitled = slides.filter((s) => !s.title.trim()).length
  const crowded = slides.filter((s) => s.words > 45)
  const lines = [
    `${slides.length} slide(s).`,
    untitled
      ? `${untitled} slide(s) have no title: every slide needs one that says its point.`
      : 'Every slide has a title.',
    crowded.length
      ? `Crowded: ${crowded.map((s) => `"${s.title || 'untitled'}" (${s.words} words)`).join(', ')}. Keep slides under about 40 words and say the rest.`
      : 'No slide is overcrowded.',
    slides.length > 1 &&
    !/summary|conclusion|next step|recommend/i.test(slides.at(-1)?.title ?? '')
      ? 'End with a slide that says what you want the audience to remember or do.'
      : '',
  ].filter(Boolean)
  return [
    list(lines),
    mode === 'learning'
      ? 'A good test: read only the titles in order. Do they tell the whole story?'
      : 'Check that every figure on the slides matches your report.',
  ].join('\n\n')
}

export const OUTLINE = `A presentation outline that works for most workplace updates:

1. **Title**: the topic and the one-line answer.
2. **The question**: why we are looking at this.
3. **What we found**: the two or three key figures, one per slide, with a chart.
4. **What it means**: the impact on the business.
5. **What we recommend**: actions, owners and dates.
6. **Questions**.

Write the titles first as full sentences ("Costs rose 6% in March"), then add the evidence for each.`

export function rewriteHelp(item: ContextItem | undefined): string {
  if (!item) return 'Select the text you want improved, then ask again.'
  const review = reviewWriting(item.text)
  const advice = [
    review.longSentences.length ? 'Split the long sentences.' : '',
    review.passive ? 'Use active verbs: say who did what.' : '',
    review.informal.length ? 'Replace informal words with neutral ones.' : '',
    'Lead with the point, then the detail.',
  ].filter(Boolean)
  return `The built-in guide cannot rewrite text (it is not an AI model), but here is how to improve it:\n\n${list(advice)}\n\nTurn on an AI model in WorkSim AI settings to get a rewritten version to review and apply.`
}

// ---------------------------------------------------------------------------
// Code and Help Desk
// ---------------------------------------------------------------------------

export function explainCode(
  code: ContextItem | undefined,
  tests: ContextItem | undefined,
  mode: AiMode,
): string {
  if (!code) return 'Open the code file you want explained, then ask again.'
  const lines = code.text.split('\n')
  const functions = [
    ...code.text.matchAll(
      /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g,
    ),
  ].map((m) => m[1] ?? m[2])
  const exported = [
    ...code.text.matchAll(/export\s+(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g),
  ].map((m) => m[1])
  const failed = (tests?.data?.failed as string[] | undefined) ?? []
  const parts = [
    `**${code.label}**: ${lines.length} lines${functions.length ? `, defining ${functions.map((f) => `\`${f}\``).join(', ')}` : ''}.`,
    exported.length
      ? `Used by other files: ${exported.map((e) => `\`${e}\``).join(', ')}.`
      : '',
  ]
  if (failed.length)
    parts.push(
      `Failing tests:\n${list(failed)}`,
      mode === 'learning'
        ? 'Read the first failing test: what input does it use and what does it expect? Follow that input through the code line by line, and note where the value differs.'
        : 'Start with the first failure: compare the expected and actual values, find the line that produces the value, and fix the cause rather than the test.',
    )
  else if (tests)
    parts.push(
      'All tests pass. Before handing in, check edge cases the tests may not cover (empty input, zero, very large values).',
    )
  return parts.filter(Boolean).join('\n\n')
}

export const TESTS_HELP = `Good tests for a function:

- **The normal case**: a typical input and the exact expected result.
- **Edge cases**: empty input, zero, one item, the largest allowed value.
- **Wrong input**: what should happen with text instead of a number, or a missing value.
- **One behaviour per test**, with a name that says it ("totals an empty list as 0").

Write the test first, watch it fail, then make it pass.`

export function resolveTicket(ticket: ContextItem | undefined, mode: AiMode): string {
  if (!ticket) return 'Open the ticket you are working on, then ask again.'
  const articles =
    (ticket.data?.articles as Array<{ title: string; body: string }> | undefined) ?? []
  const first = sentences(ticket.text).slice(0, 2).join(' ')
  const parts = [`**${ticket.label}**: ${first}`]
  // For a ticket tied to the systems: what they show, what was tried, where to go.
  const situation = ticket.data?.situation as
    | {
        failing: Array<{ label: string; state: string }>
        attempted: string[]
        next: string
      }
    | undefined
  if (situation) {
    parts.push(
      situation.failing.length
        ? `**What the systems show is still wrong:**\n${list(situation.failing.map((f) => `${f.label}: ${f.state}`))}`
        : '**The systems show it is fixed.** Tell the requester what was wrong and what you did, then close it.',
    )
    if (situation.attempted.length)
      parts.push(
        `**You have tried:** ${situation.attempted.join('; ')}. The checks still failing tell you whether that was the cause.`,
      )
    parts.push(
      mode === 'learning'
        ? 'Start from the first thing still wrong: which tool would show you more about it? If you are stuck, the ticket’s hints go one step at a time (each takes a little XP).'
        : `Next: ${situation.next}`,
    )
  }
  if (articles.length) {
    parts.push(
      `Knowledge base articles that match:\n${list(articles.map((a) => `**${a.title}**: ${sentences(a.body)[0] ?? ''}`))}`,
    )
    parts.push(
      mode === 'learning'
        ? 'Read the first article and check the ticket against it: does the symptom match? Then decide the category and priority before you reply.'
        : 'Follow the matching article, record what you did in the ticket, and escalate if it does not fix the problem.',
    )
  } else
    parts.push(
      'No knowledge base article matches. Ask the user for the exact error message and when it started, check whether others are affected (priority), and escalate if it is outside first-line support.',
    )
  return parts.join('\n\n')
}

export function speakerNotes(item: ContextItem | undefined, mode: AiMode): string {
  const slides =
    (item?.data?.slides as Array<{ title: string; words: number }> | undefined) ?? []
  if (!slides.length) return 'Open the presentation first, then ask again.'
  const notes = slides
    .slice(0, 8)
    .map(
      (s, i) =>
        `**Slide ${i + 1}${s.title ? `: ${s.title}` : ''}**: say its point in one sentence, give the evidence behind it, then link to the next slide.`,
    )
  return [
    'For each slide, notes should help you speak, not read:',
    notes.join('\n'),
    mode === 'learning'
      ? 'Write the first sentence for each slide yourself, then practise saying it aloud: about one minute per slide.'
      : 'Keep notes to three short lines per slide, and put the figures you must quote word for word.',
  ].join('\n\n')
}
