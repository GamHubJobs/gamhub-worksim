/**
 * Who works on Northbank's projects (all fictional). The site team runs
 * the construction site; the design office's engineers check revisions.
 * Office colleagues' trust is kept by the department's person IDs
 * (`manager`, `hr`, …); the site team are named here.
 */

export interface SitePerson {
  id: string
  name: string
  role: string
  /** What they do on site, for their routine. */
  job:
    | 'manage'
    | 'supervise'
    | 'survey'
    | 'dig'
    | 'lift'
    | 'fix'
    | 'lay'
    | 'carry'
    | 'wire'
    | 'pipe'
    | 'inspect'
}

export const SITE_TEAM: SitePerson[] = [
  { id: 'manager-site', name: 'Sam Okafor', role: 'Construction Manager', job: 'manage' },
  { id: 'supervisor', name: 'Bev Kowalczyk', role: 'Site Supervisor', job: 'supervise' },
  { id: 'surveyor', name: 'Hamid Rahimi', role: 'Site Surveyor', job: 'survey' },
  {
    id: 'operator',
    name: 'Dev Sharma',
    role: 'Plant Operator (excavator and crane)',
    job: 'dig',
  },
  { id: 'fixer', name: 'Marta Nowak', role: 'Steel Fixer', job: 'fix' },
  { id: 'bricklayer', name: 'Kwame Asante', role: 'Bricklayer', job: 'lay' },
  { id: 'labourer', name: 'Ollie Brennan', role: 'Labourer', job: 'carry' },
  { id: 'electrician', name: 'Jess Lin', role: 'Electrician', job: 'wire' },
  {
    id: 'plumber',
    name: 'Tom Ashworth',
    role: 'Plumber and Heating Engineer',
    job: 'pipe',
  },
]

/** The design office's checkers (the department's team). */
export const REVIEWERS = {
  structural: { name: 'Ingrid Sorensen', role: 'Structural Engineer' },
  services: { name: 'Kofi Mensah', role: 'Electrical Engineer' },
  manager: { name: 'Helena Okoye', role: 'Engineering Manager' },
} as const

/** Who an issue's speaker is, for the dialogue (the client comes from the brief). */
export function speaker(id: string, client: string): { name: string; role: string } {
  if (id === 'client') return { name: client, role: 'The client' }
  if (id === 'safety')
    return { name: 'Martin Oyelaran', role: 'Health, Safety and Training Manager' }
  return SITE_TEAM.find((p) => p.id === id) ?? { name: 'The site team', role: '' }
}
