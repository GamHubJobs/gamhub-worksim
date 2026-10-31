/**
 * The portfolio: every task passed in this career, with the score, the date,
 * the skills it shows, and the files themselves. A record of real work the
 * player can show and talk about.
 */
import { getSkill } from '../../content/careers'
import { getCareer } from '../../content/careers'
import { bestScore, careerAssignments, isPassed } from '../../game/career'
import { formatDateTime } from '../../lib/time'
import type { Profile } from '../../persistence/schemas'
import { Icon, type IconName } from '../../ui/Icon'

export type PortfolioFileKind = 'sheet' | 'tickets' | 'code' | 'doc' | 'slides'

const FILE_ICONS: Record<PortfolioFileKind, IconName> = {
  sheet: 'sheets',
  tickets: 'helpdesk',
  code: 'code',
  doc: 'docs',
  slides: 'slides',
}

const FILE_NAMES: Record<PortfolioFileKind, string> = {
  sheet: 'Workbook',
  tickets: 'Ticket queue',
  code: 'Code project',
  doc: 'Report',
  slides: 'Presentation',
}

export function PortfolioSection({
  profile,
  onOpenFile,
}: {
  profile: Profile
  onOpenFile: (kind: PortfolioFileKind, documentId: string) => void
}) {
  const career = getCareer(profile.careerId)
  const items = careerAssignments(profile.careerId).flatMap((assignment) => {
    const progress = profile.assignments[assignment.id]
    if (!progress || !isPassed(assignment, progress)) return []
    const passedAt = progress.attempts.find((a) => a.score >= assignment.passScore)
    const level = career.levels.find((l) => l.id === assignment.levelId)
    const files: Array<{ kind: PortfolioFileKind; id: string }> = [
      { kind: assignment.kind, id: progress.documentId },
      ...(progress.files?.doc ? [{ kind: 'doc' as const, id: progress.files.doc }] : []),
      ...(progress.files?.slides
        ? [{ kind: 'slides' as const, id: progress.files.slides }]
        : []),
    ]
    return [{ assignment, progress, passedAt, level, files }]
  })

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6"
      data-testid="portfolio"
    >
      <h2 className="font-semibold text-slate-900">Portfolio</h2>
      <p className="mt-1 text-sm text-slate-600">
        Work you have completed in this career. Each piece shows what you can do; open the
        files to look back at them.
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Tasks you pass appear here, with your files.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map(({ assignment, progress, passedAt, level, files }) => (
            <li
              key={assignment.id}
              className="rounded-lg border border-slate-200 p-3"
              data-testid="portfolio-item"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-slate-900">{assignment.title}</span>
                <span className="shrink-0 text-sm font-semibold text-emerald-700">
                  {bestScore(progress)}%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {level?.title}
                {passedAt && ` · completed ${formatDateTime(passedAt.submittedAt)}`}
              </p>
              <p className="mt-1 text-sm text-slate-600">{assignment.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.keys(assignment.skills).map((id) => (
                  <span
                    key={id}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                  >
                    {getSkill(id)?.name ?? id}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => onOpenFile(file.kind, file.id)}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Icon name={FILE_ICONS[file.kind]} className="h-3.5 w-3.5" />
                    {FILE_NAMES[file.kind]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
