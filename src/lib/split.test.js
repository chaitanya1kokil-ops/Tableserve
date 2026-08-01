import { describe, it, expect } from 'vitest'
import {
  evenSplit,
  toUnits,
  amountsFromAssignment,
  itemOwners,
  collectionState,
} from './split'

const sum = (arr) => arr.reduce((s, v) => s + Number(v), 0)

// One tab: 2× Vada Pav @ 12.99 each, 1× Butter Chicken @ 19.99.
const orders = [
  {
    items: [
      { id: 'a', name_snapshot: 'Vada Pav', quantity: 2, line_total: 25.98 },
      { id: 'b', name_snapshot: 'Butter Chicken', quantity: 1, line_total: 19.99 },
    ],
  },
]

describe('evenSplit', () => {
  it('splits evenly when the total divides cleanly', () => {
    expect(evenSplit(30, 3)).toEqual(['10.00', '10.00', '10.00'])
  })

  it('gives the odd cents to the first payer rather than losing them', () => {
    const parts = evenSplit(10, 3)
    expect(parts).toEqual(['3.34', '3.33', '3.33'])
    expect(sum(parts)).toBeCloseTo(10, 10)
  })

  it('always sums back to the total across awkward amounts', () => {
    for (const total of [0.01, 9.99, 45.97, 100.03, 1234.56]) {
      for (const n of [2, 3, 4, 5, 7]) {
        expect(sum(evenSplit(total, n))).toBeCloseTo(total, 10)
      }
    }
  })
})

describe('toUnits', () => {
  it('expands a quantity into one unit per portion', () => {
    const units = toUnits(orders)
    expect(units).toHaveLength(3)
    expect(units.filter((u) => u.itemId === 'a')).toHaveLength(2)
  })

  it('divides a line evenly across its units', () => {
    const units = toUnits(orders)
    expect(units.find((u) => u.key === 'a#0').each).toBeCloseTo(12.99, 10)
    expect(units.find((u) => u.key === 'b#0').each).toBeCloseTo(19.99, 10)
  })

  it('leaves a comped reward item out — nobody pays for it', () => {
    const units = toUnits(orders, 'b')
    expect(units).toHaveLength(2)
    expect(units.some((u) => u.itemId === 'b')).toBe(false)
  })

  it('treats a missing or zero quantity as one unit', () => {
    const units = toUnits([{ items: [{ id: 'x', name_snapshot: 'Chai', line_total: 5.99 }] }])
    expect(units).toHaveLength(1)
    expect(units[0].each).toBeCloseTo(5.99, 10)
  })
})

describe('amountsFromAssignment', () => {
  const units = toUnits(orders) // 12.99 + 12.99 + 19.99 = 45.97

  it('bills each payer for what they took', () => {
    // Tab total 45.97 with no tax: payer 1 takes both Vada Pav, payer 2 the curry.
    const { amounts } = amountsFromAssignment(
      units,
      { 'a#0': 0, 'a#1': 0, 'b#0': 1 },
      2,
      45.97,
    )
    expect(amounts).toEqual(['25.98', '19.99'])
  })

  it('spreads tax proportionally without being told the rate', () => {
    // Same split, but the tab carries 13% tax: 45.97 -> 51.95 due.
    const { amounts } = amountsFromAssignment(
      units,
      { 'a#0': 0, 'a#1': 0, 'b#0': 1 },
      2,
      51.95,
    )
    expect(sum(amounts)).toBeCloseTo(51.95, 10)
    // Payer 1 took 25.98/45.97 of the food, so ~56.5% of the taxed total.
    expect(Number(amounts[0])).toBeCloseTo(29.36, 2)
    expect(Number(amounts[1])).toBeCloseTo(22.59, 2)
  })

  it('splits a shared line between two payers', () => {
    const { amounts } = amountsFromAssignment(
      units,
      { 'a#0': 0, 'a#1': 1, 'b#0': 1 },
      2,
      45.97,
    )
    expect(amounts).toEqual(['12.99', '32.98'])
  })

  it('sums exactly to the amount due even when the ratio does not divide', () => {
    // Three payers over an amount that cannot split cleanly in thirds.
    for (const due of [10, 45.97, 100.01, 33.33, 7.77]) {
      const { amounts } = amountsFromAssignment(
        units,
        { 'a#0': 0, 'a#1': 1, 'b#0': 2 },
        3,
        due,
      )
      expect(sum(amounts)).toBeCloseTo(due, 10)
    }
  })

  it('charges nothing to a payer who took nothing', () => {
    const { amounts } = amountsFromAssignment(units, { 'a#0': 0, 'a#1': 0, 'b#0': 0 }, 2, 45.97)
    expect(amounts).toEqual(['45.97', '0.00'])
  })

  it('returns zeros rather than dividing by zero when nothing is assigned', () => {
    const { amounts } = amountsFromAssignment(units, {}, 2, 45.97)
    expect(amounts).toEqual(['0.00', '0.00'])
  })

  it('ignores assignments pointing at a payer who was removed', () => {
    // 'b#0' is assigned to payer index 2, but only 2 payers remain.
    const { amounts } = amountsFromAssignment(units, { 'a#0': 0, 'a#1': 1, 'b#0': 2 }, 2, 25.98)
    expect(amounts).toEqual(['12.99', '12.99'])
    expect(sum(amounts)).toBeCloseTo(25.98, 10)
  })
})

describe('collectionState', () => {
  const two = [{ amount: '25.98' }, { amount: '19.99' }]

  it('treats a single payer as ready — one button settles it', () => {
    const s = collectionState([{ amount: '45.97' }], [])
    expect(s.split).toBe(false)
    expect(s.allCollected).toBe(true)
    expect(s.outstanding).toBe(0)
  })

  it('blocks a split tab until every payer has handed money over', () => {
    expect(collectionState(two, []).allCollected).toBe(false)
    expect(collectionState(two, [true]).allCollected).toBe(false)
    expect(collectionState(two, [true, true]).allCollected).toBe(true)
  })

  it('counts how many payers are still outstanding', () => {
    expect(collectionState(two, []).outstanding).toBe(2)
    expect(collectionState(two, [true]).outstanding).toBe(1)
    expect(collectionState(two, [true, true]).outstanding).toBe(0)
  })

  it('runs a total of what has actually been collected so far', () => {
    expect(collectionState(two, []).collectedTotal).toBe(0)
    expect(collectionState(two, [true]).collectedTotal).toBeCloseTo(25.98, 10)
    expect(collectionState(two, [true, true]).collectedTotal).toBeCloseTo(45.97, 10)
  })

  it('handles a payer marked collected out of order', () => {
    const s = collectionState(two, [undefined, true])
    expect(s.outstanding).toBe(1)
    expect(s.collectedTotal).toBeCloseTo(19.99, 10)
    expect(s.allCollected).toBe(false)
  })

  it('ignores stale flags past the end of the payer list', () => {
    // Payer 3 was removed but their flag lingered.
    const s = collectionState(two, [true, true, true])
    expect(s.outstanding).toBe(0)
    expect(s.collectedTotal).toBeCloseTo(45.97, 10)
  })
})

describe('itemOwners', () => {
  const units = toUnits(orders)

  it('assigns each item to exactly one payer', () => {
    const owners = itemOwners(units, { 'a#0': 0, 'a#1': 0, 'b#0': 1 })
    expect(owners).toEqual({ a: 0, b: 1 })
  })

  it('gives a shared line to whoever took more of it', () => {
    // 3× item: payer 1 takes two units, payer 0 takes one.
    const three = toUnits([
      { items: [{ id: 'c', name_snapshot: 'Naan', quantity: 3, line_total: 11.97 }] },
    ])
    const owners = itemOwners(three, { 'c#0': 0, 'c#1': 1, 'c#2': 1 })
    expect(owners).toEqual({ c: 1 })
  })

  it('never lists the same item under two payers', () => {
    const owners = itemOwners(units, { 'a#0': 0, 'a#1': 1, 'b#0': 1 })
    expect(Object.keys(owners)).toHaveLength(2)
    expect(new Set(Object.keys(owners)).size).toBe(2)
  })

  it('skips items nobody has been assigned yet', () => {
    const owners = itemOwners(units, { 'a#0': 0 })
    expect(owners).toEqual({ a: 0 })
  })
})
