/**
 * Plays a project as a careful engineer would, one step at a time: the
 * corrected design, the best decision on each issue, honest inspections, the
 * client's window drawn in and approved. For tests and the screenshot tours
 * (development builds expose it as `window.__worksim.engineering`); never
 * used by the game itself. Pure.
 */
import { HOURS } from '../content/workday'
import { careerLevel, type ProfileData } from '../game/career'
import { BRIEFS, getBrief } from './briefs'
import type { Design } from './design'
import {
  activeProject,
  builtDesign,
  checkEngineering,
  currentStage,
  decideIssue,
  inspectionItems,
  itemReading,
  judgeItem,
  latest,
  measureItem,
  recordDocument,
  saveDesign,
  signInspection,
  siteBlock,
  startProject,
  submitDesign,
} from './engine'
import { conforms, type InspectionId } from './inspections'
import { getIssue, issueChoices } from './issues'
import { correctedFootbridge, correctedWorkshop, correctedYardStore } from './testDesigns'

/**
 * For the tours: the level a project is offered at, and the projects before
 * it marked as handed over, so it can be taken on straight away.
 */
export function unlock(profile: ProfileData, id: string): ProfileData {
  const brief = getBrief(id)
  if (!brief) return profile
  const { career } = careerLevel(profile)
  let p: ProfileData = {
    ...profile,
    levelId: career.levels[brief.minLevel]?.id ?? profile.levelId,
  }
  for (const before of BRIEFS.slice(0, BRIEFS.indexOf(brief))) {
    const e = p.work.engineering
    if (e?.projects[before.id]?.status === 'complete') continue
    p = startProject(
      { ...p, work: { ...p.work, engineering: e ? { ...e, active: null } : e } },
      before.id,
    )
    const made = p.work.engineering!.projects[before.id]
    p = {
      ...p,
      work: {
        ...p.work,
        engineering: {
          ...p.work.engineering!,
          active: null,
          projects: {
            ...p.work.engineering!.projects,
            [before.id]: {
              ...made,
              status: 'complete',
              result: {
                score: 80,
                rating: 'good',
                day: p.work.day,
                cost: before.budget,
                days: before.targetDays,
              },
            },
          },
        },
      },
    }
  }
  return p
}

export function correctedDesign(id: string): Design | null {
  if (id === 'yard-store') return correctedYardStore()
  if (id === 'mill-footbridge') return correctedFootbridge()
  if (id === 'workshop-office') return correctedWorkshop()
  return null
}

/** Takes the project on (if needed), puts the corrected design in and submits it. */
export function submitCorrected(profile: ProfileData, id: string): ProfileData {
  let p = activeProject(profile)?.id === id ? profile : startProject(profile, id)
  const design = correctedDesign(id)
  if (!design) return p
  p = saveDesign(p, id, design, 'plan-editor', 'Corrected')
  return submitDesign(p, id)
}

/** One careful step on site: whatever is holding the work up, done well. */
export function autoplayStep(profile: ProfileData): ProfileData {
  const project = activeProject(profile)
  if (!project || project.status !== 'construction') return profile
  const design = builtDesign(project)
  const circuits = design?.kind === 'building' ? design.services.circuits : 0
  const open = Object.entries(project.issues).find(([, s]) => s.status === 'open')
  if (open) {
    const def = getIssue(open[0])
    const best = def && issueChoices(def, project.seed, circuits).find((c) => c.best)
    return best ? decideIssue(profile, project.id, open[0], best.id) : profile
  }
  if (Object.values(project.issues).some((s) => s.status === 'awaiting-revision')) {
    const last = latest(project)
    if (last.status === 'submitted') return profile
    const base = design
    if (base?.kind !== 'building') return profile
    const used = new Set(base.openings.map((o) => o.id))
    let n = 1
    while (used.has(`W${n}`)) n++
    const wall = base.outline.length - 1
    const added: Design = {
      ...base,
      openings: [
        ...base.openings,
        {
          id: `W${n}`,
          kind: 'window',
          wall,
          offset: 2000,
          width: 1000,
          height: 1050,
          sill: 1200,
          storey: 0,
        },
      ],
    }
    return submitDesign(
      saveDesign(profile, project.id, added, 'plan-editor', 'The client’s window'),
      project.id,
    )
  }
  const due = Object.entries(project.inspections).find(([, s]) => s.status === 'due')
  if (due) {
    const id = due[0] as InspectionId
    let p = profile
    for (const item of inspectionItems(project, id)) {
      p = measureItem(p, project.id, id, item.id)
      p = judgeItem(
        p,
        project.id,
        id,
        item.id,
        conforms(item, itemReading(project, item)) ? 'ok' : 'defect',
      )
    }
    return signInspection(p, project.id, id)
  }
  if (siteBlock(project)?.startsWith('Ready to hand over')) {
    const rev = project.site!.built
    let p = profile
    for (const kind of ['inspection', 'handover'] as const)
      if (project.documents[kind]?.revision !== rev)
        p = recordDocument(p, project.id, kind, `autoplay-${kind}`, rev)
    return p
  }
  return profile
}

/**
 * Lets the site work (doing well whatever holds it up) until `stage` is
 * `fraction` done, or the site is ready to hand over (`stage` 'ready').
 * Working hours only: each evening jumps to the next morning. One game
 * action, for the tours.
 */
export function advanceTo(
  profile: ProfileData,
  stage: string,
  fraction = 0.5,
): ProfileData {
  let p = profile
  for (let i = 0; i < 6000; i++) {
    const project = activeProject(p)
    if (!project || project.status !== 'construction') return p
    if (stage === 'ready' && siteBlock(project)?.startsWith('Ready to hand over'))
      return p
    const now = currentStage(project)
    if (now && now.id === stage && now.fraction >= fraction) return p
    const at = project.site?.stages.findIndex((s) => s === stage) ?? -1
    if (at !== -1 && project.site && at < project.site.cursor) return p
    const next = autoplayStep(p)
    if (next !== p) {
      p = checkEngineering(next)
      continue
    }
    let { day, minute } = p.work
    minute += 2
    if (minute >= HOURS.end) {
      day += 1
      minute = HOURS.start
    }
    p = checkEngineering({ ...p, work: { ...p.work, day, minute, dayOver: false } })
  }
  return p
}
