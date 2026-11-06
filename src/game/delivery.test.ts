import { describe, expect, it } from 'vitest'
import { LifeSchema, type Life } from '../persistence/schemas'
import {
  COURIER_WAITS,
  DELIVERY_MINUTES,
  deliveryBlock,
  deliveryStage,
  eaten,
  ordered,
  overnight,
  received,
  untilArrival,
} from './delivery'

const evening = (minute: number, extra: Partial<Life> = {}): Life => ({
  ...LifeSchema.parse({}),
  phase: 'evening',
  minute,
  ...extra,
})

describe('a takeaway delivered', () => {
  it('older saves have no delivery, and nothing to do about one', () => {
    const life = LifeSchema.parse({})
    expect(life.delivery).toBeNull()
    expect(deliveryStage(life)).toBe('none')
    expect(deliveryBlock(life, 'takeaway')).toBeNull()
    expect(deliveryBlock(life, 'takeaway-door')).toBe('No one is at the door.')
    expect(deliveryBlock(life, 'cook')).toBeUndefined()
  })

  it('is on its way after ordering, then at the door, then on the doorstep', () => {
    let life = ordered(evening(18 * 60 + 5), 3)
    expect(life.delivery).toMatchObject({
      ordered: 18 * 60,
      due: 18 * 60 + DELIVERY_MINUTES,
    })
    expect(deliveryStage(life)).toBe('coming')
    expect(untilArrival(life)).toBe(DELIVERY_MINUTES - 5)
    life = { ...life, minute: 18 * 60 + DELIVERY_MINUTES }
    expect(deliveryStage(life)).toBe('at-door')
    life = { ...life, minute: 18 * 60 + DELIVERY_MINUTES + COURIER_WAITS }
    expect(deliveryStage(life)).toBe('doorstep')
  })

  it('cannot be ordered twice, answered early, or eaten before it is in hand', () => {
    const life = ordered(evening(19 * 60), 1)
    expect(deliveryBlock(life, 'takeaway')).toBe('Your takeaway is already on its way.')
    expect(deliveryBlock(life, 'takeaway-door')).toMatch(/On its way: about \d+ minutes/)
    expect(deliveryBlock(life, 'takeaway-eat')).toBe('There is no takeaway to eat.')
    expect(deliveryBlock(life, 'takeaway-wait')).toBeNull()
  })

  it('is the player’s once handed over, and done with once eaten', () => {
    let life = ordered(evening(19 * 60), 1)
    life = { ...life, minute: life.delivery!.due + 1 }
    expect(deliveryBlock(life, 'takeaway-door')).toBeNull()
    life = received(life)
    expect(deliveryStage(life)).toBe('received')
    expect(deliveryBlock(life, 'takeaway-eat')).toBeNull()
    expect(deliveryBlock(life, 'takeaway')).toBe('Your takeaway is here: eat it first.')
    life = eaten(life)
    expect(life.delivery).toBeNull()
  })

  it('kept in the save: the same after saving and loading', () => {
    const life = ordered(evening(19 * 60), 2)
    expect(LifeSchema.parse(JSON.parse(JSON.stringify(life))).delivery).toEqual(
      life.delivery,
    )
  })

  it('a takeaway not eaten by bedtime goes in the fridge', () => {
    const life = received({ ...ordered(evening(20 * 60), 1), minute: 21 * 60 })
    const after = overnight(life)
    expect(after.delivery).toBeNull()
    expect(after.food).toBe(life.food + 1)
  })
})
