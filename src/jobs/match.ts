/**
 * How a real advert fits the player: recommendations for their career, and
 * what the advert asks for set against what they have practised in the game.
 *
 * What is practised in GamHub WorkSim is a simulation. It is shown as
 * practice, never as experience, a qualification or a certificate.
 */
import { CAREERS, SKILLS, getCareer } from '../content/careers'
import { fieldFit, getField, hasPhrase, type Field } from './fields'
import { openTo } from './geo'
import type { JobListing, Level } from './types'

/** What the game knows of the player, for matching. */
export interface Player {
  careerId: string
  /** Index of their level in the career (0: the first). */
  levelIndex: number
  /** Skill XP by skill id. */
  skills: Record<string, number>
  /** Where they live or want to work (ISO), '' if not said. */
  country: string
}

/** Real-world words for each skill the game teaches. */
export const SKILL_TERMS: Record<string, string[]> = {
  formulas: ['excel', 'spreadsheet', 'spreadsheets', 'formulas', 'google sheets'],
  'data-analysis': ['data analysis', 'analysing data', 'analyzing data', 'analytical'],
  lookups: ['vlookup', 'xlookup', 'index match', 'lookups'],
  presentation: ['presentation', 'presentations', 'powerpoint', 'reporting'],
  accuracy: [
    'attention to detail',
    'accuracy',
    'accurate',
    'detail-oriented',
    'detail oriented',
  ],
  'finance-basics': [
    'invoices',
    'invoicing',
    'budget',
    'budgets',
    'expenses',
    'purchase orders',
  ],
  'ai-use': ['chatgpt', 'generative ai', 'copilot', 'ai tools', 'llm'],
  bookkeeping: [
    'bookkeeping',
    'ledger',
    'accounts payable',
    'accounts receivable',
    'xero',
    'quickbooks',
    'sage',
  ],
  reconciliation: ['reconciliation', 'reconciliations', 'reconcile', 'bank rec'],
  'financial-reporting': [
    'financial reporting',
    'month-end',
    'month end',
    'management accounts',
    'ifrs',
    'gaap',
    'financial statements',
  ],
  troubleshooting: ['troubleshooting', 'troubleshoot', 'diagnose', 'diagnosing'],
  'customer-service': [
    'customer service',
    'customer support',
    'customer experience',
    'customer-facing',
  ],
  'incident-management': [
    'incident management',
    'itil',
    'ticketing',
    'sla',
    'servicenow',
    'jira service',
    'zendesk',
    'freshdesk',
  ],
  'technical-writing': ['documentation', 'knowledge base', 'technical writing'],
  'access-control': [
    'active directory',
    'azure ad',
    'entra',
    'access management',
    'permissions',
    'mfa',
    'identity',
  ],
  'campaign-analytics': [
    'google analytics',
    'ga4',
    'campaign performance',
    'kpis',
    'kpi',
    'a/b testing',
  ],
  copywriting: ['copywriting', 'copy', 'content writing', 'writing skills'],
  'content-strategy': [
    'content strategy',
    'content marketing',
    'editorial',
    'social media',
  ],
  'data-cleaning': ['data cleaning', 'data quality', 'cleansing', 'data cleansing'],
  'data-visualisation': [
    'visualisation',
    'visualization',
    'tableau',
    'power bi',
    'looker',
    'dashboards',
    'dashboard',
  ],
  'insight-communication': ['stakeholders', 'stakeholder', 'storytelling', 'insights'],
  programming: [
    'javascript',
    'typescript',
    'python',
    'java',
    'c#',
    'react',
    'node.js',
    'programming',
    'coding',
  ],
  debugging: ['debugging', 'debug'],
  'software-testing': [
    'unit tests',
    'unit testing',
    'test automation',
    'automated testing',
    'jest',
    'cypress',
    'playwright',
    'tdd',
  ],
  'software-design': [
    'software design',
    'system design',
    'design patterns',
    'architecture',
    'api design',
  ],
  'patient-safety': [
    'patient safety',
    'infection control',
    'safeguarding',
    'manual handling',
  ],
  'clinical-observation': [
    'observations',
    'vital signs',
    'news2',
    'escalation',
    'escalate',
  ],
  'clinical-documentation': [
    'care plans',
    'care records',
    'clinical documentation',
    'charting',
  ],
  confidentiality: ['confidentiality', 'gdpr', 'data protection', 'hipaa'],
  'legal-research': ['legal research', 'case law', 'westlaw', 'lexisnexis'],
  'legal-drafting': ['drafting', 'contracts', 'legal documents', 'agreements'],
  'professional-ethics': ['ethics', 'professional conduct', 'integrity'],
  'case-management': [
    'case management',
    'caseload',
    'matter management',
    'file management',
  ],
  'engineering-analysis': [
    'calculations',
    'structural analysis',
    'eurocodes',
    'engineering analysis',
  ],
  'safe-systems-of-work': [
    'health and safety',
    'risk assessment',
    'risk assessments',
    'rams',
    'cdm',
    'method statements',
  ],
  'design-judgement': ['autocad', 'revit', 'civil 3d', 'cad', 'design reviews'],
  'quality-control': [
    'quality control',
    'quality assurance',
    'inspection',
    'iso 9001',
    'qa/qc',
    'compliance',
  ],
}

/** Real qualifications and requirements adverts ask for (never earned in the game). */
const REAL_REQUIREMENTS: Array<[RegExp, string]> = [
  [
    /\b(bachelor'?s?|ba|bsc|b\.sc|degree|university degree|hochschulabschluss|studium)\b/i,
    'A degree',
  ],
  [/\b(master'?s|msc|m\.sc|mba)\b/i, 'A postgraduate degree'],
  [/\bcomptia\s*(a\+|network\+|security\+)?/i, 'CompTIA certification'],
  [/\bitil\b/i, 'ITIL certification (or knowledge)'],
  [/\b(ccna|mcsa|az-900|ms-900|microsoft certified)\b/i, 'Vendor IT certification'],
  [
    /\b(acca|cima|aca|cpa|aat|chartered accountant)\b/i,
    'An accountancy qualification (ACCA, CIMA, AAT, CPA…)',
  ],
  [
    /\b(nmc|nursing registration|registered nurse|rn\b|care certificate)/i,
    'Nursing or care registration',
  ],
  [
    /\b(sra|bar admission|admitted to the bar|qualified solicitor|law degree|llb|cilex)\b/i,
    'Legal qualification or admission',
  ],
  [
    /\b(ceng|ieng|chartered engineer|incorporated engineer|accredited engineering degree|cscs)\b/i,
    'Engineering registration or site card',
  ],
  [/\b(pmp|prince2)\b/i, 'Project management certification'],
  [/\b(driving licen[cs]e|driver'?s licen[cs]e|führerschein)\b/i, 'A driving licence'],
  [
    /\b(right to work|work permit|work authori[sz]ation|eligible to work|authorized to work)\b/i,
    'The right to work where the job is',
  ],
  [
    /\b(fluent|native|business[- ]level|proficient)\s+(german|english|french|spanish|dutch|italian|portuguese)\b|\b(deutsch|german)\s*(c1|c2|b2)\b/i,
    'A language at a working level',
  ],
]

export interface SkillMatch {
  /** Skills the advert asks for that the player has practised in the game (with their level). */
  practised: Array<{ id: string; name: string; level: string }>
  /** Skills the advert asks for that the player has not practised yet. */
  toPractise: Array<{ id: string; name: string; careers: string[] }>
  /** Real requirements in the advert, which the game does not give. */
  real: string[]
  /** "3+ years" and the like, as the advert says. */
  experience: string[]
}

const LEVEL_NAMES = ['Novice', 'Learner', 'Competent', 'Proficient', 'Expert']
const LEVEL_XP = [0, 40, 120, 250, 450]
export function skillLevelName(xp: number): string {
  let i = 0
  while (i + 1 < LEVEL_XP.length && xp >= LEVEL_XP[i + 1]) i++
  return LEVEL_NAMES[i]
}

/** What the advert asks for, against what the player has practised. */
export function compareSkills(
  listing: JobListing,
  player: Pick<Player, 'skills'>,
): SkillMatch {
  const text =
    `${listing.title}\n${listing.tags.join(', ')}\n${listing.description}`.toLowerCase()
  const practised: SkillMatch['practised'] = []
  const toPractise: SkillMatch['toPractise'] = []
  for (const [id, terms] of Object.entries(SKILL_TERMS)) {
    if (!terms.some((t) => hasPhrase(text, t))) continue
    const skill = SKILLS.find((s) => s.id === id)
    const name = skill?.name ?? id
    const xp = player.skills[id] ?? 0
    if (xp > 0) practised.push({ id, name, level: skillLevelName(xp) })
    else
      toPractise.push({
        id,
        name,
        careers: CAREERS.filter((c) => c.skills.includes(id)).map((c) => c.name),
      })
  }
  const real = [
    ...new Set(REAL_REQUIREMENTS.filter(([re]) => re.test(text)).map(([, n]) => n)),
  ]
  const experience = [
    ...new Set(
      [
        ...text.matchAll(
          /\b(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?|jahre)\b[^.\n]{0,40}/gi,
        ),
      ]
        .map((m) => m[0].trim().replace(/\s+/g, ' '))
        .slice(0, 3),
    ),
  ]
  return { practised, toPractise, real, experience }
}

/** The levels that suit someone at this stage of a career. */
export function levelsFor(levelIndex: number): Level[] {
  if (levelIndex <= 0) return ['internship', 'graduate', 'entry']
  if (levelIndex === 1) return ['graduate', 'entry', 'mid']
  if (levelIndex === 2) return ['entry', 'mid', 'senior']
  return ['mid', 'senior', 'lead']
}

/** The player's career's field (or a field from its name, for a career without one). */
export function fieldOf(careerId: string): Field {
  const known = getField(careerId)
  if (known) return known
  const career = getCareer(careerId)
  const name = career?.name ?? careerId
  return {
    id: careerId,
    name,
    titles: [
      name.toLowerCase(),
      ...(career?.levels ?? []).map((l) => l.title.toLowerCase()),
    ],
    not: [],
    terms: { what: name },
  }
}

export interface Recommendation {
  listing: JobListing
  score: number
  /** Why it was suggested, in short phrases. */
  why: string[]
}

/**
 * Adverts that suit the player, best first. An advert must be the player's kind
 * of work by its title or its feed's category (a keyword in the text alone is
 * not enough); then it gains for a level that suits them, being open to them
 * where they live, the skills it asks for that they have practised, and being
 * recent.
 */
export function recommend(
  listings: JobListing[],
  player: Player,
  now: number = Date.now(),
): Recommendation[] {
  const field = fieldOf(player.careerId)
  const levels = levelsFor(player.levelIndex)
  const out: Recommendation[] = []
  for (const l of listings) {
    const fit = fieldFit(field, l.title, l.categories)
    if (fit <= 0) continue
    const why: string[] = [
      fit === 2 ? `${field.name} role` : `Listed under ${field.name.toLowerCase()}`,
    ]
    let score = fit === 2 ? 50 : 25
    if (l.level) {
      if (levels.includes(l.level)) {
        score += 20
        why.push(
          l.level === 'internship'
            ? 'An internship'
            : l.level === 'graduate'
              ? 'For graduates and trainees'
              : `${l.level[0].toUpperCase()}${l.level.slice(1)} level, suits where you are`,
        )
      } else if ((l.level === 'senior' || l.level === 'lead') && player.levelIndex <= 1)
        // Not a suggestion for someone starting out (Search still finds it).
        continue
    }
    if (player.country) {
      const c = player.country.toUpperCase()
      if (l.arrangement === 'remote' ? openTo(l, c) : l.countries.includes(c)) {
        score += 15
        why.push(
          l.arrangement === 'remote'
            ? 'Open to applicants where you live'
            : 'In your country',
        )
      } else if (
        l.arrangement !== 'remote' ||
        (!l.worldwide && (l.countries.length || l.regions.length))
      )
        score -= 25
    }
    const skills = compareSkills(l, player)
    if (skills.practised.length) {
      score += Math.min(15, skills.practised.length * 5)
      why.push(
        `Asks for ${skills.practised
          .slice(0, 2)
          .map((s) => s.name.toLowerCase())
          .join(' and ')}, which you have practised`,
      )
    }
    const age = (now - (Date.parse(l.posted) || 0)) / 86_400_000
    if (age <= 3) score += 8
    else if (age <= 14) score += 4
    out.push({ listing: l, score, why })
  }
  return out.sort((a, b) => b.score - a.score)
}
