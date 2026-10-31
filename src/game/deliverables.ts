/**
 * Reports and presentations handed in with a task: creating them from their
 * templates, and grading them the way a manager reads them: are the expected
 * sections there, are the key figures right, are the important facts
 * mentioned, is there a chart or a table, and is it the right length.
 *
 * Figures are compared with the model answer of the task's workbook, so a
 * report built on a wrong analysis is caught. Any sensible formatting and
 * rounding counts: "$34,563.20", "34,563", "$34.6k" and "about $35k" can all
 * match 34,563.20 (within about 1.5%).
 */
import { findNodes, outline, plainText, countWords } from '../apps/docs/text'
import { getDocTemplate } from '../apps/docs/templates'
import { getSlidesTemplate, slideText } from '../apps/slides/model'
import type { WorkbookCalculator } from '../apps/sheets/engine/workbook'
import { isError, type CellValue } from '../apps/sheets/engine/values'
import { fill } from '../content/departments'
import type { Deliverable, FileCheck } from '../content/schemas'
import type { DocContent, SlidesContent } from '../persistence/schemas'
import type { CheckResult, CheckStatus } from './grading'
import { findSheet } from './workbooks'

export interface SubmittedFiles {
  doc?: DocContent | null
  slides?: SlidesContent | null
}

const KIND_NAMES = { doc: 'report', slides: 'presentation' } as const

/** The starting content of a deliverable, from its template. */
export function buildDeliverableContent(deliverable: Deliverable, author: string) {
  return deliverable.kind === 'doc'
    ? getDocTemplate(deliverable.template).build(author)
    : getSlidesTemplate(deliverable.template).build(author)
}

/** The file to create for a deliverable when its task starts. */
export function deliverableFile(
  deliverable: Deliverable,
  author: string,
):
  | { kind: 'doc'; title: string; content: DocContent }
  | { kind: 'slides'; title: string; content: SlidesContent } {
  return deliverable.kind === 'doc'
    ? {
        kind: 'doc',
        title: deliverable.title,
        content: getDocTemplate(deliverable.template).build(author),
      }
    : {
        kind: 'slides',
        title: deliverable.title,
        content: getSlidesTemplate(deliverable.template).build(author),
      }
}

// ---------------------------------------------------------------------------
// Reading a file
// ---------------------------------------------------------------------------

interface FileView {
  text: string
  /** Report headings or slide titles. */
  headings: string[]
  charts: number
  tables: number
  /** Words (report) or slides (presentation). */
  length: number
}

function viewDoc(doc: DocContent): FileView {
  return {
    text: plainText(doc.body),
    headings: outline(doc.body).map((h) => h.text),
    charts: findNodes(doc.body, 'chart').length,
    tables: findNodes(doc.body, 'table').length,
    length: countWords(doc.body),
  }
}

function viewSlides(slides: SlidesContent): FileView {
  return {
    text: slides.slides.map(slideText).join('\n'),
    headings: slides.slides.flatMap((slide) =>
      slide.elements.flatMap((e) =>
        e.type === 'text' && e.role === 'title' ? [e.text] : [],
      ),
    ),
    charts: slides.slides.reduce(
      (sum, slide) => sum + slide.elements.filter((e) => e.type === 'chart').length,
      0,
    ),
    tables: 0,
    length: slides.slides.length,
  }
}

// ---------------------------------------------------------------------------
// Numbers in text
// ---------------------------------------------------------------------------

/** Every number written in a text, with "k"/"m" and "%" understood. */
export function numbersIn(text: string): Array<{ value: number; percent: boolean }> {
  const found: Array<{ value: number; percent: boolean }> = []
  const pattern =
    /(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(%|k\b|K\b|m\b|M\b|million\b|thousand\b)?/g
  for (const match of text.matchAll(pattern)) {
    let value = Number(match[1].replace(/,/g, '') + (match[2] ?? ''))
    const suffix = match[3]?.toLowerCase()
    if (suffix === 'k' || suffix === 'thousand') value *= 1000
    if (suffix === 'm' || suffix === 'million') value *= 1_000_000
    if (Number.isFinite(value)) found.push({ value, percent: suffix === '%' })
  }
  return found
}

/** Whether a text states a figure (signs are ignored: "overspent by $66"). */
export function mentionsNumber(
  text: string,
  expected: number,
  percent: boolean,
): boolean {
  const target = Math.abs(percent ? expected * 100 : expected)
  return numbersIn(text).some(({ value }) => {
    const tolerance = percent ? 1 : Math.max(0.5, target * 0.015)
    return Math.abs(value - target) <= tolerance
  })
}

export function describeNumber(value: number, percent: boolean): string {
  if (percent) return `${Math.round(value * 100)}%`
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function containsTerm(text: string, term: string): boolean {
  return text.toLowerCase().includes(term.toLowerCase())
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

function result(check: FileCheck, fraction: number, problems: string[]): CheckResult {
  const earned = Math.round(check.points * Math.max(0, Math.min(1, fraction)))
  const status: CheckStatus =
    earned === check.points ? 'passed' : earned === 0 ? 'failed' : 'partial'
  return {
    id: check.id,
    title: check.title,
    why: check.why,
    hint: check.hint,
    status,
    earned,
    points: check.points,
    problems: status === 'passed' ? [] : problems.slice(0, 5),
  }
}

function gradeFileCheck(
  check: FileCheck,
  kind: Deliverable['kind'],
  file: FileView,
  solution: {
    calculator: WorkbookCalculator
    sheetIdOf: (name: string) => string | null
  },
): CheckResult {
  const name = KIND_NAMES[kind]
  switch (check.type) {
    case 'sections': {
      const missing = check.sections.filter(
        (alternatives) =>
          !file.headings.some((heading) =>
            alternatives.some((a) => containsTerm(heading, a)),
          ),
      )
      return result(
        check,
        1 - missing.length / check.sections.length,
        missing.map((alternatives) =>
          kind === 'doc'
            ? `There is no heading for “${alternatives[0]}”.`
            : `No slide is titled “${alternatives[0]}”.`,
        ),
      )
    }
    case 'figures': {
      const problems: string[] = []
      let found = 0
      for (const figure of check.figures) {
        let value: CellValue = figure.value ?? null
        if (figure.cell) {
          const [sheetName, address] = figure.cell.split('!')
          const sheetId = solution.sheetIdOf(sheetName)
          value = sheetId ? solution.calculator.getValue(sheetId, address) : null
        }
        if (typeof value !== 'number' || isError(value)) continue
        if (mentionsNumber(file.text, value, figure.percent)) found++
        else
          problems.push(
            `The ${name} does not give the ${figure.label} (${describeNumber(value, figure.percent)}).`,
          )
      }
      return result(check, found / check.figures.length, problems)
    }
    case 'mentions': {
      const missing = check.terms.filter(
        (alternatives) => !alternatives.some((term) => containsTerm(file.text, term)),
      )
      return result(
        check,
        1 - missing.length / check.terms.length,
        missing.map((alternatives) => `The ${name} does not mention ${alternatives[0]}.`),
      )
    }
    case 'charts':
      return result(check, file.charts >= check.min ? 1 : file.charts / check.min, [
        file.charts === 0
          ? `The ${name} has no chart.`
          : `The ${name} has ${file.charts} chart${file.charts === 1 ? '' : 's'}; ${check.min} are needed.`,
      ])
    case 'table':
      return result(check, file.tables > 0 ? 1 : 0, [`The ${name} has no table.`])
    case 'length': {
      const unit = kind === 'doc' ? 'words' : 'slides'
      const tooShort = file.length < check.min
      const tooLong = check.max !== undefined && file.length > check.max
      const fraction = tooShort
        ? file.length / check.min
        : tooLong
          ? Math.max(0, 1 - (file.length - check.max!) / check.max!)
          : 1
      return result(check, fraction, [
        tooShort
          ? `The ${name} has ${file.length} ${unit}; at least ${check.min} are expected.`
          : `The ${name} has ${file.length} ${unit}; keep it to ${check.max} or fewer.`,
      ])
    }
  }
}

/** Grades the report and presentation of a task (missing files score nothing). */
export function gradeDeliverables(
  deliverables: Deliverable[],
  files: SubmittedFiles,
  solution: { calculator: WorkbookCalculator; content: Parameters<typeof findSheet>[0] },
): CheckResult[] {
  const sheetIdOf = (name: string) => findSheet(solution.content, name)?.id ?? null
  return deliverables.flatMap((deliverable) => {
    const content = files[deliverable.kind]
    if (!content) {
      return deliverable.checks.map((check) =>
        result(check, 0, [
          fill(
            `No ${KIND_NAMES[deliverable.kind]} was attached. Attach it to your email to {manager}.`,
          ),
        ]),
      )
    }
    const view =
      deliverable.kind === 'doc'
        ? viewDoc(content as DocContent)
        : viewSlides(content as SlidesContent)
    return deliverable.checks.map((check) =>
      gradeFileCheck(check, deliverable.kind, view, {
        calculator: solution.calculator,
        sheetIdOf,
      }),
    )
  })
}
