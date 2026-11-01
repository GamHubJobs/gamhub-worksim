import { describe, expect, it } from 'vitest'
import { ASSIGNMENTS, getAssignment } from '../content/assignments'
import { buildProjectContent } from '../game/code/grading'
import { deliverableFile } from '../game/deliverables'
import { buildQueueContent } from '../game/tickets'
import { buildSolutionContent } from '../game/workbooks'
import { createId } from '../lib/ids'
import type { AnyDocument } from '../persistence/schemas'
import { toolTaskContent } from '../tools/grading'
import { allTools } from '../tools/registry'
import { sheetTables } from './blocks'
import { originalFiles } from './files'
import { parseCsv, toCsv, toHtml, toMarkdown } from './formats'

describe('CSV', () => {
  it('round-trips awkward values exactly', () => {
    const rows = [
      ['Name', 'Note'],
      ['Smith, Jo', 'Said "hello"'],
      ['Line\nbreak', ' padded '],
      ['£12.50', ''],
    ]
    const csv = toCsv({ head: [], rows })
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(parseCsv(csv)).toEqual(rows)
  })
})

describe('Markdown and HTML', () => {
  const blocks = [
    { kind: 'heading' as const, level: 1 as const, text: 'Findings' },
    { kind: 'paragraph' as const, text: 'Costs <rose> & fell' },
    { kind: 'list' as const, ordered: true, items: ['One', 'Two'] },
    {
      kind: 'table' as const,
      table: { title: 'Spend', head: ['A', 'B|C'], rows: [['1', '2']] },
    },
  ]

  it('Markdown keeps the structure', () => {
    expect(toMarkdown('Report', blocks)).toBe(
      '# Report\n\n## Findings\n\nCosts <rose> & fell\n\n1. One\n2. Two\n\n**Spend**\n\n| A | B\\|C |\n| --- | --- |\n| 1 | 2 |\n',
    )
  })

  it('HTML is a complete page with text escaped and no scripts', () => {
    const page = toHtml('Report', blocks, 'footer')
    expect(page).toMatch(/^<!DOCTYPE html>/)
    expect(page).toContain('<p>Costs &lt;rose&gt; &amp; fell</p>')
    expect(page).toContain('<ol><li>One</li><li>Two</li></ol>')
    expect(page).not.toContain('<script')
  })
})

function mainFile(id: string): AnyDocument {
  const task = getAssignment(id)!
  const base = { id: createId(), title: `${task.title} file` }
  if (task.kind === 'tool')
    return {
      ...base,
      kind: 'tool',
      content: toolTaskContent(task)!.solution,
    } as AnyDocument
  if (task.kind === 'tickets')
    return { ...base, kind: 'tickets', content: buildQueueContent(task) } as AnyDocument
  if (task.kind === 'code')
    return { ...base, kind: 'code', content: buildProjectContent(task) } as AnyDocument
  return { ...base, kind: 'sheet', content: buildSolutionContent(task) } as AnyDocument
}

describe('original files', () => {
  it('a workbook: one CSV per sheet with the values shown, and its formulas', () => {
    const document = mainFile('performance-report')
    const files = originalFiles(document)
    const content = document.kind === 'sheet' ? document.content : null
    const tables = sheetTables(content!)
    expect(files.map((f) => f.path)).toEqual([
      ...tables.map((t) => `${t.title}.csv`),
      'Formulas.csv',
    ])
    expect(parseCsv(files[0].data)).toEqual(tables[0].rows)
    expect(parseCsv(files.at(-1)!.data)[0]).toEqual(['Sheet', 'Cell', 'Formula', 'Shows'])
  })

  it('code: the source files exactly, and the Git history', () => {
    const task = ASSIGNMENTS.find((a) => a.kind === 'code')!
    const document = mainFile(task.id)
    const files = originalFiles(document)
    const content = document.kind === 'code' ? document.content : null
    for (const source of content!.files) {
      expect(files.find((f) => f.path === source.name)?.data).toBe(source.text)
    }
    expect(files.at(-1)).toEqual({ path: 'git-log.txt', data: 'No commits were made.\n' })
  })

  it.each(allTools().map((t) => [t.id, t] as const))(
    'a %s file: CSV tables and its data as JSON that reads back',
    (id, tool) => {
      const state = tool.practice()
      const files = originalFiles({
        kind: 'tool',
        title: tool.name,
        content: { tool: id, state },
      } as AnyDocument)
      const json = files.find((f) => f.path.endsWith('.json'))!
      expect(tool.state.parse(JSON.parse(json.data))).toEqual(tool.state.parse(state))
      expect(files.filter((f) => f.path.endsWith('.csv')).length).toBeGreaterThan(0)
      // File names are unique within a file's export.
      const names = files.map((f) => f.path.toLowerCase())
      expect(new Set(names).size).toBe(names.length)
    },
  )

  it.each(ASSIGNMENTS.map((a) => [a.id] as const))('%s: every file exports', (id) => {
    const task = getAssignment(id)!
    const documents = [
      mainFile(id),
      ...task.deliverables.map(
        (d) => ({ id: createId(), ...deliverableFile(d, 'Alex') }) as AnyDocument,
      ),
    ]
    for (const document of documents) {
      const files = originalFiles(document)
      expect(files.length).toBeGreaterThan(0)
      for (const file of files) expect(file.path).not.toMatch(/[<>:"\\|?*]/)
    }
  })
})
