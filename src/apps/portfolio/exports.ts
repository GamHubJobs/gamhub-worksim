/**
 * Export actions for the Portfolio app. The PDF code is loaded only when the
 * player exports something, so it adds nothing to the app's start-up.
 */
import { progressReport } from '../../game/progressReport'
import { downloadFile, safeFileName } from '../../lib/download'
import { loadPortfolioFiles } from '../../persistence/portfolio'
import type { PortfolioItem, Profile } from '../../persistence/schemas'

const PDF = 'application/pdf'

async function withFiles(
  items: PortfolioItem[],
  saveName: (item: PortfolioItem) => string,
) {
  return Promise.all(
    items.map(async (item) => ({
      item,
      files: await loadPortfolioFiles(item),
      saveName: saveName(item),
    })),
  )
}

export async function downloadItemPdf(item: PortfolioItem, saveName: string) {
  const { itemPdf } = await import('../../export/pdf/reports')
  const [entry] = await withFiles([item], () => saveName)
  downloadFile(`${safeFileName(item.title)}.pdf`, itemPdf(entry), PDF)
}

/** The portfolio PDF: included items, featured first, then newest first. */
export async function downloadPortfolioPdf(
  name: string,
  items: PortfolioItem[],
  saveName: (item: PortfolioItem) => string,
) {
  const { portfolioPdf } = await import('../../export/pdf/reports')
  const chosen = items
    .filter((i) => i.included)
    .sort(
      (a, b) => Number(b.featured) - Number(a.featured) || b.completedAt - a.completedAt,
    )
  const pdf = portfolioPdf(name, await withFiles(chosen, saveName))
  downloadFile(`${safeFileName(name)} - portfolio.pdf`, pdf, PDF)
}

export async function downloadCompetencyPdf(
  name: string,
  profiles: Profile[],
  items: PortfolioItem[],
) {
  const { competencyReportPdf } = await import('../../export/pdf/reports')
  const reports = profiles.map((p) => progressReport(p, items))
  downloadFile(
    `${safeFileName(name)} - competency report.pdf`,
    competencyReportPdf(name, reports),
    PDF,
  )
}
