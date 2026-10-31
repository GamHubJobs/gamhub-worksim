import { describe, expect, it } from 'vitest'
import { createId } from '../../../lib/ids'
import type { SheetContent } from '../../../persistence/schemas'
import { FUNCTIONS, suggestFunctionName } from './functions'
import { FormulaParseError, parseFormula } from './parser'
import {
  findReferences,
  renameSheetInFormula,
  sheetPrefix,
  shiftFormula,
} from './references'
import {
  formatGeneralNumber,
  isError,
  parseLiteral,
  parseNumber,
  type CellValue,
} from './values'
import { calculateCell, createCalculator } from './workbook'

/** A workbook with one sheet ("Sheet1") holding the given cells. */
function workbook(
  cells: Record<string, string>,
  extraSheets: Record<string, Record<string, string>> = {},
): SheetContent {
  const toCells = (values: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(values).map(([address, input]) => [address, { input }]),
    )
  return {
    sheets: [
      { id: createId(), name: 'Sheet1', cells: toCells(cells) },
      ...Object.entries(extraSheets).map(([name, values]) => ({
        id: createId(),
        name,
        cells: toCells(values),
      })),
    ],
  }
}

/** Calculates `formula` (placed in Z100) next to the given cells. */
function calc(formula: string, cells: Record<string, string> = {}): CellValue {
  return calculateCell(workbook({ ...cells, Z100: formula }), 'Z100')
}

function errorCode(value: CellValue): string | null {
  return isError(value) ? value.code : null
}

describe('reading typed values', () => {
  it.each([
    ['42', 42],
    ['-3.5', -3.5],
    ['1,250.50', 1250.5],
    ['$1,200', 1200],
    ['£99.99', 99.99],
    ['15%', 0.15],
    ['.5', 0.5],
    ['2e3', 2000],
    ['  7  ', 7],
  ])('"%s" is the number %d', (text, expected) => {
    expect(parseLiteral(text).value).toBeCloseTo(expected)
  })

  it('remembers how a number was written', () => {
    expect(parseNumber('15%')?.impliedFormat).toBe('percent')
    expect(parseNumber('$5')?.impliedFormat).toBe('currency')
    expect(parseNumber('1,000')?.impliedFormat).toBe('thousands')
    expect(parseNumber('1000')?.impliedFormat).toBeUndefined()
  })

  it.each(['abc', '12abc', '1,2', '1.2.3', '$', '', '-', 'INV-001', '2024-01-05'])(
    '"%s" is not a number',
    (text) => {
      expect(parseNumber(text)).toBeNull()
    },
  )

  it('reads TRUE/FALSE, text, empty cells and forced text', () => {
    expect(parseLiteral('true').value).toBe(true)
    expect(parseLiteral('FALSE').value).toBe(false)
    expect(parseLiteral('Office chairs').value).toBe('Office chairs')
    expect(parseLiteral('').value).toBeNull()
    expect(parseLiteral("'00123").value).toBe('00123')
  })
})

describe('number display', () => {
  it.each([
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.3333333333'],
    [1250, '1250'],
    [-0, '0'],
    [123456789012, '1.23457E+11'],
  ])('%d shows as %s', (value, text) => {
    expect(formatGeneralNumber(value)).toBe(text)
  })
})

describe('arithmetic and operators', () => {
  it.each([
    ['=1+2', 3],
    ['=2+3*4', 14],
    ['=(2+3)*4', 20],
    ['=10/4', 2.5],
    ['=2^3', 8],
    ['=-2^2', 4], // as in Excel: the minus sign belongs to the 2
    ['=2^-1', 0.5],
    ['=50%', 0.5],
    ['=200*15%', 30],
    ['=--5', 5],
    ['=1+2-3+4', 4],
    ['=2*3^2', 18],
    ['=  1 +  1 ', 2],
  ])('%s = %d', (formula, expected) => {
    expect(calc(formula)).toBeCloseTo(expected)
  })

  it('compares values', () => {
    expect(calc('=1<2')).toBe(true)
    expect(calc('=2<=1')).toBe(false)
    expect(calc('="abc"="ABC"')).toBe(true) // text comparison ignores case
    expect(calc('="a"<>"b"')).toBe(true)
    expect(calc('=10>"9"')).toBe(false) // numbers come before text
    expect(calc('=A1=0', {})).toBe(true) // empty counts as 0
    expect(calc('=A1=""', {})).toBe(true)
  })

  it('joins text with &', () => {
    expect(calc('="Total: "&A1', { A1: '1,500' })).toBe('Total: 1500')
    expect(calc('=A1&" "&B1', { A1: 'Ada', B1: 'Lovelace' })).toBe('Ada Lovelace')
    expect(calc('=TRUE&1')).toBe('TRUE1')
  })

  it('uses cell values, treating empty cells as 0', () => {
    expect(calc('=A1*B1', { A1: '12', B1: '2.5' })).toBe(30)
    expect(calc('=A1+5')).toBe(5)
    expect(calc('=A1')).toBe(0)
    expect(calc('=A1', { A1: 'hello' })).toBe('hello')
  })

  it('converts number-like text in arithmetic but refuses other text', () => {
    expect(calc('=A1+1', { A1: "'41" })).toBe(42)
    const result = calc('=A1+1', { A1: 'twelve' })
    expect(errorCode(result)).toBe('#VALUE!')
    expect(isError(result) && result.message).toContain('"twelve" is text')
  })

  it('reports division by zero', () => {
    expect(errorCode(calc('=1/0'))).toBe('#DIV/0!')
    expect(errorCode(calc('=A1/B1', { A1: '5' }))).toBe('#DIV/0!')
  })

  it('passes errors on to formulas that use them', () => {
    expect(errorCode(calc('=A1+1', { A1: '=1/0' }))).toBe('#DIV/0!')
    expect(errorCode(calc('=SUM(A1:A2)', { A1: '1', A2: '=1/0' }))).toBe('#DIV/0!')
  })

  it('refuses a range where a single value is needed', () => {
    expect(errorCode(calc('=A1:A3+1'))).toBe('#VALUE!')
    expect(errorCode(calc('=A1:A3'))).toBe('#VALUE!')
  })
})

describe('formula problems are explained, not crashed on', () => {
  it.each([
    ['=SUM(A1', 'closing bracket'],
    ['=1+', 'ends too early'],
    ['=SUM(A1))', 'without a matching'],
    ['="abc', 'closing quote'],
    ['=1 2', 'unexpected'],
    ['=5 # 3', 'not allowed'],
    ['=*3', 'unexpected place'],
  ])('%s', (formula, message) => {
    const result = calc(formula)
    expect(errorCode(result)).toBe('#ERROR!')
    expect(isError(result) && result.message).toContain(message)
  })

  it('suggests the right name for a misspelled function', () => {
    const result = calc('=SUMM(1,2)')
    expect(errorCode(result)).toBe('#NAME?')
    expect(isError(result) && result.message).toContain('Did you mean SUM?')
    expect(suggestFunctionName('VLOKUP')).toBe('VLOOKUP')
    expect(suggestFunctionName('XYZZY')).toBeNull()
  })

  it('reports unquoted text', () => {
    const result = calc('=IF(A1>1, yes, no)', { A1: '5' })
    expect(errorCode(result)).toBe('#NAME?')
    expect(isError(result) && result.message).toContain('double quotes')
  })

  it('reports a wrong number of values with the correct usage', () => {
    const result = calc('=VLOOKUP(1, A1:B2)')
    expect(errorCode(result)).toBe('#ERROR!')
    expect(isError(result) && result.message).toContain('VLOOKUP(search_value')
  })

  it('accepts lower-case function names and references', () => {
    expect(calc('=sum(a1:a2)', { A1: '1', A2: '2' })).toBe(3)
  })

  it('accepts typed error values', () => {
    expect(errorCode(calc('=#N/A'))).toBe('#N/A')
    expect(calc('=IFERROR(#REF!, "fixed")')).toBe('fixed')
  })
})

describe('circular references', () => {
  it('detects a cell that depends on itself', () => {
    const content = workbook({ A1: '=A1+1' })
    const result = calculateCell(content, 'A1')
    expect(errorCode(result)).toBe('#REF!')
    expect(isError(result) && result.message).toContain('Circular reference')
  })

  it('detects longer loops and keeps unrelated cells working', () => {
    const content = workbook({ A1: '=B1', B1: '=C1', C1: '=A1', D1: '7' })
    const calculator = createCalculator(content)
    const id = content.sheets[0].id
    expect(errorCode(calculator.getValue(id, 'A1'))).toBe('#REF!')
    expect(errorCode(calculator.getValue(id, 'C1'))).toBe('#REF!')
    expect(calculator.getValue(id, 'D1')).toBe(7)
  })

  it('handles long chains of formulas', () => {
    const cells: Record<string, string> = { A1: '1' }
    for (let row = 2; row <= 2000; row++) cells[`A${row}`] = `=A${row - 1}+1`
    expect(calculateCell(workbook(cells), 'A2000')).toBe(2000)
  })

  it('detects very long loops', () => {
    const cells: Record<string, string> = { A1: '=A1500+1' }
    for (let row = 2; row <= 1500; row++) cells[`A${row}`] = `=A${row - 1}+1`
    cells.B1 = '5'
    const content = workbook(cells)
    expect(errorCode(calculateCell(content, 'A1'))).toBe('#REF!')
    expect(errorCode(calculateCell(content, 'A700'))).toBe('#REF!')
    expect(calculateCell(content, 'B1')).toBe(5)
  })
})

describe('references to other sheets', () => {
  it('reads cells and ranges from another sheet', () => {
    const content = workbook(
      { A1: '=Prices!B2*2', A2: "=SUM('Price list'!A1:A3)" },
      { Prices: { B2: '4.5' }, 'Price list': { A1: '1', A2: '2', A3: '3' } },
    )
    expect(calculateCell(content, 'A1')).toBe(9)
    expect(calculateCell(content, 'A2')).toBe(6)
  })

  it('reports a missing sheet', () => {
    const result = calc('=Missing!A1')
    expect(errorCode(result)).toBe('#REF!')
    expect(isError(result) && result.message).toContain('no sheet called "Missing"')
  })
})

describe('SUM, AVERAGE, MIN, MAX, COUNT', () => {
  const data = {
    A1: '10',
    A2: '20',
    A3: 'n/a', // text in a range is ignored
    A4: '', // empty
    A5: '30',
    A6: 'TRUE', // TRUE/FALSE in a range is ignored
  }

  it('SUM', () => {
    expect(calc('=SUM(A1:A6)', data)).toBe(60)
    expect(calc('=SUM(A1, A2, 5)', data)).toBe(35)
    expect(calc('=SUM(A:A)', data)).toBe(60)
    expect(calc('=SUM(1, "2", TRUE)')).toBe(4) // typed values are converted
    expect(errorCode(calc('=SUM("two")'))).toBe('#VALUE!')
    expect(calc('=SUM(B1:B5)')).toBe(0)
  })

  it('AVERAGE', () => {
    expect(calc('=AVERAGE(A1:A6)', data)).toBe(20)
    expect(errorCode(calc('=AVERAGE(B1:B5)'))).toBe('#DIV/0!')
  })

  it('MIN and MAX', () => {
    expect(calc('=MIN(A1:A6)', data)).toBe(10)
    expect(calc('=MAX(A1:A6)', data)).toBe(30)
    expect(calc('=MAX(A1:A6, 99)', data)).toBe(99)
    expect(calc('=MIN(B1:B5)')).toBe(0)
    expect(calc('=MIN(-5, 3)')).toBe(-5)
  })

  it('COUNT, COUNTA, COUNTBLANK', () => {
    expect(calc('=COUNT(A1:A6)', data)).toBe(3)
    expect(calc('=COUNTA(A1:A6)', data)).toBe(5)
    expect(calc('=COUNTBLANK(A1:A6)', data)).toBe(1)
    expect(calc('=COUNT(1, "2", "x")')).toBe(2)
  })

  it('MEDIAN and PRODUCT', () => {
    expect(calc('=MEDIAN(A1:A6)', data)).toBe(20)
    expect(calc('=MEDIAN(1, 2, 3, 4)')).toBe(2.5)
    expect(calc('=PRODUCT(A1, A2)', data)).toBe(200)
  })
})

describe('IF and logic', () => {
  it('IF chooses a value', () => {
    expect(calc('=IF(A1>100, "High", "Low")', { A1: '150' })).toBe('High')
    expect(calc('=IF(A1>100, "High", "Low")', { A1: '50' })).toBe('Low')
    expect(calc('=IF(A1>100, "High")', { A1: '50' })).toBe(false)
    expect(calc('=IF(A1, 1, 2)', { A1: '0' })).toBe(2)
    expect(calc('=IF(A1="Paid", 0, B1)', { A1: 'paid', B1: '75' })).toBe(0)
  })

  it('IF only calculates the branch it needs', () => {
    expect(calc('=IF(B1=0, 0, A1/B1)', { A1: '5' })).toBe(0)
  })

  it('IF reports a condition that is not TRUE/FALSE', () => {
    expect(errorCode(calc('=IF("maybe", 1, 2)'))).toBe('#VALUE!')
  })

  it('nested IF', () => {
    const formula = '=IF(A1>=90, "A", IF(A1>=75, "B", "C"))'
    expect(calc(formula, { A1: '95' })).toBe('A')
    expect(calc(formula, { A1: '80' })).toBe('B')
    expect(calc(formula, { A1: '10' })).toBe('C')
  })

  it('AND, OR, NOT', () => {
    expect(calc('=AND(A1>0, A2="Yes")', { A1: '5', A2: 'yes' })).toBe(true)
    expect(calc('=AND(A1>0, A2="Yes")', { A1: '5', A2: 'no' })).toBe(false)
    expect(calc('=OR(1>2, 2>1)')).toBe(true)
    expect(calc('=NOT(TRUE)')).toBe(false)
    expect(errorCode(calc('=AND(A1:A3)'))).toBe('#VALUE!')
  })

  it('IFERROR replaces errors only', () => {
    expect(calc('=IFERROR(1/0, "none")')).toBe('none')
    expect(calc('=IFERROR(4/2, "none")')).toBe(2)
  })
})

describe('VLOOKUP and other lookups', () => {
  const prices = {
    A1: 'Code',
    B1: 'Item',
    C1: 'Price',
    A2: 'P-100',
    B2: 'Printer paper',
    C2: '4.99',
    A3: 'P-200',
    B3: 'Stapler',
    C3: '12.50',
    A4: 'P-300',
    B4: 'Desk lamp',
    C4: '29.00',
  }

  it('finds an exact match', () => {
    expect(calc('=VLOOKUP("P-200", A2:C4, 3, FALSE)', prices)).toBe(12.5)
    expect(calc('=VLOOKUP("p-300", A2:C4, 2, FALSE)', prices)).toBe('Desk lamp')
    expect(calc('=VLOOKUP("P-100", A:C, 2, FALSE)', prices)).toBe('Printer paper')
  })

  it('looks up a value from another cell and another sheet', () => {
    const content = workbook(
      { A1: 'P-300', B1: '=VLOOKUP(A1, Prices!A:C, 3, FALSE)' },
      {
        Prices: prices,
      },
    )
    expect(calculateCell(content, 'B1')).toBe(29)
  })

  it('reports a value that is not found, with a helpful tip', () => {
    const exact = calc('=VLOOKUP("P-999", A2:C4, 3, FALSE)', prices)
    expect(errorCode(exact)).toBe('#N/A')
    expect(isError(exact) && exact.message).toContain('"P-999"')
    expect(calc('=IFERROR(VLOOKUP("P-999", A2:C4, 3, FALSE), "Unknown")', prices)).toBe(
      'Unknown',
    )
  })

  it('reports a column number outside the range', () => {
    expect(errorCode(calc('=VLOOKUP("P-200", A2:C4, 4, FALSE)', prices))).toBe('#REF!')
    expect(errorCode(calc('=VLOOKUP("P-200", A2:C4, 0, FALSE)', prices))).toBe('#VALUE!')
  })

  it('does not treat the number 100 and the text "100" as the same', () => {
    const cells = { A1: "'100", B1: 'text', A2: '100', B2: 'number' }
    expect(calc('=VLOOKUP(100, A1:B2, 2, FALSE)', cells)).toBe('number')
  })

  it('finds the nearest lower value in a sorted list (approximate match)', () => {
    // Discount bands: from 0 → 0%, from 500 → 5%, from 1000 → 10%
    const bands = { A1: '0', B1: '0', A2: '500', B2: '0.05', A3: '1000', B3: '0.1' }
    expect(calc('=VLOOKUP(750, A1:B3, 2)', bands)).toBe(0.05)
    expect(calc('=VLOOKUP(1000, A1:B3, 2, TRUE)', bands)).toBe(0.1)
    expect(calc('=VLOOKUP(5000, A1:B3, 2)', bands)).toBe(0.1)
    expect(errorCode(calc('=VLOOKUP(-1, A1:B3, 2)', bands))).toBe('#N/A')
  })

  it('supports wildcards in exact text lookups', () => {
    expect(calc('=VLOOKUP("Desk*", B2:C4, 2, FALSE)', prices)).toBe(29)
  })

  it('HLOOKUP, MATCH and INDEX', () => {
    const table = { A1: 'Q1', B1: 'Q2', C1: 'Q3', A2: '10', B2: '20', C2: '30' }
    expect(calc('=HLOOKUP("Q2", A1:C2, 2, FALSE)', table)).toBe(20)
    expect(calc('=MATCH("Q3", A1:C1, 0)', table)).toBe(3)
    expect(calc('=INDEX(A1:C2, 2, 3)', table)).toBe(30)
    expect(calc('=INDEX(A2:C2, 2)', table)).toBe(20)
    expect(calc('=INDEX(A2:C2, MATCH("Q3", A1:C1, 0))', table)).toBe(30)
    expect(errorCode(calc('=MATCH("Q9", A1:C1, 0)', table))).toBe('#N/A')
    expect(errorCode(calc('=INDEX(A1:C2, 5, 1)', table))).toBe('#REF!')
  })
})

describe('SUMIF, COUNTIF, AVERAGEIF', () => {
  const expenses = {
    A1: 'Travel',
    B1: '120',
    A2: 'Office',
    B2: '45',
    A3: 'travel',
    B3: '80',
    A4: 'Catering',
    B4: '300',
    A5: '',
    B5: '10',
  }

  it('match text without regard to case', () => {
    expect(calc('=SUMIF(A1:A5, "Travel", B1:B5)', expenses)).toBe(200)
    expect(calc('=COUNTIF(A1:A5, "travel")', expenses)).toBe(2)
    expect(calc('=AVERAGEIF(A1:A5, "Travel", B1:B5)', expenses)).toBe(100)
  })

  it('compare numbers', () => {
    expect(calc('=COUNTIF(B1:B5, ">100")', expenses)).toBe(2)
    expect(calc('=SUMIF(B1:B5, "<=80")', expenses)).toBe(135)
    expect(calc('=COUNTIF(B1:B5, 45)', expenses)).toBe(1)
    expect(calc('=COUNTIF(B1:B5, ">="&C1)', { ...expenses, C1: '120' })).toBe(2)
  })

  it('handle not-equal, empty and wildcard conditions', () => {
    expect(calc('=COUNTIF(A1:A5, "<>Travel")', expenses)).toBe(3)
    expect(calc('=COUNTIF(A1:A5, "")', expenses)).toBe(1)
    expect(calc('=COUNTIF(A1:A5, "C*")', expenses)).toBe(1)
    expect(calc('=COUNTIF(A1:A5, "?ffice")', expenses)).toBe(1)
  })

  it('AVERAGEIF with no matches', () => {
    expect(errorCode(calc('=AVERAGEIF(A1:A5, "Nothing", B1:B5)', expenses))).toBe(
      '#DIV/0!',
    )
  })
})

describe('rounding and maths', () => {
  it.each([
    ['=ROUND(2.345, 2)', 2.35],
    ['=ROUND(1.005, 2)', 1.01],
    ['=ROUND(-2.5, 0)', -3],
    ['=ROUND(1234.5)', 1235],
    ['=ROUND(1234, -2)', 1200],
    ['=ROUNDUP(2.01, 0)', 3],
    ['=ROUNDDOWN(2.99, 0)', 2],
    ['=ROUNDDOWN(-2.99, 1)', -2.9],
    ['=ABS(-4)', 4],
    ['=INT(-2.5)', -3],
    ['=MOD(10, 3)', 1],
    ['=MOD(-1, 3)', 2],
    ['=SQRT(16)', 4],
  ])('%s = %d', (formula, expected) => {
    expect(calc(formula)).toBeCloseTo(expected, 10)
  })

  it('reports invalid maths', () => {
    expect(errorCode(calc('=SQRT(-1)'))).toBe('#NUM!')
    expect(errorCode(calc('=MOD(1, 0)'))).toBe('#DIV/0!')
    expect(errorCode(calc('=10^400'))).toBe('#NUM!')
  })
})

describe('text functions', () => {
  it.each([
    ['=CONCATENATE("Invoice ", A1)', 'Invoice 1042'],
    ['=CONCAT(A1:A2)', '1042North'],
    ['=LEN(A2)', 5],
    ['=UPPER(A2)', 'NORTH'],
    ['=LOWER(A2)', 'north'],
    ['=PROPER("jane o\'neil-smith")', "Jane O'Neil-Smith"],
    ['=TRIM("  too   many  spaces ")', 'too many spaces'],
    ['=LEFT(A2, 2)', 'No'],
    ['=LEFT(A2)', 'N'],
    ['=RIGHT(A2, 3)', 'rth'],
    ['=MID("INV-2024-001", 5, 4)', '2024'],
  ])('%s', (formula, expected) => {
    expect(calc(formula, { A1: '1042', A2: 'North' })).toBe(expected)
  })
})

describe('copying formulas moves their references', () => {
  it.each([
    ['=B2*C2', 1, 0, '=B3*C3'],
    ['=B2*C2', 0, 1, '=C2*D2'],
    ['=$B$2*C2', 3, 2, '=$B$2*E5'],
    ['=B$2+$C3', 1, 1, '=C$2+$C4'],
    ['=SUM(B2:B10)', 0, 1, '=SUM(C2:C10)'],
    ['=SUM(A:A)', 5, 1, '=SUM(B:B)'],
    [
      '=VLOOKUP(A2, Prices!$A:$C, 3, FALSE)',
      1,
      0,
      '=VLOOKUP(A3, Prices!$A:$C, 3, FALSE)',
    ],
    ["='My sheet'!A1", 1, 0, "='My sheet'!A2"],
    ['=A1+"A1"', 1, 0, '=A2+"A1"'], // text in quotes is not a reference
    ['=LOG10(A1)', 1, 0, '=LOG10(A2)'],
  ])('%s moved by (%i, %i) is %s', (formula, rows, columns, expected) => {
    expect(shiftFormula(formula, rows, columns)).toBe(expected)
  })

  it('turns references that fall off the sheet into #REF!', () => {
    expect(shiftFormula('=A1+B2', -1, 0)).toBe('=#REF!+B1')
    expect(errorCode(calc(shiftFormula('=A1+B2', -1, 0)))).toBe('#REF!')
  })

  it('leaves non-formulas and unreadable formulas unchanged', () => {
    expect(shiftFormula('A1', 1, 1)).toBe('A1')
    expect(shiftFormula('="A1', 1, 1)).toBe('="A1')
  })
})

describe('renaming a sheet', () => {
  it('updates formulas that refer to it', () => {
    expect(renameSheetInFormula('=Sheet2!A1+sheet2!B1+A1', 'Sheet2', 'Prices')).toBe(
      '=Prices!A1+Prices!B1+A1',
    )
    expect(renameSheetInFormula('=SUM(Sheet2!A:A)', 'Sheet2', 'Price list')).toBe(
      "=SUM('Price list'!A:A)",
    )
    expect(renameSheetInFormula("='Old name'!A1", 'Old name', 'New')).toBe('=New!A1')
    expect(renameSheetInFormula('=Other!A1', 'Sheet2', 'Prices')).toBe('=Other!A1')
  })

  it('quotes names that need it', () => {
    expect(sheetPrefix('Prices')).toBe('Prices!')
    expect(sheetPrefix('Q1 data')).toBe("'Q1 data'!")
    expect(sheetPrefix('AB12')).toBe("'AB12'!") // would look like a cell
  })
})

describe('finding references for highlighting', () => {
  it('lists each reference with its position', () => {
    expect(findReferences('=SUM(B2:B5)*Rates!C1')).toEqual([
      { start: 5, end: 10, sheet: undefined, text: 'B2:B5' },
      { start: 12, end: 20, sheet: 'Rates', text: 'C1' },
    ])
    expect(findReferences('plain text')).toEqual([])
  })
})

describe('function library', () => {
  it('every function has complete help text', () => {
    for (const definition of FUNCTIONS.values()) {
      expect(definition.syntax.startsWith(`${definition.name}(`)).toBe(true)
      expect(definition.description.length).toBeGreaterThan(10)
      expect(definition.example.startsWith(`=${definition.name}(`)).toBe(true)
      expect(Boolean(definition.evaluate) !== Boolean(definition.evaluateLazy)).toBe(true)
    }
  })

  it('every example formula can be read', () => {
    for (const definition of FUNCTIONS.values()) {
      expect(() => parseFormula(definition.example)).not.toThrow()
    }
  })

  it('includes the functions every office worker needs', () => {
    for (const name of ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'IF', 'VLOOKUP']) {
      expect(FUNCTIONS.has(name)).toBe(true)
    }
  })

  it('parse errors are reported as FormulaParseError', () => {
    expect(() => parseFormula('=(')).toThrow(FormulaParseError)
  })
})
