/**
 * The Code app's debugger: runs one function with the player's arguments
 * and records each line it reaches, with the values of the variables in
 * scope at that moment. The player then steps through the recording
 * (forwards and backwards, or on to the next breakpoint).
 *
 * It works by adding a call before each statement line inside a function
 * (`__trace(...)`), on the same line, so line numbers stay the same. The
 * analysis is line based: code it cannot follow is still run, just not
 * stepped through (the result says so).
 */
import {
  callFunction,
  show,
  toCommonJs,
  type CallResult,
  type SourceFile,
} from './runner'

export interface Step {
  file: string
  line: number
  /** The function the line is in. */
  fn: string
  /** Variables in scope, as text, e.g. [["total", "12.5"]]. */
  vars: Array<[string, string]>
}

export interface DebugRun extends CallResult {
  steps: Step[]
  /** True when the run had more steps than are recorded. */
  truncated: boolean
  /** Files that could not be stepped through (they still ran). */
  skipped: string[]
}

export const MAX_STEPS = 2000
const NOT_SET = '(not set yet)'

const KEYWORDS = new Set(
  'if for while switch catch function return typeof new await yield of in do else try finally class const let var'.split(
    ' ',
  ),
)

interface Scope {
  depth: number
  fn: string
  names: string[]
}

/** Simple names from a parameter list or a destructuring pattern. */
function namesIn(list: string): string[] {
  return list
    .replace(/=[^,{}[\]]*/g, '') // defaults
    .split(/[\s,{}[\]().:]+/)
    .map((n) => n.replace(/^\.\.\./, ''))
    .filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && !KEYWORDS.has(n))
}

/** Removes strings and comments from a line, so braces inside them are not counted. */
function codeOnly(line: string): string {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, '""')
}

const OPENS_BLOCK =
  /(\)\s*\{|=>\s*\{|\belse\s*\{|\btry\s*\{|\bfinally\s*\{|\bdo\s*\{|^\s*\{)\s*$/
const CONTINUES =
  /^(\}|\)|\]|\(|\[|`|\.|\?|:|,|\+|-|\*|\/|%|=|&&|\|\||<|>|else\b|catch\b|finally\b|case\b|default\b)/

/**
 * Adds `__trace(file, line, fn, () => [[name, () => value], ...])` before
 * each statement line inside a function. Returns the new text.
 */
export function instrument(text: string, file: string): string {
  const lines = text.split('\n')
  const scopes: Scope[] = []
  // Kinds of the open braces: a code block or an object literal.
  const braces: Array<'block' | 'object'> = []
  let prevEnd = ';'
  // Open ( and [ across lines: a statement cannot start inside them.
  let parens = 0
  let pending: Scope | null = null
  let inComment = false

  const out = lines.map((raw, index) => {
    const lineNo = index + 1
    let line = raw
    const trimmed = line.trim()
    if (inComment) {
      if (trimmed.includes('*/')) inComment = false
      return raw
    }
    if (trimmed.startsWith('/*') && !trimmed.includes('*/')) {
      inComment = true
      return raw
    }
    const code = codeOnly(line).trim()
    if (code === '') return raw

    // Insert the trace before the statement, when this is a statement start.
    const inBlock = braces.length > 0 && braces[braces.length - 1] === 'block'
    if (
      scopes.length > 0 &&
      inBlock &&
      parens === 0 &&
      // The previous line ended a statement (with or without a semicolon).
      !/[=+\-*/%,([.?:&|!<>~^]$/.test(prevEnd) &&
      !CONTINUES.test(code) &&
      !/^(function|async function|class)\b/.test(code)
    ) {
      const visible = [...new Set(scopes.flatMap((s) => s.names))]
      const getters = visible.map((n) => `[${JSON.stringify(n)}, () => ${n}]`).join(', ')
      const fn = scopes[scopes.length - 1].fn
      const indent = /^\s*/.exec(line)?.[0] ?? ''
      line = `${indent}__trace(${JSON.stringify(file)}, ${lineNo}, ${JSON.stringify(fn)}, () => [${getters}]); ${line.slice(indent.length)}`
    }

    // Functions opened on this line, with their parameters.
    const fnMatch =
      /function\s*\*?\s*([\w$]*)\s*\(([^)]*)\)/.exec(code) ??
      /([\w$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/.exec(code) ??
      /([\w$]+)\s*=\s*(?:async\s+)?([\w$]+)\s*=>/.exec(code) ??
      /^(?:async\s+)?([\w$]+)\s*\(([^)]*)\)\s*\{\s*$/.exec(code)
    if (fnMatch && !KEYWORDS.has(fnMatch[1] ?? '')) {
      pending = {
        depth: 0,
        fn: fnMatch[1] || '(anonymous)',
        names: namesIn(fnMatch[2] ?? ''),
      }
    } else if (/\(([^)]*)\)\s*=>\s*\{\s*$/.test(code)) {
      const params = /\(([^)]*)\)\s*=>\s*\{\s*$/.exec(code)?.[1] ?? ''
      pending = {
        depth: 0,
        fn: scopes[scopes.length - 1]?.fn ?? '(callback)',
        names: namesIn(params),
      }
    }

    // Declarations on this line belong to the innermost function.
    const current = scopes[scopes.length - 1]
    if (current) {
      for (const m of code.matchAll(
        /\b(?:const|let|var)\s+([^=;]+?)\s*(?:=|;|$|\bof\b|\bin\b)/g,
      )) {
        current.names.push(...namesIn(m[1]))
      }
      const loop = /\bfor\s*\(\s*(?:const|let|var)\s+([^=;]+?)\s+(?:of|in|=)/.exec(code)
      if (loop) current.names.push(...namesIn(loop[1]))
      const caught = /\bcatch\s*\(([^)]*)\)/.exec(code)
      if (caught) current.names.push(...namesIn(caught[1]))
    }

    // Track braces.
    for (let i = 0; i < code.length; i++) {
      const ch = code[i]
      if (ch === '{') {
        const before = code.slice(0, i + 1)
        const isBlock =
          OPENS_BLOCK.test(before) ||
          /\b(class\s+[\w$]+.*|switch\s*\(.*\))\s*\{$/.test(before)
        braces.push(isBlock ? 'block' : 'object')
        if (isBlock && pending) {
          pending.depth = braces.length
          scopes.push(pending)
          pending = null
        }
      } else if (ch === '}') {
        if (scopes.length > 0 && scopes[scopes.length - 1].depth === braces.length)
          scopes.pop()
        braces.pop()
      } else if (ch === '(' || ch === '[') {
        parens++
      } else if ((ch === ')' || ch === ']') && parens > 0) {
        parens--
      }
    }
    prevEnd = code.slice(-1)
    return line
  })
  return out.join('\n')
}

/** Runs `fn` from `file` with `args`, recording each line it reaches. */
export function debugCall(
  files: SourceFile[],
  file: string,
  fn: string,
  args: unknown[],
): DebugRun {
  const steps: Step[] = []
  let truncated = false
  const trace = (
    traceFile: string,
    line: number,
    traceFn: string,
    getters: () => Array<[string, () => unknown]>,
  ) => {
    if (steps.length >= MAX_STEPS) {
      truncated = true
      return
    }
    const vars: Array<[string, string]> = []
    for (const [name, get] of getters()) {
      try {
        vars.push([name, show(get())])
      } catch {
        vars.push([name, NOT_SET])
      }
    }
    steps.push({ file: traceFile, line, fn: traceFn, vars })
  }

  const skipped: string[] = []
  const instrumented = files.map((f) => {
    if (!/\.(c|m)?js$/.test(f.name) || /\.test\.(c|m)?js$/.test(f.name)) return f
    const text = instrument(f.text, f.name)
    try {
      // Check the new text still parses (it is not run here).
      new Function('__trace', 'require', 'module', 'exports', toCommonJs(text))
      return { ...f, text }
    } catch {
      skipped.push(f.name)
      return f
    }
  })
  const result = callFunction(instrumented, file, fn, args, { __trace: trace })
  return { ...result, steps, truncated, skipped }
}

/** The next step at a breakpoint after `from`, or the last step. */
export function nextBreakpoint(
  steps: Step[],
  from: number,
  breakpoints: Array<{ file: string; line: number }>,
): number {
  for (let i = from + 1; i < steps.length; i++) {
    if (breakpoints.some((b) => b.file === steps[i].file && b.line === steps[i].line))
      return i
  }
  return steps.length - 1
}

/** Exported functions in the project, as "file › name". */
export function debugTargets(files: Array<{ name: string; text: string }>) {
  const out: Array<{ file: string; fn: string }> = []
  for (const f of files) {
    if (!/\.(c|m)?js$/.test(f.name) || /\.test\.(c|m)?js$/.test(f.name)) continue
    for (const m of f.text.matchAll(
      /^\s*export\s+(?:async\s+)?function\s+(\w+)|^\s*export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/gm,
    ))
      out.push({ file: f.name, fn: m[1] ?? m[2] })
  }
  return out
}
