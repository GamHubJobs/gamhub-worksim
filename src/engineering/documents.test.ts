import { describe, expect, it } from 'vitest'
import { HOURS } from '../content/workday'
import { newProfileData } from '../game/career'
import { DocContentSchema, SheetContentSchema } from '../persistence/schemas'
import {
  calculationSheet,
  documentRevision,
  handoverFile,
  inspectionReport,
  progressReport,
  programmeWorkbook,
  quantitiesWorkbook,
  specification,
} from './documents'
import {
  REVIEW_MINUTES,
  activeProject,
  checkEngineering,
  recordDocument,
  saveDesign,
  staleDocuments,
  startConstruction,
  startProject,
  submitDesign,
} from './engine'
import { correctedYardStore } from './testDesigns'

function approvedProject() {
  const base = newProfileData('Alex', 1, 'engineering-services')
  let p = { ...base, work: { ...base.work, minute: HOURS.start } }
  p = startProject(p, 'yard-store')
  p = saveDesign(p, 'yard-store', correctedYardStore(), 'plan-editor')
  p = submitDesign(p, 'yard-store')
  p = checkEngineering({
    ...p,
    work: { ...p.work, minute: p.work.minute + REVIEW_MINUTES },
  })
  const n = activeProject(p)!.revisions.at(-1)!.n
  p = recordDocument(p, 'yard-store', 'drawings', 'doc-drawing', n)
  p = recordDocument(p, 'yard-store', 'quantities', 'doc-quantities', n)
  return startConstruction(p, 'yard-store')
}

const text = (content: unknown) => JSON.stringify(content)

describe('project documents', () => {
  it('are valid Word Craft and Grid Craft content, made from the project’s data', () => {
    const project = activeProject(approvedProject())!
    for (const doc of [
      calculationSheet(project),
      specification(project),
      progressReport(project, 3),
      inspectionReport(project),
      handoverFile(project),
    ])
      expect(DocContentSchema.safeParse(doc).success).toBe(true)
    for (const book of [quantitiesWorkbook(project), programmeWorkbook(project)])
      expect(SheetContentSchema.safeParse(book).success).toBe(true)
    expect(text(calculationSheet(project))).toContain('56.0 kNm')
    expect(text(specification(project))).toContain('W3')
  })

  it('the bill of quantities totals with formulas, and follows the design', () => {
    const project = activeProject(approvedProject())!
    const cells = quantitiesWorkbook(project).sheets[0].cells
    expect(cells.F4.input).toBe('=D4*E4')
    expect(Object.values(cells).some((c) => c.input.startsWith('=SUM(F4:F'))).toBe(true)
    expect(text(cells)).toContain('Windows, supplied and fitted')
  })

  it('is flagged out of date when the site builds a newer revision', () => {
    let p = approvedProject()
    const project = activeProject(p)!
    p = recordDocument(p, project.id, 'quantities', 'doc-1', documentRevision(project))
    expect(staleDocuments(activeProject(p)!)).toEqual([])
    p = saveDesign(
      p,
      project.id,
      { ...correctedYardStore(), services: { circuits: 3, sanitary: 0, hvac: 0 } },
      'cadcraft',
    )
    p = submitDesign(p, project.id)
    p = checkEngineering({
      ...p,
      work: { ...p.work, minute: p.work.minute + REVIEW_MINUTES },
    })
    // The drawing and the bill of quantities were issued from the older revision.
    expect(staleDocuments(activeProject(p)!)).toEqual(['drawings', 'quantities'])
  })
})
