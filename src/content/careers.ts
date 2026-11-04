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

/** A skill every career shares: using AI tools well and responsibly. */
SKILLS.push({
  id: 'ai-use',
  name: 'Using AI at work',
  description:
    'Prompting well, checking AI answers before relying on them, and keeping personal and confidential data out of AI tools.',
})

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

SKILLS.push(
  {
    id: 'campaign-analytics',
    name: 'Campaign analytics',
    description:
      'Measuring campaigns with CTR, conversion, CPA and ROAS, and acting on them.',
  },
  {
    id: 'copywriting',
    name: 'Copywriting',
    description: 'Writing short, persuasive copy with one clear call to action.',
  },
  {
    id: 'content-strategy',
    name: 'Content strategy',
    description: 'Planning content across channels, and turning results into decisions.',
  },
)

SKILLS.push(
  {
    id: 'data-cleaning',
    name: 'Data cleaning',
    description:
      'Making messy data consistent and trustworthy, without touching the raw data.',
  },
  {
    id: 'data-visualisation',
    name: 'Data visualisation',
    description: 'Choosing and building charts that answer a question at a glance.',
  },
  {
    id: 'insight-communication',
    name: 'Insight communication',
    description:
      'Turning analysis into findings, evidence, recommendations and honest caveats.',
  },
)

SKILLS.push(
  {
    id: 'programming',
    name: 'Programming',
    description: 'Writing clear, correct code that does what the specification says.',
  },
  {
    id: 'debugging',
    name: 'Debugging',
    description:
      'Finding the cause of a bug from failing tests and error messages, and fixing it.',
  },
  {
    id: 'software-testing',
    name: 'Software testing',
    description:
      'Writing tests that cover the rules and their edges, and catch real bugs.',
  },
  {
    id: 'software-design',
    name: 'Software design',
    description:
      'Shaping code and its behaviour, including errors, so others can trust and change it.',
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
      'ai-use',
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
    'ai-use',
  ],
  apps: ['sheets', 'docs'],
  tools: [
    {
      tool: 'books',
      fromLevel: 'accounts-trainee',
      sections: {
        sales: 'assistant-accountant',
        purchases: 'assistant-accountant',
        banking: 'assistant-accountant',
        payroll: 'accountant',
      },
    },
  ],
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
      xpRequired: 300,
      minReputation: 35,
    },
    {
      id: 'accountant',
      title: 'Accountant',
      xpRequired: 700,
      minReputation: 50,
      minReview: 'solid',
    },
    {
      id: 'senior-accountant',
      title: 'Senior Accountant',
      xpRequired: 1050,
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
    'ai-use',
  ],
  apps: ['helpdesk', 'docs', 'slides'],
  tools: [
    { tool: 'directory', fromLevel: 'service-desk-trainee' },
    { tool: 'network', fromLevel: 'service-desk-analyst' },
  ],
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
      xpRequired: 300,
      minReputation: 35,
    },
    {
      id: 'senior-support-analyst',
      title: 'Senior Support Analyst',
      xpRequired: 700,
      minReputation: 50,
      minReview: 'solid',
    },
    {
      id: 'service-desk-lead',
      title: 'Service Desk Team Lead',
      xpRequired: 1050,
      minReputation: 60,
      minReview: 'strong',
    },
  ],
})

CAREERS.push({
  id: 'digital-marketing',
  name: 'Digital Marketing',
  department: 'Marketing',
  description:
    'Bring in new clients: measure campaigns, plan and write content, test what works and report the results.',
  toolsIntro:
    'Your work is done in Sheets for the numbers, Docs for copy and reports, and Slides for presentations.',
  skills: [
    'campaign-analytics',
    'copywriting',
    'content-strategy',
    'data-analysis',
    'presentation',
    'ai-use',
  ],
  apps: ['sheets', 'docs', 'slides'],
  tools: [
    { tool: 'social', fromLevel: 'marketing-assistant' },
    { tool: 'seo', fromLevel: 'digital-marketing-executive' },
    { tool: 'campaigns', fromLevel: 'digital-marketing-executive' },
    { tool: 'analytics', fromLevel: 'digital-marketing-specialist' },
  ],
  levels: [
    {
      id: 'marketing-assistant',
      title: 'Marketing Assistant',
      xpRequired: 0,
      minReputation: 0,
    },
    {
      id: 'digital-marketing-executive',
      title: 'Digital Marketing Executive',
      xpRequired: 300,
      minReputation: 35,
    },
    {
      id: 'digital-marketing-specialist',
      title: 'Digital Marketing Specialist',
      xpRequired: 700,
      minReputation: 50,
      minReview: 'solid',
    },
    {
      id: 'digital-marketing-manager',
      title: 'Digital Marketing Manager',
      xpRequired: 1050,
      minReputation: 60,
      minReview: 'strong',
    },
  ],
})

CAREERS.push({
  id: 'data-analytics',
  name: 'Data Analysis',
  department: 'Data & Insights',
  description:
    'Turn data into decisions: clean messy exports, summarise and analyse, and explain what the numbers mean.',
  toolsIntro:
    'Your work is done in Sheets for cleaning and analysis, Docs for insight memos and reports, and Slides for presenting findings.',
  skills: [
    'data-cleaning',
    'data-analysis',
    'data-visualisation',
    'insight-communication',
    'formulas',
    'ai-use',
  ],
  apps: ['sheets', 'docs', 'slides'],
  tools: [
    {
      tool: 'datastudio',
      fromLevel: 'junior-data-analyst',
      sections: {
        sql: 'data-analyst',
        dashboard: 'data-analyst',
        stats: 'senior-data-analyst',
      },
    },
  ],
  levels: [
    {
      id: 'junior-data-analyst',
      title: 'Junior Data Analyst',
      xpRequired: 0,
      minReputation: 0,
    },
    { id: 'data-analyst', title: 'Data Analyst', xpRequired: 300, minReputation: 35 },
    {
      id: 'senior-data-analyst',
      title: 'Senior Data Analyst',
      xpRequired: 700,
      minReputation: 50,
      minReview: 'solid',
    },
    {
      id: 'lead-data-analyst',
      title: 'Lead Data Analyst',
      xpRequired: 1050,
      minReputation: 60,
      minReview: 'strong',
    },
  ],
})

CAREERS.push({
  id: 'software-development',
  name: 'Software Development',
  department: 'Engineering',
  description:
    'Build and fix the company’s own software: debug, write features from specifications, test them and explain your design.',
  toolsIntro:
    'Your work is done in Code, a JavaScript editor with tests you can run, and Docs for design notes.',
  skills: [
    'programming',
    'debugging',
    'software-testing',
    'software-design',
    'technical-writing',
    'ai-use',
  ],
  apps: ['code', 'docs'],
  tools: [{ tool: 'api', fromLevel: 'software-developer' }],
  levels: [
    {
      id: 'junior-developer',
      title: 'Junior Developer',
      xpRequired: 0,
      minReputation: 0,
    },
    {
      id: 'software-developer',
      title: 'Software Developer',
      xpRequired: 300,
      minReputation: 35,
    },
    {
      id: 'senior-developer',
      title: 'Senior Developer',
      xpRequired: 700,
      minReputation: 50,
      minReview: 'solid',
    },
    {
      id: 'lead-developer',
      title: 'Lead Developer',
      xpRequired: 950,
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
