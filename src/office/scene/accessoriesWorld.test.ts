import { describe, expect, it } from 'vitest'
import { getAccessory } from '../../content/accessories'
import { keptModels, type Wardrobe, type WornModel } from '../../game/accessories'
import { withSiteKit, wornUses } from '../../world/character/playerWear'
import type { Wear } from '../../world/character/accessoryLook'
import { crewLook } from '../../engineering/scene/crew'
import { townWear, workWear } from './npcWear'
import { withOwnKit } from './ownKit'
import type { PersonLook } from './people'
import { wardActivities } from './wardLayout'
import { dressAll } from './workwear'

const LOOK: PersonLook = {
  skin: 1,
  hair: 'long',
  hairColor: 0,
  outfit: 'shirt',
  top: '#fff',
  trousers: '#000',
}
const CAST = Object.fromEntries(
  ['senior', 'backM', 'backR', 'backL', 'front2', 'analyst', 'manager', 'reception'].map(
    (id) => [id, LOOK],
  ),
)
const models = (w: Wear[] | undefined) => (w ?? []).map((x) => x.model)

/** Nothing two in one place, and no headphone band through a hat. */
function wearable(wear: Wear[]) {
  const slots = wear.map((w) => w.slot)
  expect(new Set(slots).size).toBe(slots.length)
  const hat = wear.some((w) => w.slot === 'head')
  const band = wear.some((w) =>
    ['headphones', 'gaming-headset', 'earmuffs', 'comms-headset'].includes(w.model),
  )
  expect(hat && band).toBe(false)
}

describe('colleagues wear what their profession wears', () => {
  it('on the ward a fob watch, not a wristwatch (bare below the elbows)', () => {
    const cast = dressAll('ward', CAST)
    expect(models(cast.senior.wear)).toContain('fob-watch')
    for (const look of Object.values(cast))
      expect(look.wear?.some((w) => w.slot === 'wrist')).toBe(false)
  })

  it('in the workshop, safety glasses and boots on the floor', () => {
    const cast = dressAll('workshop', CAST)
    for (const id of ['senior', 'backM', 'backR']) {
      expect(models(cast[id].wear), id).toContain('safety-glasses')
      expect(models(cast[id].wear), id).toContain('safety-boots')
    }
  })

  it('on site, everyone in safety boots and glasses under their hard hat', () => {
    for (const id of ['supervisor', 'operator', 'fixer', 'electrician']) {
      const look = crewLook(id)
      expect(look.hardhat, id).toBeTruthy()
      expect(models(look.wear), id).toEqual(
        expect.arrayContaining(['safety-boots', 'safety-glasses']),
      )
      wearable(look.wear!)
    }
  })

  it('at a law firm, formal shoes; on the service desk, headsets', () => {
    expect(models(dressAll('courtroom', CAST).senior.wear)).toContain('formal-shoes')
    expect(models(workWear('it', 'front2', LOOK))).toContain('comms-headset')
  })

  it('no two people alike, and everything wearable together', () => {
    const kinds = [
      'ward',
      'workshop',
      'courtroom',
      'devteam',
      'studio',
      'records',
      'insights',
      'it',
    ]
    for (const kind of kinds) {
      const cast = dressAll(kind, CAST)
      const sets = Object.values(cast).map((l) => JSON.stringify(l.wear))
      expect(new Set(sets).size, kind).toBeGreaterThan(2)
      for (const l of Object.values(cast)) wearable(l.wear ?? [])
    }
    const town = Array.from({ length: 12 }, (_, i) => townWear(`passer-${i}`, LOOK))
    expect(new Set(town.map((w) => JSON.stringify(w))).size).toBeGreaterThan(8)
    for (const w of town) wearable(w)
    expect(town.some((w) => w.some((x) => x.slot === 'back'))).toBe(true)
  })

  it('every model a colleague wears is in the catalogue', () => {
    const cast = dressAll('workshop', CAST)
    for (const l of Object.values(cast))
      for (const w of l.wear ?? []) expect(w.model).toBeTruthy()
    expect(getAccessory('fob-watch')?.model).toBe('fob-watch')
  })
})

describe("the player's own kit", () => {
  const own = (...ids: string[]): WornModel[] =>
    ids.map((id) => {
      const a = getAccessory(id)!
      return { id, model: a.model, slot: a.slot, colour: a.colours[0] }
    })

  it('on site, the player’s own kit is worn and the rest lent', () => {
    const lent = withSiteKit(own('hardhat', 'watch-smart'))
    expect(lent.map((w) => w.id).sort()).toEqual(
      ['glasses-safety', 'hardhat', 'hivis-vest', 'safety-boots', 'watch-smart'].sort(),
    )
    // Their own colour of hard hat, not the site's.
    const full = withSiteKit(own('hardhat', 'goggles', 'hivis-vest', 'safety-boots'))
    expect(full.map((w) => w.id).sort()).toEqual(
      ['goggles', 'hardhat', 'hivis-vest', 'safety-boots'].sort(),
    )
    // Lent kit takes the place of what cannot be worn with it (sandals on site).
    expect(withSiteKit(own('sandals')).map((w) => w.id)).not.toContain('sandals')
  })

  it('a stethoscope of their own is listened with at the bedside; a badge shown at reception', () => {
    const ward = wardActivities()
    const plain = withOwnKit(ward, new Set())
    expect(plain).toBe(ward)
    const kit = withOwnKit(ward, wornUses(own('stethoscope')))
    const bedside = kit.find((a) => a.id === 'bedside')!
    expect(bedside.stages.at(-1)!.label).toMatch(/stethoscope/)
    const desk = withOwnKit(
      [
        {
          ...ward[0],
          id: 'receptionist',
          stages: [{ clip: 'talk', seconds: 1, label: 'Hi' }],
        },
      ],
      wornUses(own('badge-staff')),
    )
    expect(desk[0].stages[0].label).toBe('Showing your ID badge')
  })

  it('kept at home by the door: bags, hats and watches not worn or packed', () => {
    const wardrobe: Wardrobe = {
      owned: ['backpack', 'watch-classic', 'cap', 'necklace', 'tape-measure'].map(
        (id) => ({
          uid: id,
          id,
          colour: 0,
          bought: 1,
          paid: 100,
          condition: 100,
        }),
      ),
      worn: ['cap'],
      packed: [],
      history: [],
      woreDay: 0,
    }
    expect(keptModels({ wardrobe }).map((k) => k.id)).toEqual([
      'backpack',
      'watch-classic',
    ])
  })
})
