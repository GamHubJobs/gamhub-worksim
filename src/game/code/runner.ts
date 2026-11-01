/**
 * Runs the player's JavaScript and its tests. This is the pure core: it runs
 * synchronously, so the unit tests and grading can use it directly. In the
 * browser it always runs inside a Web Worker (see `codeWorker.ts`), which
 * keeps the page responsive and stops code that never finishes.
 *
 * Files can use `import`/`export` (the common forms) or `require` and
 * `module.exports`. Tests use a small, familiar API: `test`, `describe` and
 * `expect(...).toBe(...)` and friends.
 */

export interface SourceFile {
  name: string
  text: string
}

export interface TestOutcome {
  name: string
  passed: boolean
  /** Why it failed, in plain words. Empty when it passed. */
  message: string
}

export interface RunResult {
  tests: TestOutcome[]
  /** What the code printed with console.log. */
  logs: string[]
  /** A problem that stopped the tests from running at all, e.g. a syntax error. */
  error: string | null
}

const MAX_LOGS = 200

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

/** Turns the common forms of `import` and `export` into `require` and `exports`. */
export function toCommonJs(source: string): string {
  const exported: string[] = []
  let code = source
    // import { a, b as c } from './x'
    .replace(
      /^[ \t]*import\s*\{([^}]*)\}\s*from\s*(['"][^'"]+['"])\s*;?/gm,
      (_, names: string, from: string) =>
        `const {${names.replace(/\s+as\s+/g, ': ')}} = require(${from});`,
    )
    // import * as x from './x'
    .replace(
      /^[ \t]*import\s*\*\s*as\s+(\w+)\s+from\s*(['"][^'"]+['"])\s*;?/gm,
      (_, name: string, from: string) => `const ${name} = require(${from});`,
    )
    // import x from './x'
    .replace(
      /^[ \t]*import\s+(\w+)\s+from\s*(['"][^'"]+['"])\s*;?/gm,
      (_, name: string, from: string) => `const ${name} = require(${from}).default;`,
    )
    // export function f / export const f / export class C
    .replace(
      /^([ \t]*)export\s+(async\s+function|function\*?|const|let|var|class)\s+(\w+)/gm,
      (_, indent: string, keyword: string, name: string) => {
        exported.push(name)
        return `${indent}${keyword} ${name}`
      },
    )
    // export { a, b as c }
    .replace(/^[ \t]*export\s*\{([^}]*)\}\s*;?/gm, (_, names: string) =>
      names
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [local, as] = part.split(/\s+as\s+/)
          return `exports.${as ?? local} = ${local};`
        })
        .join(' '),
    )
    // export default ...
    .replace(/^[ \t]*export\s+default\s+/gm, 'exports.default = ')
  if (exported.length > 0) {
    code += `\n;${exported.map((name) => `exports.${name} = ${name};`).join(' ')}`
  }
  return code
}

function normalise(spec: string): string {
  const name = spec.replace(/^\.\//, '')
  return /\.(c|m)?js$/.test(name) ? name : `${name}.js`
}

/** The text of an error, without the stack. */
export function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return `Error: ${String(error)}`
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

export class AssertionError extends Error {
  override name = 'AssertionError'
}

/** A short, readable form of a value for failure messages. */
export function show(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'function') return 'a function'
  if (value === undefined) return 'undefined'
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value)
  try {
    const text = JSON.stringify(value)
    return text.length > 200 ? `${text.slice(0, 200)}…` : text
  } catch {
    return String(value)
  }
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keysA = Object.keys(a).filter(
    (k) => (a as Record<string, unknown>)[k] !== undefined,
  )
  const keysB = Object.keys(b).filter(
    (k) => (b as Record<string, unknown>)[k] !== undefined,
  )
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}

function makeExpect() {
  return function expect(actual: unknown) {
    const build = (negated: boolean) => {
      const assert = (pass: boolean, message: string) => {
        if (pass === negated) {
          throw new AssertionError(negated ? `Expected not: ${message}` : message)
        }
      }
      return {
        toBe: (expected: unknown) =>
          assert(
            Object.is(actual, expected),
            `Expected ${show(expected)}, received ${show(actual)}`,
          ),
        toEqual: (expected: unknown) =>
          assert(
            deepEqual(actual, expected),
            `Expected ${show(expected)}, received ${show(actual)}`,
          ),
        toBeCloseTo: (expected: number, digits = 2) =>
          assert(
            typeof actual === 'number' && Math.abs(actual - expected) < 10 ** -digits / 2,
            `Expected about ${show(expected)}, received ${show(actual)}`,
          ),
        toBeTruthy: () =>
          assert(Boolean(actual), `Expected a true value, received ${show(actual)}`),
        toBeFalsy: () =>
          assert(!actual, `Expected a false value, received ${show(actual)}`),
        toBeGreaterThan: (n: number) =>
          assert(
            typeof actual === 'number' && actual > n,
            `Expected more than ${n}, received ${show(actual)}`,
          ),
        toBeLessThan: (n: number) =>
          assert(
            typeof actual === 'number' && actual < n,
            `Expected less than ${n}, received ${show(actual)}`,
          ),
        toContain: (item: unknown) =>
          assert(
            (typeof actual === 'string' &&
              typeof item === 'string' &&
              actual.includes(item)) ||
              (Array.isArray(actual) && actual.some((x) => deepEqual(x, item))),
            `Expected ${show(actual)} to contain ${show(item)}`,
          ),
        toHaveLength: (length: number) =>
          assert(
            (typeof actual === 'string' || Array.isArray(actual)) &&
              actual.length === length,
            `Expected length ${length}, received ${show(
              typeof actual === 'string' || Array.isArray(actual)
                ? actual.length
                : actual,
            )}`,
          ),
        toThrow: (expected?: string) => {
          if (typeof actual !== 'function') {
            throw new AssertionError(
              'toThrow needs a function: expect(() => ...).toThrow()',
            )
          }
          let thrown: unknown = null
          let threw = false
          try {
            actual()
          } catch (error) {
            threw = true
            thrown = error
          }
          const message = thrown instanceof Error ? thrown.message : String(thrown)
          const matches = threw && (expected === undefined || message.includes(expected))
          assert(
            matches,
            threw
              ? `Expected an error containing ${show(expected)}, got ${show(message)}`
              : 'Expected the function to throw an error, but it did not',
          )
        },
      }
    }
    return { ...build(false), not: build(true) }
  }
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

/** Whether a file is a test file, e.g. "invoice.test.js". */
export function isTestFile(name: string): boolean {
  return /\.test\.(c|m)?js$/.test(name)
}

/**
 * Loads the test files among `files` (or just `only`, if given) and runs
 * every test in them. Nothing here is asynchronous: tests run in order.
 */
export function runTests(files: SourceFile[], only?: string[]): RunResult {
  const logs: string[] = []
  const log = (...values: unknown[]) => {
    if (logs.length < MAX_LOGS) {
      logs.push(values.map((v) => (typeof v === 'string' ? v : show(v))).join(' '))
    }
  }
  const fakeConsole = { log, info: log, warn: log, error: log, debug: log }
  const byName = new Map(files.map((file) => [file.name, file]))
  const cache = new Map<string, { exports: Record<string, unknown> }>()

  const registered: Array<{ name: string; fn: () => unknown }> = []
  const prefixes: string[] = []
  const test = (name: string, fn: () => unknown) => {
    registered.push({ name: [...prefixes, name].join(' › '), fn })
  }
  const describe = (name: string, fn: () => unknown) => {
    prefixes.push(name)
    try {
      fn()
    } finally {
      prefixes.pop()
    }
  }
  const expect = makeExpect()

  const load = (spec: string): Record<string, unknown> => {
    const name = normalise(spec)
    const cached = cache.get(name)
    if (cached) return cached.exports
    const file = byName.get(name)
    if (!file) throw new Error(`Cannot find the file "${spec}".`)
    const module = { exports: {} as Record<string, unknown> }
    cache.set(name, module)
    let run: (...args: unknown[]) => void
    try {
      run = new Function(
        'module',
        'exports',
        'require',
        'console',
        'test',
        'it',
        'describe',
        'expect',
        `"use strict";\n${toCommonJs(file.text)}\n//# sourceURL=${name}`,
      ) as typeof run
    } catch (error) {
      cache.delete(name)
      throw new Error(`${name} has a mistake in its code. ${describeError(error)}`)
    }
    try {
      run(module, module.exports, load, fakeConsole, test, test, describe, expect)
    } catch (error) {
      cache.delete(name)
      throw error
    }
    return module.exports
  }

  const suites = only ?? files.map((file) => file.name).filter(isTestFile)
  try {
    for (const suite of suites) load(suite)
  } catch (error) {
    return { tests: [], logs, error: describeError(error) }
  }
  const tests = registered.map(({ name, fn }): TestOutcome => {
    try {
      const result = fn()
      if (result instanceof Promise) {
        return { name, passed: false, message: 'Tests here cannot be async.' }
      }
      return { name, passed: true, message: '' }
    } catch (error) {
      return {
        name,
        passed: false,
        message: error instanceof AssertionError ? error.message : describeError(error),
      }
    }
  })
  return { tests, logs, error: null }
}

// ---------------------------------------------------------------------------
// Debug console: call one function with chosen arguments
// ---------------------------------------------------------------------------

export interface CallResult {
  /** The returned value, as text (e.g. 12.5, "OK", NaN, undefined). */
  value: string | null
  logs: string[]
  error: string | null
  /** The line in the file where the error happened, if known. */
  line: number | null
}

const RESULT = '\u0000RESULT'
const FAILED = '\u0000ERROR'
/** Lines that new Function and "use strict" add before a file's first line. */
const LINE_OFFSET = 3

export function callFunction(
  files: SourceFile[],
  file: string,
  fn: string,
  args: unknown[],
): CallResult {
  const suite = `const __m = require(${JSON.stringify(`./${file}`)})
test('call', () => {
  const __f = __m[${JSON.stringify(fn)}]
  if (typeof __f !== 'function') {
    console.log(${JSON.stringify(FAILED)}, ${JSON.stringify(`${fn} is not a function exported by ${file}.`)})
    return
  }
  try {
    console.log(${JSON.stringify(RESULT)}, __f(...${JSON.stringify(args)}))
  } catch (e) {
    console.log(${JSON.stringify(FAILED)}, JSON.stringify({
      message: String(e && e.name ? e.name + ': ' + e.message : e),
      stack: String(e && e.stack),
    }))
  }
})`
  const name = '__debug__.test.js'
  const run = runTests([...files, { name, text: suite }], [name])
  if (run.error) return { value: null, logs: run.logs, error: run.error, line: null }
  const logs = run.logs.filter((l) => !l.startsWith(RESULT) && !l.startsWith(FAILED))
  const result = run.logs.find((l) => l.startsWith(RESULT))
  if (result !== undefined) {
    return { value: result.slice(RESULT.length + 1), logs, error: null, line: null }
  }
  const failed = run.logs.find((l) => l.startsWith(FAILED))
  if (failed === undefined) {
    const message = run.tests[0]?.message || 'The function could not be called.'
    return { value: null, logs, error: message, line: null }
  }
  let detail: { message: string; stack: string }
  try {
    detail = JSON.parse(failed.slice(FAILED.length + 1)) as typeof detail
  } catch {
    // The function name was not found: the log holds the plain message.
    return {
      value: null,
      logs,
      error: failed.slice(FAILED.length + 1).trim(),
      line: null,
    }
  }
  // The first stack frame in the player's file gives the line.
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const at = new RegExp(`${escaped}:(\\d+)`).exec(detail.stack)
  return {
    value: null,
    logs,
    error: detail.message,
    line: at ? Math.max(1, Number(at[1]) - LINE_OFFSET) : null,
  }
}
