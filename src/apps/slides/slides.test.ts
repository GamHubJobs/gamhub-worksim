import { describe, expect, it } from 'vitest'
import { SlidesContentSchema, type SlidesContent } from '../../persistence/schemas'
import {
  addElement,
  addSlide,
  changeLayout,
  clampBox,
  createSlide,
  deleteSlide,
  duplicateSlide,
  moveSlide,
  removeElement,
  reorderElement,
  slideText,
  SLIDES_TEMPLATES,
  textBox,
  updateElement,
} from './model'

function deck(): SlidesContent {
  return {
    theme: 'corporate',
    slides: [
      createSlide('title', ['Budget review', 'October']),
      createSlide('title-content', ['Highlights', 'Travel over budget\nTraining under']),
    ],
  }
}

describe('slides', () => {
  it.each(SLIDES_TEMPLATES.map((t) => [t.id, t] as const))(
    'template %s is a valid presentation',
    (_, template) => {
      const built = template.build('Alex Morgan')
      expect(SlidesContentSchema.safeParse(built).success).toBe(true)
    },
  )

  it('adds, duplicates, moves and deletes slides', () => {
    let content = deck()
    const added = addSlide(content, 0, 'two-column')
    content = added.content
    expect(content.slides.map((s) => s.layout)).toEqual([
      'title',
      'two-column',
      'title-content',
    ])

    const copy = duplicateSlide(content, content.slides[2].id)
    content = copy.content
    expect(content.slides).toHaveLength(4)
    expect(content.slides[3].id).toBe(copy.slideId)
    expect(slideText(content.slides[3])).toBe(slideText(content.slides[2]))
    expect(content.slides[3].elements[0].id).not.toBe(content.slides[2].elements[0].id)

    content = moveSlide(content, content.slides[3].id, -1)
    expect(content.slides[2].id).toBe(copy.slideId)
    expect(moveSlide(content, content.slides[0].id, -1)).toBe(content)

    content = deleteSlide(content, copy.slideId)
    expect(content.slides).toHaveLength(3)
  })

  it('never deletes the last slide', () => {
    const one: SlidesContent = { theme: 'warm', slides: [createSlide('blank')] }
    expect(deleteSlide(one, one.slides[0].id)).toBe(one)
  })

  it('keeps the text when the layout changes', () => {
    const content = deck()
    const changed = changeLayout(content, content.slides[1].id, 'two-column')
    const slide = changed.slides[1]
    expect(slide.layout).toBe('two-column')
    expect(slideText(slide)).toContain('Highlights')
    expect(slideText(slide)).toContain('Travel over budget')
    expect(slide.elements).toHaveLength(3)
  })

  it('adds, changes, reorders and removes elements', () => {
    let content = deck()
    const slideId = content.slides[1].id
    const box = textBox({ x: 100, y: 100, w: 200, h: 50 }, 'Note')
    content = addElement(content, slideId, box)
    content = updateElement(content, slideId, box.id, { x: 300 })
    expect(content.slides[1].elements.at(-1)).toMatchObject({ id: box.id, x: 300 })
    content = reorderElement(content, slideId, box.id, -1)
    expect(content.slides[1].elements[0].id).toBe(box.id)
    content = removeElement(content, slideId, box.id)
    expect(content.slides[1].elements.some((e) => e.id === box.id)).toBe(false)
    expect(SlidesContentSchema.safeParse(content).success).toBe(true)
  })

  it('keeps elements on the slide', () => {
    expect(clampBox({ x: 5000, y: -5000, w: 2, h: 100 })).toEqual({
      x: 944,
      y: -84,
      w: 16,
      h: 100,
    })
  })
})
