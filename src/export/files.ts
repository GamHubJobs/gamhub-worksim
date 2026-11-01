/**
 * Original files: each saved file in open formats that work outside WorkSim.
 *
 * - Sheets: one CSV per sheet (the values shown) and a CSV of every formula.
 * - Docs: HTML and Markdown.
 * - Slides: HTML and Markdown, slide by slide, with speaker notes.
 * - Help Desk: the queue as CSV.
 * - Code: the source files as they are, and the Git history as text.
 * - Professional tools: one CSV per table of data, and the file's data as JSON.
 */
import type { AnyDocument, CodeContent } from '../persistence/schemas'
import { getTool } from '../tools/registry'
import {
  dataTables,
  documentBlocks,
  sheetFormulas,
  sheetTables,
  ticketTable,
} from './blocks'
import { toCsv, toHtml, toMarkdown } from './formats'
import { safeFileName } from '../lib/download'

export interface OutputFile {
  /** A path inside the export, e.g. "Budget.csv" or "src/invoice.js". */
  path: string
  data: string
}

const FOOTER =
  'Made in GamHub WorkSim, a workplace simulation. Simulated tasks with simulated data.'

function gitLog(content: CodeContent): string {
  const git = content.git
  if (!git || git.commits.length === 0) return 'No commits were made.\n'
  const branchesAt = (id: string) =>
    Object.entries(git.branches)
      .filter(([, at]) => at === id)
      .map(([name]) => name)
  return `${[...git.commits]
    .sort((a, b) => b.seq - a.seq)
    .map((c) => {
      const branches = branchesAt(c.id)
      const merge = c.parents.length > 1 ? ` (merge of ${c.parents.join(' and ')})` : ''
      return `${c.id}${branches.length > 0 ? ` [${branches.join(', ')}]` : ''} ${c.message}${merge}`
    })
    .join('\n')}\n`
}

/** Unique, safe names for the tables of one file. */
function csvFiles(tables: Array<{ title: string; head: string[]; rows: string[][] }>) {
  const used = new Set<string>()
  return tables.map((table, i) => {
    let name = safeFileName(table.title || `Table ${i + 1}`)
    while (used.has(name.toLowerCase())) name = `${name} (${i + 1})`
    used.add(name.toLowerCase())
    return { path: `${name}.csv`, data: toCsv(table) }
  })
}

export function originalFiles(document: AnyDocument): OutputFile[] {
  const title = safeFileName(document.title)
  switch (document.kind) {
    case 'sheet': {
      const formulas = sheetFormulas(document.content)
      return [
        ...csvFiles(sheetTables(document.content).map((t) => ({ ...t, head: [] }))),
        ...(formulas.rows.length > 0
          ? [{ path: 'Formulas.csv', data: toCsv(formulas) }]
          : []),
      ]
    }
    case 'doc':
    case 'slides': {
      const blocks = documentBlocks(document)
      return [
        { path: `${title}.html`, data: toHtml(document.title, blocks, FOOTER) },
        { path: `${title}.md`, data: toMarkdown(document.title, blocks) },
      ]
    }
    case 'tickets':
      return [{ path: 'Tickets.csv', data: toCsv(ticketTable(document.content)) }]
    case 'code':
      return [
        ...document.content.files.map((f) => ({ path: f.name, data: f.text })),
        { path: 'git-log.txt', data: gitLog(document.content) },
      ]
    case 'tool': {
      const tool = getTool(document.content.tool)
      return [
        ...csvFiles(dataTables(document.content.state)),
        {
          path: `${safeFileName(tool?.name ?? document.content.tool)} data.json`,
          data: `${JSON.stringify(document.content.state, null, 2)}\n`,
        },
      ]
    }
  }
}
