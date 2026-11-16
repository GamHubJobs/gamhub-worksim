import { describe, expect, it } from 'vitest'
import { getBrief } from '../briefs'
import type { BuildingDesign } from '../design'
import {
  correctedFootbridge,
  correctedWorkshop,
  correctedYardStore,
} from '../testDesigns'
import { designToDxf, dxfToDesign, readEntities } from './dxf'

const INFO = {
  project: 'Yard store',
  client: 'Northbank Facilities',
  revision: 2,
  status: 'Draft',
}

/** Adds entities before the end of the ENTITIES section (as a CAD program saving an edit would). */
function addEntities(dxf: string, pairs: Array<[number, string | number]>): string {
  const body = pairs.map(([c, v]) => `${c}\r\n${v}`).join('\r\n')
  return dxf.replace('0\r\nENDSEC\r\n0\r\nEOF', `${body}\r\n0\r\nENDSEC\r\n0\r\nEOF`)
}

describe('drawings as DXF', () => {
  it('a design survives being drawn and read back', () => {
    for (const design of [correctedYardStore(), correctedWorkshop()]) {
      const read = dxfToDesign(designToDxf(design, INFO), {
        ...design,
        openings: [],
        columns: [],
      })
      expect(read.ok).toBe(true)
      if (read.ok) expect(read.design).toEqual(design)
    }
  })

  it('a bridge survives being drawn and read back', () => {
    const bridge = correctedFootbridge()
    const read = dxfToDesign(
      designToDxf(bridge, INFO),
      getBrief('mill-footbridge')!.concept,
    )
    expect(read.ok && read.design).toEqual(bridge)
  })

  it('writes integer group codes as integers (strict readers refuse "1.0")', () => {
    const dxf = designToDxf(correctedYardStore(), INFO)
    expect(dxf).toContain('70\r\n1\r\n')
    expect(dxf).toContain('62\r\n7\r\n')
    expect(dxf).not.toMatch(/\r\n(62|66|70|72|73)\r\n-?\d+\.0\r\n/)
  })

  it('draws the layers, the title block and the dimensions', () => {
    const dxf = designToDxf(correctedYardStore(), INFO)
    expect(dxf).toContain('WS-OUTLINE')
    expect(dxf).toContain('NORTHBANK ENGINEERING LTD')
    expect(dxf).toContain('$INSUNITS')
    const entities = readEntities(dxf).entities
    expect(entities.filter((e) => e.layer === 'WS-WINDOW')).toHaveLength(3)
    expect(entities.some((e) => e.layer === 'WS-DIM' && e.value === '12000')).toBe(true)
  })

  it('a window drawn on a wall in CAD becomes a window in the design', () => {
    const design = correctedYardStore()
    // A line along the west wall (x = 0, from y 3000 to 4500), no label: as drawn in CAD Craft.
    const dxf = addEntities(designToDxf(design, INFO), [
      [0, 'LINE'],
      [8, 'WS-WINDOW'],
      [10, 0],
      [20, 4500],
      [30, 0],
      [11, 0],
      [21, 3000],
      [31, 0],
    ])
    const read = dxfToDesign(dxf, design)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const added = (read.design as BuildingDesign).openings.find((o) => o.id === 'W4')
    // The west wall runs from (0, 8000) to (0, 0): 3500 to 5000 along it.
    expect(added).toMatchObject({
      kind: 'window',
      wall: 3,
      width: 1500,
      offset: 4250,
      height: 1050,
    })
    expect(read.notes.join(' ')).toMatch(/W4/)
  })

  it('reads an outline saved as an LWPOLYLINE, a label and a changed specification', () => {
    const design = correctedYardStore()
    let dxf = designToDxf(design, INFO).replace(
      /WALL THICKNESS 215/,
      'WALL THICKNESS 300',
    )
    dxf = dxf.replace('W2 H1050 S1200', 'W2 H1350 S900')
    const read = dxfToDesign(dxf, design)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const d = read.design as BuildingDesign
    expect(d.wall.thickness).toBe(300)
    expect(d.openings.find((o) => o.id === 'W2')).toMatchObject({
      height: 1350,
      sill: 900,
    })
    // An outline as CAD Craft saves it (R2000 LWPOLYLINE), in metres.
    const lw = [
      '0',
      'SECTION',
      '2',
      'HEADER',
      '9',
      '$INSUNITS',
      '70',
      '6',
      '0',
      'ENDSEC',
      '0',
      'SECTION',
      '2',
      'ENTITIES',
      '0',
      'LWPOLYLINE',
      '8',
      'WS-OUTLINE',
      '90',
      '4',
      '70',
      '1',
      '10',
      '0',
      '20',
      '0',
      '10',
      '14',
      '20',
      '0',
      '10',
      '14',
      '20',
      '8',
      '10',
      '0',
      '20',
      '8',
      '0',
      'ENDSEC',
      '0',
      'EOF',
    ].join('\n')
    const lwRead = dxfToDesign(lw, design)
    expect(lwRead.ok && (lwRead.design as BuildingDesign).outline).toEqual([
      [0, 0],
      [14000, 0],
      [14000, 8000],
      [0, 8000],
    ])
  })

  it('explains what is wrong with a drawing it cannot use', () => {
    const design = correctedYardStore()
    const offWall = addEntities(designToDxf(design, INFO), [
      [0, 'LINE'],
      [8, 'WS-DOOR'],
      [10, 5000],
      [20, 4000],
      [30, 0],
      [11, 6000],
      [21, 4000],
      [31, 0],
    ])
    expect(dxfToDesign(offWall, design)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/not on any wall/),
    })
    const noOutline = designToDxf(design, INFO).replaceAll('WS-OUTLINE', 'SOMETHING')
    expect(dxfToDesign(noOutline, design)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/WS-OUTLINE/),
    })
    expect(dxfToDesign('AutoCAD Binary DXF\r\n\u001a\u0000', design)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/binary/),
    })
    expect(dxfToDesign('hello', design)).toMatchObject({ ok: false })
  })
})
