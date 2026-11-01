/**
 * The PDF exports: one portfolio item, the whole portfolio, and the
 * competency report. Pure functions from records to PDF bytes (no screen
 * capture), so they also run in unit tests.
 */
import { getCareer, getSkill } from '../../content/careers'
import { COMPETENCY_LEVEL_NAMES, COMPETENCY_RULES } from '../../game/competencies'
import { toolName } from '../../game/portfolio'
import { HONESTY_STATEMENT, type ProgressReport } from '../../game/progressReport'
import { formatDateTime } from '../../lib/time'
import type { PortfolioFile, PortfolioItem } from '../../persistence/schemas'
import { documentBlocks } from '../blocks'
import { LAYOUT, PdfWriter } from './writer'

const FOOTER = 'GamHub WorkSim portfolio - simulated workplace tasks with simulated data'

const RATINGS = { excellent: 'Excellent', good: 'Good', pass: 'Pass' } as const
const STATUS = { passed: 'Passed', partial: 'Partly done', failed: 'Not done' } as const
const ROLES = {
  main: 'Main file',
  report: 'Report',
  presentation: 'Presentation',
} as const

export interface ItemWithFiles {
  item: PortfolioItem
  files: PortfolioFile[]
  /** The career save it belongs to, e.g. "Alex · Accounting". */
  saveName: string
}

function itemSection(w: PdfWriter, { item, files, saveName }: ItemWithFiles) {
  w.heading(item.title, 1)
  w.paragraph(
    `${getCareer(item.careerId).name} · ${item.levelTitle} · ${saveName}. Completed (passed) on ${formatDateTime(item.completedAt)}.`,
    { muted: true, size: 9 },
  )
  w.paragraph(
    `Score ${item.score}% (${RATINGS[item.rating]}; pass mark ${item.passScore}%), after ${item.attempts.length} ${item.attempts.length === 1 ? 'attempt' : 'attempts'}.`,
    { bold: true },
  )
  if (item.note.trim()) w.paragraph(`Note: ${item.note.trim()}`, { size: 9.5 })

  w.heading('What was asked', 2)
  w.paragraph(item.summary)
  if (item.objectives.length > 0) w.list(item.objectives)

  w.heading('What this demonstrates', 2)
  w.list([
    `Skills: ${Object.keys(item.skills)
      .map((id) => getSkill(id)?.name ?? id)
      .join(', ')}`,
    `Tools: ${item.tools.map(toolName).join(', ')}`,
  ])

  w.heading('How it was checked', 2)
  w.table({
    title: '',
    head: ['Check', 'Result', 'Points', 'Why it matters'],
    rows: item.checks.map((c) => [
      c.title,
      STATUS[c.status],
      `${c.earned}/${c.points}`,
      c.why,
    ]),
  })

  if (item.stages && item.stages.length > 0) {
    w.heading('Stages', 2)
    w.paragraph('Each stage is a piece of work of its own, with its files and checks.', {
      muted: true,
      size: 9,
    })
    w.table({
      title: '',
      head: ['Stage', 'Score'],
      rows: item.stages.map((s, i) => [`${i + 1}. ${s.title}`, `${s.score}%`]),
    })
  }
  if (item.files.length > 0) w.heading('The work, as handed in', 2)
  for (const meta of item.files) {
    w.heading(`${ROLES[meta.role]}: ${meta.title}`, 3)
    const file = files.find((f) => f.id === meta.fileId)
    if (!meta.available || !file) {
      w.paragraph(
        'This copy is not available (it was removed before the portfolio existed).',
        {
          muted: true,
        },
      )
      continue
    }
    w.blocks(documentBlocks(file.snapshot))
  }
}

function cover(w: PdfWriter, title: string, name: string, lines: string[]) {
  w.space(40)
  w.paragraph(title.toUpperCase(), { muted: true, size: 11 })
  w.heading(name, 1)
  for (const line of lines) w.paragraph(line, { size: 11 })
  w.space(8)
  w.paragraph(`Prepared ${formatDateTime(Date.now())}.`, { muted: true, size: 9 })
  w.space(20)
  w.paragraph('About this document', { bold: true })
  w.paragraph(HONESTY_STATEMENT, { size: 9.5 })
}

/** One portfolio item, in full. */
export function itemPdf(entry: ItemWithFiles): Uint8Array {
  const w = new PdfWriter(`${entry.item.title} - portfolio item`)
  itemSection(w, entry)
  w.space(4)
  w.paragraph(HONESTY_STATEMENT, { muted: true, size: 8.5 })
  return w.finish(FOOTER)
}

/** The whole portfolio: cover, contents, then one section per item. */
export function portfolioPdf(name: string, entries: ItemWithFiles[]): Uint8Array {
  const w = new PdfWriter(`${name} - portfolio`)
  const careers = [...new Set(entries.map((e) => getCareer(e.item.careerId).name))]
  cover(w, 'Portfolio of work', name, [
    careers.length > 0 ? `Careers: ${careers.join(', ')}` : 'No work included yet.',
    `${entries.length} completed ${entries.length === 1 ? 'task' : 'tasks'}`,
  ])

  // Contents: reserve the pages, write the entries once the page numbers are known.
  const perPage = 32
  const contentsPages = Math.max(1, Math.ceil(entries.length / perPage))
  const firstContents = w.page + 1
  for (let i = 0; i < contentsPages; i++) w.newPage()
  const starts: number[] = []
  for (const entry of entries) {
    w.newPage()
    starts.push(w.page)
    itemSection(w, entry)
  }
  entries.forEach((entry, i) => {
    const page = firstContents + Math.floor(i / perPage)
    const row = i % perPage
    if (row === 0) w.at(page, LAYOUT.margin, LAYOUT.margin + 6, 'Contents')
    const y = LAYOUT.margin + 16 + row * 7
    w.at(page, LAYOUT.margin, y, `${i + 1}. ${entry.item.title} (${entry.item.score}%)`)
    w.at(page, LAYOUT.width - LAYOUT.margin, y, String(starts[i]), { right: true })
  })
  if (entries.length === 0)
    w.at(firstContents, LAYOUT.margin, LAYOUT.margin + 6, 'Contents')
  return w.finish(FOOTER)
}

/** Competencies, improvements and recommendations for each career save. */
export function competencyReportPdf(name: string, reports: ProgressReport[]): Uint8Array {
  const w = new PdfWriter(`${name} - competency report`)
  cover(
    w,
    'Competency and progress report',
    name,
    reports.map(
      (r) => `${r.careerName}: ${r.levelTitle} (level ${r.levelNumber} of ${r.levels})`,
    ),
  )
  const rules = COMPETENCY_RULES
  for (const report of reports) {
    w.newPage()
    w.heading(`${report.careerName}`, 1)
    w.paragraph(report.summary)

    w.heading('How levels are decided', 2)
    w.paragraph(
      `Only passed work counts, and only tasks where the skill is a main part (${rules.minWeight} skill points or more). Demonstrated: 1 task. Practised: ${rules.practised} tasks. Proficient: ${rules.proficient} tasks, one at level ${rules.proficientLevel} or above, with an average score of ${rules.proficientAverage}% or more.`,
      { size: 9 },
    )

    w.heading('Competencies', 2)
    w.table({
      title: '',
      head: ['Skill', 'Level', 'Why', 'Evidence'],
      rows: report.competencies.map((c) => [
        c.name,
        COMPETENCY_LEVEL_NAMES[c.level],
        c.reasons.join(' '),
        c.evidence.map((e) => `${e.title} (${e.score}%)`).join('; '),
      ]),
    })

    w.heading('Areas to improve', 2)
    if (report.improvements.length === 0)
      w.paragraph('The latest attempts passed every check.')
    else
      w.list(
        report.improvements.map(
          (a) =>
            `${a.taskTitle}${a.needsRevision ? ' (not passed yet)' : ''}: ${a.checks
              .map(
                (c) =>
                  `“${c.title}” ${c.status === 'partial' ? 'partly done' : 'not done'}`,
              )
              .join('; ')}`,
        ),
      )

    w.heading('Recommended next steps', 2)
    if (report.recommendations.length === 0)
      w.paragraph('Everything available is complete.')
    else
      w.list(
        report.recommendations.map((r) => `${r.title}. Why: ${r.reason}`),
        true,
      )

    w.heading('Experience', 2)
    w.list([
      `${report.experience.tasksCompleted} tasks passed, ${report.experience.attempts} attempts`,
      ...(report.experience.projectsCompleted > 0
        ? [`${report.experience.projectsCompleted} integrated projects completed`]
        : []),
      `Tools used in passed work: ${Object.keys(report.experience.tools).map(toolName).join(', ') || 'none yet'}`,
      `Estimated practice time: ${report.experience.estimatedMinutes} minutes (from the tasks' expected times)`,
      ...report.reviews.map((r) => `Week ${r.week} review: ${r.rating}`),
    ])
  }
  w.space(4)
  w.paragraph(HONESTY_STATEMENT, { muted: true, size: 8.5 })
  return w.finish(FOOTER)
}
