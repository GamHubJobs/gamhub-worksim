/**
 * The project's documents, made from its data: the calculation sheet, the
 * bill of quantities and the programme (Grid Craft workbooks, with live
 * formulas), the specification, the progress report, the inspection report
 * and the handover file (Word Craft documents). Each records the revision it
 * was made from; when the design moves on it is flagged as out of date and
 * can be made again. Pure TypeScript.
 */
import { bullets, docContent, h, labelled, p, table } from '../apps/docs/templates'
import type { DocContent, RichNode, SheetContent } from '../persistence/schemas'
import { createId } from '../lib/ids'
import { getBrief } from './briefs'
import { checkDesign } from './checks'
import { describe as describeDesign, footprintArea, type Design } from './design'
import {
  approved,
  builtDesign,
  currentStage,
  forecastCost,
  inspectionItems,
  itemReading,
  latest,
  siteBlock,
  siteProgress,
  MINUTES_PER_DAY,
} from './engine'
import { INSPECTIONS, formatReading, requirement, type InspectionId } from './inspections'
import { getIssue } from './issues'
import { billOfQuantities, money, programme, stageInfo } from './quantities'
import type { ProjectDocumentKind, ProjectState } from './state'

export const SIMULATION_NOTE =
  'GamHub WorkSim simulation for learning: standard formulas with simplified, fictional loads, rates and limits. Not for real design or construction.'

export interface DocumentPlan {
  kind: ProjectDocumentKind
  /** The app it opens in. */
  app: 'doc' | 'sheet' | 'cad'
  title: (project: string) => string
  description: string
}

export const DOCUMENT_PLANS: DocumentPlan[] = [
  {
    kind: 'drawings',
    app: 'cad',
    title: (p) => `${p}: general arrangement drawing`,
    description:
      'The plan, with dimensions, labels, specification and title block (DXF, for CAD Craft).',
  },
  {
    kind: 'calculations',
    app: 'doc',
    title: (p) => `${p}: calculation sheet`,
    description: 'Every check the design was approved on, with the working.',
  },
  {
    kind: 'quantities',
    app: 'sheet',
    title: (p) => `${p}: bill of quantities`,
    description: 'Every item, quantity, rate and amount, with the totals as formulas.',
  },
  {
    kind: 'specification',
    app: 'doc',
    title: (p) => `${p}: specification`,
    description: 'What is to be built, with which materials and to what standard.',
  },
  {
    kind: 'programme',
    app: 'sheet',
    title: (p) => `${p}: construction programme`,
    description: 'The stages in order, with their durations and start and finish days.',
  },
  {
    kind: 'progress',
    app: 'doc',
    title: (p) => `${p}: site progress report`,
    description: 'Where the site is, what has happened, cost and time.',
  },
  {
    kind: 'inspection',
    app: 'doc',
    title: (p) => `${p}: inspection report`,
    description: 'Every inspection: what was measured, the readings and the decisions.',
  },
  {
    kind: 'handover',
    app: 'doc',
    title: (p) => `${p}: handover file`,
    description:
      'For the client: the as-built design, the documents and what to look after.',
  },
]

/** The revision a document should be made from now. */
export function documentRevision(project: ProjectState): number {
  return project.site?.built ?? approved(project)?.n ?? latest(project).n
}

function designFor(project: ProjectState): Design {
  return builtDesign(project) ?? latest(project).design
}

function header(project: ProjectState, title: string): RichNode[] {
  const brief = getBrief(project.id)!
  return [
    h(1, title),
    labelled('Project:', `${brief.title}, ${brief.location}`),
    labelled('Client:', `${brief.client.name}, ${brief.client.organisation}`),
    labelled('Prepared by:', 'Northbank Engineering Ltd'),
    labelled('Revision:', String(documentRevision(project))),
    p(SIMULATION_NOTE),
  ]
}

export function calculationSheet(project: ProjectState): DocContent {
  const brief = getBrief(project.id)!
  const design = designFor(project)
  const report = checkDesign(design, brief.site)
  return docContent([
    ...header(project, 'Calculation sheet'),
    h(2, 'Design basis'),
    bullets([
      `Structure: ${describeDesign(design)}`,
      `Ground: allowable bearing pressure ${brief.site.bearing} kPa; foundations at least ${brief.site.minDepth} mm deep`,
      `Imposed load on floors: ${brief.site.imposed} kN/m²`,
    ]),
    ...report.calcs.flatMap((c) => [
      h(2, c.title),
      ...c.working.map((w) => p(w)),
      labelled(
        c.passes ? 'Passes:' : 'Fails:',
        `${c.result} (${Math.round(c.utilisation * 100)}% of the limit)`,
      ),
    ]),
    h(2, 'Conclusion'),
    p(
      report.passes
        ? 'Every check passes. The design is adequate on the simplified basis above.'
        : `Not adequate: ${report.findings.filter((f) => f.severity === 'error').length} checks fail.`,
    ),
  ])
}

/** A workbook from rows (strings; text starting with "=" is a formula). */
function sheet(
  name: string,
  rows: Array<Array<string | number>>,
  widths: Record<string, number>,
  bold: number[] = [0],
): SheetContent {
  const cells: SheetContent['sheets'][number]['cells'] = {}
  rows.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value === '' || value === undefined) return
      const address = `${String.fromCharCode(65 + c)}${r + 1}`
      const isMoney =
        typeof value === 'string' && value.startsWith('=') && /AMOUNT|SUM|\*/i.test(value)
      cells[address] = {
        input: String(value),
        ...(bold.includes(r)
          ? { format: { bold: true } }
          : isMoney
            ? { format: { numberFormat: 'currency', decimals: 0 } }
            : {}),
      }
    }),
  )
  return { sheets: [{ id: createId(), name, cells, columnWidths: widths }] }
}

export function quantitiesWorkbook(project: ProjectState): SheetContent {
  const brief = getBrief(project.id)!
  const design = designFor(project)
  const estimate = billOfQuantities(design)
  const first = 4
  const rows: Array<Array<string | number>> = [
    [`${brief.title}: bill of quantities (revision ${documentRevision(project)})`],
    [SIMULATION_NOTE],
    ['Item', 'Description', 'Unit', 'Quantity', 'Rate (£)', 'Amount (£)'],
    ...estimate.lines.map((l, i) => [
      l.code,
      l.item,
      l.unit,
      l.quantity,
      l.rate,
      `=D${first + i}*E${first + i}`,
    ]),
  ]
  const last = first + estimate.lines.length - 1
  rows.push(
    [],
    ['', 'Works', '', '', '', `=SUM(F${first}:F${last})`],
    ['', 'Preliminaries (12%)', '', '', '', `=ROUND(F${last + 2}*0.12,0)`],
    ['', 'Total', '', '', '', `=F${last + 2}+F${last + 3}`],
    ['', 'Client’s budget', '', '', '', brief.budget],
  )
  return sheet(
    'Bill of quantities',
    rows,
    { A: 60, B: 300, C: 50, D: 80, E: 80, F: 110 },
    [0, 2, last + 4],
  )
}

export function programmeWorkbook(project: ProjectState): SheetContent {
  const brief = getBrief(project.id)!
  const design = designFor(project)
  const plan = programme(design)
  const rows: Array<Array<string | number>> = [
    [`${brief.title}: construction programme (revision ${documentRevision(project)})`],
    [`Working days. Target: ${brief.targetDays} days. ${SIMULATION_NOTE}`],
    ['Stage', 'Starts (day)', 'Duration (days)', 'Finishes (day)'],
    ...plan.map((s, i) => [
      s.name,
      i === 0 ? 0 : `=D${3 + i}`,
      s.days,
      `=B${4 + i}+C${4 + i}`,
    ]),
    [],
    ['Total', '', `=SUM(C4:C${3 + plan.length})`, `=D${3 + plan.length}`],
  ]
  const content = sheet('Programme', rows, { A: 240, B: 90, C: 110, D: 100 }, [
    0,
    2,
    plan.length + 4,
  ])
  content.sheets[0].charts = [
    {
      id: createId(),
      type: 'bar',
      title: 'Stage durations (days)',
      range: `A3:A${3 + plan.length}`,
    },
  ]
  // The chart draws the stage names against their durations.
  content.sheets[0].charts[0].range = `A3:C${3 + plan.length}`
  return content
}

export function specification(project: ProjectState): DocContent {
  const design = designFor(project)
  const blocks: RichNode[] = [...header(project, 'Specification')]
  if (design.kind === 'building') {
    blocks.push(
      h(2, 'Building'),
      bullets([
        describeDesign(design),
        `Floor area: ${footprintArea(design).toFixed(1)} m² on each of ${design.storeys} ${design.storeys === 1 ? 'storey' : 'storeys'}`,
      ]),
      h(2, 'Substructure'),
      bullets([
        `${design.foundation.type === 'strip' ? 'Strip' : design.foundation.type === 'pad' ? 'Pad' : 'Raft'} foundations, ${design.foundation.width} mm wide, ${design.foundation.depth} mm deep, reinforced concrete`,
        `Ground-bearing slab, ${design.slab.thickness} mm reinforced concrete`,
        'Reinforcement at 200 mm centres with 50 mm cover',
      ]),
      h(2, 'Superstructure'),
      bullets([
        `External walls: ${design.wall.material}, ${design.wall.thickness} mm, ${design.wall.height} mm per storey`,
        `Roof and floor beams: ${design.beam.section}${design.columns.length ? `, on ${design.columns.length} steel columns` : ''}`,
        `Roof: ${design.roof.type}${design.roof.type === 'pitched' ? `, ${design.roof.pitch}°` : ''}`,
      ]),
      h(2, 'Doors and windows'),
      table([
        ['Mark', 'Type', 'Wall', 'Width (mm)', 'Height (mm)', 'Sill (mm)', 'Storey'],
        ...design.openings.map((o) => [
          o.id,
          o.kind,
          String(o.wall + 1),
          String(o.width),
          String(o.height),
          String(o.sill),
          String(o.storey + 1),
        ]),
      ]),
      h(2, 'Services'),
      bullets([
        `${design.services.circuits} electrical circuits, each tested for insulation resistance (at least 1 MΩ) and earth continuity`,
        `${design.services.sanitary} WCs and basins`,
        `${design.services.hvac} heating and ventilation units`,
      ]),
    )
  } else {
    blocks.push(
      h(2, 'Footbridge'),
      bullets([
        describeDesign(design),
        `Deck: ${design.deck.thickness} mm reinforced concrete on the girders`,
        `Abutments: ${design.abutment.height} mm high, ${design.abutment.base} mm base, reinforced concrete`,
        `Parapets: ${design.parapet.height} mm high`,
      ]),
    )
  }
  blocks.push(
    h(2, 'Workmanship'),
    bullets([
      'Work is built only to approved, issued drawings. Any change is drawn, checked and approved first.',
      'Hold points: no work continues past an inspection until it is signed off.',
    ]),
  )
  return docContent(blocks)
}

export function progressReport(project: ProjectState, day: number): DocContent {
  const brief = getBrief(project.id)!
  const design = designFor(project)
  const plan = programme(design)
  const now = currentStage(project)
  const done = new Set(project.site?.stages.slice(0, project.site.cursor) ?? [])
  const blocks: RichNode[] = [
    ...header(project, `Site progress report, day ${day}`),
    h(2, 'Summary'),
    bullets([
      `Overall progress: ${Math.round(siteProgress(project) * 100)}%`,
      now
        ? `Current stage: ${stageInfo(now.id, design).name} (${Math.round(now.fraction * 100)}%)`
        : 'Not started on site',
      `Site: ${siteBlock(project) ?? 'working'}`,
      `Cost forecast: ${money(forecastCost(project))} against a budget of ${money(brief.budget)}`,
      `Time lost so far: ${project.metrics.delay.toFixed(1)} working days`,
      `Quality ${Math.round(project.metrics.quality)}, safety ${Math.round(project.metrics.safety)}, client satisfaction ${Math.round(project.metrics.client)} (out of 100)`,
    ]),
    h(2, 'Stages'),
    table([
      ['Stage', 'Planned days', 'Status'],
      ...plan.map((s) => [
        s.name,
        String(s.days),
        done.has(s.id)
          ? 'Complete'
          : now?.id === s.id
            ? `In progress (${Math.round(now.fraction * 100)}%)`
            : 'Not started',
      ]),
    ]),
    h(2, 'Issues and decisions'),
  ]
  const issues = Object.entries(project.issues).filter(
    ([, s]) => s.status !== 'not-needed',
  )
  blocks.push(
    issues.length
      ? table([
          ['Issue', 'Decision', 'Status'],
          ...issues.map(([id, s]) => [
            getIssue(id)?.title ?? id,
            s.choice ?? 'Waiting for a decision',
            s.status,
          ]),
        ])
      : p('No issues so far.'),
  )
  blocks.push(h(2, 'Site diary'), bullets(project.log.slice(-12).map((l) => l.text)))
  return docContent(blocks)
}

export function inspectionReport(project: ProjectState): DocContent {
  const blocks: RichNode[] = [...header(project, 'Inspection report')]
  const ids = Object.keys(project.inspections) as InspectionId[]
  if (!ids.length) blocks.push(p('No inspections yet.'))
  for (const id of ids) {
    const state = project.inspections[id]
    const def = INSPECTIONS[id]
    blocks.push(
      h(2, def.title),
      labelled('With:', def.with),
      labelled(
        'Result:',
        state.status === 'passed'
          ? 'Passed'
          : state.status === 'rework'
            ? 'Work rejected, being put right'
            : 'Due',
      ),
      table([
        ['Item', 'Required', 'Reading', 'Judged'],
        ...inspectionItems(project, id).map((item) => {
          const measured = state.measured.includes(item.id) || state.status === 'passed'
          return [
            item.label,
            requirement(item),
            measured ? formatReading(item, itemReading(project, item)) : 'Not measured',
            state.judgements[item.id] === 'defect'
              ? 'Defect'
              : state.judgements[item.id] === 'ok'
                ? 'Conforms'
                : '',
          ]
        }),
      ]),
    )
  }
  const findings = project.latent.length
  blocks.push(
    h(2, 'Open defects'),
    p(
      findings
        ? `${findings} items were accepted that did not conform.`
        : 'None recorded.',
    ),
  )
  return docContent(blocks)
}

export function handoverFile(project: ProjectState): DocContent {
  const brief = getBrief(project.id)!
  const design = designFor(project)
  const estimate = billOfQuantities(design)
  return docContent([
    ...header(project, 'Handover file'),
    h(2, 'What has been built'),
    bullets([
      describeDesign(design),
      `Built to revision ${documentRevision(project)} of the design.`,
    ]),
    h(2, 'Documents in this file'),
    bullets(
      DOCUMENT_PLANS.filter((d) => project.documents[d.kind]).map((d) =>
        d.title(brief.title),
      ),
    ),
    h(2, 'Inspections'),
    bullets(
      Object.entries(project.inspections).map(
        ([id, s]) =>
          `${INSPECTIONS[id as InspectionId].title}: ${s.status === 'passed' ? 'passed' : s.status}`,
      ),
    ),
    h(2, 'Cost'),
    p(
      `Final account ${money(estimate.total + project.metrics.extra)} against a budget of ${money(brief.budget)}.`,
    ),
    h(2, 'Looking after it'),
    bullets(
      design.kind === 'building'
        ? [
            'Test the electrical installation every five years (sooner for a workshop).',
            'Keep gutters and roof outlets clear; inspect the roof each autumn.',
            'Report cracks wider than 1 mm to the engineer.',
          ]
        : [
            'Inspect the parapets, deck surfacing and bearings every year.',
            'Keep the drainage clear; clear leaves before winter.',
            'Principal inspection by an engineer every six years.',
          ],
    ),
    h(2, 'Defects period'),
    p('Twelve months from handover: report any defects to Northbank Engineering.'),
    p(
      `Programme: ${programme(design).reduce((s, x) => s + x.days, 0)} working days planned; site work runs ${MINUTES_PER_DAY} office minutes to a day in the simulation.`,
    ),
  ])
}
