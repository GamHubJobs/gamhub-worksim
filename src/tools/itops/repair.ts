/**
 * The Repair Bench: a laptop on the bench, worked on like a real one.
 *
 * Book it in, test it (a power-on test and the built-in diagnostics give the
 * symptoms a real machine gives), undo the base screws, lift the cover,
 * disconnect the battery before touching anything, take out the failed
 * part, fit the right replacement from the parts bin (the wrong model is
 * refused), reconnect, close up, and prove it with a power-on test. Only
 * then can it go back to its owner. Removing parts with the battery
 * connected is logged as risky.
 */
import { assetByTag, isComputer, logged, personById, type Result } from './model'
import type { Component, ItopsState, RepairJob } from './schema'

export const SCREWS = 8

export const COMPONENT_NAMES: Record<Component, string> = {
  battery: 'Battery',
  ram: 'Memory (SO-DIMM)',
  ssd: 'Storage (M.2 SSD)',
  fan: 'Cooling fan',
}

export const COMPONENT_INFO: Record<Component, string> = {
  battery:
    '4-cell 57 Wh lithium-ion battery, held by four screws and a connector cable to the mainboard.',
  ram: '16 GB DDR5-5600 SO-DIMM in the single memory slot, held by two side clips.',
  ssd: '512 GB M.2 2280 NVMe drive under a thermal pad, held by one screw.',
  fan: 'Blower fan with heat pipe over the processor; its cable plugs into the board.',
}

export interface Part {
  id: string
  component: Component
  name: string
  /** Fits this laptop (Vantage 14 G5). */
  fits: boolean
  why?: string
}

export const PARTS: Part[] = [
  {
    id: 'bat-g5',
    component: 'battery',
    name: 'Battery 57 Wh, Vantage 14 G5',
    fits: true,
  },
  {
    id: 'bat-g3',
    component: 'battery',
    name: 'Battery 45 Wh, Vantage 14 G3',
    fits: false,
    why: 'A G3 battery has a different shape and connector: it does not fit a G5.',
  },
  { id: 'ram-ddr5', component: 'ram', name: '16 GB DDR5-5600 SO-DIMM', fits: true },
  {
    id: 'ram-ddr4',
    component: 'ram',
    name: '16 GB DDR4-3200 SO-DIMM',
    fits: false,
    why: 'DDR4 is keyed differently from DDR5: the notch does not line up with the slot.',
  },
  {
    id: 'ram-dimm',
    component: 'ram',
    name: '16 GB DDR5 desktop DIMM',
    fits: false,
    why: 'A desktop DIMM is far too long for a laptop SO-DIMM slot.',
  },
  { id: 'ssd-nvme', component: 'ssd', name: '512 GB M.2 2280 NVMe SSD', fits: true },
  {
    id: 'ssd-sata25',
    component: 'ssd',
    name: '512 GB 2.5" SATA SSD',
    fits: false,
    why: 'This laptop has no 2.5" bay: only the M.2 slot.',
  },
  {
    id: 'ssd-2242',
    component: 'ssd',
    name: '256 GB M.2 2242 SSD',
    fits: false,
    why: 'A 2242 drive is too short to reach the 2280 screw post.',
  },
  {
    id: 'fan-g5',
    component: 'fan',
    name: 'Cooling fan assembly, Vantage 14 G5',
    fits: true,
  },
  {
    id: 'fan-tower',
    component: 'fan',
    name: '92 mm case fan (desktop)',
    fits: false,
    why: 'A desktop case fan does not fit a laptop blower housing.',
  },
]

export const TESTS = ['power', 'diagnostics', 'battery'] as const
export type TestId = (typeof TESTS)[number]
export const TEST_NAMES: Record<TestId, string> = {
  power: 'Power-on test',
  diagnostics: 'Built-in diagnostics',
  battery: 'Battery health (firmware)',
}

const fail = (state: ItopsState, ...problems: string[]): Result => ({ state, problems })

export function jobFor(state: ItopsState, tag: string): RepairJob | undefined {
  return state.repairs.find((j) => j.tag === tag)
}

function setJob(
  state: ItopsState,
  tag: string,
  change: (j: RepairJob) => RepairJob,
): ItopsState {
  return { ...state, repairs: state.repairs.map((j) => (j.tag === tag ? change(j) : j)) }
}

const caseClosed = (j: RepairJob) => !j.coverOff && j.screwsOut.length === 0

/** Laptops that can be booked in (reported faults first). */
export function bookable(state: ItopsState) {
  return state.assets
    .filter(
      (a) =>
        a.type === 'laptop' &&
        isComputer(a) &&
        a.status !== 'decommissioned' &&
        !jobFor(state, a.tag),
    )
    .sort((a, b) => Number(!!b.hwFault) - Number(!!a.hwFault))
}

export function bookIn(state: ItopsState, tag: string): Result {
  const asset = assetByTag(state, tag)
  if (!asset || asset.type !== 'laptop')
    return fail(state, 'Only laptops are repaired on this bench.')
  if (jobFor(state, tag)) return fail(state, `${tag} is already on the bench.`)
  const job: RepairJob = {
    tag: asset.tag,
    screwsOut: [],
    coverOff: false,
    batteryConnected: true,
    removed: [],
    results: [],
    verified: false,
  }
  return {
    state: logged(
      { ...state, repairs: [...state.repairs, job] },
      'Book in for repair',
      asset.tag,
    ),
    problems: [],
  }
}

/** What the machine does when tested, from its real fault. */
export function testResult(state: ItopsState, tag: string, test: TestId): string {
  const asset = assetByTag(state, tag)
  const job = jobFor(state, tag)
  const fault = asset?.hwFault ?? null
  const missing = job?.removed ?? []
  if (missing.length)
    return test === 'power'
      ? `Nothing happens: ${missing.map((c) => COMPONENT_NAMES[c].toLowerCase()).join(' and ')} not fitted.`
      : 'The machine cannot run tests with parts missing.'
  if (job && !job.batteryConnected && test !== 'power')
    return 'The battery is disconnected: reconnect it first.'
  switch (test) {
    case 'power':
      return fault === 'ram'
        ? 'Power light on, fans spin, then three short beeps repeating and no picture. (Beep code 3: memory not detected or failed.)'
        : fault === 'ssd'
          ? 'Logo appears, then “No bootable device found. Press F1 to retry.”'
          : fault === 'fan'
            ? 'Boots, then shuts down after about a minute with “Fan error: the system has shut down to prevent damage.”'
            : fault === 'battery'
              ? 'Boots on the charger. The charge light blinks amber; it switches off as soon as the charger is unplugged.'
              : 'Boots to the Windows sign-in screen. Fans quiet, no errors.'
    case 'diagnostics':
      if (fault === 'ram')
        return 'Diagnostics cannot start: the machine does not complete its power-on self-test (memory).'
      return [
        `Memory: PASS`,
        fault === 'ssd'
          ? 'Storage: FAIL — NVMe drive not detected (2000-0141)'
          : 'Storage: PASS',
        fault === 'battery'
          ? 'Battery: FAIL — health 31%, swelling sensor tripped (2000-0131)'
          : 'Battery: PASS',
        fault === 'fan' ? 'Fan: FAIL — no speed detected (2000-0511)' : 'Fan: PASS',
      ].join(' · ')
    case 'battery':
      return fault === 'ram'
        ? 'Firmware setup does not open: the machine does not finish its self-test.'
        : fault === 'battery'
          ? 'Design capacity 57 Wh · full charge 17.6 Wh (31%) · status: Replace now'
          : 'Design capacity 57 Wh · full charge 54.1 Wh (95%) · status: Good'
  }
}

export function runTest(state: ItopsState, tag: string, test: TestId): Result {
  const job = jobFor(state, tag)
  if (!job) return fail(state, 'Book the laptop in first.')
  if (!caseClosed(job))
    return fail(state, 'Close the case and refit every screw before powering it on.')
  const result = testResult(state, tag, test)
  const passed = test === 'power' && result.startsWith('Boots to the Windows sign-in')
  return {
    state: logged(
      setJob(state, tag, (j) => ({
        ...j,
        results: [...j.results, `${TEST_NAMES[test]}: ${result}`].slice(-12),
        verified: test === 'power' ? passed : j.verified,
      })),
      'Test',
      `${tag}: ${TEST_NAMES[test]}`,
      result,
    ),
    problems: [],
    note: result,
  }
}

export function toggleScrew(state: ItopsState, tag: string, screw: number): Result {
  const job = jobFor(state, tag)
  if (!job) return fail(state, 'Book the laptop in first.')
  if (job.coverOff) return fail(state, 'Refit the bottom cover before the screws.')
  const out = job.screwsOut.includes(screw)
  return {
    state: setJob(state, tag, (j) => ({
      ...j,
      verified: false,
      screwsOut: out ? j.screwsOut.filter((s) => s !== screw) : [...j.screwsOut, screw],
    })),
    problems: [],
  }
}

export function setCover(state: ItopsState, tag: string, off: boolean): Result {
  const job = jobFor(state, tag)
  if (!job) return fail(state, 'Book the laptop in first.')
  if (off && job.screwsOut.length < SCREWS)
    return fail(
      state,
      `The cover is still held by ${SCREWS - job.screwsOut.length} screw${SCREWS - job.screwsOut.length === 1 ? '' : 's'}. Prying it would crack the clips.`,
    )
  if (!off && job.removed.length)
    return fail(
      state,
      `Fit the ${job.removed.map((c) => COMPONENT_NAMES[c].toLowerCase()).join(' and ')} before closing the case.`,
    )
  return {
    state: logged(
      setJob(state, tag, (j) => ({ ...j, coverOff: off, verified: false })),
      off ? 'Remove cover' : 'Refit cover',
      tag,
    ),
    problems: [],
  }
}

export function setBattery(state: ItopsState, tag: string, connected: boolean): Result {
  const job = jobFor(state, tag)
  if (!job?.coverOff) return fail(state, 'Open the case first.')
  if (connected && job.removed.includes('battery'))
    return fail(state, 'Fit a battery first.')
  return {
    state: logged(
      setJob(state, tag, (j) => ({ ...j, batteryConnected: connected, verified: false })),
      connected ? 'Reconnect battery' : 'Disconnect battery',
      tag,
    ),
    problems: [],
  }
}

export function removePart(state: ItopsState, tag: string, component: Component): Result {
  const job = jobFor(state, tag)
  if (!job?.coverOff) return fail(state, 'Open the case first.')
  if (job.removed.includes(component))
    return fail(state, `The ${COMPONENT_NAMES[component].toLowerCase()} is already out.`)
  if (job.batteryConnected)
    return {
      state: logged(
        state,
        'Unsafe removal attempt',
        `${tag}: ${COMPONENT_NAMES[component]}`,
        'Tried to remove a part with the battery still connected: a slip can short the board. Disconnect the battery first.',
        true,
      ),
      problems: [
        'Disconnect the battery first: working on a powered board can short it and damage the part.',
      ],
    }
  return {
    state: logged(
      setJob(state, tag, (j) => ({
        ...j,
        removed: [...j.removed, component],
        verified: false,
      })),
      'Remove part',
      `${tag}: ${COMPONENT_NAMES[component]}`,
    ),
    problems: [],
  }
}

export function installPart(state: ItopsState, tag: string, partId: string): Result {
  const job = jobFor(state, tag)
  const part = PARTS.find((p) => p.id === partId)
  if (!job || !part) return fail(state, 'Choose a part.')
  if (!job.removed.includes(part.component))
    return fail(
      state,
      `The ${COMPONENT_NAMES[part.component].toLowerCase()} slot is not empty: remove the old one first.`,
    )
  if (!part.fits) return fail(state, part.why ?? 'That part does not fit this laptop.')
  const asset = assetByTag(state, tag)
  const fixed = asset?.hwFault === part.component
  let next = setJob(state, tag, (j) => ({
    ...j,
    removed: j.removed.filter((c) => c !== part.component),
    verified: false,
  }))
  if (fixed)
    next = {
      ...next,
      assets: next.assets.map((a) => (a.tag === tag ? { ...a, hwFault: null } : a)),
    }
  return {
    state: logged(
      next,
      'Fit part',
      `${tag}: ${part.name}`,
      fixed ? 'Replaced the failed part.' : 'Replaced a part that was working.',
    ),
    problems: [],
  }
}

export function finishRepair(state: ItopsState, tag: string): Result {
  const job = jobFor(state, tag)
  const asset = assetByTag(state, tag)
  if (!job || !asset) return fail(state, 'Book the laptop in first.')
  if (!caseClosed(job)) return fail(state, 'Close the case and refit every screw.')
  if (!job.batteryConnected) return fail(state, 'Reconnect the battery.')
  if (!job.verified)
    return fail(state, 'Prove the repair: run a power-on test that boots to Windows.')
  const holder = asset.assignedTo ? personById(state, asset.assignedTo)?.name : null
  return {
    state: logged(
      { ...state, repairs: state.repairs.filter((j) => j.tag !== tag) },
      'Repair complete',
      tag,
      holder ? `Returned to ${holder}.` : 'Back in stock.',
    ),
    problems: [],
    note: holder ? `${tag} is fixed and back with ${holder}.` : `${tag} is fixed.`,
  }
}
