import { describe, expect, it } from 'vitest'
import { formatRange, parseRange } from '../apps/sheets/model'
import { getAssignment } from '../content/assignments'
import type { SheetContent } from '../persistence/schemas'
import { changeAllNumbers, functionsUsed, gradeAssignment, ratingFor } from './grading'
import { applyInputs, buildSolutionContent, buildStartingContent } from './workbooks'

const assignment = getAssignment('supplies-order')!

/** The starting workbook with the given cells typed in on the "Order" sheet. */
function withInputs(cells: Record<string, string>, base?: SheetContent): SheetContent {
  return applyInputs(base ?? buildStartingContent(assignment), { Order: cells })
}

function withCurrency(content: SheetContent): SheetContent {
  return formatRange(content, content.sheets[0].id, parseRange('D2:E13')!, {
    numberFormat: 'currency',
  })
}

const correctFormulas: Record<string, string> = {
  E2: '=C2*D2',
  E3: '=C3*D3',
  E4: '=C4*D4',
  E5: '=C5*D5',
  E6: '=C6*D6',
  E7: '=C7*D7',
  E8: '=C8*D8',
  E9: '=C9*D9',
  E10: '=C10*D10',
  E11: '=C11*D11',
  E13: '=SUM(E2:E11)',
}

function check(result: ReturnType<typeof gradeAssignment>, id: string) {
  return result.checks.find((c) => c.id === id)!
}

describe('grading the supplies order', () => {
  it('gives full marks for the model answer', () => {
    const result = gradeAssignment(
      assignment,
      withCurrency(buildSolutionContent(assignment)),
    )
    expect(result.score).toBe(100)
    expect(result.rating).toBe('excellent')
    expect(result.passed).toBe(true)
    expect(
      result.checks.every((c) => c.status === 'passed' && c.problems.length === 0),
    ).toBe(true)
  })

  it('accepts other correct formulas, such as =D2*C2 and a SUM of separate cells', () => {
    const alternative = withCurrency(
      withInputs({
        ...Object.fromEntries(
          Object.keys(correctFormulas)
            .filter((a) => a !== 'E13')
            .map((a) => [a, `=D${a.slice(1)}*C${a.slice(1)}`]),
        ),
        E13: '=SUM(E2:E6,E7:E11)',
      }),
    )
    expect(gradeAssignment(assignment, alternative).score).toBe(100)
  })

  it('fails an untouched workbook', () => {
    const result = gradeAssignment(assignment, buildStartingContent(assignment))
    expect(result.passed).toBe(false)
    expect(check(result, 'line-totals').problems[0]).toBe('E2 is empty.')
    // Untouched source data still earns its points.
    expect(check(result, 'data-unchanged').status).toBe('passed')
  })

  it('catches typed-in results instead of formulas', () => {
    const typed = withCurrency(withInputs({ ...correctFormulas, E2: '149.94', E3: '46' }))
    const result = gradeAssignment(assignment, typed)
    const lines = check(result, 'line-totals')
    expect(lines.status).toBe('partial')
    expect(lines.earned).toBe(32) // 8 of 10 cells
    expect(lines.problems[0]).toContain('E2 has the right number, but it was typed in')
  })

  it('catches formulas with fixed numbers inside them', () => {
    const hidden = withCurrency(withInputs({ ...correctFormulas, E2: '=6*24.99' }))
    const result = gradeAssignment(assignment, hidden)
    expect(check(result, 'line-totals').problems[0]).toMatch(
      /E2 is right for now, but went wrong when we tested a change/,
    )
  })

  it('catches formulas pointing at the wrong row', () => {
    const shifted = withCurrency(withInputs({ ...correctFormulas, E5: '=C4*D4' }))
    const result = gradeAssignment(assignment, shifted)
    expect(check(result, 'line-totals').problems).toEqual([
      'E5 shows 43.75, which is not the right result.',
    ])
  })

  it('requires SUM for the order total', () => {
    const added = withCurrency(
      withInputs({ ...correctFormulas, E13: '=E2+E3+E4+E5+E6+E7+E8+E9+E10+E11' }),
    )
    const result = gradeAssignment(assignment, added)
    expect(check(result, 'order-total').problems[0]).toBe(
      'E13 gives the right result, but should use SUM.',
    )
  })

  it('catches a total that misses a row', () => {
    const short = withCurrency(withInputs({ ...correctFormulas, E13: '=SUM(E2:E10)' }))
    expect(check(gradeAssignment(assignment, short), 'order-total').status).toBe('failed')
  })

  it('explains errors in checked cells', () => {
    const broken = withCurrency(withInputs({ ...correctFormulas, E2: '=C2*D2/0' }))
    const problems = check(gradeAssignment(assignment, broken), 'line-totals').problems
    expect(problems[0]).toMatch(/^E2 shows #DIV\/0!/)
  })

  it('checks currency formatting cell by cell', () => {
    const result = gradeAssignment(assignment, withInputs(correctFormulas))
    const currency = check(result, 'currency')
    expect(currency.status).toBe('failed')
    expect(currency.problems[0]).toBe('D2 is not formatted as currency.')
    expect(currency.problems.at(-1)).toMatch(/more cells like this/)
    expect(result.score).toBe(85)
    expect(result.rating).toBe('good')
  })

  it('takes all points away if the source data was changed', () => {
    const edited = withCurrency(withInputs({ ...correctFormulas, C3: '5' }))
    const result = gradeAssignment(assignment, edited)
    const unchanged = check(result, 'data-unchanged')
    expect(unchanged.earned).toBe(0)
    expect(unchanged.problems).toEqual(['C3 was changed from "4" to "5".'])
  })

  it('reports a renamed sheet', () => {
    const renamed = buildSolutionContent(assignment)
    renamed.sheets[0] = { ...renamed.sheets[0], name: 'My order' }
    const result = gradeAssignment(assignment, renamed)
    expect(result.score).toBe(0)
    expect(check(result, 'line-totals').problems[0]).toContain('"Order" is missing')
  })
})

describe('grading helpers', () => {
  it('finds the functions used in a formula', () => {
    expect([...functionsUsed('=IF(SUM(A1:A3)>5, ROUND(A4, 2), 0)')].sort()).toEqual([
      'IF',
      'ROUND',
      'SUM',
    ])
    expect(functionsUsed('42').size).toBe(0)
    expect(functionsUsed('=SUM(').size).toBe(0)
  })

  it('rates scores', () => {
    expect(ratingFor(95, 70)).toBe('excellent')
    expect(ratingFor(80, 70)).toBe('good')
    expect(ratingFor(70, 70)).toBe('pass')
    expect(ratingFor(69, 70)).toBe('fail')
  })

  it('changes every typed number for the robustness test', () => {
    const { changes } = changeAllNumbers(buildStartingContent(assignment))
    expect(changes['Order!C2']).toBe('9')
    expect(changes['Order!D2']).toBe('27.86')
    expect(changes['Order!A2']).toBeUndefined()
  })
})

describe('teaching moments in later assignments', () => {
  it('expense claims: >= instead of > flags the $250.00 claim wrongly', () => {
    const expenses = getAssignment('expense-summary')!
    const solution = buildSolutionContent(expenses)
    const flags = Object.fromEntries(
      Array.from({ length: 14 }, (_, i) => [
        `F${i + 2}`,
        `=IF(E${i + 2}>=250, "Yes", "No")`,
      ]),
    )
    const result = gradeAssignment(expenses, applyInputs(solution, { Claims: flags }))
    const check = result.checks.find((c) => c.id === 'approval-flags')!
    expect(check.problems).toEqual(['F15 shows "Yes", which is not the right result.'])
    // The count of approvals is wrong too, because it depends on the flags.
    expect(result.checks.find((c) => c.id === 'approval-count')!.status).toBe('failed')
  })

  it('invoice check: VLOOKUP without FALSE returns wrong prices from the unsorted list', () => {
    const invoice = getAssignment('invoice-check')!
    const solution = buildSolutionContent(invoice)
    const lookups = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [
        `E${i + 2}`,
        `=VLOOKUP(A${i + 2}, Prices!A:C, 3)`,
      ]),
    )
    const result = gradeAssignment(invoice, applyInputs(solution, { Invoice: lookups }))
    const check = result.checks.find((c) => c.id === 'agreed-prices')!
    expect(check.status).not.toBe('passed')
    expect(check.problems.length).toBeGreaterThan(0)
  })

  it('invoice check: a lookup range that moves when filled down breaks lower rows', () => {
    const invoice = getAssignment('invoice-check')!
    const solution = buildSolutionContent(invoice)
    const lookups = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [
        `E${i + 2}`,
        `=VLOOKUP(A${i + 2}, Prices!A${i + 2}:C${i + 13}, 3, FALSE)`,
      ]),
    )
    const result = gradeAssignment(invoice, applyInputs(solution, { Invoice: lookups }))
    const problems = result.checks.find((c) => c.id === 'agreed-prices')!.problems
    expect(problems.some((p) => p.includes('#N/A'))).toBe(true)
  })
})
