import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { HOURS } from '../content/workday'
import { newProfileData, recordSubmission, type ProfileData } from './career'
import { absoluteTime, formatMoment, formatTime, nextWorkday, weekdayName } from './clock'
import { dueTimeFor } from './deadlines'
import type { GradeResult } from './grading'
import { trustOf } from './relationships'
import {
  afterSubmission,
  attendMeeting,
  endDay,
  haveLunch,
  isLeavingEarly,
  lunchAvailability,
  meetingState,
  meetingsOn,
  nextMeeting,
  passTime,
  requestExtension,
  startNextDay,
  takeCoffeeBreak,
} from './workday'
import { overnight, workPace } from './wellbeing'

const supplies = getAssignment('supplies-order')!

function at(profile: ProfileData, minute: number): ProfileData {
  return { ...profile, work: { ...profile.work, minute } }
}

function fresh(): ProfileData {
  return newProfileData('Alex Morgan', 0)
}

function grade(score: number): GradeResult {
  const rating = score < 70 ? 'fail' : score >= 90 ? 'excellent' : 'good'
  return {
    score,
    rating,
    passed: rating !== 'fail',
    earned: score,
    maxPoints: 100,
    checks: [],
  }
}

function started(profile: ProfileData): ProfileData {
  return {
    ...profile,
    assignments: {
      [supplies.id]: {
        assignmentId: supplies.id,
        assignmentVersion: 1,
        documentId: '00000000-0000-4000-8000-000000000000',
        startedAt: 0,
        completedSteps: [],
        attempts: [],
      },
    },
  }
}

describe('office calendar', () => {
  it('formats times and days', () => {
    expect(formatTime(9 * 60 + 5)).toBe('9:05 am')
    expect(formatTime(12 * 60 + 30)).toBe('12:30 pm')
    expect(formatTime(0)).toBe('12:00 am')
    expect(weekdayName(1)).toBe('Monday')
    expect(weekdayName(5)).toBe('Friday')
    expect(nextWorkday(5)).toBe(8)
    expect(formatMoment(absoluteTime(2, 12 * 60), 1)).toBe('tomorrow at 12:00 pm')
  })

  it('gives morning tasks a same-day deadline and later ones until midday tomorrow', () => {
    expect(dueTimeFor(absoluteTime(1, 9 * 60))).toBe(absoluteTime(1, HOURS.end))
    expect(dueTimeFor(absoluteTime(1, 14 * 60))).toBe(absoluteTime(2, 12 * 60))
    // Friday afternoon work is due on Monday.
    expect(dueTimeFor(absoluteTime(5, 14 * 60))).toBe(absoluteTime(8, 12 * 60))
  })
})

describe('the working day', () => {
  it('starts on Monday at 8:50 with the first task due at 5:30 pm', () => {
    const { work } = fresh()
    expect(work.day).toBe(1)
    expect(work.minute).toBe(HOURS.arrival)
    expect(work.deadlines[supplies.id]).toEqual({
      due: absoluteTime(1, HOURS.end),
      status: 'open',
      extended: false,
    })
  })

  it('uses energy while working and records the time worked', () => {
    const after = passTime(fresh(), 60, 'work')
    expect(after.work.minute).toBe(HOURS.arrival + 60)
    expect(after.work.today.workMinutes).toBe(60)
    expect(after.work.wellbeing.energy).toBeLessThan(fresh().work.wellbeing.energy)
    expect(after.work.wellbeing.stress).toBeGreaterThan(fresh().work.wellbeing.stress)
  })

  it('drains energy faster after two hours without a break', () => {
    const rested = passTime(at(fresh(), 10 * 60), 60, 'work')
    // Nobody has had a break since arriving at 8:50.
    const longStretch = passTime(at(fresh(), 12 * 60), 60, 'work')
    const drop = (p: ProfileData) =>
      fresh().work.wellbeing.energy - p.work.wellbeing.energy
    expect(drop(longStretch)).toBeGreaterThan(drop(rested))
  })

  it('lets the player join the stand-up and moves time to its end', () => {
    const profile = at(fresh(), 9 * 60 + 10)
    const [standup] = meetingsOn(1)
    expect(meetingState(profile.work, standup)).toBe('open')
    const after = attendMeeting(profile, 'standup')
    expect(after.work.today.meetings.standup).toBe('attended')
    expect(after.work.minute).toBe(9 * 60 + 30)
    expect(after.work.today.log.at(-1)?.text).toContain('Joined the team stand-up')
  })

  it('counts joining after the start as late', () => {
    const after = attendMeeting(at(fresh(), 9 * 60 + 20), 'standup')
    expect(after.work.today.meetings.standup).toBe('late')
  })

  it('records a missed meeting gently: a little trust and reputation', () => {
    const before = fresh()
    const after = passTime(before, 60, 'work')
    expect(after.work.today.meetings.standup).toBe('missed')
    expect(trustOf(after.work, 'manager')).toBe(trustOf(before.work, 'manager') - 3)
    expect(after.work.reputation).toBe(before.work.reputation - 2)
    expect(nextMeeting(after.work)).toBeNull()
  })

  it('has weekly planning on Wednesday and a one-to-one on Friday', () => {
    expect(meetingsOn(3).map((m) => m.id)).toEqual(['standup', 'planning'])
    expect(meetingsOn(5).map((m) => m.id)).toEqual(['standup', 'one-to-one'])
    expect(meetingsOn(6)).toEqual([])
  })

  it('offers lunch between 11:45 and 2 pm and restores energy', () => {
    expect(lunchAvailability(fresh().work)).toBe('too-early')
    const noon = at(fresh(), 12 * 60 + 30)
    const tired = {
      ...noon,
      work: { ...noon.work, wellbeing: { ...noon.work.wellbeing, energy: 40 } },
    }
    expect(lunchAvailability(tired.work)).toBe('available')
    const after = haveLunch(tired)
    expect(after.work.today.lunch).toBe(true)
    expect(after.work.minute).toBe(12 * 60 + 30 + 45)
    expect(after.work.wellbeing.energy).toBeGreaterThan(60)
    expect(lunchAvailability(after.work)).toBe('taken')
    expect(haveLunch(after)).toBe(after)
  })

  it('notices a skipped lunch', () => {
    const after = passTime(at(fresh(), 13 * 60 + 50), 20, 'work')
    expect(after.work.today.log.map((e) => e.text)).toContain('Skipped lunch')
  })

  it('makes breaks most useful when they are needed', () => {
    const base = at(fresh(), 11 * 60)
    const tired = {
      ...base,
      work: { ...base.work, wellbeing: { ...base.work.wellbeing, energy: 50 } },
    }
    const afterLongStretch = takeCoffeeBreak(tired)
    const again = takeCoffeeBreak(afterLongStretch)
    const gain1 = afterLongStretch.work.wellbeing.energy - 50
    const gain2 = again.work.wellbeing.energy - afterLongStretch.work.wellbeing.energy
    expect(gain1).toBeGreaterThan(gain2)
    expect(again.work.today.breaks).toBe(2)
    expect(again.work.minute).toBe(11 * 60 + 20)
  })

  it('marks a missed deadline once, with consequences', () => {
    const before = at(fresh(), HOURS.end - 5)
    const after = passTime(before, 10, 'work')
    expect(after.work.deadlines[supplies.id].status).toBe('late')
    expect(after.work.reputation).toBeLessThan(before.work.reputation)
    const later = passTime(after, 10, 'work')
    expect(later.work.reputation).toBe(after.work.reputation)
  })

  it('allows one extension when asked before the deadline', () => {
    const extended = requestExtension(at(fresh(), 14 * 60), supplies.id)
    expect(extended.work.deadlines[supplies.id]).toMatchObject({
      due: absoluteTime(2, HOURS.end),
      extended: true,
    })
    expect(requestExtension(extended, supplies.id)).toBe(extended)
  })

  it('records an on-time delivery and gives the next task a deadline', () => {
    const profile = started(at(fresh(), 10 * 60))
    const result = recordSubmission(profile, supplies, grade(95), 0)
    const after = afterSubmission(result.profile, supplies, grade(95), result.reward)
    expect(after.work.deadlines[supplies.id].status).toBe('met')
    expect(after.work.deadlines['expense-summary']).toEqual({
      due: absoluteTime(1, HOURS.end),
      status: 'open',
      extended: false,
    })
    expect(after.work.reputation).toBeGreaterThan(profile.work.reputation)
    expect(after.work.today.submissions).toBe(1)
  })

  it('ends the day at closing time', () => {
    const after = passTime(at(fresh(), HOURS.closing - 10), 30, 'work')
    expect(after.work.minute).toBe(HOURS.closing)
    expect(after.work.dayOver).toBe(true)
    expect(after.work.history[0].overtimeMinutes).toBe(HOURS.closing - HOURS.end)
  })

  it('treats going home before 5 pm with open work as leaving early', () => {
    const early = at(fresh(), 15 * 60)
    expect(isLeavingEarly(early)).toBe(true)
    expect(endDay(early).work.reputation).toBe(early.work.reputation - 2)
    expect(isLeavingEarly(at(fresh(), HOURS.end))).toBe(false)
  })

  it('starts the next day rested, skipping the weekend after Friday', () => {
    const friday = { ...fresh(), work: { ...fresh().work, day: 5, minute: HOURS.end } }
    const home = endDay(friday)
    expect(home.work.dayOver).toBe(true)
    const monday = startNextDay(home)
    expect(monday.work.day).toBe(8)
    expect(monday.work.minute).toBe(HOURS.arrival)
    expect(monday.work.dayOver).toBe(false)
    expect(monday.work.today.log[0].text).toBe('Arrived at the office')
    // Monday's task deadline passed while the player was away.
    expect(monday.work.deadlines[supplies.id].status).toBe('late')
    expect(monday.work.history).toHaveLength(1)
  })

  it('does nothing once the day is over', () => {
    const home = endDay(at(fresh(), HOURS.end))
    expect(passTime(home, 60, 'work')).toBe(home)
    expect(takeCoffeeBreak(home)).toBe(home)
  })
})

describe('wellbeing', () => {
  const tired = { energy: 30, stress: 60, engagement: 50, fatigue: 50 }

  it('recovers overnight, and much more over a weekend', () => {
    const night = overnight(tired, { overtimeMinutes: 0, lunch: true }, 1)
    const weekend = overnight(tired, { overtimeMinutes: 0, lunch: true }, 3)
    expect(night.energy).toBeGreaterThan(tired.energy)
    expect(weekend.fatigue).toBeLessThan(night.fatigue)
    expect(weekend.stress).toBeLessThan(night.stress)
  })

  it('builds fatigue from long days and skipped lunches', () => {
    const normal = overnight(tired, { overtimeMinutes: 0, lunch: true }, 1)
    const long = overnight(tired, { overtimeMinutes: 90, lunch: false }, 1)
    expect(long.fatigue).toBeGreaterThan(normal.fatigue)
    expect(long.energy).toBeLessThan(normal.energy)
  })

  it('slows work down when tired, but never stops it', () => {
    expect(workPace({ ...tired, energy: 80 })).toBe(1)
    expect(workPace({ ...tired, energy: 30 })).toBe(1.2)
    expect(workPace({ ...tired, energy: 5 })).toBe(1.5)
  })
})
