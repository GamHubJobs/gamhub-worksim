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
import { SHARED_PEOPLE, type Person } from '../company'
import { accounting } from './accounting'
import { finance } from './finance'
import type { Department } from './types'

export type { Department } from './types'

export const DEPARTMENTS: Record<string, Department> = {
  [finance.careerId]: finance,
  [accounting.careerId]: accounting,
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
  return SHARED_PEOPLE[id]
}

/** A person by ID or role ("manager" is the active department's manager). */
export function getPerson(id: string): Person {
  return findPerson(id) ?? activeDepartment().manager
}

const first = (person: Person) => person.name.split(' ')[0]

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
}
