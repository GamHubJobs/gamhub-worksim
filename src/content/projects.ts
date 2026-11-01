/**
 * Integrated projects: a short series of linked tasks (stages) under one
 * brief, at the top level of a career. Each stage is an ordinary task (its
 * own tools, checks and hand-in); the project is complete when every stage
 * has passed, and then becomes one portfolio item that links to the stages.
 */
import { z } from 'zod'

export const ProjectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  careerId: z.string(),
  levelId: z.string(),
  title: z.string().min(1),
  /** The overall situation, in a few sentences. */
  brief: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  /** What will be handed in, in plain words. */
  deliverables: z.array(z.string().min(1)).min(1),
  /** How the project is judged, in plain words. */
  assessment: z.array(z.string().min(1)).min(1),
  /** The stage tasks' IDs, in order. */
  stages: z.array(z.string()).min(2).max(5),
})

export type Project = z.infer<typeof ProjectSchema>

const SOURCES: Project[] = [
  {
    id: 'quarter-close',
    careerId: 'accounting',
    levelId: 'senior-accountant',
    title: 'Close the quarter for the board',
    brief:
      'Run the Q1 close from start to finish: post the quarter-end adjustments in Books, analyse the quarter against budget in Sheets, and prepare the board pack with the key figures and a written report.',
    objectives: [
      'Complete the books for the quarter with accruals and income earned',
      'Find the material variances against budget',
      'Report the quarter to the board with consistent figures',
    ],
    deliverables: [
      'The adjusted books (Books)',
      'The variance analysis (Sheets)',
      'The board pack: key figures (Sheets) and the board report (Docs)',
    ],
    assessment: [
      'Each stage is checked like a task and must pass',
      'The project score is the average of the three stages',
    ],
    stages: [
      'quarter-close-adjustments',
      'quarter-close-variances',
      'quarter-close-board-pack',
    ],
  },
  {
    id: 'churn-investigation',
    careerId: 'data-analytics',
    levelId: 'lead-data-analyst',
    title: 'Why are customers leaving?',
    brief:
      'Investigate subscription churn from the raw billing export to a recommendation: clean the data and measure churn by plan in Data Studio, build a churn dashboard with the revenue lost, then report the findings with the figures by plan and a memo.',
    objectives: [
      'Measure churn correctly from messy data',
      'Show churn and its cost on a dashboard',
      'Explain which customers to act on first, and why',
    ],
    deliverables: [
      'The cleaned data and churn query (Data Studio)',
      'The churn dashboard (Data Studio)',
      'The figures by plan (Sheets) and the findings memo (Docs)',
    ],
    assessment: [
      'Each stage is checked like a task and must pass',
      'The project score is the average of the three stages',
    ],
    stages: ['churn-clean', 'churn-dashboard', 'churn-findings'],
  },
]

export const PROJECTS: Project[] = SOURCES.map((p) => ProjectSchema.parse(p))

export function getProject(id: string | undefined): Project | undefined {
  return id ? PROJECTS.find((p) => p.id === id) : undefined
}
