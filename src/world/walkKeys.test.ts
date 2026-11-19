import { describe, expect, it } from 'vitest'
import { dialogIsOpen, keyTarget, walkKey, type KeyPress } from './walkKeys'

const key = (code: string, extra: Partial<KeyPress> = {}): KeyPress => ({
  code,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  defaultPrevented: false,
  ...extra,
})

/**
 * A small stand-in for the page (the tests run without a browser): elements
 * with a tag, attributes and a parent, and the `closest` and `contains` the
 * decision uses.
 */
interface Fake {
  tagName: string
  attrs: Record<string, string>
  parent: Fake | null
  isContentEditable: boolean
  ownerDocument: { body: Fake; documentElement: Fake }
  closest: (selector: string) => Fake | null
  contains: (other: Fake) => boolean
}

const root = { body: null as unknown as Fake, documentElement: null as unknown as Fake }

function el(
  tagName: string,
  attrs: Record<string, string> = {},
  parent: Fake | null = null,
) {
  const e: Fake = {
    tagName: tagName.toUpperCase(),
    attrs,
    parent,
    isContentEditable: false,
    ownerDocument: root,
    closest(selector) {
      for (let at: Fake | null = e; at; at = at.parent)
        if (selector.split(',').some((s) => matches(at!, s.trim()))) return at
      return null
    },
    contains(other) {
      for (let at: Fake | null = other; at; at = at.parent) if (at === e) return true
      return false
    },
  }
  e.isContentEditable = attrs.contenteditable === 'true' || !!parent?.isContentEditable
  return e
}

/** Enough of CSS selectors for walkKeys: tag, [attr], [attr="value"], tag[attr]. */
function matches(e: Fake, selector: string): boolean {
  const m = /^([a-z]*)(?:\[([a-z-]+)(?:="([^"]*)")?\])?$/.exec(selector)
  if (!m) return false
  const [, tag, attr, value] = m
  if (tag && e.tagName !== tag.toUpperCase()) return false
  if (attr && !(attr in e.attrs)) return false
  if (attr && value !== undefined && e.attrs[attr] !== value) return false
  return true
}

const html = el('html')
const body = el('body', {}, html)
root.body = body
root.documentElement = html
const view = el('div', { 'data-view': '' }, body)
const canvas = el('canvas', {}, view)
const header = el('header', {}, body)
const chip = el('button', {}, header)
const hud = el('div', { 'data-hud-zone': 'top-right' }, body)
const look = el('button', {}, hud)
const screen = el('div', { 'data-walk-keys': '' }, body)
const drawerButton = el('button', {}, el('section', { role: 'region' }, screen))
const panel = el('div', {}, body)
const save = el('button', {}, panel)
const grid = el('div', { tabindex: '0' }, panel)
const input = el('input', {}, panel)
const textarea = el('textarea', {}, panel)
const doc = el('div', { contenteditable: 'true' }, panel)
const para = el('p', {}, doc)

const target = (e: Fake | null) =>
  keyTarget(e as unknown as Element, view as unknown as Element)

describe('which keys are the walker’s', () => {
  it('with focus on the page (after a menu or the phone closes), WASD still walks', () => {
    expect(walkKey(target(body), key('KeyW'), false)).toBe(true)
    expect(walkKey(target(null), key('KeyD'), false)).toBe(true)
  })

  it('in the 3D view, every key, Space (jump) included', () => {
    expect(walkKey(target(view), key('Space'), false)).toBe(true)
    expect(walkKey(target(canvas), key('KeyE'), false)).toBe(true)
    // A dialog open does not take keys from the view that has focus.
    expect(walkKey(target(view), key('KeyW'), true)).toBe(true)
  })

  it('after clicking a header or HUD button: movement keys walk, Space and Enter press it', () => {
    for (const button of [chip, look, drawerButton]) {
      expect(walkKey(target(button), key('KeyW'), false)).toBe(true)
      expect(walkKey(target(button), key('ArrowLeft'), false)).toBe(true)
      expect(walkKey(target(button), key('Space'), false)).toBe(false)
      expect(walkKey(target(button), key('Enter'), false)).toBe(false)
    }
  })

  it('never while typing, nor inside a panel or window, nor with a dialog open', () => {
    for (const field of [input, textarea, para])
      expect(walkKey(target(field), key('KeyW'), false)).toBe(false)
    // A button or a grid in a window is not the header or the HUD.
    expect(walkKey(target(save), key('KeyW'), false)).toBe(false)
    expect(walkKey(target(grid), key('KeyW'), false)).toBe(false)
    // The page has focus but the pause menu or a dialog is open: not walking behind it.
    expect(walkKey(target(body), key('KeyW'), true)).toBe(false)
    expect(walkKey(target(chip), key('KeyW'), true)).toBe(false)
  })

  it('not shortcuts (Ctrl+S, Alt+D), but Ctrl on its own crouches', () => {
    expect(walkKey(target(view), key('KeyS', { ctrlKey: true }), false)).toBe(false)
    expect(walkKey(target(view), key('KeyD', { altKey: true }), false)).toBe(false)
    expect(walkKey(target(view), key('KeyW', { metaKey: true }), false)).toBe(false)
    expect(walkKey(target(view), key('ControlLeft', { ctrlKey: true }), false)).toBe(true)
  })

  it('not a key something outside the view has already handled', () => {
    expect(walkKey(target(body), key('KeyW', { defaultPrevented: true }), false)).toBe(
      false,
    )
  })

  it('knows when a dialog is open', () => {
    const page = (found: boolean) =>
      ({ querySelector: () => (found ? {} : null) }) as unknown as Document
    expect(dialogIsOpen(page(false))).toBe(false)
    expect(dialogIsOpen(page(true))).toBe(true)
  })
})
