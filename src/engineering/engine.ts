/**
 * The Engineer career's projects, as game rules: pure functions that take a
 * career save and return the next one, like the rest of src/game.
 *
 *   design (revisions) → submitted for checking → approved or rejected →
 *   issued for construction → the site builds stage by stage (with issues
 *   to decide and hold points to inspect) → final inspection → handover.
 *
 * The site works while the office clock runs in working hours, on a
 * compressed programme: one working day of site work passes in
 * `MINUTES_PER_DAY` minutes of office time. Nothing is built from an
 * unapproved design: the site only ever builds an approved revision, and a
 * newly approved revision turns work already built to the old one into rework.
 */
import { HOURS } from '../content/workday'
import { createId } from '../lib/ids'
import type { MailMessage, WorkState } from '../persistence/schemas'
import { careerLevel, type ProfileData } from '../game/career'
import { absoluteTime } from '../game/clock'
import { changeReputation, changeTrust } from '../game/relationships'
import { log } from '../game/workday'
import { getBrief, unmetRequirements, type ProjectBrief, BRIEFS } from './briefs'
import { checkDesign } from './checks'
import type { Design } from './design'
import {
  INSPECTIONS,
  conforms,
  reading,
  type InspectionId,
  type InspectionItem,
} from './inspections'
import { getIssue, issueChoices, issueStage, type Effects } from './issues'
import { REVIEWERS } from './people'
import {
  billOfQuantities,
  programme,
  programmeDays,
  stagesFor,
  type StageId,
} from './quantities'
import { affectedStages, diffDesigns, reviewerFor } from './revisions'
import {
  EngineeringWorkSchema,
  type EngineeringWork,
  type ProjectDocumentKind,
  type ProjectState,
  type Revision,
  type SiteState,
} from './state'

/** Office minutes of site work per programme day. */
export const MINUTES_PER_DAY = 10
/** How long the design office takes to check a submitted revision (office minutes). */
export const REVIEW_MINUTES = 30
const SITE_DAY = HOURS.end - HOURS.start

const clamp = (n: number) => Math.max(0, Math.min(100, n))

// ---------------------------------------------------------------------------
// Reading the state
// ---------------------------------------------------------------------------

export function engineeringOf(profile: ProfileData): EngineeringWork {
  return profile.work.engineering ?? EngineeringWorkSchema.parse({})
}

export function projectOf(profile: ProfileData, id: string): ProjectState | null {
  return engineeringOf(profile).projects[id] ?? null
}

export function activeProject(profile: ProfileData): ProjectState | null {
  const e = engineeringOf(profile)
  return e.active ? (e.projects[e.active] ?? null) : null
}

/** The office time now (absolute minutes). */
export function officeNow(work: WorkState): number {
  return absoluteTime(work.day, work.minute)
}

/** The site clock: working minutes since the career began (9:00 to 17:30 each day). */
export function siteNow(work: WorkState): number {
  const today = Math.max(0, Math.min(SITE_DAY, work.minute - HOURS.start))
  return (work.day - 1) * SITE_DAY + today
}

export function latest(project: ProjectState): Revision {
  return project.revisions[project.revisions.length - 1]
}

export function revision(project: ProjectState, n: number): Revision | undefined {
  return project.revisions.find((r) => r.n === n)
}

/** The revision being checked by the design office, if any. */
export function submitted(project: ProjectState): Revision | undefined {
  return project.revisions.find((r) => r.status === 'submitted')
}

/** The most recently approved revision. */
export function approved(project: ProjectState): Revision | undefined {
  return [...project.revisions].reverse().find((r) => r.status === 'approved')
}

/** The design the site is building (the approved revision issued to it). */
export function builtDesign(project: ProjectState): Design | null {
  if (!project.site) return approved(project)?.design ?? null
  return revision(project, project.site.built)?.design ?? null
}

/** The design being worked on: the draft, or the latest revision. */
export function workingDesign(project: ProjectState): Design {
  return latest(project).design
}

export type Availability =
  | { state: 'available' }
  | { state: 'active' | 'complete' }
  | { state: 'locked'; reason: string }

/** Which projects the player can take on. One at a time, in order, from their level. */
export function projectAvailability(
  profile: ProfileData,
  brief: ProjectBrief,
): Availability {
  const e = engineeringOf(profile)
  const p = e.projects[brief.id]
  if (p?.status === 'complete') return { state: 'complete' }
  if (p) return { state: 'active' }
  const { career } = careerLevel(profile)
  const level = Math.max(
    0,
    career.levels.findIndex((l) => l.id === profile.levelId),
  )
  if (level < brief.minLevel)
    return {
      state: 'locked',
      reason: (() => {
        const title = career.levels[brief.minLevel]?.title ?? 'more senior engineer'
        return `Offered to ${/^[AEIOU]/i.test(title) ? 'an' : 'a'} ${title}`
      })(),
    }
  const index = BRIEFS.findIndex((b) => b.id === brief.id)
  const before = BRIEFS[index - 1]
  if (before && e.projects[before.id]?.status !== 'complete')
    return {
      state: 'locked',
      reason: `After the ${before.title.toLowerCase()} is handed over`,
    }
  if (Object.values(e.projects).some((x) => x.status !== 'complete'))
    return { state: 'locked', reason: 'Finish your current project first' }
  return { state: 'available' }
}

/** Is the career one with engineering projects? */
export function hasProjects(profile: ProfileData): boolean {
  return profile.careerId === 'engineering-services'
}

// ---------------------------------------------------------------------------
// Changing the state
// ---------------------------------------------------------------------------

function withEngineering(profile: ProfileData, e: EngineeringWork): ProfileData {
  return { ...profile, work: { ...profile.work, engineering: e } }
}

function withProject(profile: ProfileData, project: ProjectState): ProfileData {
  const e = engineeringOf(profile)
  return withEngineering(profile, {
    ...e,
    projects: { ...e.projects, [project.id]: project },
  })
}

function note(
  project: ProjectState,
  at: number,
  text: string,
  tone: 'good' | 'bad' | 'neutral' = 'neutral',
): ProjectState {
  return { ...project, log: [...project.log, { at, text, tone }].slice(-80) }
}

function mail(
  profile: ProfileData,
  subject: string,
  body: string,
  at: number,
): ProfileData {
  const message: MailMessage = {
    id: createId(),
    from: 'manager',
    subject,
    body,
    // Mail is stamped with real time (milliseconds), like every other message.
    receivedAt: Math.max(Math.round(Date.now()), Math.round(at)),
    readAt: null,
    kind: 'info',
  }
  return { ...profile, inbox: [...profile.inbox, message] }
}

/** Applies a decision's consequences to the project and the career. */
export function applyEffects(
  profile: ProfileData,
  project: ProjectState,
  effects: Effects,
): { profile: ProfileData; project: ProjectState } {
  const m = project.metrics
  let next: ProjectState = {
    ...project,
    metrics: {
      quality: clamp(m.quality + (effects.quality ?? 0)),
      safety: clamp(m.safety + (effects.safety ?? 0)),
      client: clamp(m.client + (effects.client ?? 0)),
      extra: m.extra + (effects.cost ?? 0),
      delay: m.delay + Math.max(0, effects.days ?? 0),
    },
  }
  if (effects.asBuilt) {
    const asBuilt = { ...next.asBuilt }
    for (const [k, v] of Object.entries(effects.asBuilt))
      asBuilt[k] = (asBuilt[k] ?? 0) + v
    next = { ...next, asBuilt }
  }
  if (effects.days && next.site)
    next = {
      ...next,
      site: { ...next.site, wait: next.site.wait + effects.days * MINUTES_PER_DAY },
    }
  let work = profile.work
  if (effects.reputation) work = changeReputation(work, effects.reputation)
  for (const [person, delta] of Object.entries(effects.trust ?? {}))
    work = changeTrust(work, person, delta)
  return {
    profile: { ...profile, work, xp: profile.xp + Math.max(0, effects.xp ?? 0) },
    project: next,
  }
}

function addSkill(profile: ProfileData, skill: string, gain: number): ProfileData {
  return {
    ...profile,
    skills: { ...profile.skills, [skill]: (profile.skills[skill] ?? 0) + gain },
  }
}

/** Takes on a project: its concept design becomes revision 1, a draft. */
export function startProject(profile: ProfileData, id: string): ProfileData {
  const brief = getBrief(id)
  if (!brief || projectAvailability(profile, brief).state !== 'available') return profile
  const at = officeNow(profile.work)
  const project: ProjectState = {
    id,
    seed: (profile.work.record.seed + id.length * 7 + profile.work.day) % 9973,
    started: at,
    status: 'design',
    revisions: [
      {
        n: 1,
        design: brief.concept,
        source: 'concept',
        note: 'Concept design from the bid',
        at,
        status: 'draft',
        submittedAt: null,
        review: null,
      },
    ],
    site: null,
    inspections: {},
    issues: {},
    metrics: { quality: 80, safety: 80, client: 70, extra: 0, delay: 0 },
    asBuilt: { ...brief.asBuilt },
    latent: [],
    files: { drawing: null, models: [] },
    documents: {},
    log: [
      {
        at,
        text: `Project started: ${brief.title} for ${brief.client.organisation}`,
        tone: 'neutral',
      },
    ],
    result: null,
  }
  const e = engineeringOf(profile)
  const next = withEngineering(profile, {
    ...e,
    projects: { ...e.projects, [id]: project },
    active: id,
  })
  return {
    ...next,
    work: log(next.work, `Took on the ${brief.title.toLowerCase()} project`, 'good'),
  }
}

/**
 * Saves a design change: into the draft if there is one, otherwise as a new
 * draft revision. Approved and submitted revisions never change.
 */
export function saveDesign(
  profile: ProfileData,
  id: string,
  design: Design,
  source: Revision['source'],
  noteText = '',
): ProfileData {
  const project = projectOf(profile, id)
  if (!project || project.status === 'complete') return profile
  const at = officeNow(profile.work)
  const last = latest(project)
  if (JSON.stringify(last.design) === JSON.stringify(design) && last.status === 'draft')
    return profile
  const revisions =
    last.status === 'draft'
      ? [
          ...project.revisions.slice(0, -1),
          { ...last, design, source, note: noteText || last.note, at },
        ]
      : [
          ...project.revisions,
          {
            n: last.n + 1,
            design,
            source,
            note: noteText,
            at,
            status: 'draft' as const,
            submittedAt: null,
            review: null,
          },
        ].slice(-40)
  return withProject(profile, { ...project, revisions })
}

/** Sends the draft to the design office for checking. */
export function submitDesign(profile: ProfileData, id: string): ProfileData {
  const project = projectOf(profile, id)
  if (!project) return profile
  const last = latest(project)
  // One revision with the checker at a time.
  if (last.status !== 'draft' || submitted(project)) return profile
  const at = officeNow(profile.work)
  const revisions = [
    ...project.revisions.slice(0, -1),
    { ...last, status: 'submitted' as const, submittedAt: at },
  ]
  const next = note(
    { ...project, revisions },
    at,
    `Revision ${last.n} submitted for checking`,
  )
  return withProject(profile, next)
}

/** The checker's verdict on a design for this project (pure: also used to preview). */
export function reviewDesign(
  project: ProjectState,
  design: Design,
): {
  approve: boolean
  comments: string[]
  reviewer: keyof typeof REVIEWERS
} {
  const brief = getBrief(project.id)!
  const report = checkDesign(design, brief.site)
  const unmet = unmetRequirements(brief, design)
  const base = approved(project)
  const changes = base ? diffDesigns(base.design, design) : []
  const reviewer = base ? reviewerFor(changes) : 'structural'
  const comments = [
    ...report.findings.filter((f) => f.severity === 'error').map((f) => f.message),
    ...unmet.map((r) => `The brief asks for: ${r.text.toLowerCase()}.`),
  ]
  if (base && changes.length === 0)
    comments.push('Nothing has changed since the approved revision.')
  // An open request on site must be met by the revision that answers it.
  const waiting = Object.entries(project.issues).find(
    ([, s]) => s.status === 'awaiting-revision',
  )
  if (waiting && base && design.kind === 'building' && base.design.kind === 'building') {
    const before = base.design.openings.filter((o) => o.kind === 'window').length
    const now = design.openings.filter((o) => o.kind === 'window').length
    if (now <= before)
      comments.push(
        'The client asked for another window: this revision does not add one.',
      )
  }
  return { approve: comments.length === 0, comments, reviewer }
}

function decideReview(
  profile: ProfileData,
  project: ProjectState,
  at: number,
): ProfileData {
  const last = submitted(project) ?? latest(project)
  const brief = getBrief(project.id)!
  const { approve, comments, reviewer } = reviewDesign(project, last.design)
  const who = REVIEWERS[reviewer]
  const firstApproval = !approved(project)
  const base = approved(project)
  let revisions = project.revisions.map((r) =>
    r.n === last.n
      ? {
          ...r,
          status: approve ? ('approved' as const) : ('rejected' as const),
          review: {
            by: who.name,
            at,
            comments: approve ? ['Checked and approved for construction.'] : comments,
          },
        }
      : approve && r.status === 'approved'
        ? { ...r, status: 'superseded' as const }
        : r,
  )
  let next: ProjectState = { ...project, revisions }
  let out = profile
  if (approve) {
    next = note(next, at, `Revision ${last.n} approved by ${who.name}`, 'good')
    out = { ...out, xp: out.xp + (firstApproval ? 40 : 15) }
    out = addSkill(out, 'design-judgement', firstApproval ? 15 : 5)
    out = addSkill(out, 'engineering-analysis', firstApproval ? 15 : 5)
    out = { ...out, work: changeTrust(out.work, 'manager', 3) }
    // On site already: the site now builds the new revision.
    if (next.site && base) {
      const applied = applyRevisionToSite(next, base.design, last.design, last.n)
      next = applied.project
      revisions = next.revisions
      if (applied.rework > 0)
        next = note(
          next,
          at,
          `Rework for revision ${last.n}: ${applied.stages.join(', ')}`,
          'bad',
        )
    }
    // The client's request is answered.
    for (const [issueId, s] of Object.entries(next.issues))
      if (s.status === 'awaiting-revision')
        next = {
          ...next,
          issues: { ...next.issues, [issueId]: { ...s, status: 'resolved' } },
        }
    out = mail(
      out,
      `${brief.title}: revision ${last.n} approved`,
      `Hi {name},\n\n${who.name} has checked revision ${last.n} of the ${brief.title.toLowerCase()} and it is approved${next.site ? ': the site will build to it from now on' : ' for construction'}. ${firstApproval ? 'Issue the drawings and the bill of quantities and we can start on site.' : ''}\n\nHelena`,
      at,
    )
    out = {
      ...out,
      work: log(out.work, `${brief.title}: revision ${last.n} approved`, 'good'),
    }
  } else {
    next = note(
      next,
      at,
      `Revision ${last.n} returned with ${comments.length} comments`,
      'bad',
    )
    out = mail(
      out,
      `${brief.title}: revision ${last.n} needs changes`,
      `Hi {name},\n\n${who.name} has checked revision ${last.n} and can’t approve it yet:\n\n${comments.map((c) => `• ${c}`).join('\n')}\n\nNothing is built from it until these are put right. Revise the design and send it again.\n\nHelena`,
      at,
    )
    out = {
      ...out,
      work: log(
        out.work,
        `${brief.title}: revision ${last.n} returned for changes`,
        'bad',
      ),
    }
  }
  return withProject(out, next)
}

/**
 * A newly approved revision on a live site: the site's plan follows it, and
 * any stage already built that it changes is reworked (time and cost).
 */
function applyRevisionToSite(
  project: ProjectState,
  before: Design,
  after: Design,
  n: number,
): { project: ProjectState; rework: number; stages: StageId[] } {
  const site = project.site!
  const changes = diffDesigns(before, after)
  const touched = affectedStages(changes)
  const doneStages = site.stages.slice(0, site.cursor)
  const redo = doneStages.filter((s) => touched.includes(s))
  const plan = programme(after)
  const estimate = billOfQuantities(after)
  const days = redo.reduce((sum, s) => sum + (plan.find((p) => p.id === s)?.days ?? 1), 0)
  const minutes = days * MINUTES_PER_DAY * 0.4
  const cost = Math.round(
    redo.reduce(
      (sum, s) =>
        sum +
        estimate.lines.filter((l) => l.stage === s).reduce((t, l) => t + l.amount, 0),
      0,
    ) * 0.25,
  )
  const current = site.stages[site.cursor]
  const stages = stagesFor(after)
  const cursor = Math.max(0, stages.indexOf(current))
  const nextSite: SiteState = {
    ...site,
    stages,
    cursor,
    progress: touched.includes(current) ? site.progress * 0.5 : site.progress,
    built: n,
    rework:
      minutes > 0
        ? {
            minutes: (site.rework?.minutes ?? 0) + minutes,
            reason: `Rework to revision ${n}`,
            fixes: [],
            inspection: null,
          }
        : site.rework,
  }
  return {
    project: {
      ...project,
      site: nextSite,
      metrics: {
        ...project.metrics,
        extra: project.metrics.extra + cost,
        delay: project.metrics.delay + days * 0.4,
      },
    },
    rework: minutes,
    stages: redo,
  }
}

/**
 * What issuing for construction needs that is not done: an approved
 * revision, its drawing issued and its bill of quantities made.
 */
export function constructionBlockers(project: ProjectState): string[] {
  const ok = approved(project)
  if (!ok) return ['An approved revision of the design']
  const out: string[] = []
  if (project.documents.drawings?.revision !== ok.n)
    out.push('The drawing issued from the approved revision')
  if (project.documents.quantities?.revision !== ok.n)
    out.push('The bill of quantities made from it')
  return out
}

/** Issues the approved design for construction: the site starts. */
export function startConstruction(profile: ProfileData, id: string): ProfileData {
  const project = projectOf(profile, id)
  if (!project || project.status !== 'design') return profile
  const ok = approved(project)
  if (!ok || constructionBlockers(project).length) return profile
  const now = siteNow(profile.work)
  const at = officeNow(profile.work)
  const site: SiteState = {
    stages: stagesFor(ok.design),
    cursor: 0,
    progress: 0,
    last: now,
    wait: 0,
    built: ok.n,
    startedAt: now,
    done: [],
    rework: null,
  }
  const brief = getBrief(id)!
  const next = note(
    { ...project, status: 'construction', site },
    at,
    `Issued for construction (revision ${ok.n})`,
    'good',
  )
  const out = withProject(profile, next)
  return { ...out, work: log(out.work, `${brief.title}: construction started`, 'good') }
}

// ---------------------------------------------------------------------------
// The site
// ---------------------------------------------------------------------------

/** Why the site is not working now (null: it is working). */
export function siteBlock(project: ProjectState): string | null {
  const site = project.site
  if (!site || project.status !== 'construction') return null
  const stage = site.stages[site.cursor]
  for (const [id, s] of Object.entries(project.issues)) {
    const def = getIssue(id)
    if (s.status === 'open') return `Waiting for your decision: ${def?.title ?? id}`
    if (s.status === 'awaiting-revision' && def && issueStage(def, site.stages) === stage)
      return 'Waiting for the approved revision (the client’s change)'
  }
  const hold = holdAt(project, stage)
  if (hold && stageDone(project)) {
    const state = project.inspections[hold]
    if (!state || state.status === 'due')
      return `Hold point: ${INSPECTIONS[hold as InspectionId].title}`
  }
  if (stage === 'handover' && stageDone(project))
    return 'Ready to hand over to the client'
  return null
}

function holdAt(project: ProjectState, stage: StageId | undefined): string | null {
  if (!stage) return null
  return getBrief(project.id)?.holds[stage] ?? null
}

/** Has the current stage's work been done (it may still wait at a hold point)? */
export function stageDone(project: ProjectState): boolean {
  const site = project.site
  if (!site) return false
  const design = builtDesign(project)
  if (!design) return false
  return site.progress >= stageMinutes(design, site.stages[site.cursor])
}

export function stageMinutes(design: Design, stage: StageId | undefined): number {
  if (!stage) return 0
  return (programme(design).find((p) => p.id === stage)?.days ?? 1) * MINUTES_PER_DAY
}

/** How far through the whole build (0–1), for the site and the reports. */
export function siteProgress(project: ProjectState): number {
  const site = project.site
  const design = builtDesign(project)
  if (!site || !design) return 0
  if (project.status === 'complete') return 1
  const plan = programme(design)
  const total = plan.reduce((s, p) => s + p.days, 0) * MINUTES_PER_DAY
  const before = site.stages
    .slice(0, site.cursor)
    .reduce(
      (s, id) => s + (plan.find((p) => p.id === id)?.days ?? 0) * MINUTES_PER_DAY,
      0,
    )
  return Math.min(
    1,
    (before + Math.min(site.progress, stageMinutes(design, site.stages[site.cursor]))) /
      total,
  )
}

/** The current stage and how far through it (0–1). */
export function currentStage(
  project: ProjectState,
): { id: StageId; fraction: number } | null {
  const site = project.site
  const design = builtDesign(project)
  if (!site || !design) return null
  const id = site.stages[site.cursor]
  if (!id) return null
  return { id, fraction: Math.min(1, site.progress / stageMinutes(design, id)) }
}

/** Brings the site up to date with the clock: work done, issues raised, holds reached. */
export function tickSite(
  profile: ProfileData,
  project: ProjectState,
): { profile: ProfileData; project: ProjectState } {
  if (project.status !== 'construction' || !project.site) return { profile, project }
  const now = siteNow(profile.work)
  let site: SiteState = { ...project.site }
  let elapsed = Math.max(0, now - site.last)
  site.last = Math.max(site.last, now)
  let next: ProjectState = { ...project, site }
  const at = officeNow(profile.work)
  const brief = getBrief(project.id)!
  let out = profile
  for (let guard = 0; guard < 40 && elapsed > 0; guard++) {
    site = next.site!
    if (siteBlock(next)) break
    // Standing (a delay), then rework, then the stage's own work.
    if (site.wait > 0) {
      const take = Math.min(site.wait, elapsed)
      elapsed -= take
      next = { ...next, site: { ...site, wait: site.wait - take } }
      continue
    }
    if (site.rework) {
      const take = Math.min(site.rework.minutes, elapsed)
      elapsed -= take
      const left = site.rework.minutes - take
      if (left > 0) {
        next = { ...next, site: { ...site, rework: { ...site.rework, minutes: left } } }
      } else {
        const fixes = site.rework.fixes
        const asBuilt = { ...next.asBuilt }
        for (const f of fixes) asBuilt[f] = 0
        let inspections = next.inspections
        const again = site.rework.inspection
        if (again)
          inspections = {
            ...inspections,
            [again]: {
              ...inspections[again],
              status: 'due',
              measured: [],
              judgements: {},
            },
          }
        next = note(
          { ...next, asBuilt, inspections, site: { ...site, rework: null } },
          at,
          `Rework finished: ${site.rework.reason}`,
        )
      }
      continue
    }
    const design = builtDesign(next)!
    const stage = site.stages[site.cursor]
    const need = stageMinutes(design, stage)
    if (site.progress >= need) {
      // The stage is finished (and any hold passed): on to the next.
      if (stage === 'handover') break
      const done = [...site.done, { stage, at: site.last - elapsed }]
      next = note(
        { ...next, site: { ...site, cursor: site.cursor + 1, progress: 0, done } },
        at,
        `${programme(design).find((p) => p.id === stage)?.name ?? stage} complete`,
        'good',
      )
      continue
    }
    // Work on the stage, up to the next issue it raises.
    const fraction = site.progress / need
    let stopAt = need
    let raise: string | null = null
    for (const issueId of brief.issues) {
      if (next.issues[issueId]) continue
      const def = getIssue(issueId)
      if (!def || issueStage(def, site.stages) !== stage) continue
      if (def.at < fraction) continue
      const point = def.at * need
      if (point < stopAt) {
        stopAt = point
        raise = issueId
      }
    }
    const take = Math.min(elapsed, stopAt - site.progress)
    elapsed -= take
    site = { ...site, progress: site.progress + take }
    next = { ...next, site }
    if (raise && site.progress >= stopAt - 1e-6) {
      const def = getIssue(raise)!
      const needed = issueNeeded(next, raise)
      next = {
        ...next,
        issues: {
          ...next.issues,
          [raise]: {
            status: needed ? 'open' : 'not-needed',
            choice: null,
            tried: [],
            at,
          },
        },
      }
      if (needed) {
        next = note(next, at, `Issue on site: ${def.title}`, 'bad')
        out = {
          ...out,
          work: log(out.work, `${brief.title}: ${def.title.toLowerCase()}`, 'bad'),
        }
      }
    }
    if (site.progress >= need) {
      const hold = holdAt(next, stage)
      if (hold && next.inspections[hold]?.status !== 'passed') {
        next = {
          ...next,
          inspections: {
            ...next.inspections,
            [hold]: next.inspections[hold] ?? {
              status: 'due',
              measured: [],
              judgements: {},
              attempts: 0,
              at,
            },
          },
        }
        next = note(
          next,
          at,
          `Hold point reached: ${INSPECTIONS[hold as InspectionId].title}`,
        )
        out = {
          ...out,
          work: log(
            out.work,
            `${brief.title}: ${INSPECTIONS[hold as InspectionId].title.toLowerCase()} is due`,
          ),
        }
      }
    }
  }
  return { profile: out, project: next }
}

/** Some issues only arise in some circumstances (an overspend; electrical circuits). */
function issueNeeded(project: ProjectState, id: string): boolean {
  const design = builtDesign(project)
  if (!design) return false
  if (id === 'budget') return forecastCost(project) > getBrief(project.id)!.budget
  if (id === 'ir-test') return design.kind === 'building' && design.services.circuits > 0
  if (id === 'client-window') return design.kind === 'building'
  return true
}

/** What the project will cost: the bill of quantities to the built design, plus extras (£). */
export function forecastCost(project: ProjectState): number {
  const design = builtDesign(project) ?? workingDesign(project)
  return billOfQuantities(design).total + project.metrics.extra
}

/**
 * Runs after every game action (like workplace events): checks submitted
 * designs that are due, and brings each live site up to date.
 */
export function checkEngineering(profile: ProfileData): ProfileData {
  const e = profile.work.engineering
  if (!e) return profile
  // A day that ends on site ends the visit: tomorrow starts at the office.
  let out =
    e.onSite && profile.work.dayOver
      ? { ...profile, work: { ...profile.work, engineering: { ...e, onSite: null } } }
      : profile
  for (const id of Object.keys(e.projects)) {
    let project = projectOf(out, id)!
    const at = officeNow(out.work)
    const waiting = submitted(project)
    if (waiting?.submittedAt != null && at >= waiting.submittedAt + REVIEW_MINUTES) {
      out = decideReview(out, project, at)
      project = projectOf(out, id)!
    }
    const ticked = tickSite(out, project)
    if (ticked.project !== project) out = withProject(ticked.profile, ticked.project)
    else out = ticked.profile
  }
  return out
}

// ---------------------------------------------------------------------------
// Decisions, inspections and handover
// ---------------------------------------------------------------------------

/** The player's decision on an open issue. */
export function decideIssue(
  profile: ProfileData,
  id: string,
  issueId: string,
  choiceId: string,
): ProfileData {
  const project = projectOf(profile, id)
  const def = getIssue(issueId)
  const state = project?.issues[issueId]
  if (!project || !def || state?.status !== 'open') return profile
  const design = builtDesign(project)
  const circuits = design?.kind === 'building' ? design.services.circuits : 0
  const choice = issueChoices(def, project.seed, circuits).find((c) => c.id === choiceId)
  if (!choice || state.tried.includes(choiceId)) return profile
  const at = officeNow(profile.work)
  const applied = applyEffects(profile, project, choice.effects)
  let next = applied.project
  const status = choice.retry
    ? 'open'
    : choice.awaitRevision
      ? 'awaiting-revision'
      : 'resolved'
  next = {
    ...next,
    issues: {
      ...next.issues,
      [issueId]: {
        ...state,
        status,
        choice: choice.retry ? state.choice : choice.id,
        tried: [...state.tried, choiceId],
      },
    },
  }
  next = note(
    next,
    at,
    `${def.title}: ${choice.label}`,
    choice.best ? 'good' : choice.retry ? 'neutral' : 'bad',
  )
  let out = applied.profile
  if (choice.best)
    out = addSkill(
      out,
      def.id === 'harness' || def.id === 'excavator-hose'
        ? 'safe-systems-of-work'
        : 'design-judgement',
      8,
    )
  return withProject(out, next)
}

export function inspectionItems(
  project: ProjectState,
  id: InspectionId,
): InspectionItem[] {
  const design = builtDesign(project)
  return design ? INSPECTIONS[id].items(design, project.seed) : []
}

/** The reading an item gives when measured (what the tape or meter shows). */
export function itemReading(project: ProjectState, item: InspectionItem): number {
  return reading(item, project.asBuilt, project.seed)
}

/** Measures an item on site: its reading can now be judged. Takes a few minutes. */
export function measureItem(
  profile: ProfileData,
  id: string,
  inspection: string,
  item: string,
): ProfileData {
  const project = projectOf(profile, id)
  const state = project?.inspections[inspection]
  if (!project || state?.status !== 'due' || state.measured.includes(item)) return profile
  if (!inspectionItems(project, inspection as InspectionId).some((i) => i.id === item))
    return profile
  return withProject(profile, {
    ...project,
    inspections: {
      ...project.inspections,
      [inspection]: { ...state, measured: [...state.measured, item] },
    },
  })
}

/** The player's judgement of one measured item. */
export function judgeItem(
  profile: ProfileData,
  id: string,
  inspection: string,
  item: string,
  verdict: 'ok' | 'defect',
): ProfileData {
  const project = projectOf(profile, id)
  const state = project?.inspections[inspection]
  if (!project || state?.status !== 'due' || !state.measured.includes(item))
    return profile
  return withProject(profile, {
    ...project,
    inspections: {
      ...project.inspections,
      [inspection]: { ...state, judgements: { ...state.judgements, [item]: verdict } },
    },
  })
}

export type InspectionOutcome =
  | { kind: 'incomplete'; missing: string[] }
  | { kind: 'passed'; latent: string[] }
  | { kind: 'rework'; defects: string[] }
  | { kind: 'remeasured'; wrong: string[] }

/** What signing the inspection would do (pure, for the panel and the tests). */
export function inspectionOutcome(
  project: ProjectState,
  inspection: InspectionId,
): InspectionOutcome {
  const state = project.inspections[inspection]
  const items = inspectionItems(project, inspection)
  const missing = items.filter((i) => !state?.judgements[i.id]).map((i) => i.id)
  if (!state || missing.length) return { kind: 'incomplete', missing }
  const truth = items.map((i) => ({ id: i.id, ok: conforms(i, itemReading(project, i)) }))
  const flagged = truth.filter((t) => state.judgements[t.id] === 'defect')
  const wrongFlags = flagged.filter((t) => t.ok).map((t) => t.id)
  const realDefects = truth.filter((t) => !t.ok).map((t) => t.id)
  const caught = realDefects.filter((d) => state.judgements[d] === 'defect')
  const missed = realDefects.filter((d) => state.judgements[d] === 'ok')
  if (flagged.length === 0) return { kind: 'passed', latent: missed }
  if (caught.length) return { kind: 'rework', defects: caught }
  return { kind: 'remeasured', wrong: wrongFlags }
}

/** Signs the inspection off (or rejects the work). */
export function signInspection(
  profile: ProfileData,
  id: string,
  inspection: InspectionId,
): ProfileData {
  const project = projectOf(profile, id)
  const state = project?.inspections[inspection]
  if (!project || state?.status !== 'due') return profile
  const outcome = inspectionOutcome(project, inspection)
  if (outcome.kind === 'incomplete') return profile
  const at = officeNow(profile.work)
  const def = INSPECTIONS[inspection]
  let out = profile
  let next: ProjectState = {
    ...project,
    inspections: {
      ...project.inspections,
      [inspection]: { ...state, attempts: state.attempts + 1, at },
    },
  }
  if (outcome.kind === 'passed') {
    next = {
      ...next,
      inspections: {
        ...next.inspections,
        [inspection]: { ...next.inspections[inspection], status: 'passed' },
      },
      latent: [...next.latent, ...outcome.latent],
    }
    if (outcome.latent.length) {
      // The defect is built over; it costs later.
      next = {
        ...next,
        metrics: {
          ...next.metrics,
          quality: clamp(next.metrics.quality - 12 * outcome.latent.length),
          safety: clamp(next.metrics.safety - 8 * outcome.latent.length),
        },
      }
      next = note(next, at, `${def.title} signed off`, 'neutral')
    } else {
      next = note(next, at, `${def.title} passed`, 'good')
      out = { ...out, xp: out.xp + 15 }
      out = addSkill(out, 'quality-control', 8)
    }
  } else if (outcome.kind === 'rework') {
    const site = next.site!
    next = {
      ...next,
      inspections: {
        ...next.inspections,
        [inspection]: { ...next.inspections[inspection], status: 'rework' },
      },
      site: {
        ...site,
        rework: {
          minutes: MINUTES_PER_DAY * Math.max(1, outcome.defects.length),
          reason: `${outcome.defects.length === 1 ? 'A defect' : 'Defects'} found at the ${def.title.toLowerCase()}`,
          fixes: outcome.defects,
          inspection,
        },
      },
      metrics: {
        ...next.metrics,
        extra: next.metrics.extra + 600 * outcome.defects.length,
        delay: next.metrics.delay + outcome.defects.length,
      },
    }
    next = note(
      next,
      at,
      `${def.title}: work rejected (${outcome.defects.join(', ')}); rework ordered`,
      'good',
    )
    out = { ...out, xp: out.xp + 20 }
    out = addSkill(out, 'quality-control', 10)
    out = { ...out, work: changeTrust(changeReputation(out.work, 2), 'manager', 2) }
  } else {
    // Good work rejected: the supervisor measures again, and the site stood.
    next = {
      ...next,
      inspections: {
        ...next.inspections,
        [inspection]: { ...next.inspections[inspection], judgements: {} },
      },
      metrics: { ...next.metrics, delay: next.metrics.delay + 0.5 },
      site: next.site
        ? { ...next.site, wait: next.site.wait + MINUTES_PER_DAY / 2 }
        : null,
    }
    next = note(
      next,
      at,
      `${def.title}: re-measured, within tolerance (${outcome.wrong.join(', ')})`,
      'neutral',
    )
  }
  return withProject(out, next)
}

/** Records a document made for the project (and the revision it shows). */
export function recordDocument(
  profile: ProfileData,
  id: string,
  kind: ProjectDocumentKind,
  document: string,
  revisionNumber: number,
): ProfileData {
  const project = projectOf(profile, id)
  if (!project) return profile
  return withProject(profile, {
    ...project,
    documents: { ...project.documents, [kind]: { document, revision: revisionNumber } },
  })
}

/** Documents made from an older revision than the one that matters now. */
export function staleDocuments(project: ProjectState): ProjectDocumentKind[] {
  const current = project.site?.built ?? approved(project)?.n ?? latest(project).n
  return (
    Object.entries(project.documents) as Array<
      [ProjectDocumentKind, { revision: number }]
    >
  )
    .filter(([, d]) => d.revision !== current)
    .map(([k]) => k)
}

/** The project's drawing document, once made. */
export function setDrawing(
  profile: ProfileData,
  id: string,
  document: string,
): ProfileData {
  const project = projectOf(profile, id)
  if (!project) return profile
  return withProject(profile, {
    ...project,
    files: { ...project.files, drawing: document },
  })
}

/** A model file imported from FreeCAD (kept as a document). */
export function addModel(
  profile: ProfileData,
  id: string,
  model: ProjectState['files']['models'][number],
): ProfileData {
  const project = projectOf(profile, id)
  if (!project) return profile
  return withProject(profile, {
    ...project,
    files: { ...project.files, models: [...project.files.models, model].slice(-30) },
  })
}

/** What handing over needs that is not done yet. */
export function handoverBlockers(project: ProjectState): string[] {
  const out: string[] = []
  const stage = currentStage(project)
  if (
    project.status !== 'construction' ||
    stage?.id !== 'handover' ||
    !stageDone(project)
  )
    out.push('The building work and the final inspection must be finished.')
  if (project.inspections.final?.status !== 'passed')
    out.push('The final inspection must be signed off.')
  const current = project.site?.built
  for (const kind of ['inspection', 'handover'] as const)
    if (project.documents[kind]?.revision !== current)
      out.push(
        kind === 'inspection'
          ? 'Write the inspection report (Documents).'
          : 'Prepare the handover file (Documents).',
      )
  return out
}

const LATENT: Record<string, string> = {
  'depth-b':
    'Six months on, cracks open in the north-east corner where the foundation was too shallow.',
  'ground-east':
    'The east abutment settles on its soft ground: the bridge is closed for repairs.',
  spacing:
    'Cracks appear in the foundations, which have a third less steel than designed.',
  openings:
    'The unapproved opening sags without a lintel and has to be propped and rebuilt.',
  'storey-height':
    'The first floor is 40 mm low under the beams: the ductwork no longer fits.',
}

/** Hands the finished project over to the client: the result and its consequences. */
export function handOver(profile: ProfileData, id: string): ProfileData {
  const project = projectOf(profile, id)
  if (!project || handoverBlockers(project).length) return profile
  const brief = getBrief(id)!
  const at = officeNow(profile.work)
  const design = builtDesign(project)!
  // Defects let through come back.
  let metrics = { ...project.metrics }
  const told: string[] = []
  for (const l of project.latent) {
    const key = l.startsWith('ir-') ? 'ir' : l
    metrics = {
      ...metrics,
      client: clamp(metrics.client - 15),
      quality: clamp(metrics.quality - 8),
      safety: key === 'ir' ? clamp(metrics.safety - 15) : metrics.safety,
    }
    told.push(
      key === 'ir'
        ? 'A damaged cable that was signed off trips the board and scorches a socket: an electrician has to trace it.'
        : (LATENT[l] ?? 'A defect that was signed off has to be put right.'),
    )
  }
  const cost = billOfQuantities(design).total + metrics.extra
  const days = programmeDays(design) + metrics.delay
  const budgetScore =
    cost <= brief.budget
      ? 100
      : Math.max(0, 100 - ((cost - brief.budget) / brief.budget) * 200)
  const timeScore =
    days <= brief.targetDays ? 100 : Math.max(0, 100 - (days - brief.targetDays) * 3)
  const score = Math.round(
    metrics.quality * 0.3 +
      metrics.safety * 0.3 +
      metrics.client * 0.2 +
      budgetScore * 0.1 +
      timeScore * 0.1,
  )
  const rating =
    score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 55 ? 'pass' : 'poor'
  let next: ProjectState = {
    ...project,
    status: 'complete',
    metrics,
    result: {
      score,
      rating,
      day: profile.work.day,
      cost,
      days: Math.round(days * 10) / 10,
    },
  }
  next = note(
    next,
    at,
    `Handed over to ${brief.client.organisation}: ${score}/100 (${rating})`,
    score >= 70 ? 'good' : 'bad',
  )
  let out: ProfileData = { ...profile, xp: profile.xp + 60 + Math.round(score * 0.8) }
  out = addSkill(out, 'quality-control', 10)
  out = addSkill(out, 'design-judgement', 10)
  out = {
    ...out,
    work: changeTrust(
      changeReputation(out.work, Math.round((score - 60) / 5)),
      'manager',
      score >= 70 ? 5 : -3,
    ),
  }
  const e = engineeringOf(out)
  out = withEngineering(out, {
    ...e,
    projects: { ...e.projects, [id]: next },
    active: null,
  })
  out = mail(
    out,
    `${brief.title}: handed over`,
    `Hi {name},\n\nThe ${brief.title.toLowerCase()} is handed over to ${brief.client.name} at ${brief.client.organisation}.\n\nCost £${Math.round(cost).toLocaleString('en-GB')} against a budget of £${brief.budget.toLocaleString('en-GB')}; ${Math.round(days)} working days against ${brief.targetDays} planned. Quality ${Math.round(metrics.quality)}, safety ${Math.round(metrics.safety)}, client satisfaction ${Math.round(metrics.client)}.${told.length ? `\n\nAnd from the defects period:\n${told.map((t) => `• ${t}`).join('\n')}` : ''}\n\nOverall: ${score}/100. ${rating === 'excellent' ? 'Outstanding work.' : rating === 'good' ? 'Well done.' : rating === 'pass' ? 'We got there; let’s talk about what to do differently.' : 'We need to talk about this one.'}\n\nHelena`,
    at,
  )
  return {
    ...out,
    work: log(
      out.work,
      `${brief.title} handed over: ${score}/100`,
      score >= 70 ? 'good' : 'bad',
    ),
  }
}
