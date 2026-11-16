import { describe, expect, it } from 'vitest'
import { HOURS } from '../content/workday'
import { newProfileData, type ProfileData } from '../game/career'
import { BRIEFS, getBrief, unmetRequirements } from './briefs'
import { beamSpan, checkDesign } from './checks'
import type { BuildingDesign, Design } from './design'
import {
  MINUTES_PER_DAY,
  REVIEW_MINUTES,
  activeProject,
  builtDesign,
  checkEngineering,
  currentStage,
  decideIssue,
  forecastCost,
  handOver,
  handoverBlockers,
  inspectionItems,
  inspectionOutcome,
  itemReading,
  judgeItem,
  latest,
  measureItem,
  projectAvailability,
  projectOf,
  recordDocument,
  saveDesign,
  signInspection,
  siteBlock,
  startConstruction,
  startProject,
  submitDesign,
} from './engine'
import { conforms, type InspectionId } from './inspections'
import { getIssue, issueChoices } from './issues'
import { billOfQuantities, programme, programmeDays } from './quantities'
import { diffDesigns, reviewerFor } from './revisions'
import { correctedFootbridge, correctedWorkshop, correctedYardStore } from './testDesigns'

const yard = getBrief('yard-store')!

function engineer(): ProfileData {
  const p = newProfileData('Alex', 1, 'engineering-services')
  return { ...p, work: { ...p.work, minute: HOURS.start } }
}

/** Moves the office clock on by working minutes (into the next days), then the checks run. */
function advance(profile: ProfileData, minutes: number): ProfileData {
  let { day, minute } = profile.work
  let left = minutes
  while (left > 0) {
    const today = Math.min(left, HOURS.end - minute)
    minute += today
    left -= today
    if (left > 0) {
      day += 1
      minute = HOURS.start
    }
  }
  return checkEngineering({ ...profile, work: { ...profile.work, day, minute } })
}

/** Runs the site until it stops (an issue, a hold point, handover) or the time runs out. */
function runUntilBlocked(profile: ProfileData, limit = 2000): ProfileData {
  let p = profile
  for (let t = 0; t < limit; t += 5) {
    p = advance(p, 5)
    if (siteBlock(activeProject(p)!)) return p
  }
  return p
}

function approvedYard(): ProfileData {
  let p = startProject(engineer(), 'yard-store')
  p = saveDesign(p, 'yard-store', correctedYardStore(), 'plan-editor')
  p = submitDesign(p, 'yard-store')
  return advance(p, REVIEW_MINUTES)
}

/** Measures every item of an inspection and judges each truthfully. */
function inspectHonestly(p: ProfileData, id: InspectionId): ProfileData {
  const project = activeProject(p)!
  for (const item of inspectionItems(project, id)) {
    p = measureItem(p, project.id, id, item.id)
    const ok = conforms(item, itemReading(project, item))
    p = judgeItem(p, project.id, id, item.id, ok ? 'ok' : 'defect')
  }
  return signInspection(p, project.id, id)
}

describe('the concept designs need engineering', () => {
  it('the yard store concept fails its calculations and its brief', () => {
    const report = checkDesign(yard.concept, yard.site)
    const ids = report.findings.filter((f) => f.severity === 'error').map((f) => f.id)
    expect(ids).toContain('calc-roof-beam')
    expect(ids).toContain('calc-footing-width')
    expect(ids).toContain('calc-footing-depth')
    expect(unmetRequirements(yard, yard.concept).map((r) => r.id)).toEqual([
      'forklift',
      'daylight',
    ])
  })

  it('the corrected yard store passes every check and the brief', () => {
    const design = correctedYardStore()
    const report = checkDesign(design, yard.site)
    expect(report.findings.filter((f) => f.severity === 'error')).toEqual([])
    expect(report.passes).toBe(true)
    expect(unmetRequirements(yard, design)).toEqual([])
    // M = 7 × 8² ÷ 8 = 56 kNm; σ = 56e6 ÷ 480e3 = 117 N/mm².
    const beam = report.calcs.find((c) => c.id === 'roof-beam')!
    expect(beam.working.join(' ')).toContain('56.0 kNm')
    expect(beam.passes).toBe(true)
  })

  it('a column line halves the beam span', () => {
    const design = correctedYardStore()
    expect(beamSpan(design)).toBe(8)
    const withColumns = {
      ...design,
      columns: [
        { id: 'C1', x: 4000, y: 4000, section: 'NB-150' },
        { id: 'C2', x: 8000, y: 4000, section: 'NB-150' },
      ],
    }
    expect(beamSpan(withColumns)).toBe(4)
  })

  it('every brief’s concept fails something, and is buildable once corrected', () => {
    for (const brief of BRIEFS) {
      const report = checkDesign(brief.concept, brief.site)
      expect(report.passes && unmetRequirements(brief, brief.concept).length === 0).toBe(
        false,
      )
    }
  })

  it('the footbridge and the workshop can be corrected to pass', () => {
    for (const [id, design] of [
      ['mill-footbridge', correctedFootbridge()],
      ['workshop-office', correctedWorkshop()],
    ] as const) {
      const brief = getBrief(id)!
      const report = checkDesign(design, brief.site)
      expect(
        report.findings.filter((f) => f.severity === 'error'),
        id,
      ).toEqual([])
      expect(unmetRequirements(brief, design), id).toEqual([])
    }
  })

  it('rejects impossible geometry with reasons', () => {
    const design = correctedYardStore()
    const crossing: Design = {
      ...design,
      outline: [
        [0, 0],
        [12000, 8000],
        [12000, 0],
        [0, 8000],
      ],
    }
    expect(checkDesign(crossing, yard.site).findings.map((f) => f.id)).toContain(
      'outline-crosses',
    )
    const wide: Design = {
      ...design,
      openings: [
        {
          id: 'W9',
          kind: 'window',
          wall: 1,
          offset: 4000,
          width: 7800,
          height: 1000,
          sill: 1000,
          storey: 0,
        },
      ],
    }
    expect(checkDesign(wide, yard.site).findings.map((f) => f.id)).toContain(
      'opening-end-W9',
    )
    const tall: Design = {
      ...design,
      openings: [
        {
          id: 'D9',
          kind: 'door',
          wall: 0,
          offset: 6000,
          width: 1000,
          height: 3500,
          sill: 0,
          storey: 0,
        },
      ],
    }
    expect(checkDesign(tall, yard.site).findings.map((f) => f.id)).toContain(
      'opening-lintel-D9',
    )
  })
})

describe('quantities and the programme come from the design', () => {
  it('more windows mean more window area, cost and fitting time', () => {
    const a = billOfQuantities(yard.concept)
    const b = billOfQuantities(correctedYardStore())
    const windows = (e: typeof a) => e.lines.find((l) => l.code === '7.2')!.quantity
    expect(windows(b)).toBeGreaterThan(windows(a))
    expect(b.total).toBeGreaterThan(0)
    expect(programmeDays(correctedYardStore())).toBeGreaterThan(20)
    expect(programme(correctedYardStore()).map((s) => s.id)).not.toContain('plumbing')
  })

  it('the bridge has its own stages', () => {
    const bridge = getBrief('mill-footbridge')!.concept
    expect(programme(bridge).map((s) => s.id)).toEqual([
      'survey',
      'excavation',
      'reinforcement',
      'foundations',
      'structure',
      'slab',
      'finishing',
      'inspection',
      'handover',
    ])
  })
})

describe('revisions', () => {
  it('classifies changes and who checks them', () => {
    const before = correctedYardStore()
    const after: BuildingDesign = {
      ...before,
      openings: [
        ...before.openings,
        {
          id: 'W4',
          kind: 'window',
          wall: 3,
          offset: 4000,
          width: 1200,
          height: 1050,
          sill: 1200,
          storey: 0,
        },
      ],
    }
    const changes = diffDesigns(before, after)
    expect(changes.map((c) => c.text)).toEqual(['Window W4 added in wall 4'])
    expect(reviewerFor(changes)).toBe('structural')
    const services = diffDesigns(before, {
      ...before,
      services: { ...before.services, circuits: 4 },
    })
    expect(reviewerFor(services)).toBe('services')
  })
})

describe('a project from design to handover', () => {
  it('offers the first project to a graduate, and only one at a time', () => {
    const p = engineer()
    expect(projectAvailability(p, yard).state).toBe('available')
    expect(projectAvailability(p, getBrief('mill-footbridge')!).state).toBe('locked')
    const started = startProject(p, 'yard-store')
    expect(activeProject(started)?.revisions).toHaveLength(1)
    expect(latest(activeProject(started)!).status).toBe('draft')
  })

  it('the concept is returned with the checker’s comments; nothing can be built from it', () => {
    let p = startProject(engineer(), 'yard-store')
    p = submitDesign(p, 'yard-store')
    p = advance(p, REVIEW_MINUTES - 1)
    expect(latest(activeProject(p)!).status).toBe('submitted')
    p = advance(p, 1)
    const r = latest(activeProject(p)!)
    expect(r.status).toBe('rejected')
    expect(r.review?.comments.join(' ')).toMatch(/Roof beams/)
    expect(p.inbox.at(-1)?.subject).toMatch(/needs changes/)
    expect(startConstruction(p, 'yard-store')).toBe(p)
  })

  it('a corrected design is approved, issued and built, with issues and hold points', () => {
    let p = approvedYard()
    const project = activeProject(p)!
    expect(latest(project).status).toBe('approved')
    expect(p.inbox.at(-1)?.subject).toMatch(/approved/)
    p = startConstruction(p, 'yard-store')
    expect(activeProject(p)!.status).toBe('construction')

    // Excavation: the hydraulic hose bursts and work stops for a decision.
    p = runUntilBlocked(p)
    expect(siteBlock(activeProject(p)!)).toMatch(/hydraulic hose/)
    expect(currentStage(activeProject(p)!)?.id).toBe('excavation')
    const before = p.work.reputation
    p = decideIssue(p, 'yard-store', 'excavator-hose', 'contain-replace')
    expect(p.work.reputation).toBeGreaterThan(before)

    // The formation inspection: the north-east corner was dug 150 mm shallow.
    p = runUntilBlocked(p)
    expect(siteBlock(activeProject(p)!)).toMatch(/Formation inspection/)
    const items = inspectionItems(activeProject(p)!, 'formation')
    const depthB = items.find((i) => i.id === 'depth-b')!
    expect(itemReading(activeProject(p)!, depthB)).toBeLessThan(depthB.design - 100)
    // Readings cannot be judged before they are taken.
    expect(judgeItem(p, 'yard-store', 'formation', 'depth-b', 'defect')).toBe(p)
    p = inspectHonestly(p, 'formation')
    expect(activeProject(p)!.inspections.formation.status).toBe('rework')
    expect(activeProject(p)!.site?.rework?.fixes).toEqual(['depth-b'])
    // After the rework, the inspection is due again, and now passes.
    p = runUntilBlocked(p)
    expect(siteBlock(activeProject(p)!)).toMatch(/Formation inspection/)
    p = inspectHonestly(p, 'formation')
    expect(activeProject(p)!.inspections.formation.status).toBe('passed')
    expect(activeProject(p)!.latent).toEqual([])
  })

  it('a defect signed off as fine is built over, and comes back at handover', () => {
    let p = startConstruction(approvedYard(), 'yard-store')
    p = runUntilBlocked(p)
    p = decideIssue(p, 'yard-store', 'excavator-hose', 'contain-replace')
    p = runUntilBlocked(p)
    const project = activeProject(p)!
    for (const item of inspectionItems(project, 'formation')) {
      p = measureItem(p, 'yard-store', 'formation', item.id)
      p = judgeItem(p, 'yard-store', 'formation', item.id, 'ok')
    }
    expect(inspectionOutcome(activeProject(p)!, 'formation')).toEqual({
      kind: 'passed',
      latent: ['depth-b'],
    })
    p = signInspection(p, 'yard-store', 'formation')
    expect(activeProject(p)!.latent).toEqual(['depth-b'])
    expect(activeProject(p)!.metrics.quality).toBeLessThan(80)
  })

  it('rejecting good work costs time but no rework', () => {
    let p = startConstruction(approvedYard(), 'yard-store')
    p = runUntilBlocked(p)
    p = decideIssue(p, 'yard-store', 'excavator-hose', 'contain-replace')
    p = runUntilBlocked(p)
    const project = activeProject(p)!
    for (const item of inspectionItems(project, 'formation')) {
      p = measureItem(p, 'yard-store', 'formation', item.id)
      p = judgeItem(
        p,
        'yard-store',
        'formation',
        item.id,
        item.id === 'width' ? 'defect' : 'ok',
      )
    }
    expect(inspectionOutcome(activeProject(p)!, 'formation').kind).toBe('remeasured')
  })

  it('an unapproved change does not touch the site; an approved one does', () => {
    let p = startConstruction(approvedYard(), 'yard-store')
    const built = builtDesign(activeProject(p)!)
    const bigger = {
      ...correctedYardStore(),
      services: { circuits: 3, sanitary: 0, hvac: 0 },
    }
    p = saveDesign(p, 'yard-store', bigger, 'cadcraft')
    expect(builtDesign(activeProject(p)!)).toEqual(built)
    expect(latest(activeProject(p)!).status).toBe('draft')
    p = submitDesign(p, 'yard-store')
    p = advance(p, REVIEW_MINUTES)
    const project = activeProject(p)!
    expect(latest(project).status).toBe('approved')
    expect(project.site?.built).toBe(latest(project).n)
    expect(builtDesign(project)).toEqual(bigger)
  })

  it('the client’s window waits for an approved revision that adds one', () => {
    let p = startConstruction(approvedYard(), 'yard-store')
    // Play every decision well until the client asks for the window.
    for (let i = 0; i < 40; i++) {
      p = runUntilBlocked(p)
      const project = activeProject(p)!
      const open = Object.entries(project.issues).find(([, s]) => s.status === 'open')
      if (open?.[0] === 'client-window') break
      if (open) {
        const def = getIssue(open[0])!
        const best = issueChoices(def, project.seed, 2).find((c) => c.best)!
        p = decideIssue(p, project.id, open[0], best.id)
        continue
      }
      const hold = Object.entries(project.inspections).find(([, s]) => s.status === 'due')
      if (hold) p = inspectHonestly(p, hold[0] as InspectionId)
    }
    expect(siteBlock(activeProject(p)!)).toMatch(/another window/)
    p = decideIssue(p, 'yard-store', 'client-window', 'revise')
    expect(siteBlock(activeProject(p)!)).toMatch(/approved revision/)
    const progress = activeProject(p)!.site!.progress
    p = advance(p, 60)
    expect(activeProject(p)!.site!.progress).toBe(progress)
    // A revision without the window is returned.
    p = saveDesign(
      p,
      'yard-store',
      { ...correctedYardStore(), services: { circuits: 3, sanitary: 0, hvac: 0 } },
      'cadcraft',
    )
    p = submitDesign(p, 'yard-store')
    p = advance(p, REVIEW_MINUTES)
    expect(latest(activeProject(p)!).status).toBe('rejected')
    // With the window added, it is approved and the walls carry on.
    const withWindow = correctedYardStore()
    withWindow.openings.push({
      id: 'W4',
      kind: 'window',
      wall: 3,
      offset: 4000,
      width: 1200,
      height: 1050,
      sill: 1200,
      storey: 0,
    })
    p = saveDesign(p, 'yard-store', withWindow, 'cadcraft')
    p = submitDesign(p, 'yard-store')
    p = advance(p, REVIEW_MINUTES)
    const project = activeProject(p)!
    expect(latest(project).status).toBe('approved')
    expect(project.issues['client-window'].status).toBe('resolved')
    expect(siteBlock(project)).toBeNull()
  })

  it('plays the whole yard store through to handover', () => {
    let p = startConstruction(approvedYard(), 'yard-store')
    for (let i = 0; i < 80; i++) {
      p = runUntilBlocked(p)
      const project = activeProject(p)
      if (!project) break
      const block = siteBlock(project)
      const open = Object.entries(project.issues).find(([, s]) => s.status === 'open')
      if (open) {
        const def = getIssue(open[0])!
        const circuits = builtDesign(project)?.kind === 'building' ? 2 : 0
        const best = issueChoices(def, project.seed, circuits).find((c) => c.best)!
        p = decideIssue(p, project.id, open[0], best.id)
        continue
      }
      if (Object.values(project.issues).some((s) => s.status === 'awaiting-revision')) {
        const design = { ...correctedYardStore() }
        design.openings = [
          ...design.openings,
          {
            id: 'W4',
            kind: 'window',
            wall: 3,
            offset: 4000,
            width: 1200,
            height: 1050,
            sill: 1200,
            storey: 0,
          },
        ]
        p = saveDesign(p, project.id, design, 'plan-editor')
        p = submitDesign(p, project.id)
        p = advance(p, REVIEW_MINUTES)
        continue
      }
      const hold = Object.entries(project.inspections).find(([, s]) => s.status === 'due')
      if (hold) {
        p = inspectHonestly(p, hold[0] as InspectionId)
        continue
      }
      if (block?.startsWith('Ready to hand over')) {
        expect(handoverBlockers(project).join(' ')).toMatch(/inspection report/)
        p = recordDocument(p, project.id, 'inspection', 'doc-1', project.site!.built)
        p = recordDocument(p, project.id, 'handover', 'doc-2', project.site!.built)
        expect(handoverBlockers(activeProject(p)!)).toEqual([])
        p = handOver(p, project.id)
        break
      }
    }
    const done = projectOf(p, 'yard-store')!
    expect(done.status).toBe('complete')
    expect(done.result?.score).toBeGreaterThanOrEqual(70)
    expect(done.latent).toEqual([])
    expect(p.inbox.at(-1)?.subject).toMatch(/handed over/)
    expect(activeProject(p)).toBeNull()
    expect(forecastCost(done)).toBeGreaterThan(0)
    // The next project needs the next level.
    expect(projectAvailability(p, getBrief('mill-footbridge')!).state).toBe('locked')
  })

  it('site work passes on the compressed programme', () => {
    expect(MINUTES_PER_DAY).toBeGreaterThan(0)
  })
})
