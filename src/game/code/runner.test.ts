import { describe, expect, it } from 'vitest'
import { runTests, toCommonJs } from './runner'

const maths = {
  name: 'maths.js',
  text: `export function add(a, b) {
  return a + b
}
export const double = (n) => n * 2
`,
}

describe('running tests', () => {
  it('runs passing and failing tests and explains failures', () => {
    const result = runTests([
      maths,
      {
        name: 'maths.test.js',
        text: `import { add, double } from './maths.js'
test('adds', () => expect(add(2, 3)).toBe(5))
describe('double', () => {
  test('doubles', () => expect(double(4)).toBe(9))
})`,
      },
    ])
    expect(result.error).toBeNull()
    expect(result.tests).toEqual([
      { name: 'adds', passed: true, message: '' },
      { name: 'double › doubles', passed: false, message: 'Expected 9, received 8' },
    ])
  })

  it('supports require, module.exports and console.log', () => {
    const result = runTests([
      { name: 'greet.js', text: `module.exports = { greet: (n) => 'Hi ' + n }` },
      {
        name: 'greet.test.js',
        text: `const { greet } = require('./greet')
console.log('checking', 42)
test('greets', () => expect(greet('Sam')).toEqual('Hi Sam'))`,
      },
    ])
    expect(result.tests[0].passed).toBe(true)
    expect(result.logs).toEqual(['checking 42'])
  })

  it('reports syntax errors and missing files instead of crashing', () => {
    const broken = runTests([
      { name: 'bad.js', text: 'export function f( {' },
      { name: 'bad.test.js', text: `import { f } from './bad.js'\ntest('x', () => {})` },
    ])
    expect(broken.tests).toEqual([])
    expect(broken.error).toMatch(/bad\.js has a mistake/)
    const missing = runTests([{ name: 'a.test.js', text: `require('./nothing')` }])
    expect(missing.error).toMatch(/Cannot find the file/)
  })

  it('has the usual matchers, with .not', () => {
    const result = runTests([
      {
        name: 'm.test.js',
        text: `
test('equal', () => expect({ a: [1, 2] }).toEqual({ a: [1, 2] }))
test('close', () => expect(0.1 + 0.2).toBeCloseTo(0.3))
test('throws', () => expect(() => { throw new Error('Bad hours') }).toThrow('hours'))
test('contains', () => expect(['x', 'y']).toContain('y'))
test('length', () => expect('abc').toHaveLength(3))
test('not', () => expect(1).not.toBe(2))
test('fails', () => expect(() => 1).toThrow())`,
      },
    ])
    expect(result.tests.map((t) => t.passed)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      false,
    ])
  })

  it('turns import and export into require and exports', () => {
    expect(toCommonJs(`import { a, b as c } from './x.js'`)).toBe(
      `const { a, b: c } = require('./x.js');`,
    )
    expect(toCommonJs('export { a, b as c }')).toBe('exports.a = a; exports.c = b;')
  })
})
