import { describe, expect, test } from 'vitest'
import {
  closedDoor,
  easeDoor,
  stepDoor,
  type DoorDrive,
  type DoorMotion,
} from './doorMotion'

const drive = (patch: Partial<DoorDrive> = {}): DoorDrive => ({
  want: false,
  locked: false,
  seconds: 0.5,
  wait: 0.6,
  ...patch,
})

/** Runs the door for `seconds` in steps of 0.05 s, collecting its events. */
function run(m: DoorMotion, d: DoorDrive, seconds: number) {
  const events: string[] = []
  for (let t = 0; t < seconds - 1e-9; t += 0.05) {
    const step = stepDoor(m, d, 0.05)
    m = step.motion
    if (step.event) events.push(step.event)
  }
  return { m, events }
}

describe('doors', () => {
  test('opens when someone wants through, once', () => {
    const { m, events } = run(closedDoor(), drive({ want: true }), 1)
    expect(m.state).toBe('open')
    expect(m.open).toBe(1)
    expect(events).toEqual(['opens'])
  })

  test('half way open it is opening', () => {
    const { m } = run(closedDoor(), drive({ want: true }), 0.25)
    expect(m.state).toBe('opening')
    expect(m.open).toBeGreaterThan(0.3)
    expect(m.open).toBeLessThan(0.7)
  })

  test('waits before closing, then closes and latches', () => {
    const open = run(closedDoor(), drive({ want: true }), 1).m
    const waiting = run(open, drive(), 0.4)
    expect(waiting.m.state).toBe('open')
    expect(waiting.events).toEqual([])
    const shut = run(open, drive(), 2)
    expect(shut.m.state).toBe('closed')
    expect(shut.m.open).toBe(0)
    expect(shut.events).toEqual(['closes', 'shut'])
  })

  test('someone arriving while it closes opens it again', () => {
    const open = run(closedDoor(), drive({ want: true }), 1).m
    const closing = run(open, drive(), 0.8).m
    expect(closing.state).toBe('closing')
    const again = run(closing, drive({ want: true }), 0.3)
    expect(again.events).toEqual(['opens'])
    expect(again.m.open).toBeGreaterThan(closing.open)
  })

  test('a locked door stays shut and rattles once per try', () => {
    let m = closedDoor(true)
    const tried = run(m, drive({ want: true, locked: true }), 1)
    expect(tried.m.state).toBe('locked')
    expect(tried.m.open).toBe(0)
    expect(tried.events).toEqual(['rattle'])
    m = run(tried.m, drive({ locked: true }), 0.2).m
    expect(run(m, drive({ want: true, locked: true }), 0.2).events).toEqual(['rattle'])
  })

  test('unlocked, it opens', () => {
    const m = run(closedDoor(true), drive({ locked: true }), 0.1).m
    expect(run(m, drive({ want: true }), 1).m.state).toBe('open')
  })

  test('locked while open, it closes and stays locked', () => {
    const open = run(closedDoor(), drive({ want: true }), 1).m
    const { m } = run(open, drive({ want: true, locked: true }), 2)
    expect(m.state).toBe('locked')
    expect(m.open).toBe(0)
  })

  test('eased: still at the ends, moving in between', () => {
    expect(easeDoor(0)).toBe(0)
    expect(easeDoor(1)).toBe(1)
    expect(easeDoor(0.5)).toBeCloseTo(0.5)
    expect(easeDoor(0.1)).toBeLessThan(0.1)
  })
})
