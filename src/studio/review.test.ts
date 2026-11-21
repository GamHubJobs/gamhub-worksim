import { describe, expect, it } from 'vitest'
import { reviewDesign, reviewText } from './review'
import { emptyProject } from './model'
import { addItem, addOpening, addRectRoom, updatePart, WALL_PRESETS } from './ops'
import { OPENING_PRESETS } from './catalog'
import { sampleApartment } from './samples'

const door = OPENING_PRESETS.find((p) => p.id === 'door-single')!

function twoRooms() {
  let s = emptyProject('Review test')
  s = addRectRoom(
    s,
    'f0',
    { x: 0, y: 0 },
    { x: 4000, y: 4000 },
    { name: 'Lounge', use: 'living', walls: WALL_PRESETS.exterior },
  ).state
  s = addRectRoom(
    s,
    'f0',
    { x: 4000, y: 0 },
    { x: 6200, y: 3000 },
    { name: 'Box room', use: 'bedroom', walls: WALL_PRESETS.exterior },
  ).state
  return s
}

describe('colleagues review the actual design', () => {
  it('names the rooms, sizes and problems in the file', () => {
    const [lead, interior, pm, client] = reviewDesign(twoRooms())
    expect(lead.verdict).toBe('changes')
    expect(lead.changes.join(' ')).toMatch(/no door to the outside/)
    expect(interior.changes.join(' ')).toMatch(/Lounge is empty/)
    expect(client.changes.join(' ')).toMatch(/daylight in Lounge and Box room/)
    expect(client.changes.join(' ')).toMatch(/Box room feels small \(6\.6 m²\)/)
    expect(pm.changes.join(' ')).toMatch(/design statement/)
  })

  it('changes with the design: problems fixed, praise for what works', () => {
    let s = twoRooms()
    const front = s.walls.find((w) => w.a.y === 4000 && w.b.y === 4000)!
    s = addOpening(s, front.id, 2000, door).state
    const shared = s.walls.find((w) => w.a.x === 4000 && w.b.x === 4000)!
    s = addOpening(s, shared.id, 1500, door).state
    const lead = reviewDesign(s)[0]
    expect(lead.changes.join(' ')).not.toMatch(/cannot be reached/)
    expect(lead.praise.join(' ')).toMatch(/Every room can be reached/)
  })

  it('flags wet rooms in timber, missing storage and a busy palette', () => {
    let s = sampleApartment()
    const bath = s.rooms.find((r) => r.use === 'bathroom')!
    s = updatePart(s, 'rooms', bath.id, { floorFinish: 'oak-boards' })
    const paints = [
      'paint-sage',
      'paint-navy',
      'paint-terracotta',
      'paint-ochre',
      'paint-blush',
    ]
    s = {
      ...s,
      walls: s.walls.map((w, i) => ({ ...w, finishLeft: paints[i % paints.length] })),
    }
    const interior = reviewDesign(s)[1]
    expect(interior.changes.join(' ')).toMatch(
      /Oak boards in the bathroom will not stand up to water/,
    )
    expect(interior.changes.join(' ')).toMatch(/wall colours: pick two or three/)
    expect(interior.changes.join(' ')).toMatch(/Bedroom 2 has nowhere to store clothes/)
  })

  it('costs against the budget, naming the biggest items', () => {
    let s = sampleApartment()
    s = addItem(s, 'f0', 'piano', 2000, 6000).state
    s = { ...s, project: { ...s.project, budget: 5000 } }
    const pm = reviewDesign(s)[2]
    expect(pm.changes.join(' ')).toMatch(
      /over the £5,000 budget.*Upright piano \(£3,200\)/,
    )
  })

  it('reports whether the brief is met, and reads as an email', () => {
    const reviews = reviewDesign(sampleApartment(), [
      { title: 'Two bedrooms', met: true },
      { title: 'A home office', met: false },
    ])
    const text = reviewText(
      reviews,
      (role) =>
        ({ lead: 'Marguerite', interior: 'Sana', pm: 'Callum', client: 'The client' })[
          role
        ],
    )
    expect(text).toMatch(/Callum \(Project Manager\): changes needed\./)
    expect(text).toMatch(/still to do: a home office/)
    expect(text).toMatch(/^Marguerite \(Architecture Lead\)/)
  })
})
