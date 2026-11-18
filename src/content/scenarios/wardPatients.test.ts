import { describe, expect, it } from 'vitest'
import { sampleClinical } from '../../tools/clinical/data'
import { SCENARIOS } from './index'

/**
 * The ward's scenarios and Ward Systems tell the same story: a patient the
 * scenario puts in a bed the hospital's systems know is that bed's patient
 * there, at the age their date of birth gives in the game's year (the ward
 * round's patient, born May 1951, is 74).
 */
const YEAR = 2025

describe("the ward's scenarios agree with Ward Systems", () => {
  it("a patient in a bed the systems know is that bed's patient, at their age", () => {
    const clinical = sampleClinical()
    let checked = 0
    for (const scenario of SCENARIOS.filter((s) => s.workplace === 'ward')) {
      for (const person of scenario.cast) {
        const m = /^Patient, (\d+), bed ([0-9A-Z]+-\d+)/.exec(person.role)
        if (!m) continue
        const bed = clinical.beds.find((b) => b.id === m[2])
        const patient = clinical.patients.find((p) => p.id === bed?.patientId)
        if (!patient) continue
        checked++
        expect(person.name, `${scenario.id} ${m[2]}`).toBe(patient.name)
        const born = new Date(patient.dob)
        const age = YEAR - born.getFullYear()
        expect(Number(m[1]), `${scenario.id} ${person.name}`).toBe(age)
      }
    }
    // The admission at 4A-4 (Mr Whitfield) is one of them.
    expect(checked).toBeGreaterThanOrEqual(1)
  })
})
