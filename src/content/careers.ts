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

/** Skills of the later careers. */
SKILLS.push(
  {
    id: 'bookkeeping',
    name: 'Bookkeeping',
    description: 'Recording transactions with debits and credits so the books balance.',
  },
  {
    id: 'reconciliation',
    name: 'Reconciliation',
    description: 'Proving that two records agree, and explaining every difference.',
  },
  {
    id: 'financial-reporting',
    name: 'Financial reporting',
    description:
      'Preparing schedules and statements, and explaining them to non-accountants.',
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description:
      'Diagnosing problems by asking the right questions and testing step by step.',
  },
  {
    id: 'customer-service',
    name: 'Customer service',
    description:
      'Helping people clearly, politely and completely, in writing and in person.',
  },
  {
    id: 'incident-management',
    name: 'Incident management',
    description: 'Prioritising, escalating and communicating when things go wrong.',
  },
  {
    id: 'technical-writing',
    name: 'Technical writing',
    description:
      'Explaining technical things in plain words: guides, articles and reports.',
  },
)

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
    description:
      'Keep the office running and the money in order: supplies orders, expense claims, invoices, budgets, payments and reports.',
    toolsIntro:
      'Your work is done in Sheets, our spreadsheet app, with reports in Docs and presentations in Slides.',
    skills: [
      'formulas',
      'data-analysis',
      'lookups',
      'presentation',
      'accuracy',
      'finance-basics',
    ],
    apps: ['sheets', 'docs', 'slides'],
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

CAREERS.push({
  id: 'accounting',
  name: 'Accounting',
  department: 'Accounting',
  description:
    'Keep the company’s books: record transactions, reconcile the bank, run the fixed-asset register and close the month.',
  toolsIntro:
    'Your work is done in Sheets, our spreadsheet app, with memos and reports in Docs.',
  skills: [
    'bookkeeping',
    'reconciliation',
    'financial-reporting',
    'formulas',
    'accuracy',
  ],
  apps: ['sheets', 'docs'],
  levels: [
    {
      id: 'accounts-trainee',
      title: 'Accounts Trainee',
      xpRequired: 0,
      minReputation: 0,
    },
    {
      id: 'assistant-accountant',
      title: 'Assistant Accountant',
      xpRequired: 200,
      minReputation: 35,
    },
    {
      id: 'accountant',
      title: 'Accountant',
      xpRequired: 350,
      minReputation: 50,
      minReview: 'solid',
    },
    {
      id: 'senior-accountant',
      title: 'Senior Accountant',
      xpRequired: 550,
      minReputation: 60,
      minReview: 'strong',
    },
  ],
})

CAREERS.push({
  id: 'it-support',
  name: 'IT Help Desk',
  department: 'IT Services',
  description:
    'Keep everyone working: triage and solve support tickets, help users in plain words, and handle incidents when systems fail.',
  toolsIntro:
    'Your work is done in the Help Desk, our ticketing system, with articles and reports in Docs and briefings in Slides.',
  skills: [
    'troubleshooting',
    'customer-service',
    'incident-management',
    'technical-writing',
    'accuracy',
  ],
  apps: ['helpdesk', 'docs', 'slides'],
  levels: [
    {
      id: 'service-desk-trainee',
      title: 'Service Desk Trainee',
      xpRequired: 0,
      minReputation: 0,
    },
    {
      id: 'service-desk-analyst',
      title: 'Service Desk Analyst',
      xpRequired: 200,
      minReputation: 35,
    },
    {
      id: 'senior-support-analyst',
      title: 'Senior Support Analyst',
      xpRequired: 350,
      minReputation: 50,
      minReview: 'solid',
    },
    {
      id: 'service-desk-lead',
      title: 'Service Desk Team Lead',
      xpRequired: 550,
      minReputation: 60,
      minReview: 'strong',
    },
  ],
})

export function getCareer(id: string): Career {
  return CAREERS.find((career) => career.id === id) ?? CAREERS[0]
}

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((skill) => skill.id === id)
}
