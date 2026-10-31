import { afterEach, describe, expect, it } from 'vitest'
import { CAREERS, SKILLS } from '../careers'
import { ASSIGNMENTS } from '../assignments'
import { conversationWith } from '../../game/conversations'
import { newProfileData } from '../../game/career'
import { dialogueFor } from '../../game/office'
import {
  activeDepartment,
  DEPARTMENTS,
  fill,
  findPerson,
  getPerson,
  setActiveCareer,
} from '.'

afterEach(() => setActiveCareer('office-admin-finance'))

describe('departments', () => {
  it('every career has a department, valid skills and its own tasks', () => {
    for (const career of CAREERS) {
      const department = DEPARTMENTS[career.id]
      expect(department, career.id).toBeDefined()
      expect(department.manager.id).toBe('manager')
      expect(department.senior.id).toBe('senior')
      for (const skill of career.skills) {
        expect(
          SKILLS.map((s) => s.id),
          `${career.id}: ${skill}`,
        ).toContain(skill)
      }
      expect(
        ASSIGNMENTS.some((a) => a.careerId === career.id),
        career.id,
      ).toBe(true)
    }
  })

  it('resolves roles to the active department’s people', () => {
    setActiveCareer('office-admin-finance')
    expect(getPerson('manager').name).toBe('Priya Raman')
    expect(getPerson('senior').name).toBe('Marcus Webb')
    // Shared staff are the same everywhere.
    expect(getPerson('reception').name).toBe('Nina Patel')
    expect(findPerson('nobody')).toBeUndefined()
  })

  it('fills in role names in text', () => {
    expect(fill('Ask {manager} or {seniorFull} in {department}.')).toBe(
      'Ask Priya or Marcus Webb in Finance & Administration.',
    )
  })

  it('falls back to Finance for an unknown career', () => {
    setActiveCareer('not-a-career')
    expect(activeDepartment().careerId).toBe('office-admin-finance')
  })

  it('fills names into dialogue', () => {
    const profile = newProfileData('Alex', 0)
    const dialogue = dialogueFor('manager', profile)
    expect(dialogue.title).toBe('Priya Raman')
    const senior = conversationWith(profile, 'senior').dialogue
    expect(senior.lines.join(' ')).not.toContain('{')
    expect(senior.choices?.map((c) => c.label).join(' ')).toContain('Marcus')
  })
})
