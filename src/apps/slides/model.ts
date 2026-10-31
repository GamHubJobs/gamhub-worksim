/**
 * Presentations: themes, slide layouts, templates and the changes the editor
 * makes (add, duplicate, delete and reorder slides; add, change and remove
 * elements). Pure functions on the saved content.
 */
import type { CSSProperties } from 'react'
import { createId } from '../../lib/ids'
import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  type Slide,
  type SlideElement,
  type SlideLayout,
  type SlidesContent,
  type SlideTheme,
  type TextStyle,
} from '../../persistence/schemas'

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export interface Theme {
  name: string
  background: string
  /** Background of title and section slides. */
  titleBackground: string
  text: string
  titleText: string
  accent: string
  muted: string
}

export const THEMES: Record<SlideTheme, Theme> = {
  corporate: {
    name: 'Corporate blue',
    background: '#ffffff',
    titleBackground: '#1e3a8a',
    text: '#1e293b',
    titleText: '#ffffff',
    accent: '#2563eb',
    muted: '#64748b',
  },
  midnight: {
    name: 'Midnight',
    background: '#0f172a',
    titleBackground: '#020617',
    text: '#e2e8f0',
    titleText: '#ffffff',
    accent: '#38bdf8',
    muted: '#94a3b8',
  },
  fresh: {
    name: 'Fresh green',
    background: '#f8fafc',
    titleBackground: '#065f46',
    text: '#14532d',
    titleText: '#ecfdf5',
    accent: '#10b981',
    muted: '#4b5563',
  },
  warm: {
    name: 'Warm',
    background: '#fffbeb',
    titleBackground: '#9a3412',
    text: '#431407',
    titleText: '#fff7ed',
    accent: '#ea580c',
    muted: '#78716c',
  },
}

/** Title and section slides use the theme's strong background. */
export function slideBackground(slide: Slide, theme: Theme): string {
  return slide.layout === 'title' || slide.layout === 'section'
    ? theme.titleBackground
    : theme.background
}

export function slideTextColor(slide: Slide, theme: Theme): string {
  return slide.layout === 'title' || slide.layout === 'section'
    ? theme.titleText
    : theme.text
}

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

export const LAYOUT_NAMES: Record<SlideLayout, string> = {
  title: 'Title slide',
  'title-content': 'Title and content',
  'two-column': 'Two columns',
  section: 'Section header',
  'title-only': 'Title only',
  blank: 'Blank',
}

export function textStyle(changes: Partial<TextStyle> = {}): TextStyle {
  return {
    size: 24,
    bold: false,
    italic: false,
    align: 'left',
    color: null,
    bullets: false,
    ...changes,
  }
}

export function textBox(
  box: { x: number; y: number; w: number; h: number },
  text: string,
  style: Partial<TextStyle> = {},
  role?: 'title' | 'subtitle' | 'body',
): SlideElement {
  return {
    id: createId(),
    type: 'text',
    ...box,
    text,
    style: textStyle(style),
    ...(role ? { role } : {}),
  }
}

const M = 60 // slide margin

/** The text boxes a layout starts with. */
function layoutElements(layout: SlideLayout): SlideElement[] {
  switch (layout) {
    case 'title':
      return [
        textBox(
          { x: M, y: 170, w: SLIDE_WIDTH - 2 * M, h: 110 },
          '',
          { size: 48, bold: true, align: 'center' },
          'title',
        ),
        textBox(
          { x: M, y: 290, w: SLIDE_WIDTH - 2 * M, h: 60 },
          '',
          { size: 24, align: 'center' },
          'subtitle',
        ),
      ]
    case 'title-content':
      return [
        textBox(
          { x: M, y: 36, w: SLIDE_WIDTH - 2 * M, h: 80 },
          '',
          { size: 36, bold: true },
          'title',
        ),
        textBox(
          { x: M, y: 130, w: SLIDE_WIDTH - 2 * M, h: 360 },
          '',
          { size: 24, bullets: true },
          'body',
        ),
      ]
    case 'two-column':
      return [
        textBox(
          { x: M, y: 36, w: SLIDE_WIDTH - 2 * M, h: 80 },
          '',
          { size: 36, bold: true },
          'title',
        ),
        textBox(
          { x: M, y: 130, w: 400, h: 360 },
          '',
          { size: 22, bullets: true },
          'body',
        ),
        textBox(
          { x: 500, y: 130, w: 400, h: 360 },
          '',
          { size: 22, bullets: true },
          'body',
        ),
      ]
    case 'section':
      return [
        textBox(
          { x: M, y: 200, w: SLIDE_WIDTH - 2 * M, h: 100 },
          '',
          { size: 44, bold: true },
          'title',
        ),
        textBox(
          { x: M, y: 300, w: SLIDE_WIDTH - 2 * M, h: 50 },
          '',
          { size: 22 },
          'subtitle',
        ),
      ]
    case 'title-only':
      return [
        textBox(
          { x: M, y: 36, w: SLIDE_WIDTH - 2 * M, h: 80 },
          '',
          { size: 36, bold: true },
          'title',
        ),
      ]
    case 'blank':
      return []
  }
}

/** Placeholder text shown in empty text boxes while editing. */
export const PLACEHOLDERS: Record<'title' | 'subtitle' | 'body', string> = {
  title: 'Click to add a title',
  subtitle: 'Click to add a subtitle',
  body: 'Click to add text',
}

export function createSlide(layout: SlideLayout, texts: string[] = []): Slide {
  const elements = layoutElements(layout).map((element, i) =>
    element.type === 'text' && texts[i] !== undefined
      ? { ...element, text: texts[i] }
      : element,
  )
  return { id: createId(), layout, elements, notes: '' }
}

// ---------------------------------------------------------------------------
// Changing slides
// ---------------------------------------------------------------------------

export function addSlide(
  content: SlidesContent,
  afterIndex: number,
  layout: SlideLayout,
) {
  const slide = createSlide(layout)
  const slides = [...content.slides]
  slides.splice(afterIndex + 1, 0, slide)
  return { content: { ...content, slides }, slideId: slide.id }
}

/** A copy of a slide (with new IDs), placed after it. */
export function duplicateSlide(content: SlidesContent, slideId: string) {
  const index = content.slides.findIndex((s) => s.id === slideId)
  if (index < 0) return { content, slideId }
  const source = content.slides[index]
  const copy: Slide = {
    ...source,
    id: createId(),
    elements: source.elements.map((e) => ({ ...e, id: createId() })),
  }
  const slides = [...content.slides]
  slides.splice(index + 1, 0, copy)
  return { content: { ...content, slides }, slideId: copy.id }
}

/** Removes a slide; the last remaining slide cannot be deleted. */
export function deleteSlide(content: SlidesContent, slideId: string): SlidesContent {
  if (content.slides.length <= 1) return content
  return { ...content, slides: content.slides.filter((s) => s.id !== slideId) }
}

/** Moves a slide up (-1) or down (+1). */
export function moveSlide(
  content: SlidesContent,
  slideId: string,
  by: -1 | 1,
): SlidesContent {
  const index = content.slides.findIndex((s) => s.id === slideId)
  const target = index + by
  if (index < 0 || target < 0 || target >= content.slides.length) return content
  const slides = [...content.slides]
  const [slide] = slides.splice(index, 1)
  slides.splice(target, 0, slide)
  return { ...content, slides }
}

export function updateSlide(
  content: SlidesContent,
  slideId: string,
  change: (slide: Slide) => Slide,
): SlidesContent {
  return {
    ...content,
    slides: content.slides.map((slide) => (slide.id === slideId ? change(slide) : slide)),
  }
}

/** Changes a slide's layout: its text is kept in the new layout's boxes where possible. */
export function changeLayout(
  content: SlidesContent,
  slideId: string,
  layout: SlideLayout,
) {
  return updateSlide(content, slideId, (slide) => {
    const oldTexts = slide.elements.filter((e) => e.type === 'text' && e.role)
    const others = slide.elements.filter((e) => !(e.type === 'text' && e.role))
    const fresh = layoutElements(layout).map((element, i) => {
      const old = oldTexts[i]
      return element.type === 'text' && old?.type === 'text'
        ? { ...element, text: old.text }
        : element
    })
    return { ...slide, layout, elements: [...fresh, ...others] }
  })
}

export function addElement(
  content: SlidesContent,
  slideId: string,
  element: SlideElement,
) {
  return updateSlide(content, slideId, (slide) => ({
    ...slide,
    elements: [...slide.elements, element],
  }))
}

export function updateElement(
  content: SlidesContent,
  slideId: string,
  elementId: string,
  changes: Partial<SlideElement>,
): SlidesContent {
  return updateSlide(content, slideId, (slide) => ({
    ...slide,
    elements: slide.elements.map((element) =>
      element.id === elementId ? ({ ...element, ...changes } as SlideElement) : element,
    ),
  }))
}

export function removeElement(
  content: SlidesContent,
  slideId: string,
  elementId: string,
) {
  return updateSlide(content, slideId, (slide) => ({
    ...slide,
    elements: slide.elements.filter((element) => element.id !== elementId),
  }))
}

/** Brings an element to the front (+1) or sends it to the back (-1). */
export function reorderElement(
  content: SlidesContent,
  slideId: string,
  elementId: string,
  to: 1 | -1,
): SlidesContent {
  return updateSlide(content, slideId, (slide) => {
    const element = slide.elements.find((e) => e.id === elementId)
    if (!element) return slide
    const rest = slide.elements.filter((e) => e.id !== elementId)
    return { ...slide, elements: to === 1 ? [...rest, element] : [element, ...rest] }
  })
}

/** Where an element goes on the slide (in slide units). */
export function boxStyle(element: {
  x: number
  y: number
  w: number
  h: number
}): CSSProperties {
  return {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.w,
    height: element.h,
  }
}

/** Keeps a box on the slide (at least partly) and at a sensible size. */
export function clampBox(box: { x: number; y: number; w: number; h: number }) {
  const w = Math.min(SLIDE_WIDTH * 1.5, Math.max(16, box.w))
  const h = Math.min(SLIDE_HEIGHT * 1.5, Math.max(16, box.h))
  return {
    w,
    h,
    x: Math.min(SLIDE_WIDTH - 16, Math.max(16 - w, box.x)),
    y: Math.min(SLIDE_HEIGHT - 16, Math.max(16 - h, box.y)),
  }
}

/** All the text on a slide (for grading and searching). */
export function slideText(slide: Slide): string {
  return slide.elements
    .map((element) =>
      element.type === 'text' || element.type === 'shape' ? element.text : '',
    )
    .filter(Boolean)
    .join('\n')
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface SlidesTemplate {
  id: string
  name: string
  description: string
  title: string
  build: (author: string) => SlidesContent
}

export const SLIDES_TEMPLATES: SlidesTemplate[] = [
  {
    id: 'blank',
    name: 'Blank presentation',
    description: 'One title slide to start from.',
    title: 'Untitled presentation',
    build: () => ({ theme: 'corporate', slides: [createSlide('title')] }),
  },
  {
    id: 'business-review',
    name: 'Monthly business review',
    description: 'Highlights, figures, issues and next steps for a management meeting.',
    title: 'Monthly business review',
    build: (author) => ({
      theme: 'corporate',
      slides: [
        createSlide('title', [
          '[Month] business review',
          `${author} · Finance & Administration`,
        ]),
        createSlide('title-content', [
          'Highlights',
          '[The most important result this month]\n[A second highlight]\n[A third highlight]',
        ]),
        createSlide('title-only', ['Key figures']),
        createSlide('two-column', [
          'What went well, what did not',
          '[Went well]\n[Went well]',
          '[Needs attention]\n[Needs attention]',
        ]),
        createSlide('title-content', [
          'Next steps',
          '[Action, owner, date]\n[Action, owner, date]',
        ]),
        createSlide('section', ['Questions?', '[Your name and contact]']),
      ],
    }),
  },
  {
    id: 'project-update',
    name: 'Project update',
    description: 'Status, progress against plan, risks and decisions needed.',
    title: 'Project update',
    build: (author) => ({
      theme: 'fresh',
      slides: [
        createSlide('title', ['[Project name]: update', `${author} · [Date]`]),
        createSlide('title-content', [
          'Status at a glance',
          'Overall: [On track / At risk / Off track]\nBudget: [spent so far of total]\nTimeline: [next milestone and date]',
        ]),
        createSlide('two-column', [
          'Progress',
          'Done\n[Item]\n[Item]',
          'Next\n[Item]\n[Item]',
        ]),
        createSlide('title-content', [
          'Risks and issues',
          '[Risk, impact, what we are doing about it]',
        ]),
        createSlide('title-content', [
          'Decisions needed',
          '[What you need from the audience, by when]',
        ]),
      ],
    }),
  },
  {
    id: 'proposal',
    name: 'Proposal',
    description: 'Problem, proposed solution, costs and benefits, recommendation.',
    title: 'Proposal',
    build: (author) => ({
      theme: 'warm',
      slides: [
        createSlide('title', ['[Proposal title]', `Prepared by ${author}`]),
        createSlide('title-content', [
          'The problem',
          '[What is wrong today, with a figure that shows why it matters]',
        ]),
        createSlide('title-content', [
          'Our proposal',
          '[What we want to do]\n[How it works]',
        ]),
        createSlide('two-column', [
          'Costs and benefits',
          'Costs\n[One-off]\n[Ongoing]',
          'Benefits\n[Saving per year]\n[Other benefits]',
        ]),
        createSlide('title-content', [
          'Recommendation',
          '[The decision you are asking for]',
        ]),
      ],
    }),
  },
]

export function getSlidesTemplate(id: string): SlidesTemplate {
  return SLIDES_TEMPLATES.find((t) => t.id === id) ?? SLIDES_TEMPLATES[0]
}
