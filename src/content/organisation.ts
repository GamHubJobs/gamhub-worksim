/**
 * Cobalt Ridge as an organisation: its departments (with heads and quarterly
 * budgets), the approval limits that come with seniority, the indicators that
 * show how the organisation is doing, and its regular clients and suppliers.
 * Cases refer to these, so every career sees the same company.
 */

export interface OrgDepartment {
  id: string
  name: string
  head: { name: string; role: string }
  /** The department's discretionary budget for the quarter, in pounds. */
  quarterBudget: number
}

export const ORG_DEPARTMENTS: OrgDepartment[] = [
  {
    id: 'finance',
    name: 'Finance & Administration',
    head: { name: 'Priya Raman', role: 'Finance & Administration Manager' },
    quarterBudget: 18000,
  },
  {
    id: 'accounting',
    name: 'Accounting',
    head: { name: 'Daniel Okoro', role: 'Accounting Manager' },
    quarterBudget: 12000,
  },
  {
    id: 'it',
    name: 'IT Support',
    head: { name: 'Ravi Menon', role: 'IT Service Desk Manager' },
    quarterBudget: 30000,
  },
  {
    id: 'marketing',
    name: 'Marketing',
    head: { name: 'Sofia Alvarez', role: 'Marketing Manager' },
    quarterBudget: 45000,
  },
  {
    id: 'data',
    name: 'Data & Insight',
    head: { name: 'Amara Nwosu', role: 'Head of Data & Insights' },
    quarterBudget: 15000,
  },
  {
    id: 'engineering',
    name: 'Engineering',
    head: { name: 'Samuel Adeyemi', role: 'Engineering Manager' },
    quarterBudget: 25000,
  },
  {
    id: 'people',
    name: 'People & Culture',
    head: { name: 'Grace Okafor', role: 'People & Culture Partner' },
    quarterBudget: 20000,
  },
  {
    id: 'operations',
    name: 'Operations',
    head: { name: 'Helen Carter', role: 'Operations Director' },
    quarterBudget: 40000,
  },
]

export function getOrgDepartment(id: string): OrgDepartment | undefined {
  return ORG_DEPARTMENTS.find((d) => d.id === id)
}

/**
 * How much a person can approve on their own, by career level (1 = first).
 * Interns approve nothing; above the limit, a request is escalated.
 */
export const APPROVAL_LIMITS = [0, 500, 2500, 10000, 25000] as const

export function approvalLimit(levelNumber: number): number {
  return APPROVAL_LIMITS[Math.min(APPROVAL_LIMITS.length, Math.max(1, levelNumber)) - 1]
}

export const INDICATORS = [
  {
    id: 'satisfaction',
    name: 'Client satisfaction',
    description: 'How satisfied clients and internal customers are with your work.',
  },
  {
    id: 'risk',
    name: 'Operational risk',
    description: 'Errors and exposure that could hurt the company. Lower is better.',
  },
  {
    id: 'discipline',
    name: 'Budget discipline',
    description: 'Spending within limits, with the right approvals.',
  },
] as const

export type IndicatorId = (typeof INDICATORS)[number]['id']

/** Where every career save starts: a steady, ordinary organisation. */
export const STARTING_INDICATORS: Record<IndicatorId, number> = {
  satisfaction: 70,
  risk: 30,
  discipline: 70,
}

export const CLIENTS = [
  { name: 'Harbour Foods', sector: 'Food and drink' },
  { name: 'Northgate Motors', sector: 'Automotive' },
  { name: 'Brightpath Clinics', sector: 'Healthcare' },
  { name: 'Meadow Care Homes', sector: 'Care' },
  { name: 'Okafor Build', sector: 'Construction' },
  { name: 'Steelway Engineering', sector: 'Manufacturing' },
]

export const SUPPLIERS = [
  { name: 'Meadow Office Supplies', provides: 'Stationery and office supplies' },
  { name: 'Clearline Telecom', provides: 'Phones and broadband' },
  { name: 'Ferris & Co Solicitors', provides: 'Legal advice' },
  { name: 'Northbridge IT Hardware', provides: 'Laptops and equipment' },
  { name: 'Brightwave Media', provides: 'Advertising space' },
]
