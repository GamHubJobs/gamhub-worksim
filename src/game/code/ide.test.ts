import { describe, expect, it } from 'vitest'
import { debugCall, instrument, nextBreakpoint } from './debugger'
import {
  fileTree,
  filterCommands,
  fuzzyFiles,
  languageOf,
  pathProblem,
  replaceAllIn,
  searchFiles,
} from './ide'
import { runTests } from './runner'

const invoice = `export function total(items, taxRate) {
  let sum = 0
  for (const item of items) {
    sum += item.price * item.qty
  }
  const tax = sum * taxRate
  return sum + tax
}
`

describe('the debugger', () => {
  it('keeps line numbers when it adds its traces', () => {
    const out = instrument(invoice, 'invoice.js')
    expect(out.split('\n')).toHaveLength(invoice.split('\n').length)
    expect(out.split('\n')[1]).toContain('__trace("invoice.js", 2, "total"')
    // Not inside an expression or before a closing brace.
    expect(out.split('\n')[4]).not.toContain('__trace')
  })

  it('records each line reached, with the variables at that moment', () => {
    const run = debugCall(
      [{ name: 'invoice.js', text: invoice }],
      'invoice.js',
      'total',
      [
        [
          { price: 10, qty: 2 },
          { price: 5, qty: 1 },
        ],
        0.1,
      ],
    )
    expect(run.error).toBeNull()
    expect(run.value).toBe('27.5')
    expect(run.skipped).toEqual([])
    const lines = run.steps.map((s) => s.line)
    expect(lines).toEqual([2, 3, 4, 4, 6, 7])
    const atReturn = run.steps.at(-1)!
    expect(Object.fromEntries(atReturn.vars)).toMatchObject({ sum: '25', tax: '2.5' })
    // At the first line only the parameters exist.
    expect(run.steps[0].vars.map(([n]) => n)).toEqual(['items', 'taxRate'])
  })

  it('does not change object literals or chained calls', () => {
    const text = `export function make(n) {
  const point = {
    x: n,
    y: n * 2,
  }
  return [point]
    .map((p) => p.x + p.y)
}
`
    const run = debugCall([{ name: 'make.js', text }], 'make.js', 'make', [2])
    expect(run.error).toBeNull()
    expect(run.value).toContain('6')
    expect(run.steps.map((s) => s.line)).toEqual([2, 6])
  })

  it('reports the error and where it happened', () => {
    const text = `export function boom(x) {
  const y = x.missing.value
  return y
}
`
    const run = debugCall([{ name: 'boom.js', text }], 'boom.js', 'boom', [{}])
    expect(run.error).toMatch(/TypeError/)
    expect(run.line).toBe(2)
    expect(run.steps.map((s) => s.line)).toEqual([2])
  })

  it('finds the next breakpoint, or the end', () => {
    const steps = [2, 3, 4, 4, 6].map((line) => ({
      file: 'a.js',
      line,
      fn: 'f',
      vars: [],
    }))
    expect(nextBreakpoint(steps, 0, [{ file: 'a.js', line: 4 }])).toBe(2)
    expect(nextBreakpoint(steps, 2, [{ file: 'a.js', line: 4 }])).toBe(3)
    expect(nextBreakpoint(steps, 3, [{ file: 'a.js', line: 4 }])).toBe(4)
  })
})

describe('folders', () => {
  it('lets files in folders import each other', () => {
    const run = runTests([
      { name: 'lib/tax.js', text: 'export const rate = 0.2' },
      {
        name: 'lib/price.js',
        text: "import { rate } from './tax'\nexport const gross = (n) => n * (1 + rate)",
      },
      {
        name: 'price.test.js',
        text: "import { gross } from './lib/price.js'\ntest('gross', () => expect(gross(10)).toBe(12))",
      },
    ])
    expect(run.error).toBeNull()
    expect(run.tests).toEqual([{ name: 'gross', passed: true, message: '' }])
  })

  it('builds a tree with folders first', () => {
    const tree = fileTree(['b.js', 'lib/tax.js', 'a.js', 'lib/util/x.js'])
    expect(tree.map((n) => n.name)).toEqual(['lib', 'a.js', 'b.js'])
    expect(tree[0].children.map((n) => n.name)).toEqual(['util', 'tax.js'])
  })

  it('checks new file names', () => {
    expect(pathProblem('lib/tax.js', ['a.js'])).toBeNull()
    expect(pathProblem('a.js', ['a.js'])).toMatch(/already exists/)
    expect(pathProblem('lib', ['lib/tax.js'])).toMatch(/folder/)
    expect(pathProblem('bad name.js', [])).toMatch(/letters/)
  })
})

describe('search and commands', () => {
  const files = [
    { name: 'a.js', text: 'const total = 1\nTotal()' },
    { name: 'b.js', text: 'subtotal' },
  ]
  it('searches every file, with options', () => {
    const all = searchFiles(files, 'total')
    expect(
      Array.isArray(all) && all.map((m) => `${m.file}:${m.line}:${m.column}`),
    ).toEqual(['a.js:1:7', 'a.js:2:1', 'b.js:1:4'])
    expect(
      searchFiles(files, 'total', { caseSensitive: true, wholeWord: true }),
    ).toHaveLength(1)
    expect(searchFiles(files, '(', { regex: true })).toEqual(expect.any(String))
  })

  it('replaces', () => {
    expect(replaceAllIn('a $1 a', 'a', 'b')).toBe('b $1 b')
    expect(replaceAllIn('x1 x2', 'x(\\d)', 'y$1', { regex: true })).toBe('y1 y2')
  })

  it('finds commands and files', () => {
    expect(filterCommands('git com').map(([id]) => id)).toEqual(['commit'])
    expect(fuzzyFiles(['lib/tax.js', 'invoice.js', 'invoice.test.js'], 'inv')[0]).toBe(
      'invoice.js',
    )
    expect(languageOf('data.json')).toBe('json')
    expect(languageOf('lib/a.js')).toBe('javascript')
  })
})

describe('merge conflicts', () => {
  it('marks both versions, then records the merge once resolved', async () => {
    const {
      initRepository,
      checkout,
      commit,
      add,
      startMerge,
      completeMerge,
      hasConflictMarkers,
      headCommit,
    } = await import('./git')
    let files = { 'a.js': 'one\ntwo\nthree' }
    let git = initRepository(files)
    let r = checkout(git, files, 'feature', true)
    git = r.git
    files = { 'a.js': 'one\nTWO (feature)\nthree' }
    git = add(git, files, ['a.js']).git
    git = commit(git, files, 'feature change').git
    r = checkout(git, files, 'main')
    git = r.git
    files = { 'a.js': 'one\nTWO (main)\nthree' }
    git = add(git, files, ['a.js']).git
    git = commit(git, files, 'main change').git

    const started = startMerge(git, files, 'feature')
    expect(started.conflicts).toEqual(['a.js'])
    expect(started.working['a.js']).toBe(
      'one\n<<<<<<< HEAD\nTWO (main)\n=======\nTWO (feature)\n>>>>>>> feature\nthree',
    )
    expect(completeMerge(git, started.working, 'feature').output[0]).toMatch(
      /still in a\.js/,
    )
    const resolved = { 'a.js': 'one\nTWO (both)\nthree' }
    expect(hasConflictMarkers(resolved['a.js'])).toBe(false)
    const done = completeMerge(git, resolved, 'feature')
    expect(headCommit(done.git)?.parents).toHaveLength(2)
    expect(headCommit(done.git)?.files).toEqual(resolved)
  })
})
