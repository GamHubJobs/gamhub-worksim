/**
 * Which key presses belong to the walking character (WalkView.tsx).
 *
 * The keys are listened for on the whole window, not only on the 3D view, so
 * walking does not stop because keyboard focus moved: after closing the phone,
 * a menu or a dialog (focus falls back to the page), or after clicking a
 * header or HUD button. They are left alone wherever they mean something else:
 * typing in a field, a key pressed inside a window, panel or dialog, and
 * shortcuts with Ctrl, Alt or Cmd.
 */

/** What the decision needs to know about the element that has focus. */
export interface KeyTarget {
  /** The page itself has focus (document.body, or nothing). */
  page: boolean
  /** Inside the walk view's own element. */
  inView: boolean
  /** A text field, a list box or anything editable. */
  editable: boolean
  /** A button or link (Space and Enter press it, so they are its keys). */
  pressable: boolean
  /** A button in the page header or the game's HUD (not in a panel). */
  chrome: boolean
}

export interface KeyPress {
  code: string
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
  defaultPrevented: boolean
}

const MODIFIERS = new Set([
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
])

/** Keys a focused button or link uses itself. */
const PRESS_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'Tab'])

/**
 * Whether a key going down is for the character. (A key coming up always
 * releases what it held, wherever focus is, so nothing is left held.)
 */
export function walkKey(
  target: KeyTarget,
  key: KeyPress,
  /** A dialog, panel or window is open over the world. */
  dialogOpen: boolean,
): boolean {
  if (target.editable) return false
  // Browser and app shortcuts (Ctrl+S, Alt+Tab, Cmd+W), but Ctrl alone crouches.
  if ((key.ctrlKey || key.altKey || key.metaKey) && !MODIFIERS.has(key.code)) return false
  if (target.pressable && PRESS_KEYS.has(key.code)) return false
  if (target.inView) return true
  // Something else already took it.
  if (key.defaultPrevented) return false
  // With a dialog open, its keys are its own.
  if (dialogOpen) return false
  return target.page || target.chrome
}

/** Reads the facts above from the element that has focus. */
export function keyTarget(element: Element | null, view: Element | null): KeyTarget {
  const doc = element?.ownerDocument
  const page = !element || element === doc?.body || element === doc?.documentElement
  const html = element as HTMLElement | null
  const editable =
    !!html &&
    !page &&
    (html.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(html.tagName) ||
      !!html.closest?.('[contenteditable=""],[contenteditable="true"],[role="textbox"]'))
  const pressable =
    !!html &&
    !page &&
    !!html.closest?.('button,a[href],[role="button"],[role="link"],summary')
  const inView = !!element && !!view && view.contains(element)
  const chrome =
    !!html && !page && !!html.closest?.('header,[data-hud-zone],[data-walk-keys]')
  return { page, inView, editable, pressable, chrome }
}

/** A dialog, panel or window open over the world (keys are not the walker's then). */
export function dialogIsOpen(doc: Document): boolean {
  // (Not one already on its way out: closed, playing its exit.)
  return !!doc.querySelector(
    '[role="dialog"]:not([data-leaving]),[role="alertdialog"]:not([data-leaving]),[aria-modal="true"]:not([data-leaving])',
  )
}
