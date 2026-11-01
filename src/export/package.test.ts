import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { ASSIGNMENTS, getAssignment } from '../content/assignments'
import { buildProjectContent } from '../game/code/grading'
import { deliverableFile } from '../game/deliverables'
import { decideCapture } from '../game/portfolio'
import { buildSolutionContent } from '../game/workbooks'
import { createId } from '../lib/ids'
import type { AnyDocument, PortfolioFile, PortfolioItem } from '../persistence/schemas'
import { parseCsv } from './formats'
import { portfolioPackage } from './package'
import type { ItemWithFiles } from './pdf/reports'

function entry(id: string, documents: AnyDocument[]): ItemWithFiles {
  const task = getAssignment(id)!
  const decision = decideCapture({
    profileId: 'p',
    assignment: task,
    grade: {
      score: 90,
      rating: 'excellent',
      passed: true,
      earned: 0,
      maxPoints: 0,
      checks: [],
    },
    attempts: [],
    submittedAt: 1,
    files: [],
    existing: undefined,
  })
  if (decision.action !== 'evidence') throw new Error('not captured')
  const files = documents.map(
    (snapshot) => ({ id: createId(), itemId: 'i', snapshot }) as PortfolioFile,
  )
  const item = {
    ...decision.evidence,
    id: createId(),
    note: '',
    included: true,
    featured: false,
    order: 0,
    files: documents.map((d, i) => ({
      fileId: files[i].id,
      role: i === 0 ? 'main' : d.kind === 'slides' ? 'presentation' : 'report',
      kind: d.kind,
      title: d.title,
      bytes: 1,
      available: true,
    })),
  } as PortfolioItem
  return { item, files, saveName: 'Alex · Test' }
}

describe('portfolio package', () => {
  it('holds the README, both PDFs, and each item’s report and original files', () => {
    const report = getAssignment('performance-report')!
    const code = ASSIGNMENTS.find((a) => a.kind === 'code')!
    const workbook = {
      id: createId(),
      kind: 'sheet',
      title: 'October departmental performance',
      content: buildSolutionContent(report),
    } as AnyDocument
    const entries = [
      entry(report.id, [
        workbook,
        ...report.deliverables.map(
          (d) => ({ id: createId(), ...deliverableFile(d, 'Alex') }) as AnyDocument,
        ),
      ]),
      entry(code.id, [
        {
          id: createId(),
          kind: 'code',
          title: 'Invoice project',
          content: buildProjectContent(code),
        } as AnyDocument,
      ]),
    ]
    const zip = unzipSync(portfolioPackage('Alex Morgan', entries, []))
    const names = Object.keys(zip)
    const root = 'Alex Morgan - portfolio/'
    expect(names).toContain(`${root}README.txt`)
    expect(strFromU8(zip[`${root}README.txt`])).toContain(
      'It is not a record of employment',
    )
    for (const pdf of ['Portfolio.pdf', 'Competency report.pdf']) {
      expect(strFromU8(zip[`${root}${pdf}`].slice(0, 5))).toBe('%PDF-')
    }
    const first = `${root}Work/01 ${report.title}/`
    expect(names).toContain(`${first}${report.title}.pdf`)
    const sheetCsv = names.find(
      (n) => n.startsWith(`${first}Main file - ${workbook.title}/`) && n.endsWith('.csv'),
    )!
    expect(parseCsv(strFromU8(zip[sheetCsv]))[0]).toContain('Department')
    expect(
      names.some((n) => n.startsWith(`${first}Report - `) && n.endsWith('.html')),
    ).toBe(true)
    expect(
      names.some((n) => n.startsWith(`${first}Presentation - `) && n.endsWith('.md')),
    ).toBe(true)
    // Code keeps its own files, exactly.
    const source = buildProjectContent(code).files[0]
    const codeFile = `${root}Work/02 ${code.title}/Main file - Invoice project/${source.name}`
    expect(strFromU8(zip[codeFile])).toBe(source.text)
  })
})
