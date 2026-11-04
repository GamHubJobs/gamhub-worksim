import { describe, expect, it } from 'vitest'
import { matchingArticles, ticketAiContext } from '../apps/helpdesk/aiContext'
import { sheetAiContext } from '../apps/sheets/aiContext'
import { createCalculator } from '../apps/sheets/engine/workbook'
import { createSheetContent, setCellInput } from '../apps/sheets/model'
import { builtinAnswer } from './builtin/guide'
import { analyseData, reviewSlides, suggestFormula } from './builtin/work'
import { buildContext } from './context'
import { systemPrompt } from './prompt'
import { withProposal } from './service'
import type { AiRequest, ContextItem } from './types'

function sheetWith(cells: Record<string, string>) {
  let content = createSheetContent()
  const id = content.sheets[0].id
  for (const [address, input] of Object.entries(cells))
    content = setCellInput(content, id, address, input)
  return { content, sheet: content.sheets[0], calculator: createCalculator(content) }
}

const ask = (
  text: string,
  items: ContextItem[],
  extra: Partial<AiRequest> = {},
): AiRequest => ({
  messages: [{ role: 'user', text }],
  context: buildContext(items, 'Sam'),
  mode: 'professional',
  ...extra,
})

describe('Sheets context', () => {
  const { sheet, calculator } = sheetWith({
    A1: 'Month',
    B1: 'Sales',
    A2: 'Jan',
    B2: '100',
    A3: 'Feb',
    B3: '120',
    A4: 'Mar',
    B4: '110',
    A5: 'Apr',
    B5: '900',
    B7: '=B2/0',
  })

  it('describes the active cell, its error and the numbers above it', () => {
    const [cell] = sheetAiContext(
      sheet,
      calculator,
      { row: 5, column: 1 },
      {
        top: 5,
        left: 1,
        bottom: 5,
        right: 1,
      },
    )
    expect(cell.label).toBe('Cell B6')
    expect(cell.data).toMatchObject({ address: 'B6', above: 'B2:B5' })
    const [error] = sheetAiContext(
      sheet,
      calculator,
      { row: 6, column: 1 },
      {
        top: 6,
        left: 1,
        bottom: 6,
        right: 1,
      },
    )
    expect(error.data).toMatchObject({ formula: '=B2/0', value: '#DIV/0!' })
  })

  it('offers the table as text and as numeric columns with a header', () => {
    const items = sheetAiContext(
      sheet,
      calculator,
      { row: 0, column: 0 },
      {
        top: 0,
        left: 0,
        bottom: 4,
        right: 1,
      },
    )
    const table = items.find((i) => i.kind === 'cells')!
    expect(table.text).toContain('Month\tSales')
    expect(table.data?.columns).toEqual([
      { name: 'Month', values: [null, null, null, null] },
      { name: 'Sales', values: [100, 120, 110, 900] },
    ])
    expect(table.data?.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr'])
  })

  it('analysis finds totals, the unusual value and recommends a line chart for months', () => {
    const table = sheetAiContext(
      sheet,
      calculator,
      { row: 0, column: 0 },
      {
        top: 0,
        left: 0,
        bottom: 4,
        right: 1,
      },
    ).find((i) => i.kind === 'cells')
    const text = analyseData(table, 'professional')
    expect(text).toContain('total 1230')
    expect(text).toContain('Largest 900 (Apr)')
    expect(text).toContain('line chart')
  })

  it('suggests a formula to apply, except in Learning mode, where it gives a hint', () => {
    const cell: ContextItem = {
      kind: 'formula',
      label: 'Cell B6',
      text: 'Cell B6 is empty.',
      data: { address: 'B6', above: 'B2:B5' },
    }
    expect(suggestFormula(cell, 'professional').proposal).toEqual({
      kind: 'formula',
      cell: 'B6',
      formula: '=SUM(B2:B5)',
    })
    const learning = suggestFormula(cell, 'learning')
    expect(learning.proposal).toBeUndefined()
    expect(learning.text).toContain('Try writing it yourself')
    const answer = builtinAnswer(ask('Suggest a formula for this cell', [cell]))
    expect(answer.proposal).toMatchObject({ formula: '=SUM(B2:B5)' })
  })
})

describe('proposals from models', () => {
  const cell: ContextItem = {
    kind: 'formula',
    label: 'Cell C2',
    text: 'Cell C2 is empty.',
    data: { address: 'C2' },
  }
  const answer = (text: string) => ({
    text,
    source: { engine: 'bridge' as const, label: 'Test', model: true },
  })

  it('turns a formula on its own line into a proposal for the selected cell', () => {
    expect(
      withProposal(
        answer('=A2*B2\n\nMultiplies quantity by price.'),
        ask('x', [cell], { action: 'suggest-formula' }),
      ).proposal,
    ).toEqual({ kind: 'formula', cell: 'C2', formula: '=A2*B2' })
  })

  it('turns a rewrite into text to replace the original', () => {
    expect(
      withProposal(answer('Dear Priya, thank you.'), ask('x', [], { action: 'rewrite' }))
        .proposal,
    ).toEqual({ kind: 'text', text: 'Dear Priya, thank you.' })
  })

  it('makes no proposal for ordinary questions', () => {
    expect(withProposal(answer('=A1'), ask('x', [cell])).proposal).toBeUndefined()
  })

  it('tells the model what the action needs back, by mode', () => {
    expect(systemPrompt(ask('x', [cell], { action: 'suggest-formula' }))).toContain(
      'formula alone on the first line',
    )
    expect(
      systemPrompt(ask('x', [cell], { action: 'suggest-formula', mode: 'learning' })),
    ).toContain('do not write out the complete formula')
    expect(systemPrompt(ask('x', [], { action: 'rewrite' }))).toContain(
      'Reply with only the rewritten text',
    )
  })
})

describe('Help Desk, Slides and Code help', () => {
  const knowledge = [
    {
      title: 'Resetting a password',
      body: 'Verify the user, then reset the password in Directory.',
    },
    {
      title: 'Printer offline',
      body: 'Check the printer is on the network and restart the print queue.',
    },
  ]

  it('finds the knowledge base articles that match a ticket', () => {
    expect(
      matchingArticles(
        {
          subject: 'Printer offline again',
          body: 'The printer on floor 2 shows offline.',
        },
        knowledge,
      ).map((a) => a.title),
    ).toEqual(['Printer offline'])
    const items = ticketAiContext(
      {
        id: 'T-1',
        subject: 'Printer offline',
        body: 'Printer offline',
        from: 'Ben',
        department: 'Sales',
      },
      knowledge,
    )
    expect(items.map((i) => i.label)).toEqual([
      'Ticket T-1: Printer offline',
      'Knowledge base: Printer offline',
    ])
    const answer = builtinAnswer(ask('How should I resolve this ticket?', items))
    expect(answer.text).toContain('Printer offline')
  })

  it('reviews slides for titles, crowding and an ending', () => {
    const text = reviewSlides(
      {
        kind: 'slides',
        label: 'The presentation',
        text: '',
        data: {
          slides: [
            { title: 'Q1 review', words: 8 },
            { title: '', words: 60 },
          ],
        },
      },
      'learning',
    )
    expect(text).toContain('1 slide(s) have no title')
    expect(text).toContain('Crowded')
    expect(text).toContain('End with a slide')
  })

  it('explains code and points at the first failing test', () => {
    const answer = builtinAnswer(
      ask(
        'Help me debug the failing tests',
        [
          {
            kind: 'code',
            label: 'File: invoice.js',
            text: 'export function total(items) {\n  return items.length\n}',
          },
          {
            kind: 'tests',
            label: 'Last test run',
            text: '0 of 1 tests pass.',
            data: { failed: ['"totals prices": expected 30, got 2'] },
          },
        ],
        { action: 'explain-code' },
      ),
    )
    expect(answer.text).toContain('`total`')
    expect(answer.text).toContain('expected 30, got 2')
  })
})
