/**
 * Help while typing a formula: which function the player is inside (to show
 * how to use it) and which function names match what they have typed so far.
 */
import { FUNCTIONS, FUNCTION_NAMES, type FunctionDefinition } from './functions'

export interface ActiveFunction {
  definition: FunctionDefinition
  /** Which value (0-based) the player is typing, to highlight it in the syntax. */
  argumentIndex: number
}

/** The innermost function call that is still open at the end of `text`. */
export function findActiveFunction(text: string): ActiveFunction | null {
  if (!text.startsWith('=')) return null
  const stack: Array<{ name: string; argumentIndex: number }> = []
  let inString = false
  let word = ''
  for (let i = 1; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      word = ''
    } else if (/[A-Za-z0-9_.]/.test(char)) {
      word += char
    } else {
      if (char === '(') stack.push({ name: word.toUpperCase(), argumentIndex: 0 })
      else if (char === ')') stack.pop()
      else if (char === ',' && stack.length > 0) stack[stack.length - 1].argumentIndex++
      word = ''
    }
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    const definition = FUNCTIONS.get(stack[i].name)
    if (definition) return { definition, argumentIndex: stack[i].argumentIndex }
  }
  return null
}

/**
 * The functions people use most are suggested first, so that "=SU" offers SUM
 * before SUBSTITUTE. Everything else follows in alphabetical order.
 */
const COMMON = ['SUM', 'AVERAGE', 'COUNT', 'IF', 'VLOOKUP', 'ROUND', 'MIN', 'MAX']

function rank(name: string): number {
  const index = COMMON.indexOf(name)
  return index === -1 ? COMMON.length : index
}

/**
 * The function names that start with the word being typed at the end of a
 * formula, e.g. "=SUM(A1:A3)+AV" → AVERAGE, AVERAGEIF.
 */
export function suggestFunctions(
  text: string,
): { prefix: string; names: string[] } | null {
  if (!text.startsWith('=')) return null
  const match = /(^|[=(,+\-*/^&<> ])([A-Za-z][A-Za-z0-9.]*)$/.exec(text)
  if (!match) return null
  const prefix = match[2].toUpperCase()
  const names = FUNCTION_NAMES.filter(
    (name) => name.startsWith(prefix) && name !== prefix,
  ).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  return names.length > 0 ? { prefix: match[2], names: names.slice(0, 6) } : null
}

/** Replaces the partly typed function name at the end of `text` with "NAME(". */
export function acceptSuggestion(text: string, prefix: string, name: string): string {
  return `${text.slice(0, text.length - prefix.length)}${name}(`
}

/** Splits a syntax line such as "SUM(value1, [value2, ...])" into its values. */
export function syntaxParts(syntax: string): { name: string; args: string[] } {
  const open = syntax.indexOf('(')
  const inner = syntax.slice(open + 1, -1)
  const args: string[] = []
  let depth = 0
  let current = ''
  for (const char of inner) {
    if (char === '[') depth++
    if (char === ']') depth--
    if (char === ',' && depth === 0) {
      args.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) args.push(current.trim())
  return { name: syntax.slice(0, open), args }
}
