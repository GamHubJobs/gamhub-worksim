/**
 * Fields of work, for browsing and for matching real adverts to a career in
 * the game: the job titles that are this kind of work (in English and, for the
 * German feed, German), the words that mean it is something else, and what
 * each feed calls the field. Every career in content/careers.ts has one; a new
 * career without one still gets searches by its name.
 */
import type { FieldTerms } from './providers'

export interface Field {
  id: string
  name: string
  /** Job titles (or parts of them) that are this work. */
  titles: string[]
  /** Words in a title that mean another kind of job, despite a matching word. */
  not: string[]
  /** The feeds' own names for the field. */
  terms: FieldTerms
}

export const FIELDS: Field[] = [
  {
    id: 'office-admin-finance',
    name: 'Finance & administration',
    titles: [
      'finance assistant',
      'finance officer',
      'finance administrator',
      'accounts assistant',
      'accounts payable',
      'accounts receivable',
      'administrative assistant',
      'admin assistant',
      'administrator',
      'office administrator',
      'office manager',
      'office assistant',
      'executive assistant',
      'virtual assistant',
      'personal assistant',
      'bookkeeper',
      'payroll',
      'billing',
      'credit control',
      'purchase ledger',
      'sachbearbeiter',
      'buchhaltung',
      'kaufmännische',
      'assistenz',
    ],
    not: [
      'medical',
      'dental',
      'pharmacy',
      'teaching',
      'nurse',
      'sales assistant',
      'store assistant',
      'system administrator',
      'systems administrator',
      'database administrator',
      'network administrator',
      'it administrator',
      'it-administrator',
      'cloud administrator',
      'salesforce administrator',
      'systemadministrator',
    ],
    terms: {
      remotive: 'finance',
      jobicy: 'accounting-finance',
      remoteok: 'finance',
      what: 'finance assistant',
    },
  },
  {
    id: 'accounting',
    name: 'Accounting',
    titles: [
      'accountant',
      'accounting',
      'accounts',
      'bookkeeper',
      'bookkeeping',
      'audit',
      'auditor',
      'tax',
      'controller',
      'financial controller',
      'management accountant',
      'financial analyst',
      'fp&a',
      'payroll',
      'buchhalter',
      'finanzbuchhalter',
      'steuerfachangestellte',
      'bilanzbuchhalter',
      'controlling',
    ],
    not: [
      'account manager',
      'account executive',
      'accounts manager',
      'key account',
      'account director',
      'tax software engineer',
    ],
    terms: {
      remotive: 'finance',
      jobicy: 'accounting-finance',
      remoteok: 'accounting',
      what: 'accountant',
    },
  },
  {
    id: 'it-support',
    name: 'IT support & service desk',
    titles: [
      'it support',
      'help desk',
      'helpdesk',
      'service desk',
      'desktop support',
      'technical support',
      'tech support',
      'support technician',
      'it technician',
      'support engineer',
      'support specialist',
      'support analyst',
      'it specialist',
      'it administrator',
      'system administrator',
      'systems administrator',
      'sysadmin',
      'field technician',
      'noc',
      'end user',
      'it-support',
      'systemadministrator',
      'it-administrator',
      'fachinformatiker',
      'it-systemelektroniker',
    ],
    not: [
      'customer support agent',
      'customer support representative',
      'sales',
      'chat support',
      'senior software engineer',
    ],
    terms: {
      remotive: 'information-technology',
      jobicy: 'technical-support',
      remoteok: 'sys admin',
      what: 'it support',
    },
  },
  {
    id: 'digital-marketing',
    name: 'Digital marketing',
    titles: [
      'marketing',
      'seo',
      'sem',
      'ppc',
      'paid search',
      'paid social',
      'social media',
      'content marketing',
      'content writer',
      'copywriter',
      'growth',
      'campaign',
      'email marketing',
      'crm marketing',
      'brand',
      'community manager',
      'digital marketing',
      'performance marketing',
      'online-marketing',
      'marketing manager',
    ],
    not: ['sales engineer', 'software engineer', 'marketing engineer', 'data engineer'],
    terms: {
      remotive: 'marketing',
      jobicy: 'marketing',
      remoteok: 'marketing',
      what: 'digital marketing',
    },
  },
  {
    id: 'data-analytics',
    name: 'Data analysis',
    titles: [
      'data analyst',
      'analytics',
      'business intelligence',
      'bi analyst',
      'bi developer',
      'reporting analyst',
      'insights analyst',
      'data scientist',
      'business analyst',
      'product analyst',
      'marketing analyst',
      'data specialist',
      'datenanalyst',
      'data analytics',
    ],
    not: ['security analyst', 'soc analyst', 'financial analyst', 'credit analyst'],
    terms: {
      remotive: 'data',
      jobicy: 'data-science',
      remoteok: 'analyst',
      what: 'data analyst',
    },
  },
  {
    id: 'software-development',
    name: 'Software development',
    titles: [
      'developer',
      'software engineer',
      'software developer',
      'frontend',
      'front-end',
      'front end',
      'backend',
      'back-end',
      'back end',
      'full stack',
      'full-stack',
      'fullstack',
      'web developer',
      'programmer',
      'mobile engineer',
      'ios engineer',
      'android engineer',
      'qa engineer',
      'test engineer',
      'sdet',
      'entwickler',
      'softwareentwickler',
      'programmierer',
    ],
    not: [
      'business developer',
      'business development',
      'property developer',
      'sales developer',
    ],
    terms: {
      remotive: 'software-development',
      jobicy: 'engineering',
      remoteok: 'dev',
      what: 'software developer',
    },
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    titles: [
      'healthcare assistant',
      'health care assistant',
      'care assistant',
      'carer',
      'support worker',
      'nurse',
      'nursing',
      'clinical',
      'patient',
      'medical assistant',
      'ward',
      'hospital',
      'health',
      'care worker',
      'pflege',
      'pflegefachkraft',
      'pflegehelfer',
      'krankenpfleger',
      'gesundheits',
      'medizinische fachangestellte',
    ],
    not: [
      'software',
      'engineer',
      'developer',
      'sales',
      'data scientist',
      'health insurance sales',
    ],
    terms: {
      remotive: 'medical',
      jobicy: 'healthcare',
      remoteok: 'medical',
      what: 'healthcare assistant',
    },
  },
  {
    id: 'legal',
    name: 'Law & legal services',
    titles: [
      'paralegal',
      'legal assistant',
      'legal secretary',
      'legal executive',
      'legal counsel',
      'legal',
      'solicitor',
      'lawyer',
      'attorney',
      'counsel',
      'contracts manager',
      'contract specialist',
      'compliance',
      'conveyancer',
      'rechtsanwalt',
      'rechtsanwaltsfachangestellte',
      'jurist',
      'syndikus',
    ],
    not: ['software', 'engineer', 'developer'],
    terms: { remotive: 'legal', jobicy: 'legal', remoteok: 'legal', what: 'paralegal' },
  },
  {
    id: 'engineering-services',
    name: 'Engineering & technical services',
    titles: [
      'civil engineer',
      'structural engineer',
      'mechanical engineer',
      'electrical engineer',
      'building services',
      'site engineer',
      'design engineer',
      'graduate engineer',
      'project engineer',
      'engineering technician',
      'cad technician',
      'cad designer',
      'draughtsperson',
      'draftsman',
      'quantity surveyor',
      'site manager',
      'maintenance engineer',
      'process engineer',
      'quality engineer',
      'hse',
      'health and safety',
      'bauingenieur',
      'ingenieur',
      'bauleiter',
      'techniker',
      'konstrukteur',
      'elektroingenieur',
      'maschinenbau',
    ],
    not: [
      'software',
      'frontend',
      'backend',
      'full stack',
      'devops',
      'data engineer',
      'machine learning',
      'ml engineer',
      'sales engineer',
      'support engineer',
      'site reliability',
      'platform engineer',
      'security engineer',
      'prompt engineer',
      'ai engineer',
      'qa engineer',
      'cloud engineer',
    ],
    terms: { remotive: 'engineering', what: 'civil engineer' },
  },
  // Further fields to browse (no career in the game yet).
  {
    id: 'customer-service',
    name: 'Customer service',
    titles: [
      'customer service',
      'customer support',
      'customer success',
      'customer experience',
      'call centre',
      'contact centre',
      'kundenservice',
      'kundenberater',
    ],
    not: ['engineer', 'developer'],
    terms: {
      remotive: 'customer-service',
      jobicy: 'supporting',
      remoteok: 'customer support',
      what: 'customer service',
    },
  },
  {
    id: 'sales',
    name: 'Sales',
    titles: [
      'sales',
      'account executive',
      'business development',
      'account manager',
      'sdr',
      'bdr',
      'vertrieb',
      'verkäufer',
    ],
    not: ['engineer', 'developer'],
    terms: { remotive: 'sales', jobicy: 'seller', remoteok: 'sales', what: 'sales' },
  },
  {
    id: 'design',
    name: 'Design',
    titles: [
      'designer',
      'ux',
      'ui',
      'graphic',
      'product design',
      'visual',
      'illustrator',
      'gestalter',
    ],
    not: ['engineer', 'civil'],
    terms: {
      remotive: 'design',
      jobicy: 'design-multimedia',
      remoteok: 'design',
      what: 'designer',
    },
  },
  {
    id: 'hr',
    name: 'Human resources',
    titles: [
      'hr',
      'human resources',
      'recruiter',
      'recruitment',
      'talent',
      'people partner',
      'people operations',
      'personal',
    ],
    not: ['engineer', 'developer'],
    terms: {
      remotive: 'human-resources',
      jobicy: 'hr',
      remoteok: 'hr',
      what: 'hr assistant',
    },
  },
  {
    id: 'education',
    name: 'Teaching & education',
    titles: [
      'teacher',
      'tutor',
      'teaching',
      'instructor',
      'lecturer',
      'education',
      'curriculum',
      'lehrer',
      'erzieher',
    ],
    not: ['engineer', 'developer'],
    terms: {
      remotive: 'education',
      jobicy: 'education',
      remoteok: 'teaching',
      what: 'teacher',
    },
  },
  {
    id: 'project-management',
    name: 'Project management',
    titles: [
      'project manager',
      'project coordinator',
      'programme manager',
      'program manager',
      'scrum master',
      'delivery manager',
      'projektmanager',
      'projektleiter',
    ],
    not: [],
    terms: {
      remotive: 'project-management',
      jobicy: 'project-management',
      remoteok: 'project manager',
      what: 'project coordinator',
    },
  },
]

export function getField(id: string): Field | undefined {
  return FIELDS.find((f) => f.id === id)
}

const compiled = new Map<string, RegExp>()
const has = (text: string, phrase: string) => {
  // Whole words or phrases ("ui" is not in "build"; "it support" not in "kit supporter").
  let pattern = compiled.get(phrase)
  if (!pattern) {
    const p = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${p}($|[^\\p{L}\\p{N}])`, 'iu')
    compiled.set(phrase, pattern)
  }
  return pattern.test(text)
}

/**
 * How much an advert's title is this field's work: 2 for a title naming it
 * outright, 1 for the field's category in the feed, 0 for neither, and -1 for
 * a title that is plainly another kind of job ("Software Engineer" is not
 * civil engineering).
 */
export function fieldFit(field: Field, title: string, categories: string[]): number {
  const t = title.toLowerCase()
  if (field.not.some((w) => has(t, w))) return -1
  if (field.titles.some((w) => has(t, w))) return 2
  const cats = categories.join(' ').toLowerCase()
  const names = [field.name, field.terms.remotive ?? '', field.terms.jobicy ?? '']
    .map((n) => n.toLowerCase().replace(/-/g, ' '))
    .filter(Boolean)
  return names.some(
    (n) => cats.includes(n) || n.split(' & ').some((part) => part && cats.includes(part)),
  )
    ? 1
    : 0
}

export { has as hasPhrase }
