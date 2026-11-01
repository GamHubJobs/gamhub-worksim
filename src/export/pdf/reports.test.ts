import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'
import { ASSIGNMENTS, getAssignment } from '../../content/assignments'
import { buildProjectContent } from '../../game/code/grading'
import { deliverableFile } from '../../game/deliverables'
import { decideCapture } from '../../game/portfolio'
import { progressReport } from '../../game/progressReport'
import { buildQueueContent } from '../../game/tickets'
import { buildSolutionContent } from '../../game/workbooks'
import { createId } from '../../lib/ids'
import type {
  AnyDocument,
  PortfolioFile,
  PortfolioItem,
  Profile,
} from '../../persistence/schemas'
import { toolTaskContent } from '../../tools/grading'
import { competencyReportPdf, itemPdf, portfolioPdf, type ItemWithFiles } from './reports'
import { safeText } from './writer'

/** The text of each page of a PDF, read back with pdf.js. */
async function pdfText(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent()
    pages.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' '),
    )
  }
  return pages
}

/** The main file of a task as the model answer (so it has real content). */
function mainFile(id: string): AnyDocument {
  const task = getAssignment(id)!
  const base = { id: createId(), title: `${task.title} file` }
  if (task.kind === 'tool')
    return {
      ...base,
      kind: 'tool',
      content: toolTaskContent(task)!.solution,
    } as AnyDocument
  if (task.kind === 'tickets')
    return { ...base, kind: 'tickets', content: buildQueueContent(task) } as AnyDocument
  if (task.kind === 'code')
    return { ...base, kind: 'code', content: buildProjectContent(task) } as AnyDocument
  return { ...base, kind: 'sheet', content: buildSolutionContent(task) } as AnyDocument
}

/** A portfolio item for a task, with its main file and deliverables. */
function entry(id: string, note = ''): ItemWithFiles {
  const task = getAssignment(id)!
  const documents = [
    mainFile(id),
    ...task.deliverables.map(
      (d) => ({ id: createId(), ...deliverableFile(d, 'Alex') }) as AnyDocument,
    ),
  ]
  const decision = decideCapture({
    profileId: 'p',
    assignment: task,
    grade: {
      score: 95,
      rating: 'excellent',
      passed: true,
      earned: 95,
      maxPoints: 100,
      checks: [
        {
          id: 'c1',
          title: 'Totals are right',
          why: 'Managers rely on them.',
          hint: '',
          status: 'passed',
          earned: 10,
          points: 10,
          problems: [],
        },
      ],
    },
    attempts: [],
    submittedAt: Date.UTC(2026, 9, 30),
    files: documents.map((document, i) => ({
      role: i === 0 ? 'main' : document.kind === 'slides' ? 'presentation' : 'report',
      document,
    })),
    existing: undefined,
  })
  if (decision.action !== 'evidence') throw new Error('not captured')
  const files: PortfolioFile[] = documents.map(
    (document) => ({ id: createId(), itemId: 'i', snapshot: document }) as PortfolioFile,
  )
  const item = {
    ...decision.evidence,
    id: createId(),
    note,
    included: true,
    featured: false,
    order: 0,
    attempts: [{ submittedAt: 1, score: 95 }],
    files: documents.map((document, i) => ({
      fileId: files[i].id,
      role: i === 0 ? 'main' : document.kind === 'slides' ? 'presentation' : 'report',
      kind: document.kind,
      title: document.title,
      bytes: 1,
      available: true,
    })),
  } as PortfolioItem
  return { item, files, saveName: 'Alex · Test' }
}

describe('PDF exports', () => {
  it('an item report: its description, grade, checks and the work itself', async () => {
    const pages = await pdfText(itemPdf(entry('invoice-check', 'I checked every line.')))
    const text = pages.join(' ')
    expect(text).toContain(getAssignment('invoice-check')!.title)
    expect(text).toContain('Score 95% (Excellent; pass mark')
    expect(text).toContain('Totals are right')
    expect(text).toContain('Managers rely on them.')
    expect(text).toContain('Note: I checked every line.')
    expect(text).toContain('It is not a record of employment')
    expect(text).toMatch(/Page 1 of \d+/)
  })

  it('a report with a document and slides shows their text and charts', async () => {
    const text = (await pdfText(itemPdf(entry('performance-report')))).join(' ')
    expect(text).toContain('Report:')
    expect(text).toContain('Presentation:')
    expect(text).toContain('Slide 1')
  })

  it('code is listed with line numbers', async () => {
    const task = ASSIGNMENTS.find((a) => a.kind === 'code')!
    const text = (await pdfText(itemPdf(entry(task.id)))).join(' ')
    expect(text).toContain(buildProjectContent(task).files[0].name)
    expect(text).toMatch(/\b1 /)
  })

  it('the portfolio has a cover, contents with page numbers, and every item', async () => {
    const ids = ['supplies-order', 'invoice-check', 'triage-queue']
      .map((id) => ASSIGNMENTS.find((a) => a.id === id || a.id.startsWith(id))?.id)
      .filter((id): id is string => !!id)
    const entries = ids.map((id) => entry(id))
    const pages = await pdfText(portfolioPdf('Alex Morgan', entries))
    expect(pages[0]).toContain('Alex Morgan')
    expect(pages[0]).toContain('It is not a record of employment')
    expect(pages[1]).toContain('Contents')
    for (const e of entries) {
      expect(pages[1]).toContain(e.item.title)
      // The contents page number points at the page that starts the item.
      const match = new RegExp(`${escape(e.item.title)} \\(95%\\) (\\d+)`).exec(pages[1])
      expect(match).not.toBeNull()
      expect(pages[Number(match![1]) - 1]).toContain(e.item.title)
    }
  })

  it('every task’s item renders (all file kinds and tools)', () => {
    for (const task of ASSIGNMENTS) {
      expect(itemPdf(entry(task.id)).length).toBeGreaterThan(1000)
    }
  }, 60_000)

  it('a large portfolio still exports', async () => {
    const entries = ASSIGNMENTS.map((a) => entry(a.id))
    const pages = await pdfText(portfolioPdf('Alex', entries))
    expect(pages.length).toBeGreaterThan(ASSIGNMENTS.length)
    expect(pages[1]).toContain('Contents')
  }, 120_000)

  it('the competency report lists levels, reasons and next steps', async () => {
    const e = entry('supplies-order')
    const profile = {
      id: 'p',
      name: 'Alex',
      careerId: e.item.careerId,
      levelId: getAssignment('supplies-order')!.levelId,
      assignments: {},
      work: { reviews: [] },
    } as unknown as Profile
    const report = progressReport(profile, [{ ...e.item, profileId: 'p' }])
    const text = (await pdfText(competencyReportPdf('Alex', [report]))).join(' ')
    expect(text).toContain('How levels are decided')
    expect(text).toContain('Demonstrated')
    expect(text).toContain('Recommended next steps')
    expect(text).toContain('Why:')
  })

  it('text outside the standard fonts is replaced, not garbled', () => {
    expect(safeText('a → b ✓ “quoted” £5 €3 日本')).toBe('a -> b v “quoted” £5 €3 ??')
  })
})

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
