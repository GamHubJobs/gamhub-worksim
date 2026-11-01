import { describe, expect, it } from 'vitest'
import { ASSIGNMENTS, getAssignment } from '../content/assignments'
import { buildProjectContent } from '../game/code/grading'
import { deliverableFile } from '../game/deliverables'
import { buildQueueContent } from '../game/tickets'
import { buildSolutionContent } from '../game/workbooks'
import { createId } from '../lib/ids'
import type { AnyDocument, RichNode, SheetContent } from '../persistence/schemas'
import { toolTaskContent } from '../tools/grading'
import { allTools } from '../tools/registry'
import {
  dataTables,
  docBlocks,
  documentBlocks,
  humanise,
  sheetFormulas,
  sheetTables,
  slideBlocks,
} from './blocks'

const workbook: SheetContent = {
  sheets: [
    {
      id: createId(),
      name: 'Budget',
      cells: {
        A1: { input: 'Item' },
        B1: { input: 'Cost' },
        A2: { input: 'Paper' },
        B2: { input: '12.5' },
        A3: { input: 'Total' },
        B3: { input: '=SUM(B2:B2)*2' },
      },
    },
  ],
}

const text = (t: string): RichNode => ({ type: 'text', text: t })
const para = (t: string): RichNode => ({ type: 'paragraph', content: [text(t)] })

describe('export blocks', () => {
  it('sheets: the values shown, with formulas calculated', () => {
    expect(sheetTables(workbook)).toEqual([
      {
        title: 'Budget',
        head: ['A', 'B'],
        rows: [
          ['Item', 'Cost'],
          ['Paper', '12.5'],
          ['Total', '25'],
        ],
      },
    ])
    expect(sheetFormulas(workbook).rows).toEqual([
      ['Budget', 'B3', '=SUM(B2:B2)*2', '25'],
    ])
  })

  it('docs: headings, paragraphs, lists, tables and charts', () => {
    const chart = { type: 'column', title: 'Spend', labels: ['A'], series: [] }
    const body: RichNode = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [text('Findings')] },
        para('Sales overspent.'),
        para(''),
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [para('One')] }],
        },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [{ type: 'tableHeader', content: [para('H')] }],
            },
            { type: 'tableRow', content: [{ type: 'tableCell', content: [para('v')] }] },
          ],
        },
        { type: 'chart', attrs: { spec: chart } },
      ],
    }
    expect(docBlocks(body)).toEqual([
      { kind: 'heading', level: 2, text: 'Findings' },
      { kind: 'paragraph', text: 'Sales overspent.' },
      { kind: 'list', ordered: false, items: ['One'] },
      { kind: 'table', table: { title: '', head: ['H'], rows: [['v']] } },
      { kind: 'chart', chart },
    ])
  })

  it('any tool data becomes tables', () => {
    expect(
      dataTables({
        domain: 'example.com',
        users: [
          { name: 'Ann', groups: ['IT', 'All'] },
          { name: 'Bo', enabled: false },
        ],
      }),
    ).toEqual([
      { title: 'Details', head: ['Field', 'Value'], rows: [['Domain', 'example.com']] },
      {
        title: 'Users',
        head: ['Name', 'Groups', 'Enabled'],
        rows: [
          ['Ann', 'IT, All', ''],
          ['Bo', '', 'false'],
        ],
      },
    ])
    expect(humanise('payRuns')).toBe('Pay runs')
  })

  it.each(allTools().map((t) => [t.id, t] as const))(
    'the %s practice file exports as tables',
    (id, tool) => {
      const blocks = documentBlocks({
        kind: 'tool',
        title: tool.name,
        content: { tool: id, state: tool.practice() },
      } as AnyDocument)
      expect(blocks.filter((b) => b.kind === 'table').length).toBeGreaterThan(0)
    },
  )
})

/** Every task's files, as the player receives them, export without errors. */
describe('every task exports', () => {
  it.each(ASSIGNMENTS.map((a) => [a.id] as const))('%s', (id) => {
    const task = getAssignment(id)!
    const main: AnyDocument =
      task.kind === 'tool'
        ? ({
            kind: 'tool',
            title: 'f',
            content: toolTaskContent(task)!.solution,
          } as AnyDocument)
        : task.kind === 'tickets'
          ? ({
              kind: 'tickets',
              title: 'f',
              content: buildQueueContent(task),
            } as AnyDocument)
          : task.kind === 'code'
            ? ({
                kind: 'code',
                title: 'f',
                content: buildProjectContent(task),
              } as AnyDocument)
            : ({
                kind: 'sheet',
                title: 'f',
                content: buildSolutionContent(task),
              } as AnyDocument)
    expect(documentBlocks(main).length).toBeGreaterThan(0)
    for (const deliverable of task.deliverables) {
      const file = deliverableFile(deliverable, 'Alex') as AnyDocument
      expect(() => documentBlocks(file)).not.toThrow()
      if (file.kind === 'slides')
        expect(slideBlocks(file.content).length).toBeGreaterThan(0)
    }
  })
})
