/**
 * What professional tools' files produce for the rest of the work: reports,
 * schedules, charts and plans, worked out from each file by its own tool
 * (see `outputs` on ToolDefinition).
 *
 * - Word Craft and Deck Craft insert them ("Insert from a professional
 *   tool"), as copies, the way a report is pasted into a document.
 * - WorkSim AI reads the open file through them, so it answers about the
 *   actual figures rather than "a professional tool". Only what the player
 *   can see in the tool is given: never a task's model answer or the checks.
 */
import type { ContextItem } from '../ai/types'
import type { ToolContent } from '../persistence/schemas'
import { getTool } from './registry'
import type { ToolOutput } from './types'

/** The outputs of a saved tool file (none if the file cannot be read). */
export function outputsOf(content: ToolContent): ToolOutput[] {
  const tool = getTool(content.tool)
  if (!tool?.outputs) return []
  const parsed = tool.state.safeParse(content.state)
  if (!parsed.success) return []
  try {
    return tool.outputs(parsed.data)
  } catch {
    // A file whose outputs cannot be worked out offers none; it stays usable.
    return []
  }
}

/** The largest table the documents and slides take (as from Grid Craft). */
export const MAX_ROWS = 50
export const MAX_COLUMNS = 12

export function clipTable(rows: string[][]): string[][] {
  return rows.slice(0, MAX_ROWS).map((row) => row.slice(0, MAX_COLUMNS))
}

/** A table as aligned plain text, at most `maxRows` rows after the headings. */
export function tableText(rows: string[][], maxRows = 25): string {
  const shown = rows.slice(0, maxRows + 1)
  const text = shown.map((row) => row.join(' | ')).join('\n')
  const more = rows.length - shown.length
  return more > 0 ? `${text}\n(${more} more row${more === 1 ? '' : 's'})` : text
}

function chartText(output: ToolOutput): string {
  const chart = output.chart
  if (!chart) return ''
  return chart.labels
    .map(
      (label, i) =>
        `${label}: ${chart.series.map((s) => `${chart.series.length > 1 ? `${s.name} ` : ''}${s.values[i] ?? ''}`).join(', ')}`,
    )
    .join('\n')
}

/**
 * The open tool file, for WorkSim AI: what the tool is, the file's summary,
 * its outputs as text, and the tool's guide topics (for the built-in guide).
 */
export function toolContext(
  toolId: string,
  title: string | null,
  state: unknown,
  openSection?: string,
): ContextItem[] {
  const tool = getTool(toolId)
  if (!tool) return []
  const parsed = tool.state.safeParse(state)
  if (!parsed.success) return []
  let summary = ''
  try {
    summary = tool.summary(parsed.data)
  } catch {
    summary = ''
  }
  const section = tool.sections.find((s) => s.id === openSection)
  const outputs = outputsOf({ tool: toolId, state })
  // Most useful first: the context is cut from the end when it is long.
  const parts = [
    `${tool.name} (${tool.category}).${title ? ` Open file: ${title}` : ''}${summary ? ` (${summary})` : ''}.`,
    section ? `Open section: ${section.name}: ${section.description}` : '',
    ...outputs
      .filter((o) => o.table || o.chart)
      .slice(0, 6)
      .map((o) => `${o.title}:\n${o.table ? tableText(o.table, 20) : chartText(o)}`),
    `About ${tool.name}: ${tool.guide.intro}`,
  ].filter(Boolean)
  return [
    {
      kind: 'tool',
      label: `${tool.name}${title ? `: ${title}` : ''}`,
      text: parts.join('\n\n'),
      data: {
        tool: tool.name,
        topics: tool.guide.topics,
        glossary: tool.guide.glossary,
        outputs: outputs.map((o) => o.title),
      },
    },
  ]
}
