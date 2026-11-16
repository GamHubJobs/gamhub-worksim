/**
 * The project's documents: made from the project's data in the office apps
 * (Word Craft documents, Grid Craft workbooks with live formulas, the DXF
 * drawing), each recording the revision it shows. When the site moves to a
 * newer revision, they are flagged out of date and can be made again (the
 * earlier content stays in Version history).
 */
import { useState } from 'react'
import { getBrief } from '../../engineering/briefs'
import { designToDxf } from '../../engineering/cad/dxf'
import {
  DOCUMENT_PLANS,
  calculationSheet,
  documentRevision,
  handoverFile,
  inspectionReport,
  progressReport,
  programmeWorkbook,
  quantitiesWorkbook,
  specification,
  type DocumentPlan,
} from '../../engineering/documents'
import { revision } from '../../engineering/engine'
import type { ProjectDocumentKind, ProjectState } from '../../engineering/state'
import {
  createCadFile,
  readCadFile,
  saveProjectDocument,
  updateCadFile,
} from '../../persistence/engineeringFiles'
import { BUTTON, Card, PRIMARY } from './parts'
import { download } from './helpers'

interface Props {
  project: ProjectState
  owner: string
  day: number
  onRecord: (kind: ProjectDocumentKind, document: string, revision: number) => void
  onOpen: (app: 'doc' | 'sheet', document: string) => void
}

export function DocumentsTab({ project, owner, day, onRecord, onOpen }: Props) {
  const brief = getBrief(project.id)!
  const rev = documentRevision(project)
  const [busy, setBusy] = useState<ProjectDocumentKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function make(plan: DocumentPlan) {
    setBusy(plan.kind)
    setError(null)
    try {
      const existing = project.documents[plan.kind]?.document ?? null
      const title = plan.title(brief.title)
      let id: string
      if (plan.app === 'cad') {
        const design = revision(project, rev)?.design
        if (!design) throw new Error('There is no revision to draw.')
        const file = {
          project: project.id,
          role: 'drawing' as const,
          format: 'dxf' as const,
          name: `${project.id}-r${rev}-issued.dxf`,
          data: designToDxf(design, {
            project: brief.title,
            client: brief.client.organisation,
            revision: rev,
            status: 'Issued for construction',
          }),
          encoding: 'text' as const,
          revision: rev,
          basis: '',
        }
        if (existing && (await readCadFile(existing))) {
          await updateCadFile(existing, file)
          id = existing
        } else id = await createCadFile(owner, file)
      } else if (plan.app === 'sheet') {
        const content =
          plan.kind === 'quantities'
            ? quantitiesWorkbook(project)
            : programmeWorkbook(project)
        id = await saveProjectDocument(existing, { kind: 'sheet', owner, title, content })
      } else {
        const content =
          plan.kind === 'calculations'
            ? calculationSheet(project)
            : plan.kind === 'specification'
              ? specification(project)
              : plan.kind === 'progress'
                ? progressReport(project, day)
                : plan.kind === 'inspection'
                  ? inspectionReport(project)
                  : handoverFile(project)
        id = await saveProjectDocument(existing, { kind: 'doc', owner, title, content })
      }
      onRecord(plan.kind, id, rev)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(null)
  }

  async function open(plan: DocumentPlan, id: string) {
    if (plan.app === 'cad') {
      const file = await readCadFile(id)
      if (file) download(file.name, file.data, 'image/vnd.dxf')
    } else onOpen(plan.app, id)
  }

  return (
    <div className="space-y-3 overflow-y-auto" data-testid="documents-tab">
      <p className="text-sm text-slate-700">
        Documents are made from revision {rev} (
        {project.site ? 'being built on site' : 'the approved or latest design'}). Make
        one again whenever it is out of date: what it said before stays in its Version
        history.
      </p>
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {DOCUMENT_PLANS.map((plan) => {
          const made = project.documents[plan.kind]
          const stale = made && made.revision !== rev
          const app =
            plan.app === 'sheet'
              ? 'Grid Craft'
              : plan.app === 'doc'
                ? 'Word Craft'
                : 'DXF (CAD Craft)'
          return (
            <Card
              key={plan.kind}
              title={plan.title(brief.title)}
              testId={`document-${plan.kind}`}
              actions={
                <>
                  {made && (
                    <button
                      type="button"
                      className={`${BUTTON} text-xs`}
                      onClick={() => void open(plan, made.document)}
                    >
                      {plan.app === 'cad' ? 'Download' : 'Open'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${made && !stale ? BUTTON : PRIMARY} text-xs`}
                    disabled={busy !== null}
                    onClick={() => void make(plan)}
                    data-testid={`make-${plan.kind}`}
                  >
                    {busy === plan.kind ? 'Making…' : made ? 'Make again' : 'Make'}
                  </button>
                </>
              }
            >
              <p className="text-xs text-slate-600">{plan.description}</p>
              <p className="mt-1 text-xs">
                <span className="text-slate-500">{app} · </span>
                {!made ? (
                  <span className="text-slate-500">Not made yet</span>
                ) : stale ? (
                  <span
                    className="font-medium text-amber-800"
                    data-testid={`stale-${plan.kind}`}
                  >
                    Out of date: made from revision {made.revision}
                  </span>
                ) : (
                  <span className="text-emerald-800">
                    Made from revision {made.revision}
                  </span>
                )}
              </p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
