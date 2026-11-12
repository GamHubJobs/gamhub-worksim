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
  /** The stages' IDs, in order: tasks, or cases for organisation-wide programmes. */
  stages: z.array(z.string()).min(2).max(5),
  stageType: z.enum(['tasks', 'cases']).default('tasks'),
})

export type Project = z.infer<typeof ProjectSchema>

/** Each career's part in the Manchester office programme, as a project of two cases. */
const PROGRAMME_PARTS: Array<
  [careerId: string, levelId: string, part: string, stages: [string, string]]
> = [
  [
    'office-admin-finance',
    'assistant',
    'the programme budget',
    ['prog-fa-budget', 'prog-fa-review'],
  ],
  [
    'accounting',
    'accountant',
    'the accounting set-up',
    ['prog-acc-setup', 'prog-acc-review'],
  ],
  [
    'it-support',
    'senior-support-analyst',
    'technology and equipment',
    ['prog-it-equipment', 'prog-it-review'],
  ],
  [
    'digital-marketing',
    'digital-marketing-specialist',
    'the launch campaign',
    ['prog-mkt-launch', 'prog-mkt-review'],
  ],
  [
    'data-analytics',
    'senior-data-analyst',
    'the business case and measures of success',
    ['prog-data-case', 'prog-data-review'],
  ],
  [
    'software-development',
    'senior-developer',
    'the system changes',
    ['prog-dev-systems', 'prog-dev-review'],
  ],
]

const PROGRAMME_PROJECTS: z.input<typeof ProjectSchema>[] = PROGRAMME_PARTS.map(
  ([careerId, levelId, part, stages]) => ({
    id: `expansion-${careerId}`,
    careerId,
    levelId,
    title: 'Opening the Manchester office',
    brief: `An organisation-wide programme to open a second office for 25 staff. Every department had a part; this career delivered ${part}, working with what the other departments handed over, then advised the programme review.`,
    objectives: [
      'Contribute one department’s part to a cross-functional programme',
      'Work with information from other departments',
      'Advise a programme review on a change',
    ],
    deliverables: [
      `This department’s contribution: ${part}`,
      'A recommendation to the programme review',
    ],
    assessment: [
      'Each stage is checked like a case and must pass',
      'The project score is the average of the two stages',
    ],
    stages,
    stageType: 'cases',
  }),
)

const SOURCES: z.input<typeof ProjectSchema>[] = [
  {
    id: 'quarter-close',
    careerId: 'accounting',
    levelId: 'senior-accountant',
    title: 'Close the quarter for the board',
    brief:
      'Run the Q1 close from start to finish: post the quarter-end adjustments in Books, analyse the quarter against budget in Grid Craft, and prepare the board pack with the key figures and a written report.',
    objectives: [
      'Complete the books for the quarter with accruals and income earned',
      'Find the material variances against budget',
      'Report the quarter to the board with consistent figures',
    ],
    deliverables: [
      'The adjusted books (Books)',
      'The variance analysis (Grid Craft)',
      'The board pack: key figures (Grid Craft) and the board report (Word Craft)',
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
      'The figures by plan (Grid Craft) and the findings memo (Word Craft)',
    ],
    assessment: [
      'Each stage is checked like a task and must pass',
      'The project score is the average of the three stages',
    ],
    stages: ['churn-clean', 'churn-dashboard', 'churn-findings'],
  },
  {
    id: 'thursday-outage',
    careerId: 'it-support',
    levelId: 'service-desk-lead',
    title: 'The Thursday outage',
    brief:
      'Lead a real outage from the first ticket to the lessons learnt: triage the flood of tickets in Help Desk, find and fix the three causes in Network Tools, then close the incident, write the review and brief management.',
    objectives: [
      'Run the service desk side of an incident',
      'Separate several causes with evidence',
      'Turn an outage into improvements',
    ],
    deliverables: [
      'The triaged queue and the update to users (Help Desk)',
      'Findings, fixes and evidence (Network Tools)',
      'The resolved queue, the incident review (Word Craft) and the briefing (Deck Craft)',
    ],
    stages: ['outage-triage', 'outage-diagnosis', 'outage-review'],
    assessment: [
      'Each stage is checked like a task and must pass',
      'The project score is the average of the three stages',
    ],
  },
  {
    id: 'launch-rescue',
    careerId: 'digital-marketing',
    levelId: 'digital-marketing-manager',
    title: 'Rescue the Health Check launch',
    brief:
      'A launch with plenty of visitors and few bookings, and a budget running away: diagnose the problem in Site Analytics, fix the spending in Ad Campaigns, then score the first two weeks and present the revised plan.',
    objectives: [
      'Diagnose a funnel before spending more',
      'Move money from what doesn’t work to what does',
      'Present a recovery plan with consistent figures',
    ],
    deliverables: [
      'Saved reports and the diagnosis (Site Analytics)',
      'The changed ad account (Ad Campaigns)',
      'The scorecard (Grid Craft), the revised plan (Word Craft) and the slides (Deck Craft)',
    ],
    stages: ['launch-analytics', 'launch-campaigns', 'launch-plan'],
    assessment: [
      'Each stage is checked like a task and must pass',
      'The project score is the average of the three stages',
    ],
  },
  {
    id: 'mileage-release',
    careerId: 'software-development',
    levelId: 'lead-developer',
    title: 'Ship the new mileage rates',
    brief:
      'Ship a change to a business rule safely: cover the current rules with tests, implement the new rates on a branch and merge them, then release with a changelog entry, a release commit and release notes for Finance.',
    objectives: [
      'Build a safety net of tests before changing code',
      'Change behaviour through a branch and a merge',
      'Release and explain the change to its users',
    ],
    deliverables: [
      'The tests for today’s rules (Code)',
      'The new rules, merged into main (Code and Git)',
      'The changelog and release commit (Code and Git) and the release notes (Word Craft)',
    ],
    stages: ['mileage-tests', 'mileage-change', 'mileage-release'],
    assessment: [
      'Each stage is checked like a task and must pass',
      'The project score is the average of the three stages',
    ],
  },
  {
    id: 'budget-pack',
    careerId: 'office-admin-finance',
    levelId: 'officer',
    title: 'The year-end budget pack',
    brief:
      'Prepare the directors’ budget pack: consolidate this year’s spending from three departments with cross-sheet formulas, review next year’s proposals against a threshold, then present the key figures and a recommendation.',
    objectives: [
      'Consolidate several workbooks with references',
      'Review budget requests against a threshold',
      'Present one consistent set of figures',
    ],
    deliverables: [
      'The consolidated summary (Grid Craft)',
      'The budget review (Grid Craft)',
      'The key figures (Grid Craft) and the presentation (Deck Craft)',
    ],
    stages: ['budget-consolidate', 'budget-review', 'budget-presentation'],
    assessment: [
      'Each stage is checked like a task and must pass',
      'The project score is the average of the three stages',
    ],
  },
]

export const PROJECTS: Project[] = [...SOURCES, ...PROGRAMME_PROJECTS].map((p) =>
  ProjectSchema.parse(p),
)

export function getProject(id: string | undefined): Project | undefined {
  return id ? PROJECTS.find((p) => p.id === id) : undefined
}
