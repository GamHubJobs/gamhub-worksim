/**
 * The organisation-wide programme: opening a Manchester office. Every
 * department has a workstream. The player's career delivers its own (as
 * programme cases); simulated colleagues deliver the others, and their
 * progress is shown on the programme board as the days pass.
 */

export interface Workstream {
  /** Department ID (see `organisation.ts`). */
  department: string
  /** The career whose player owns this workstream, if any. */
  careerId?: string
  title: string
  owner: string
  /** What it hands to the rest of the programme. */
  delivers: string
  /** Days after the programme starts when a simulated colleague finishes it. */
  doneAfterDays: number
}

export const PROGRAMME = {
  id: 'manchester-office',
  title: 'Opening the Manchester office',
  brief:
    'Cobalt Ridge is opening a second office in Manchester on 1 September, for 25 staff: 20 new hires and 5 transfers. Every department has a part to play.',
  facts: [
    'Opening date: 1 September. 25 staff: 20 new hires and 5 transfers.',
    'New hires (People & Culture plan): 8 consultants, 6 analysts, 4 developers, 2 administrators.',
    'One-off programme budget: £420,000 (approved by the board), plus running costs.',
    'Lease (Operations): £96,000 a year; fit-out £60,000, depreciated over 5 years.',
  ],
  workstreams: [
    {
      department: 'people',
      title: 'Recruitment and onboarding',
      owner: 'Grace Okafor',
      delivers: 'The hiring plan and start dates',
      doneAfterDays: 2,
    },
    {
      department: 'operations',
      title: 'Premises and fit-out',
      owner: 'Helen Carter',
      delivers: 'The lease and the fitted office',
      doneAfterDays: 3,
    },
    {
      department: 'finance',
      careerId: 'office-admin-finance',
      title: 'Programme budget',
      owner: 'Finance & Admin',
      delivers: 'The consolidated budget and its tracking',
      doneAfterDays: 2,
    },
    {
      department: 'accounting',
      careerId: 'accounting',
      title: 'Accounting set-up',
      owner: 'Accounting',
      delivers: 'Cost centres, asset register and depreciation',
      doneAfterDays: 3,
    },
    {
      department: 'it',
      careerId: 'it-support',
      title: 'Technology and equipment',
      owner: 'IT Support',
      delivers: 'Laptops, network and accounts for 25 people',
      doneAfterDays: 3,
    },
    {
      department: 'marketing',
      careerId: 'digital-marketing',
      title: 'Launch campaign',
      owner: 'Marketing',
      delivers: 'The Manchester launch campaign',
      doneAfterDays: 4,
    },
    {
      department: 'data',
      careerId: 'data-analytics',
      title: 'Business case and performance',
      owner: 'Data & Insight',
      delivers: 'The business case and the measures of success',
      doneAfterDays: 2,
    },
    {
      department: 'engineering',
      careerId: 'software-development',
      title: 'System changes',
      owner: 'Engineering',
      delivers: 'Systems that support a second office',
      doneAfterDays: 4,
    },
  ] satisfies Workstream[],
} as const

export function workstreamFor(careerId: string): Workstream | undefined {
  return PROGRAMME.workstreams.find((w) => 'careerId' in w && w.careerId === careerId)
}
