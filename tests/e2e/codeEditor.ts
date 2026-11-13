/**
 * The Code app's editor is Monaco: tests read and set its text through the
 * editor itself (typing would trigger auto-closing brackets and indentation).
 */
import { expect, type Locator } from '@playwright/test'

interface EditorElement {
  __worksimEditor: { getValue(): string; setValue(text: string): void }
}

export async function editorReady(editor: Locator) {
  await expect(editor).toHaveAttribute('data-engine', 'monaco', { timeout: 20_000 })
  await expect(editor.locator('.view-lines')).toBeVisible()
}

export async function getCode(editor: Locator): Promise<string> {
  await editorReady(editor)
  return editor.evaluate((el) =>
    (el as unknown as EditorElement).__worksimEditor.getValue(),
  )
}

export async function setCode(editor: Locator, text: string) {
  await editorReady(editor)
  await editor.evaluate(
    (el, value) => (el as unknown as EditorElement).__worksimEditor.setValue(value),
    text,
  )
}

/** Waits until the editor shows this text (or text matching the pattern). */
export async function expectCode(editor: Locator, expected: string | RegExp) {
  if (typeof expected === 'string')
    await expect.poll(() => getCode(editor)).toBe(expected)
  else await expect.poll(() => getCode(editor)).toMatch(expected)
}

export async function expectReadOnly(editor: Locator) {
  await editorReady(editor)
  await expect(editor).toHaveAttribute('data-readonly', 'true')
}
