/** Careers and skills. */
import type { Career, Skill } from './schemas'

export const SKILLS: Skill[] = [
  {
    id: 'formulas',
    name: 'Spreadsheet formulas',
    description:
      'Letting the spreadsheet do the maths, so results update when data changes.',
  },
  {
    id: 'data-analysis',
    name: 'Data analysis',
    description:
      'Summarising data with functions such as SUM, AVERAGE, MIN, MAX and COUNT.',
  },
  {
    id: 'lookups',
    name: 'Lookups',
    description:
      'Finding matching information in another table with functions such as VLOOKUP.',
  },
  {
    id: 'presentation',
    name: 'Data presentation',
    description: 'Formatting numbers and tables so others can read them at a glance.',
  },
  {
    id: 'accuracy',
    name: 'Accuracy',
    description: 'Getting the details right and keeping source data intact.',
  },
  {
    id: 'finance-basics',
    name: 'Finance basics',
    description: 'Understanding orders, expenses, invoices, budgets and approvals.',
  },
]

export const SKILL_LEVELS = [
  { level: 1, name: 'Novice', xpRequired: 0 },
  { level: 2, name: 'Learner', xpRequired: 40 },
  { level: 3, name: 'Competent', xpRequired: 120 },
  { level: 4, name: 'Proficient', xpRequired: 250 },
  { level: 5, name: 'Expert', xpRequired: 450 },
] as const

export const CAREERS: Career[] = [
  {
    id: 'office-admin-finance',
    name: 'Office Administration & Finance',
    department: 'Finance & Administration',
    levels: [
      { id: 'intern', title: 'Finance & Admin Intern', xpRequired: 0, minReputation: 0 },
      {
        id: 'junior',
        title: 'Junior Finance Assistant',
        xpRequired: 300,
        minReputation: 35,
      },
      {
        id: 'assistant',
        title: 'Finance Assistant',
        xpRequired: 900,
        minReputation: 50,
        minReview: 'solid',
      },
      {
        id: 'officer',
        title: 'Finance Officer',
        xpRequired: 2000,
        minReputation: 60,
        minReview: 'strong',
      },
    ],
  },
]

export function getCareer(id: string): Career {
  return CAREERS.find((career) => career.id === id) ?? CAREERS[0]
}

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((skill) => skill.id === id)
}
