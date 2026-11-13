/**
 * The Code app's editor features that need no screen: searching the
 * project, the folder tree, file names, and the (simulated) extensions.
 */

/** A file path such as "lib/tax.js" (the same rule as the save file). */
export const FILE_PATH = /^[\w.-]+(\/[\w.-]+)*$/

/** Why a new or renamed file path cannot be used, or null if it can. */
export function pathProblem(path: string, existing: string[]): string | null {
  if (!path.trim()) return 'Type a file name, e.g. utils.js or lib/tax.js.'
  if (path.length > 120) return 'That name is too long.'
  if (!FILE_PATH.test(path))
    return 'Use letters, numbers, dots, dashes and underscores; separate folders with /.'
  if (existing.includes(path)) return `${path} already exists.`
  if (existing.some((name) => name.startsWith(`${path}/`))) return `${path} is a folder.`
  return null
}

/** The editor language for a file name. */
export function languageOf(name: string): string {
  const ext = /\.([a-z]+)$/i.exec(name)?.[1]?.toLowerCase() ?? ''
  const byExt: Record<string, string> = {
    js: 'javascript',
    cjs: 'javascript',
    mjs: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    txt: 'plaintext',
  }
  return byExt[ext] ?? 'plaintext'
}

export interface TreeNode {
  name: string
  /** The full path ("lib/tax.js"); for a folder, the folder's path. */
  path: string
  folder: boolean
  children: TreeNode[]
}

/** The folder tree of a list of paths: folders first, then files, by name. */
export function fileTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', folder: true, children: [] }
  for (const path of paths) {
    const parts = path.split('/')
    let node = root
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1
      const childPath = parts.slice(0, i + 1).join('/')
      let child = node.children.find((c) => c.name === part && c.folder === !isFile)
      if (!child) {
        child = { name: part, path: childPath, folder: !isFile, children: [] }
        node.children.push(child)
      }
      node = child
    })
  }
  const sort = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .sort((a, b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name))
      .map((n) => ({ ...n, children: sort(n.children) }))
  return sort(root.children)
}

export interface SearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
}

export interface SearchMatch {
  file: string
  line: number
  column: number
  length: number
  text: string
}

/** The pattern for a search, or an error message if the regular expression is invalid. */
export function searchPattern(query: string, options: SearchOptions): RegExp | string {
  let source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (options.wholeWord) source = `\\b${source}\\b`
  try {
    return new RegExp(source, options.caseSensitive ? 'g' : 'gi')
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

/** Every match of `query` in the files (at most `limit`). */
export function searchFiles(
  files: Array<{ name: string; text: string }>,
  query: string,
  options: SearchOptions = {},
  limit = 500,
): SearchMatch[] | string {
  if (!query) return []
  const pattern = searchPattern(query, options)
  if (typeof pattern === 'string') return pattern
  const matches: SearchMatch[] = []
  for (const file of files) {
    file.text.split('\n').forEach((text, i) => {
      for (const m of text.matchAll(pattern)) {
        if (m[0].length === 0 || matches.length >= limit) continue
        matches.push({
          file: file.name,
          line: i + 1,
          column: (m.index ?? 0) + 1,
          length: m[0].length,
          text,
        })
      }
    })
  }
  return matches
}

/** Replaces every match in one file's text. */
export function replaceAllIn(
  text: string,
  query: string,
  replacement: string,
  options: SearchOptions = {},
): string {
  const pattern = searchPattern(query, options)
  if (typeof pattern === 'string' || !query) return text
  return options.regex
    ? text.replace(pattern, replacement)
    : text.replace(pattern, () => replacement)
}

/**
 * The extensions marketplace. Simulated: nothing is downloaded. Each one
 * switches on a real feature of this editor.
 */
export interface Extension {
  id: string
  name: string
  publisher: string
  description: string
  /** What installing it does here. */
  effect: string
}

export const EXTENSIONS: Extension[] = [
  {
    id: 'tidy-format',
    name: 'Tidy Formatter',
    publisher: 'WorkSim Labs',
    description: 'Formats JavaScript and JSON consistently.',
    effect: 'Adds Format Document (Shift+Alt+F) and formats when you save with Ctrl+S.',
  },
  {
    id: 'bracket-colours',
    name: 'Bracket Colours',
    publisher: 'WorkSim Labs',
    description: 'Colours matching brackets so nesting is easy to read.',
    effect: 'Colours bracket pairs and draws guides between them.',
  },
  {
    id: 'code-overview',
    name: 'Code Overview',
    publisher: 'WorkSim Labs',
    description: 'A small overview of the whole file at the side of the editor.',
    effect: 'Shows the minimap.',
  },
  {
    id: 'soft-wrap',
    name: 'Soft Wrap',
    publisher: 'Community',
    description: 'Wraps long lines to the width of the editor.',
    effect: 'Turns on word wrap.',
  },
  {
    id: 'whitespace-lens',
    name: 'Whitespace Lens',
    publisher: 'Community',
    description: 'Shows spaces and tabs, to find stray indentation.',
    effect: 'Renders whitespace characters.',
  },
  {
    id: 'test-lens',
    name: 'Test Lens',
    publisher: 'WorkSim Labs',
    description: 'Runs the tests whenever you save.',
    effect: 'Runs the tests after Ctrl+S, and shows the result in the status bar.',
  },
]

/** The commands of the command palette, by id. */
export const COMMANDS = [
  ['commandPalette', 'Show All Commands', 'Ctrl+Shift+P'],
  ['quickOpen', 'Go to File…', 'Ctrl+P'],
  ['newFile', 'File: New File…', ''],
  ['save', 'File: Save', 'Ctrl+S'],
  ['closeEditor', 'View: Close Editor', 'Ctrl+W'],
  ['undo', 'Edit: Undo', 'Ctrl+Z'],
  ['redo', 'Edit: Redo', 'Ctrl+Y'],
  ['find', 'Edit: Find', 'Ctrl+F'],
  ['replace', 'Edit: Replace', 'Ctrl+H'],
  ['format', 'Format Document', 'Shift+Alt+F'],
  ['gotoLine', 'Go to Line…', 'Ctrl+G'],
  ['explorer', 'View: Show Explorer', 'Ctrl+Shift+E'],
  ['search', 'View: Show Search', 'Ctrl+Shift+F'],
  ['scm', 'View: Show Source Control', 'Ctrl+Shift+G'],
  ['debug', 'View: Show Run and Debug', 'Ctrl+Shift+D'],
  ['extensions', 'View: Show Extensions', 'Ctrl+Shift+X'],
  ['toggleSidebar', 'View: Toggle Side Bar', 'Ctrl+B'],
  ['togglePanel', 'View: Toggle Panel', 'Ctrl+J'],
  ['problems', 'View: Show Problems', 'Ctrl+Shift+M'],
  ['terminal', 'Terminal: Show Terminal', 'Ctrl+`'],
  ['runTests', 'Test: Run All Tests', ''],
  ['startDebugging', 'Debug: Start Debugging', 'F5'],
  ['toggleBreakpoint', 'Debug: Toggle Breakpoint', 'F9'],
  ['commit', 'Git: Commit', ''],
  ['branch', 'Git: Create Branch…', ''],
  ['wordWrap', 'View: Toggle Word Wrap', 'Alt+Z'],
  ['shortcuts', 'Help: Keyboard Shortcuts', ''],
  ['about', 'Help: About', ''],
] as const

export type CommandId = (typeof COMMANDS)[number][0]

/** Commands whose name contains every word of the query, in order of the list. */
export function filterCommands(query: string): Array<(typeof COMMANDS)[number]> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return COMMANDS.filter(([, label]) =>
    words.every((w) => label.toLowerCase().includes(w)),
  )
}

/** Files whose path contains the query's letters in order (fuzzy), best first. */
export function fuzzyFiles(names: string[], query: string): string[] {
  const q = query.toLowerCase().replace(/\s+/g, '')
  if (!q) return [...names]
  const scored: Array<[string, number]> = []
  for (const name of names) {
    const lower = name.toLowerCase()
    let at = -1
    let gaps = 0
    let ok = true
    for (const ch of q) {
      const next = lower.indexOf(ch, at + 1)
      if (next < 0) {
        ok = false
        break
      }
      gaps += next - at - 1
      at = next
    }
    if (ok) scored.push([name, gaps + (lower.includes(q) ? -100 : 0)])
  }
  return scored.sort((a, b) => a[1] - b[1]).map(([n]) => n)
}
