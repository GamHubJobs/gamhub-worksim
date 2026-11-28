import { describe, expect, it } from 'vitest'
import { builtinAnswer, toolGuideAnswer } from '../ai/builtin/guide'
import { buildContext } from '../ai/context'
import type { ContextItem } from '../ai/types'
import { workContext } from '../ai/workContext'
import { ChartSpecSchema } from '../persistence/schemas'
import { trialBalance } from './books/ledger'
import { booksOutputs } from './books/definition'
import { clinicalOutputs } from './clinical/definition'
import { sampleClinical } from './clinical/data'
import { openingBooks } from './books/data'
import {
  clipTable,
  MAX_COLUMNS,
  MAX_ROWS,
  outputsOf,
  tableText,
  toolContext,
} from './outputs'
import { allTools, getTool } from './registry'
import { seoOutputs } from './seo/definition'
import { crawl } from './seo/model'
import { socOutputs } from './soc/definition'
import type { SocState } from './soc/schema'
import type { SeoState } from './seo/schema'
import { studioOutputs } from './studio/definition'
import { sampleApartment } from '../studio/samples'
import type { ProfileData } from '../game/career'

const WITH_OUTPUTS = allTools().filter((t) => t.outputs)

describe("professional tools' outputs", () => {
  it('fourteen tools offer their work to documents, slides and WorkSim AI', () => {
    expect(WITH_OUTPUTS.map((t) => t.id).sort()).toEqual(
      [
        'analytics',
        'books',
        'campaigns',
        'clinical',
        'datastudio',
        'directory',
        'engineering',
        'itops',
        'legal',
        'network',
        'seo',
        'social',
        'soc',
        'studio',
      ].sort(),
    )
  })

  it.each(WITH_OUTPUTS.map((t) => [t.id, t] as const))(
    '%s: every output is a usable table, chart or picture',
    (_, tool) => {
      const outputs = outputsOf({ tool: tool.id, state: tool.practice() })
      expect(outputs.length).toBeGreaterThan(0)
      expect(new Set(outputs.map((o) => o.id)).size).toBe(outputs.length)
      for (const o of outputs) {
        expect(o.title).not.toBe('')
        expect([o.table, o.chart, o.image].filter(Boolean)).toHaveLength(1)
        if (o.table) {
          expect(o.table.length).toBeGreaterThan(0)
          for (const row of o.table)
            for (const cell of row) expect(typeof cell).toBe('string')
        }
        if (o.chart) {
          expect(ChartSpecSchema.safeParse(o.chart).success).toBe(true)
          for (const s of o.chart.series)
            expect(s.values).toHaveLength(o.chart.labels.length)
        }
      }
    },
  )

  it("Books' trial balance is the ledger's, and it balances", () => {
    const books = openingBooks()
    const tb = trialBalance(books)
    const table = booksOutputs(books).find((o) => o.id === 'trial-balance')?.table ?? []
    expect(table[0]).toEqual(['Code', 'Account', 'Debit', 'Credit'])
    expect(table).toHaveLength(tb.rows.length + 2)
    const total = table.at(-1) ?? []
    expect(total[2]).toBe(total[3])
  })

  it('Space Studio offers its schedules, costs and the floor plan as a picture', () => {
    const outputs = studioOutputs(sampleApartment())
    expect(outputs.map((o) => o.id)).toEqual([
      'plan',
      'rooms',
      'furniture',
      'costs',
      'cost-chart',
    ])
    expect(typeof outputs[0].image).toBe('function')
    const rooms = outputs[1].table ?? []
    expect(rooms.at(-1)?.[1]).toBe('Total')
  })

  it('Ward Systems gives what was recorded: the ward list, charts, results', () => {
    const ward = sampleClinical()
    const outputs = clinicalOutputs(ward)
    const admitted = ward.patients.filter((p) => p.status === 'admitted')
    expect(outputs[0].table).toHaveLength(admitted.length + 1)
    for (const p of ward.patients.filter((x) =>
      ward.vitals.some((v) => v.patientId === x.id),
    )) {
      const chart = outputs.find((o) => o.id === `obs-${p.id}`)?.table
      expect(chart).toHaveLength(
        ward.vitals.filter((v) => v.patientId === p.id).length + 1,
      )
    }
  })

  it('SEO shows the issues of the crawl the player ran, never a fresh one', () => {
    const state = { ...(getTool('seo')?.practice() as SeoState), crawl: null }
    expect(seoOutputs(state).some((o) => o.id === 'crawl')).toBe(false)
    const crawled = crawl(state)
    const issues = seoOutputs(crawled).find((o) => o.id === 'crawl')?.table ?? []
    expect(issues).toHaveLength((crawled.crawl?.issues.length ?? 0) + 1)
  })

  it("the security console's outputs never give away the scenario's truth", () => {
    const state = getTool('soc')?.practice() as SocState
    const marked = {
      ...state,
      truth: { ...state.truth, process: 'SECRET-PROCESS-MARKER' },
    }
    const text = JSON.stringify(socOutputs(marked))
    expect(text).not.toContain('SECRET-PROCESS-MARKER')
    expect(JSON.stringify(toolContext('soc', 'Incident', marked))).not.toContain(
      'SECRET-PROCESS-MARKER',
    )
  })

  it('a file that cannot be read offers nothing, and tables are limited', () => {
    expect(outputsOf({ tool: 'books', state: { nonsense: true } })).toEqual([])
    expect(outputsOf({ tool: 'no-such-tool', state: {} })).toEqual([])
    const big = Array.from({ length: 80 }, () => Array.from({ length: 20 }, () => 'x'))
    const clipped = clipTable(big)
    expect(clipped).toHaveLength(MAX_ROWS)
    expect(clipped[0]).toHaveLength(MAX_COLUMNS)
    expect(tableText(big, 3)).toContain('(76 more rows)')
  })
})

describe('WorkSim AI in a professional tool', () => {
  it("reads the open file's figures, the tool and its guide", () => {
    const [item] = toolContext('books', 'Month-end books', openingBooks())
    expect(item.kind).toBe('tool')
    expect(item.label).toBe('Books: Month-end books')
    expect(item.text).toContain('Trial balance')
    expect(item.text).toContain('Open file: Month-end books')
    expect(Array.isArray(item.data?.topics)).toBe(true)
    // The model receives only the text, cut to the usual limits.
    const sent = buildContext([item], 'Sam Lee')
    expect(sent.items[0].text.length).toBeLessThanOrEqual(4_100)
  })

  it('names the tool rather than "a professional tool"', () => {
    const profile = {
      careerId: 'accounting',
      levelId: 'accounting-intern',
      assignments: {},
      inbox: [],
    } as unknown as ProfileData
    const items = workContext(profile, { app: 'tool', tool: 'books' })
    expect(items.find((i) => i.kind === 'app')?.text).toContain(
      'Books (Accounting software)',
    )
  })

  const books = toolContext('books', 'Books', openingBooks())[0]
  const campaigns = toolContext('campaigns', 'April', getTool('campaigns')?.practice())[0]

  it("the built-in guide answers how-to questions from the tool's guide", () => {
    expect(toolGuideAnswer(books, 'How do I record a journal?')).toContain(
      'Books: Record a journal',
    )
    expect(toolGuideAnswer(campaigns, 'what does ROAS mean here')).toContain('**ROAS**')
    expect(toolGuideAnswer(books, 'hello')).toBeNull()
    expect(toolGuideAnswer(undefined, 'How do I record a journal?')).toBeNull()
  })

  it('…through the usual request, without an AI model', () => {
    const ask = (text: string, items: ContextItem[]) =>
      builtinAnswer({
        messages: [{ role: 'user', text }],
        context: { items, trimmed: 0 },
        mode: 'learning',
      })
    const answer = ask('How do I record a journal in here?', [books])
    expect(answer.source.model).toBe(false)
    expect(answer.text).toContain('Record a journal')
    // "Summarise this file": what the tool works out, not sentences picked from tables.
    const summary = builtinAnswer({
      messages: [{ role: 'user', text: 'Summarise this file' }],
      context: { items: [books], trimmed: 0 },
      mode: 'learning',
      action: 'summarise',
    })
    expect(summary.text).toContain('What Books works out from this file')
    expect(summary.text).toContain('Trial balance')
    expect(summary.text).toContain('Insert from a professional tool')
    // Not about the tool: the usual answers.
    expect(ask('tips for writing a good prompt', [books]).text).toContain('Good prompts')
  })
})
