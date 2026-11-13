/**
 * Departments, and the people the game talks about by role.
 *
 * Game rules refer to the player's manager and senior colleague by role
 * ("manager", "senior"); which real people those are depends on the career
 * being played. The active career is set when a career save is loaded
 * (`setActiveCareer`), so every dialogue, email and the office itself use
 * the right department. Shared staff (reception, facilities, HR) are the same
 * in every department.
 */
import { COMPANY, SHARED_PEOPLE, type Employer, type Person } from '../company'
import { accounting } from './accounting'
import { finance } from './finance'
import { data } from './data'
import { engineering } from './engineering'
import { itSupport } from './itSupport'
import { marketing } from './marketing'
import { healthcare } from './healthcare'
import { legal } from './legal'
import { engineeringServices } from './engineeringServices'
import type { Department } from './types'

export type { Department } from './types'

export const DEPARTMENTS: Record<string, Department> = {
  [finance.careerId]: finance,
  [accounting.careerId]: accounting,
  [itSupport.careerId]: itSupport,
  [marketing.careerId]: marketing,
  [data.careerId]: data,
  [engineering.careerId]: engineering,
  [healthcare.careerId]: healthcare,
  [legal.careerId]: legal,
  [engineeringServices.careerId]: engineeringServices,
}

let activeCareerId = finance.careerId

/** Called when a career save is loaded. */
export function setActiveCareer(careerId: string): void {
  activeCareerId = DEPARTMENTS[careerId] ? careerId : finance.careerId
}

export function activeDepartment(): Department {
  return DEPARTMENTS[activeCareerId] ?? finance
}

export function departmentFor(careerId: string): Department {
  return DEPARTMENTS[careerId] ?? finance
}

/** A person by ID or role, or undefined if there is nobody by that ID. */
export function findPerson(id: string): Person | undefined {
  const department = activeDepartment()
  if (id === 'manager') return department.manager
  if (id === 'senior') return department.senior
  return department.sharedPeople?.[id] ?? SHARED_PEOPLE[id]
}

/** An area's name and description in the active workplace (a ward calls reception the ward desk). */
export function placeText(spot: { id: string; name: string; description: string }): {
  name: string
  description: string
} {
  const own = activeDepartment().places?.[spot.id as 'desk']
  return own ?? { name: spot.name, description: spot.description }
}

/** Whether the walkable workplace is a hospital ward. */
export const onWard = (): boolean => activeDepartment().workplace === 'ward'

/** The organisation a career works for (Cobalt Ridge unless its department says otherwise). */
export function employerFor(careerId: string): Employer {
  return DEPARTMENTS[careerId]?.employer ?? COMPANY
}

/** The organisation of the career being played. */
export function activeEmployer(): Employer {
  return activeDepartment().employer ?? COMPANY
}

/** Whether a career works at Cobalt Ridge (the office, its programme and its story world). */
export const atCobaltRidge = (careerId: string): boolean =>
  !DEPARTMENTS[careerId]?.employer

/** A person by ID or role ("manager" is the active department's manager). */
export function getPerson(id: string): Person {
  return findPerson(id) ?? activeDepartment().manager
}

const first = (person: Person) => person.name.split(' ')[0]

/** Reception or facilities at the department's employer. */
const shared = (department: Department, id: string): Person =>
  department.sharedPeople?.[id] ?? SHARED_PEOPLE[id]

/**
 * Fills in role names in a text: {manager} and {senior} become first names,
 * {managerFull} and {seniorFull} full names, {department} the team's name and
 * {director} who the manager reports to.
 */
export function fill(text: string, department: Department = activeDepartment()): string {
  return text
    .replaceAll('{managerFull}', department.manager.name)
    .replaceAll('{seniorFull}', department.senior.name)
    .replaceAll('{manager}', first(department.manager))
    .replaceAll('{senior}', first(department.senior))
    .replaceAll('{department}', department.name)
    .replaceAll('{director}', department.director)
    .replaceAll('{receptionFull}', shared(department, 'reception').name)
    .replaceAll('{reception}', first(shared(department, 'reception')))
    .replaceAll('{facilitiesFull}', shared(department, 'facilities').name)
    .replaceAll('{facilities}', first(shared(department, 'facilities')))
    .replaceAll('{employer}', (department.employer ?? COMPANY).shortName)
}
