/**
 * Loads the Monaco editor (MIT licence, the editor component of VS Code)
 * with the languages the Code app uses, and its web workers, all bundled
 * with the game: nothing comes from a CDN. Imported only when the Code app
 * opens, so the rest of the game does not download it.
 */
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main.js'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js'
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker'

declare global {
  interface Window {
    MonacoEnvironment?: { getWorker: (id: string, label: string) => Worker }
  }
}

window.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker()
    if (label === 'json') return new JsonWorker()
    return new EditorWorker()
  },
}

// JavaScript: report mistakes in the code (syntax), not type guesses.
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
})
monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  allowNonTsExtensions: true,
  allowJs: true,
})
// The test API, so suggestions know test, describe and expect.
monaco.languages.typescript.javascriptDefaults.addExtraLib(
  [
    'declare function test(name: string, fn: () => void): void',
    'declare function it(name: string, fn: () => void): void',
    'declare function describe(name: string, fn: () => void): void',
    'declare function expect(value: unknown): { toBe(v: unknown): void; toEqual(v: unknown): void; toBeCloseTo(v: number, digits?: number): void; toThrow(message?: string | RegExp): void; toBeTruthy(): void; toBeFalsy(): void; toContain(v: unknown): void; not: any }',
  ].join('\n'),
  'worksim-tests.d.ts',
)

monaco.editor.defineTheme('worksim-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: { 'editor.background': '#0f172a', 'editorGutter.background': '#0f172a' },
})

export { monaco }
