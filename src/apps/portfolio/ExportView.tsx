/**
 * Exporting the portfolio: genuine PDFs made in the browser from the saved
 * records (nothing is uploaded anywhere).
 */
import { useState } from 'react'
import type { PortfolioItem, Profile } from '../../persistence/schemas'
import { downloadCompetencyPdf, downloadPortfolioPdf } from './exports'

export function ExportView({
  items,
  profiles,
  defaultName,
  saveName,
}: {
  /** The items of the chosen career saves. */
  items: PortfolioItem[]
  profiles: Profile[]
  defaultName: string
  saveName: (item: PortfolioItem) => string
}) {
  const [name, setName] = useState(defaultName)
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const included = items.filter((i) => i.included).length
  const shownName = name.trim() || defaultName

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label)
    setDone(null)
    setError(null)
    try {
      await action()
      setDone(`${label} is ready: check your downloads.`)
    } catch (e) {
      setError(
        `The ${label.toLowerCase()} could not be made: ${e instanceof Error ? e.message : String(e)}`,
      )
    } finally {
      setBusy(null)
    }
  }

  const card = 'space-y-2 rounded-xl border border-slate-200 bg-white p-6'
  const button =
    'rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60'

  return (
    <div className="space-y-5" data-testid="export-view">
      <section className={card}>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Name on your documents</span>
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full max-w-sm rounded-md border border-slate-300 px-2 py-1"
          />
        </label>
        <p className="text-xs text-slate-500">
          Every export says that the work was done in a workplace simulation, and is not a
          record of employment or a qualification. Files are made on this device; nothing
          is uploaded.
        </p>
      </section>

      <section className={card}>
        <h2 className="font-semibold text-slate-900">Portfolio (PDF)</h2>
        <p className="text-sm text-slate-600">
          A cover page, contents, and every included piece of work: what was asked, how it
          was checked, and the work itself as handed in. {included} of {items.length}{' '}
          items are included; you can change this on each item’s page.
        </p>
        <button
          type="button"
          className={button}
          disabled={busy !== null || included === 0}
          onClick={() =>
            run('Portfolio PDF', () => downloadPortfolioPdf(shownName, items, saveName))
          }
        >
          Download portfolio PDF
        </button>
      </section>

      <section className={card}>
        <h2 className="font-semibold text-slate-900">Competency report (PDF)</h2>
        <p className="text-sm text-slate-600">
          Each competency’s level with the reasons and the work behind it, areas to
          improve and recommended next steps, for each career save shown.
        </p>
        <button
          type="button"
          className={button}
          disabled={busy !== null || profiles.length === 0}
          onClick={() =>
            run('Competency report', () =>
              downloadCompetencyPdf(shownName, profiles, items),
            )
          }
        >
          Download competency report
        </button>
      </section>

      {busy && (
        <p role="status" className="text-sm text-slate-700">
          Preparing your {busy.toLowerCase()}…
        </p>
      )}
      {done && (
        <p role="status" className="text-sm text-emerald-800" data-testid="export-done">
          {done}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  )
}
