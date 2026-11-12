import { describe, expect, it } from 'vitest'
import { getSlidesTemplate, slideText } from '../model'
import { SlidesContentSchema, type SlidesContent } from '../../../persistence/schemas'
import {
  buildDeck,
  chartFromInspection,
  deckToSlides,
  layoutFromName,
  slidesFingerprint,
  themeFromName,
  type InspectedSlide,
} from './convert'

/** A pretend Deck Craft: records the commands, and has placeholders per layout. */
function fakeDeck() {
  const commands: Array<[string, Record<string, unknown>]> = []
  const slides: Array<{ layout: string }> = []
  let next = 1000
  const placeholders: Record<string, string[]> = {
    title: ['ctrTitle', 'subTitle'],
    titleAndContent: ['title', 'obj'],
    twoContent: ['title', 'obj', 'obj'],
    sectionHeader: ['title', 'body'],
    titleOnly: ['title'],
    blank: [],
  }
  const run = async (command: string, params: object) => {
    const p = params as Record<string, unknown>
    commands.push([command, p])
    if (command === 'slide.new') {
      slides.splice(Number(p.at), 0, { layout: String(p.layout) })
      return { index: p.at }
    }
    if (command === 'slide.inspect') {
      const slide = slides[Number(p.index)]
      return {
        shapes: placeholders[slide.layout].map((placeholder, i) => ({
          id: Number(p.index) * 10 + i,
          kind: 'placeholder',
          placeholder,
        })),
      }
    }
    if (/^(insert\.|shape\.insert)/.test(command)) return { id: next++ }
    return null
  }
  return { run, commands, slides }
}

const template = (id: string) => getSlidesTemplate(id).build('Sam Taylor')

describe('WorkSim presentations built in Deck Craft', () => {
  it('builds every slide in its layout, with the text in the layout’s placeholders', async () => {
    const content = template('business-review')
    const deck = fakeDeck()
    const problems = await buildDeck(deck.run, content)
    expect(problems).toEqual([])
    expect(deck.slides.map((s) => s.layout)).toEqual([
      'title',
      'titleAndContent',
      'titleOnly',
      'twoContent',
      'titleAndContent',
      'sectionHeader',
    ])
    const texts = deck.commands
      .filter(([c]) => c === 'text.set')
      .map(([, p]) => [p.id, p.text])
    // Slide 1: title and subtitle; slide 4: the title and both columns.
    expect(texts).toContainEqual([0, '[Month] business review'])
    expect(texts).toContainEqual([1, 'Sam Taylor · Finance & Administration'])
    expect(texts).toContainEqual([30, 'What went well, what did not'])
    expect(texts).toContainEqual([31, '[Went well]\n[Went well]'])
    expect(texts).toContainEqual([32, '[Needs attention]\n[Needs attention]'])
    expect(texts).toContainEqual([51, '[Your name and contact]'])
    expect(deck.commands[0]).toEqual(['design.theme', { name: 'DeckCraft' }])
  })

  it('puts charts in as real charts with their data, and other elements where they were', async () => {
    const content: SlidesContent = {
      theme: 'warm',
      slides: [
        {
          id: crypto.randomUUID(),
          layout: 'blank',
          notes: 'Say the total first.',
          elements: [
            {
              id: crypto.randomUUID(),
              type: 'chart',
              x: 100,
              y: 80,
              w: 500,
              h: 300,
              chart: {
                type: 'bar',
                title: 'Spending',
                labels: ['Jan', 'Feb'],
                series: [{ name: 'Actual', values: [3, 4] }],
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'shape',
              shape: 'ellipse',
              x: 700,
              y: 50,
              w: 100,
              h: 100,
              fill: '#2563eb',
              stroke: null,
              text: 'Go',
            },
            {
              id: crypto.randomUUID(),
              type: 'text',
              x: 60,
              y: 420,
              w: 400,
              h: 60,
              text: 'Source: Finance',
              style: {
                size: 14,
                bold: false,
                italic: true,
                align: 'left',
                color: null,
                bullets: false,
              },
            },
          ],
        },
      ],
    }
    const deck = fakeDeck()
    expect(await buildDeck(deck.run, content)).toEqual([])
    const find = (name: string) =>
      deck.commands.filter(([c]) => c === name).map(([, p]) => p)
    expect(find('insert.chart')).toEqual([
      {
        type: 'bar',
        rect: [100, 80, 500, 300],
        categories: ['Jan', 'Feb'],
        series: [{ name: 'Actual', values: [3, 4] }],
      },
    ])
    expect(find('chart.options')[0]).toMatchObject({ title: 'Spending' })
    expect(find('shape.insert')).toEqual([
      { preset: 'ellipse', rect: [700, 50, 100, 100], text: 'Go' },
    ])
    expect(find('shape.fill')[0]).toMatchObject({ color: '#2563EB' })
    expect(find('insert.textBox')).toEqual([
      { rect: [60, 420, 400, 60], text: 'Source: Finance' },
    ])
    expect(find('format.size')[0]).toEqual({ size: 14 })
    expect(find('format.italic')).toHaveLength(1)
    expect(find('slide.notes')).toEqual([{ text: 'Say the total first.', index: 0 }])
    expect(find('design.theme')).toEqual([{ name: 'Ember' }])
  })

  it('reports a part that could not be built, and builds the rest', async () => {
    const deck = fakeDeck()
    const failing = async (command: string, params: object) => {
      if (command === 'text.set') throw new Error('no')
      return deck.run(command, params)
    }
    const problems = await buildDeck(failing, template('project-update'))
    expect(problems.length).toBeGreaterThan(0)
    expect(deck.slides).toHaveLength(5)
  })
})

/** What slide.inspect reports for a presentation edited in Deck Craft. */
const inspected: InspectedSlide[] = [
  {
    layout: 'Title Slide',
    notes: '',
    shapes: [
      {
        id: 1,
        kind: 'placeholder',
        placeholder: 'ctrTitle',
        text: 'Q3 review',
        box: [120, 88, 720, 188],
      },
      {
        id: 2,
        kind: 'placeholder',
        placeholder: 'subTitle',
        text: 'Sam Taylor',
        box: [120, 284, 720, 130],
      },
    ],
  },
  {
    layout: 'Title and Content',
    notes: 'Mention the chart.',
    shapes: [
      {
        id: 3,
        kind: 'placeholder',
        placeholder: 'title',
        text: 'Results',
        box: [60, 29, 840, 104],
      },
      {
        id: 4,
        kind: 'placeholder',
        placeholder: 'obj',
        text: 'Revenue up 12%\nCosts flat',
        box: [60, 144, 840, 343],
      },
      {
        id: 5,
        kind: 'chart',
        box: [100, 150, 500, 300],
        chart: {
          type: 'Clustered Column',
          title: 'Chart Title',
          categories: ['Q1', 'Q2'],
          series: [{ name: 'Sales', values: [10, 20] }],
        },
      },
      {
        id: 6,
        kind: 'table',
        box: [96, 230, 768, 80],
        table: {
          cells: [
            ['Region', 'Sales'],
            ['North', '$1,200'],
          ],
        },
      },
      {
        id: 7,
        kind: 'shape',
        preset: 'roundRect',
        fill: '#2E6FD8',
        text: 'Note',
        box: [600, 100, 200, 80],
      },
      { id: 8, kind: 'picture', altText: 'media', box: [700, 400, 80, 80] },
      {
        id: 9,
        kind: 'placeholder',
        placeholder: 'sldNum',
        text: '2',
        box: [0, 500, 50, 30],
      },
      { id: 10, kind: 'line', preset: 'line', box: [10, 10, 100, 0] },
    ],
  },
]

describe('Deck Craft presentations read back as WorkSim reads them', () => {
  const previous = template('blank')
  const read = deckToSlides(inspected, 'Ember', previous)

  it('reads the titles, the text, the charts, the notes and the number of slides', () => {
    expect(read.slides).toHaveLength(2)
    expect(read.theme).toBe('warm')
    const [first, second] = read.slides
    expect(first.layout).toBe('title')
    expect(first.elements).toMatchObject([
      { type: 'text', role: 'title', text: 'Q3 review' },
      { type: 'text', role: 'subtitle', text: 'Sam Taylor' },
    ])
    expect(second.layout).toBe('title-content')
    expect(second.notes).toBe('Mention the chart.')
    const titles = read.slides.flatMap((s) =>
      s.elements.flatMap((e) =>
        e.type === 'text' && e.role === 'title' ? [e.text] : [],
      ),
    )
    expect(titles).toEqual(['Q3 review', 'Results'])
    expect(second.elements.filter((e) => e.type === 'chart')).toMatchObject([
      {
        chart: {
          type: 'column',
          title: '',
          labels: ['Q1', 'Q2'],
          series: [{ name: 'Sales', values: [10, 20] }],
        },
      },
    ])
    // A table's text counts as the slide's text; the slide number does not.
    expect(slideText(second)).toContain('Revenue up 12%')
    expect(slideText(second)).toContain('North\t$1,200')
    expect(slideText(second)).toContain('Note')
    expect(slideText(second)).not.toMatch(/^2$/m)
  })

  it('keeps pictures that came from WorkSim, by their alternative text', () => {
    const logo = {
      id: crypto.randomUUID(),
      type: 'image' as const,
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      src: 'data:image/png;base64,AAAA',
      alt: 'media',
    }
    const withLogo: SlidesContent = {
      ...previous,
      slides: [{ ...previous.slides[0], elements: [logo] }],
    }
    const again = deckToSlides(inspected, 'Ember', withLogo)
    expect(again.slides[1].elements.filter((e) => e.type === 'image')).toMatchObject([
      { src: 'data:image/png;base64,AAAA', x: 700, y: 400 },
    ])
    expect(read.slides[1].elements.some((e) => e.type === 'image')).toBe(false)
  })

  it('keeps IDs from save to save, and the fingerprint follows the content', () => {
    const again = deckToSlides(inspected, 'Ember', read)
    expect(again.slides.map((s) => s.id)).toEqual(read.slides.map((s) => s.id))
    expect(again.slides[1].elements.map((e) => e.id)).toEqual(
      read.slides[1].elements.map((e) => e.id),
    )
    expect(slidesFingerprint(again)).toBe(slidesFingerprint(read))
    // Saved as the schema writes it (keys in its order): the same fingerprint,
    // so the kept .pptx is opened next time, not rebuilt.
    expect(slidesFingerprint(SlidesContentSchema.parse(read))).toBe(
      slidesFingerprint(read),
    )
    const changed = deckToSlides(
      [{ ...inspected[0], shapes: [{ ...inspected[0].shapes![0], text: 'Q4 review' }] }],
      'Ember',
      read,
    )
    expect(slidesFingerprint(changed)).not.toBe(slidesFingerprint(read))
  })

  it('always has a slide, and maps layouts, themes and chart types', () => {
    expect(deckToSlides([], undefined, previous).slides).toHaveLength(1)
    expect(layoutFromName('Section Header')).toBe('section')
    expect(layoutFromName('Comparison')).toBe('two-column')
    expect(layoutFromName('Picture with Caption')).toBe('title-content')
    expect(themeFromName('Nocturne', 'corporate')).toBe('midnight')
    expect(themeFromName('Coral Reef', 'fresh')).toBe('fresh')
    expect(chartFromInspection({ type: 'Doughnut' }).type).toBe('pie')
    expect(chartFromInspection({ type: 'Stacked Bar' }).type).toBe('bar')
    expect(chartFromInspection({ type: 'Line with Markers' }).type).toBe('line')
    expect(
      chartFromInspection({ type: 'Scatter', series: [{ values: ['x', 2] }] }),
    ).toMatchObject({
      type: 'column',
      series: [{ name: '', values: [0, 2] }],
    })
  })
})
