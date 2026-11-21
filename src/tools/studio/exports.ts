/**
 * Exports of a Space Studio project, made from the model and from the same
 * plan drawing the editor shows. Loaded only when the player exports.
 *
 * - SVG: every floor's plan, true to scale (the SVG's size is in millimetres at 1:100).
 * - PNG: the same plan as an image.
 * - PDF: each floor to a standard scale on A3, with a title block and scale
 *   bar, followed by the report (rooms, checks, schedules, costs).
 * - DXF: for CAD programs. JSON: a backup to import as a new project.
 * - Report: a standalone HTML page.
 */
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { downloadFile, downloadTextFile, safeFileName } from '../../lib/download'
import { bounds, itemCorners } from '../../studio/geometry'
import type { StudioState } from '../../studio/model'
import {
  projectToDxf,
  projectToJson,
  reportData,
  reportHtml,
} from '../../studio/documents'
import { stairCorners } from '../../studio/ops'
import { PlanDefs, PlanDrawing } from './PlanDrawing'
import { DEFAULT_LAYERS } from './shared'

export type ExportKind = 'pdf' | 'svg' | 'png' | 'dxf' | 'json' | 'report'

/** The plan's extent on a floor (mm), with room for labels. */
export function floorBounds(state: StudioState, floor: string) {
  const pts = [
    ...state.walls.filter((w) => w.floor === floor).flatMap((w) => [w.a, w.b]),
    ...state.rooms.filter((r) => r.floor === floor).flatMap((r) => r.outline),
    ...state.items.filter((i) => i.floor === floor).flatMap((i) => itemCorners(i)),
    ...state.stairs.filter((s) => s.floor === floor).flatMap((s) => stairCorners(s)),
    ...state.slabs.filter((s) => s.floor === floor).flatMap((s) => s.outline),
    ...state.dimensions.filter((d) => d.floor === floor).flatMap((d) => [d.a, d.b]),
  ]
  const b = pts.length
    ? bounds(pts)
    : { minX: 0, minY: 0, maxX: 6000, maxY: 4000, width: 6000, height: 4000 }
  const m = 1200
  return { x: b.minX - m, y: b.minY - m, w: b.width + m * 2, h: b.height + m * 2 }
}

/** One floor's plan as SVG markup. `paperScale` sets the SVG's printed size (1:paperScale). */
export function floorSvg(state: StudioState, floor: string, paperScale = 100): string {
  const b = floorBounds(state, floor)
  const markup = renderToStaticMarkup(
    createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: `${b.x} ${b.y} ${b.w} ${b.h}`,
        width: `${(b.w / paperScale).toFixed(1)}mm`,
        height: `${(b.h / paperScale).toFixed(1)}mm`,
        fontFamily: 'Arial, Helvetica, sans-serif',
      },
      createElement('rect', { x: b.x, y: b.y, width: b.w, height: b.h, fill: '#ffffff' }),
      createElement(PlanDefs),
      createElement(PlanDrawing, {
        state,
        floor,
        layers: { ...DEFAULT_LAYERS, below: false },
        pixel: 18,
      }),
    ),
  )
  return markup
}

/** Every floor's plan, stacked, in one SVG (1:100 when printed at its size). */
export function projectSvg(state: StudioState): string {
  const floors = [...state.floors].sort((a, b) => a.elevation - b.elevation)
  const parts = floors.map((f) => ({ f, b: floorBounds(state, f.id) }))
  const width = Math.max(...parts.map((p) => p.b.w))
  const title = 900
  let y = 0
  const groups = parts.map(({ f, b }) => {
    const inner = floorSvg(state, f.id)
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '')
    const g = `<g transform="translate(0 ${y + title})"><text x="400" y="-300" font-size="420" font-weight="bold" fill="#0f172a">${escapeXml(f.name)}</text><g transform="translate(${-b.x} ${-b.y})">${inner}</g></g>`
    y += b.h + title
    return g
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${y}" width="${(width / 100).toFixed(1)}mm" height="${(y / 100).toFixed(1)}mm" font-family="Arial, Helvetica, sans-serif">
<title>${escapeXml(state.project.name)}: floor plans at 1:100</title>
<rect width="${width}" height="${y}" fill="#ffffff"/>
${groups.join('\n')}
</svg>
`
}

const escapeXml = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  )

/** Draws SVG markup to a canvas at a given size (px). */
async function rasterise(
  svg: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('The plan could not be drawn as an image.'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width))
    canvas.height = Math.max(1, Math.round(height))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function canvasBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('The image could not be made.')
  return new Uint8Array(await blob.arrayBuffer())
}

/** The PNG of every floor's plan (about 8 px per paper millimetre at 1:100). */
export async function projectPng(state: StudioState): Promise<Uint8Array> {
  const svg = projectSvg(state)
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!
  const w = Number(m[1])
  const h = Number(m[2])
  const px = Math.min(6000 / w, 6000 / h, 0.1) // â‰¤ 6000 px a side
  return canvasBytes(await rasterise(svg, w * px, h * px))
}

const SCALES = [20, 50, 100, 200, 500, 1000]

/** The plans to scale on A3 landscape, then the report. */
export async function projectPdf(
  state: StudioState,
  date = new Date(),
): Promise<Uint8Array> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
  const W = 420
  const H = 297
  const margin = 12
  const titleH = 28
  const area = { w: W - margin * 2, h: H - margin * 2 - titleH - 4 }
  const floors = [...state.floors].sort((a, b) => a.elevation - b.elevation)
  for (let i = 0; i < floors.length; i++) {
    const f = floors[i]
    if (i > 0) pdf.addPage('a3', 'landscape')
    const b = floorBounds(state, f.id)
    const scale =
      SCALES.find((s) => b.w / s <= area.w && b.h / s <= area.h) ??
      SCALES[SCALES.length - 1]
    const pw = b.w / scale
    const ph = b.h / scale
    const canvas = await rasterise(floorSvg(state, f.id, scale), pw * 8, ph * 8)
    const x = margin + (area.w - pw) / 2
    const y = margin + (area.h - ph) / 2
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, pw, ph, undefined, 'FAST')
    // Border and title block.
    pdf.setDrawColor(30, 41, 59)
    pdf.setLineWidth(0.5)
    pdf.rect(margin - 4, margin - 4, W - (margin - 4) * 2, H - (margin - 4) * 2)
    const tb = { x: W - margin - 170, y: H - margin - titleH, w: 170, h: titleH }
    pdf.rect(tb.x, tb.y, tb.w, tb.h)
    pdf.line(tb.x + 110, tb.y, tb.x + 110, tb.y + tb.h)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text(state.project.name.slice(0, 48), tb.x + 3, tb.y + 7)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(`${f.name} plan`, tb.x + 3, tb.y + 13)
    if (state.project.client)
      pdf.text(`Client: ${state.project.client.slice(0, 50)}`, tb.x + 3, tb.y + 18)
    pdf.text('GamHub Space Studio (simulation)', tb.x + 3, tb.y + 24)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.text(`1:${scale}`, tb.x + 113, tb.y + 9)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text('at A3', tb.x + 113, tb.y + 14)
    pdf.text(date.toLocaleDateString('en-GB'), tb.x + 113, tb.y + 20)
    pdf.text(`Sheet ${i + 1} of ${floors.length}`, tb.x + 113, tb.y + 25)
    // Scale bar: 5 m.
    const bar = 5000 / scale
    const sx = margin
    const sy = H - margin - 8
    pdf.setFillColor(30, 41, 59)
    for (let k = 0; k < 5; k++) {
      if (k % 2 === 0) pdf.rect(sx + (k * bar) / 5, sy, bar / 5, 2, 'F')
      else pdf.rect(sx + (k * bar) / 5, sy, bar / 5, 2)
    }
    pdf.setFontSize(8)
    pdf.text('0', sx, sy + 6)
    pdf.text('5 m', sx + bar - 3, sy + 6)
    pdf.text(
      'Dimensions in millimetres unless stated. Check all dimensions on site.',
      sx + bar + 8,
      sy + 2,
    )
  }
  // The report.
  const d = reportData(state)
  const a = d.analysis
  pdf.addPage('a4', 'portrait')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(`${state.project.name}: project report`, 15, 20)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  const lines = pdf.splitTextToSize(
    `${a.rooms.length} rooms on ${state.floors.length} floor(s), ${a.totalArea.toFixed(1)} mÂ² in all. Estimated cost Â£${a.costs.total.toLocaleString('en-GB')}${state.project.budget !== undefined ? ` against a budget of Â£${state.project.budget.toLocaleString('en-GB')}` : ''}. Prices are fictional (a simulation).`,
    180,
  ) as string[]
  pdf.text(lines, 15, 28)
  let y = 28 + lines.length * 5 + 4
  if (state.project.notes) {
    const notes = pdf.splitTextToSize(
      `Design statement: ${state.project.notes}`,
      180,
    ) as string[]
    pdf.text(notes, 15, y)
    y += notes.length * 5 + 4
  }
  const table = (title: string, head: string[], body: string[][]) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    if (y > 270) {
      pdf.addPage('a4', 'portrait')
      y = 20
    }
    pdf.text(title, 15, y)
    autoTable(pdf, {
      startY: y + 2,
      head: [head],
      body,
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
      showHead: 'everyPage',
    })
    const finalY = (pdf as unknown as { lastAutoTable?: { finalY?: number } })
      .lastAutoTable?.finalY
    y = (finalY ?? y) + 10
  }
  table(
    'Rooms',
    ['Floor', 'Room', 'Area', 'Size', 'Floor finish', 'Doors', 'Windows'],
    d.rooms.map((r) => [
      r.floor,
      r.name,
      r.area,
      r.size,
      r.floorFinish,
      String(r.doors),
      String(r.windows),
    ]),
  )
  table(
    'Checks',
    ['Check'],
    a.issues.length
      ? a.issues.map((i) => [
          `${i.severity === 'error' ? 'Fix' : i.severity === 'warning' ? 'Check' : 'Note'}: ${i.message}`,
        ])
      : [['No problems were found.']],
  )
  table(
    'Furniture',
    ['Item', 'Room', 'Size', 'Finish', 'Price'],
    d.furniture.map((f) => [
      f.name,
      f.room,
      f.size,
      f.material,
      `Â£${f.price.toLocaleString('en-GB')}`,
    ]),
  )
  table(
    'Cost',
    ['', 'Amount'],
    [
      ['Furniture', `Â£${a.costs.furniture.toLocaleString('en-GB')}`],
      ['Fittings', `Â£${a.costs.fixtures.toLocaleString('en-GB')}`],
      ['Doors and windows', `Â£${a.costs.openings.toLocaleString('en-GB')}`],
      ['Finishes', `Â£${a.costs.finishes.toLocaleString('en-GB')}`],
      ['Total', `Â£${a.costs.total.toLocaleString('en-GB')}`],
    ],
  )
  return new Uint8Array(pdf.output('arraybuffer'))
}

export async function exportProject(
  kind: ExportKind,
  state: StudioState,
  name: string,
): Promise<void> {
  const file = safeFileName(name || state.project.name || 'Space Studio project')
  switch (kind) {
    case 'svg':
      return downloadTextFile(`${file} plans.svg`, projectSvg(state), 'image/svg+xml')
    case 'png':
      return downloadFile(`${file} plans.png`, await projectPng(state), 'image/png')
    case 'pdf':
      return downloadFile(`${file} plans.pdf`, await projectPdf(state), 'application/pdf')
    case 'dxf':
      return downloadTextFile(`${file}.dxf`, projectToDxf(state), 'application/dxf')
    case 'json':
      return downloadTextFile(
        `${file}.studio.json`,
        projectToJson(state),
        'application/json',
      )
    case 'report': {
      const floors = [...state.floors].sort((a, b) => a.elevation - b.elevation)
      const plans = floors.map((f) => ({ floor: f.name, svg: floorSvg(state, f.id) }))
      return downloadTextFile(
        `${file} report.html`,
        reportHtml(state, plans),
        'text/html',
      )
    }
  }
}
