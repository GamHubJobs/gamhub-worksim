/**
 * The portfolio package: one ZIP with the portfolio PDF, the competency
 * report, and a folder per piece of work with its report and original files.
 */
import { strToU8, zipSync, type Zippable } from 'fflate'
import { HONESTY_STATEMENT, type ProgressReport } from '../game/progressReport'
import { safeFileName } from '../lib/download'
import { formatDateTime } from '../lib/time'
import { originalFiles } from './files'
import {
  competencyReportPdf,
  itemPdf,
  portfolioPdf,
  type ItemWithFiles,
} from './pdf/reports'

const ROLES = {
  main: 'Main file',
  report: 'Report',
  presentation: 'Presentation',
} as const

function readme(name: string, entries: ItemWithFiles[]): string {
  return `${name}: portfolio of work
Prepared ${formatDateTime(Date.now())} with GamHub WorkSim.

${HONESTY_STATEMENT}

What is in this folder
- Portfolio.pdf: every piece of work below, with what was asked, how it was
  checked, and the work as handed in.
- Competency report.pdf: skills with their levels and the reasons, areas to
  improve and next steps.
- Work: one folder per piece of work, with its own PDF and the original files.

How to open the original files
- .csv files open in any spreadsheet app (Excel, LibreOffice, Google Sheets).
  Workbooks have one CSV per sheet (the values shown) and Formulas.csv with every
  formula.
- .html files open in any web browser; .md files are plain text (Markdown).
- .js files are JavaScript and run with Node.js (for example: node --test).
  git-log.txt lists the commits made.
- "data.json" files are the full data of files made in WorkSim's professional
  tools (for example Books or Data Studio).

Work included (${entries.length})
${entries.map((e, i) => `${String(i + 1).padStart(2, '0')}. ${e.item.title} - ${e.item.score}%, completed ${formatDateTime(e.item.completedAt)}`).join('\n')}
`
}

/** One item's folder: its report and its original files, by role. */
function itemFolder(entry: ItemWithFiles): Zippable {
  const folder: Zippable = {
    [`${safeFileName(entry.item.title)}.pdf`]: itemPdf(entry),
  }
  for (const meta of entry.item.files) {
    const file = entry.files.find((f) => f.id === meta.fileId)
    if (!meta.available || !file) continue
    const files: Zippable = {}
    for (const out of originalFiles(file.snapshot)) {
      // Paths such as "src/invoice.js" become nested folders.
      const parts = out.path.split('/').filter(Boolean)
      let at = files
      for (const part of parts.slice(0, -1)) at = (at[part] ??= {}) as Zippable
      at[parts.at(-1)!] = strToU8(out.data)
    }
    folder[safeFileName(`${ROLES[meta.role]} - ${meta.title}`)] = files
  }
  return folder
}

/** One item as a ZIP: its report and original files. */
export function itemPackage(entry: ItemWithFiles): Uint8Array {
  return zipSync(
    {
      [safeFileName(entry.item.title)]: {
        ...itemFolder(entry),
        'README.txt': strToU8(`${entry.item.title}\r\n\r\n${HONESTY_STATEMENT}\r\n`),
      },
    },
    { level: 6, mtime: new Date() },
  )
}

/** Builds the ZIP. Every included item, featured first, then newest first. */
export function portfolioPackage(
  name: string,
  entries: ItemWithFiles[],
  reports: ProgressReport[],
): Uint8Array {
  const work: Zippable = {}
  entries.forEach((entry, i) => {
    const folder = itemFolder(entry)
    work[`${String(i + 1).padStart(2, '0')} ${safeFileName(entry.item.title)}`] = folder
  })
  const root = `${safeFileName(name)} - portfolio`
  return zipSync(
    {
      [root]: {
        'README.txt': strToU8(readme(name, entries).replace(/\n/g, '\r\n')),
        'Portfolio.pdf': portfolioPdf(name, entries),
        'Competency report.pdf': competencyReportPdf(name, reports),
        Work: work,
      },
    },
    { level: 6, mtime: new Date() },
  )
}
