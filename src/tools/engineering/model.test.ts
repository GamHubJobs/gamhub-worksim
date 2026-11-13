import { describe, expect, it } from 'vitest'
import { sampleEngineering } from './data'
import {
  analyseCircuit,
  beamCheck,
  closeWorkOrder,
  decidePart,
  doStep,
  flagSample,
  gearRatio,
  lightestSection,
  outputRpm,
  partConforms,
  SAFE_ORDER,
  schedule,
  setComponent,
  setStages,
} from './model'
import { EngineeringStateSchema } from './schema'

const start = () => sampleEngineering()

describe('Works Desk', () => {
  it('has valid practice data', () => {
    expect(() => EngineeringStateSchema.parse(start())).not.toThrow()
  })

  it('analyses a series LED circuit with Ohm’s law', () => {
    const bad = analyseCircuit(start().circuits[0])
    // (12 − 2) / 100 = 100 mA: far over the LED's 30 mA, and 1 W in a 0.125 W resistor.
    expect(bad.current).toBeCloseTo(0.1)
    expect(bad.problems).toHaveLength(2)
    const s = setComponent(start(), 'C-1', 'r1', 560, 0.25).state
    const good = analyseCircuit(s.circuits[0])
    expect(good.current * 1000).toBeCloseTo(17.857, 2)
    expect(good.parts[0].power).toBeCloseTo(0.1786, 3)
    expect(good.problems).toEqual([])
  })

  it('checks a beam and finds the lightest section that passes', () => {
    const beam = start().beams[0]
    expect(beamCheck(beam, 'NB-150').passes).toBe(false)
    expect(beamCheck(beam, 'NB-200')).toMatchObject({
      moment: 30,
      stress: 157.9,
      passes: true,
    })
    expect(lightestSection(beam)).toBe('NB-200')
  })

  it('works out gear ratios', () => {
    expect(outputRpm(start().gears[0])).toBe(725)
    const s = setStages(start(), 'G-1', [[20, 100]]).state
    expect(gearRatio(s.gears[0])).toBe(5)
    expect(outputRpm(s.gears[0])).toBe(290)
  })

  it('finds the critical path', () => {
    const plan = schedule(start().plans[0])
    expect(plan.finish).toBe(24)
    expect(plan.critical).toEqual(['A', 'B', 'E', 'F'])
    expect(plan.rows.find((r) => r.id === 'C')?.float).toBe(1)
  })

  it('enforces lockout-tagout before any repair', () => {
    let s = start()
    expect(doStep(s, 'WO-311', 'repair').problems[0]).toMatch(/Never work on equipment/)
    for (const step of SAFE_ORDER) s = doStep(s, 'WO-311', step).state
    expect(closeWorkOrder(s, 'WO-311', 92, 'Replaced the bearing').problems[0]).toMatch(
      /not fixed/,
    )
    s = closeWorkOrder(
      s,
      'WO-311',
      64,
      'Replaced the drive-end bearing; runs quiet at 64 °C.',
    ).state
    expect(s.workOrders[0].status).toBe('closed')
  })

  it('inspects parts against tolerances, and flags samples', () => {
    const s = start()
    expect(
      ['S-01', 'S-02', 'S-03', 'S-04'].map((p) => partConforms(s, 'DW-12', p)),
    ).toEqual([true, false, true, false])
    expect(
      decidePart(s, 'DW-12', 'S-02', 'reject').state.drawings[0].parts[1].decision,
    ).toBe('reject')
    expect(flagSample(s, 'E-1', 'x').problems).toHaveLength(1)
    expect(
      flagSample(s, 'E-1', 'Told the environment manager; stopping the discharge.').state
        .samples[0].flagged,
    ).toBe(true)
  })
})
