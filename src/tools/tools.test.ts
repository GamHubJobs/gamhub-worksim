import { describe, expect, it } from 'vitest'
import { ASSIGNMENTS } from '../content/assignments'
import { CAREERS } from '../content/careers'
import { gradeAssignment } from '../game/grading'
import { gradeToolTask, toolTaskContent } from './grading'
import { allTools, careerTools, getTool } from './registry'
import { getWorkspace } from './ui'

describe('the professional tools', () => {
  it.each(allTools().map((t) => [t.id, t] as const))('%s is complete', (_, tool) => {
    expect(tool.state.safeParse(tool.practice()).success).toBe(true)
    expect(tool.sections.length).toBeGreaterThan(0)
    expect(tool.guide.topics.length).toBeGreaterThan(0)
    expect(tool.guide.glossary.length).toBeGreaterThan(0)
    expect(getWorkspace(tool.id)).toBeDefined()
    expect(tool.summary(tool.practice())).not.toBe('')
  })

  it('careers only list tools, levels and sections that exist', () => {
    for (const career of CAREERS) {
      const levels = career.levels.map((l) => l.id)
      for (const entry of career.tools ?? []) {
        const tool = getTool(entry.tool)
        expect(tool, `${career.id}: ${entry.tool}`).toBeDefined()
        if (entry.fromLevel) expect(levels).toContain(entry.fromLevel)
        for (const [section, level] of Object.entries(entry.sections ?? {})) {
          expect(tool?.sections.map((s) => s.id)).toContain(section)
          expect(levels).toContain(level)
        }
      }
    }
  })

  it('unlocks tools and sections with promotions', () => {
    const career = {
      ...CAREERS[0],
      levels: [
        { id: 'one', title: 'One', xpRequired: 0, minReputation: 0 },
        { id: 'two', title: 'Two', xpRequired: 10, minReputation: 0 },
      ],
      tools: [{ tool: 'books', fromLevel: 'two', sections: { reports: 'two' } }],
    }
    const [atStart] = careerTools(career, 'one')
    expect(atStart.unlocked).toBe(false)
    expect(atStart.unlocksAt).toBe('Two')
    expect(atStart.lockedSections).toEqual({ reports: 'Two' })
    const [promoted] = careerTools(career, 'two')
    expect(promoted.unlocked).toBe(true)
    expect(promoted.lockedSections).toEqual({})
  })
})

const toolTasks = ASSIGNMENTS.filter((a) => a.kind === 'tool')

describe.each(toolTasks.map((a) => [a.id, a] as const))('tool task %s', (_, task) => {
  const content = toolTaskContent(task)!

  it('is done in a tool its career has by then', () => {
    const career = CAREERS.find((c) => c.id === task.careerId)!
    const entry = career.tools?.find((t) => t.tool === task.tool?.id)
    expect(entry, 'the career does not list this tool').toBeDefined()
    const level = (id?: string) => career.levels.findIndex((l) => l.id === id)
    expect(level(entry?.fromLevel ?? career.levels[0].id)).toBeLessThanOrEqual(
      level(task.levelId),
    )
  })

  it('gives the model answer full marks', () => {
    const checks = gradeToolTask(task, content.solution)
    expect(checks.filter((c) => c.status !== 'passed')).toEqual([])
  })

  it('cannot be passed without doing the work', () => {
    const grade = gradeAssignment(task, null, {}, gradeToolTask(task, content.start))
    expect(grade.passed).toBe(false)
  })

  it('scores nothing when the file is missing or belongs to another tool', () => {
    const missing = gradeToolTask(task, null)
    expect(missing.every((c) => c.earned === 0)).toBe(true)
    const wrong = gradeToolTask(task, { tool: 'other', state: {} })
    expect(wrong.every((c) => c.earned === 0)).toBe(true)
  })
})
