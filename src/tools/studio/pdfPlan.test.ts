import { jsPDF } from 'jspdf'
import { describe, expect, it } from 'vitest'
import { sampleApartment } from '../../studio/samples'
import { drawPlanVector } from './pdfPlan'

describe('the plan in a PDF', () => {
  it('is drawn as vectors and text, not a picture', () => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
      compress: false,
    })
    drawPlanVector(
      pdf,
      sampleApartment(),
      'f0',
      { x: -1200, y: -1200 },
      { x: 20, y: 20 },
      50,
    )
    const out = pdf.output()
    expect(out).not.toMatch(/\/Subtype \/Image/)
    // Room names and areas are real text.
    expect(out).toContain('(Bedroom 1)')
    expect(out).toContain('(Living and kitchen)')
    expect(out).toMatch(/\(\d+\.\d\d m²?\)|\(1\d\.\d\d m/)
    // Lines and filled shapes (walls, rooms): many path operators.
    expect((out.match(/ l\n/g) ?? []).length).toBeGreaterThan(200)
    expect(out).toMatch(/\bf\n/)
  })
})
