/**
 * The professional-tools framework. A tool is a separate app on the WorkSim
 * desktop (accounting software, a network console, a SQL studio…) that a
 * career registers in its `tools` list. The tool brings everything else:
 *
 * - its saved state (validated by its own schema; stored as a `tool` document,
 *   so autosave, versions, backups and restore work automatically),
 * - sections that can unlock as the player is promoted,
 * - practice data, a beginner's guide and a glossary,
 * - the checks tasks can use, and a pure grader for them.
 *
 * This file and each tool's model and grading are pure TypeScript. The
 * tools' screens are loaded separately (see `ui.tsx`) only when opened.
 */
import type { z } from 'zod'
import type { CheckResult } from '../game/grading'
import type { IconName } from '../ui/Icon'

export interface ToolSection {
  id: string
  name: string
  /** One line about what the section is for. */
  description: string
}

export interface ToolGuide {
  /** What the tool is and why professionals use it. */
  intro: string
  /** How to do the common jobs, step by step. */
  topics: Array<{ title: string; body: string }>
  glossary: Array<{ term: string; meaning: string }>
}

export interface ToolDefinition<State = unknown, Check = unknown> {
  id: string
  /** Original WorkSim name shown on the dock, e.g. "Books". */
  name: string
  /** What kind of software it is, e.g. "Accounting software". */
  category: string
  icon: IconName
  sections: ToolSection[]
  /** The saved state of a file in this tool. */
  state: z.ZodType<State>
  /** Starting state of the practice workspace: realistic sample data. */
  practice: () => State
  /** One line for file lists, e.g. "12 journals posted". */
  summary: (state: State) => string
  /** The checks a task can use on this tool's work. */
  check: z.ZodType<Check>
  /**
   * Grades a task's checks. `solution` is the task's model answer, so checks
   * can compare the player's results with it (as Sheets checks do).
   */
  grade: (
    checks: Check[],
    player: State | null,
    context: { start: State; solution: State },
  ) => CheckResult[]
  guide: ToolGuide
}

/** Any registered tool. */
// oxlint-disable-next-line no-explicit-any -- each tool has its own state and checks
export type AnyTool = ToolDefinition<any, any>

/** How a career gets a tool: from which level, and when each section unlocks. */
export interface CareerTool {
  tool: string
  /** The level from which the tool is on the dock (the first level if absent). */
  fromLevel?: string
  /** Sections that unlock later: section ID → level ID. */
  sections?: Record<string, string>
}
