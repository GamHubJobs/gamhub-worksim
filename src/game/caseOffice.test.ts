import { describe, expect, it } from 'vitest'
import { getCase } from '../content/cases'
import { HOURS } from '../content/workday'
import { newProfileData, type ProfileData } from './career'
import { arriveCase, checkCases } from './cases'
import { programmeBoard } from './programme'
import { caseNotices, computerNotices } from './notices'
import { dialogueFor } from './office'

function profileFor(careerId: string, levelId?: string): ProfileData {
  const base = newProfileData('Alex', 1, careerId)
  return {
    ...base,
    ...(levelId ? { levelId } : {}),
    work: { ...base.work, minute: HOURS.start + 60 },
  }
}

/** Moves the office clock on by some minutes (same day). */
function later(profile: ProfileData, minutes: number): ProfileData {
  return { ...profile, work: { ...profile.work, minute: profile.work.minute + minutes } }
}

describe('cases in the office', () => {
  const client = getCase('fa-short-delivery')!
  const meeting = getCase('mtg-fa-team')!

  it('reminds the player when a case is close to its deadline, and opens it', () => {
    const arrived = arriveCase(profileFor(client.careerId), client, 1)
    expect(caseNotices(arrived)).toEqual([])
    const soon = later(arrived, client.deadlineHours * 60 - 45)
    const [notice] = caseNotices(soon)
    expect(notice.text).toBe(`“${client.title}” is due in 45 min.`)
    expect(notice.action).toEqual({ label: 'Open the case', caseId: client.id })
    expect(computerNotices(soon).map((n) => n.id)).toContain(`case-due:${client.id}`)
  })

  it('reminds the player of a case meeting before and while it runs', () => {
    const arrived = arriveCase(profileFor(meeting.careerId), meeting, 1)
    const start = meeting.meeting!.inHours * 60
    expect(caseNotices(later(arrived, start - 60))).toEqual([])
    expect(caseNotices(later(arrived, start - 20))[0].text).toContain('starts in 20 min')
    expect(caseNotices(later(arrived, start + 5))[0].text).toContain('has started')
  })

  it('lists open cases on the team whiteboard', () => {
    const arrived = arriveCase(profileFor(client.careerId), client, 1)
    const board = dialogueFor('whiteboard', arrived)
    expect(board.lines.at(-1)).toBe(`Case: ${client.title}: due in 6 h`)
    expect(board.actions.map((a) => a.label)).toContain('Open Cases')
    expect(
      dialogueFor('whiteboard', profileFor(client.careerId)).actions.map((a) => a.label),
    ).not.toContain('Open Cases')
  })

  it('shows the company indicators and the programme on the notice board', () => {
    const fresh = profileFor('it-support', 'senior-support-analyst')
    const lines = dialogueFor('noticeboard', fresh).lines
    expect(lines.at(-1)).toContain('Company dashboard: client satisfaction 70')
    const started = arriveCase(fresh, getCase('prog-it-equipment')!, 1)
    expect(dialogueFor('noticeboard', started).lines.at(-1)).toBe(
      'Opening the Manchester office: 0 of 8 workstreams done.',
    )
  })
})

describe('a save that mentions a case the game no longer has', () => {
  it('is ignored everywhere instead of breaking the game', () => {
    const base = profileFor('office-admin-finance')
    const profile: ProfileData = {
      ...base,
      work: {
        ...base.work,
        cases: {
          retired: {
            caseId: 'retired',
            version: 1,
            status: 'open',
            arrivedAt: 0,
            due: 30,
            answers: {},
            files: {},
          },
        },
      },
    }
    expect(caseNotices(profile)).toEqual([])
    expect(() => checkCases(later(profile, 600), 2)).not.toThrow()
    expect(() => programmeBoard(profile)).not.toThrow()
    expect(() => dialogueFor('whiteboard', profile)).not.toThrow()
    expect(() => dialogueFor('noticeboard', profile)).not.toThrow()
  })
})
