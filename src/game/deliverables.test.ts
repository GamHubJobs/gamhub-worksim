import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { addChart } from '../apps/sheets/features'
import { parseRange } from '../apps/sheets/model'
import { bullets, docContent, h, p } from '../apps/docs/templates'
import { createSlide } from '../apps/slides/model'
import type { ChartSpec, SlidesContent } from '../persistence/schemas'
import { createId } from '../lib/ids'
import { buildDeliverableContent, mentionsNumber, numbersIn } from './deliverables'
import { gradeAssignment } from './grading'
import { buildSolutionContent, findSheet } from './workbooks'

const assignment = getAssignment('performance-report')!

const chart: ChartSpec = {
  type: 'column',
  title: 'Budget vs actual',
  labels: ['Sales'],
  series: [{ name: 'Actual', values: [51240] }],
}

/** The model workbook, with its chart. */
function solvedWorkbook() {
  const solution = buildSolutionContent(assignment)
  const sheet = findSheet(solution, 'Departments')!
  return addChart(solution, sheet.id, parseRange('A1:C7')!, 'column', 'Budget vs actual')
    .content
}

function goodReport() {
  const words = 'The figures below come from the accounts system for October. '.repeat(12)
  const content = docContent([
    h(1, 'October performance report'),
    h(2, 'Executive summary'),
    p(
      'Total spending was $227,300 against a total budget of $227,000, so the company was just $300 over budget.',
    ),
    h(2, 'Findings'),
    bullets([
      'Sales overspent by $3,240.',
      'Operations was also over budget.',
      'Marketing, IT, HR and Finance were within budget.',
    ]),
    { type: 'chart', attrs: { spec: chart } },
    p(words),
    h(2, 'Recommendations'),
    p('Review the Sales and Operations budgets for November.'),
  ])
  return content
}

function goodSlides(): SlidesContent {
  const chartSlide = createSlide('title-only', ['Budget vs actual'])
  chartSlide.elements.push({
    id: createId(),
    type: 'chart',
    chart,
    x: 100,
    y: 120,
    w: 640,
    h: 360,
  })
  return {
    theme: 'corporate',
    slides: [
      createSlide('title', ['October performance', 'Finance']),
      createSlide('title-content', [
        'Key figures',
        'Total spending: $227.3k\nSales: $3,240 over budget',
      ]),
      chartSlide,
      createSlide('title-content', ['Next steps', 'Review budgets']),
    ],
  }
}

describe('reading numbers in reports', () => {
  it('understands thousands separators, decimals, k and %', () => {
    expect(numbersIn('$227,300.50 and 3.2k and 98% and 1.5 million')).toEqual([
      { value: 227300.5, percent: false },
      { value: 3200, percent: false },
      { value: 98, percent: true },
      { value: 1_500_000, percent: false },
    ])
  })

  it('accepts sensible rounding, and ignores the sign', () => {
    expect(mentionsNumber('Spending was $227.3k', 227300, false)).toBe(true)
    expect(mentionsNumber('about $227,000', 227300, false)).toBe(true)
    expect(mentionsNumber('about $200,000', 227300, false)).toBe(false)
    expect(mentionsNumber('IT underspent by 2,080', -2080, false)).toBe(true)
    expect(mentionsNumber('we used 100% of the budget', 1.0013, true)).toBe(true)
  })
})

describe('grading reports and presentations', () => {
  it('starts the files from their templates', () => {
    const report = buildDeliverableContent(assignment.deliverables[0], 'Alex')
    expect('body' in report).toBe(true)
    const slides = buildDeliverableContent(assignment.deliverables[1], 'Alex')
    expect('slides' in slides).toBe(true)
  })

  it('gives full marks to a correct analysis, report and presentation', () => {
    const result = gradeAssignment(assignment, solvedWorkbook(), {
      doc: goodReport(),
      slides: goodSlides(),
    })
    expect(result.checks.filter((c) => c.status !== 'passed')).toEqual([])
    expect(result.score).toBe(100)
  })

  it('explains what is missing from a vague report', () => {
    const vague = docContent([
      h(1, 'Report'),
      h(2, 'Summary'),
      p('Spending was roughly on budget this month. Some departments overspent.'),
    ])
    const result = gradeAssignment(assignment, solvedWorkbook(), {
      doc: vague,
      slides: goodSlides(),
    })
    const byId = (id: string) => result.checks.find((c) => c.id === id)!
    expect(byId('report-sections').status).toBe('partial')
    expect(byId('report-sections').problems).toContain(
      'There is no heading for “Findings”.',
    )
    expect(byId('report-figures').status).toBe('failed')
    expect(byId('report-figures').problems[0]).toBe(
      'The report does not give the total budget (227,000).',
    )
    expect(byId('report-mentions').problems).toContain(
      'The report does not mention Sales.',
    )
    expect(byId('report-chart').problems).toEqual(['The report has no chart.'])
    expect(byId('report-length').status).not.toBe('passed')
    expect(result.passed).toBe(false)
  })

  it('scores nothing for files that were not attached', () => {
    const result = gradeAssignment(assignment, null, { doc: goodReport() })
    expect(result.checks.find((c) => c.id === 'variance')!.problems).toEqual([
      'The workbook was not attached. Attach it to your email to Priya.',
    ])
    expect(result.checks.find((c) => c.id === 'slides-chart')!.problems[0]).toContain(
      'No presentation was attached',
    )
    expect(result.checks.find((c) => c.id === 'report-figures')!.status).toBe('passed')
  })
})
