import initSqlJs from 'sql.js'
import { describe, expect, it } from 'vitest'
import { subscriptionsRaw } from '../tools/datastudio/data'
import type { Dataset } from '../tools/datastudio/schema'
import { runSqlWith, sameResult } from '../tools/datastudio/sql'
import { cleanTable } from '../tools/datastudio/transform'
import { addChart } from '../apps/sheets/features'
import { parseRange } from '../apps/sheets/model'
import { bullets, docContent, h, p } from '../apps/docs/templates'
import { gradeAssignment } from '../game/grading'
import { buildSolutionContent, findSheet } from '../game/workbooks'
import type { DocContent } from '../persistence/schemas'
import { ASSIGNMENTS, getAssignment } from './assignments'
import { CAREERS } from './careers'
import { PROJECTS } from './projects'

describe.each(PROJECTS.map((p) => [p.id, p] as const))('project %s', (_, project) => {
  const stages = project.stages.map((id) => getAssignment(id))

  it('its stages are tasks of the same career and level, numbered in order', () => {
    expect(CAREERS.some((c) => c.id === project.careerId)).toBe(true)
    stages.forEach((stage, i) => {
      expect(stage, project.stages[i]).toBeDefined()
      expect(stage!.careerId).toBe(project.careerId)
      expect(stage!.levelId).toBe(project.levelId)
      expect(stage!.projectId).toBe(project.id)
      expect(stage!.stage).toBe(i + 1)
    })
    // Consecutive in the career path, so each stage opens the next.
    const orders = stages.map((s) => s!.order)
    expect(orders).toEqual(orders.map((_, i) => orders[0] + i))
  })

  it('every task that says it belongs to the project is one of its stages', () => {
    const claimed = ASSIGNMENTS.filter((a) => a.projectId === project.id).map((a) => a.id)
    expect(claimed.sort()).toEqual([...project.stages].sort())
  })

  it('is at the top of its career', () => {
    const career = CAREERS.find((c) => c.id === project.careerId)!
    const index = career.levels.findIndex((l) => l.id === project.levelId)
    expect(index).toBeGreaterThanOrEqual(career.levels.length - 2)
  })
})

describe('project stages with written reports', () => {
  /** A report with every figure and term the checks look for. */
  function report(title: string, paragraphs: string[]): DocContent {
    const filler =
      'The figures come from the closed books and the approved budget. '.repeat(14)
    return docContent([
      h(1, title),
      h(2, 'Executive summary'),
      p(paragraphs[0]),
      h(2, 'Findings'),
      bullets(paragraphs.slice(1)),
      p(filler),
      h(2, 'Recommendations'),
      p('Watch professional fees and subcontractor costs closely in Q2.'),
    ])
  }

  it('the quarter-close board pack gets full marks for a correct pack', () => {
    const task = getAssignment('quarter-close-board-pack')!
    const solution = buildSolutionContent(task)
    const sheet = findSheet(solution, 'Quarter')!
    const workbook = addChart(
      solution,
      sheet.id,
      parseRange('A1:D3')!,
      'column',
      'Q1',
    ).content
    const result = gradeAssignment(task, workbook, {
      doc: report('Q1 board report', [
        'Q1 income was £84,050 and net profit was £11,284.',
        'Professional fees were £2,850 over budget, mostly the audit fee accrual.',
        'Training income, subcontractor costs, utilities and travel were also flagged.',
      ]),
    })
    expect(result.checks.filter((c) => c.status !== 'passed')).toEqual([])
    expect(result.score).toBe(100)
  })
})

describe('the churn investigation', () => {
  /** The solution file of a Data Studio stage. */
  const stageState = (id: string) =>
    getAssignment(id)!.tool!.solution as {
      datasets: Dataset[]
      queries: Array<{ sql: string; result: { rows: unknown[][] } }>
    }

  it('the data has the story the stages rely on', () => {
    const { datasets } = stageState('churn-clean')
    const { table, errors } = cleanTable(datasets[0])
    expect(errors).toEqual([])
    expect(table.rows).toHaveLength(63)
    const raw = subscriptionsRaw()
    expect(raw.rows.length).toBe(66) // two duplicates and a test row
  })

  it('every saved query’s SQL really gives the expected result', async () => {
    const SQL = await initSqlJs()
    for (const id of ['churn-clean', 'churn-dashboard']) {
      const state = stageState(id)
      const tables = state.datasets.map((d) => ({
        name: d.name,
        table: cleanTable(d).table,
      }))
      for (const query of state.queries) {
        const result = runSqlWith(SQL, tables, query.sql)
        expect(
          sameResult(result, query.result.rows as never, {
            ordered: false,
            tolerance: 0.01,
          }),
          query.sql,
        ).toBe(true)
      }
    }
    expect(stageState('churn-clean').queries[0].result.rows).toEqual([
      ['Basic', 21, 7, 33.3],
      ['Standard', 21, 5, 23.8],
      ['Premium', 21, 3, 14.3],
    ])
  })

  it('the findings memo gets full marks for correct figures and the two plans', () => {
    const task = getAssignment('churn-findings')!
    const solution = buildSolutionContent(task)
    const sheet = findSheet(solution, 'Plans')!
    const workbook = addChart(
      solution,
      sheet.id,
      parseRange('A1:F4')!,
      'column',
      'Plans',
    ).content
    const filler =
      'These figures come from the cleaned billing export for last year. '.repeat(10)
    const result = gradeAssignment(task, workbook, {
      doc: docContent([
        h(1, 'Churn findings'),
        h(2, 'Executive summary'),
        p(
          'Overall churn is 23.8% and cancelled customers represent £565 of monthly revenue.',
        ),
        h(2, 'Findings'),
        bullets([
          'Basic has the highest churn rate, at 33.3%.',
          'Premium loses the most revenue: £237 a month, despite the lowest churn rate.',
        ]),
        p(filler),
        h(2, 'Recommendations'),
        p('Focus retention offers on Premium customers first.'),
      ]),
    })
    expect(result.checks.filter((c) => c.status !== 'passed')).toEqual([])
    expect(result.score).toBe(100)
  })
})
